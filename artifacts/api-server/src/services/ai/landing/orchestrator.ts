import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { landingConfigs, videoIdeas, aiUsageLog } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { LandingDef } from "@workspace/api-zod";
import { analyzeBusiness } from "./analyst.js";
import { researchCompetitors } from "./competitor.js";
import { generateSocialIdeas } from "./social-ideas.js";
import { buildLandingHtml } from "./builder.js";
import { pickSectorDNA } from "./sector-dna.js";
import { renderLandingHtml } from "../../landing/html-renderer.js";
import { isDemoMode, pickDemoLanding } from "../demo/index.js";
import { MODELS, computeCostUsd } from "../models.js";
import { logger } from "../../../lib/logger.js";

export interface GenerateLandingResult {
  landingId: string;
  def: LandingDef;
  html: string;
  ideasCount: number;
}

interface Usage {
  tokensIn: number;
  tokensOut: number;
}

const CONTACT_FORM = (formId: string) => ({
  formId,
  submitLabel: "Invia",
  fields: [
    { name: "nome", label: "Nome", type: "text" as const, required: true },
    { name: "email", label: "Email", type: "email" as const, required: true },
    { name: "telefono", label: "Telefono", type: "phone" as const, required: false },
    { name: "messaggio", label: "Messaggio", type: "textarea" as const, required: false },
  ],
});

/**
 * Bespoke landing pipeline (no template): Haiku analyst → sector visual DNA →
 * competitor web research → Sonnet builds the full HTML with UX/UI guidance →
 * Haiku social ideas → persist.
 */
export async function generateLanding(
  projectId: string,
  orgId: string,
  brief: string,
  opts: { signal?: AbortSignal } = {},
): Promise<GenerateLandingResult> {
  if (isDemoMode()) return demoGenerateLanding(projectId, brief);

  const { profile, usage: analystUsage } = await analyzeBusiness(brief, opts.signal);
  const dna = pickSectorDNA(profile.sector, brief);
  const { insights, usage: compUsage } = await researchCompetitors(profile, opts.signal);

  const formId = randomUUID();
  const { html, usage: buildUsage } = await buildLandingHtml({
    profile,
    dna,
    competitorInsights: insights,
    formId,
    ...(opts.signal ? { signal: opts.signal } : {}),
  });

  const { ideas, usage: ideasUsage } = await generateSocialIdeas(profile, opts.signal);

  const def: LandingDef = {
    template: "ai",
    theme: {
      primaryColor: dna.primary,
      secondaryColor: dna.secondary,
      accentColor: dna.accent,
      headingFont: dna.headingFont,
      bodyFont: dna.bodyFont,
    },
    sections: [{ id: "page", type: "hero", order: 0, content: {} }],
    forms: [CONTACT_FORM(formId)],
  };

  const [lc] = await db
    .insert(landingConfigs)
    .values({ projectId, template: "ai", sections: { def, html, formId }, forms: def.forms })
    .returning();

  await persistIdeas(projectId, ideas);
  await logUsage(orgId, buildUsage, [analystUsage, compUsage, ideasUsage]);

  logger.info({ projectId, landingId: lc!.id, sector: profile.sector, ideas: ideas.length }, "Landing generated (Sonnet build)");
  return { landingId: lc!.id, def, html, ideasCount: ideas.length };
}

/** Demo generation: pick a sector-matched sample landing, render HTML (no AI). */
async function demoGenerateLanding(projectId: string, brief: string): Promise<GenerateLandingResult> {
  const { def, ideas } = pickDemoLanding(brief);
  const html = renderLandingHtml(def);

  const [lc] = await db
    .insert(landingConfigs)
    .values({ projectId, template: def.template, sections: { def, html }, forms: def.forms })
    .returning();

  await persistIdeas(projectId, ideas);
  logger.info({ projectId, landingId: lc!.id, demo: true }, "Landing generated (demo)");
  return { landingId: lc!.id, def, html, ideasCount: ideas.length };
}

async function persistIdeas(projectId: string, ideas: { title: string; hook: string; script: string; cta?: string; hashtags: string[]; caption?: string; platform: string; format?: string; category: string }[]) {
  if (ideas.length === 0) return;
  await db.insert(videoIdeas).values(
    ideas.map((i) => ({
      projectId,
      title: i.title,
      hook: i.hook,
      script: i.script,
      cta: i.cta ?? null,
      hashtags: i.hashtags,
      caption: i.caption ?? null,
      platform: i.platform,
      format: i.format ?? null,
      category: i.category,
    })),
  );
}

async function logUsage(orgId: string, sonnetUsage: Usage, haikuUsages: Usage[]): Promise<void> {
  const sum = (us: Usage[]) => us.reduce((a, u) => ({ tokensIn: a.tokensIn + u.tokensIn, tokensOut: a.tokensOut + u.tokensOut }), { tokensIn: 0, tokensOut: 0 });
  const haiku = sum(haikuUsages);
  try {
    await db.insert(aiUsageLog).values([
      { orgId, agentRole: "builder", model: MODELS.builder, tokensIn: sonnetUsage.tokensIn, tokensOut: sonnetUsage.tokensOut, costUsd: computeCostUsd(MODELS.builder, sonnetUsage.tokensIn, sonnetUsage.tokensOut), contextType: "project_generation" },
      { orgId, agentRole: "executor", model: MODELS.executor, tokensIn: haiku.tokensIn, tokensOut: haiku.tokensOut, costUsd: computeCostUsd(MODELS.executor, haiku.tokensIn, haiku.tokensOut), contextType: "project_generation" },
    ]);
  } catch (err) {
    logger.warn({ err }, "Failed to write ai_usage_log");
  }
}

export async function publishLanding(landingId: string): Promise<{ publishedUrl: string }> {
  const url = `/p/${landingId}`; // served by the publish route; custom hosting is future work
  await db
    .update(landingConfigs)
    .set({ isPublished: true, publishedUrl: url })
    .where(eq(landingConfigs.id, landingId));
  return { publishedUrl: url };
}
