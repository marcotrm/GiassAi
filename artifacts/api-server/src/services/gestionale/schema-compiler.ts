import type {
  GestionaleSchemaDef,
  GestionaleTable,
  GestionaleColumn,
  GestionaleColumnType,
} from "@workspace/api-zod";

// ============================================================================
// Schema Compiler — turns a validated GestionaleSchemaDef into safe Postgres DDL.
// NO AI here. The LLM never emits SQL; this is the only thing that does.
// Identifiers are re-validated and double-quoted; user data never lands in DDL.
// ============================================================================

const IDENT_RE = /^[a-z][a-z0-9_]*$/;

function assertIdent(name: string, what: string): string {
  if (!IDENT_RE.test(name) || name.length > 58) {
    throw new Error(`Unsafe ${what} identifier: ${JSON.stringify(name)}`);
  }
  return name;
}

function q(name: string): string {
  // Identifier already validated against IDENT_RE → safe to quote.
  return `"${name}"`;
}

/** Postgres schema name for an org. UUIDs have hyphens → not valid raw identifiers. */
export function orgSchemaName(orgId: string): string {
  const safe = orgId.replace(/-/g, "_");
  if (!/^[0-9a-z_]+$/i.test(safe)) {
    throw new Error(`Invalid orgId: ${JSON.stringify(orgId)}`);
  }
  return `org_${safe}`;
}

const PG_TYPE: Record<GestionaleColumnType, string> = {
  text: "text",
  long_text: "text",
  number: "integer",
  decimal: "numeric",
  currency: "numeric(12,2)",
  boolean: "boolean",
  date: "date",
  datetime: "timestamptz",
  enum: "text",
  relation: "uuid",
  email: "text",
  phone: "text",
  url: "text",
  file: "text",
};

function columnDdl(col: GestionaleColumn, enumValues: Map<string, string[]>): string {
  assertIdent(col.name, "column");
  const parts = [q(col.name), PG_TYPE[col.type]];

  if (!col.nullable) parts.push("NOT NULL");
  if (col.unique) parts.push("UNIQUE");

  if (col.type === "enum" && col.enumName) {
    const values = enumValues.get(col.enumName) ?? [];
    if (values.length > 0) {
      // Values are escaped by doubling single quotes — these come from the schema def,
      // not from end-user input, but we escape defensively anyway.
      const list = values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
      parts.push(`CHECK (${q(col.name)} IN (${list}))`);
    }
  }
  return parts.join(" ");
}

export interface CompiledSchema {
  schemaName: string;
  /** Ordered DDL statements to run inside a single transaction. */
  statements: string[];
}

export function compileToDDL(def: GestionaleSchemaDef, orgId: string): CompiledSchema {
  const schemaName = orgSchemaName(orgId);
  const s = q(schemaName);
  const statements: string[] = [];

  statements.push(`CREATE SCHEMA IF NOT EXISTS ${s}`);

  const enumValues = new Map<string, string[]>(
    def.enums.map((e) => [e.name, e.values.map((v) => v.value)]),
  );

  // 1. Tables (without FK constraints — added later to avoid ordering/cycle issues).
  for (const table of def.tables) {
    assertIdent(table.name, "table");
    const cols: string[] = [
      `"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()`,
      `"org_id" uuid NOT NULL`,
    ];
    for (const col of table.columns) {
      cols.push(columnDdl(col, enumValues));
    }
    cols.push(`"created_at" timestamptz NOT NULL DEFAULT now()`);
    cols.push(`"updated_at" timestamptz NOT NULL DEFAULT now()`);
    statements.push(`CREATE TABLE IF NOT EXISTS ${s}.${q(table.name)} (\n  ${cols.join(",\n  ")}\n)`);
  }

  // 2. Many-to-many join tables.
  for (const rel of def.relations) {
    if (rel.type !== "many_to_many" || !rel.joinTable) continue;
    assertIdent(rel.joinTable, "join table");
    assertIdent(rel.from, "relation.from");
    assertIdent(rel.to, "relation.to");
    statements.push(
      `CREATE TABLE IF NOT EXISTS ${s}.${q(rel.joinTable)} (\n` +
        `  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n` +
        `  "org_id" uuid NOT NULL,\n` +
        `  ${q(rel.from + "_id")} uuid NOT NULL REFERENCES ${s}.${q(rel.from)}("id") ON DELETE CASCADE,\n` +
        `  ${q(rel.to + "_id")} uuid NOT NULL REFERENCES ${s}.${q(rel.to)}("id") ON DELETE CASCADE,\n` +
        `  "created_at" timestamptz NOT NULL DEFAULT now()\n)`,
    );
  }

  // 3. Foreign keys for relation columns + supporting indexes.
  for (const table of def.tables) {
    for (const col of table.columns) {
      if (col.type !== "relation" || !col.relationTo) continue;
      assertIdent(col.relationTo, "relationTo");
      const fkName = `fk_${table.name}_${col.name}`.slice(0, 58);
      statements.push(
        `ALTER TABLE ${s}.${q(table.name)} ADD CONSTRAINT ${q(fkName)} ` +
          `FOREIGN KEY (${q(col.name)}) REFERENCES ${s}.${q(col.relationTo)}("id") ON DELETE SET NULL`,
      );
      statements.push(
        `CREATE INDEX IF NOT EXISTS ${q(`idx_${table.name}_${col.name}`.slice(0, 58))} ` +
          `ON ${s}.${q(table.name)} (${q(col.name)})`,
      );
    }
    // org_id index for every table (RLS / filtering).
    statements.push(
      `CREATE INDEX IF NOT EXISTS ${q(`idx_${table.name}_org`.slice(0, 58))} ` +
        `ON ${s}.${q(table.name)} ("org_id")`,
    );
  }

  // 4. Row Level Security: each table isolated by org membership.
  for (const table of def.tables) {
    statements.push(`ALTER TABLE ${s}.${q(table.name)} ENABLE ROW LEVEL SECURITY`);
    statements.push(
      `CREATE POLICY ${q(`org_isolation_${table.name}`.slice(0, 58))} ON ${s}.${q(table.name)} ` +
        // org_members.user_id is text, auth.uid() is uuid → cast to compare.
        `USING ("org_id" IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()::text))`,
    );
  }

  return { schemaName, statements };
}

/** Column names that hold actual data (excludes system columns). Used for inserts. */
export function dataColumns(table: GestionaleTable): string[] {
  return table.columns.map((c) => c.name);
}
