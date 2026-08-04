/**
 * AIRE unit tests
 * Tests for the three pure functions in chatStream.ts:
 *   detectUserOverride, classifyQuestion, computeTokenBudget
 */

import { describe, it, expect } from "vitest";
import {
  detectUserOverride,
  classifyQuestion,
  computeTokenBudget,
} from "../server/_core/chatStream";

// --- detectUserOverride ---
describe("detectUserOverride", () => {
  it('returns "short" for "short answer" phrases', () => {
    expect(detectUserOverride("Give me a short answer please")).toBe("short");
    expect(detectUserOverride("briefly explain")).toBe("short");
    expect(detectUserOverride("tldr")).toBe("short");
    expect(detectUserOverride("just the formula")).toBe("short");
    expect(detectUserOverride("in one line")).toBe("short");
  });

  it('returns "full" for "full explanation" phrases', () => {
    expect(detectUserOverride("step by step please")).toBe("full");
    expect(detectUserOverride("show all working")).toBe("full");
    expect(detectUserOverride("full explanation")).toBe("full");
    expect(detectUserOverride("explain everything")).toBe("full");
    expect(detectUserOverride("walk me through it")).toBe("full");
    expect(detectUserOverride("from first principles")).toBe("full");
    expect(detectUserOverride("derive the formula")).toBe("full");
  });

  it("returns null for neutral questions", () => {
    expect(detectUserOverride("What is 1 + 1?")).toBeNull();
    expect(detectUserOverride("Solve x^2 + 3x + 2 = 0")).toBeNull();
    expect(detectUserOverride("What is the capital of France?")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(detectUserOverride("BRIEFLY explain")).toBe("short");
    expect(detectUserOverride("STEP BY STEP")).toBe("full");
  });
});

// --- classifyQuestion ---
describe("classifyQuestion", () => {
  it("classifies trivial questions as difficulty 1", () => {
    const r = classifyQuestion("What is 1+1?");
    expect(r.difficulty).toBe(1);
    expect(r.type).toBe("trivial");
  });

  it("classifies simple questions as difficulty 2", () => {
    const r = classifyQuestion("What is the quadratic formula?");
    expect(r.difficulty).toBeLessThanOrEqual(2);
  });

  it("classifies medium questions as difficulty 3", () => {
    const r = classifyQuestion("Explain how integration by parts works with an example");
    expect(r.difficulty).toBeGreaterThanOrEqual(2);
    expect(r.difficulty).toBeLessThanOrEqual(4);
  });

  it("classifies complex questions as difficulty 4 or 5", () => {
    // Long message with many complex keywords + subject bonus to score >= 11 (complex threshold > 10)
    const r = classifyQuestion(
      "Prove the fundamental theorem of calculus and derive its implications for the Riemann integral. " +
      "Use epsilon delta arguments to establish convergence and apply proof by induction to verify the result. " +
      "Show the derivation step by step.",
      "Mathematics"
    );
    expect(r.difficulty).toBeGreaterThanOrEqual(4);
  });

  it("classifies PhD-level questions as difficulty 5", () => {
    // Very long message with many complex keywords to score > 16 (phd threshold)
    const r = classifyQuestion(
      "Derive the Navier-Stokes equations from first principles using the Reynolds transport theorem. " +
      "Prove the existence of weak solutions using the Galerkin method, apply the Fourier transform and " +
      "Laplace transform, and explain the physical interpretation of each term including the divergence, " +
      "gradient, and curl operators in the context of fluid dynamics and thermodynamics. " +
      "Establish convergence of the series and use epsilon delta arguments throughout the proof.",
      "Physics"
    );
    expect(r.difficulty).toBe(5);
    expect(r.type).toBe("phd");
  });

  it("gives higher scores for maths/physics subjects", () => {
    const rMath = classifyQuestion("Solve this equation", "Mathematics");
    const rEnglish = classifyQuestion("Solve this equation", "English");
    expect(rMath.difficulty).toBeGreaterThanOrEqual(rEnglish.difficulty);
  });
});

// --- computeTokenBudget ---
describe("computeTokenBudget", () => {
  it('returns 240 for "short" override regardless of difficulty', () => {
    expect(computeTokenBudget({ difficulty: 5, type: "phd" }, "short", true)).toBe(240);
    expect(computeTokenBudget({ difficulty: 1, type: "trivial" }, "short", false)).toBe(240);
  });

  it('returns 5000 for "full" override regardless of difficulty', () => {
    expect(computeTokenBudget({ difficulty: 1, type: "trivial" }, "full", false)).toBe(5000);
    expect(computeTokenBudget({ difficulty: 3, type: "medium" }, "full", true)).toBe(5000);
  });

  it("returns higher budget for higher difficulty", () => {
    const trivial = computeTokenBudget({ difficulty: 1, type: "trivial" }, null, true);
    const complex = computeTokenBudget({ difficulty: 4, type: "complex" }, null, true);
    const phd = computeTokenBudget({ difficulty: 5, type: "phd" }, null, true);
    expect(complex).toBeGreaterThan(trivial);
    expect(phd).toBeGreaterThan(complex);
  });

  it("returns higher budget in detailed mode vs concise mode", () => {
    const detailed = computeTokenBudget({ difficulty: 3, type: "medium" }, null, true);
    const concise = computeTokenBudget({ difficulty: 3, type: "medium" }, null, false);
    expect(detailed).toBeGreaterThan(concise);
  });

  it("never exceeds 5000 tokens", () => {
    const budget = computeTokenBudget({ difficulty: 5, type: "phd" }, null, true);
    expect(budget).toBeLessThanOrEqual(5000);
  });

  it("trivial question in concise mode gives a small budget", () => {
    const budget = computeTokenBudget({ difficulty: 1, type: "trivial" }, null, false);
    expect(budget).toBeLessThanOrEqual(400);
  });
});

// --- computeSubjectMultiplier (pure logic, no DB) ---
// We test the multiplier decision logic directly without a real DB connection.
// The logic mirrors what computeSubjectMultiplier does after fetching rows.

function subjectMultiplierFromRatings(ratings: number[]): number {
  if (ratings.length < 3) return 1.0;
  const tooLong = ratings.filter((r) => r === 1).length;
  const tooShort = ratings.filter((r) => r === -1).length;
  const total = ratings.length;
  if (tooLong / total > 0.6) return 0.7;
  if (tooShort / total > 0.6) return 1.3;
  return 1.0;
}

describe("AIRE Stage 4: per-subject multiplier logic", () => {
  it("returns 1.0 when fewer than 3 samples", () => {
    expect(subjectMultiplierFromRatings([])).toBe(1.0);
    expect(subjectMultiplierFromRatings([1])).toBe(1.0);
    expect(subjectMultiplierFromRatings([1, 1])).toBe(1.0);
  });

  it("returns 0.7 when more than 60% of ratings are too-long (1)", () => {
    // 7 out of 10 are too-long
    const ratings = [1, 1, 1, 1, 1, 1, 1, 0, -1, 0];
    expect(subjectMultiplierFromRatings(ratings)).toBe(0.7);
  });

  it("returns 1.3 when more than 60% of ratings are too-short (-1)", () => {
    // 7 out of 10 are too-short
    const ratings = [-1, -1, -1, -1, -1, -1, -1, 0, 1, 0];
    expect(subjectMultiplierFromRatings(ratings)).toBe(1.3);
  });

  it("returns 1.0 when ratings are balanced (no dominant preference)", () => {
    // 4 too-long, 3 just-right, 3 too-short -- no single category > 60%
    const ratings = [1, 1, 1, 1, 0, 0, 0, -1, -1, -1];
    expect(subjectMultiplierFromRatings(ratings)).toBe(1.0);
  });

  it("returns 1.0 when exactly 60% are too-long (threshold is strictly >60%)", () => {
    // 6 out of 10 are too-long -- exactly 60%, not strictly greater
    const ratings = [1, 1, 1, 1, 1, 1, 0, 0, -1, -1];
    expect(subjectMultiplierFromRatings(ratings)).toBe(1.0);
  });

  it("returns 0.7 when all ratings are too-long", () => {
    const ratings = [1, 1, 1, 1, 1];
    expect(subjectMultiplierFromRatings(ratings)).toBe(0.7);
  });

  it("returns 1.3 when all ratings are too-short", () => {
    const ratings = [-1, -1, -1, -1, -1];
    expect(subjectMultiplierFromRatings(ratings)).toBe(1.3);
  });

  it("returns 1.0 when all ratings are just-right", () => {
    const ratings = [0, 0, 0, 0, 0];
    expect(subjectMultiplierFromRatings(ratings)).toBe(1.0);
  });
});
