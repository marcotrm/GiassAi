import { BusinessProfile, type BusinessProfile as BusinessProfileType } from "@workspace/api-zod";
import { completeJson } from "../model-adapter.js";
import { MODELS } from "../models.js";
import { logger } from "../../../lib/logger.js";

// Analyst (Haiku): turns a brief into a BusinessProfile. v1 works from the
// model's knowledge; a web_search tool can be added later for real competitor data.

const TOOL_INPUT = {
  type: "object",
  required: ["businessName", "sector", "visualDna"],
  properties: {
    businessName: { type: "string" },
    sector: { type: "string" },
    location: { type: "string" },
    usp: { type: "array", items: { type: "string" } },
    targetAudience: { type: "string" },
    tone: { type: "string" },
    competitors: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "strength", "gap"],
        properties: { name: { type: "string" }, strength: { type: "string" }, gap: { type: "string" } },
      },
    },
    visualDna: {
      type: "object",
      required: ["primaryColor", "secondaryColor", "accentColor", "headingFont", "bodyFont"],
      properties: {
        primaryColor: { type: "string", description: "hex, es. #2563eb" },
        secondaryColor: { type: "string" },
        accentColor: { type: "string" },
        headingFont: { type: "string", description: "Google Font" },
        bodyFont: { type: "string" },
        mood: { type: "string" },
      },
    },
  },
} as const;

export async function analyzeBusiness(
  brief: string,
  signal?: AbortSignal,
): Promise<{ profile: BusinessProfileType; usage: { tokensIn: number; tokensOut: number } }> {
  const { data, usage } = await completeJson({
    model: MODELS.executor,
    system:
      "Sei un analista di marketing. Dal brief, definisci il profilo dell'attività: settore, USP, target, tono, possibili competitor (dedotti) e un visual DNA coerente col settore (colori hex e Google Fonts). Rispondi solo con lo strumento emit_profile.",
    messages: [{ role: "user", content: brief }],
    tool: {
      name: "emit_profile",
      description: "Emetti il profilo dell'attività.",
      inputSchema: TOOL_INPUT as unknown as Record<string, unknown>,
    },
    temperature: 0.4,
    maxTokens: 2048,
    ...(signal ? { signal } : {}),
  });

  const parsed = BusinessProfile.safeParse(data);
  if (!parsed.success) {
    logger.warn({ errors: parsed.error.issues }, "Analyst output invalid, using minimal profile");
    return {
      profile: BusinessProfile.parse({ businessName: "Attività", sector: "generico", visualDna: {} }),
      usage,
    };
  }
  return { profile: parsed.data, usage };
}
