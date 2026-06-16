import { pool } from "@workspace/db";
import type { GestionaleSchemaDef, GestionaleTable } from "@workspace/api-zod";
import { compileToDDL, orgSchemaName } from "./schema-compiler.js";
import { logger } from "../../lib/logger.js";

const IDENT_RE = /^[a-z][a-z0-9_]*$/;

export interface DeployResult {
  schemaName: string;
  statementsRun: number;
  seededRows: number;
}

/**
 * Runs the compiled DDL for a gestionale schema inside a single transaction.
 * Optionally inserts seed rows (parameterized — never string-interpolated).
 */
export async function deployGestionale(
  def: GestionaleSchemaDef,
  orgId: string,
  seeds?: Record<string, Record<string, unknown>[]>, // tableName -> rows
): Promise<DeployResult> {
  const { schemaName, statements } = compileToDDL(def, orgId);
  const client = await pool.connect();
  let seededRows = 0;

  try {
    await client.query("BEGIN");

    for (const stmt of statements) {
      await client.query(stmt);
    }

    if (seeds) {
      for (const table of def.tables) {
        const rows = seeds[table.name];
        if (!rows?.length) continue;
        seededRows += await insertRows(client, schemaName, table, rows, orgId);
      }
    }

    await client.query("COMMIT");
    logger.info({ schemaName, statements: statements.length, seededRows }, "Gestionale deployed");
    return { schemaName, statementsRun: statements.length, seededRows };
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err, schemaName }, "Gestionale deploy failed, rolled back");
    throw err;
  } finally {
    client.release();
  }
}

// Minimal structural type for a pooled client — avoids pg's overloaded connect()
// type resolving to `void`. Sufficient for the parameterized queries below.
interface PgClient {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

async function insertRows(
  client: PgClient,
  schemaName: string,
  table: GestionaleTable,
  rows: Record<string, unknown>[],
  orgId: string,
): Promise<number> {
  const dataCols = new Set(
    table.columns
      .filter((c) => c.type !== "relation" && IDENT_RE.test(c.name))
      .map((c) => c.name),
  );
  let count = 0;

  for (const row of rows) {
    const cols = Object.keys(row).filter((k) => dataCols.has(k));
    if (cols.length === 0) continue;

    const allCols = ["org_id", ...cols];
    const placeholders = allCols.map((_, i) => `$${i + 1}`).join(", ");
    const colList = allCols.map((c) => `"${c}"`).join(", ");
    const values = [orgId, ...cols.map((c) => row[c])];

    await client.query(
      `INSERT INTO "${schemaName}"."${table.name}" (${colList}) VALUES (${placeholders})`,
      values,
    );
    count++;
  }
  return count;
}

export { orgSchemaName };
