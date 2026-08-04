import { describe, expect, it } from "vitest";
import {
  resolveSentryEnvironment,
  resolveSentryRelease,
} from "../server/_core/sentry-server";

describe("server Sentry metadata", () => {
  it("prefers an explicit Sentry environment", () => {
    expect(
      resolveSentryEnvironment({
        NODE_ENV: "production",
        RAILWAY_ENVIRONMENT_NAME: "staging",
        SENTRY_ENVIRONMENT: "preview",
      }),
    ).toBe("preview");
  });

  it("uses Railway's environment name before NODE_ENV", () => {
    expect(
      resolveSentryEnvironment({
        NODE_ENV: "production",
        RAILWAY_ENVIRONMENT_NAME: "staging",
      }),
    ).toBe("staging");
  });

  it("falls back to production or development outside Railway", () => {
    expect(resolveSentryEnvironment({ NODE_ENV: "production" })).toBe("production");
    expect(resolveSentryEnvironment({ NODE_ENV: "test" })).toBe("development");
  });

  it("labels releases from APP_VERSION or RELEASE_VERSION", () => {
    expect(
      resolveSentryRelease({ APP_VERSION: "1.8.5", RELEASE_VERSION: "1.8.4" }),
    ).toBe("tutorsnap-api@1.8.5");
    expect(resolveSentryRelease({ RELEASE_VERSION: "1.8.5" })).toBe(
      "tutorsnap-api@1.8.5",
    );
    expect(resolveSentryRelease({})).toBeUndefined();
  });
});
