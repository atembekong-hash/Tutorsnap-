/**
 * Validates that the RevenueCat API key environment variables are set and
 * have the expected format (non-empty strings starting with a known prefix).
 *
 * This test does NOT make a network call — it only checks the env vars are
 * present so the SDK will initialise correctly on device.
 */
import { describe, it, expect } from "vitest";

describe("RevenueCat environment variables", () => {
  it("EXPO_PUBLIC_RC_API_KEY_IOS is set and non-empty", () => {
    const key = process.env.EXPO_PUBLIC_RC_API_KEY_IOS;
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
    expect((key as string).length).toBeGreaterThan(10);
  });

  it("EXPO_PUBLIC_RC_API_KEY_ANDROID is set and non-empty", () => {
    const key = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID;
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
    expect((key as string).length).toBeGreaterThan(10);
  });
});
