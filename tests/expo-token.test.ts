import { describe, it, expect } from "vitest";

describe("Expo Token Validation", () => {
  it("should have EXPO_TOKEN environment variable set", () => {
    const token = process.env.EXPO_TOKEN;
    expect(token).toBeDefined();
    expect(token).not.toBe("");
    expect(token).toMatch(/^expo_/);
  });

  it("should validate token format", () => {
    const token = process.env.EXPO_TOKEN || "";
    // Expo tokens start with 'expo_' and are base64-like strings
    expect(token.startsWith("expo_")).toBe(true);
    expect(token.length).toBeGreaterThan(20);
  });
});
