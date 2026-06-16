import type { WfAiTaskConfig } from "@workspace/api-zod";
import { completeJson } from "../ai/model-adapter.js";
import { MODELS } from "../ai/models.js";
import { resolveValue, type RunContext } from "./context-resolver.js";

const JSON_TYPE: Record<string, { type: string }> = {
  string: { type: "string" },
  number: { type: "number" },
  boolean: { type: "boolean" },
  json: { type: "object" },
};

/** Runs an ai_task node: resolves its prompt against context, asks Haiku for a
 *  structured result matching outputSchema. Returns the validated output object. */
export async function runAiTask(
  config: WfAiTaskConfig,
  ctx: RunContext,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const prompt = String(resolveValue(config.prompt, ctx));

  const properties: Record<string, { type: string }> = {};
  for (const [key, t] of Object.entries(config.outputSchema)) {
    properties[key] = JSON_TYPE[t] ?? { type: "string" };
  }

  const { data } = await completeJson({
    model: MODELS.executor,
    system:
      "Sei un task AI dentro un workflow automatizzato. Esegui l'istruzione e restituisci SOLO l'output strutturato richiesto tramite lo strumento emit_output.",
    messages: [{ role: "user", content: prompt }],
    tool: {
      name: "emit_output",
      description: "Emetti l'output del task.",
      inputSchema: {
        type: "object",
        properties,
        required: Object.keys(config.outputSchema),
      },
    },
    temperature: 0.3,
    maxTokens: 2048,
    ...(signal ? { signal } : {}),
  });

  return (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
}
