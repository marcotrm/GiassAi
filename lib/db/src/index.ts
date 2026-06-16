import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dns from "dns";
import * as schema from "./schema";

const { Pool } = pg;

// Bypass TIM router DNS hijacking — use Google + Cloudflare DNS
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const lookup = (
  hostname: string,
  _options: unknown,
  callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
) => {
  dns.resolve4(hostname, (err, addresses) => {
    if (err) return callback(err, "", 4);
    callback(null, addresses[0] as string, 4);
  });
};

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  lookup,
} as pg.PoolConfig);
export const db = drizzle(pool, { schema });

export * from "./schema";
