import {
  LandingDef,
  checkLandingInvariants,
  type LandingDef as LandingDefType,
  type BusinessProfile,
} from "@workspace/api-zod";
import { completeJson, type ChatMessage } from "../model-adapter.js";
import { MODELS } from "../models.js";
import { logger } from "../../../lib/logger.js";

// Architect (Opus): designs the landing STRUCTURE (sections + forms + theme).
// Section content is left empty here — the copywriter fills it next.

const SYSTEM_PROMPT = `Sei l'Architetto di Landing Page di GiassAi. Progetti la STRUTTURA di una landing orientata alla conversione.

REGOLE:
- Rispondi solo con lo strumento emit_landing. Nessun testo libero.
- Scegli e ORDINA le sezioni (campo order crescente da 0). Tipi disponibili: hero, features, benefits, testimonials, pricing, faq, gallery, about, contact_form, cta, stats, logos.
- Inizia con un hero e includi sempre una sezione contact_form e una cta.
- Per ogni sezione lascia content = {} (lo riempirà il copywriter). Dai a ogni sezione un id breve univoco.
- Definisci il/i form (forms[]) con i campi da raccogliere; il formId deve combaciare con la sezione contact_form.
- Imposta il theme dai colori e font del visual DNA fornito.
- NON scrivere copy né HTML.`;

const TOOL_INPUT = {
  type: "object",
  required: ["theme", "sections"],
  properties: {
    template: { type: "string" },
    theme: {
      type: "object",
      required: ["primaryColor", "secondaryColor", "accentColor", "headingFont", "bodyFont"],
      properties: {
        primaryColor: { type: "string" }, secondaryColor: { type: "string" }, accentColor: { type: "string" },
        headingFont: { type: "string" }, bodyFont: { type: "string" },
      },
    },
    sections: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "type", "order"],
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["hero","features","benefits","testimonials","pricing","faq","gallery","about","contact_form","cta","stats","logos"] },
          order: { type: "integer" },
          content: { type: "object" },
        },
      },
    },
    forms: {
      type: "array",
      items: {
        type: "object",
        required: ["formId", "fields"],
        properties: {
          formId: { type: "string" },
          submitLabel: { type: "string" },
          fields: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "label", "type"],
              properties: {
                name: { type: "string" }, label: { type: "string" },
                type: { type: "string", enum: ["text","email","phone","textarea","select"] },
                required: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  },
} as const;

const MAX_ATTEMPTS = 2;

export async function runLandingArchitect(
  profile: BusinessProfile,
  signal?: AbortSignal,
): Promise<{ def: LandingDefType; usage: { tokensIn: number; tokensOut: number } }> {
  const messages: ChatMessage[] = [
    { role: "user", content: `PROFILO ATTIVITÀ:\n${JSON.stringify(profile, null, 2)}` },
  ];
  let totalIn = 0;
  let totalOut = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, usage } = await completeJson({
      model: MODELS.architect,
      system: SYSTEM_PROMPT,
      messages,
      tool: {
        name: "emit_landing",
        description: "Emetti la struttura della landing.",
        inputSchema: TOOL_INPUT as unknown as Record<string, unknown>,
      },
      temperature: 0.2,
      maxTokens: 4096,
      ...(signal ? { signal } : {}),
    });
    totalIn += usage.tokensIn;
    totalOut += usage.tokensOut;

    const parsed = LandingDef.safeParse(data);
    const invariants = parsed.success ? checkLandingInvariants(parsed.data) : [];
    if (parsed.success && invariants.length === 0) {
      return { def: parsed.data, usage: { tokensIn: totalIn, tokensOut: totalOut } };
    }
    const errors = parsed.success ? invariants : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    logger.warn({ attempt, errors }, "Landing architect invalid, retrying");
    if (attempt === MAX_ATTEMPTS) {
      throw new Error(`Landing architect failed: ${errors.join("; ")}`);
    }
    messages.push({ role: "assistant", content: JSON.stringify(data) });
    messages.push({ role: "user", content: `Errori: ${errors.join("; ")}. Ri-emetti con emit_landing.` });
  }
  throw new Error("Landing architect: unexpected exit");
}
