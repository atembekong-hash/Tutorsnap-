import { describe, it, expect } from "vitest";
import * as dotenv from "dotenv";
dotenv.config();

describe("Sentry source map credentials", () => {
  it("SENTRY_ORG should be set and be a valid slug", () => {
    const org = process.env.SENTRY_ORG;
    expect(org, "SENTRY_ORG must be set").toBeTruthy();
    expect(org!.length, "SENTRY_ORG must be at least 2 chars").toBeGreaterThanOrEqual(2);
    expect(org, "SENTRY_ORG must be a valid slug").toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
  });

  it("SENTRY_PROJECT should be set and be a valid slug", () => {
    const project = process.env.SENTRY_PROJECT;
    expect(project, "SENTRY_PROJECT must be set").toBeTruthy();
    expect(project!.length, "SENTRY_PROJECT must be at least 2 chars").toBeGreaterThanOrEqual(2);
    expect(project, "SENTRY_PROJECT must be a valid slug").toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
  });

  it("SENTRY_ORG and SENTRY_PROJECT should both be set", () => {
    const org = process.env.SENTRY_ORG;
    const project = process.env.SENTRY_PROJECT;
    if (org && project) console.log(`Sentry config: org="${org}", project="${project}"`);
    expect(org).toBeTruthy();
    expect(project).toBeTruthy();
  });

  it("app.config.ts plugins array should NOT include Sentry expo plugin (removed to fix Android crash)", async () => {
    const fs = await import("fs/promises");
    const appConfig = await fs.readFile("app.config.ts", "utf-8");
    const pluginInArray = /["'`]@sentry\/react-native\/expo["'`]/.test(appConfig);
    expect(pluginInArray, "Sentry expo plugin must not be in plugins array (causes Android crash)").toBe(false);
  });
});
