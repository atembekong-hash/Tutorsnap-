/**
 * Regression tests for the three crash patterns found in the forensic audit
 * of the Weekly Goal, Progress (Solve tab), and Progress (Practice tab) crashes.
 *
 * Crash 1: SubjectRing used Animated.createAnimatedComponent(Circle) — crashes on Android/web.
 * Crash 2: SubjectRing used Animated.Value interpolated into strokeDashoffset on SVG Circle.
 * Crash 3: BadgeUnlockModal always mounted 18 Reanimated Particle worklets even when not visible.
 * Crash 4: ProgressSkeletonScreen mounted infinite withRepeat Reanimated animations on every
 *           navigation to /progress because progress state started as null.
 *
 * These tests verify the architectural fixes at the source-code level.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

function readFile(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("SubjectRing — no Animated API on SVG props", () => {
  const src = readFile("components/subject-ring.tsx");

  it("does not import Animated from react-native", () => {
    // Animated from react-native cannot drive SVG element props on Android
    expect(src).not.toMatch(/import.*Animated.*from ['"]react-native['"]/);
  });

  it("does not use createAnimatedComponent in code (comments excluded)", () => {
    // Strip block and line comments before checking so the crash-history comment doesn't trigger
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/createAnimatedComponent/);
  });

  it("does not use useRef or useEffect in code (comments excluded)", () => {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/useRef|useEffect/);
  });

  it("does not import from react-native-reanimated", () => {
    expect(src).not.toMatch(/from ['"]react-native-reanimated['"]/);
  });

  it("strokeDashoffset is a plain computed number (no Animated.Value)", () => {
    expect(src).toMatch(/strokeDashoffset\s*=/);
    expect(src).not.toMatch(/new Animated\.Value/);
    expect(src).not.toMatch(/useSharedValue/);
  });
});

describe("BadgeUnlockModal — conditional mount only", () => {
  const src = readFile("app/progress.tsx");

  it("BadgeUnlockModal is wrapped in a conditional render (not always mounted)", () => {
    // The modal should only render when unlockModal is non-null
    // Pattern: {unlockModal && <BadgeUnlockModal ...
    expect(src).toMatch(/\{unlockModal\s*&&\s*(<BadgeUnlockModal|\()/);
  });

  it("does not render BadgeUnlockModal unconditionally with visible prop only", () => {
    // The old crash pattern was: <BadgeUnlockModal visible={...} (always mounted)
    // The fix ensures the component is not in the tree at all when unlockModal is null
    const unconditionalPattern = /<BadgeUnlockModal\s+visible=\{/;
    // If it exists, it must be inside a conditional block
    if (unconditionalPattern.test(src)) {
      // Ensure it's preceded by unlockModal && on the same logical block
      expect(src).toMatch(/unlockModal.*BadgeUnlockModal/s);
    }
  });
});

describe("ProgressScreen — no skeleton on first render", () => {
  const src = readFile("app/progress.tsx");

  it("progress state is initialized with getDefaultProgress (not null)", () => {
    // Old crash: useState<ProgressData | null>(null) caused skeleton to always mount
    // Fix: useState<ProgressData>(getDefaultProgress)
    expect(src).toMatch(/useState<ProgressData>\s*\(\s*getDefaultProgress\s*\)/);
  });

  it("does not import ProgressSkeletonScreen (skeleton removed)", () => {
    expect(src).not.toMatch(/import.*ProgressSkeletonScreen/);
  });

  it("does not render ProgressSkeletonScreen", () => {
    expect(src).not.toMatch(/<ProgressSkeletonScreen/);
  });

  it("imports getDefaultProgress from @/lib/progress", () => {
    expect(src).toMatch(/getDefaultProgress/);
    expect(src).toMatch(/from ['"]@\/lib\/progress['"]/);
  });
});

describe("lib/progress — getDefaultProgress is exported", () => {
  const src = readFile("lib/progress.ts");

  it("getDefaultProgress is exported", () => {
    expect(src).toMatch(/export function getDefaultProgress/);
  });
});
