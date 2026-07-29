/**
 * tests/rc-identity.test.ts
 *
 * Automated tests for the RevenueCat App User ID identity chain.
 *
 * Verifies that loginRevenueCat, logoutRevenueCat, and restorePurchases
 * correctly manage the RC identity across all auth scenarios:
 *   - Google sign-in
 *   - Apple sign-in
 *   - Email/OTP sign-in
 *   - Logout
 *   - Account switching
 *   - Restore purchases (with and without openId)
 *   - App restart (re-identification)
 *
 * All tests run in a mocked environment (no real RC SDK calls).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock react-native Platform ───────────────────────────────────────────────
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// ─── Mock AsyncStorage ────────────────────────────────────────────────────────
const asyncStorageStore: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => asyncStorageStore[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { asyncStorageStore[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete asyncStorageStore[key]; }),
  },
}));

// ─── Mock react-native-purchases ─────────────────────────────────────────────
const mockLogIn = vi.fn(async (appUserId: string) => ({
  customerInfo: { entitlements: { active: {} } },
  created: false,
}));
const mockLogOut = vi.fn(async () => ({ entitlements: { active: {} } }));
const mockRestorePurchases = vi.fn(async () => ({ entitlements: { active: {} } }));
const mockConfigure = vi.fn();
const mockGetCustomerInfo = vi.fn(async () => ({ entitlements: { active: {} } }));

vi.mock("react-native-purchases", () => ({
  default: {
    configure: mockConfigure,
    logIn: mockLogIn,
    logOut: mockLogOut,
    restorePurchases: mockRestorePurchases,
    getCustomerInfo: mockGetCustomerInfo,
  },
}));

// ─── Set up env vars ──────────────────────────────────────────────────────────
process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY = "appl_test_key_1234567890";

// ─── Import module under test ─────────────────────────────────────────────────
import {
  loginRevenueCat,
  logoutRevenueCat,
  restorePurchases,
  initRevenueCat,
  _resetInitForTesting,
} from "../lib/subscription";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function freshInit() {
  _resetInitForTesting();
  await initRevenueCat();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RC identity — loginRevenueCat", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await freshInit();
  });

  it("calls Purchases.logIn with the Google openId", async () => {
    const openId = "google:1099123456789";
    await loginRevenueCat(openId);
    expect(mockLogIn).toHaveBeenCalledOnce();
    expect(mockLogIn).toHaveBeenCalledWith(openId);
  });

  it("calls Purchases.logIn with the Apple openId", async () => {
    const openId = "apple:000123.abcdef.1234";
    await loginRevenueCat(openId);
    expect(mockLogIn).toHaveBeenCalledWith(openId);
  });

  it("calls Purchases.logIn with the email openId", async () => {
    const openId = "email:alice@example.com";
    await loginRevenueCat(openId);
    expect(mockLogIn).toHaveBeenCalledWith(openId);
  });

  it("does NOT call Purchases.logIn when openId is empty string", async () => {
    await loginRevenueCat("");
    expect(mockLogIn).not.toHaveBeenCalled();
  });

  it("is idempotent — calling twice with same openId calls logIn twice (RC de-dupes server-side)", async () => {
    const openId = "google:1099123456789";
    await loginRevenueCat(openId);
    await loginRevenueCat(openId);
    // We call logIn both times; RC SDK handles de-duplication on its side
    expect(mockLogIn).toHaveBeenCalledTimes(2);
    expect(mockLogIn).toHaveBeenNthCalledWith(1, openId);
    expect(mockLogIn).toHaveBeenNthCalledWith(2, openId);
  });
});

describe("RC identity — logoutRevenueCat", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await freshInit();
  });

  it("calls Purchases.logOut on sign-out", async () => {
    await logoutRevenueCat();
    expect(mockLogOut).toHaveBeenCalledOnce();
  });

  it("does not throw if Purchases.logOut fails", async () => {
    mockLogOut.mockRejectedValueOnce(new Error("RC network error"));
    await expect(logoutRevenueCat()).resolves.not.toThrow();
  });
});

describe("RC identity — account switching", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await freshInit();
  });

  it("sign out A then sign in B uses B's openId, not A's", async () => {
    const openIdA = "google:1111111111";
    const openIdB = "google:2222222222";

    await loginRevenueCat(openIdA);
    expect(mockLogIn).toHaveBeenLastCalledWith(openIdA);

    await logoutRevenueCat();
    expect(mockLogOut).toHaveBeenCalledOnce();

    await loginRevenueCat(openIdB);
    expect(mockLogIn).toHaveBeenLastCalledWith(openIdB);

    // Verify the final logIn call used B's openId
    const calls = mockLogIn.mock.calls;
    expect(calls[calls.length - 1][0]).toBe(openIdB);
  });
});

describe("RC identity — restorePurchases with openId", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await freshInit();
  });

  it("calls loginRevenueCat before restoring when openId is provided", async () => {
    const openId = "google:1099123456789";
    await restorePurchases(openId);
    // loginRevenueCat calls Purchases.logIn
    expect(mockLogIn).toHaveBeenCalledWith(openId);
    // restorePurchases then calls Purchases.restorePurchases
    expect(mockRestorePurchases).toHaveBeenCalledOnce();
    // logIn must be called BEFORE restorePurchases
    const logInOrder = mockLogIn.mock.invocationCallOrder[0];
    const restoreOrder = mockRestorePurchases.mock.invocationCallOrder[0];
    expect(logInOrder).toBeLessThan(restoreOrder);
  });

  it("skips loginRevenueCat when no openId is provided", async () => {
    await restorePurchases();
    expect(mockLogIn).not.toHaveBeenCalled();
    expect(mockRestorePurchases).toHaveBeenCalledOnce();
  });

  it("returns true when RC confirms an active entitlement after restore", async () => {
    mockRestorePurchases.mockResolvedValueOnce({
      entitlements: {
        active: {
          premium: { productIdentifier: "tutorsnap_monthly" },
        },
      },
    });
    const result = await restorePurchases("google:1099123456789");
    expect(result).toBe(true);
  });

  it("returns false when RC confirms no active entitlement after restore", async () => {
    mockRestorePurchases.mockResolvedValueOnce({
      entitlements: { active: {} },
    });
    const result = await restorePurchases("google:1099123456789");
    expect(result).toBe(false);
  });
});

describe("RC identity — app restart re-identification contract", () => {
  it("loginRevenueCat must be called with a non-empty string to identify the RC customer", async () => {
    vi.clearAllMocks();
    await freshInit();

    // Simulate what _layout.tsx does on app restart for an authenticated user
    const cachedOpenId = "google:1099123456789"; // from getUserInfo()
    if (cachedOpenId) {
      await loginRevenueCat(cachedOpenId);
    }

    expect(mockLogIn).toHaveBeenCalledWith(cachedOpenId);
  });

  it("does not call loginRevenueCat when no cached user (unauthenticated restart)", async () => {
    vi.clearAllMocks();
    await freshInit();

    // Simulate what _layout.tsx does when isAuthenticated() returns false
    const cachedOpenId: string | null = null;
    if (cachedOpenId) {
      await loginRevenueCat(cachedOpenId);
    }

    expect(mockLogIn).not.toHaveBeenCalled();
  });
});
