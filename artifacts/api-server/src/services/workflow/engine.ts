import { z } from "zod";
import { db } from "@workspace/db";
import { workflows, workflowRuns, pendingApprovals } from "@workspace/db/schema";
import { WfNode, type WfNode as WfNodeType } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { runAction } from "./actions.js";
import { runAiTask } from "./ai-task.js";
import { getByPath, type RunContext } from "./context-resolver.js";
import { logger } from "../../lib/logger.js";

const NodeArray = z.array(WfNode);

export interface RunResult {
  runId: string;
  status: "completed" | "failed" | "paused_human_review";
  error?: string;
}

/** Start a workflow run from its trigger with the given trigger payload. */
export async function runWorkflow(
  workflowId: string,
  triggerData: unknown,
  orgId: string,
): Promise<RunResult> {
  const [wf] = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
  if (!wf) throw new Error("Workflow not found");

  const nodes = NodeArray.parse(wf.nodes);
  const trigger = nodes.find((n) => n.type === "trigger");
  if (!trigger) throw new Error("Workflow has no trigger node");

  // __orgId is stashed in the context so a later resume() can recover it.
  const context: RunContext = { trigger: { data: triggerData }, __orgId: orgId };
  const [run] = await db
    .insert(workflowRuns)
    .values({ workflowId, status: "running", currentNodeId: trigger.nextNodeId, context })
    .returning();

  return executeFrom(run!.id, nodes, trigger.nextNodeId, context, orgId);
}

/** Resume a paused run after a human-in-the-loop approval is resolved. */
export async function resumeWorkflow(
  approvalId: string,
  actionValue: string,
  resolvedBy: string,
): Promise<RunResult> {
  const [ap] = await db.select().from(pendingApprovals).where(eq(pendingApprovals.id, approvalId)).limit(1);
  if (!ap) throw new Error("Approval not found");
  if (ap.status !== "pending") throw new Error("Approval already resolved");

  const [run] = await db.select().from(workflowRuns).where(eq(workflowRuns.id, ap.runId)).limit(1);
  if (!run) throw new Error("Run not found");
  const [wf] = await db.select().from(workflows).where(eq(workflows.id, run.workflowId)).limit(1);
  if (!wf) throw new Error("Workflow not found");

  const nodes = NodeArray.parse(wf.nodes);
  const node = nodes.find((n) => n.id === ap.nodeId);
  if (!node) throw new Error("Approval node not found in workflow");

  const context = (run.context ?? {}) as RunContext;
  context[node.id] = { action: actionValue };

  await db
    .update(pendingApprovals)
    .set({ status: "resolved", resolvedBy, resolvedAction: actionValue, resolvedAt: new Date().toISOString() })
    .where(eq(pendingApprovals.id, approvalId));
  await db.update(workflowRuns).set({ status: "running" }).where(eq(workflowRuns.id, run.id));

  const orgId = String(context["__orgId"] ?? "");
  return executeFrom(run.id, nodes, node.nextNodeId, context, orgId);
}

async function executeFrom(
  runId: string,
  nodes: WfNodeType[],
  startId: string | null,
  context: RunContext,
  orgId: string,
): Promise<RunResult> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let cursor = startId;

  while (cursor) {
    const node = byId.get(cursor);
    if (!node) return fail(runId, `nextNodeId references unknown node "${cursor}"`);

    if (node.type === "human_in_the_loop") {
      const displayData: Record<string, unknown> = {};
      for (const f of node.config.showFields) displayData[f] = getByPath(context, f);
      await db.insert(pendingApprovals).values({
        runId,
        nodeId: node.id,
        title: node.config.title,
        description: node.config.description ?? null,
        displayData,
        actions: node.config.actions,
      });
      await db
        .update(workflowRuns)
        .set({ status: "paused_human_review", currentNodeId: node.id, context })
        .where(eq(workflowRuns.id, runId));
      return { runId, status: "paused_human_review" };
    }

    let result: unknown;
    try {
      result = await executeNode(node, context, orgId);
    } catch (err) {
      return fail(runId, err instanceof Error ? err.message : String(err));
    }

    context[node.id] = result;
    await db.update(workflowRuns).set({ currentNodeId: node.id, context }).where(eq(workflowRuns.id, runId));
    cursor = node.nextNodeId;
  }

  await db
    .update(workflowRuns)
    .set({ status: "completed", completedAt: new Date().toISOString(), context })
    .where(eq(workflowRuns.id, runId));
  return { runId, status: "completed" };
}

async function executeNode(node: WfNodeType, context: RunContext, orgId: string): Promise<unknown> {
  const attempts = node.onError === "retry" ? 3 : 1;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      if (node.type === "action") return await runAction(node.config, context, orgId);
      if (node.type === "ai_task") return await runAiTask(node.config, context);
      return null;
    } catch (err) {
      lastErr = err;
      if (node.onError === "skip") return { skipped: true, error: String(err) };
      logger.warn({ nodeId: node.id, attempt: i + 1 }, "Node execution failed");
    }
  }
  throw lastErr;
}

async function fail(runId: string, error: string): Promise<RunResult> {
  await db
    .update(workflowRuns)
    .set({ status: "failed", error, completedAt: new Date().toISOString() })
    .where(eq(workflowRuns.id, runId));
  return { runId, status: "failed", error };
}
