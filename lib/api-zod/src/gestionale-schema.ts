import { z } from "zod";

// ============================================================================
// GestionaleSchema — the contract emitted by the Architect (Opus).
// This is the authoritative validation gate: nothing reaches the DB unless it
// parses here. The Architect's tool input_schema mirrors this loosely; Zod wins.
// ============================================================================

const identifier = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, "must be snake_case (lowercase, starts with a letter)")
  .max(58); // leave room for prefixes/suffixes within Postgres' 63-char limit

export const GestionaleColumnType = z.enum([
  "text",
  "long_text",
  "number",
  "decimal",
  "currency",
  "boolean",
  "date",
  "datetime",
  "enum",
  "relation",
  "email",
  "phone",
  "url",
  "file",
]);
export type GestionaleColumnType = z.infer<typeof GestionaleColumnType>;

export const GestionaleColumn = z.object({
  name: identifier,
  label: z.string().min(1),
  type: GestionaleColumnType,
  nullable: z.boolean().default(true),
  unique: z.boolean().default(false),
  default: z.unknown().optional(),
  enumName: z.string().optional(), // required when type === "enum"
  relationTo: z.string().optional(), // target table name, required when type === "relation"
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      regex: z.string().optional(),
      maxLength: z.number().int().positive().optional(),
    })
    .partial()
    .optional(),
  helpText: z.string().optional(),
});
export type GestionaleColumn = z.infer<typeof GestionaleColumn>;

export const GestionaleViewConfig = z.object({
  type: z.enum(["table", "kanban", "calendar", "gallery"]),
  label: z.string().min(1),
  visibleColumns: z.array(z.string()).min(1),
  groupByColumn: z.string().optional(), // kanban
  dateColumn: z.string().optional(), // calendar
  defaultSort: z
    .object({ column: z.string(), dir: z.enum(["asc", "desc"]) })
    .optional(),
});
export type GestionaleViewConfig = z.infer<typeof GestionaleViewConfig>;

export const GestionaleTable = z.object({
  name: identifier,
  label: z.string().min(1),
  description: z.string().optional(),
  primaryDisplayColumn: z.string().min(1),
  columns: z.array(GestionaleColumn).min(1),
  views: z.array(GestionaleViewConfig).optional(), // filled by subagent, not Opus
  formLayout: z.unknown().optional(), // filled by subagent
});
export type GestionaleTable = z.infer<typeof GestionaleTable>;

export const GestionaleRelation = z.object({
  type: z.enum(["one_to_many", "many_to_many"]),
  from: z.string().min(1), // table name
  to: z.string().min(1), // table name
  fromColumn: z.string().optional(), // FK column on the "many" side (one_to_many)
  joinTable: identifier.optional(), // many_to_many
});
export type GestionaleRelation = z.infer<typeof GestionaleRelation>;

export const GestionaleEnumDef = z.object({
  name: z.string().min(1),
  values: z
    .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
    .min(1),
});
export type GestionaleEnumDef = z.infer<typeof GestionaleEnumDef>;

export const GestionaleSchemaDef = z.object({
  version: z.number().int().default(1),
  name: z.string().min(1),
  tables: z.array(GestionaleTable).min(1).max(20),
  relations: z.array(GestionaleRelation).default([]),
  enums: z.array(GestionaleEnumDef).default([]),
});
export type GestionaleSchemaDef = z.infer<typeof GestionaleSchemaDef>;

// ----------------------------------------------------------------------------
// Cross-field invariants Zod can't express. Run AFTER a successful parse.
// Returns a list of human-readable errors (empty = valid).
// ----------------------------------------------------------------------------

export function checkGestionaleInvariants(def: GestionaleSchemaDef): string[] {
  const errors: string[] = [];
  const tableNames = new Set(def.tables.map((t) => t.name));
  const enumNames = new Set(def.enums.map((e) => e.name));

  if (tableNames.size !== def.tables.length) {
    errors.push("Duplicate table names detected.");
  }

  for (const table of def.tables) {
    const colNames = new Set(table.columns.map((c) => c.name));
    if (colNames.size !== table.columns.length) {
      errors.push(`Table "${table.name}" has duplicate column names.`);
    }
    if (!colNames.has(table.primaryDisplayColumn)) {
      errors.push(
        `Table "${table.name}": primaryDisplayColumn "${table.primaryDisplayColumn}" is not a column.`,
      );
    }
    for (const col of table.columns) {
      if (col.type === "enum") {
        if (!col.enumName) {
          errors.push(`Column "${table.name}.${col.name}" is enum but has no enumName.`);
        } else if (!enumNames.has(col.enumName)) {
          errors.push(
            `Column "${table.name}.${col.name}" references unknown enum "${col.enumName}".`,
          );
        }
      }
      if (col.type === "relation") {
        if (!col.relationTo) {
          errors.push(`Column "${table.name}.${col.name}" is relation but has no relationTo.`);
        } else if (!tableNames.has(col.relationTo)) {
          errors.push(
            `Column "${table.name}.${col.name}" references unknown table "${col.relationTo}".`,
          );
        }
      }
    }
    for (const view of table.views ?? []) {
      for (const vc of view.visibleColumns) {
        if (!colNames.has(vc)) {
          errors.push(`Table "${table.name}" view "${view.label}" references unknown column "${vc}".`);
        }
      }
    }
  }

  for (const rel of def.relations) {
    if (!tableNames.has(rel.from)) errors.push(`Relation references unknown table "${rel.from}".`);
    if (!tableNames.has(rel.to)) errors.push(`Relation references unknown table "${rel.to}".`);
  }

  return errors;
}
