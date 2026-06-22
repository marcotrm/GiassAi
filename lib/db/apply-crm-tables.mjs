// Additive migration: create crm_stages and crm_contacts (Fase 1 CRM).
// Uses IF NOT EXISTS — safe to re-run; touches no existing tables/data.
// Constraint names follow Drizzle's convention so a later `drizzle-kit push`
// detects no drift.
import { readFileSync } from "node:fs";
import dns from "node:dns";
import pg from "pg";

const env = readFileSync(new URL("../../.env", import.meta.url), "utf8");
const match = env.match(/^DATABASE_URL=(.*)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env");
const url = match[1].trim().replace(/^["']|["']$/g, "");

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const lookup = (hostname, _opts, cb) =>
  dns.resolve4(hostname, (err, addrs) => (err ? cb(err, "", 4) : cb(null, addrs[0], 4)));

const client = new pg.Client({ connectionString: url, lookup });
await client.connect();

const ddl = `
CREATE TABLE IF NOT EXISTS "crm_stages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "name" text NOT NULL,
  "color" text DEFAULT '#64748b' NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "kind" text DEFAULT 'normal' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "crm_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "stage_id" uuid,
  "name" text,
  "email" text,
  "phone" text,
  "source" text DEFAULT 'manual' NOT NULL,
  "fields" jsonb DEFAULT '{}'::jsonb,
  "notes" text DEFAULT '',
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
`;

await client.query(ddl);

// Foreign keys (added separately so IF NOT EXISTS table creation stays simple).
async function addFk(table, name, sql) {
  const { rows } = await client.query(
    `SELECT 1 FROM pg_constraint WHERE conname = $1 AND conrelid = $2::regclass`,
    [name, `"${table}"`],
  );
  if (rows.length === 0) {
    await client.query(sql);
    console.log("  [+] FK", name);
  } else {
    console.log("  [=] FK", name, "already exists");
  }
}

await addFk(
  "crm_stages",
  "crm_stages_project_id_projects_id_fk",
  `ALTER TABLE "crm_stages" ADD CONSTRAINT "crm_stages_project_id_projects_id_fk"
     FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade`,
);
await addFk(
  "crm_contacts",
  "crm_contacts_project_id_projects_id_fk",
  `ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_project_id_projects_id_fk"
     FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade`,
);
await addFk(
  "crm_contacts",
  "crm_contacts_stage_id_crm_stages_id_fk",
  `ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_stage_id_crm_stages_id_fk"
     FOREIGN KEY ("stage_id") REFERENCES "crm_stages"("id") ON DELETE set null`,
);

// Verify
const { rows } = await client.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name IN ('crm_stages','crm_contacts') ORDER BY table_name`,
);
console.log("\nTables present:", rows.map((r) => r.table_name).join(", ") || "(none)");

await client.end();
console.log("Done.");
