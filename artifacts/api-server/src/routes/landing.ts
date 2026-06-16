import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { landingConfigs, videoIdeas, projects } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { generateLanding, publishLanding } from "../services/ai/landing/orchestrator.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const GenerateBody = z.object({ brief: z.string().trim().min(1) });

async function ownsProject(projectId: string, orgId: string): Promise<boolean> {
  const [p] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .limit(1);
  return !!p;
}

// POST /landing/:projectId/generate
router.post("/landing/:projectId/generate", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  const parsed = GenerateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }
  if (!(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  try {
    const result = await generateLanding(projectId, req.user!.orgId, parsed.data.brief);
    res.status(201).json(result);
  } catch (err) {
    logger.error({ err, projectId }, "Landing generation failed");
    res.status(500).json({ error: "Generation failed", message: err instanceof Error ? err.message : String(err) });
  }
});

// GET /landing/:projectId — latest config (def + html)
router.get("/landing/:projectId", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  if (!(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [lc] = await db
    .select()
    .from(landingConfigs)
    .where(eq(landingConfigs.projectId, projectId))
    .orderBy(desc(landingConfigs.createdAt))
    .limit(1);
  if (!lc) {
    res.status(404).json({ error: "No landing generated yet" });
    return;
  }
  const stored = lc.sections as { def?: unknown; html?: string };
  res.json({ landingId: lc.id, isPublished: lc.isPublished, publishedUrl: lc.publishedUrl, def: stored.def, html: stored.html });
});

// POST /landing/:landingId/publish
router.post("/landing/:landingId/publish", requireAuth, async (req: Request, res: Response) => {
  const landingId = String(req.params["landingId"]);
  const [lc] = await db.select().from(landingConfigs).where(eq(landingConfigs.id, landingId)).limit(1);
  if (!lc || !(await ownsProject(lc.projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Landing not found" });
    return;
  }
  const result = await publishLanding(landingId);
  res.json(result);
});

// GET /landing/:landingId/html — PUBLIC: serve the rendered page (preview/published).
router.get("/landing/:landingId/html", async (req: Request, res: Response) => {
  const landingId = String(req.params["landingId"]);
  const [lc] = await db.select().from(landingConfigs).where(eq(landingConfigs.id, landingId)).limit(1);
  if (!lc) {
    res.status(404).send("Not found");
    return;
  }
  const stored = lc.sections as { html?: string };
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(stored.html ?? "<!DOCTYPE html><html><body>Landing vuota</body></html>");
});

// GET /video-ideas/:projectId
router.get("/video-ideas/:projectId", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  if (!(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const ideas = await db
    .select()
    .from(videoIdeas)
    .where(eq(videoIdeas.projectId, projectId))
    .orderBy(desc(videoIdeas.createdAt));
  res.json(ideas);
});

export default router;
