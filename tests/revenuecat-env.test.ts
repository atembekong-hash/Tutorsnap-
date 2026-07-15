/**
 * Validates the subscription module configuration.
 *
 * Since react-native-purchases was removed due to native architecture conflicts,
 * the subscription system now uses local AsyncStorage-based management.
 * RevenueCat API keys are optional — when not set, the app runs in local mode.
 *
 * These tests validate that the subscription module source file exists and
 * does not import react-native-purchases.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Subscription module configuration", () => {
  const subscriptionSource = readFileSync(
    join(__dirname, "..", "lib", "subscription.ts"),
    "utf-8"
  );

  it("does not import react-native-purchases (removed for APK stability)", () => {
    // Ensure no runtime import of the removed package
    expect(subscriptionSource).not.toMatch(/import.*from.*['"]react-native-purchases['"]/);
    expect(subscriptionSource).not.toMatch(/require\(['"]react-native-purchases['"]\)/);
    expect(subscriptionSource).not.toMatch(/await import\(['"]react-native-purchases['"]\)/);
  });

  it("exports required subscription constants and functions", () => {
    // Check that the source defines the expected exports
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
});
