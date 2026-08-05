import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { classroomAcceptanceRouteInternals } from "@/server/_core/classroomAcceptanceRoute";

const managedKeys = [
  "CLASSROOM_ACCEPTANCE_ENDPOINT_ENABLED",
  "CLASSROOM_ACCEPTANCE_TARGET",
  "CLASSROOM_MVP_ENABLED",
  "RAILWAY_ENVIRONMENT_NAME",
  "CLASSROOM_ACCEPTANCE_API_BASE_URL",
  "CLASSROOM_ACCEPTANCE_EXPIRES_AT",
  "CLASSROOM_ACCEPTANCE_SECRET",
] as const;

const originalValues = new Map<string, string | undefined>();

function setOpenWindow(): void {
  process.env.CLASSROOM_ACCEPTANCE_ENDPOINT_ENABLED = "true";
  process.env.CLASSROOM_ACCEPTANCE_TARGET = "staging";
  process.env.CLASSROOM_MVP_ENABLED = "true";
  process.env.RAILWAY_ENVIRONMENT_NAME = "staging";
  process.env.CLASSROOM_ACCEPTANCE_API_BASE_URL =
    "https://api-staging.example.railway.app";
  process.env.CLASSROOM_ACCEPTANCE_EXPIRES_AT = new Date(
    Date.now() + 60_000,
  ).toISOString();
  process.env.CLASSROOM_ACCEPTANCE_SECRET = "s".repeat(64);
}

describe("Classroom staging acceptance route gate", () => {
  beforeEach(() => {
    for (const key of managedKeys) originalValues.set(key, process.env[key]);
    setOpenWindow();
  });

  afterEach(() => {
    for (const key of managedKeys) {
      const value = originalValues.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    originalValues.clear();
  });

  it("opens only when every staging gate is valid", () => {
    expect(
      classroomAcceptanceRouteInternals.isStagingAcceptanceWindowOpen(),
    ).toBe(true);
  });

  it.each([
    ["CLASSROOM_ACCEPTANCE_ENDPOINT_ENABLED", "false"],
    ["CLASSROOM_ACCEPTANCE_TARGET", "production"],
    ["CLASSROOM_MVP_ENABLED", "false"],
    ["RAILWAY_ENVIRONMENT_NAME", "production"],
    ["CLASSROOM_ACCEPTANCE_API_BASE_URL", "https://api.example.com"],
    ["CLASSROOM_ACCEPTANCE_SECRET", "too-short"],
  ] as const)("fails closed when %s is invalid", (key, value) => {
    process.env[key] = value;
    expect(
      classroomAcceptanceRouteInternals.isStagingAcceptanceWindowOpen(),
    ).toBe(false);
  });

  it("fails closed after the configured window expires", () => {
    process.env.CLASSROOM_ACCEPTANCE_EXPIRES_AT = new Date(
      Date.now() - 1_000,
    ).toISOString();
    expect(
      classroomAcceptanceRouteInternals.isStagingAcceptanceWindowOpen(),
    ).toBe(false);
  });

  it("compares equal-length secrets without accepting mismatches", () => {
    expect(
      classroomAcceptanceRouteInternals.safeEqual(
        "a".repeat(64),
        "a".repeat(64),
      ),
    ).toBe(true);
    expect(
      classroomAcceptanceRouteInternals.safeEqual(
        "a".repeat(64),
        "b".repeat(64),
      ),
    ).toBe(false);
    expect(classroomAcceptanceRouteInternals.safeEqual("short", "longer")).toBe(
      false,
    );
  });
});
