/**
 * Validates APPLE_BUNDLE_ID is set and has the correct format for
 * native iOS Sign in with Apple token audience verification.
 */
import { describe, it, expect } from "vitest";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

describe("APPLE_BUNDLE_ID", () => {
  it("should be set to com.tutorsnap.app", () => {
    const bundleId = process.env.APPLE_BUNDLE_ID;
    expect(bundleId, "APPLE_BUNDLE_ID must be set").toBeTruthy();
    // Must be a valid reverse-DNS bundle ID (no spaces, no manus identifiers)
    expect(bundleId).toMatch(/^[a-zA-Z0-9.]+$/);
    expect(bundleId).not.toContain("manus");
    expect(bundleId).not.toContain("space.manus");
    expect(bundleId).toBe("com.tutorsnap.app");
    console.log(`✓ APPLE_BUNDLE_ID = ${bundleId}`);
  });

  it("should NOT have APPLE_CLIENT_ID set (not needed for native iOS flow)", () => {
    // For native iOS Sign in with Apple, the audience is the bundle ID.
    // APPLE_CLIENT_ID is only for web/Services ID OAuth flows.
    // If it IS set, it must also not contain manus identifiers.
    const clientId = process.env.APPLE_CLIENT_ID;
    if (clientId) {
      expect(clientId).not.toContain("manus");
      expect(clientId).not.toContain("space.manus");
      console.warn(`⚠ APPLE_CLIENT_ID is set to "${clientId}" — only needed for web OAuth flow`);
    } else {
      console.log("✓ APPLE_CLIENT_ID not set (correct for native iOS flow)");
    }
  });
});
