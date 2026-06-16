import { db, pool } from "@workspace/db";
import { gestionaleSchemas } from "@workspace/db/schema";
import { GestionaleSchemaDef, type WfActionConfig } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";
import { orgSchemaName } from "../gestionale/schema-compiler.js";
import { resolveMapping, type RunContext } from "./context-resolver.js";
import { logger } from "../../lib/logger.js";

/**
 * Execute one action node. Returns the node's output, which is added to the
 * run context under the node id for downstream `{{nodeId.*}}` references.
 */
export async function runAction(
  config: WfActionConfig,
  ctx: RunContext,
  orgId: string,
): Promise<unknown> {
  const inputs = resolveMapping(config.inputMapping, ctx);

  switch (config.integration) {
    case "supabase":
      return supabaseInsert(config, inputs, orgId);
    case "http":
      return httpRequest(config, inputs);
    case "email":
      return sendEmail(config, inputs);
    default:
      throw new Error(`Integration "${config.integration}" not implemented yet`);
  }
}

async function loadDeployedDef(projectId: string) {
  const [row] = await db
    .select()
    .from(gestionaleSchemas)
    .where(eq(gestionaleSchemas.projectId, projectId))
    .orderBy(desc(gestionaleSchemas.version))
    .limit(1);
  if (!row || !row.isDeployed) return null;
  const stored = row.schemaJson as { def: unknown };
  const parsed = GestionaleSchemaDef.safeParse(stored.def);
  return parsed.success ? parsed.data : null;
}

async function supabaseInsert(
  config: WfActionConfig,
  inputs: Record<string, unknown>,
  orgId: string,
): Promise<unknown> {
  if (config.operation !== "insert_row") {
    throw new Error(`Unsupported supabase operation "${config.operation}"`);
  }
  if (!config.targetProjectId) throw new Error("supabase action requires targetProjectId");

  const tableName = String((config.params as { table?: unknown }).table ?? "");
  const def = await loadDeployedDef(config.targetProjectId);
  if (!def) throw new Error("Target gestionale is not deployed");

  const table = def.tables.find((t) => t.name === tableName);
  if (!table) throw new Error(`Unknown table "${tableName}" in target gestionale`);

  const allowed = new Set(table.columns.map((c) => c.name));
  const cols = Object.keys(inputs).filter((k) => allowed.has(k));
  if (cols.length === 0) throw new Error("No valid columns to insert");

  const schema = orgSchemaName(orgId);
  const allCols = ["org_id", ...cols];
  const placeholders = allCols.map((_, i) => `$${i + 1}`).join(", ");
  const colList = allCols.map((c) => `"${c}"`).join(", ");
  const values = [orgId, ...cols.map((c) => inputs[c])];

  const result = await pool.query(
    `INSERT INTO "${schema}"."${table.name}" (${colList}) VALUES (${placeholders}) RETURNING *`,
    values,
  );
  return result.rows[0];
}

async function httpRequest(
  config: WfActionConfig,
  inputs: Record<string, unknown>,
): Promise<unknown> {
  const url = String((config.params as { url?: unknown }).url ?? "");
  if (!url) throw new Error("http action requires params.url");
  const method = String((config.params as { method?: unknown }).method ?? "POST");

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(inputs),
  });
  return { status: res.status, ok: res.ok };
}

async function sendEmail(
  config: WfActionConfig,
  inputs: Record<string, unknown>,
): Promise<unknown> {
  // No email provider wired yet — log and simulate so workflows can be tested.
  logger.info({ params: config.params, inputs }, "email action (simulated)");
  return { sent: true, simulated: true };
}
