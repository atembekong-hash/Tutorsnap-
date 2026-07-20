/**
 * Validates that the RESEND_API_KEY environment variable is set and
 * the Resend API accepts it (lightweight domain list call — no email sent).
 */
import { describe, it, expect } from "vitest";

describe("Resend API key", () => {
  it("should be set and accepted by the Resend API", async () => {
    const key = process.env.RESEND_API_KEY;
    expect(key, "RESEND_API_KEY must be set").toBeTruthy();

    // Call the Resend domains endpoint — read-only, no email sent
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });

    // 200 = valid key, 401 = invalid key
    expect(res.status, `Resend API rejected the key (HTTP ${res.status})`).toBe(200);
  });
});
