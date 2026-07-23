import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { landingConfigs, videoIdeas, projects } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { generateLanding, publishLanding } from "../services/ai/landing/orchestrator.js";
import { editElementHtml } from "../services/ai/landing/editor.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const GenerateBody = z.object({
  brief: z.string().trim().min(1),
  logoDataUri: z.string().trim().max(600_000).optional(), // data URI del logo del cliente
});

async function ownsProject(projectId: string, orgId: string): Promise<boolean> {
  const [p] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .limit(1);
  return !!p;
}

async function loadLandingForOrg(landingId: string, orgId: string) {
  const [lc] = await db.select().from(landingConfigs).where(eq(landingConfigs.id, landingId)).limit(1);
  if (!lc) return null;
  if (!(await ownsProject(lc.projectId, orgId))) return null;
  return lc;
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
    const result = await generateLanding(projectId, req.user!.orgId, parsed.data.brief, {
      ...(parsed.data.logoDataUri ? { logoDataUri: parsed.data.logoDataUri } : {}),
    });
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

// POST /landing/:landingId/edit — AI edit of a single HTML fragment.
router.post("/landing/:landingId/edit", requireAuth, async (req: Request, res: Response) => {
  const landingId = String(req.params["landingId"]);
  const body = z.object({ elementHtml: z.string().min(1), instruction: z.string().trim().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request", details: body.error.flatten() });
    return;
  }
  const lc = await loadLandingForOrg(landingId, req.user!.orgId);
  if (!lc) {
    res.status(404).json({ error: "Landing not found" });
    return;
  }
  try {
    const { html } = await editElementHtml(body.data.elementHtml, body.data.instruction);
    res.json({ html });
  } catch (err) {
    logger.error({ err, landingId }, "Landing edit failed");
    res.status(500).json({ error: "Edit failed", message: err instanceof Error ? err.message : String(err) });
  }
});

// PUT /landing/:landingId/html — save the (edited) full page HTML.
router.put("/landing/:landingId/html", requireAuth, async (req: Request, res: Response) => {
  const landingId = String(req.params["landingId"]);
  const body = z.object({ html: z.string().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request", details: body.error.flatten() });
    return;
  }
  const lc = await loadLandingForOrg(landingId, req.user!.orgId);
  if (!lc) {
    res.status(404).json({ error: "Landing not found" });
    return;
  }
  const stored = (lc.sections ?? {}) as Record<string, unknown>;
  await db
    .update(landingConfigs)
    .set({ sections: { ...stored, html: body.data.html }, updatedAt: new Date().toISOString() })
    .where(eq(landingConfigs.id, landingId));
  res.json({ ok: true });
});

export default router;
