import { db } from "@workspace/db";
import { projects, gestionaleSchemas } from "@workspace/db/schema";
import { GestionaleSchemaDef } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

// Catalog of an org's projects, given to Architects so cross-project links
// (a workflow action writing into a real gestionale table) reference real ids.

export interface CatalogGestionaleTable {
  name: string;
  columns: { name: string; type: string }[];
}
export interface CatalogProject {
  id: string;
  name: string;
  type: string;
  status: string;
  tables?: CatalogGestionaleTable[]; // only for deployed gestionali
}
export interface OrgCatalog {
  projects: CatalogProject[];
}

export async function getOrgCatalog(orgId: string): Promise<OrgCatalog> {
  const rows = await db.select().from(projects).where(eq(projects.orgId, orgId));

  const out: CatalogProject[] = [];
  for (const p of rows) {
    const entry: CatalogProject = { id: p.id, name: p.name, type: p.type, status: p.status };

    if (p.type === "gestionale") {
      const [schema] = await db
        .select()
        .from(gestionaleSchemas)
        .where(eq(gestionaleSchemas.projectId, p.id))
        .orderBy(desc(gestionaleSchemas.version))
        .limit(1);
      if (schema?.isDeployed) {
        const parsed = GestionaleSchemaDef.safeParse((schema.schemaJson as { def: unknown }).def);
        if (parsed.success) {
          entry.tables = parsed.data.tables.map((t) => ({
            name: t.name,
            columns: t.columns.map((c) => ({ name: c.name, type: c.type })),
          }));
        }
      }
    }
    out.push(entry);
  }
  return { projects: out };
}
