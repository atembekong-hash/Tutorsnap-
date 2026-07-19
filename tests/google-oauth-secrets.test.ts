import { describe, it, expect } from "vitest";

/**
 * Test: Validate Google OAuth secrets are configured
 * This ensures all required Google credentials are present before implementing real auth
 */
describe("Google OAuth Secrets Validation", () => {
  it("should have GOOGLE_ANDROID_CLIENT_ID configured", () => {
    const clientId = process.env.GOOGLE_ANDROID_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId).not.toContain("PLACEHOLDER");
    expect(clientId?.length).toBeGreaterThan(0);
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("should have GOOGLE_IOS_CLIENT_ID configured", () => {
    const clientId = process.env.GOOGLE_IOS_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId).not.toContain("PLACEHOLDER");
    expect(clientId?.length).toBeGreaterThan(0);
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("should have GOOGLE_WEB_CLIENT_ID configured", () => {
    const clientId = process.env.GOOGLE_WEB_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId).not.toContain("PLACEHOLDER");
    expect(clientId?.length).toBeGreaterThan(0);
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("should have GOOGLE_WEB_CLIENT_SECRET configured", () => {
    const secret = process.env.GOOGLE_WEB_CLIENT_SECRET;
    expect(secret).toBeDefined();
    expect(secret).not.toContain("PLACEHOLDER");
    expect(secret?.length).toBeGreaterThan(10); // Secrets are typically long strings
  });

  it("should have all four secrets for complete OAuth flow", () => {
    const secrets = {
      android: process.env.GOOGLE_ANDROID_CLIENT_ID,
      ios: process.env.GOOGLE_IOS_CLIENT_ID,
      web: process.env.GOOGLE_WEB_CLIENT_ID,
      webSecret: process.env.GOOGLE_WEB_CLIENT_SECRET,
    };

    // All should be defined
    expect(secrets.android).toBeDefined();
    expect(secrets.ios).toBeDefined();
    expect(secrets.web).toBeDefined();
    expect(secrets.webSecret).toBeDefined();

    // None should be placeholders
    Object.values(secrets).forEach((value) => {
      expect(value).not.toContain("PLACEHOLDER");
    });
  });
});
