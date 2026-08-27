import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { aireFeedback, aireSubjectCalibration, solveHistory, chatSessions, userProgress, userBookmarks, userNotes, subscriptions } from "../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { referralRouter } from "./routers/referrals";
import { oauthRouter } from "./routers/oauth";
import { emailAuthRouter } from "./routers/email-auth";
import { classroomRouter } from "./routers/classroom";
import { COOKIE_NAME } from "../shared/const";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";
import { captureServerError } from "./_core/sentry-server";

// ─── Subject-aware prompt builder ────────────────────────────────────────────

function buildSolveSystemPrompt(subject: string): string {
  const subjectGuides: Record<string, string> = {
    // Math
    algebra:                "Solve algebraically with full rigor. Show every algebraic manipulation. Identify the equation type (linear, quadratic, polynomial, rational, etc.). Derive the solution from first principles and verify it by substitution.",
    calculus:               "Apply calculus rules with full rigor (limits, L'Hôpital, derivatives, integrals, series). State every theorem used. Show all intermediate steps including u-substitution, integration by parts, or chain rule expansions. Verify the result.",
    geometry:               "Use geometric theorems and formulas with complete proofs. Describe any diagram in text. Show all angle, length, and area calculations. Reference Euclid, coordinate geometry, or analytic geometry as needed.",
    trigonometry:           "Apply trig identities, the unit circle, and inverse functions. Show angle conversions, identity derivations, and all algebraic simplifications. Verify using alternative identities.",
    statistics:             "Apply statistical formulas step by step. Show all arithmetic. Interpret the result in plain language. Discuss assumptions, limitations, and what the statistic means in context.",
    arithmetic:             "Compute step by step with full order-of-operations detail. Explain each arithmetic rule applied. Verify the result.",
    precalculus:            "Bridge algebra and calculus: analyze functions, transformations, asymptotes, limits, and sequences. Show all algebraic steps and graph descriptions.",
    linear_algebra:         "Use matrix operations, determinants, eigenvalues, and vector space properties. Show every row operation. Verify solutions by back-substitution.",
    differential_equations: "Identify the ODE/PDE type (separable, linear, exact, Bernoulli, etc.). Show the complete solution method including integrating factors or characteristic equations. Verify by substitution.",
    number_theory:          "Apply number theory theorems (divisibility, primes, GCD, modular arithmetic, Fermat, Euler). Prove each step rigorously.",
    // English / Language Arts
    american_literature:    "Provide a thorough literary analysis using devices, historical context, and American traditions. Quote the text directly. Discuss author intent, themes, symbolism, and historical significance in depth.",
    british_literature:     "Provide a thorough literary analysis using British traditions, historical context, and literary devices. Quote the text. Discuss themes, symbolism, author biography, and period context in depth.",
    world_literature:       "Analyze the text in its cultural and historical context. Discuss universal themes, literary devices, translation considerations, and cultural significance in depth.",
    composition:            "Provide structured, detailed writing guidance: thesis construction, evidence selection, argument flow, transitions, counterarguments, and revision strategies with examples.",
    creative_writing:       "Offer detailed creative feedback: voice, imagery, structure, character development, pacing, and narrative techniques with concrete revision examples.",
    debate:                 "Construct rigorous logical arguments with evidence. Address counterarguments thoroughly. Apply rhetorical strategies (ethos, pathos, logos). Provide a full debate outline.",
    journalism:             "Apply journalistic principles deeply: who/what/when/where/why/how, inverted pyramid, source credibility, objectivity, and ethical considerations.",
    grammar:                "Identify the grammatical rule precisely. Explain the correct usage with multiple examples, common mistakes, and edge cases. Contrast with similar rules.",
    poetry:                 "Analyze meter, rhyme scheme, imagery, tone, diction, and literary devices in depth. Discuss the poem's meaning, historical context, and the poet's technique.",
    // Science
    biology:                "Apply biological concepts with full mechanistic detail. Reference cell biology, genetics, ecology, or physiology. Explain the underlying molecular or physiological mechanisms. Use real-world examples.",
    chemistry:              "Balance equations, apply stoichiometry, and explain chemical principles in depth. Show all unit conversions, mole calculations, and thermodynamic reasoning. Verify with dimensional analysis.",
    physics:                "Apply physics laws and formulas with complete derivations. Define all variables. Show full unit analysis. Interpret results physically. Discuss limiting cases and real-world applications.",
    earth_science:          "Apply earth science concepts in depth: geology, meteorology, oceanography, or environmental systems. Explain underlying mechanisms and real-world examples.",
    space_science:          "Apply astronomy and astrophysics concepts with quantitative detail. Reference celestial mechanics, cosmology, or space exploration. Show calculations where applicable.",
    environmental_science:  "Apply environmental science principles in depth: ecosystems, climate, pollution, sustainability. Discuss data, policy implications, and real-world case studies.",
    anatomy:                "Describe anatomical structures, physiological processes, and body systems with clinical accuracy. Explain mechanisms, feedback loops, and pathological implications.",
    forensics:              "Apply forensic science methods in depth: evidence analysis, chain of custody, scientific reasoning, and statistical interpretation of evidence.",
    general_science:        "Apply the scientific method rigorously. Explain concepts with real-world examples, experimental evidence, and quantitative reasoning.",
    // Social Studies
    us_history:             "Provide rich historical context, key figures, primary sources, causes and effects, and historiographical debates. Connect events to broader themes and modern implications.",
    world_history:          "Provide global historical context, compare civilizations, analyze cause and effect, and discuss historiographical perspectives. Connect to modern parallels.",
    government:             "Explain governmental structures, constitutional principles, and civic processes with legal precision. Cite relevant laws, cases, or constitutional provisions.",
    economics:              "Apply economic theories, models, and empirical evidence. Use supply/demand, fiscal/monetary policy, and quantitative reasoning. Discuss real-world policy implications.",
    geography:              "Describe physical and human geography in depth. Explain spatial relationships, regional characteristics, and geopolitical implications with examples.",
    psychology:             "Apply psychological theories and research in depth. Reference key studies, experimental methodology, and discuss behavior/cognition with clinical examples.",
    sociology:              "Apply sociological theories and concepts rigorously. Analyze social structures, institutions, and behavior with empirical examples and theoretical frameworks.",
    civics:                 "Explain civic rights, responsibilities, and democratic processes with legal and historical precision. Reference constitutional provisions and landmark cases.",
  };

  const guide = subjectGuides[subject] ?? "Provide a thorough, accurate, and deeply educational answer at any difficulty level, from basic to university-level. Never refuse a hard question; always attempt a complete solution.";

  return `You are TutorSnap, an expert academic tutor and professor covering ALL school and university subjects at ALL difficulty levels, from middle school basics to graduate-level problems.
Subject: ${subject}
Guidance: ${guide}

CRITICAL RULES:
- NEVER refuse to answer or say a problem is too hard. Solve EVERYTHING: basic arithmetic, advanced calculus, differential equations, abstract algebra, graduate-level physics, etc.
- If a problem is advanced, apply the appropriate advanced techniques (L'Hôpital, eigenvalues, Green's theorem, Fourier series, Lagrangians, etc.).
- Produce a rigorous solution sized for a mobile screen: 6-10 steps for genuinely complex work, fewer when fewer are sufficient.
- Keep each step explanation to 2-4 focused sentences covering the action, reason, and rule used.
- Include one concise worked example only when it materially improves understanding.
- Keep conceptExplained to 6-10 sentences covering the core theory, when it applies, and common pitfalls.
- Keep the answer field to 3-5 sentences stating and interpreting the result.
- Include exactly 3 short, actionable tips.
- Keep workedExample.solution between 120 and 220 words.
- The submissionReady field is a COMPLETELY INDEPENDENT second output. Do NOT summarise, condense, or extract from the explanation above. Generate it fresh from scratch as if you were writing only the answer a student would hand in. Rules by subject type:
  * Mathematics / Physics / Chemistry / Statistics: Write the complete worked solution exactly as a student would present it for marking. Show every calculation step on its own numbered line. Include all formula substitutions, intermediate values with units, and state the final answer clearly on the last line. No prose, no commentary, no "therefore" or "we can see that".
  * Programming / Computer Science: Provide only the final production-ready code. No explanation, no inline comments beyond what the code itself requires.
  * Essays / English / History / Social Studies: Write the complete, polished final response as if submitting it. Full sentences, proper paragraphs, no notes or meta-commentary.
  * Definitions / Vocabulary: Write only the concise, precise final definition.
  * Multiple Choice: State the correct option letter and answer, then include only the essential supporting calculation or one-line justification if needed.
  This field must be completely self-contained. A student must be able to skip the entire explanation above, read ONLY this field, and have everything needed to submit a correct, complete, polished answer.

PLAIN TEXT FORMATTING RULES (CRITICAL - FOLLOW EXACTLY):
- NEVER use dollar signs ($) for any purpose. Write math in plain text: x^2 + 3x = 0, not $x^2 + 3x = 0$.
- NEVER use LaTeX commands: no \\frac, \\sqrt, \\int, \\sum, no backslashes at all.
- NEVER use Markdown formatting: no **bold**, no *italic*, no ## headings, no --- rules, no backticks.
- NEVER use em dashes or en dashes. Use a plain comma or hyphen instead.
- Write all math in plain readable text: use ^ for powers (x^2), / for fractions (a/b), sqrt() for roots.
- The "expression" field: write the formula in plain text only, e.g. 'x = (-b + sqrt(b^2 - 4ac)) / (2a)'.
- All text fields must be clean plain text with no special formatting characters.

Always respond with valid JSON in this exact format:
{
  "problem": "the original question or problem, reproduced exactly",
  "subject": "${subject}",
  "answer": "A FULL PARAGRAPH (7-10 sentences): state the result, interpret it, note units, explain any special cases or caveats, and summarise what was learned.",
  "submissionReady": "[INDEPENDENTLY GENERATED — not a summary of the above] Complete worked solution as a student would write for submission. Maths/science: numbered calculation lines, all substitutions, units, final answer on last line. Programming: final code only. Essays: complete polished prose. Definitions: concise precise definition. Multiple choice: correct option + essential supporting work only. NO explanatory prose, NO commentary, NO preamble.",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Descriptive step title",
      "explanation": "DETAILED explanation (7-10 sentences): what you are doing, why, the rule/theorem that justifies it, any edge cases, and how it leads to the next step.",
      "expression": "The key formula, equation, or expression for this step"
    }
  ],
  "workedExample": {
    "title": "Worked Example: [brief description of the example problem]",
    "problem": "A similar but distinct example problem",
    "solution": "LONG narrative solution (at least 450 words): walk through every single step, explain every operation, state every rule used, and interpret the final result."
  },
  "conceptExplained": "A LONG, RICH paragraph (15-20 sentences): underlying theory, historical context or motivation, formal definition, intuitive explanation, when the concept applies, common pitfalls, and connections to at least 5 related topics.",
  "tips": [
    "Detailed tip 1: specific, actionable, 6-8 sentences",
    "Detailed tip 2: specific, actionable, 6-8 sentences",
    "Detailed tip 3: specific, actionable, 6-8 sentences",
    "Detailed tip 4: specific, actionable, 6-8 sentences",
    "Detailed tip 5: specific, actionable, 6-8 sentences",
    "Detailed tip 6: specific, actionable, 6-8 sentences"
  ],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5", "Topic 6"]
}`;
}

const IMAGE_SOLVE_SYSTEM_PROMPT = `You are TutorSnap, an expert academic tutor and professor covering ALL subjects at ALL difficulty levels.
Analyze the image and identify any question, problem, or text in it.
Determine the subject area automatically, then solve or answer it COMPLETELY and COMPREHENSIVELY.

CRITICAL RULES:
- NEVER refuse to answer or say a problem is too hard. Solve EVERYTHING.
- Produce a rigorous solution sized for a mobile screen: 6-10 steps for genuinely complex work, fewer when fewer are sufficient.
- Keep each step explanation to 2-4 focused sentences covering the action, reason, and rule used.
- Include one concise worked example only when it materially improves understanding.
- Keep conceptExplained to 6-10 sentences covering the core theory, when it applies, and common pitfalls.
- Keep the answer field to 3-5 sentences stating and interpreting the result.
- Include exactly 3 short, actionable tips.
- Keep workedExample.solution between 120 and 220 words.

PLAIN TEXT FORMATTING RULES (CRITICAL - FOLLOW EXACTLY):
- NEVER use dollar signs ($) for any purpose. Write math in plain text: x^2 + 3x = 0, not $x^2 + 3x = 0$.
- NEVER use LaTeX commands: no \\frac, \\sqrt, \\int, \\sum, no backslashes at all.
- NEVER use Markdown formatting: no **bold**, no *italic*, no ## headings, no --- rules, no backticks.
- NEVER use em dashes or en dashes. Use a plain comma or hyphen instead.
- Write all math in plain readable text: use ^ for powers (x^2), / for fractions (a/b), sqrt() for roots.
- The "expression" field: write the formula in plain text only, e.g. 'x = (-b + sqrt(b^2 - 4ac)) / (2a)'.
- All text fields must be clean plain text with no special formatting characters.

Always respond with valid JSON in this exact format:
{
  "problem": "the question or problem you found in the image",
  "subject": "the detected subject id (e.g. algebra, calculus, biology, us_history, etc.)",
  "answer": "A FULL PARAGRAPH (5-8 sentences): state the result, interpret it, note units, explain any special cases or caveats, and summarise what was learned.",
  "submissionReady": "[INDEPENDENTLY GENERATED — not a summary of the above] Complete worked solution as a student would write for submission. Maths/science: numbered calculation lines, all substitutions, units, final answer on last line. Programming: final code only. Essays: complete polished prose. Definitions: concise precise definition. Multiple choice: correct option + essential supporting work only. NO explanatory prose, NO commentary, NO preamble.",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Descriptive step title",
      "explanation": "DETAILED explanation (5-8 sentences): what you are doing, why, the rule/theorem that justifies it, any edge cases, and how it leads to the next step.",
      "expression": "The key formula, equation, or expression"
    }
  ],
  "workedExample": {
    "title": "Worked Example: [brief description]",
    "problem": "A similar but distinct example problem",
    "solution": "LONG narrative solution (at least 300 words): walk through every single step, explain every operation, state every rule used, and interpret the final result."
  },
  "conceptExplained": "A LONG, RICH paragraph (10-15 sentences): underlying theory, historical context or motivation, formal definition, intuitive explanation, when the concept applies, common pitfalls, and connections to at least 3 related topics.",
  "tips": ["Detailed tip 1: 4-6 sentences", "Detailed tip 2: 4-6 sentences", "Detailed tip 3: 4-6 sentences", "Detailed tip 4: 4-6 sentences"],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]
}`;

// ─── Complexity detector ─────────────────────────────────────────────────────

/**
 * Estimates problem complexity and returns an appropriate max_tokens budget.
 * Simple problems (basic arithmetic, single-step) get 800 tokens.
 * Medium problems (multi-step algebra, short essay) get 1400 tokens.
 * Complex problems (calculus, proofs, multi-concept) get 2500 tokens.
 */
function estimateSolveTokens(problem: string, subject: string): number {
  const p = problem.toLowerCase().trim();

  // Simple: very short, single operation, basic arithmetic
  const isSimpleArithmetic =
    /^[\d\s+\-*/^().=?]+$/.test(p) ||
    /^what is \d+\s*[+\-×÷*/]\s*\d+/.test(p) ||
    /^(calculate|compute|find|evaluate)\s+\d+\s*[+\-×÷*/]\s*\d+/.test(p) ||
    (p.split(' ').length <= 8 && ['arithmetic', 'basic_math'].includes(subject));

  // Simple: single-variable linear equation, basic definition
  const isSimpleAlgebra =
    /^solve\s+(for\s+)?[a-z]:\s*[\d\w\s+\-*/^=().]+$/.test(p) &&
    !p.includes('system') && !p.includes('matrix') && !p.includes('quadratic');

  // Complex indicators
  const isComplex =
    /integral|derivative|limit|eigenvalue|differential|proof|theorem|series|transform|vector|matrix|determinant|gradient|divergence|curl|laplace|fourier|taylor|maclaurin|lagrangian|hamiltonian/.test(p) ||
    ['calculus', 'linear_algebra', 'differential_equations', 'number_theory'].includes(subject) ||
    p.split(' ').length > 40;

  // Medium: multi-step but not graduate-level
  const isMedium =
    /quadratic|polynomial|system of|simultaneous|inequality|function|graph|slope|intercept|probability|statistics|hypothesis|confidence/.test(p) ||
    p.split(' ').length > 20;

  if (isComplex) return 2500;
  if (isSimpleArithmetic || isSimpleAlgebra) return 800;
  if (isMedium) return 1400;
  return 1400; // default to medium
}

/**
 * Returns a system prompt scaled to the complexity level.
 * Uses separate prompt templates per tier to avoid fragile string-replace chains.
 */
function buildSolveSystemPromptScaled(subject: string, problem: string): string {
  const tokens = estimateSolveTokens(problem, subject);
  const subjectGuides: Record<string, string> = {
    algebra: "Solve algebraically with full rigor. Show every algebraic manipulation.",
    calculus: "Apply calculus rules with full rigor. State every theorem used. Show all intermediate steps.",
    geometry: "Use geometric theorems and formulas. Show all angle, length, and area calculations.",
    trigonometry: "Apply trig identities, the unit circle, and inverse functions. Show all algebraic simplifications.",
    statistics: "Apply statistical formulas step by step. Show all arithmetic. Interpret the result in plain language.",
    arithmetic: "Compute step by step with full order-of-operations detail. Explain each arithmetic rule applied.",
    precalculus: "Analyze functions, transformations, asymptotes, limits, and sequences. Show all algebraic steps.",
    linear_algebra: "Use matrix operations, determinants, eigenvalues, and vector space properties. Show every row operation.",
    differential_equations: "Identify the ODE/PDE type. Show the complete solution method. Verify by substitution.",
    number_theory: "Apply number theory theorems (divisibility, primes, GCD, modular arithmetic). Prove each step.",
    biology: "Apply biological concepts with mechanistic detail. Explain underlying molecular or physiological mechanisms.",
    chemistry: "Balance equations, apply stoichiometry. Show all unit conversions, mole calculations. Verify with dimensional analysis.",
    physics: "Apply physics laws and formulas with derivations. Define all variables. Show full unit analysis.",
    us_history: "Provide rich historical context, key figures, causes and effects. Connect events to broader themes.",
    world_history: "Provide global historical context, compare civilizations, analyze cause and effect.",
    economics: "Apply economic theories and models. Use supply/demand, fiscal/monetary policy, and quantitative reasoning.",
  };
  const guide = subjectGuides[subject] ?? "Provide a thorough, accurate, and educational answer. Never refuse a hard question; always attempt a complete solution.";

  const FORMATTING = `PLAIN TEXT FORMATTING RULES (CRITICAL - FOLLOW EXACTLY):
- NEVER use dollar signs ($) for any purpose. Write math in plain text: x^2 + 3x = 0, not $x^2 + 3x = 0$.
- NEVER use LaTeX commands: no \\frac, \\sqrt, \\int, \\sum, no backslashes at all.
- NEVER use Markdown formatting: no **bold**, no *italic*, no ## headings, no --- rules, no backticks.
- NEVER use em dashes or en dashes. Use a plain comma or hyphen instead.
- Write all math in plain readable text: use ^ for powers (x^2), / for fractions (a/b), sqrt() for roots.
- The "expression" field: write the formula in plain text only, e.g. 'x = (-b + sqrt(b^2 - 4ac)) / (2a)'.`;

  const SUBMISSION_READY_RULES = `The submissionReady field is a COMPLETELY INDEPENDENT second output. Generate it fresh from scratch as if writing only the answer a student would hand in:
  * Mathematics/Physics/Chemistry/Statistics: Complete worked solution. Every calculation on its own numbered line. All formula substitutions shown. Final answer on last line. No prose.
  * Programming/Computer Science: Final production-ready code only. No explanation.
  * Essays/English/History/Social Studies: Complete, polished final response. Full sentences and paragraphs.
  * Definitions/Vocabulary: Concise, precise final definition only.
  * Multiple Choice: State the correct option letter and answer, then include only the essential supporting calculation or one-line justification.`;

  // ── SIMPLE tier (basic arithmetic, single-step) ──────────────────────────────
  if (tokens <= 800) {
    return `You are TutorSnap, an expert academic tutor.
Subject: ${subject}
Guidance: ${guide}

This is a SIMPLE, DIRECT question. Give a short, direct answer.
- NEVER refuse to answer. Solve everything.
- ${SUBMISSION_READY_RULES}

${FORMATTING}

Respond with valid JSON in EXACTLY this format (no extra fields, no extra steps):
{
  "problem": "the original question reproduced exactly",
  "subject": "${subject}",
  "answer": "One sentence stating the result. Example for '2+2': '2 + 2 = 4.'",
  "submissionReady": "The direct answer only. Example: '2 + 2 = 4'",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Set up",
      "explanation": "One sentence identifying what to calculate.",
      "expression": "the starting expression"
    },
    {
      "stepNumber": 2,
      "title": "Calculate",
      "explanation": "One sentence showing the calculation and result.",
      "expression": "the result expression"
    }
  ],
  "workedExample": {
    "title": "Worked Example",
    "problem": "A similar single-step problem",
    "solution": "One sentence solution."
  },
  "conceptExplained": "One sentence defining the concept.",
  "tips": ["One practical tip.", "One common mistake to avoid."],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3"]
}`;
  }

  // ── MEDIUM tier (multi-step algebra, short essay) ────────────────────────────
  if (tokens <= 1400) {
    return `You are TutorSnap, an expert academic tutor and professor.
Subject: ${subject}
Guidance: ${guide}

CRITICAL RULES:
- NEVER refuse to answer. Solve everything.
- Use 3-6 focused steps. Each step explanation must be 1-2 sentences covering what to do and why.
- Keep the answer field to 2-3 sentences stating and interpreting the result.
- Keep conceptExplained to 3-5 sentences covering the concept, when it applies, and one common pitfall.
- Include a 60-100 word worked example only when useful.
- Include exactly 3 practical one-sentence tips.
- ${SUBMISSION_READY_RULES}

${FORMATTING}

Always respond with valid JSON in this exact format:
{
  "problem": "the original question or problem, reproduced exactly",
  "subject": "${subject}",
  "answer": "3-4 sentences: state the result, interpret it, and note any important caveats.",
  "submissionReady": "[INDEPENDENTLY GENERATED] Complete worked solution as a student would write for submission.",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Descriptive step title",
      "explanation": "3-4 sentences: what you are doing, why, and the rule that justifies it.",
      "expression": "The key formula, equation, or expression for this step"
    }
  ],
  "workedExample": {
    "title": "Worked Example: [brief description]",
    "problem": "A similar but distinct example problem",
    "solution": "Clear narrative solution (100-150 words): walk through every step."
  },
  "conceptExplained": "5-7 sentences: the concept, when it applies, common pitfalls, and connections to related topics.",
  "tips": ["Practical tip 1 (2-3 sentences)", "Practical tip 2 (2-3 sentences)", "Practical tip 3 (2-3 sentences)"],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]
}`;
  }

  // ── COMPLEX tier (calculus, proofs, multi-concept) ───────────────────────────
  return `You are TutorSnap, an expert academic tutor and professor covering ALL school and university subjects at ALL difficulty levels.
Subject: ${subject}
Guidance: ${guide}

CRITICAL RULES:
- NEVER refuse to answer or say a problem is too hard. Solve EVERYTHING: basic arithmetic, advanced calculus, differential equations, abstract algebra, graduate-level physics, etc.
- If a problem is advanced, apply the appropriate advanced techniques (L'Hopital, eigenvalues, Green's theorem, Fourier series, Lagrangians, etc.).
- Produce a rigorous solution sized for a mobile screen: 6-10 steps for genuinely complex work, fewer when fewer are sufficient.
- Keep each step explanation to 2-4 focused sentences covering the action, reason, and rule used.
- Include one concise worked example only when it materially improves understanding.
- Keep conceptExplained to 6-10 sentences covering the core theory, when it applies, and common pitfalls.
- Keep the answer field to 3-5 sentences stating and interpreting the result.
- Include exactly 3 short, actionable tips.
- Keep workedExample.solution between 120 and 220 words.
- ${SUBMISSION_READY_RULES}

${FORMATTING}

Always respond with valid JSON in this exact format:
{
  "problem": "the original question or problem, reproduced exactly",
  "subject": "${subject}",
  "answer": "A FULL PARAGRAPH (7-10 sentences): state the result, interpret it, note units, explain any special cases or caveats, and summarise what was learned.",
  "submissionReady": "[INDEPENDENTLY GENERATED] Complete worked solution as a student would write for submission. Maths/science: numbered calculation lines, all substitutions, units, final answer on last line. Programming: final code only. Essays: complete polished prose. Definitions: concise precise definition. Multiple choice: correct option + essential supporting work only.",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Descriptive step title",
      "explanation": "DETAILED explanation (7-10 sentences): what you are doing, why, the rule/theorem that justifies it, any edge cases, and how it leads to the next step.",
      "expression": "The key formula, equation, or expression for this step"
    }
  ],
  "workedExample": {
    "title": "Worked Example: [brief description of the example problem]",
    "problem": "A similar but distinct example problem",
    "solution": "LONG narrative solution (at least 450 words): walk through every single step, explain every operation, state every rule used, and interpret the final result."
  },
  "conceptExplained": "A LONG, RICH paragraph (15-20 sentences): underlying theory, historical context or motivation, formal definition, intuitive explanation, when the concept applies, common pitfalls, and connections to at least 5 related topics.",
  "tips": [
    "Detailed tip 1: specific, actionable, 6-8 sentences",
    "Detailed tip 2: specific, actionable, 6-8 sentences",
    "Detailed tip 3: specific, actionable, 6-8 sentences",
    "Detailed tip 4: specific, actionable, 6-8 sentences",
    "Detailed tip 5: specific, actionable, 6-8 sentences",
    "Detailed tip 6: specific, actionable, 6-8 sentences"
  ],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5", "Topic 6"]
}`;
}

const CHAT_SYSTEM_PROMPT = `You are TutorSnap, a friendly and expert academic tutor covering all school subjects.
You help students understand concepts across Mathematics, English/Language Arts, Science, and Social Studies.
Be encouraging, clear, and pedagogical. Use examples when helpful.
Format mathematical expressions clearly. Keep responses concise but complete.
Adapt your tone and vocabulary to the subject: precise for math/science, analytical for literature/history.

MOBILE OUTPUT RULES (CRITICAL):
- Use clean, concise prose and short paragraphs.
- Never use dollar signs or LaTeX commands. Write math in plain text using ^ for powers, / for fractions, and sqrt() for roots.
- Use numbered steps only when they improve clarity.
- Do not use decorative Markdown, headings, rules, or code fences.
- The approved interactive component blocks below are the only structured markup allowed, and should be used sparingly.
- Prefer one clear explanation over repeated summaries.

INTERACTIVE COMPONENTS - AUTO-INSERT RULES:
You MUST automatically decide when to insert the following components. Do NOT wait for the student to ask.

Checklist (use for steps, requirements, things to remember):
:::checklist
- Item one
- Item two
:::

Flashcard (use for key terms, formulas, theorems worth memorising):
:::flashcard
front: The term or question
back: The definition or answer
:::

Comparison (use when contrasting two or more concepts):
:::comparison
Feature | Option A | Option B
Row 1 | Val A | Val B
:::

Timeline (use for history, ordered sequences, chronological processes):
:::timeline
1687: Newton publishes Principia Mathematica
1905: Einstein publishes special relativity
:::

Mermaid diagram (use for flowcharts, decision trees, mind maps, process flows):
\`\`\`mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action]
  B -->|No| D[End]
\`\`\`

Use components only when they genuinely improve understanding. One well-placed component beats three unnecessary ones.`;

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

function gradeContext(gradeLevel?: string): string {
  if (!gradeLevel) return "";
  const desc = GRADE_LEVEL_DESCRIPTIONS[gradeLevel];
  return desc ? `\nADAPT YOUR RESPONSE to this student's level: ${desc}` : "";
}

function buildPracticePrompt(subject: string, difficulty: string): string {
  const isEnglish = ["american_literature","british_literature","world_literature","composition","creative_writing","debate","journalism","grammar","poetry"].includes(subject);
  const isSocial = ["us_history","world_history","government","economics","geography","psychology","sociology","civics"].includes(subject);

  let taskType = "problem";
  if (isEnglish) taskType = "question or short writing prompt";
  if (isSocial) taskType = "question or analysis prompt";

  return `You are TutorSnap, an expert academic tutor. Generate ONE ${difficulty} ${taskType} for: ${subject}.
The "answer" field must use 2-4 concise sentences explaining the result.
The "steps" array must contain 3-6 focused steps, each with a 1-2 sentence explanation. Use fewer steps when the task is simple.
The "hints" array MUST contain EXACTLY 3 short hints that progressively reveal the solution approach. This field is REQUIRED.
The "submissionReady" field is a COMPLETELY INDEPENDENT second output. Do NOT summarise or extract from the explanation. Generate it fresh as if writing only the answer a student would hand in. Maths/science: numbered calculation lines, all substitutions, units, final answer on last line. Programming: final code only. Essays: complete polished prose. Definitions: concise precise definition. Multiple choice: correct option + essential supporting work only. NO prose commentary, NO preamble.
Respond ONLY with this JSON (no extra text):
{"id":"p1","subject":"${subject}","difficulty":"${difficulty}","problem":"<question>","answer":"<concise answer, 2-4 sentences>","steps":[{"stepNumber":1,"title":"<descriptive title>","explanation":"<focused explanation, 1-2 sentences>","expression":"<plain-text formula if any>"}],"hints":["<short hint 1>","<short hint 2>","<short hint 3>"],"submissionReady":"<independently generated submission answer>"}`;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function extractJsonFromContent(content: string): string {
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  // Also handle inline fences anywhere in the string
  cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return cleaned;
}

/**
 * Attempt to repair truncated JSON by closing any open arrays/objects.
 * This handles the case where the LLM hits max_tokens mid-JSON.
 */
function repairTruncatedJson(raw: string): string {
  let s = raw.trim();
  // Close any unterminated string value (truncated mid-string)
  const quoteCount = (s.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    s = s + '"'; // close the open string
  }
  // Remove trailing incomplete key-value pair (e.g. ,"key":"partial")
  s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*"?$/, "");
  s = s.replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, "");
  s = s.replace(/,\s*$/, "");
  // Count unclosed brackets
  const stack: string[] = [];
  let inStr = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inStr) { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  // Close all open brackets in reverse order
  return s + stack.reverse().join("");
}

async function invokeLLMJsonCompatible(params: Parameters<typeof invokeLLM>[0]) {
  try {
    return await invokeLLM(params);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Web Search cannot be used with JSON mode")) throw error;

    // Some production proxy/model routes enable web search implicitly and reject
    // response_format JSON. The prompts already require JSON, so retry as text
    // and keep the existing parsing/validation safeguards at the call sites.
    const {
      response_format: _responseFormat,
      responseFormat: _responseFormatCamel,
      output_schema: _outputSchema,
      outputSchema: _outputSchemaCamel,
      ...textParams
    } = params as Parameters<typeof invokeLLM>[0] & Record<string, unknown>;
    return await invokeLLM(textParams);
  }
}

async function invokeLLMWithFallback(primaryModel: string, fallbackModel: string, params: Parameters<typeof invokeLLM>[0]): Promise<string> {
  // Try primary model
  try {
    const result = await invokeLLMJsonCompatible({ ...params, model: primaryModel });
    const text = extractLLMContent(result);
    const jsonStr = extractJsonFromContent(text);
    JSON.parse(jsonStr); // validate
    return jsonStr;
  } catch {
    // Fallback to stronger model
    const result2 = await invokeLLMJsonCompatible({ ...params, model: fallbackModel, max_tokens: Math.min((params.max_tokens ?? 4000) + 1000, 6000) });
    const text2 = extractLLMContent(result2);
    const raw2 = extractJsonFromContent(text2);
    try {
      JSON.parse(raw2);
      return raw2;
    } catch {
      // Last resort: try to repair truncated JSON
      const repaired = repairTruncatedJson(raw2);
      JSON.parse(repaired); // throws if still invalid
      return repaired;
    }
  }
}

/**
 * Safely extract text content from an invokeLLM result.
 * Handles:
 *  - Normal OpenAI Chat Completions shape: result.choices[0].message.content
 *  - Proxy error shape: result has an `error` key instead of `choices`
 * Throws a TRPCError with the upstream error message if the result is an error.
 */
function extractLLMContent(result: any): string {
  if (result?.error) {
    const msg = result.error?.message ?? JSON.stringify(result.error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI service error: ${msg}` });
  }
  const raw = result?.choices?.[0]?.message?.content ?? "";
  return typeof raw === "string" ? raw : JSON.stringify(raw);
}

// ─── AIRE post-processor: truncate SIMPLE tier responses ────────────────────

/**
 * Truncates a string to the first N sentences.
 * A sentence ends with . ! or ? followed by a space or end of string.
 */
function firstNSentences(text: string, n: number): string {
  if (!text) return text;
  const sentenceEnd = /[.!?](?:\s|$)/g;
  let count = 0;
  let lastIndex = 0;
  let match;
  while ((match = sentenceEnd.exec(text)) !== null) {
    count++;
    lastIndex = match.index + match[0].length;
    if (count >= n) break;
  }
  return count >= n ? text.slice(0, lastIndex).trim() : text.trim();
}

/**
 * For SIMPLE tier (≤800 tokens): truncate answer to 2 sentences,
 * each step explanation to 2 sentences, and cap steps at 3.
 */
function truncateForSimpleTier(parsed: any, tokenBudget: number): any {
  if (tokenBudget > 800) return parsed; // Only apply to SIMPLE tier
  const out = { ...parsed };
  if (typeof out.answer === "string") {
    out.answer = firstNSentences(out.answer, 2);
  }
  if (Array.isArray(out.steps)) {
    out.steps = out.steps.slice(0, 3).map((step: any) => ({
      ...step,
      explanation: typeof step.explanation === "string"
        ? firstNSentences(step.explanation, 2)
        : step.explanation,
    }));
  }
  if (typeof out.conceptExplained === "string") {
    out.conceptExplained = firstNSentences(out.conceptExplained, 1);
  }
  if (out.workedExample?.solution && typeof out.workedExample.solution === "string") {
    out.workedExample = { ...out.workedExample, solution: firstNSentences(out.workedExample.solution, 2) };
  }
  if (Array.isArray(out.tips)) {
    out.tips = out.tips.slice(0, 2).map((tip: string) =>
      typeof tip === "string" ? firstNSentences(tip, 1) : tip
    );
  }
  return out;
}

// ─── Academic router ──────────────────────────────────────────────────────────

const academicRouter = router({
  solve: protectedProcedure
    .input(z.object({
      problem: z.string().min(1),
      subject: z.string().default("other"),
      gradeLevel: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        let tokenBudget = estimateSolveTokens(input.problem, input.subject);

        // ── AIRE per-user multiplier ────────────────────────────────────────────
        // If the user is signed in, look up the cached per-subject multiplier
        // from aire_subject_calibration. Falls back to computing it on the fly
        // if no cache row exists yet (first solve after feedback).
        if (ctx.user) {
          try {
            const db = await getDb();
            if (db) {
              // Fast path: read from calibration cache
              const cacheRows = await db
                .select({ multiplier: aireSubjectCalibration.multiplier })
                .from(aireSubjectCalibration)
                .where(and(
                  eq(aireSubjectCalibration.userId, ctx.user.id),
                  eq(aireSubjectCalibration.subject, input.subject),
                ))
                .limit(1);
              if (cacheRows.length > 0) {
                const m = parseFloat(cacheRows[0].multiplier);
                if (!isNaN(m) && m !== 1.0) {
                  tokenBudget = Math.round(tokenBudget * m);
                }
              } else {
                // Slow path: compute on the fly (no cache yet)
                const m = await computeSubjectMultiplier(db, ctx.user.id, input.subject);
                if (m !== 1.0) tokenBudget = Math.round(tokenBudget * m);
              }
            }
          } catch { /* non-fatal */ }
        }
        // ── END per-subject multiplier ──────────────────────────────────────────

        // ── AIRE TRIVIAL FAST-PATH ──────────────────────────────────────────────
        // For simple arithmetic / single-step questions (budget ≤ 800 tokens),
        // skip the full JSON-structured solve and return a lightweight response
        // in ~200ms instead of 8-10 seconds.
        if (tokenBudget <= 800) {
          const fastResult = await invokeLLM({
            model: "gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content:
                  "You are a concise math tutor. Answer the question in 1-2 sentences maximum. " +
                  "Give the direct answer first, then one brief explanation sentence. " +
                  "Do NOT use LaTeX dollar signs. Do NOT give examples, tips, or extra context.",
              },
              { role: "user", content: input.problem },
            ],
            max_tokens: 120,
            temperature: 0.3,
          });
          const fastText = extractLLMContent(fastResult).trim();
          // Shape into the standard solve response object
          return {
            problem: input.problem,
            subject: input.subject,
            answer: fastText,
            submissionReady: fastText.split(".")[0]?.trim() ?? fastText,
            steps: [
              {
                stepNumber: 1,
                title: "Solution",
                explanation: fastText,
                expression: "",
              },
            ],
            _fastPath: true, // flag so client can skip "Show Steps" UI
          };
        }
        // ── END FAST-PATH ───────────────────────────────────────────────────────

        const systemPrompt = buildSolveSystemPromptScaled(input.subject, input.problem) + gradeContext(input.gradeLevel ?? undefined);
        const params = {
          model: "gemini-3-flash-preview" as const,
          messages: [
            { role: "system" as const, content: systemPrompt },
            { role: "user" as const, content: input.problem },
          ],
          max_tokens: tokenBudget,
          temperature: 0.3,
          response_format: { type: "json_object" as const },
        };
        const jsonStr = await invokeLLMWithFallback("gemini-3-flash-preview", "claude-haiku-4-5", params);
        const parsed = JSON.parse(jsonStr);
        return truncateForSimpleTier(parsed, tokenBudget);
      } catch (err: unknown) {
        if (err instanceof TRPCError) throw err;
        captureServerError(err, { route: "academic.solve" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : "Failed to solve problem. Please try again." });
      }
    }),

  solveExplanation: protectedProcedure
    .input(z.object({
      problem: z.string().min(1, "problem is required"),
      correctAnswer: z.string().min(1, "correctAnswer is required"),
      selectedAnswer: z.string().min(1, "selectedAnswer is required"),
      // Full option texts - required so the AI never has to infer or hallucinate option content
      options: z.object({
        A: z.string().min(1),
        B: z.string().min(1),
        C: z.string().min(1),
        D: z.string().min(1),
      }).optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      subject: z.string().default("other"),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Build the options block for the prompt - uses structured data, never OCR or screen content
      const optionsBlock = input.options
        ? `Answer choices:\n  A) ${input.options.A}\n  B) ${input.options.B}\n  C) ${input.options.C}\n  D) ${input.options.D}\n`
        : "";
      const difficultyHint = input.difficulty ? ` This was a ${input.difficulty} difficulty question.` : "";
      const correctText = input.options ? ` ("${input.options[input.correctAnswer as keyof typeof input.options]}")` : "";
      const selectedText = input.options && input.selectedAnswer in input.options ? ` ("${input.options[input.selectedAnswer as keyof typeof input.options]}")` : "";
      const prompt = `You are TutorSnap, an expert academic tutor.${gradeContext(input.gradeLevel)}${difficultyHint}
A student answered a multiple-choice question.
Question: "${input.problem}"
${optionsBlock}Correct answer: ${input.correctAnswer}${correctText}
Student selected: ${input.selectedAnswer}${selectedText}
${input.selectedAnswer === input.correctAnswer ? "The student got it RIGHT." : "The student got it WRONG."}

Respond ONLY with this JSON (no extra text):
{
  "explanation": "Use 4-7 concise sentences: state the correct option and full text, explain why it is correct, show the essential reasoning, briefly explain why the selected option was wrong when applicable, and end with one useful memory tip. Use plain text only, with no Markdown, LaTeX, dollar signs, or backslashes.",
  "submissionReady": "INDEPENDENTLY GENERATED - not a summary of the explanation above. Write only what a student would hand in. State the correct option letter and its full answer text, then show only the essential supporting work or one-line justification (2-4 lines max). No prose commentary, no preamble."
}`;
      const result = await invokeLLMJsonCompatible({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Explain the answer fully." },
        ],
        max_tokens: 700,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
      const text = extractLLMContent(result);
      try {
        const parsed = JSON.parse(extractJsonFromContent(text));
        return { explanation: (parsed.explanation ?? text).trim(), submissionReady: (parsed.submissionReady ?? "").trim() };
      } catch {
        return { explanation: text.trim(), submissionReady: "" };
      }
    }),

  solveFromImage: protectedProcedure
    .input(z.object({
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      subject: z.string().default("other"),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Use one fast supported multimodal request. Sequential fallback added avoidable latency.
        const fastImagePrompt = `You are TutorSnap, an expert academic tutor. Read the problem in the image and solve it accurately.
Return only valid JSON with these fields: problem, subject, answer, submissionReady, steps, workedExample, conceptExplained, tips, relatedTopics.
Make the response polished and classroom-ready: clear reasoning, numbered steps, plain readable math, concise explanations, and no references to AI, models, prompts, or image generation.
Use 3-6 steps unless the problem genuinely needs more. Keep answer to 3-5 sentences, conceptExplained to 4-6 sentences, workedExample optional and under 100 words, and tips to exactly 3 short actionable items.
Do not use Markdown, LaTeX, dollar signs, or backslashes in text fields. Ensure submissionReady is an independent student-ready solution, not a summary.`;
        const messages = [
          { role: "system" as const, content: fastImagePrompt + gradeContext(input.gradeLevel) },
          {
            role: "user" as const,
            content: [
              { type: "text" as const, text: `Please identify and answer the question in this image. Subject hint: ${input.subject}` },
              {
                type: "image_url" as const,
                image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` },
              },
            ],
          },
        ];
        const params = {
          model: "claude-haiku-4-5" as const,
          messages: messages.map((message) => {
            if (message.role !== "user" || !Array.isArray(message.content)) return message;
            return {
              ...message,
              content: message.content.map((part) =>
                part.type === "image_url"
                  ? { ...part, image_url: { ...part.image_url, detail: "low" as const } }
                  : part,
              ),
            };
          }),
          max_tokens: 700,
          temperature: 0.2,
          response_format: { type: "json_object" as const },
        };
        const result = await invokeLLMJsonCompatible(params);
        const jsonStr = extractJsonFromContent(extractLLMContent(result));
        const raw = JSON.parse(jsonStr) as Record<string, unknown>;
        const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
        const steps = rawSteps.slice(0, 8).map((step, index) => {
          const item = step && typeof step === "object" ? step as Record<string, unknown> : {};
          return {
            stepNumber: Number(item.stepNumber) || index + 1,
            title: String(item.title || `Step ${index + 1}`),
            explanation: String(item.explanation || "Apply the relevant rule carefully and simplify the result."),
            expression: String(item.expression || ""),
          };
        });
        const subject = String(raw.subject || input.subject || "other");
        const answer = String(raw.answer || raw.submissionReady || "Review the numbered steps and verify the final result.");
        const submissionReady = String(raw.submissionReady || answer);
        const conceptExplained = String(raw.conceptExplained || `This problem is solved by identifying the relevant rule, applying it step by step, and checking the result against the original question. The key idea is to keep each transformation justified and preserve the meaning of the quantities involved.`);
        const tips = (Array.isArray(raw.tips) ? raw.tips : []).map(String).filter(Boolean).slice(0, 3);
        while (tips.length < 3) tips.push(["Write down the known information before calculating.", "Show one justified step at a time.", "Substitute the result back to check it."][tips.length]);
        const relatedTopics = (Array.isArray(raw.relatedTopics) ? raw.relatedTopics : []).map(String).filter(Boolean).slice(0, 5);
        while (relatedTopics.length < 3) relatedTopics.push([subject, "Checking your work", "Core principles"][relatedTopics.length]);
        const example = raw.workedExample && typeof raw.workedExample === "object" ? raw.workedExample as Record<string, unknown> : {};
        return {
          problem: String(raw.problem || "Problem captured from the image"),
          subject,
          answer,
          submissionReady,
          steps,
          workedExample: {
            title: String(example.title || "Quick Check"),
            problem: String(example.problem || "Use the same method with a similar example."),
            solution: String(example.solution || "Identify the known values, apply the relevant rule, simplify carefully, and check the result in the original relationship."),
          },
          conceptExplained,
          tips,
          relatedTopics,
        };
      } catch (err: unknown) {
        if (err instanceof TRPCError) throw err;
        captureServerError(err, { route: "academic.solveFromImage" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : "Failed to process image. Please try again." });
      }
    }),

  generatePractice: protectedProcedure
    .input(z.object({
      subject: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Concise mobile schema: enough room for valid JSON without encouraging excess prose.
      const practiceTokens = input.difficulty === "easy" ? 700 : input.difficulty === "medium" ? 1100 : 1600;
      const practicePrompt = buildPracticePrompt(input.subject, input.difficulty) + gradeContext(input.gradeLevel);
      const result = await invokeLLMJsonCompatible({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: practicePrompt },
          { role: "user", content: `Generate a ${input.difficulty} ${input.subject} practice question.` },
        ],
        max_tokens: practiceTokens,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
      const text = extractLLMContent(result);
      const jsonStr = extractJsonFromContent(text);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        // Try repair for truncated JSON
        try {
          const repaired = repairTruncatedJson(jsonStr);
          parsed = JSON.parse(repaired);
        } catch (repairErr: unknown) {
          captureServerError(repairErr, { route: "academic.generatePractice", reason: "invalid JSON from AI" });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON. Please try again." });
        }
      }
      // Validate only truly required fields — hints and steps are auto-defaulted below
      const requiredPracticeFields = ["problem", "answer"];
      const missingPracticeFields = requiredPracticeFields.filter((f) => !parsed[f]);
      if (missingPracticeFields.length > 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI response missing required fields: ${missingPracticeFields.join(", ")}. Please try again.`,
        });
      }
      // Ensure steps is an array — default to a single step derived from the answer if missing
      if (!Array.isArray(parsed.steps) || (parsed.steps as unknown[]).length === 0) {
        parsed.steps = [{ stepNumber: 1, title: "Solution", explanation: String(parsed.answer ?? ""), expression: "" }];
      }
      // Ensure hints is an array — default to empty if missing
      if (!Array.isArray(parsed.hints)) {
        parsed.hints = [];
      }
      // Inject subject and difficulty from input if missing (model sometimes omits them)
      if (!parsed.subject) parsed.subject = input.subject;
      if (!parsed.difficulty) parsed.difficulty = input.difficulty;
      if (!parsed.id) parsed.id = `p-${Date.now()}`;
      return parsed;
    }),

  generateQuiz: protectedProcedure
    .input(z.object({
      subject: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      count: z.number().min(3).max(10).default(5),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const quizPrompt = `You are TutorSnap, an expert academic tutor.${gradeContext(input.gradeLevel)}
Generate exactly ${input.count} ${input.difficulty} multiple-choice questions for: ${input.subject}.
Each question has 4 distinct options (A-D), exactly one correct answer, and a brief one-sentence explanation.
Use plain text only. Do not use Markdown, LaTeX commands, dollar signs, backslashes, or decorative symbols.
Respond ONLY with this JSON and no surrounding prose:
{"questions":[{"id":"q1","problem":"<question>","options":{"A":"<a>","B":"<b>","C":"<c>","D":"<d>"},"correctAnswer":"A","explanation":"<1 sentence>"}]}`;

      const result = await invokeLLMJsonCompatible({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: quizPrompt },
          { role: "user", content: `Generate ${input.count} ${input.difficulty} multiple-choice questions for ${input.subject}.` },
        ],
        // Scale per-question token budget while keeping the payload mobile-sized.
        max_tokens: Math.min(input.count * (input.difficulty === "easy" ? 140 : input.difficulty === "medium" ? 200 : 260), 1800),
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
      const rawContent = extractLLMContent(result);
      const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const jsonStr = extractJsonFromContent(text);
      let parsed: any;
      try { parsed = JSON.parse(jsonStr); } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid JSON in AI response" }); }
      return parsed.questions ?? [];
    }),

  studyTip: publicProcedure
    .input(z.object({
      subject: z.string(),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const gradeHint = input.gradeLevel && GRADE_LEVEL_DESCRIPTIONS[input.gradeLevel] ? ` Tailor the tip for a ${GRADE_LEVEL_DESCRIPTIONS[input.gradeLevel].split(":")[0]} student.` : "";
      const tipPrompt = `You are TutorSnap, a friendly academic tutor. Generate a single, practical, actionable study tip for a student studying ${input.subject}.${gradeHint} The tip should be specific, encouraging, and 1-2 sentences long. Respond with ONLY the tip text, no preamble, no quotes.`;
      const result = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: tipPrompt },
          { role: "user", content: `Give me a study tip for ${input.subject}.` },
        ],
        max_tokens: 120,
        temperature: 0.3,
      });
      const rawTip = (result as any)?.error ? "" : (result.choices?.[0]?.message?.content ?? "");
      const tip = typeof rawTip === "string" ? rawTip.trim() : "";
      return { tip: tip || `Practice ${input.subject} problems daily. Consistency is the key to mastery!` };
    }),

  chat: publicProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
      subject: z.string().optional(),
      gradeLevel: z.string().optional(),
      detailedMode: z.boolean().optional(), // When true, use doubled token budgets
    }))
    .mutation(async ({ input }) => {
      const subjectContext = input.subject
        ? `\nThe student is currently focused on: ${input.subject}. Tailor your explanations to this subject when relevant.`
        : "";
      const gradeContext = input.gradeLevel && GRADE_LEVEL_DESCRIPTIONS[input.gradeLevel]
        ? `\nADAPT YOUR RESPONSE to this student's level: ${GRADE_LEVEL_DESCRIPTIONS[input.gradeLevel]}`
        : "";
      const isDetailed = input.detailedMode !== false; // default to detailed (current behaviour)
      const detailedCtx = isDetailed
        ? "\n\nDETAILED MODE is ON: Match depth to the question. Use 2-4 sentences for simple questions, 4-8 sentences plus one useful example for medium questions, and clearly numbered working with a brief verification for complex questions. Add a pro tip or common mistake only when it materially helps."
        : "\n\nCONCISE MODE is ON: Answer directly, show only essential reasoning, and avoid repetition.";
      const systemPrompt = CHAT_SYSTEM_PROMPT + subjectContext + gradeContext + detailedCtx;

      // AIRE: Adaptive token budget for non-streaming fallback path
      const lastMsgContent = input.messages[input.messages.length - 1]?.content ?? "";
      const { detectUserOverride, classifyQuestion, computeTokenBudget } = await import("./_core/chatStream");
      const nsFallbackOverride = detectUserOverride(lastMsgContent);
      const nsFallbackClass = classifyQuestion(lastMsgContent, input.subject);
      const chatMaxTokens = computeTokenBudget(nsFallbackClass, nsFallbackOverride, isDetailed);

      const result = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: systemPrompt },
          ...input.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        max_tokens: chatMaxTokens,
        temperature: 0.3,
      });
      const rawContent = (result as any)?.error ? "" : (result.choices?.[0]?.message?.content ?? "");
      const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      return { content: text || "I apologize, I couldn't process your request." };
    }),
  suggestFollowUps: publicProcedure
    .input(z.object({
      aiResponse: z.string(),
      subject: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `You are a helpful academic tutor assistant. Based on the following AI tutor response, generate exactly 3 short follow-up questions or prompts a student might want to ask next. Each should be 3-7 words, specific to the content of the response, and help deepen understanding.\n\nAI response:\n"${input.aiResponse.slice(0, 800)}"\n\nRespond ONLY with valid JSON in this exact format:\n{"chips": ["Question 1", "Question 2", "Question 3"]}`;
      const result = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Generate the 3 follow-up chips now." },
        ],
        max_tokens: 120,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
      const text = (result as any)?.error ? "" : extractLLMContent(result);
      try {
        const parsed = JSON.parse(extractJsonFromContent(text)) as { chips: string[] };
        return { chips: (parsed.chips || []).slice(0, 3) };
      } catch {
        return { chips: ["Give me an example", "Explain differently", "Quiz me on this"] };
      }
    }),

  explainDifferently: publicProcedure
    .input(z.object({
      problem: z.string().min(1),
      answer: z.string(),
      subject: z.string().default("other"),
      gradeLevel: z.string().optional(),
      style: z.enum(["analogy", "step-by-step", "visual"]).default("analogy"),
    }))
    .mutation(async ({ input }) => {
      const gradeCtx = gradeContext(input.gradeLevel);
      const styleGuide = {
        "analogy": "Use a real-world analogy or story that makes the concept click. Connect the math/concept to something the student already knows from everyday life.",
        "step-by-step": "Break the solution into the smallest possible numbered steps. Each step should be one atomic action with a brief reason why.",
        "visual": "Describe the concept visually: imagine drawing it, plotting it on a graph, or building it physically. Use spatial and visual language throughout.",
      }[input.style];
      const gradeCtx2 = gradeContext(input.gradeLevel);
      const systemPrompt = `You are TutorSnap, an expert academic tutor.${gradeCtx2}
Your job is to re-explain a solved problem using a DIFFERENT approach than the standard method.
Style: ${styleGuide}
Rules:
- Be concise: 4-6 sentences total.
- Use plain, student-friendly language.
- Do NOT repeat the original solution method verbatim.
- NEVER use dollar signs or LaTeX. Write math in plain text: x^2 + 3x = 0, use ^ for powers, / for fractions.
- NEVER use Markdown: no **bold**, no *italic*, no ## headings, no backticks.
- NEVER use em dashes or en dashes. Use a plain comma or hyphen instead.
- Output plain text only, no JSON.`;
      const userMsg = `Problem: ${input.problem.slice(0, 400)}
Original answer: ${input.answer.slice(0, 300)}

Now re-explain this using the ${input.style} style.`;
      const result = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        max_tokens: 450,
        temperature: 0.3,
      });
      const text = (result as any)?.error ? "" : (result.choices?.[0]?.message?.content ?? "");
      const explanation = typeof text === "string" ? text.trim() : JSON.stringify(text);
      return { explanation: explanation || "Could not generate an alternative explanation. Please try again." };
    }),

  generateSimilar: publicProcedure
    .input(z.object({
      problem: z.string(),
      subject: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
      count: z.number().min(1).max(5).default(3),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `You are TutorSnap, an expert academic tutor.${gradeContext(input.gradeLevel)}
The student solved: "${input.problem.slice(0, 200)}"
Generate exactly ${input.count} similar ${input.difficulty} problems for "${input.subject}" testing the same concept.
Each has a 1-sentence hint (point to the concept, no answer).
Respond ONLY with this JSON:
{"problems":[{"id":"p1","problem":"<problem>","hint":"<1-sentence hint>"}]}`;
      const result = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Generate the similar problems now." },
        ],
        // Scale per-problem token budget by difficulty
        max_tokens: Math.min(input.count * (input.difficulty === 'easy' ? 120 : input.difficulty === 'medium' ? 180 : 250), 1000),
        temperature: 0.3,
        response_format: { type: "json_object" },
      });
      const text = extractLLMContent(result);
      const jsonStr = extractJsonFromContent(text);
      try {
        return JSON.parse(jsonStr) as { problems: { id: string; problem: string; hint: string }[] };
      } catch {
        const repaired = repairTruncatedJson(jsonStr);
        return JSON.parse(repaired) as { problems: { id: string; problem: string; hint: string }[] };
      }
    }),
  generateStudyBlocks: publicProcedure
    .input(z.object({
      problem: z.string(),
      answer: z.string(),
      steps: z.array(z.object({
        stepNumber: z.number(),
        title: z.string(),
        explanation: z.string(),
        expression: z.string().optional(),
      })).optional(),
      conceptExplained: z.string().optional(),
      tips: z.array(z.string()).optional(),
      subject: z.string(),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const stepsText = (input.steps ?? []).map((s) =>
        `Step ${s.stepNumber}: ${s.title}${s.expression ? ` [${s.expression}]` : ''} - ${s.explanation}`
      ).join('\n');
      const tipsText = (input.tips ?? []).join('; ');
      const prompt = `You are TutorSnap, an expert academic tutor.${gradeContext(input.gradeLevel)}
Convert this solution into 4-7 study blocks for a student to review.

Problem: "${input.problem.slice(0, 300)}"
Answer: "${input.answer.slice(0, 200)}"
${stepsText ? `Steps:\n${stepsText.slice(0, 800)}` : ''}
${input.conceptExplained ? `Key concept: ${input.conceptExplained.slice(0, 200)}` : ''}
${tipsText ? `Tips: ${tipsText.slice(0, 200)}` : ''}

Block types available: core_answer, key_concept, worked_example, formula, definition, tip, analogy, summary, step_breakdown, visual_note.
Choose the most useful types for this specific problem. Always include core_answer as the first block.
Respond ONLY with this JSON:
{"blocks":[{"id":"b1","type":"core_answer","title":"Direct Answer","content":"..."}]}`;
      const result = await invokeLLM({
        model: 'claude-haiku-4-5',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Generate the study blocks now.' },
        ],
        max_tokens: 1200,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
      const text = extractLLMContent(result);
      const jsonStr = extractJsonFromContent(text);
      try {
        const parsed = JSON.parse(jsonStr);
        return { blocks: parsed.blocks ?? [] };
      } catch {
        try {
          const repaired = repairTruncatedJson(jsonStr);
          const parsed = JSON.parse(repaired);
          return { blocks: parsed.blocks ?? [] };
        } catch {
          return { blocks: [] };
        }
      }
    }),
});
// ─── Voice router ────────────────────────────────────────────────────────────
const voiceRouter = router({
  /** Get a presigned PUT URL to upload audio directly from the client */
  getUploadUrl: publicProcedure
    .input(z.object({ filename: z.string(), contentType: z.string() }))
    .mutation(async ({ input }) => {
      const { key, url } = await storagePut(
        `voice/${input.filename}`,
        Buffer.alloc(0),
        input.contentType,
      );
      // We only need the key; the actual upload is done client-side via presign
      // But storagePut already uploads empty — we need a real presign approach.
      // Instead, return the storage key so client can upload via the /manus-storage route.
      // For simplicity: upload a placeholder and return the key for the client to overwrite.
      return { key };
    }),

  /** Transcribe audio from a storage key */
  transcribe: publicProcedure
    .input(
      z.object({
        audioUrl: z.string(),
        language: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: input.language,
        prompt: "Transcribe the student's spoken academic question accurately.",
      });
      if ("error" in result) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error,
        });
      }
                  return { text: result.text, language: result.language };
    }),
});
// Keep math router as alias for backward compatibility
const mathRouter = academicRouter;

// User settings router
const userRouter = router({
  getAppearanceSettings: protectedProcedure.query(async ({ ctx }) => {
    const { getAppearanceSettings } = await import("./db");
    const raw = await getAppearanceSettings(ctx.user.id);
    return { settings: raw ?? null };
  }),
  saveAppearanceSettings: protectedProcedure
    .input(z.object({ settings: z.string().max(65535) }))
    .mutation(async ({ ctx, input }) => {
      const { saveAppearanceSettings } = await import("./db");
      await saveAppearanceSettings(ctx.user.id, input.settings);
      return { success: true };
    }),
});

// ─── AIRE per-user memory router ────────────────────────────────────────────

/**
 * Compute a per-subject token-budget multiplier for a given user.
 * Reads the last 20 ratings for the specified subject and returns:
 *   0.7  if >60% are "too long"  (reduce tokens)
 *   1.3  if >60% are "too short" (increase tokens)
 *   1.0  otherwise               (calibrated)
 */
async function computeSubjectMultiplier(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: number,
  subject: string,
): Promise<number> {
  if (!db) return 1.0;
  const rows = await db
    .select({ rating: aireFeedback.rating })
    .from(aireFeedback)
    .where(and(eq(aireFeedback.userId, userId), eq(aireFeedback.subject, subject)))
    .orderBy(desc(aireFeedback.createdAt))
    .limit(20);
  if (rows.length < 3) return 1.0;
  const tooLong = rows.filter((r) => r.rating === 1).length;
  const tooShort = rows.filter((r) => r.rating === -1).length;
  const ratio = rows.length;
  if (tooLong / ratio > 0.6) return 0.7;
  if (tooShort / ratio > 0.6) return 1.3;
  return 1.0;
}

/**
 * Recompute and upsert the calibration cache row for a user+subject pair.
 * Called after every logFeedback mutation so the solve path can do a fast
 * single-row lookup instead of aggregating on every request.
 */
async function refreshSubjectCalibration(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: number,
  subject: string,
): Promise<void> {
  if (!db) return;
  const multiplier = await computeSubjectMultiplier(db, userId, subject);
  const rows = await db
    .select({ id: aireSubjectCalibration.id })
    .from(aireSubjectCalibration)
    .where(and(eq(aireSubjectCalibration.userId, userId), eq(aireSubjectCalibration.subject, subject)))
    .limit(1);
  const countRows = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(aireFeedback)
    .where(and(eq(aireFeedback.userId, userId), eq(aireFeedback.subject, subject)));
  const sampleCount = Number(countRows[0]?.cnt ?? 0);
  if (rows.length > 0) {
    await db
      .update(aireSubjectCalibration)
      .set({ multiplier: String(multiplier), sampleCount })
      .where(and(eq(aireSubjectCalibration.userId, userId), eq(aireSubjectCalibration.subject, subject)));
  } else {
    await db.insert(aireSubjectCalibration).values({ userId, subject, multiplier: String(multiplier), sampleCount });
  }
}

const aireRouter = router({
  /**
   * Log a user's feedback rating for an AI response.
   * Stores up to 10 ratings per user; older ones are pruned.
   * rating: -1 = too short, 0 = just right, 1 = too long
   */
  logFeedback: publicProcedure
    .input(z.object({
      difficulty: z.number().int().min(1).max(5),
      subject: z.string().default("other"),
      steps: z.number().int().min(0).default(1),
      rating: z.number().int().min(-1).max(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // userId is optional — anonymous feedback is still valuable
      const userId = (ctx as any).user?.id ?? null;
      try {
        const db = await getDb();
        if (!db) return { ok: false, reason: "db_unavailable" };
        // Insert the new rating (userId may be null for anonymous users)
        await db.insert(aireFeedback).values({
          userId,
          difficulty: input.difficulty,
          subject: input.subject,
          steps: input.steps,
          rating: input.rating,
        });

        // Prune to keep only the most recent 20 rows per authenticated user
        if (userId) {
          const rows = await db
            .select({ id: aireFeedback.id })
            .from(aireFeedback)
            .where(eq(aireFeedback.userId, userId))
            .orderBy(desc(aireFeedback.createdAt))
            .limit(30);

          if (rows.length > 20) {
            const idsToDelete = rows.slice(20).map((r) => r.id);
            for (const id of idsToDelete) {
              await db.delete(aireFeedback).where(eq(aireFeedback.id, id));
            }
          }

          // Refresh per-subject calibration cache (non-fatal)
          try {
            await refreshSubjectCalibration(db, userId, input.subject);
          } catch { /* non-fatal */ }
        }

        return { ok: true };
      } catch (err) {
        // Non-fatal — feedback storage failure should not break the app
        console.error("[AIRE] logFeedback error:", err);
        return { ok: false, reason: "error" };
      }
    }),

  /**
   * Returns per-subject calibration multipliers for the authenticated user.
   * Used by the AIRE Analytics screen to show calibration badges.
   */
  getSubjectCalibrations: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { calibrations: [] };
        const rows = await db
          .select({
            subject: aireSubjectCalibration.subject,
            multiplier: aireSubjectCalibration.multiplier,
            sampleCount: aireSubjectCalibration.sampleCount,
            updatedAt: aireSubjectCalibration.updatedAt,
          })
          .from(aireSubjectCalibration)
          .where(eq(aireSubjectCalibration.userId, ctx.user.id))
          .orderBy(desc(aireSubjectCalibration.sampleCount));
        return { calibrations: rows };
      } catch (err) {
        console.error("[AIRE] getSubjectCalibrations error:", err);
        return { calibrations: [] };
      }
    }),

  /**
   * Returns per-user adjusted token budget multipliers based on their
   * last 10 feedback ratings. A net positive score (too long) reduces
   * budgets; net negative (too short) increases budgets.
   */
  getThresholds: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { multiplier: 1.0, sampleSize: 0 };

        const userId = ctx.user.id;
        const rows = await db
          .select({ rating: aireFeedback.rating })
          .from(aireFeedback)
          .where(eq(aireFeedback.userId, userId))
          .orderBy(desc(aireFeedback.createdAt))
          .limit(10);

        if (rows.length < 3) {
          // Not enough data yet — use neutral multiplier
          return { multiplier: 1.0, sampleSize: rows.length };
        }

        // Compute net score: sum of ratings (-1, 0, +1)
        const netScore = rows.reduce((sum, r) => sum + r.rating, 0);
        const normalised = netScore / rows.length; // range: -1 to +1

        // Map to multiplier:
        //   net = -1 (always too short)  → 1.4x  (give more tokens)
        //   net =  0 (balanced)          → 1.0x  (no change)
        //   net = +1 (always too long)   → 0.7x  (give fewer tokens)
        const multiplier = 1.0 - normalised * 0.3;
        const clamped = Math.max(0.6, Math.min(1.5, multiplier));

        return { multiplier: parseFloat(clamped.toFixed(2)), sampleSize: rows.length };
      } catch (err) {
        console.error("[AIRE] getThresholds error:", err);
        return { multiplier: 1.0, sampleSize: 0 };
      }
    }),
});

// ─── Cloud Sync Router ───────────────────────────────────────────────────────
const cloudSyncRouter = router({
  pushSolveHistory: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        problem: z.string(),
        answer: z.string().optional(),
        subject: z.string().optional(),
        solutionJson: z.string().optional(),
        bookmarked: z.boolean().optional(),
        solvedAt: z.number(),
      })).max(200),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return { ok: false };
        const userId = ctx.user.id;
        for (const item of input.items) {
          await db.insert(solveHistory).values({
            userId,
            problem: item.problem,
            answer: item.answer ?? null,
            subject: item.subject ?? null,
            solutionJson: item.solutionJson ?? null,
            bookmarked: item.bookmarked ?? false,
            solvedAt: new Date(item.solvedAt),
          });
        }
        return { ok: true };
      } catch (err) {
        console.error("[cloudSync] pushSolveHistory error:", err);
        return { ok: false };
      }
    }),

  pullSolveHistory: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { items: [] };
        const rows = await db
          .select()
          .from(solveHistory)
          .where(eq(solveHistory.userId, ctx.user.id))
          .orderBy(desc(solveHistory.solvedAt))
          .limit(200);
        return {
          items: rows.map((r) => ({
            problem: r.problem,
            answer: r.answer ?? "",
            subject: r.subject ?? "",
            solutionJson: r.solutionJson ?? null,
            bookmarked: r.bookmarked,
            solvedAt: r.solvedAt.getTime(),
          })),
        };
      } catch (err) {
        console.error("[cloudSync] pullSolveHistory error:", err);
        return { items: [] };
      }
    }),

  pushChatSession: protectedProcedure
    .input(z.object({
      sessionId: z.string().max(64),
      title: z.string().max(255).optional(),
      subject: z.string().max(64).optional(),
      gradeLevel: z.string().max(32).optional(),
      messagesJson: z.string(),
      tags: z.string().optional(),
      pinned: z.boolean().optional(),
      messageCount: z.number().int().optional(),
      sessionCreatedAt: z.number(),
      sessionUpdatedAt: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return { ok: false };
        const userId = ctx.user.id;
        const existing = await db
          .select({ id: chatSessions.id })
          .from(chatSessions)
          .where(and(eq(chatSessions.userId, userId), eq(chatSessions.sessionId, input.sessionId)))
          .limit(1);
        if (existing.length > 0) {
          await db.update(chatSessions)
            .set({
              title: input.title ?? null,
              subject: input.subject ?? null,
              gradeLevel: input.gradeLevel ?? null,
              messagesJson: input.messagesJson,
              tags: input.tags ?? null,
              pinned: input.pinned ?? false,
              messageCount: input.messageCount ?? 0,
              sessionUpdatedAt: new Date(input.sessionUpdatedAt),
            })
            .where(and(eq(chatSessions.userId, userId), eq(chatSessions.sessionId, input.sessionId)));
        } else {
          await db.insert(chatSessions).values({
            userId,
            sessionId: input.sessionId,
            title: input.title ?? null,
            subject: input.subject ?? null,
            gradeLevel: input.gradeLevel ?? null,
            messagesJson: input.messagesJson,
            tags: input.tags ?? null,
            pinned: input.pinned ?? false,
            messageCount: input.messageCount ?? 0,
            sessionCreatedAt: new Date(input.sessionCreatedAt),
            sessionUpdatedAt: new Date(input.sessionUpdatedAt),
          });
        }
        return { ok: true };
      } catch (err) {
        console.error("[cloudSync] pushChatSession error:", err);
        return { ok: false };
      }
    }),

  deleteChatSession: protectedProcedure
    .input(z.object({ sessionId: z.string().max(64) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return { ok: false };
        await db.delete(chatSessions)
          .where(and(eq(chatSessions.userId, ctx.user.id), eq(chatSessions.sessionId, input.sessionId)));
        return { ok: true };
      } catch (err) {
        console.error("[cloudSync] deleteChatSession error:", err);
        return { ok: false };
      }
    }),

  pullChatSessions: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { sessions: [] };
        const rows = await db
          .select()
          .from(chatSessions)
          .where(eq(chatSessions.userId, ctx.user.id))
          .orderBy(desc(chatSessions.sessionUpdatedAt))
          .limit(100);
        return {
          sessions: rows.map((r) => ({
            sessionId: r.sessionId,
            title: r.title ?? "",
            subject: r.subject ?? null,
            gradeLevel: r.gradeLevel ?? null,
            messagesJson: r.messagesJson,
            tags: r.tags ?? "",
            pinned: r.pinned,
            messageCount: r.messageCount,
            sessionCreatedAt: r.sessionCreatedAt.getTime(),
            sessionUpdatedAt: r.sessionUpdatedAt.getTime(),
          })),
        };
      } catch (err) {
        console.error("[cloudSync] pullChatSessions error:", err);
        return { sessions: [] };
      }
    }),

  pushProgress: protectedProcedure
    .input(z.object({ progressJson: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return { ok: false };
        const userId = ctx.user.id;
        const existing = await db
          .select({ id: userProgress.id })
          .from(userProgress)
          .where(eq(userProgress.userId, userId))
          .limit(1);
        if (existing.length > 0) {
          await db.update(userProgress)
            .set({ progressJson: input.progressJson })
            .where(eq(userProgress.userId, userId));
        } else {
          await db.insert(userProgress).values({ userId, progressJson: input.progressJson });
        }
        return { ok: true };
      } catch (err) {
        console.error("[cloudSync] pushProgress error:", err);
        return { ok: false };
      }
    }),

  pullProgress: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { progressJson: null };
        const rows = await db
          .select({ progressJson: userProgress.progressJson })
          .from(userProgress)
          .where(eq(userProgress.userId, ctx.user.id))
          .limit(1);
        return { progressJson: rows[0]?.progressJson ?? null };
      } catch (err) {
        console.error("[cloudSync] pullProgress error:", err);
        return { progressJson: null };
      }
    }),

  pushBookmarks: protectedProcedure
    .input(z.object({
      bookmarks: z.array(z.object({
        bookmarkId: z.string().max(64),
        itemJson: z.string(),
        subject: z.string().max(64).optional(),
      })).max(200),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return { ok: false };
        const userId = ctx.user.id;
        await db.delete(userBookmarks).where(eq(userBookmarks.userId, userId));
        if (input.bookmarks.length > 0) {
          await db.insert(userBookmarks).values(
            input.bookmarks.map((b) => ({
              userId,
              bookmarkId: b.bookmarkId,
              itemJson: b.itemJson,
              subject: b.subject ?? null,
            }))
          );
        }
        return { ok: true };
      } catch (err) {
        console.error("[cloudSync] pushBookmarks error:", err);
        return { ok: false };
      }
    }),

  pullBookmarks: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { bookmarks: [] };
        const rows = await db
          .select()
          .from(userBookmarks)
          .where(eq(userBookmarks.userId, ctx.user.id))
          .orderBy(desc(userBookmarks.createdAt))
          .limit(200);
        return {
          bookmarks: rows.map((r) => ({
            bookmarkId: r.bookmarkId,
            itemJson: r.itemJson,
            subject: r.subject ?? null,
          })),
        };
      } catch (err) {
        console.error("[cloudSync] pullBookmarks error:", err);
        return { bookmarks: [] };
      }
    }),

  pushNotes: protectedProcedure
    .input(z.object({
      notes: z.array(z.object({
        noteId: z.string().max(64),
        noteJson: z.string(),
      })).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return { ok: false };
        const userId = ctx.user.id;
        await db.delete(userNotes).where(eq(userNotes.userId, userId));
        if (input.notes.length > 0) {
          await db.insert(userNotes).values(
            input.notes.map((n) => ({
              userId,
              noteId: n.noteId,
              noteJson: n.noteJson,
            }))
          );
        }
        return { ok: true };
      } catch (err) {
        console.error("[cloudSync] pushNotes error:", err);
        return { ok: false };
      }
    }),

  pullNotes: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { notes: [] };
        const rows = await db
          .select()
          .from(userNotes)
          .where(eq(userNotes.userId, ctx.user.id))
          .orderBy(desc(userNotes.updatedAt))
          .limit(500);
        return {
          notes: rows.map((r) => ({
            noteId: r.noteId,
            noteJson: r.noteJson,
          })),
        };
      } catch (err) {
        console.error("[cloudSync] pullNotes error:", err);
        return { notes: [] };
      }
    }),

  /**
   * Single round-trip to restore all user data after sign-in.
   */
  pullAll: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { solveHistory: [], chatSessions: [], progressJson: null, bookmarks: [], notes: [] };
        const userId = ctx.user.id;
        const [historyRows, chatRows, progressRows, bookmarkRows, noteRows] = await Promise.all([
          db.select().from(solveHistory).where(eq(solveHistory.userId, userId)).orderBy(desc(solveHistory.solvedAt)).limit(200),
          db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.sessionUpdatedAt)).limit(100),
          db.select({ progressJson: userProgress.progressJson }).from(userProgress).where(eq(userProgress.userId, userId)).limit(1),
          db.select().from(userBookmarks).where(eq(userBookmarks.userId, userId)).orderBy(desc(userBookmarks.createdAt)).limit(200),
          db.select().from(userNotes).where(eq(userNotes.userId, userId)).orderBy(desc(userNotes.updatedAt)).limit(500),
        ]);
        return {
          solveHistory: historyRows.map((r) => ({
            problem: r.problem,
            answer: r.answer ?? "",
            subject: r.subject ?? "",
            solutionJson: r.solutionJson ?? null,
            bookmarked: r.bookmarked,
            solvedAt: r.solvedAt.getTime(),
          })),
          chatSessions: chatRows.map((r) => ({
            sessionId: r.sessionId,
            title: r.title ?? "",
            subject: r.subject ?? null,
            gradeLevel: r.gradeLevel ?? null,
            messagesJson: r.messagesJson,
            tags: r.tags ?? "",
            pinned: r.pinned,
            messageCount: r.messageCount,
            sessionCreatedAt: r.sessionCreatedAt.getTime(),
            sessionUpdatedAt: r.sessionUpdatedAt.getTime(),
          })),
          progressJson: progressRows[0]?.progressJson ?? null,
          bookmarks: bookmarkRows.map((r) => ({
            bookmarkId: r.bookmarkId,
            itemJson: r.itemJson,
            subject: r.subject ?? null,
          })),
          notes: noteRows.map((r) => ({
            noteId: r.noteId,
            noteJson: r.noteJson,
          })),
        };
      } catch (err) {
        console.error("[cloudSync] pullAll error:", err);
        return { solveHistory: [], chatSessions: [], progressJson: null, bookmarks: [], notes: [] };
      }
    }),
});

// Auth router stub (required by tests)
// ─── Subscription router ────────────────────────────────────────────────────
const subscriptionRouter = router({
  /**
   * Returns the server-side subscription status for the signed-in user.
   * Reads the `subscriptions` table populated by the RevenueCat webhook.
   * Use this to verify premium status server-side (cannot be spoofed by client).
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return { isPremium: false, status: null, productId: null, expiresAt: null, isInGracePeriod: false, cancelledButActive: false };
      const rows = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .orderBy(desc(subscriptions.updatedAt))
        .limit(1);
      if (rows.length === 0) {
        return { isPremium: false, status: null, productId: null, expiresAt: null, isInGracePeriod: false, cancelledButActive: false };
      }
      const row = rows[0];
      const now = Date.now();
      const expiresAtMs = row.expiresAt ? row.expiresAt.getTime() : null;
      // Grace-period semantics:
      //   "active"    → premium (normal)
      //   "cancelled" → still premium if expiresAt is in the future (cancelled but not yet expired)
      //   "expired"   → not premium
      //   "refunded"  → not premium
      const cancelledButActive = row.status === "cancelled" && expiresAtMs !== null && expiresAtMs > now;
      // isInGracePeriod: read directly from the DB column set by the webhook handler.
      // Set to true on BILLING_ISSUE / GRACE_PERIOD_START; cleared to false on all other events.
      const isInGracePeriod = row.isInGracePeriod ?? false;
      const isPremium = row.status === "active" || cancelledButActive;
      return {
        isPremium,
        status: row.status,
        productId: row.productId ?? null,
        expiresAt: expiresAtMs,
        isInGracePeriod,
        cancelledButActive,
      };
    } catch (err) {
      console.error("[subscriptionRouter] getStatus error:", err);
      return { isPremium: false, status: null, productId: null, expiresAt: null, isInGracePeriod: false, cancelledButActive: false };
    }
  }),

  /**
   * Returns the full subscription history for the signed-in user.
   * All rows from the `subscriptions` table ordered by updatedAt DESC, limit 50.
   */
  history: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: subscriptions.id,
          productId: subscriptions.productId,
          status: subscriptions.status,
          expiresAt: subscriptions.expiresAt,
          createdAt: subscriptions.createdAt,
          updatedAt: subscriptions.updatedAt,
        })
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .orderBy(desc(subscriptions.updatedAt))
        .limit(50);
      return rows.map((r) => {
        // Infer platform from productId naming convention:
        //   RC iOS products typically start with "rc_" or contain "ios"/"apple"
        //   RC Android products typically contain "android"/"google"/"play"
        //   Fall back to "unknown" if we can't tell
        const pid = (r.productId ?? "").toLowerCase();
        const platform: "ios" | "android" | "unknown" =
          pid.includes("android") || pid.includes("google") || pid.includes("play")
            ? "android"
            : pid.includes("ios") || pid.includes("apple")
            ? "ios"
            : "unknown";
        return {
          id: r.id,
          productId: r.productId,
          status: r.status,
          expiresAt: r.expiresAt ? r.expiresAt.getTime() : null,
          createdAt: r.createdAt.getTime(),
          updatedAt: r.updatedAt.getTime(),
          platform,
        };
      });
    } catch (err) {
      console.error("[subscriptionRouter] history error:", err);
      return [];
    }
  }),
});

const authRouter = router({
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, {
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
    return { success: true };
  }),
});

export const appRouter = router({
  math: mathRouter,
  cloudSync: cloudSyncRouter,
  academic: academicRouter,
  auth: authRouter,
  user: userRouter,
  system: systemRouter,
  voice: voiceRouter,
  referral: referralRouter,
  oauth: oauthRouter,
  emailAuth: emailAuthRouter,
  aire: aireRouter,
  subscription: subscriptionRouter,
  classroom: classroomRouter,
});

export type AppRouter = typeof appRouter;
