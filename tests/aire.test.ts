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
  it('returns 300 for "short" override regardless of difficulty', () => {
    expect(computeTokenBudget({ difficulty: 5, type: "phd" }, "short", true)).toBe(300);
    expect(computeTokenBudget({ difficulty: 1, type: "trivial" }, "short", false)).toBe(300);
  });

  it('returns 12000 for "full" override regardless of difficulty', () => {
    expect(computeTokenBudget({ difficulty: 1, type: "trivial" }, "full", false)).toBe(12000);
    expect(computeTokenBudget({ difficulty: 3, type: "medium" }, "full", true)).toBe(12000);
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

  it("never exceeds 12000 tokens", () => {
    const budget = computeTokenBudget({ difficulty: 5, type: "phd" }, null, true);
    expect(budget).toBeLessThanOrEqual(12000);
  });

  it("trivial question in concise mode gives a small budget", () => {
    const budget = computeTokenBudget({ difficulty: 1, type: "trivial" }, null, false);
    expect(budget).toBeLessThanOrEqual(400);
  });
});
