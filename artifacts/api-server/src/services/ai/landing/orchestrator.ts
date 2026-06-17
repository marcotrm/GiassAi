import { db } from "@workspace/db";
import { landingConfigs, videoIdeas, projectLinks, aiUsageLog } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { LandingDef } from "@workspace/api-zod";
import { analyzeBusiness } from "./analyst.js";
import { runLandingArchitect } from "./architect-agent.js";
import { fillSectionContent } from "./copywriter.js";
import { generateSocialIdeas } from "./social-ideas.js";
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

/**
 * Landing pipeline: Haiku analyst → Opus structure → Sonnet copy (fan-out per
 * section) → deterministic HTML render → Haiku 10 social ideas → persist.
 */
export async function generateLanding(
  projectId: string,
  orgId: string,
  brief: string,
  opts: { signal?: AbortSignal } = {},
): Promise<GenerateLandingResult> {
  if (isDemoMode()) return demoGenerateLanding(projectId, brief);

  const { profile, usage: analystUsage } = await analyzeBusiness(brief, opts.signal);
  const { def, usage: archUsage } = await runLandingArchitect(profile, opts.signal);

  // Fan-out: copywriter fills each section's content in parallel.
  const copyUsages: Usage[] = [];
  await Promise.all(
    def.sections.map(async (s) => {
      const { content, usage } = await fillSectionContent(s.type, profile, opts.signal);
      s.content = content;
      copyUsages.push(usage);
    }),
  );

  const html = renderLandingHtml(def);
  const { ideas, usage: ideasUsage } = await generateSocialIdeas(profile, opts.signal);

  // Persist landing config (def + rendered html stored together in sections jsonb).
  const [lc] = await db
    .insert(landingConfigs)
    .values({ projectId, template: def.template, sections: { def, html }, forms: def.forms })
    .returning();

  if (ideas.length > 0) {
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

  // Cross-project links from form destinations (the ecosystem bridge).
  const links = def.forms
    .filter((f) => f.destination)
    .map((f) => ({
      sourceProjectId: projectId,
      targetProjectId: f.destination!.targetProjectId,
      linkType: f.destination!.kind === "workflow" ? "form_to_workflow" : "landing_to_gestionale",
      fieldMapping: {},
    }));
  if (links.length > 0) {
    await db.insert(projectLinks).values(links).onConflictDoNothing();
  }

  await logUsage(orgId, archUsage, copyUsages, [analystUsage, ideasUsage]);

  logger.info({ projectId, landingId: lc!.id, sections: def.sections.length, ideas: ideas.length }, "Landing generated");
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

  if (ideas.length > 0) {
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

  logger.info({ projectId, landingId: lc!.id, demo: true }, "Landing generated (demo)");
  return { landingId: lc!.id, def, html, ideasCount: ideas.length };
}

async function logUsage(
  orgId: string,
  archUsage: Usage,
  sonnetUsages: Usage[],
  haikuUsages: Usage[],
): Promise<void> {
  const sum = (us: Usage[]) => us.reduce((a, u) => ({ tokensIn: a.tokensIn + u.tokensIn, tokensOut: a.tokensOut + u.tokensOut }), { tokensIn: 0, tokensOut: 0 });
  const sonnet = sum(sonnetUsages);
  const haiku = sum(haikuUsages);
  try {
    await db.insert(aiUsageLog).values([
      { orgId, agentRole: "architect", model: MODELS.architect, tokensIn: archUsage.tokensIn, tokensOut: archUsage.tokensOut, costUsd: computeCostUsd(MODELS.architect, archUsage.tokensIn, archUsage.tokensOut), contextType: "project_generation" },
      { orgId, agentRole: "builder", model: MODELS.builder, tokensIn: sonnet.tokensIn, tokensOut: sonnet.tokensOut, costUsd: computeCostUsd(MODELS.builder, sonnet.tokensIn, sonnet.tokensOut), contextType: "project_generation" },
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
