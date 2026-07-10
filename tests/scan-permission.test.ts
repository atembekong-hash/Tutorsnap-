/**
 * Unit test for the scan screen permission state machine logic.
 * Tests the three key states: loading (null), granted, denied.
 */
import { describe, it, expect } from "vitest";

// Replicate the exact logic from scan.tsx
function shouldShowPermissionScreen(permission: { granted: boolean } | null): boolean {
  return permission !== null && !permission.granted;
}

function shouldActivateCamera(
  permission: { granted: boolean } | null,
  mode: string,
  platform: string
): boolean {
  return platform !== "web" && !!permission?.granted && mode === "camera";
}

describe("Scan screen permission state machine", () => {
  it("does NOT show permission screen while permission is loading (null)", () => {
    expect(shouldShowPermissionScreen(null)).toBe(false);
  });

  it("does NOT show permission screen when permission is granted", () => {
    expect(shouldShowPermissionScreen({ granted: true })).toBe(false);
  });

  it("DOES show permission screen when permission is definitively denied", () => {
    expect(shouldShowPermissionScreen({ granted: false })).toBe(true);
  });

  it("does NOT activate camera while permission is loading (null)", () => {
    expect(shouldActivateCamera(null, "camera", "ios")).toBe(false);
  });

  it("DOES activate camera once permission is granted on native", () => {
    expect(shouldActivateCamera({ granted: true }, "camera", "ios")).toBe(true);
    expect(shouldActivateCamera({ granted: true }, "camera", "android")).toBe(true);
  });

  it("does NOT activate camera on web even if granted", () => {
    expect(shouldActivateCamera({ granted: true }, "camera", "web")).toBe(false);
  });

  it("does NOT activate camera when not in camera mode", () => {
    expect(shouldActivateCamera({ granted: true }, "preview", "ios")).toBe(false);
    expect(shouldActivateCamera({ granted: true }, "web-picker", "ios")).toBe(false);
  });

  it("does NOT activate camera when permission is denied", () => {
    expect(shouldActivateCamera({ granted: false }, "camera", "ios")).toBe(false);
  });
});
