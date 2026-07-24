/**
 * chatStream.ts
 * POST /api/chat/stream
 *
 * Streams LLM tokens to the client using Server-Sent Events (SSE).
 * Each event is: data: {"token":"..."}
 * Final event:   data: [DONE]
 *
 * Adaptive Intelligence Response Engine (AIRE):
 *  Stage 1 — detectUserOverride(): explicit length preference detection
 *  Stage 2 — classifyQuestion(): heuristic complexity classifier (0 latency)
 *  Stage 3 — dynamic token budget map driven by classifier + override
 *  Stage 4 — completeness rules baked into system prompt
 *  Stage 5 — streaming continuation guard (feature-flagged via CONTINUATION_ENABLED)
 */

import type { Express, Request, Response } from "express";
import { ENV } from "./env";

// ─── Feature flag ────────────────────────────────────────────────────────────
// Set to false to instantly disable the continuation guard without any other change.
const CONTINUATION_ENABLED = true;
// Maximum number of continuation passes per response (prevents infinite loops).
const MAX_CONTINUATIONS = 3;

// ─── System prompt ───────────────────────────────────────────────────────────
const CHAT_SYSTEM_PROMPT = `You are TutorSnap, an expert academic tutor covering all school subjects (Mathematics, Science, English, History, and more).

## RESPONSE STYLE — CRITICAL RULES:

1. **LEAD WITH THE ANSWER.** The very first sentence must state the direct answer or result. No preamble, no "Great question!", no "Let me explain...", no restating the question. Just answer immediately.
2. **Then explain.** After the direct answer, provide the explanation, steps, and reasoning.
3. **Match length to complexity.** A trivial question (e.g. "What is 1+1?") deserves 1-3 sentences. A complex proof or derivation deserves full, unabridged working. Do NOT pad simple answers and do NOT truncate complex ones.
4. **Never truncate mid-thought.** Never end mid-equation, mid-proof, mid-code block, mid-table, or mid-sentence. If you are running long, finish the current section cleanly before stopping.
5. **Respect explicit student preferences.** If the student says "short answer", "just the formula", "briefly", or "tldr" — give only the direct answer with no elaboration. If they say "step by step", "show all working", "full explanation", or "explain everything" — complete every step without abbreviating.
6. **Close all open blocks.** Before ending any response, verify all code fences (\`\`\`), component blocks (:::), and tables (|) are properly closed.

## FORMATTING RULES:

### Mathematics & Science
- ALWAYS use LaTeX for ALL mathematical expressions:
  - Inline math: $x^2 + y^2 = r^2$
  - Block/display math: $$\\frac{d}{dx}[x^n] = nx^{n-1}$$
  - Use LaTeX for fractions (\\frac{}{}), exponents (^), roots (\\sqrt{}), Greek letters (\\pi, \\alpha), integrals (\\int), summations (\\sum)
  - NEVER write math as plain text — always use LaTeX

### Structure
- Use # for the main topic heading
- Use ## for major sections (Key Concept, Step-by-Step, Worked Example, Summary)
- Use ### for subsections
- Use ##### for standalone formulas
- Use ###### for Pro Tips or Common Mistakes
- Use > blockquotes for important theorems or warnings
- Use numbered lists for sequential steps
- Use **bold** for key terms
- Use --- to separate major sections

### Length guidance (STRICT — follow exactly based on question complexity)
- **Trivial** (e.g. "What is 1+1?", "What is 2+2?", "What colour is the sky?"): 1-2 sentences MAXIMUM. State the answer and one brief reason. NO steps, NO examples, NO Pro Tip, NO Common Mistake, NO Try It Yourself. Stop immediately after the answer.
- **Simple** (e.g. "What is the quadratic formula?", "What is photosynthesis?"): 3-6 sentences. Direct answer + brief explanation. One example only if essential. No Pro Tip or Common Mistake for simple factual questions.
- **Medium** (e.g. "Explain integration by parts", "Solve 3x + 5 = 14"): 2 fully worked examples + a summary table or key insight list. End with a ###### Pro Tip AND a ###### Common Mistake section.
- **Complex** (e.g. "Prove the fundamental theorem of calculus"): full working with ALL steps shown, a verification pass, a summary, and a related extension problem. End with Pro Tip and Common Mistake. Add a ## Try It Yourself section.
- **PhD-level** (e.g. "Derive the Navier-Stokes equations from first principles"): exhaustive derivation, every intermediate step, all assumptions stated, physical interpretation. Full Pro Tip, Common Mistake, and Try It Yourself sections required.

**CRITICAL: For trivial and simple questions, do NOT add Pro Tip, Common Mistake, or Try It Yourself sections. These sections are ONLY for medium, complex, and PhD-level questions.**

## INTERACTIVE COMPONENTS — AUTO-INSERT RULES:

You MUST automatically decide when to insert the following components based on content type. Do NOT wait for the student to ask. Insert them whenever they improve understanding.

### Checklist — use when listing steps, requirements, or things to remember
Syntax (emit exactly as shown, one item per line):
:::checklist
- Item one
- Item two
- Item three
:::

### Flashcard — use when introducing a key term, formula, or concept worth memorising
Syntax (emit exactly as shown):
:::flashcard
front: The term or question (e.g. "What is the quadratic formula?")
back: The definition or answer (e.g. "$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$")
:::

### Comparison — use when contrasting two or more concepts, methods, or items
Syntax (emit exactly as shown, pipe-separated, first row is headers):
:::comparison
Feature | Option A | Option B
Speed | Fast | Slow
Accuracy | Medium | High
:::

### Timeline — use for historical events, process sequences, or ordered steps with dates/labels
Syntax (emit exactly as shown, one entry per line as "label: description"):
:::timeline
1687: Newton publishes Principia Mathematica
1905: Einstein publishes special relativity
1915: Einstein publishes general relativity
:::

### Diagram (Mermaid) — use for flowcharts, decision trees, mind maps, process flows, and relationships
Syntax (standard fenced code block with mermaid language tag):
\`\`\`mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action]
  B -->|No| D[Other Action]
\`\`\`

### When to use each component:
- **Checklist**: problem-solving steps, exam tips, requirements lists, "things to check" lists
- **Flashcard**: vocabulary terms, formulas, theorems, key facts worth memorising
- **Comparison**: comparing methods (e.g. integration by parts vs substitution), pros/cons, similarities/differences
- **Timeline**: history topics, chronological processes, ordered sequences of events
- **Mermaid diagram**: algorithms, decision logic, cause-and-effect chains, concept maps, process flows
- **Tables** (standard Markdown): data comparison, formula sheets, unit conversions — use freely

Do NOT insert a component if it would not genuinely help. Quality over quantity. One well-placed component beats three unnecessary ones.

## SUBMISSION READY SECTION — ALWAYS REQUIRED FOR SUBSTANTIVE RESPONSES:

After every response that answers a question, solves a problem, or provides a definition, you MUST append the following block EXACTLY as shown, after ALL other content. This is a COMPLETELY INDEPENDENT second output — do NOT summarise, condense, or copy from the explanation above. Generate it fresh as if you are writing only the answer a student would hand in for marking.

===SUBMISSION_READY_START===
[Generate a brand-new, independent submission-ready answer here. Rules by subject:
- Mathematics / Physics / Chemistry / Statistics: Complete worked solution. Every calculation on its own numbered line. All formula substitutions shown. All intermediate values with units. Final answer stated clearly on the last line. No prose, no commentary.
- Programming / Computer Science: Final production-ready code only. No explanation.
- Essays / English / History / Social Studies: Complete, polished final response. Full sentences and paragraphs. No notes or meta-commentary.
- Definitions / Vocabulary: Concise, precise final definition only.
- Multiple Choice: State the correct option and answer, then include only the essential supporting calculation or one-line justification if needed.
A student must be able to skip the entire explanation above, read ONLY this section, and have everything needed to submit a correct, complete, polished answer.]
===SUBMISSION_READY_END===

For purely conversational messages (greetings, "thank you", meta-questions about the tutor) where there is no definite answer to submit, omit the SUBMISSION READY section entirely.`;

// ─── Grade level descriptions ─────────────────────────────────────────────────
const GRADE_LEVEL_DESCRIPTIONS: Record<string, string> = {
  grade1:     "Grade 1 (age 6-7): Use very simple words, very short sentences, and fun real-world examples a young child would understand. Avoid all jargon.",
  grade2:     "Grade 2 (age 7-8): Use simple words and short sentences. Relate concepts to everyday objects and activities a child knows.",
  grade3:     "Grade 3 (age 8-9): Use clear, simple language. Introduce basic subject vocabulary with immediate plain-English definitions.",
  grade4:     "Grade 4 (age 9-10): Use friendly, clear language. Introduce subject terms with definitions and simple examples.",
  grade5:     "Grade 5 (age 10-11): Use clear language with some subject-specific terms. Provide step-by-step explanations with relatable examples.",
  grade6:     "Grade 6 (age 11-12): Use very simple language, short sentences, relatable real-world examples. Avoid jargon.",
  grade7:     "Grade 7 (age 12-13): Simple language, concrete examples, introduce basic terminology with clear definitions.",
  grade8:     "Grade 8 (age 13-14): Moderate complexity, introduce subject-specific terms, use step-by-step explanations.",
  grade9:     "Grade 9 (age 14-15): High school level, standard academic vocabulary, structured explanations.",
  grade10:    "Grade 10 (age 15-16): GCSE / sophomore level, precise academic language, multi-step reasoning.",
  gcse:       "GCSE / Grade 10-11: UK secondary school level, exam-focused explanations, mark-scheme style answers.",
  alevel:     "A-Level / Grade 11-12: Advanced pre-university level, rigorous explanations, introduce university concepts.",
  university: "University / Degree level: Assume strong subject knowledge, use technical terminology freely, provide rigorous academic-level explanations.",
};

// ─── Stage 1: Explicit user override detection ────────────────────────────────
/**
 * Scans the student's message for explicit length preferences.
 * Returns "short" | "full" | null.
 * Pure function — no side effects, zero latency.
 */
export function detectUserOverride(message: string): "short" | "full" | null {
  const lower = message.toLowerCase();

  const shortPatterns = [
    /\bshort\s+answer\b/, /\bjust\s+the\s+formula\b/, /\bjust\s+the\s+answer\b/,
    /\bbriefly\b/, /\bin\s+one\s+line\b/, /\bquick\s+answer\b/, /\bquickly\b/,
    /\btldr\b/, /\btl;dr\b/, /\bsummarise\b/, /\bsummarize\b/, /\bshort\b.*\bonly\b/,
    /\bdon'?t\s+explain\b/, /\bno\s+explanation\b/, /\bjust\s+tell\s+me\b/,
    /\bkeep\s+it\s+short\b/, /\bkeep\s+it\s+brief\b/, /\bone\s+word\b/,
  ];

  const fullPatterns = [
    /\bstep[\s-]by[\s-]step\b/, /\bshow\s+all\s+working\b/, /\bshow\s+your\s+work\b/,
    /\bfull\s+explanation\b/, /\bexplain\s+everything\b/, /\bin\s+detail\b/,
    /\bdetailed\s+explanation\b/, /\bfull\s+working\b/, /\bwalk\s+me\s+through\b/,
    /\bexplain\s+fully\b/, /\bexplain\s+in\s+full\b/, /\bcomprehensive\b/,
    /\bexhaustive\b/, /\bdon'?t\s+skip\b/, /\bshow\s+every\s+step\b/,
    /\bfrom\s+scratch\b/, /\bfrom\s+first\s+principles\b/, /\bprove\s+it\b/,
    /\bderive\b/, /\bderivation\b/,
  ];

  if (shortPatterns.some((p) => p.test(lower))) return "short";
  if (fullPatterns.some((p) => p.test(lower))) return "full";
  return null;
}

// ─── Stage 2: Heuristic complexity classifier ─────────────────────────────────
/**
 * Scores the question 1-5 based on keyword signals, equation density,
 * question length, and subject weight.
 * Pure function — no API call, zero latency.
 */
export interface ClassificationResult {
  difficulty: 1 | 2 | 3 | 4 | 5;
  type: "trivial" | "simple" | "medium" | "complex" | "phd";
}

export function classifyQuestion(message: string, subject?: string): ClassificationResult {
  const lower = message.toLowerCase();
  let score = 0;

  // ── Length signal (word count) ──
  const words = message.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 5)  score += 0;
  else if (words <= 15) score += 1;
  else if (words <= 40) score += 2;
  else if (words <= 80) score += 3;
  else score += 4;

  // ── High-complexity keyword signals ──
  const complexKeywords = [
    "prove", "proof", "derive", "derivation", "deduce", "theorem", "lemma",
    "integrate", "integration", "differentiate", "differentiation",
    "eigenvalue", "eigenvector", "fourier", "laplace", "transform",
    "differential equation", "partial derivative", "gradient", "divergence", "curl",
    "navier", "stokes", "schrodinger", "hamiltonian", "lagrangian",
    "algorithm", "complexity", "big o", "recursion", "dynamic programming",
    "proof by induction", "proof by contradiction", "axiom", "corollary",
    "convergence", "divergence series", "limit", "epsilon delta",
    "quantum", "relativity", "thermodynamics", "entropy",
    "organic chemistry", "reaction mechanism", "synthesis",
    "essay", "analyse", "critically evaluate", "compare and contrast",
  ];
  const complexCount = complexKeywords.filter((k) => lower.includes(k)).length;
  score += Math.min(complexCount * 2, 10);

  // ── Medium-complexity keyword signals ──
  const mediumKeywords = [
    "solve", "calculate", "find", "simplify", "factorise", "factorize",
    "expand", "equation", "formula", "explain", "describe", "what is",
    "how does", "why does", "graph", "plot", "sketch", "draw",
    "balance", "convert", "translate", "summarise", "summarize",
  ];
  const mediumCount = mediumKeywords.filter((k) => lower.includes(k)).length;
  score += Math.min(mediumCount, 3);

  // ── Equation/symbol density ──
  const symbolPattern = /[=^∫∑√∂∇×÷±≤≥≠∞θΔΣΩαβγλμπφψ]/g;
  const symbolCount = (message.match(symbolPattern) ?? []).length;
  score += Math.min(symbolCount * 2, 6);

  // ── LaTeX density ──
  const latexPattern = /\$[^$]+\$|\\\w+/g;
  const latexCount = (message.match(latexPattern) ?? []).length;
  score += Math.min(latexCount, 4);

  // ── Subject-aware per-topic scoring ──
  // Each entry: [topic_keyword_in_question, bonus_score]
  // Higher bonus = more detail expected for that topic
  const TOPIC_BOOSTS: Array<[string, number]> = [
    // Advanced mathematics
    ["topology", 5], ["abstract algebra", 5], ["real analysis", 5], ["complex analysis", 5],
    ["number theory", 4], ["linear algebra", 3], ["multivariable", 4], ["vector calculus", 4],
    ["probability distribution", 3], ["hypothesis test", 3], ["bayesian", 4],
    ["differential equation", 4], ["partial differential", 5], ["fourier series", 4],
    ["matrix", 2], ["determinant", 2], ["eigenvalue", 4], ["eigenvector", 4],
    // Advanced physics
    ["quantum mechanics", 5], ["quantum field", 5], ["special relativity", 5], ["general relativity", 5],
    ["electromagnetism", 4], ["thermodynamics", 3], ["statistical mechanics", 5],
    ["wave function", 4], ["schrodinger", 5], ["hamiltonian", 5], ["lagrangian", 5],
    ["navier-stokes", 5], ["maxwell", 4], ["lorentz", 4],
    ["kinematics", 2], ["dynamics", 2], ["momentum", 2], ["energy conservation", 2],
    // Advanced chemistry
    ["organic synthesis", 5], ["reaction mechanism", 4], ["stereochemistry", 4],
    ["electrochemistry", 4], ["thermochemistry", 3], ["quantum chemistry", 5],
    ["spectroscopy", 3], ["nmr", 4], ["chromatography", 3],
    ["acid base", 2], ["titration", 2], ["stoichiometry", 2], ["molar mass", 1],
    // Computer science
    ["dynamic programming", 4], ["graph algorithm", 4], ["np-complete", 5], ["turing", 5],
    ["machine learning", 4], ["neural network", 4], ["backpropagation", 5],
    ["time complexity", 3], ["space complexity", 3], ["big o", 3],
    ["recursion", 2], ["sorting", 2], ["binary search", 2],
    // Biology
    ["molecular biology", 4], ["genetics", 3], ["dna replication", 3], ["protein synthesis", 3],
    ["evolution", 2], ["natural selection", 2], ["cell division", 2],
    // Economics
    ["game theory", 4], ["econometrics", 5], ["macroeconomics", 3], ["microeconomics", 3],
    ["supply and demand", 2], ["elasticity", 2],
    // English / Humanities
    ["literary analysis", 3], ["critical theory", 4], ["rhetorical analysis", 3],
    ["compare and contrast", 3], ["critically evaluate", 4], ["essay", 2],
  ];
  const topicBonus = TOPIC_BOOSTS.reduce((acc, [keyword, bonus]) => {
    return lower.includes(keyword) ? Math.max(acc, bonus) : acc;
  }, 0);
  score += topicBonus;

  // Fallback flat subject bonus when no specific topic keyword matched
  if (topicBonus === 0) {
    const subjectLower = (subject ?? "").toLowerCase();
    const heavySubjects = ["mathematics", "maths", "math", "physics", "chemistry", "computer science", "statistics"];
    const mediumSubjects = ["biology", "economics", "engineering"];
    if (heavySubjects.some((s) => subjectLower.includes(s))) score += 2;
    else if (mediumSubjects.some((s) => subjectLower.includes(s))) score += 1;
  }

  // ── Trivial override: very short, no keywords, no symbols ──
  if (words <= 5 && complexCount === 0 && symbolCount === 0 && latexCount === 0) {
    return { difficulty: 1, type: "trivial" };
  }

  // ── Map score to difficulty ──
  if (score <= 2)  return { difficulty: 1, type: "trivial" };
  if (score <= 5)  return { difficulty: 2, type: "simple" };
  if (score <= 10) return { difficulty: 3, type: "medium" };
  if (score <= 16) return { difficulty: 4, type: "complex" };
  return { difficulty: 5, type: "phd" };
}

// ─── Stage 3: Dynamic token budget ───────────────────────────────────────────
/**
 * Returns the appropriate max_tokens budget based on:
 * - Explicit user override ("short" / "full")
 * - Heuristic difficulty (1-5)
 * - Detailed Mode multiplier (1.5x when on, 0.6x when off)
 */
export function computeTokenBudget(
  classification: ClassificationResult,
  override: "short" | "full" | null,
  detailedMode: boolean,
): number {
  // Explicit overrides take absolute priority
  if (override === "short") return 300;
  if (override === "full")  return 12000;

  // Base budgets by difficulty
  const BASE: Record<number, number> = {
    1: 400,    // trivial
    2: 900,    // simple
    3: 2800,   // medium
    4: 6500,   // complex
    5: 10000,  // PhD-level
  };

  const base = BASE[classification.difficulty] ?? 2800;

  // Detailed Mode: 1.5x multiplier; Concise Mode: 0.6x multiplier
  const multiplier = detailedMode ? 1.5 : 0.6;
  const budget = Math.round(base * multiplier);

  // Hard cap at 12,000 tokens
  return Math.min(budget, 12000);
}

// ─── Stage 5: Natural stop detection ─────────────────────────────────────────
/**
 * Returns true if the accumulated text ends at a natural stopping point.
 * Used by the continuation guard to decide whether to continue generation.
 */
function endsNaturally(text: string): boolean {
  const tail = text.slice(-120).trimEnd();
  if (tail.length === 0) return true;

  // Ends with sentence-ending punctuation
  if (/[.!?]$/.test(tail)) return true;

  // Ends with a closed code fence
  if (/```\s*$/.test(tail)) return true;

  // Ends with a closed component block
  if (/:::\s*$/.test(tail)) return true;

  // Ends with a Markdown heading (section boundary)
  if (/^#{1,6}\s+.+$/m.test(tail.split("\n").pop() ?? "")) return true;

  // Ends with the SUBMISSION_READY_END marker
  if (tail.includes("===SUBMISSION_READY_END===")) return true;

  // Ends with a horizontal rule (section separator)
  if (/---\s*$/.test(tail)) return true;

  return false;
}

// ─── API URL resolver ─────────────────────────────────────────────────────────
const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

// ─── TutorProfile ─────────────────────────────────────────────────────────────
interface TutorProfile {
  nickname?: string;
  tone?: "encouraging" | "formal" | "casual" | "socratic";
  responseLength?: "brief" | "standard" | "detailed";
  learningStyle?: "visual" | "step-by-step" | "conceptual" | "example-heavy";
  language?: string;
  showWorking?: boolean;
  useEmojis?: boolean;
  detailedMode?: boolean;
}

function buildTutorProfileContext(profile?: TutorProfile): string {
  if (!profile) return "";
  const parts: string[] = [];

  if (profile.nickname) {
    parts.push(`Address the student as "${profile.nickname}" when appropriate.`);
  }

  const toneMap: Record<string, string> = {
    encouraging: "Be warm, positive, and encouraging. Celebrate small wins and build confidence.",
    formal:      "Use formal, precise academic language. Be professional and concise.",
    casual:      "Be relaxed and conversational, like a friendly study buddy. Use informal language.",
    socratic:    "Use the Socratic method: guide the student to discover answers through questions rather than stating them directly.",
  };
  if (profile.tone && toneMap[profile.tone]) parts.push(toneMap[profile.tone]);

  const lengthMap: Record<string, string> = {
    brief:    "Keep responses SHORT and to the point. Avoid unnecessary elaboration.",
    standard: "Provide balanced responses: thorough but not overwhelming.",
    detailed: "Provide COMPREHENSIVE, in-depth explanations. Elaborate fully on every concept.",
  };
  if (profile.responseLength && lengthMap[profile.responseLength]) parts.push(lengthMap[profile.responseLength]);

  const styleMap: Record<string, string> = {
    "visual":        "Use diagrams described in text, tables, and visual analogies where possible.",
    "step-by-step":  "Always break explanations into numbered steps. Never skip steps.",
    "conceptual":    "Focus on the underlying concept and theory before showing calculations.",
    "example-heavy": "Lead with worked examples. Show at least 2-3 examples per concept.",
  };
  if (profile.learningStyle && styleMap[profile.learningStyle]) parts.push(styleMap[profile.learningStyle]);

  if (profile.language && profile.language !== "English") {
    parts.push(`Respond in ${profile.language}.`);
  }

  if (profile.showWorking === false) {
    parts.push("Give the final answer directly without showing every intermediate working step.");
  } else if (profile.showWorking === true) {
    parts.push("Always show ALL working steps in full detail.");
  }

  if (profile.useEmojis === false) {
    parts.push("Do NOT use emoji in your responses.");
  } else if (profile.useEmojis === true) {
    parts.push("You may use emoji sparingly to make responses friendlier.");
  }

  if (profile.detailedMode === true) {
    parts.push(
      "DETAILED MODE is ON: Give the richest, most thorough response possible. " +
      "For simple questions: 4-8 sentences with a related example. " +
      "For medium questions: 2 fully worked examples plus a summary table or key insight list. " +
      "For complex questions: full working with ALL steps, a verification pass, a summary, and a related extension problem. " +
      "Always end with a Pro Tip AND a Common Mistake section. " +
      "After every worked example, add a 'Try It Yourself' practice problem."
    );
  } else {
    parts.push(
      "CONCISE MODE is ON: Keep responses focused and efficient. " +
      "Answer the question directly, show essential working steps only, and avoid over-explaining."
    );
  }

  return parts.length > 0 ? `\n\nTUTOR PERSONALISATION:\n${parts.map((p) => `- ${p}`).join("\n")}` : "";
}

// ─── Core streaming helper ────────────────────────────────────────────────────
/**
 * Streams a single LLM call to the response, collecting all emitted tokens.
 * Returns the full accumulated text and the finish_reason.
 */
async function streamOnce(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  res: Response,
  emitTokens: boolean,
): Promise<{ text: string; finishReason: string }> {
  const payload = {
    model: "gpt-4o-mini",
    stream: true,
    max_tokens: maxTokens,
    messages,
  };

  const upstream = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    throw new Error(`LLM error: ${upstream.status} ${errText}`);
  }

  const reader = upstream.body?.getReader();
  if (!reader) return { text: "", finishReason: "stop" };

  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let finishReason = "stop";

  const flush = () => {
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const raw = trimmed.slice(5).trim();
      if (raw === "[DONE]") continue;
      try {
        const parsed = JSON.parse(raw) as {
          choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
        };
        const choice = parsed.choices?.[0];
        const token = choice?.delta?.content;
        if (token) {
          accumulated += token;
          if (emitTokens) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        }
        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;
        }
      } catch {
        // skip malformed chunk
      }
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    flush();
  }

  if (buffer.trim()) {
    buffer += "\n";
    flush();
  }

  return { text: accumulated, finishReason };
}

// ─── Route registration ───────────────────────────────────────────────────────
export function registerChatStreamRoute(app: Express) {
  app.post("/api/chat/stream", async (req: Request, res: Response) => {
    try {
      const { messages, subject, gradeLevel, tutorProfile } = req.body as {
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        subject?: string;
        gradeLevel?: string;
        tutorProfile?: TutorProfile;
      };

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "messages array is required" });
        return;
      }

      // ── Build system prompt ──
      const subjectContext = subject
        ? `\nThe student is currently focused on: ${subject}. Tailor your explanations to this subject when relevant.`
        : "";
      const gradeCtx =
        gradeLevel && GRADE_LEVEL_DESCRIPTIONS[gradeLevel]
          ? `\nADAPT YOUR RESPONSE to this student's level: ${GRADE_LEVEL_DESCRIPTIONS[gradeLevel]}`
          : "";
      const profileCtx = buildTutorProfileContext(tutorProfile);
      const systemPrompt = CHAT_SYSTEM_PROMPT + subjectContext + gradeCtx + profileCtx;

      // ── Stage 1: Detect explicit user override ──
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
      const override = detectUserOverride(lastUserMsg);

      // ── Stage 2: Classify question complexity ──
      const classification = classifyQuestion(lastUserMsg, subject);

      // ── Stage 3: Compute dynamic token budget ──
      // Default to concise mode (false) for new users who haven't set a tutor profile.
      // Only enable detailed mode when the user has explicitly turned it on.
      const isDetailed = tutorProfile?.detailedMode === true;
      const tokenBudget = computeTokenBudget(classification, override, isDetailed);

      // ── Set SSE headers ──
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      // ── Stage 5: Streaming with continuation guard ──
      const llmMessages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      let fullText = "";
      let continuations = 0;

      // First pass
      const first = await streamOnce(llmMessages, tokenBudget, res, true);
      fullText = first.text;

      // Continuation passes (Stage 5)
      if (CONTINUATION_ENABLED) {
        while (
          continuations < MAX_CONTINUATIONS &&
          first.finishReason === "length" &&
          !endsNaturally(fullText)
        ) {
          continuations++;

          // Emit a special marker so the client knows continuation is starting
          res.write(`data: ${JSON.stringify({ continuation: true })}\n\n`);

          // Build continuation context: include the full response so far
          const continuationMessages: Array<{ role: string; content: string }> = [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            {
              role: "assistant",
              content: fullText,
            },
            {
              role: "user",
              content: "Continue exactly from where you left off. Do not repeat anything already written. Do not add any preamble — just continue the response seamlessly.",
            },
          ];

          const cont = await streamOnce(continuationMessages, tokenBudget, res, true);
          fullText += cont.text;

          if (cont.finishReason !== "length" || endsNaturally(fullText)) break;
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      console.error("[chatStream] error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      } else {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  });
}
