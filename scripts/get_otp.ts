import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { otpCodes } from '../drizzle/schema';
import { desc } from 'drizzle-orm';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  const db = drizzle(conn);
  const rows = await db.select().from(otpCodes).orderBy(desc(otpCodes.createdAt)).limit(5);
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
}

main().catch(console.error);
