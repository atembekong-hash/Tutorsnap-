/**
 * OTP_PEPPER Validation
 *
 * Verifies that the server-only HMAC-SHA-256 pepper is set and has
 * sufficient entropy for production use.
 */
import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";

describe("OTP_PEPPER", () => {
  it("should be set and have at least 32 characters", () => {
    const pepper = process.env.OTP_PEPPER;
    expect(pepper, "OTP_PEPPER must be defined").toBeDefined();
    expect(pepper!.length, "OTP_PEPPER must be at least 32 characters").toBeGreaterThanOrEqual(32);
  });

  it("should produce a valid HMAC-SHA-256 digest", () => {
    const pepper = process.env.OTP_PEPPER ?? "";
    // Verify the pepper can be used as an HMAC key without throwing
    const digest = createHmac("sha256", pepper).update("123456").digest("hex");
    expect(digest).toHaveLength(64);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
});
