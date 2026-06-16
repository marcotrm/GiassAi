import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { projects } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const CreateProjectBody = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["gestionale", "landing", "workflow", "video_ideas"]),
  description: z.string().optional(),
});

const UpdateProjectBody = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  config: z.unknown().optional(),
});

const router: IRouter = Router();

router.get("/projects", requireAuth, async (req: Request, res: Response) => {
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, req.user!.orgId))
    .orderBy(desc(projects.createdAt));

  res.json(result);
});

router.post("/projects", requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const [created] = await db
    .insert(projects)
    .values({
      ...parsed.data,
      orgId: req.user!.orgId,
      createdBy: req.user!.id,
    })
    .returning();

  res.status(201).json(created);
});

router.get("/projects/:id", requireAuth, async (req: Request, res: Response) => {
  const id = req.params["id"] ? String(req.params["id"]) : "";
  if (!id) {
    res.status(400).json({ error: "Missing project ID" });
    return;
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, req.user!.orgId)))
    .limit(1);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(project);
});

router.patch("/projects/:id", requireAuth, async (req: Request, res: Response) => {
  const id = req.params["id"] ? String(req.params["id"]) : "";
  if (!id) {
    res.status(400).json({ error: "Missing project ID" });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const [updated] = await db
    .update(projects)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(and(eq(projects.id, id), eq(projects.orgId, req.user!.orgId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(updated);
});

router.delete("/projects/:id", requireAuth, async (req: Request, res: Response) => {
  const id = req.params["id"] ? String(req.params["id"]) : "";
  if (!id) {
    res.status(400).json({ error: "Missing project ID" });
    return;
  }

  const [archived] = await db
    .update(projects)
    .set({ status: "archived", updatedAt: new Date().toISOString() })
    .where(and(eq(projects.id, id), eq(projects.orgId, req.user!.orgId)))
    .returning();

  if (!archived) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(archived);
});

export default router;
