import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("WARNING: DATABASE_URL is not set. Database features will not work.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/mrcodeai",
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err) => {
  console.error("[DB Pool] Unexpected error:", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
