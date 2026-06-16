import { z } from "zod";

// ============================================================================
// WorkflowDef — the contract emitted by the Architect (Opus) for a workflow.
// 4 node types (Relay-style): trigger, action, ai_task, human_in_the_loop.
// Nodes form a linked list via nextNodeId. Validated by Zod, then by
// validateWorkflowGraph() for cross-node invariants.
// ============================================================================

export const WfNodeType = z.enum(["trigger", "action", "ai_task", "human_in_the_loop"]);
export type WfNodeType = z.infer<typeof WfNodeType>;

export const WfCondition = z.object({
  field: z.string(),
  operator: z.enum(["eq", "neq", "gt", "lt", "contains"]),
  value: z.unknown(),
});

export const WfTriggerConfig = z.object({
  source: z.enum(["webhook", "schedule", "database_change", "form_submission", "manual"]),
  webhookUrl: z.string().optional(),
  cronExpression: z.string().optional(),
  tableName: z.string().optional(),
  operation: z.enum(["INSERT", "UPDATE", "DELETE"]).optional(),
  formId: z.string().optional(),
  sourceProjectId: z.string().uuid().optional(),
  conditions: z.array(WfCondition).optional(),
});

export const WfActionConfig = z.object({
  integration: z.enum(["supabase", "email", "slack", "http", "google_sheets"]),
  operation: z.string(),
  params: z.record(z.unknown()).default({}),
  targetProjectId: z.string().uuid().optional(),
  inputMapping: z.record(z.string()).default({}),
});

export const WfAiTaskConfig = z.object({
  prompt: z.string(),
  model: z.enum(["haiku", "mini"]).default("haiku"),
  inputFields: z.array(z.string()).default([]),
  outputSchema: z.record(z.enum(["string", "number", "boolean", "json"])).default({}),
});

export const WfHumanReviewConfig = z.object({
  title: z.string(),
  description: z.string().optional(),
  showFields: z.array(z.string()).default([]),
  actions: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        style: z.enum(["primary", "danger", "secondary"]).default("primary"),
      }),
    )
    .min(1),
  timeout: z.object({ hours: z.number(), defaultAction: z.string() }).optional(),
  notifyVia: z.array(z.enum(["dashboard", "email", "push"])).default(["dashboard"]),
});

export type WfTriggerConfig = z.infer<typeof WfTriggerConfig>;
export type WfActionConfig = z.infer<typeof WfActionConfig>;
export type WfAiTaskConfig = z.infer<typeof WfAiTaskConfig>;
export type WfHumanReviewConfig = z.infer<typeof WfHumanReviewConfig>;

const nodeBase = {
  id: z.string().min(1),
  label: z.string().min(1),
  position: z.number().int(),
  nextNodeId: z.string().nullable(),
  onError: z.enum(["stop", "skip", "retry"]).default("stop"),
};

export const WfNode = z.discriminatedUnion("type", [
  z.object({ type: z.literal("trigger"), ...nodeBase, config: WfTriggerConfig }),
  z.object({ type: z.literal("action"), ...nodeBase, config: WfActionConfig }),
  z.object({ type: z.literal("ai_task"), ...nodeBase, config: WfAiTaskConfig }),
  z.object({ type: z.literal("human_in_the_loop"), ...nodeBase, config: WfHumanReviewConfig }),
]);
export type WfNode = z.infer<typeof WfNode>;

export const WfProjectLink = z.object({
  sourceProjectId: z.string().uuid(),
  targetProjectId: z.string().uuid(),
  linkType: z.string(),
  fieldMapping: z.record(z.string()).optional(),
});

export const WorkflowDef = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(WfNode).min(1),
  projectLinks: z.array(WfProjectLink).default([]),
});
export type WorkflowDef = z.infer<typeof WorkflowDef>;

// ----------------------------------------------------------------------------
// Graph invariants (run after a successful Zod parse). Returns error strings.
// ----------------------------------------------------------------------------

/** Extract `{{a.b.c}}` variable roots referenced in a config object. */
function referencedVars(obj: unknown, out: Set<string>): void {
  if (typeof obj === "string") {
    const re = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(obj))) out.add(m[1]!);
  } else if (Array.isArray(obj)) {
    for (const v of obj) referencedVars(v, out);
  } else if (obj && typeof obj === "object") {
    for (const v of Object.values(obj)) referencedVars(v, out);
  }
}

export function validateWorkflowGraph(def: WorkflowDef): string[] {
  const errors: string[] = [];
  const byId = new Map(def.nodes.map((n) => [n.id, n]));

  if (byId.size !== def.nodes.length) errors.push("Duplicate node ids.");

  const triggers = def.nodes.filter((n) => n.type === "trigger");
  if (triggers.length !== 1) {
    errors.push(`A workflow must have exactly one trigger node (found ${triggers.length}).`);
  }
  if (triggers[0] && triggers[0].position !== 0) {
    errors.push("The trigger node must be at position 0.");
  }

  // Walk the linked list from the trigger; detect cycles and disconnected nodes.
  const visited = new Set<string>();
  let cursor: string | null = triggers[0]?.id ?? null;
  const producedSoFar = new Set<string>(["trigger"]);
  while (cursor) {
    if (visited.has(cursor)) {
      errors.push("Cycle detected in workflow nodes.");
      break;
    }
    visited.add(cursor);
    const node = byId.get(cursor);
    if (!node) {
      errors.push(`nextNodeId references unknown node "${cursor}".`);
      break;
    }
    // Any {{x.y}} variable must reference an already-produced node output.
    const refs = new Set<string>();
    referencedVars(node.config, refs);
    for (const ref of refs) {
      const root = ref.split(".")[0]!;
      if (!producedSoFar.has(root)) {
        errors.push(`Node "${node.id}" references "${ref}" before it is produced.`);
      }
    }
    producedSoFar.add(node.id);
    cursor = node.nextNodeId;
  }

  if (triggers[0] && visited.size !== def.nodes.length) {
    errors.push("Some nodes are not reachable from the trigger.");
  }

  return errors;
}
