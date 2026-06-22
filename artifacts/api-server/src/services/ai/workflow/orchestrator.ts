import { db } from "@workspace/db";
import { workflows, projectLinks, aiUsageLog } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { WorkflowDef } from "@workspace/api-zod";
import { getOrgCatalog } from "../../ecosystem/org-catalog.js";
import { runWorkflowArchitect } from "./architect-agent.js";
import { applyCrmPlan } from "../../crm/stages.js";
import { isDemoMode, pickDemoWorkflow } from "../demo/index.js";
import { MODELS, computeCostUsd } from "../models.js";
import { logger } from "../../../lib/logger.js";

export interface GenerateWorkflowResult {
  workflowId: string;
  def: WorkflowDef;
}

/**
 * Generate a workflow from a brief (Pattern B): Opus designs the node graph
 * given the org catalog, then we persist it (inactive) plus its project links.
 */
export async function generateWorkflow(
  projectId: string,
  orgId: string,
  brief: string,
  opts: { signal?: AbortSignal } = {},
): Promise<GenerateWorkflowResult> {
  if (isDemoMode()) return demoGenerateWorkflow(projectId, brief);

  const catalog = await getOrgCatalog(orgId);
  const { def, usage } = await runWorkflowArchitect(brief, catalog, opts.signal);

  const [wf] = await db
    .insert(workflows)
    .values({
      projectId,
      name: def.name,
      description: def.description ?? null,
      nodes: def.nodes,
      isActive: false,
    })
    .returning();

  if (def.projectLinks.length > 0) {
    await db
      .insert(projectLinks)
      .values(
        def.projectLinks.map((l) => ({
          sourceProjectId: l.sourceProjectId,
          targetProjectId: l.targetProjectId,
          linkType: l.linkType,
          fieldMapping: l.fieldMapping ?? {},
        })),
      )
      .onConflictDoNothing();
  }

  try {
    await db.insert(aiUsageLog).values({
      orgId,
      agentRole: "architect",
      model: MODELS.architect,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      costUsd: computeCostUsd(MODELS.architect, usage.tokensIn, usage.tokensOut),
      contextType: "project_generation",
    });
  } catch (err) {
    logger.warn({ err }, "Failed to write ai_usage_log");
  }

  // Provision a CRM board only if this workflow is a contact pipeline.
  try {
    await applyCrmPlan(projectId, brief, opts.signal);
  } catch (err) {
    logger.warn({ err, projectId }, "Failed to apply CRM plan");
  }

  logger.info({ projectId, workflowId: wf!.id, nodes: def.nodes.length }, "Workflow generated");
  return { workflowId: wf!.id, def };
}

/** Demo generation: pick a sector-matched sample workflow, persist it (no AI). */
async function demoGenerateWorkflow(projectId: string, brief: string): Promise<GenerateWorkflowResult> {
  const def = pickDemoWorkflow(brief);
  const [wf] = await db
    .insert(workflows)
    .values({ projectId, name: def.name, description: def.description ?? null, nodes: def.nodes, isActive: false })
    .returning();
  try {
    await applyCrmPlan(projectId, brief);
  } catch (err) {
    logger.warn({ err, projectId }, "Failed to apply CRM plan (demo)");
  }
  logger.info({ projectId, workflowId: wf!.id, demo: true }, "Workflow generated (demo)");
  return { workflowId: wf!.id, def };
}

export async function activateWorkflow(workflowId: string): Promise<void> {
  await db.update(workflows).set({ isActive: true }).where(eq(workflows.id, workflowId));
}
