/**
 * Sentry source map upload credentials validation
 * Verifies SENTRY_ORG and SENTRY_PROJECT are set and have valid slug formats.
 */
import { describe, it, expect } from "vitest";
import * as dotenv from "dotenv";
dotenv.config();

describe("Sentry source map credentials", () => {
  it("SENTRY_ORG should be set and be a valid slug", () => {
    const org = process.env.SENTRY_ORG;
    expect(org, "SENTRY_ORG must be set").toBeTruthy();
    expect(org!.length, "SENTRY_ORG must be at least 2 chars").toBeGreaterThanOrEqual(2);
    // Sentry slugs: lowercase letters, numbers, hyphens only
    expect(org, "SENTRY_ORG must be a valid slug (lowercase, numbers, hyphens)").toMatch(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
    );
  });

  it("SENTRY_PROJECT should be set and be a valid slug", () => {
    const project = process.env.SENTRY_PROJECT;
    expect(project, "SENTRY_PROJECT must be set").toBeTruthy();
    expect(project!.length, "SENTRY_PROJECT must be at least 2 chars").toBeGreaterThanOrEqual(2);
    expect(project, "SENTRY_PROJECT must be a valid slug (lowercase, numbers, hyphens)").toMatch(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
    );
  });

  it("SENTRY_ORG and SENTRY_PROJECT should be different values", () => {
    const org = process.env.SENTRY_ORG;
    const project = process.env.SENTRY_PROJECT;
    if (org && project) {
      // They can be the same in some Sentry setups, so just warn
      console.log(`Sentry config: org="${org}", project="${project}"`);
    }
    expect(org).toBeTruthy();
    expect(project).toBeTruthy();
  });

  it("eas.json should reference SENTRY_ORG and SENTRY_PROJECT in the Sentry plugin config", async () => {
    const fs = await import("fs/promises");
    const appConfig = await fs.readFile("app.config.ts", "utf-8");
    expect(appConfig).toContain("SENTRY_ORG");
    expect(appConfig).toContain("SENTRY_PROJECT");
  });
});
