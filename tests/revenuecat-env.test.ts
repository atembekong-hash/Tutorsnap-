/**
 * Validates the subscription module configuration.
 *
 * react-native-purchases (RevenueCat SDK) is used for real in-app purchases on
 * iOS and Android. It is loaded lazily via `await import("react-native-purchases")`
 * inside the `getPurchases()` helper so that the module is never evaluated on web
 * or in test environments where the native module is unavailable.
 *
 * These tests validate:
 *  1. The SDK is imported lazily (not at module top-level) to avoid web/test crashes.
 *  2. The subscription module exports all required constants and functions.
 *  3. Platform/dev guards are present for safe fallback.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Subscription module configuration", () => {
  const subscriptionSource = readFileSync(
    join(__dirname, "..", "lib", "subscription.ts"),
    "utf-8"
  );

  it("does NOT import react-native-purchases at the top level (must be lazy)", () => {
    // Top-level static imports crash on web and in test environments.
    // The SDK must only be loaded inside an async function via dynamic import.
    expect(subscriptionSource).not.toMatch(/^import.*from.*['"']react-native-purchases['"']/m);
    expect(subscriptionSource).not.toMatch(/^const.*require\(['"']react-native-purchases['"']\)/m);
  });

  it("uses lazy dynamic import for react-native-purchases (correct pattern)", () => {
    // The SDK is loaded on-demand inside getPurchases() to avoid native module
    // crashes on web and in test environments.
    expect(subscriptionSource).toMatch(/await import\(['"']react-native-purchases['"']\)/);
  });

  it("exports required subscription constants and functions", () => {
    expect(subscriptionSource).toContain('export const PRODUCT_MONTHLY');
    expect(subscriptionSource).toContain('export const PRODUCT_ANNUAL');
    expect(subscriptionSource).toContain('export const PRICE_MONTHLY');
    expect(subscriptionSource).toContain('export const PRICE_ANNUAL');
    expect(subscriptionSource).toContain('export const FREE_LIMITS');
    expect(subscriptionSource).toContain('export async function initRevenueCat');
    expect(subscriptionSource).toContain('export async function getSubscriptionStatus');
    expect(subscriptionSource).toContain('export async function purchaseProduct');
    expect(subscriptionSource).toContain('export async function restorePurchases');
    expect(subscriptionSource).toContain('export async function getOfferings');
  });

  it("guards SDK calls behind platform checks (dev/web fallback present)", () => {
    // The module must have a dev/web fallback so purchases are never attempted
    // in environments where the native module is unavailable.
    expect(subscriptionSource).toContain("_devMode");
    expect(subscriptionSource).toContain("Platform.OS");
  });
});
