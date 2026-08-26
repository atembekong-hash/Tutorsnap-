"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/_core/migrate.ts
var import_promises = require("node:fs/promises");
var import_node_path = __toESM(require("node:path"));
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_migrator = require("drizzle-orm/node-postgres/migrator");
var import_pg = require("pg");
async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run database migrations");
  }
  const migrationsFolder = import_node_path.default.resolve(
    process.env.DRIZZLE_MIGRATIONS_DIR?.trim() || "drizzle-pg"
  );
  await (0, import_promises.access)(import_node_path.default.join(migrationsFolder, "meta", "_journal.json"));
  const pool = new import_pg.Pool({
    connectionString: databaseUrl,
    max: 2,
    keepAlive: true,
    connectionTimeoutMillis: 15e3,
    ssl: process.env.DATABASE_SSL === "false" ? void 0 : { rejectUnauthorized: false }
  });
  try {
    await pool.query("SELECT 1");
    const db = (0, import_node_postgres.drizzle)(pool);
    await (0, import_migrator.migrate)(db, { migrationsFolder });
    console.log("[Migrations] Committed PostgreSQL migrations applied successfully");
  } finally {
    await pool.end();
  }
}
runMigrations().then(() => process.exit(0)).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Migrations] Failed: ${message}`);
  process.exit(1);
});
