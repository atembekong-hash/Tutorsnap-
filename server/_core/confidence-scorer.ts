/**
 * Confidence scoring for solver responses.
 * Analyzes response quality and returns a confidence score (0-100).
 * Low confidence triggers automatic retry with enhanced preprocessing.
 */

export interface SolverResponse {
  problem?: string;
  subject?: string;
  answer?: string;
  steps?: Array<{ stepNumber?: number; title?: string; explanation?: string; expression?: string }>;
  tips?: string[];
  confidence?: number;
}

/**
 * Score the confidence of a solver response based on:
 * - Presence and quality of required fields
 * - Length and completeness of answer and steps
 * - Clarity of explanations
 * - Presence of practical tips
 */
export function scoreConfidence(response: SolverResponse): number {
  let score = 0;

  // Check required fields (20 points)
  if (response.problem && response.problem.trim().length > 10) score += 5;
  if (response.subject && response.subject.trim().length > 0) score += 5;
  if (response.answer && response.answer.trim().length > 20) score += 5;
  if (response.steps && response.steps.length > 0) score += 5;

  // Check answer quality (20 points)
  if (response.answer) {
    const answerLength = response.answer.trim().length;
    if (answerLength > 100) score += 10; // Good length
    else if (answerLength > 50) score += 5; // Acceptable
    if (response.answer.includes(".") && response.answer.split(".").length > 2) score += 10; // Multiple sentences
  }

  // Check steps quality (30 points)
  if (response.steps && response.steps.length > 0) {
    const avgStepLength = response.steps.reduce((sum, s) => sum + (s.explanation?.length || 0), 0) / response.steps.length;
    if (response.steps.length >= 3) score += 10; // At least 3 steps
    if (response.steps.length >= 5) score += 5; // 5+ steps is better
    if (avgStepLength > 50) score += 10; // Detailed explanations
    if (response.steps.every(s => s.expression && s.expression.trim().length > 0)) score += 5; // All steps have expressions
  }

  // Check tips (20 points)
  if (response.tips && response.tips.length > 0) {
    score += 10; // Has tips
    if (response.tips.length >= 3) score += 10; // 3+ tips
  }

  // Check for common failure patterns (deductions)
  if (response.answer?.toLowerCase().includes("unable") || response.answer?.toLowerCase().includes("cannot")) score -= 20;
  if (response.answer?.toLowerCase().includes("unclear") || response.answer?.toLowerCase().includes("ambiguous")) score -= 15;
  if (!response.steps || response.steps.length === 0) score -= 15;

  return Math.max(0, Math.min(100, score));
}

/**
 * Determine if a response needs retry based on confidence threshold.
 * Returns true if confidence is below threshold.
 */
export function shouldRetry(response: SolverResponse, threshold: number = 70): boolean {
  const confidence = response.confidence || scoreConfidence(response);
  return confidence < threshold;
}

/**
 * Generate a retry prompt for low-confidence responses.
 * Simplified prompt that focuses on core answer without exhaustive details.
 */
export function generateRetryPrompt(originalProblem: string, subject: string): string {
  return `You are TutorSnap, an expert academic tutor.
A previous attempt to solve this problem had low confidence. Please try again with a FOCUSED, DIRECT approach.

Problem: ${originalProblem}
Subject: ${subject}

CRITICAL: Provide ONLY the essential answer and 2-3 key steps. Be concise and direct.
Respond ONLY with this JSON (no extra text):
{
  "problem": "${originalProblem}",
  "subject": "${subject}",
  "answer": "2-3 sentences: the core answer only",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Key step title",
      "explanation": "1-2 sentences: what to do and why",
      "expression": "The key formula or equation"
    }
  ],
  "tips": ["Practical tip 1: 1-2 sentences", "Practical tip 2: 1-2 sentences"]
}`;
}
