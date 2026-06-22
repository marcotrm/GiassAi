// Additive migration: add ai_draft column to crm_contacts (Fase 2).
// IF NOT EXISTS — safe to re-run.
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

const { rows: existing } = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_name = 'crm_contacts' AND column_name = 'ai_draft'`,
);
if (existing.length === 0) {
  await client.query(`ALTER TABLE "crm_contacts" ADD COLUMN "ai_draft" text`);
  console.log("  [+] Column ai_draft added to crm_contacts");
} else {
  console.log("  [=] Column ai_draft already exists");
}

await client.end();
console.log("Done.");
