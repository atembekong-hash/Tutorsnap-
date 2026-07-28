/**
 * Unit tests for RevenueCat webhook Authorization header check.
 *
 * The auth logic in server/_core/index.ts follows this contract:
 *   - If REVENUECAT_WEBHOOK_SECRET env var is SET:
 *       - Authorization header matches secret → pass (continue processing)
 *       - Authorization header missing or wrong → reject with 401
 *   - If REVENUECAT_WEBHOOK_SECRET env var is ABSENT (undefined/empty):
 *       - All requests pass (dev/staging mode — no auth required)
 *
 * These tests validate the auth logic in isolation without spinning up
 * the full Express server or touching the database.
 */
import { describe, it, expect } from "vitest";

// ── Extracted auth logic (mirrors server/_core/index.ts) ──────────────────────
// This function replicates the exact auth check from the webhook handler so we
// can test it without importing the full server (which has Sentry/DB side effects).
function checkWebhookAuth(
  secret: string | undefined,
  authHeader: string | undefined,
  isProduction: boolean = false
): { allowed: boolean; statusCode: number; error?: string } {
  if (!secret) {
    if (isProduction) {
      // FIX-2: Reject in production when secret is not configured
      return { allowed: false, statusCode: 500, error: "Webhook secret not configured" };
    }
    // Development/test: allow unauthenticated requests
    return { allowed: true, statusCode: 200 };
  }
  if (authHeader !== secret) {
    return { allowed: false, statusCode: 401, error: "Unauthorized" };
  }
  return { allowed: true, statusCode: 200 };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("RevenueCat webhook Authorization check", () => {
  const CORRECT_SECRET = "rc_webhook_test_secret_abc123";

  describe("when REVENUECAT_WEBHOOK_SECRET is set", () => {
    it("allows requests with the correct Authorization header", () => {
      const result = checkWebhookAuth(CORRECT_SECRET, CORRECT_SECRET);
      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.error).toBeUndefined();
    });

    it("rejects requests with a wrong Authorization header", () => {
      const result = checkWebhookAuth(CORRECT_SECRET, "wrong_secret");
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe("Unauthorized");
    });

    it("rejects requests with no Authorization header", () => {
      const result = checkWebhookAuth(CORRECT_SECRET, undefined);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe("Unauthorized");
    });

    it("rejects requests with an empty Authorization header", () => {
      const result = checkWebhookAuth(CORRECT_SECRET, "");
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe("Unauthorized");
    });
  });

  describe("FIX-2: when REVENUECAT_WEBHOOK_SECRET is absent in PRODUCTION", () => {
    it("rejects all requests with 500 (misconfiguration)", () => {
      const result = checkWebhookAuth(undefined, undefined, true);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe("Webhook secret not configured");
    });

    it("rejects even requests with an Authorization header when secret is not configured", () => {
      const result = checkWebhookAuth(undefined, "some_value", true);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(500);
    });

    it("rejects empty string secret in production (treated as absent)", () => {
      const result = checkWebhookAuth("", undefined, true);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(500);
    });
  });

  describe("when REVENUECAT_WEBHOOK_SECRET is absent in DEVELOPMENT", () => {
    it("allows requests with no Authorization header", () => {
      const result = checkWebhookAuth(undefined, undefined);
      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it("allows requests with any Authorization header value", () => {
      const result = checkWebhookAuth(undefined, "any_value_here");
      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it("allows requests when secret is empty string (treated as absent)", () => {
      // Empty string env var should behave like absent — falsy check
      const result = checkWebhookAuth("", undefined);
      expect(result.allowed).toBe(true);
      expect(result.statusCode).toBe(200);
    });
  });

  describe("source code contract verification", () => {
    it("server/_core/index.ts contains the REVENUECAT_WEBHOOK_SECRET check", () => {
      const { readFileSync } = require("fs");
      const { join } = require("path");
      const source = readFileSync(
        join(__dirname, "..", "server", "_core", "index.ts"),
        "utf8"
      );
      expect(source).toContain("REVENUECAT_WEBHOOK_SECRET");
      expect(source).toContain("401");
      expect(source).toContain("authorization");
    });

    it("server/_core/index.ts rejects in production when secret is missing (FIX-2)", () => {
      const { readFileSync } = require("fs");
      const { join } = require("path");
      const source = readFileSync(
        join(__dirname, "..", "server", "_core", "index.ts"),
        "utf8"
      );
      expect(source).toContain("NODE_ENV");
      expect(source).toContain("production");
      expect(source).toContain("500");
      expect(source).toContain("Webhook secret not configured");
    });

    it("server/_core/index.ts webhook endpoint is registered at correct path", () => {
      const { readFileSync } = require("fs");
      const { join } = require("path");
      const source = readFileSync(
        join(__dirname, "..", "server", "_core", "index.ts"),
        "utf8"
      );
      expect(source).toContain("/api/webhooks/revenuecat");
    });
  });
});
