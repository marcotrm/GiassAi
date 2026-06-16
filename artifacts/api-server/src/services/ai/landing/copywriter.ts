import type { LandingSection, BusinessProfile } from "@workspace/api-zod";
import { completeJson } from "../model-adapter.js";
import { MODELS } from "../models.js";
import { logger } from "../../../lib/logger.js";

// Copywriter (Sonnet): fills one section's `content` object with persuasive
// Italian copy. The expected fields depend on the section type.

const HINTS: Record<string, string> = {
  hero: "{ title, subtitle, ctaLabel, ctaHref }",
  features: "{ title, items:[{title, description}] }",
  benefits: "{ title, items:[{title, description}] }",
  testimonials: "{ title, items:[{quote, author, role}] }",
  faq: "{ title, items:[{question, answer}] }",
  stats: "{ title, items:[{value, label}] }",
  cta: "{ title, ctaLabel, ctaHref }",
  about: "{ title, body }",
  contact_form: "{ title }",
  pricing: "{ title, plans:[{name, price, features:[...]}] }",
  gallery: "{ title }",
  logos: "{ title }",
};

export async function fillSectionContent(
  sectionType: LandingSection["type"],
  profile: BusinessProfile,
  signal?: AbortSignal,
): Promise<{ content: Record<string, unknown>; usage: { tokensIn: number; tokensOut: number } }> {
  try {
    const { data, usage } = await completeJson({
      model: MODELS.builder,
      system: `Sei un copywriter esperto. Scrivi il copy ITALIANO persuasivo per una sezione "${sectionType}" della landing di "${profile.businessName}" (settore ${profile.sector}, tono ${profile.tone}). Struttura attesa del content: ${HINTS[sectionType] ?? "{ title }"}. Rispondi solo con emit_content.`,
      messages: [{ role: "user", content: `USP: ${profile.usp.join(", ")}\nTarget: ${profile.targetAudience}` }],
      tool: {
        name: "emit_content",
        description: "Emetti il content della sezione.",
        inputSchema: { type: "object", properties: { content: { type: "object" } }, required: ["content"] },
      },
      temperature: 0.7,
      maxTokens: 2048,
      ...(signal ? { signal } : {}),
    });
    const content = (data as { content?: unknown }).content;
    return {
      content: content && typeof content === "object" ? (content as Record<string, unknown>) : {},
      usage,
    };
  } catch (err) {
    logger.warn({ err, sectionType }, "Copywriter failed for section, leaving empty");
    return { content: {}, usage: { tokensIn: 0, tokensOut: 0 } };
  }
}
