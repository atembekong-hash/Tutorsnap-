/**
 * Integration tests for the isInGracePeriod column.
 *
 * These tests fire real HTTP requests against the local dev server
 * (http://127.0.0.1:3000) and then query the live database to confirm
 * that the column is set and cleared correctly by the webhook handler.
 *
 * Prerequisites (satisfied in CI / sandbox):
 *   - Dev server is running on port 3000
 *   - DATABASE_URL is set in the environment
 *   - Test user subscription row exists (revenueCatUserId = "email:test@tutorsnap.test")
 *   - REVENUECAT_WEBHOOK_SECRET is NOT set (so no auth header is required)
 *
 * Scenarios:
 *   1. BILLING_ISSUE  → isInGracePeriod = true  (DB column = 1)
 *   2. RENEWAL        → isInGracePeriod = false (DB column = 0)
 *   3. GRACE_PERIOD_START → isInGracePeriod = true
 *   4. GRACE_PERIOD_END   → isInGracePeriod = false (status = expired)
 *   5. Source-code contract: webhook handler writes isInGracePeriod on update and insert
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as mysql from "mysql2/promise";

const ROOT = path.resolve(__dirname, "..");

const SERVER_URL = "http://127.0.0.1:3000";
const RC_USER_ID = "email:test@tutorsnap.test";
const PRODUCT_ID = "tutorsnap_premium_monthly";

async function sendWebhook(
  eventType: string,
  overrides: Record<string, unknown> = {}
): Promise<{ ok: boolean; handled: boolean; status?: string; reason?: string }> {
  const now = Date.now();
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
  const body = JSON.stringify({
    event: {
      type: eventType,
      app_user_id: RC_USER_ID,
      product_id: PRODUCT_ID,
      expiration_at_ms: expiresAt,
      purchased_at_ms: now,
      environment: "PRODUCTION",
      ...overrides,
    },
  });
  const res = await fetch(`${SERVER_URL}/api/webhooks/revenuecat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return res.json() as Promise<{ ok: boolean; handled: boolean; status?: string; reason?: string }>;
}

let db: mysql.Connection | null = null;

async function getDb(): Promise<mysql.Connection> {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  db = await mysql.createConnection(url);
  return db;
}

async function getGracePeriodFlag(): Promise<{ isInGracePeriod: number; status: string } | null> {
  const conn = await getDb();
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT isInGracePeriod, status FROM subscriptions
     WHERE revenueCatUserId = ? AND productId = ?
     ORDER BY updatedAt DESC LIMIT 1`,
    [RC_USER_ID, PRODUCT_ID]
  );
  if (rows.length === 0) return null;
  return { isInGracePeriod: rows[0].isInGracePeriod as number, status: rows[0].status as string };
}

beforeAll(async () => {
  try {
    await fetch(`${SERVER_URL}/api/health`);
  } catch {
    try { await fetch(`${SERVER_URL}/api/trpc/subscription.getStatus`); }
    catch { throw new Error(`Dev server not reachable at ${SERVER_URL}`); }
  }
});

afterAll(async () => {
  if (db) { await db.end(); db = null; }
  try { await sendWebhook("RENEWAL"); } catch { /* non-critical cleanup */ }
});

describe("isInGracePeriod DB column — webhook integration", () => {
  it("BILLING_ISSUE sets isInGracePeriod = 1 in the database", async () => {
    const res = await sendWebhook("BILLING_ISSUE");
    expect(res.ok).toBe(true);
    expect(res.handled).toBe(true);
    expect(res.status).toBe("active");
    const row = await getGracePeriodFlag();
    expect(row).not.toBeNull();
    expect(row!.isInGracePeriod).toBe(1);
    expect(row!.status).toBe("active");
  });

  it("RENEWAL clears isInGracePeriod back to 0", async () => {
    await sendWebhook("BILLING_ISSUE");
    const res = await sendWebhook("RENEWAL");
    expect(res.ok).toBe(true);
    expect(res.handled).toBe(true);
    expect(res.status).toBe("active");
    const row = await getGracePeriodFlag();
    expect(row).not.toBeNull();
    expect(row!.isInGracePeriod).toBe(0);
    expect(row!.status).toBe("active");
  });

  it("GRACE_PERIOD_START sets isInGracePeriod = 1 in the database", async () => {
    await sendWebhook("RENEWAL");
    const res = await sendWebhook("GRACE_PERIOD_START");
    expect(res.ok).toBe(true);
    expect(res.handled).toBe(true);
    expect(res.status).toBe("active");
    const row = await getGracePeriodFlag();
    expect(row).not.toBeNull();
    expect(row!.isInGracePeriod).toBe(1);
    expect(row!.status).toBe("active");
  });

  it("GRACE_PERIOD_END clears isInGracePeriod and sets status = expired", async () => {
    await sendWebhook("GRACE_PERIOD_START");
    const res = await sendWebhook("GRACE_PERIOD_END");
    expect(res.ok).toBe(true);
    expect(res.handled).toBe(true);
    expect(res.status).toBe("expired");
    const row = await getGracePeriodFlag();
    expect(row).not.toBeNull();
    expect(row!.isInGracePeriod).toBe(0);
    expect(row!.status).toBe("expired");
  });

  it("INITIAL_PURCHASE clears isInGracePeriod = 0 (non-grace event)", async () => {
    await sendWebhook("BILLING_ISSUE");
    const res = await sendWebhook("INITIAL_PURCHASE");
    expect(res.ok).toBe(true);
    expect(res.handled).toBe(true);
    expect(res.status).toBe("active");
    const row = await getGracePeriodFlag();
    expect(row).not.toBeNull();
    expect(row!.isInGracePeriod).toBe(0);
  });
});

describe("isInGracePeriod — source-code contract", () => {
  const webhookSrc = fs.readFileSync(path.join(ROOT, "server", "_core", "index.ts"), "utf8");

  it("GRACE_PERIOD_EVENTS set contains BILLING_ISSUE and GRACE_PERIOD_START", () => {
    expect(webhookSrc).toContain('GRACE_PERIOD_EVENTS');
    expect(webhookSrc).toContain('"BILLING_ISSUE"');
    expect(webhookSrc).toContain('"GRACE_PERIOD_START"');
  });

  it("update path writes isInGracePeriod field", () => {
    const updateIdx = webhookSrc.indexOf(".update(subscriptions)");
    expect(updateIdx).toBeGreaterThan(-1);
    const updateBlock = webhookSrc.slice(updateIdx, updateIdx + 400);
    expect(updateBlock).toContain("isInGracePeriod");
    expect(updateBlock).toContain("GRACE_PERIOD_EVENTS.has(eventType)");
  });

  it("insert path writes isInGracePeriod field", () => {
    const insertIdx = webhookSrc.indexOf(".insert(subscriptions)");
    expect(insertIdx).toBeGreaterThan(-1);
    const insertBlock = webhookSrc.slice(insertIdx, insertIdx + 400);
    expect(insertBlock).toContain("isInGracePeriod");
    expect(insertBlock).toContain("GRACE_PERIOD_EVENTS.has(eventType)");
  });

  it("schema has isInGracePeriod column", () => {
    const schemaSrc = fs.readFileSync(path.join(ROOT, "drizzle", "schema.ts"), "utf8");
    expect(schemaSrc).toContain("isInGracePeriod");
  });

  it("routers.ts getStatus reads isInGracePeriod from DB", () => {
    const routersSrc = fs.readFileSync(path.join(ROOT, "server", "routers.ts"), "utf8");
    expect(routersSrc).toContain("isInGracePeriod");
  });
});
