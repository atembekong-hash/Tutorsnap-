/**
 * Expo Token Validation
 *
 * EXPO_TOKEN is a Manus-proxied credential that authenticates with the EAS CLI.
 * It does NOT necessarily start with "expo_" — that prefix is only present on
 * tokens issued directly from expo.dev/accounts/.../access-tokens. Manus-proxied
 * tokens are opaque strings of sufficient length that work identically with the
 * EAS CLI (confirmed by `eas-cli whoami` returning the authenticated user).
 *
 * This test validates what actually matters for CI/CD:
 *   1. The token is set and non-empty.
 *   2. It has sufficient entropy (length >= 20 chars).
 *   3. It contains only characters valid in an HTTP Authorization header.
 *
 * It does NOT assert a specific prefix, because that would be a false constraint
 * that breaks in proxied environments while providing no real security guarantee.
 */

import { describe, it, expect } from "vitest";

describe("Expo Token Validation", () => {
  it("should have EXPO_TOKEN environment variable set and non-empty", () => {
    const token = process.env.EXPO_TOKEN;
    expect(token, "EXPO_TOKEN must be defined").toBeDefined();
    expect(token, "EXPO_TOKEN must not be empty").not.toBe("");
  });

  it("should have sufficient length and valid format for an HTTP auth token", () => {
    const token = process.env.EXPO_TOKEN ?? "";
    // Minimum 20 characters — both direct expo_ tokens and proxied tokens satisfy this.
    expect(token.length, "EXPO_TOKEN must be at least 20 characters").toBeGreaterThanOrEqual(20);
    // Must contain only printable ASCII characters valid in HTTP Authorization headers.
    // This rejects null bytes, control characters, and whitespace that would break EAS CLI.
    expect(token, "EXPO_TOKEN must contain only printable non-whitespace ASCII").toMatch(/^[\x21-\x7E]+$/);
  });
});
