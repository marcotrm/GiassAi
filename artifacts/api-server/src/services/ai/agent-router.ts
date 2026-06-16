import { z } from "zod";
import { completeJson, type ChatMessage } from "./model-adapter.js";
import { MODELS } from "./models.js";
import { logger } from "../../lib/logger.js";

export type AgentRole = "pm" | "architect" | "executor";

export function routeToAgent(
  _conversationHistory: ChatMessage[],
  _userMessage: string,
): AgentRole {
  // The PM Agent always handles the conversational turn. After it replies, the
  // chat route runs classifyCreationIntent() to decide whether to hand off to
  // the Architect (project generation).
  return "pm";
}

// ----------------------------------------------------------------------------
// Creation-intent classifier (Haiku) — meta-routing after the PM reply.
// ----------------------------------------------------------------------------

const IntentOutput = z.object({
  confirmed: z.boolean(),
  brief: z.string().default(""),
});

const INTENT_TOOL_INPUT = {
  type: "object",
  required: ["confirmed", "brief"],
  properties: {
    confirmed: {
      type: "boolean",
      description: "true solo se l'utente ha CONFERMATO di voler creare ORA il progetto.",
    },
    brief: {
      type: "string",
      description:
        "Se confirmed=true, un brief completo e autosufficiente del progetto sintetizzato dalla conversazione. Altrimenti stringa vuota.",
    },
  },
} as const;

/**
 * Decides whether the user has just confirmed they want the project built now.
 * Returns the synthesized brief when confirmed. Cheap (Haiku) — runs per turn.
 */
export async function classifyCreationIntent(
  history: ChatMessage[],
  userMessage: string,
  projectKind: string,
  signal?: AbortSignal,
): Promise<{ confirmed: boolean; brief: string }> {
  try {
    const { data } = await completeJson({
      model: MODELS.executor,
      system: `Sei un classificatore d'intento per la creazione di un ${projectKind}. Leggi la conversazione e l'ultimo messaggio dell'utente. Determina se l'utente ha appena CONFERMATO di voler creare/generare ORA il ${projectKind} (es. "sì crea", "procedi", "va bene fallo", "ok genera"). Se sta ancora descrivendo, chiedendo o esitando, confirmed=false. Quando confirmed=true, sintetizza un brief completo del ${projectKind} basato su TUTTA la conversazione.`,
      messages: [...history, { role: "user", content: userMessage }] as ChatMessage[],
      tool: {
        name: "emit_intent",
        description: "Emetti la decisione di intento.",
        inputSchema: INTENT_TOOL_INPUT as unknown as Record<string, unknown>,
      },
      temperature: 0,
      maxTokens: 1024,
      ...(signal ? { signal } : {}),
    });
    const parsed = IntentOutput.safeParse(data);
    if (!parsed.success) return { confirmed: false, brief: "" };
    return parsed.data;
  } catch (err) {
    logger.warn({ err }, "Intent classifier failed, treating as not-confirmed");
    return { confirmed: false, brief: "" };
  }
}
