import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl && process.env.NODE_ENV !== "production") {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = dbUrl ? new Pool({ connectionString: dbUrl }) : (null as any);
export const db = dbUrl ? drizzle(pool, { schema }) : (null as any);

export * from "./schema";
