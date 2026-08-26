import { access } from "node:fs/promises";
import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run database migrations");
  }

  const migrationsFolder = path.resolve(
    process.env.DRIZZLE_MIGRATIONS_DIR?.trim() || "drizzle-pg",
  );
  await access(path.join(migrationsFolder, "meta", "_journal.json"));

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 2,
    keepAlive: true,
    connectionTimeoutMillis: 15_000,
    ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
  });

  try {
    await pool.query("SELECT 1");
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder });
    console.log("[Migrations] Committed PostgreSQL migrations applied successfully");
  } finally {
    await pool.end();
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Migrations] Failed: ${message}`);
    process.exit(1);
  });
