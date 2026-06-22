import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { crmStages, crmContacts, projects, landingConfigs } from "@workspace/db/schema";
import { and, eq, asc, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { prefillSchedaFromLanding, generateDraftMessage, type BusinessScheda } from "../services/crm/ai-conversation.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

async function ownsProject(projectId: string, orgId: string): Promise<boolean> {
  const [p] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .limit(1);
  return !!p;
}

async function projectOfStage(stageId: string): Promise<string | null> {
  const [s] = await db.select({ projectId: crmStages.projectId }).from(crmStages).where(eq(crmStages.id, stageId)).limit(1);
  return s?.projectId ?? null;
}
async function projectOfContact(contactId: string): Promise<string | null> {
  const [c] = await db.select({ projectId: crmContacts.projectId }).from(crmContacts).where(eq(crmContacts.id, contactId)).limit(1);
  return c?.projectId ?? null;
}

// GET /crm/:projectId — full board: stages (ordered) + contacts.
router.get("/crm/:projectId", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  if (!(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const stages = await db
    .select()
    .from(crmStages)
    .where(eq(crmStages.projectId, projectId))
    .orderBy(asc(crmStages.position));
  const contacts = await db
    .select()
    .from(crmContacts)
    .where(eq(crmContacts.projectId, projectId))
    .orderBy(asc(crmContacts.position));
  res.json({ stages, contacts });
});

// GET /crm/:projectId/scheda — business scheda from project.config
router.get("/crm/:projectId/scheda", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  if (!(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [proj] = await db.select({ config: projects.config }).from(projects).where(eq(projects.id, projectId)).limit(1);
  const cfg = (proj?.config && typeof proj.config === "object" ? proj.config : {}) as Record<string, unknown>;
  res.json((cfg["businessScheda"] as BusinessScheda) ?? null);
});

// PUT /crm/:projectId/scheda — save business scheda
const SchedaBody = z.object({
  nomeAttivita: z.string().default(""),
  settore: z.string().default(""),
  orari: z.string().default(""),
  servizi: z.string().default(""),
  obiettivo: z.string().default("fissare un appuntamento"),
  tono: z.string().default("amichevole e professionale"),
  noteAggiuntive: z.string().default(""),
});
router.put("/crm/:projectId/scheda", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  if (!(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = SchedaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }
  const [proj] = await db.select({ config: projects.config }).from(projects).where(eq(projects.id, projectId)).limit(1);
  const cfg = (proj?.config && typeof proj.config === "object" ? proj.config : {}) as Record<string, unknown>;
  await db
    .update(projects)
    .set({ config: { ...cfg, businessScheda: parsed.data }, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId));
  res.json({ ok: true });
});

// POST /crm/:projectId/scheda/prefill — AI pre-fills scheda from linked landing
router.post("/crm/:projectId/scheda/prefill", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  if (!(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [proj] = await db.select({ config: projects.config }).from(projects).where(eq(projects.id, projectId)).limit(1);
  const cfg = (proj?.config && typeof proj.config === "object" ? proj.config : {}) as Record<string, unknown>;
  const landingProjectId = cfg["sourceLandingProjectId"] as string | undefined;
  if (!landingProjectId) {
    res.status(400).json({ error: "Nessuna landing collegata. Collega prima una landing." });
    return;
  }
  const [landing] = await db
    .select({ sections: landingConfigs.sections })
    .from(landingConfigs)
    .where(eq(landingConfigs.projectId, landingProjectId))
    .orderBy(desc(landingConfigs.createdAt))
    .limit(1);
  const landingHtml = (landing?.sections as { html?: string } | null)?.html;
  if (!landingHtml) {
    res.status(400).json({ error: "La landing collegata non ha ancora un contenuto HTML." });
    return;
  }
  try {
    const scheda = await prefillSchedaFromLanding(landingHtml);
    res.json(scheda);
  } catch (err) {
    logger.error({ err, projectId }, "Scheda prefill failed");
    res.status(500).json({ error: "Prefill fallito" });
  }
});

// POST /crm/contacts/:contactId/generate-draft — AI writes a first outreach message
router.post("/crm/contacts/:contactId/generate-draft", requireAuth, async (req: Request, res: Response) => {
  const contactId = String(req.params["contactId"]);
  const projectId = await projectOfContact(contactId);
  if (!projectId || !(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.id, contactId)).limit(1);
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }

  const [proj] = await db.select({ config: projects.config }).from(projects).where(eq(projects.id, projectId)).limit(1);
  const cfg = (proj?.config && typeof proj.config === "object" ? proj.config : {}) as Record<string, unknown>;
  const scheda = (cfg["businessScheda"] as BusinessScheda | undefined) ?? {
    nomeAttivita: "", settore: "", orari: "", servizi: "",
    obiettivo: "fissare un appuntamento", tono: "amichevole e professionale", noteAggiuntive: "",
  };

  const draft = await generateDraftMessage(
    { name: contact.name, email: contact.email, phone: contact.phone, fields: contact.fields as Record<string, unknown> | null },
    scheda,
    undefined,
  );

  // Persist the draft on the contact row
  await db.update(crmContacts).set({ aiDraft: draft, updatedAt: new Date().toISOString() }).where(eq(crmContacts.id, contactId));
  res.json({ draft });
});

// POST /crm/:projectId/stages — add a column.
const CreateStageBody = z.object({
  name: z.string().trim().min(1),
  color: z.string().optional(),
  kind: z.enum(["normal", "won", "lost"]).optional(),
});
router.post("/crm/:projectId/stages", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  if (!(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = CreateStageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }
  const existing = await db.select({ position: crmStages.position }).from(crmStages).where(eq(crmStages.projectId, projectId));
  const nextPos = existing.reduce((m, s) => Math.max(m, s.position + 1), 0);
  const [created] = await db
    .insert(crmStages)
    .values({
      projectId,
      name: parsed.data.name,
      color: parsed.data.color ?? "#64748b",
      kind: parsed.data.kind ?? "normal",
      position: nextPos,
    })
    .returning();
  res.status(201).json(created);
});

// PATCH /crm/stages/:stageId — rename / recolor / reorder.
const UpdateStageBody = z.object({
  name: z.string().trim().min(1).optional(),
  color: z.string().optional(),
  kind: z.enum(["normal", "won", "lost"]).optional(),
  position: z.number().int().optional(),
});
router.patch("/crm/stages/:stageId", requireAuth, async (req: Request, res: Response) => {
  const stageId = String(req.params["stageId"]);
  const projectId = await projectOfStage(stageId);
  if (!projectId || !(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Stage not found" });
    return;
  }
  const parsed = UpdateStageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }
  const [updated] = await db.update(crmStages).set(parsed.data).where(eq(crmStages.id, stageId)).returning();
  res.json(updated);
});

// DELETE /crm/stages/:stageId — remove a column.
router.delete("/crm/stages/:stageId", requireAuth, async (req: Request, res: Response) => {
  const stageId = String(req.params["stageId"]);
  const projectId = await projectOfStage(stageId);
  if (!projectId || !(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Stage not found" });
    return;
  }
  const [fallback] = await db
    .select({ id: crmStages.id })
    .from(crmStages)
    .where(and(eq(crmStages.projectId, projectId)))
    .orderBy(asc(crmStages.position));
  const fallbackId = fallback && fallback.id !== stageId ? fallback.id : null;
  await db.update(crmContacts).set({ stageId: fallbackId }).where(eq(crmContacts.stageId, stageId));
  await db.delete(crmStages).where(eq(crmStages.id, stageId));
  res.json({ ok: true });
});

// POST /crm/:projectId/contacts — manual add.
const CreateContactBody = z.object({
  name: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  stageId: z.string().uuid().optional(),
  notes: z.string().optional(),
  fields: z.record(z.unknown()).optional(),
});
router.post("/crm/:projectId/contacts", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  if (!(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }
  let stageId = parsed.data.stageId ?? null;
  if (!stageId) {
    const [first] = await db
      .select({ id: crmStages.id })
      .from(crmStages)
      .where(eq(crmStages.projectId, projectId))
      .orderBy(asc(crmStages.position))
      .limit(1);
    stageId = first?.id ?? null;
  }
  const [created] = await db
    .insert(crmContacts)
    .values({
      projectId,
      ...(stageId ? { stageId } : {}),
      name: parsed.data.name ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      notes: parsed.data.notes ?? "",
      source: "manual",
      fields: parsed.data.fields ?? {},
    })
    .returning();
  res.status(201).json(created);
});

// PATCH /crm/contacts/:contactId — move stage / edit fields / save aiDraft.
const UpdateContactBody = z.object({
  name: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  stageId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
  aiDraft: z.string().nullable().optional(),
  position: z.number().int().optional(),
});
router.patch("/crm/contacts/:contactId", requireAuth, async (req: Request, res: Response) => {
  const contactId = String(req.params["contactId"]);
  const projectId = await projectOfContact(contactId);
  if (!projectId || !(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  const parsed = UpdateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }
  const [updated] = await db
    .update(crmContacts)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(crmContacts.id, contactId))
    .returning();
  res.json(updated);
});

// DELETE /crm/contacts/:contactId
router.delete("/crm/contacts/:contactId", requireAuth, async (req: Request, res: Response) => {
  const contactId = String(req.params["contactId"]);
  const projectId = await projectOfContact(contactId);
  if (!projectId || !(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  await db.delete(crmContacts).where(eq(crmContacts.id, contactId));
  res.json({ ok: true });
});

export default router;
