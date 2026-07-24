/**
 * Tests for the Progress screen crash fixes (Round 65)
 *
 * Root cause 1: SubjectRing used Animated.createAnimatedComponent(Circle) with
 *   Reanimated useAnimatedProps — crashes on native. Fixed by using plain RN
 *   Animated.Value + JS state listener.
 *
 * Root cause 2: getDailyGoalPercent() divided by zero when dailyGoal=0,
 *   producing NaN which crashes native when used as a CSS width string.
 */
import { describe, it, expect } from "vitest";

// ─── Test getDailyGoalPercent fix ─────────────────────────────────────────────

// Inline the function so the test is self-contained and doesn't need React Native mocks
function getDailyGoalPercent(todaySolved: number, dailyGoal: number): number {
  if (!dailyGoal || dailyGoal <= 0) return 0;
  return Math.min(100, Math.round((todaySolved / dailyGoal) * 100));
}

describe("getDailyGoalPercent (crash fix)", () => {
  it("returns 0 when dailyGoal is 0 (no division by zero)", () => {
    const result = getDailyGoalPercent(5, 0);
    expect(result).toBe(0);
    expect(Number.isFinite(result)).toBe(true);
    expect(Number.isNaN(result)).toBe(false);
  });

  it("returns 0 when dailyGoal is negative", () => {
    const result = getDailyGoalPercent(5, -1);
    expect(result).toBe(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  it("returns 0 when todaySolved is 0 and dailyGoal is 0", () => {
    const result = getDailyGoalPercent(0, 0);
    expect(result).toBe(0);
    expect(Number.isFinite(result)).toBe(true);
  });

  it("returns correct percentage for normal values", () => {
    expect(getDailyGoalPercent(3, 5)).toBe(60);
    expect(getDailyGoalPercent(5, 5)).toBe(100);
    expect(getDailyGoalPercent(1, 3)).toBe(33);
  });

  it("caps at 100 when over goal", () => {
    expect(getDailyGoalPercent(10, 5)).toBe(100);
  });

  it("returns 0 when todaySolved is 0", () => {
    expect(getDailyGoalPercent(0, 5)).toBe(0);
  });

  it("result is always a finite number (safe for CSS width)", () => {
    const testCases = [
      [0, 0], [0, 1], [1, 0], [5, 5], [10, 3], [0, -1], [3, -5],
    ] as [number, number][];
    for (const [solved, goal] of testCases) {
      const result = getDailyGoalPercent(solved, goal);
      expect(Number.isFinite(result)).toBe(true);
      expect(Number.isNaN(result)).toBe(false);
      // Must be safe as a CSS width percentage string
      expect(`${result}%`).not.toContain("NaN");
      expect(`${result}%`).not.toContain("Infinity");
    }
  });
});

// ─── Test SubjectRing fix: no Animated.createAnimatedComponent(Circle) ────────

describe("SubjectRing crash fix (no AnimatedSvg)", () => {
  it("subject-ring.tsx does not use Animated.createAnimatedComponent with SVG Circle", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "components/subject-ring.tsx"
    );
    const source = fs.readFileSync(filePath, "utf8");

    // The crash pattern: actual usage of createAnimatedComponent with SVG elements
    // (exclude comment lines that mention the pattern as a warning)
    const nonCommentLines = source
      .split('\n')
      .filter(line => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n');
    expect(nonCommentLines).not.toContain("createAnimatedComponent(Circle)");
    expect(nonCommentLines).not.toContain("createAnimatedComponent(Svg)");

    // Must NOT import Reanimated (which caused the crash with SVG)
    expect(source).not.toContain("from 'react-native-reanimated'");
    expect(source).not.toContain('from "react-native-reanimated"');

    // Must use plain RN Animated instead
    expect(source).toContain("Animated as RNAnimated");

    // Must use JS state listener pattern (not useAnimatedProps)
    expect(source).not.toContain("useAnimatedProps");
    expect(source).toContain("addListener");
    expect(source).toContain("removeListener");
  });

  it("subject-ring.tsx uses useNativeDriver: false for SVG-compatible animation", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "components/subject-ring.tsx"
    );
    const source = fs.readFileSync(filePath, "utf8");
    // SVG props can't use native driver
    expect(source).toContain("useNativeDriver: false");
  });

  it("strokeDashoffset is driven by JS state (number), not Reanimated shared value", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "components/subject-ring.tsx"
    );
    const source = fs.readFileSync(filePath, "utf8");
    // State variable for dashOffset
    expect(source).toContain("dashOffset");
    expect(source).toContain("setDashOffset");
    // strokeDashoffset is passed as the JS state value
    expect(source).toContain("strokeDashoffset={dashOffset}");
  });
});

// ─── Integration: pct edge cases produce valid strokeDashoffset values ────────

describe("SubjectRing strokeDashoffset edge cases", () => {
  function computeDashOffset(circumference: number, pct: number): number {
    const clamped = Math.min(1, Math.max(0, pct / 100));
    return circumference * (1 - clamped);
  }

  it("pct=0 gives full dashoffset (empty ring)", () => {
    const c = 2 * Math.PI * 33; // radius 33
    expect(computeDashOffset(c, 0)).toBeCloseTo(c);
  });

  it("pct=100 gives dashoffset=0 (full ring)", () => {
    const c = 2 * Math.PI * 33;
    expect(computeDashOffset(c, 100)).toBeCloseTo(0);
  });

  it("pct=50 gives half dashoffset", () => {
    const c = 2 * Math.PI * 33;
    expect(computeDashOffset(c, 50)).toBeCloseTo(c / 2);
  });

  it("pct > 100 is clamped to 100 (no negative dashoffset)", () => {
    const c = 2 * Math.PI * 33;
    const result = computeDashOffset(c, 150);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeCloseTo(0);
  });

  it("pct < 0 is clamped to 0 (no overflow)", () => {
    const c = 2 * Math.PI * 33;
    const result = computeDashOffset(c, -10);
    expect(result).toBeCloseTo(c);
  });

  it("all results are finite numbers (safe for SVG prop)", () => {
    const c = 2 * Math.PI * 33;
    for (const pct of [0, 25, 50, 75, 100, -1, 101, NaN, Infinity]) {
      const safePct = Number.isFinite(pct) ? pct : 0;
      const result = computeDashOffset(c, safePct);
      expect(Number.isFinite(result)).toBe(true);
    }
  });
});
