/**
 * tests/subscription-hardening.test.ts
 *
 * Tests for the three subscription.ts hardening fixes:
 *   FIX-1: initRevenueCat promise-mutex (no concurrent double-configure)
 *   FIX-3: restorePurchases / getSubscriptionStatus stale cache clearing
 *   FIX-5: RC v10 PurchasesErrorCode cancellation detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock AsyncStorage ────────────────────────────────────────────────────────
const _store: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => _store[key] ?? null),
    setItem: vi.fn(async (key: string, val: string) => { _store[key] = val; }),
    removeItem: vi.fn(async (key: string) => { delete _store[key]; }),
    multiRemove: vi.fn(async (keys: string[]) => { keys.forEach(k => delete _store[k]); }),
  },
}));

// ─── Mock react-native Platform ───────────────────────────────────────────────
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// ─── Mock react-native-purchases ─────────────────────────────────────────────
let configureCallCount = 0;
let mockEntitlementActive = false;
let mockRestoreEntitlementActive = false;

const mockPurchases = {
  configure: vi.fn(() => { configureCallCount++; }),
  getCustomerInfo: vi.fn(async () => ({
    entitlements: {
      active: mockEntitlementActive
        ? { premium: { productIdentifier: "tutorsnap_monthly" } }
        : {},
    },
  })),
  restorePurchases: vi.fn(async () => ({
    entitlements: {
      active: mockRestoreEntitlementActive
        ? { premium: { productIdentifier: "tutorsnap_monthly" } }
        : {},
    },
  })),
  purchasePackage: vi.fn(),
  getOfferings: vi.fn(async () => ({ current: null })),
  logIn: vi.fn(),
};

vi.mock("react-native-purchases", () => ({
  default: mockPurchases,
  PurchasesErrorCode: { PurchaseCancelledError: 1 },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function freshModule() {
  // Re-import after resetting module state
  const mod = await import("../lib/subscription");
  mod._resetInitForTesting();
  return mod;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX-1: Promise-mutex — concurrent callers must not call configure() twice
// ─────────────────────────────────────────────────────────────────────────────
describe("FIX-1: initRevenueCat promise-mutex", () => {
  beforeEach(async () => {
    configureCallCount = 0;
    // Set a valid API key so _doInit proceeds to configure()
    process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY = "appl_test_key_12345";
    const mod = await import("../lib/subscription");
    mod._resetInitForTesting();
    mockPurchases.configure.mockClear();
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
  });

  it("calls configure() exactly once when invoked sequentially", async () => {
    const mod = await import("../lib/subscription");
    await mod.initRevenueCat();
    await mod.initRevenueCat();
    await mod.initRevenueCat();
    expect(mockPurchases.configure).toHaveBeenCalledTimes(1);
  });

  it("calls configure() exactly once when 10 callers invoke concurrently", async () => {
    const mod = await import("../lib/subscription");
    // Simulate 10 concurrent callers (e.g. usePremium + paywall + 8 other components)
    const calls = Array.from({ length: 10 }, () => mod.initRevenueCat());
    await Promise.all(calls);
    expect(mockPurchases.configure).toHaveBeenCalledTimes(1);
  });

  it("calls configure() exactly once when 50 callers invoke concurrently", async () => {
    const mod = await import("../lib/subscription");
    const calls = Array.from({ length: 50 }, () => mod.initRevenueCat());
    await Promise.all(calls);
    expect(mockPurchases.configure).toHaveBeenCalledTimes(1);
  });

  it("all concurrent callers resolve after a single configure() completes", async () => {
    const mod = await import("../lib/subscription");
    // Simulate a slow configure (100ms)
    mockPurchases.configure.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    const start = Date.now();
    const calls = Array.from({ length: 5 }, () => mod.initRevenueCat());
    await Promise.all(calls);
    // All 5 callers should have resolved (not timed out)
    expect(Date.now() - start).toBeLessThan(500);
    expect(mockPurchases.configure).toHaveBeenCalledTimes(1);
  });

  it("_resetInitForTesting allows re-initialization (test utility works)", async () => {
    const mod = await import("../lib/subscription");
    await mod.initRevenueCat();
    expect(mockPurchases.configure).toHaveBeenCalledTimes(1);
    mod._resetInitForTesting();
    mockPurchases.configure.mockClear();
    await mod.initRevenueCat();
    expect(mockPurchases.configure).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX-3: Stale cache clearing
// ─────────────────────────────────────────────────────────────────────────────
describe("FIX-3: Stale premium cache clearing", () => {
  beforeEach(async () => {
    // Clear the mock store
    Object.keys(_store).forEach(k => delete _store[k]);
    process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY = "appl_test_key_12345";
    const mod = await import("../lib/subscription");
    mod._resetInitForTesting();
    mockPurchases.configure.mockClear();
    mockPurchases.getCustomerInfo.mockClear();
    mockPurchases.restorePurchases.mockClear();
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
    mockEntitlementActive = false;
    mockRestoreEntitlementActive = false;
  });

  it("restorePurchases: clears stale cache when RC confirms no entitlement", async () => {
    // Simulate stale cache from a previous purchase
    _store["@tutorsnap/premiumActive"] = "true";
    _store["@tutorsnap/premiumProductId"] = "tutorsnap_monthly";
    mockRestoreEntitlementActive = false;

    const mod = await import("../lib/subscription");
    const result = await mod.restorePurchases();

    expect(result).toBe(false);
    expect(_store["@tutorsnap/premiumActive"]).toBeUndefined();
    expect(_store["@tutorsnap/premiumProductId"]).toBeUndefined();
  });

  it("restorePurchases: sets cache when RC confirms active entitlement", async () => {
    mockRestoreEntitlementActive = true;

    const mod = await import("../lib/subscription");
    const result = await mod.restorePurchases();

    expect(result).toBe(true);
    expect(_store["@tutorsnap/premiumActive"]).toBe("true");
  });

  it("getSubscriptionStatus: clears stale cache when RC confirms no entitlement", async () => {
    // Simulate stale cache
    _store["@tutorsnap/premiumActive"] = "true";
    _store["@tutorsnap/premiumProductId"] = "tutorsnap_monthly";
    mockEntitlementActive = false;

    const mod = await import("../lib/subscription");
    const status = await mod.getSubscriptionStatus();

    // Should NOT be premium (RC says no entitlement, cache cleared)
    // Note: may still be "premium" if trial is active — check cache was cleared
    expect(_store["@tutorsnap/premiumActive"]).toBeUndefined();
    expect(_store["@tutorsnap/premiumProductId"]).toBeUndefined();
  });

  it("getSubscriptionStatus: preserves cache when RC is unavailable (offline)", async () => {
    // RC unavailable — no key configured
    delete process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
    const mod = await import("../lib/subscription");
    mod._resetInitForTesting();

    _store["@tutorsnap/premiumActive"] = "true";
    _store["@tutorsnap/premiumProductId"] = "tutorsnap_annual";

    const status = await mod.getSubscriptionStatus();
    // Offline: should use local cache
    expect(status.isPremium).toBe(true);
    expect(status.activeProductId).toBe("tutorsnap_annual");
    // Cache should NOT have been cleared
    expect(_store["@tutorsnap/premiumActive"]).toBe("true");
  });

  it("restorePurchases: does NOT clear cache when RC throws a network error", async () => {
    _store["@tutorsnap/premiumActive"] = "true";
    mockRestoreEntitlementActive = false;
    mockPurchases.restorePurchases.mockRejectedValueOnce(new Error("Network error"));

    const mod = await import("../lib/subscription");
    const result = await mod.restorePurchases();

    // On error, local cache preserved (offline access)
    expect(_store["@tutorsnap/premiumActive"]).toBe("true");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX-5: RC v10 cancellation error code detection
// ─────────────────────────────────────────────────────────────────────────────
describe("FIX-5: RC v10 purchase cancellation detection", () => {
  beforeEach(async () => {
    Object.keys(_store).forEach(k => delete _store[k]);
    process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY = "appl_test_key_12345";
    const mod = await import("../lib/subscription");
    mod._resetInitForTesting();
    mockPurchases.configure.mockClear();
    mockPurchases.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [
          {
            packageType: "MONTHLY",
            product: {
              identifier: "tutorsnap_monthly",
              priceString: "$9.99",
              introPrice: null as unknown as undefined,
            },
          },
        ],
      } as any,
    });
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
  });

  it("returns cancelled=true when RC v10 throws PurchasesErrorCode 1 (numeric)", async () => {
    mockPurchases.purchasePackage.mockRejectedValueOnce({ code: 1, message: "Cancelled" });
    const mod = await import("../lib/subscription");
    const result = await mod.purchaseProduct("tutorsnap_monthly");
    expect(result.success).toBe(false);
    expect((result as any).cancelled).toBe(true);
  });

  it("returns cancelled=true when RC throws string code PurchaseCancelledError", async () => {
    mockPurchases.purchasePackage.mockRejectedValueOnce({
      code: "PurchaseCancelledError",
      message: "User cancelled",
    });
    const mod = await import("../lib/subscription");
    const result = await mod.purchaseProduct("tutorsnap_monthly");
    expect(result.success).toBe(false);
    expect((result as any).cancelled).toBe(true);
  });

  it("returns cancelled=true for legacy v7/v8 userCancelled boolean", async () => {
    mockPurchases.purchasePackage.mockRejectedValueOnce({
      userCancelled: true,
      message: "User cancelled",
    });
    const mod = await import("../lib/subscription");
    const result = await mod.purchaseProduct("tutorsnap_monthly");
    expect(result.success).toBe(false);
    expect((result as any).cancelled).toBe(true);
  });

  it("returns cancelled=false and error message for genuine payment failure", async () => {
    mockPurchases.purchasePackage.mockRejectedValueOnce({
      code: 7, // StoreProblemError — not a cancellation
      message: "Payment declined",
    });
    const mod = await import("../lib/subscription");
    const result = await mod.purchaseProduct("tutorsnap_monthly");
    expect(result.success).toBe(false);
    expect((result as any).cancelled).toBe(false);
    expect((result as any).error).toBe("Payment declined");
  });

  it("returns cancelled=false for network error (not a cancellation)", async () => {
    mockPurchases.purchasePackage.mockRejectedValueOnce(new Error("Network timeout"));
    const mod = await import("../lib/subscription");
    const result = await mod.purchaseProduct("tutorsnap_monthly");
    expect(result.success).toBe(false);
    expect((result as any).cancelled).toBe(false);
  });
});
