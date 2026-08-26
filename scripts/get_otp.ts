import { desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { otpCodes } from "../drizzle/schema";

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 15_000,
    ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
  });
  try {
    const db = drizzle(pool);
    const rows = await db.select().from(otpCodes).orderBy(desc(otpCodes.createdAt)).limit(5);
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
