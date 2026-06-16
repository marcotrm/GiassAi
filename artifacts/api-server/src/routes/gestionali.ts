import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, pool } from "@workspace/db";
import { gestionaleSchemas, projects } from "@workspace/db/schema";
import { GestionaleSchemaDef, type GestionaleSchemaDef as GestionaleSchemaDefType } from "@workspace/api-zod";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { generateGestionale, deployGestionaleSchema } from "../services/ai/gestionale/orchestrator.js";
import { orgSchemaName } from "../services/gestionale/schema-compiler.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const GenerateBody = z.object({
  brief: z.string().trim().min(1),
  withSeed: z.boolean().optional(),
});

/** Verify the project belongs to the caller's org and is a gestionale. */
async function loadProject(projectId: string, orgId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .limit(1);
  return project;
}

async function loadLatestDef(projectId: string): Promise<{
  row: typeof gestionaleSchemas.$inferSelect;
  def: GestionaleSchemaDefType;
} | null> {
  const [row] = await db
    .select()
    .from(gestionaleSchemas)
    .where(eq(gestionaleSchemas.projectId, projectId))
    .orderBy(desc(gestionaleSchemas.version))
    .limit(1);
  if (!row) return null;
  const stored = row.schemaJson as { def: unknown };
  const parsed = GestionaleSchemaDef.safeParse(stored.def);
  if (!parsed.success) return null;
  return { row, def: parsed.data };
}

// POST /gestionali/:projectId/generate — run Architect + fan-out, return schema preview.
router.post("/gestionali/:projectId/generate", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  const parsed = GenerateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const project = await loadProject(projectId, req.user!.orgId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  try {
    const result = await generateGestionale(
      projectId,
      req.user!.orgId,
      parsed.data.brief,
      parsed.data.withSeed !== undefined ? { withSeed: parsed.data.withSeed } : {},
    );
    res.status(201).json(result);
  } catch (err) {
    logger.error({ err, projectId }, "Gestionale generation failed");
    res.status(500).json({ error: "Generation failed", message: err instanceof Error ? err.message : String(err) });
  }
});

// GET /gestionali/:projectId/schema — latest generated schema.
router.get("/gestionali/:projectId/schema", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  const project = await loadProject(projectId, req.user!.orgId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const loaded = await loadLatestDef(projectId);
  if (!loaded) {
    res.status(404).json({ error: "No schema generated yet" });
    return;
  }
  res.json({ schemaId: loaded.row.id, version: loaded.row.version, isDeployed: loaded.row.isDeployed, def: loaded.def });
});

// POST /gestionali/:schemaId/deploy — deploy an approved schema.
router.post("/gestionali/:schemaId/deploy", requireAuth, async (req: Request, res: Response) => {
  const schemaId = String(req.params["schemaId"]);

  // Ownership check: the schema's project must belong to the caller's org.
  const [row] = await db
    .select({ projectId: gestionaleSchemas.projectId })
    .from(gestionaleSchemas)
    .where(eq(gestionaleSchemas.id, schemaId))
    .limit(1);
  if (!row || !(await loadProject(row.projectId, req.user!.orgId))) {
    res.status(404).json({ error: "Schema not found" });
    return;
  }

  try {
    const result = await deployGestionaleSchema(schemaId, req.user!.orgId);
    res.json(result);
  } catch (err) {
    logger.error({ err, schemaId }, "Gestionale deploy failed");
    res.status(500).json({ error: "Deploy failed", message: err instanceof Error ? err.message : String(err) });
  }
});

// GET /gestionali/:projectId/data?table=clienti — read rows from a deployed table.
router.get("/gestionali/:projectId/data", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  const tableName = String(req.query["table"] ?? "");

  const project = await loadProject(projectId, req.user!.orgId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const loaded = await loadLatestDef(projectId);
  if (!loaded || !loaded.row.isDeployed) {
    res.status(409).json({ error: "Gestionale not deployed" });
    return;
  }
  const table = loaded.def.tables.find((t) => t.name === tableName);
  if (!table) {
    res.status(400).json({ error: `Unknown table "${tableName}"` });
    return;
  }

  const schema = orgSchemaName(req.user!.orgId);
  const result = await pool.query(
    `SELECT * FROM "${schema}"."${table.name}" WHERE "org_id" = $1 ORDER BY "created_at" DESC LIMIT 200`,
    [req.user!.orgId],
  );
  res.json(result.rows);
});

// POST /gestionali/:projectId/data — insert a row (validated against the schema).
router.post("/gestionali/:projectId/data", requireAuth, async (req: Request, res: Response) => {
  const projectId = String(req.params["projectId"]);
  const body = z.object({ table: z.string(), values: z.record(z.unknown()) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request", details: body.error.flatten() });
    return;
  }

  const project = await loadProject(projectId, req.user!.orgId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const loaded = await loadLatestDef(projectId);
  if (!loaded || !loaded.row.isDeployed) {
    res.status(409).json({ error: "Gestionale not deployed" });
    return;
  }
  const table = loaded.def.tables.find((t) => t.name === body.data.table);
  if (!table) {
    res.status(400).json({ error: `Unknown table "${body.data.table}"` });
    return;
  }

  const allowed = new Set(table.columns.map((c) => c.name));
  const cols = Object.keys(body.data.values).filter((k) => allowed.has(k));
  if (cols.length === 0) {
    res.status(400).json({ error: "No valid columns provided" });
    return;
  }

  const schema = orgSchemaName(req.user!.orgId);
  const allCols = ["org_id", ...cols];
  const placeholders = allCols.map((_, i) => `$${i + 1}`).join(", ");
  const colList = allCols.map((c) => `"${c}"`).join(", ");
  const values = [req.user!.orgId, ...cols.map((c) => body.data.values[c])];

  try {
    const result = await pool.query(
      `INSERT INTO "${schema}"."${table.name}" (${colList}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error({ err, projectId, table: table.name }, "Row insert failed");
    res.status(500).json({ error: "Insert failed", message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
