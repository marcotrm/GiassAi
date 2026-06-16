import {
  GestionaleSchemaDef,
  checkGestionaleInvariants,
  type GestionaleSchemaDef as GestionaleSchemaDefType,
} from "@workspace/api-zod";
import { completeJson, type ChatMessage } from "../model-adapter.js";
import { MODELS } from "../models.js";
import { logger } from "../../../lib/logger.js";

const ARCHITECT_SYSTEM_PROMPT = `Sei l'Architetto di GiassAi. Il tuo unico compito è progettare lo SCHEMA RELAZIONALE di un gestionale partendo dal brief dell'utente.

REGOLE FERREE:
- Produci ESCLUSIVAMENTE lo schema tramite lo strumento "emit_schema". Nessun testo libero.
- Pensa come un DBA esperto: normalizza (3NF), evita ridondanze, usa relazioni esplicite.
- Tabelle e colonne in snake_case inglese; le label in ITALIANO leggibile.
- Per ogni entità del business crea una tabella. Per i campi a scelta fissa usa il tipo "enum" e definisci l'enum in enums[].
- Per i legami fra entità usa "relation": one_to_many con fromColumn sulla tabella "molti", o many_to_many con joinTable.
- Ogni tabella DEVE avere una primaryDisplayColumn (la colonna che identifica la riga a colpo d'occhio).
- NON aggiungere colonne id/created_at/updated_at/org_id: le aggiunge il sistema automaticamente.
- NON inventare entità non implicite nel brief. Scegli lo schema minimo ragionevole; annota le assunzioni nel campo description delle tabelle.
- Massimo 20 tabelle.

Esempio (palestra): tabelle clienti, abbonamenti (con colonna enum "tipo": mensile/annuale), pagamenti (relation -> clienti), accessi (relation -> clienti).`;

// JSON Schema for the tool input. Guides Opus; GestionaleSchemaDef (Zod) is the real gate.
const EMIT_SCHEMA_TOOL_INPUT = {
  type: "object",
  required: ["name", "tables"],
  properties: {
    version: { type: "integer", default: 1 },
    name: { type: "string", description: "Nome del gestionale" },
    tables: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "object",
        required: ["name", "label", "primaryDisplayColumn", "columns"],
        properties: {
          name: { type: "string", description: "snake_case inglese" },
          label: { type: "string", description: "Nome italiano leggibile" },
          description: { type: "string" },
          primaryDisplayColumn: { type: "string" },
          columns: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["name", "label", "type"],
              properties: {
                name: { type: "string", description: "snake_case inglese" },
                label: { type: "string" },
                type: {
                  type: "string",
                  enum: [
                    "text", "long_text", "number", "decimal", "currency",
                    "boolean", "date", "datetime", "enum", "relation",
                    "email", "phone", "url", "file",
                  ],
                },
                nullable: { type: "boolean", default: true },
                unique: { type: "boolean", default: false },
                enumName: { type: "string", description: "richiesto se type=enum" },
                relationTo: { type: "string", description: "tabella target se type=relation" },
                helpText: { type: "string" },
              },
            },
          },
        },
      },
    },
    relations: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "from", "to"],
        properties: {
          type: { type: "string", enum: ["one_to_many", "many_to_many"] },
          from: { type: "string" },
          to: { type: "string" },
          fromColumn: { type: "string" },
          joinTable: { type: "string" },
        },
      },
    },
    enums: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "values"],
        properties: {
          name: { type: "string" },
          values: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["value", "label"],
              properties: {
                value: { type: "string" },
                label: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

const MAX_ATTEMPTS = 3;

export interface ArchitectResult {
  def: GestionaleSchemaDefType;
  usage: { tokensIn: number; tokensOut: number };
}

/**
 * Calls Opus to design a gestionale schema from a natural-language brief.
 * Retries (feeding validation errors back) until the output passes both the
 * Zod gate and the cross-field invariants, or MAX_ATTEMPTS is reached.
 */
export async function runArchitect(
  brief: string,
  signal?: AbortSignal,
): Promise<ArchitectResult> {
  const messages: ChatMessage[] = [
    { role: "user", content: `Brief dell'utente:\n\n${brief}` },
  ];

  let totalIn = 0;
  let totalOut = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, usage } = await completeJson({
      model: MODELS.architect,
      system: ARCHITECT_SYSTEM_PROMPT,
      messages,
      tool: {
        name: "emit_schema",
        description: "Emetti lo schema relazionale completo del gestionale.",
        inputSchema: EMIT_SCHEMA_TOOL_INPUT as unknown as Record<string, unknown>,
      },
      temperature: 0.1,
      maxTokens: 8192,
      ...(signal ? { signal } : {}),
    });
    totalIn += usage.tokensIn;
    totalOut += usage.tokensOut;

    const parsed = GestionaleSchemaDef.safeParse(data);
    const invariantErrors = parsed.success ? checkGestionaleInvariants(parsed.data) : [];

    if (parsed.success && invariantErrors.length === 0) {
      return { def: parsed.data, usage: { tokensIn: totalIn, tokensOut: totalOut } };
    }

    const errorList = parsed.success
      ? invariantErrors
      : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);

    logger.warn({ attempt, errors: errorList }, "Architect output failed validation, retrying");

    if (attempt === MAX_ATTEMPTS) {
      throw new Error(
        `Architect failed to produce a valid schema after ${MAX_ATTEMPTS} attempts: ${errorList.join("; ")}`,
      );
    }

    // Feed the errors back so Opus can self-correct.
    messages.push({ role: "assistant", content: JSON.stringify(data) });
    messages.push({
      role: "user",
      content: `Lo schema ha questi errori di validazione. Correggili e ri-emetti lo schema completo con emit_schema:\n- ${errorList.join("\n- ")}`,
    });
  }

  // Unreachable, but satisfies the type checker.
  throw new Error("Architect: unexpected exit");
}
