import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
const ROOT = path.resolve(__dirname, "..");

describe("subscription.history server contract", () => {
  it("registers history procedure", () => {
    const src = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf8");
    expect(src).toContain("history:");
  });
  it("history is protectedProcedure", () => {
    const src = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf8");
    expect(src).toContain("history: protectedProcedure.query");
  });
  it("history returns required fields", () => {
    const src = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf8");
    expect(src).toContain("productId");
    expect(src).toContain("expiresAt");
    expect(src).toContain("createdAt");
    expect(src).toContain("updatedAt");
  });
});

describe("subscription-history screen contract", () => {
  it("app/subscription-history.tsx exists", () => {
    expect(fs.existsSync(path.join(ROOT, "app/subscription-history.tsx"))).toBe(true);
  });
  it("uses trpc.subscription.history.useQuery", () => {
    const src = fs.readFileSync(path.join(ROOT, "app/subscription-history.tsx"), "utf8");
    expect(src).toContain("trpc.subscription.history.useQuery");
  });
  it("has empty state", () => {
    const src = fs.readFileSync(path.join(ROOT, "app/subscription-history.tsx"), "utf8");
    expect(src).toContain("No history yet");
  });
  it("handles all four status values", () => {
    const src = fs.readFileSync(path.join(ROOT, "app/subscription-history.tsx"), "utf8");
    ["active","cancelled","expired","refunded"].forEach(s => expect(src).toContain(s));
  });
});

describe("settings.tsx nav row", () => {
  it("contains Subscription History row after Manage Subscription", () => {
    const src = fs.readFileSync(path.join(ROOT, "app/settings.tsx"), "utf8");
    const mi = src.indexOf("Manage Subscription");
    const hi = src.indexOf("Subscription History");
    expect(hi).toBeGreaterThan(mi);
    expect(src).toContain("/subscription-history");
  });
});
