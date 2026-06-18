import { completeText } from "../model-adapter.js";
import { MODELS } from "../models.js";

const SYSTEM_PROMPT = `Sei un editor HTML chirurgico. Ricevi un FRAMMENTO di HTML (con classi TailwindCSS) preso da una landing page, e una richiesta di modifica.

REGOLE:
- Applica SOLO la modifica richiesta. Lascia intatto tutto il resto.
- Restituisci SOLO il frammento HTML modificato, con lo STESSO tag radice del frammento ricevuto. Nessuna spiegazione, nessun markdown, niente \`\`\`.
- Mantieni le classi/stili esistenti tranne dove la modifica li cambia. Usa TailwindCSS coerente col resto.
- Se la richiesta è "rimuovi/elimina questo", restituisci una stringa vuota.`;

/** Edit a single HTML fragment with Sonnet. Cheap & fast (snippet-level). */
export async function editElementHtml(
  snippet: string,
  instruction: string,
  signal?: AbortSignal,
): Promise<{ html: string; usage: { tokensIn: number; tokensOut: number } }> {
  const { text, usage } = await completeText({
    model: MODELS.builder, // Sonnet
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `FRAMMENTO:\n${snippet}\n\nMODIFICA RICHIESTA:\n${instruction}\n\nRestituisci solo il frammento modificato.`,
      },
    ],
    temperature: 0.3,
    maxTokens: 4096,
    ...(signal ? { signal } : {}),
  });

  let html = text.trim();
  const start = html.search(/<[a-zA-Z]/);
  if (start > 0) html = html.slice(start);
  html = html.replace(/```html?/gi, "").replace(/```/g, "").trim();
  return { html, usage };
}
