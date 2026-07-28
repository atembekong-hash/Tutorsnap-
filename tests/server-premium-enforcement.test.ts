import { describe, it, expect, vi } from "vitest";
import { checkServerSidePremium } from "../server/_core/trpc";
vi.mock("../../drizzle/schema.js", () => ({ subscriptions: {} }));
vi.mock("drizzle-orm", () => ({ eq: () => ({}), desc: () => ({}) }));
function db(rows: Array<{ status: string; expiresAt: Date | null }>) {
  return { select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => rows }) }) }) }) } as any;
}
describe("FIX-4: checkServerSidePremium", () => {
  it("returns false when db is null", async () => { expect(await checkServerSidePremium(1, null)).toBe(false); });
  it("returns false when no rows", async () => { expect(await checkServerSidePremium(1, db([]))).toBe(false); });
  it("returns true for active", async () => { expect(await checkServerSidePremium(1, db([{ status: "active", expiresAt: null }]))).toBe(true); });
  it("returns true for cancelled with future expiry", async () => { expect(await checkServerSidePremium(1, db([{ status: "cancelled", expiresAt: new Date(Date.now() + 86400000) }]))).toBe(true); });
  it("returns false for cancelled with past expiry", async () => { expect(await checkServerSidePremium(1, db([{ status: "cancelled", expiresAt: new Date(Date.now() - 86400000) }]))).toBe(false); });
  it("returns false for cancelled with null expiry", async () => { expect(await checkServerSidePremium(1, db([{ status: "cancelled", expiresAt: null }]))).toBe(false); });
  it("returns false for expired status", async () => { expect(await checkServerSidePremium(1, db([{ status: "expired", expiresAt: null }]))).toBe(false); });
  it("returns false on sync DB error", async () => { expect(await checkServerSidePremium(1, { select: () => { throw new Error("DB"); } } as any)).toBe(false); });
  it("returns false on async DB error", async () => { expect(await checkServerSidePremium(1, { select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => { throw new Error("Q"); } }) }) }) }) } as any)).toBe(false); });
});
