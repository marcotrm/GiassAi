import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { workflows, workflowRuns, pendingApprovals, projects } from "@workspace/db/schema";
import { WfNode } from "@workspace/api-zod";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { generateWorkflow, activateWorkflow } from "../services/ai/workflow/orchestrator.js";
import { runWorkflow, resumeWorkflow } from "../services/workflow/engine.js";
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

/** Load a workflow and confirm its project belongs to the caller's org. */
async function loadWorkflowForOrg(workflowId: string, orgId: string) {
  const [wf] = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
  if (!wf) return null;
  if (!(await ownsProject(wf.projectId, orgId))) return null;
  return wf;
}

// POST /workflows/:projectId/generate
router.post("/workflows/:projectId/generate", requireAuth, async (req: Request, res: Response) => {
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
    const result = await generateWorkflow(projectId, req.user!.orgId, parsed.data.brief);
    res.status(201).json(result);
  } catch (err) {
    logger.error({ err, projectId }, "Workflow generation failed");
    res.status(500).json({ error: "Generation failed", message: err instanceof Error ? err.message : String(err) });
  }
});

// GET /workflows/:projectId — latest workflow for a project
router.get("/workflows/:projectId", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  if (!(await ownsProject(projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [wf] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.projectId, projectId))
    .orderBy(desc(workflows.createdAt))
    .limit(1);
  if (!wf) {
    res.status(404).json({ error: "No workflow generated yet" });
    return;
  }
  res.json({ workflowId: wf.id, name: wf.name, isActive: wf.isActive, nodes: wf.nodes });
});

// POST /workflows/:workflowId/activate
router.post("/workflows/:workflowId/activate", requireAuth, async (req: Request, res: Response) => {
  const workflowId = String(req.params["workflowId"]);
  const wf = await loadWorkflowForOrg(workflowId, req.user!.orgId);
  if (!wf) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }
  await activateWorkflow(workflowId);
  res.json({ workflowId, isActive: true });
});

// POST /workflows/:workflowId/test — manual run with sample trigger data
router.post("/workflows/:workflowId/test", requireAuth, async (req: Request, res: Response) => {
  const workflowId = String(req.params["workflowId"]);
  const wf = await loadWorkflowForOrg(workflowId, req.user!.orgId);
  if (!wf) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }
  const triggerData = (req.body as { triggerData?: unknown }).triggerData ?? {};
  try {
    const result = await runWorkflow(workflowId, triggerData, req.user!.orgId);
    res.json(result);
  } catch (err) {
    logger.error({ err, workflowId }, "Workflow test run failed");
    res.status(500).json({ error: "Run failed", message: err instanceof Error ? err.message : String(err) });
  }
});

// GET /workflows/:workflowId/runs
router.get("/workflows/:workflowId/runs", requireAuth, async (req: Request, res: Response) => {
  const workflowId = String(req.params["workflowId"]);
  const wf = await loadWorkflowForOrg(workflowId, req.user!.orgId);
  if (!wf) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }
  const runs = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.workflowId, workflowId))
    .orderBy(desc(workflowRuns.startedAt))
    .limit(50);
  res.json(runs);
});

// POST /workflows/approvals/:approvalId/resolve — resolve a human-in-the-loop
router.post("/workflows/approvals/:approvalId/resolve", requireAuth, async (req: Request, res: Response) => {
  const approvalId = String(req.params["approvalId"]);
  const action = String((req.body as { action?: unknown }).action ?? "");
  if (!action) {
    res.status(400).json({ error: "Missing action" });
    return;
  }
  // Ownership: approval -> run -> workflow -> project -> org
  const [ap] = await db.select().from(pendingApprovals).where(eq(pendingApprovals.id, approvalId)).limit(1);
  if (!ap) {
    res.status(404).json({ error: "Approval not found" });
    return;
  }
  const [run] = await db.select().from(workflowRuns).where(eq(workflowRuns.id, ap.runId)).limit(1);
  if (!run || !(await loadWorkflowForOrg(run.workflowId, req.user!.orgId))) {
    res.status(404).json({ error: "Approval not found" });
    return;
  }
  try {
    const result = await resumeWorkflow(approvalId, action, req.user!.id);
    res.json(result);
  } catch (err) {
    logger.error({ err, approvalId }, "Resume failed");
    res.status(500).json({ error: "Resume failed", message: err instanceof Error ? err.message : String(err) });
  }
});

// POST /hooks/form/:formId — PUBLIC: a landing form fires a workflow trigger.
router.post("/hooks/form/:formId", async (req: Request, res: Response) => {
  const formId = String(req.params["formId"]);
  // Find an active workflow whose trigger listens on this formId.
  const active = await db.select().from(workflows).where(eq(workflows.isActive, true));
  for (const wf of active) {
    const nodes = z.array(WfNode).safeParse(wf.nodes);
    if (!nodes.success) continue;
    const trigger = nodes.data.find(
      (n) => n.type === "trigger" && n.config.source === "form_submission" && n.config.formId === formId,
    );
    if (!trigger) continue;

    const [proj] = await db.select().from(projects).where(eq(projects.id, wf.projectId)).limit(1);
    if (!proj) continue;
    try {
      const result = await runWorkflow(wf.id, req.body, proj.orgId);
      res.status(202).json({ ok: true, runId: result.runId, status: result.status });
    } catch (err) {
      logger.error({ err, formId }, "Form-triggered run failed");
      res.status(500).json({ error: "Run failed" });
    }
    return;
  }
  res.status(404).json({ error: "No active workflow for this form" });
});

export default router;
