import { db } from "@workspace/db";
import { gestionaleSchemas, aiUsageLog } from "@workspace/db/schema";
import { GestionaleSchemaDef, type GestionaleSchemaDef as GestionaleSchemaDefType } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";
import { runArchitect } from "./architect-agent.js";
import { generateViews, generateForm, generateSeed, type SubagentUsage } from "./subagents.js";
import { isDemoMode, pickDemoGestionale } from "../demo/index.js";
import { deployGestionale } from "../../gestionale/deploy.js";
import { MODELS, computeCostUsd } from "../models.js";
import { logger } from "../../../lib/logger.js";

export interface GenerateOptions {
  withSeed?: boolean;
  signal?: AbortSignal;
}

export interface GenerateResult {
  schemaId: string;
  version: number;
  def: GestionaleSchemaDefType;
}

/**
 * Full generation pipeline (Pattern B — code orchestrates):
 *   1 Opus call (schema) → parallel Haiku fan-out (views/form[/seed]) → persist (not deployed).
 * Returns the schema for user preview. Deploy happens separately after approval.
 */
export async function generateGestionale(
  projectId: string,
  orgId: string,
  brief: string,
  opts: GenerateOptions = {},
): Promise<GenerateResult> {
  if (isDemoMode()) return demoGenerate(projectId, brief);

  // 1. Architect (Opus) — the one expensive, critical reasoning step.
  const { def, usage: architectUsage } = await runArchitect(brief, opts.signal);

  // 2. Fan-out (Haiku) — one set of subagents per table, all in parallel.
  const subUsages: SubagentUsage[] = [];
  const seeds: Record<string, Record<string, unknown>[]> = {};

  await Promise.all(
    def.tables.map(async (table) => {
      const tasks: Promise<unknown>[] = [
        generateViews(table, opts.signal).then((r) => {
          table.views = r.views;
          subUsages.push(r.usage);
        }),
        generateForm(table, opts.signal).then((r) => {
          table.formLayout = r.formLayout;
          subUsages.push(r.usage);
        }),
      ];
      if (opts.withSeed) {
        tasks.push(
          generateSeed(table, def.name, def, opts.signal).then((r) => {
            seeds[table.name] = r.rows;
            subUsages.push(r.usage);
          }),
        );
      }
      await Promise.all(tasks);
    }),
  );

  // 3. Persist (next version, not yet deployed). Stash seeds in the row for deploy.
  const [latest] = await db
    .select({ version: gestionaleSchemas.version })
    .from(gestionaleSchemas)
    .where(eq(gestionaleSchemas.projectId, projectId))
    .orderBy(desc(gestionaleSchemas.version))
    .limit(1);
  const version = (latest?.version ?? 0) + 1;

  const [row] = await db
    .insert(gestionaleSchemas)
    .values({
      projectId,
      version,
      schemaJson: { def, seeds: opts.withSeed ? seeds : undefined },
    })
    .returning();

  // 4. Cost logging.
  await logUsage(orgId, architectUsage, subUsages);

  logger.info({ projectId, schemaId: row!.id, tables: def.tables.length }, "Gestionale generated");
  return { schemaId: row!.id, version, def };
}

/** Demo generation: pick a sector-matched sample schema, persist it (no AI). */
async function demoGenerate(projectId: string, brief: string): Promise<GenerateResult> {
  const def = pickDemoGestionale(brief);
  const [latest] = await db
    .select({ version: gestionaleSchemas.version })
    .from(gestionaleSchemas)
    .where(eq(gestionaleSchemas.projectId, projectId))
    .orderBy(desc(gestionaleSchemas.version))
    .limit(1);
  const version = (latest?.version ?? 0) + 1;
  const [row] = await db
    .insert(gestionaleSchemas)
    .values({ projectId, version, schemaJson: { def } })
    .returning();
  logger.info({ projectId, schemaId: row!.id, demo: true }, "Gestionale generated (demo)");
  return { schemaId: row!.id, version, def };
}

/** Deploy a previously generated (and approved) schema to the org's Postgres schema. */
export async function deployGestionaleSchema(schemaId: string, orgId: string) {
  const [row] = await db
    .select()
    .from(gestionaleSchemas)
    .where(eq(gestionaleSchemas.id, schemaId))
    .limit(1);

  if (!row) throw new Error("Gestionale schema not found");
  if (row.isDeployed) throw new Error("Gestionale already deployed");

  const stored = row.schemaJson as { def: unknown; seeds?: Record<string, Record<string, unknown>[]> };
  const def = GestionaleSchemaDef.parse(stored.def);

  const result = await deployGestionale(def, orgId, stored.seeds);

  await db
    .update(gestionaleSchemas)
    .set({ isDeployed: true, deployedAt: new Date().toISOString() })
    .where(eq(gestionaleSchemas.id, schemaId));

  return result;
}

async function logUsage(
  orgId: string,
  architectUsage: { tokensIn: number; tokensOut: number },
  subUsages: SubagentUsage[],
): Promise<void> {
  const subIn = subUsages.reduce((a, u) => a + u.tokensIn, 0);
  const subOut = subUsages.reduce((a, u) => a + u.tokensOut, 0);

  try {
    await db.insert(aiUsageLog).values([
      {
        orgId,
        agentRole: "architect",
        model: MODELS.architect,
        tokensIn: architectUsage.tokensIn,
        tokensOut: architectUsage.tokensOut,
        costUsd: computeCostUsd(MODELS.architect, architectUsage.tokensIn, architectUsage.tokensOut),
        contextType: "project_generation",
      },
      {
        orgId,
        agentRole: "executor",
        model: MODELS.executor,
        tokensIn: subIn,
        tokensOut: subOut,
        costUsd: computeCostUsd(MODELS.executor, subIn, subOut),
        contextType: "project_generation",
      },
    ]);
  } catch (err) {
    logger.warn({ err }, "Failed to write ai_usage_log");
  }
}
