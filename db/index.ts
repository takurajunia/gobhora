import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle({ client: pool });
