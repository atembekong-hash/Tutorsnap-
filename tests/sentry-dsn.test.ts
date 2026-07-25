/**
 * Validates that the EXPO_PUBLIC_SENTRY_DSN environment variable is set
 * and has the correct Sentry DSN format.
 *
 * A valid Sentry DSN looks like:
 *   https://<public_key>@<host>/project_id
 * e.g.: https://abc123@o123456.ingest.sentry.io/789012
 */
import { describe, it, expect } from "vitest";

describe("EXPO_PUBLIC_SENTRY_DSN", () => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

  it("should be set", () => {
    expect(dsn.length).toBeGreaterThan(0);
  });

  it("should start with https://", () => {
    expect(dsn.startsWith("https://")).toBe(true);
  });

  it("should contain a valid Sentry DSN structure (key@host/project)", () => {
    // Pattern: https://<key>@<host>/<project_id>
    const dsnPattern = /^https:\/\/[a-zA-Z0-9]+@[a-zA-Z0-9.\-]+\/\d+$/;
    expect(dsnPattern.test(dsn)).toBe(true);
  });

  it("should contain sentry host", () => {
    // DSN host should contain sentry or ingest
    const hasValidHost = dsn.includes("sentry.io") || dsn.includes("ingest.");
    expect(hasValidHost).toBe(true);
  });
});
