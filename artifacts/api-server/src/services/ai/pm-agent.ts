import { streamChat, type ChatMessage, type StreamCallbacks } from "./model-adapter.js";
import { isDemoMode, demoPmReply } from "./demo/index.js";
import { logger } from "../../lib/logger.js";

const PM_SYSTEM_PROMPT = `Sei il PM Agent di GiassAi — l'interfaccia amichevole e professionale che parla direttamente con l'utente.

Il tuo ruolo:
- Aiutare l'utente a descrivere cosa vuole creare: un gestionale (ERP/CRM), una landing page, un workflow di automazione, o un piano editoriale video.
- Fare domande di chiarimento per capire il business dell'utente, le sue esigenze e i requisiti specifici.
- Creare un brief strutturato e chiaro quando hai raccolto abbastanza informazioni.
- Quando l'utente conferma il brief, segnalare che sei pronto a passare il lavoro all'Architetto.

Regole ferree:
- Rispondi SEMPRE in italiano.
- Sii conciso, caldo e professionale. Niente risposte prolisse.
- NON generare mai schemi tecnici, JSON, codice o strutture database — quello è il lavoro dell'Architetto.
- NON inventare funzionalità che l'utente non ha chiesto.
- Fai massimo 2-3 domande alla volta, non bombardare l'utente.
- Usa emoji con moderazione (max 1-2 per messaggio).
- Se l'utente è vago, proponi esempi concreti basati sul suo settore.

Tipi di progetto che puoi aiutare a creare:
1. **Gestionale** — Database/CRM/ERP personalizzato con tabelle, form, viste
2. **Landing Page** — Pagina web per raccogliere lead o presentare un'attività
3. **Workflow** — Automazione con trigger, azioni, task AI e approvazioni umane
4. **Piano Editoriale Video** — Calendario di idee video per social con script e hashtag`;

const PRIMARY_MODEL = "claude-haiku-4-5-20250609";
const FALLBACK_MODEL = "gpt-4.1-mini";

export interface PmAgentInput {
  conversationHistory: ChatMessage[];
  userMessage: string;
  projectType?: string;
}

export async function runPmAgent(
  input: PmAgentInput,
  callbacks: StreamCallbacks & { signal?: AbortSignal },
): Promise<void> {
  // Offline demo mode: stream a scripted, sector-agnostic reply (no API key needed).
  if (isDemoMode()) {
    const reply = demoPmReply(
      input.userMessage,
      input.conversationHistory.length === 0,
      input.projectType,
    );
    for (const word of reply.split(/(\s+)/)) {
      if (callbacks.signal?.aborted) return;
      callbacks.onToken(word);
    }
    callbacks.onDone(reply, { tokensIn: 0, tokensOut: 0 });
    return;
  }

  const messages: ChatMessage[] = [
    { role: "system", content: PM_SYSTEM_PROMPT },
    ...input.conversationHistory,
    { role: "user", content: input.userMessage },
  ];

  try {
    await streamChat(PRIMARY_MODEL, messages, callbacks, {
      temperature: 0.7,
      maxTokens: 1024,
      signal: callbacks.signal,
    });
  } catch (err) {
    logger.warn({ err, model: PRIMARY_MODEL }, "Primary model failed, trying fallback");
    try {
      await streamChat(FALLBACK_MODEL, messages, callbacks, {
        temperature: 0.7,
        maxTokens: 1024,
        signal: callbacks.signal,
      });
    } catch (fallbackErr) {
      callbacks.onError(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
    }
  }
}
