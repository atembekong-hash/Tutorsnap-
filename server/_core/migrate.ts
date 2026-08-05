import { access } from "node:fs/promises";
import path from "node:path";

import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run database migrations");
  }

  const migrationsFolder = path.resolve(
    process.env.DRIZZLE_MIGRATIONS_DIR?.trim() || "drizzle",
  );
  await access(path.join(migrationsFolder, "meta", "_journal.json"));

  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 2,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 15_000,
  });

  await pool.query("SELECT 1");
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
  console.log("[Migrations] Committed migrations applied successfully");

  // This file is a one-shot Railway pre-deploy process. mysql2 can leave a
  // TiDB TLS pool handle open after all awaited work has completed, so exit
  // explicitly here; the operating system closes the idle sockets.
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Migrations] Failed: ${message}`);
    process.exit(1);
  });
