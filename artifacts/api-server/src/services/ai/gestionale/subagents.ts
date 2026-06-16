import { z } from "zod";
import {
  GestionaleViewConfig,
  type GestionaleTable,
  type GestionaleSchemaDef,
} from "@workspace/api-zod";
import { completeJson, type ChatMessage } from "../model-adapter.js";
import { MODELS } from "../models.js";
import { logger } from "../../../lib/logger.js";

export interface SubagentUsage {
  tokensIn: number;
  tokensOut: number;
}

function tableContext(table: GestionaleTable): string {
  return JSON.stringify(
    { name: table.name, label: table.label, columns: table.columns },
    null,
    2,
  );
}

// ----------------------------------------------------------------------------
// Views generator (Haiku)
// ----------------------------------------------------------------------------

const ViewsOutput = z.object({ views: z.array(GestionaleViewConfig).min(1) });

const VIEWS_TOOL_INPUT = {
  type: "object",
  required: ["views"],
  properties: {
    views: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["type", "label", "visibleColumns"],
        properties: {
          type: { type: "string", enum: ["table", "kanban", "calendar", "gallery"] },
          label: { type: "string" },
          visibleColumns: { type: "array", items: { type: "string" } },
          groupByColumn: { type: "string" },
          dateColumn: { type: "string" },
          defaultSort: {
            type: "object",
            properties: {
              column: { type: "string" },
              dir: { type: "string", enum: ["asc", "desc"] },
            },
          },
        },
      },
    },
  },
} as const;

export async function generateViews(
  table: GestionaleTable,
  signal?: AbortSignal,
): Promise<{ views: z.infer<typeof GestionaleViewConfig>[]; usage: SubagentUsage }> {
  try {
    const { data, usage } = await completeJson({
      model: MODELS.executor,
      system:
        "Proponi 1-3 viste utili per questa tabella di un gestionale. 'table' sempre; 'kanban' se c'è una colonna enum di stato (usa groupByColumn); 'calendar' se c'è una colonna date/datetime (usa dateColumn); 'gallery' se c'è una colonna file. Per ogni vista scegli 4-6 visibleColumns rilevanti e un defaultSort sensato. Usa solo nomi di colonna esistenti.",
      messages: [{ role: "user", content: tableContext(table) }] as ChatMessage[],
      tool: {
        name: "emit_views",
        description: "Emetti le viste per la tabella.",
        inputSchema: VIEWS_TOOL_INPUT as unknown as Record<string, unknown>,
      },
      temperature: 0.3,
      maxTokens: 1024,
      ...(signal ? { signal } : {}),
    });

    const parsed = ViewsOutput.safeParse(data);
    if (!parsed.success) {
      logger.warn({ table: table.name }, "Views subagent invalid, falling back to default table view");
      return { views: [defaultTableView(table)], usage };
    }
    return { views: parsed.data.views, usage };
  } catch (err) {
    logger.warn({ err, table: table.name }, "Views subagent failed, using default view");
    return { views: [defaultTableView(table)], usage: { tokensIn: 0, tokensOut: 0 } };
  }
}

function defaultTableView(table: GestionaleTable): z.infer<typeof GestionaleViewConfig> {
  return {
    type: "table",
    label: "Tabella",
    visibleColumns: table.columns.slice(0, 6).map((c) => c.name),
  };
}

// ----------------------------------------------------------------------------
// Form layout generator (Haiku) — formLayout is opaque (z.unknown) in the schema.
// ----------------------------------------------------------------------------

const FORM_TOOL_INPUT = {
  type: "object",
  required: ["sections"],
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "fields"],
        properties: {
          title: { type: "string" },
          fields: {
            type: "array",
            items: {
              type: "object",
              required: ["column", "widget"],
              properties: {
                column: { type: "string" },
                widget: {
                  type: "string",
                  enum: ["text", "textarea", "number", "select", "date", "datetime", "checkbox", "relation_picker", "file"],
                },
                helpText: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

export async function generateForm(
  table: GestionaleTable,
  signal?: AbortSignal,
): Promise<{ formLayout: unknown; usage: SubagentUsage }> {
  try {
    const { data, usage } = await completeJson({
      model: MODELS.executor,
      system:
        "Genera il layout del form per inserire/modificare una riga di questa tabella: ordine logico dei campi, raggruppati in sezioni, con il widget giusto per tipo (relation->relation_picker, enum->select, date->date, boolean->checkbox, long_text->textarea). Aggiungi helpText in italiano solo per i campi non ovvi. Usa solo nomi di colonna esistenti.",
      messages: [{ role: "user", content: tableContext(table) }] as ChatMessage[],
      tool: {
        name: "emit_form",
        description: "Emetti il layout del form.",
        inputSchema: FORM_TOOL_INPUT as unknown as Record<string, unknown>,
      },
      temperature: 0.3,
      maxTokens: 1024,
      ...(signal ? { signal } : {}),
    });
    return { formLayout: data, usage };
  } catch (err) {
    logger.warn({ err, table: table.name }, "Form subagent failed, using default layout");
    return {
      formLayout: {
        sections: [
          { title: "Dati", fields: table.columns.map((c) => ({ column: c.name, widget: "text" })) },
        ],
      },
      usage: { tokensIn: 0, tokensOut: 0 },
    };
  }
}

// ----------------------------------------------------------------------------
// Seed data generator (Haiku) — optional, behind a flag in the orchestrator.
// ----------------------------------------------------------------------------

export async function generateSeed(
  table: GestionaleTable,
  business: string,
  _schema: GestionaleSchemaDef,
  signal?: AbortSignal,
): Promise<{ rows: Record<string, unknown>[]; usage: SubagentUsage }> {
  const SEED_TOOL_INPUT = {
    type: "object",
    required: ["rows"],
    properties: {
      rows: { type: "array", items: { type: "object" } },
    },
  } as const;

  try {
    const { data, usage } = await completeJson({
      model: MODELS.executor,
      system: `Genera da 3 a 5 righe di dati ESEMPIO realistici e coerenti col settore "${business}" per questa tabella. Rispetta tipi ed enum. Per le colonne relation lascia null (verranno collegate dopo). Restituisci solo le coppie colonna->valore per le colonne dati (NON id/created_at).`,
      messages: [{ role: "user", content: tableContext(table) }] as ChatMessage[],
      tool: {
        name: "emit_seed",
        description: "Emetti righe di dati esempio.",
        inputSchema: SEED_TOOL_INPUT as unknown as Record<string, unknown>,
      },
      temperature: 0.6,
      maxTokens: 2048,
      ...(signal ? { signal } : {}),
    });
    const rows = (data as { rows?: unknown }).rows;
    if (!Array.isArray(rows)) return { rows: [], usage };
    return { rows: rows as Record<string, unknown>[], usage };
  } catch (err) {
    logger.warn({ err, table: table.name }, "Seed subagent failed, skipping seed");
    return { rows: [], usage: { tokensIn: 0, tokensOut: 0 } };
  }
}
