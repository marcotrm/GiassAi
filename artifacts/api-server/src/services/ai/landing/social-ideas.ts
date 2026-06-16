import { VideoIdea, type VideoIdea as VideoIdeaType, type BusinessProfile } from "@workspace/api-zod";
import { completeJson } from "../model-adapter.js";
import { MODELS } from "../models.js";
import { logger } from "../../../lib/logger.js";

// Social ideas (Haiku): 10 short-form content ideas for the business.

const TOOL_INPUT = {
  type: "object",
  required: ["ideas"],
  properties: {
    ideas: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["title", "hook", "script", "platform"],
        properties: {
          title: { type: "string" },
          hook: { type: "string" },
          script: { type: "string" },
          cta: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
          caption: { type: "string" },
          platform: { type: "string" },
          format: { type: "string" },
          category: { type: "string" },
        },
      },
    },
  },
} as const;

export async function generateSocialIdeas(
  profile: BusinessProfile,
  signal?: AbortSignal,
): Promise<{ ideas: VideoIdeaType[]; usage: { tokensIn: number; tokensOut: number } }> {
  try {
    const { data, usage } = await completeJson({
      model: MODELS.executor,
      system: `Genera 10 idee di contenuti social per "${profile.businessName}" (settore ${profile.sector}). Per ognuna: title, hook, script breve, cta, hashtags, caption, platform e format. Varia i formati (reel, carosello, post). Rispondi solo con emit_ideas.`,
      messages: [{ role: "user", content: `Tono: ${profile.tone}. Target: ${profile.targetAudience}. USP: ${profile.usp.join(", ")}` }],
      tool: {
        name: "emit_ideas",
        description: "Emetti le idee social.",
        inputSchema: TOOL_INPUT as unknown as Record<string, unknown>,
      },
      temperature: 0.8,
      maxTokens: 4096,
      ...(signal ? { signal } : {}),
    });
    const raw = (data as { ideas?: unknown }).ideas;
    const ideas: VideoIdeaType[] = [];
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const parsed = VideoIdea.safeParse(item);
        if (parsed.success) ideas.push(parsed.data);
      }
    }
    return { ideas, usage };
  } catch (err) {
    logger.warn({ err }, "Social ideas generation failed");
    return { ideas: [], usage: { tokensIn: 0, tokensOut: 0 } };
  }
}
