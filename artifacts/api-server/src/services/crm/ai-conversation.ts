import { completeText, completeJson } from "../ai/model-adapter.js";
import { MODELS } from "../ai/models.js";
import { isDemoMode } from "../ai/demo/index.js";
import { logger } from "../../lib/logger.js";

export interface BusinessScheda {
  nomeAttivita: string;
  settore: string;
  orari: string;
  servizi: string;
  obiettivo: string;
  tono: string;
  noteAggiuntive: string;
}

export const DEFAULT_SCHEDA: BusinessScheda = {
  nomeAttivita: "",
  settore: "",
  orari: "",
  servizi: "",
  obiettivo: "fissare un appuntamento",
  tono: "amichevole e professionale",
  noteAggiuntive: "",
};

/**
 * Pre-fill a business scheda from the landing page HTML.
 * Uses Haiku to extract business info from the stripped page text.
 */
export async function prefillSchedaFromLanding(
  landingHtml: string,
  signal?: AbortSignal,
): Promise<BusinessScheda> {
  if (isDemoMode()) return DEFAULT_SCHEDA;

  // Strip HTML tags to get readable text (simple regex is enough here)
  const text = landingHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 4000);

  try {
    const { data } = await completeJson({
      model: MODELS.executor,
      system:
        "Leggi il testo di questa landing page e compila la scheda business. " +
        "Estrai solo informazioni presenti nel testo; lascia vuoto ciò che non trovi. " +
        "Rispondi solo tramite lo strumento compila_scheda.",
      messages: [{ role: "user", content: `Testo della landing:\n${text}` }],
      tool: {
        name: "compila_scheda",
        description: "Compila la scheda business estratta dalla landing.",
        inputSchema: {
          type: "object",
          properties: {
            nomeAttivita: { type: "string", description: "Nome dell'attività o brand" },
            settore: { type: "string", description: "Settore / tipo di business (es. palestra, ristorante)" },
            orari: { type: "string", description: "Orari di apertura" },
            servizi: { type: "string", description: "Descrizione di servizi e prezzi principali" },
            obiettivo: { type: "string", description: "Obiettivo del contatto AI (es. fissare un appuntamento)" },
            tono: { type: "string", description: "Tono di comunicazione (es. amichevole, formale)" },
            noteAggiuntive: { type: "string", description: "Altre info utili" },
          },
          required: ["nomeAttivita", "settore", "orari", "servizi", "obiettivo", "tono", "noteAggiuntive"],
        },
      },
      maxTokens: 1024,
      ...(signal ? { signal } : {}),
    });

    const d = (data ?? {}) as Partial<BusinessScheda>;
    return {
      nomeAttivita: d.nomeAttivita ?? "",
      settore: d.settore ?? "",
      orari: d.orari ?? "",
      servizi: d.servizi ?? "",
      obiettivo: d.obiettivo || "fissare un appuntamento",
      tono: d.tono || "amichevole e professionale",
      noteAggiuntive: d.noteAggiuntive ?? "",
    };
  } catch (err) {
    logger.warn({ err }, "Scheda prefill from landing failed");
    return DEFAULT_SCHEDA;
  }
}

/**
 * Generate a short first-contact message for a CRM lead.
 * Uses Haiku — cheap and fast for a single short message.
 */
export async function generateDraftMessage(
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    fields?: Record<string, unknown> | null;
  },
  scheda: BusinessScheda,
  signal?: AbortSignal,
): Promise<string> {
  const contactName = contact.name || contact.email || contact.phone || "il lead";
  const extraFields = contact.fields
    ? Object.entries(contact.fields)
        .filter(([, v]) => v !== null && v !== undefined && String(v).trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "";

  if (isDemoMode()) {
    return `Ciao ${contactName}! Sono ${scheda.nomeAttivita || "noi"} e ho visto che ti interessa saperne di più. Quando ti va di sentirci per fissare ${scheda.obiettivo}?`;
  }

  const system =
    `Sei l'assistente virtuale di "${scheda.nomeAttivita || "un'azienda"}", settore: ${scheda.settore || "non specificato"}. ` +
    `Il tuo obiettivo è: ${scheda.obiettivo}. ` +
    `Tono: ${scheda.tono}. ` +
    (scheda.orari ? `Orari: ${scheda.orari}. ` : "") +
    (scheda.servizi ? `Servizi/prezzi: ${scheda.servizi}. ` : "") +
    (scheda.noteAggiuntive ? `Note: ${scheda.noteAggiuntive}. ` : "") +
    "Scrivi SOLO il testo del messaggio, senza intestazioni o spiegazioni. Max 4 righe.";

  const userPrompt =
    `Scrivi il primo messaggio di contatto per: ${contactName}.` +
    (extraFields ? ` Dati aggiuntivi dal form: ${extraFields}.` : "");

  try {
    const { text } = await completeText({
      model: MODELS.executor,
      system,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.7,
      maxTokens: 256,
      ...(signal ? { signal } : {}),
    });
    return text.trim();
  } catch (err) {
    logger.warn({ err }, "Draft message generation failed");
    return `Ciao ${contactName}! Grazie per averci contattato. Quando sei disponibile per parlare di ${scheda.obiettivo}?`;
  }
}
