import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { referralRouter } from "./routers/referrals";
import { oauthRouter } from "./routers/oauth";
import { emailAuthRouter } from "./routers/email-auth";
import { COOKIE_NAME } from "../shared/const";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";

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
- Produce an EXHAUSTIVE, DEEPLY DETAILED solution. Aim for AT LEAST 15-20 steps, each with a thorough multi-sentence explanation.
- Each step explanation MUST be at least 7-10 sentences: state what you are doing, WHY, the rule or theorem that justifies it, any edge cases, and how it connects to the next step.
- Include a WORKED EXAMPLE section showing a COMPLETE similar problem solved from scratch — this example must itself have at least 12 steps.
- The conceptExplained field must be a LONG, RICH paragraph (15-20 sentences) covering: the underlying theory, historical context or motivation, formal definition, intuitive explanation, when the concept applies, common pitfalls, and how it connects to at least 5 related topics.
- The answer field must be a FULL paragraph (7-10 sentences) restating the result, interpreting it, and noting any important caveats or special cases.
- Tips must be detailed, actionable, and specific (6-8 sentences each). Include at least 6 tips.
- The workedExample.solution must be a LONG narrative (at least 450 words) walking through every single step.
- The submissionReady field is a COMPLETELY INDEPENDENT second output. Do NOT summarise, condense, or extract from the explanation above. Generate it fresh from scratch as if you were writing only the answer a student would hand in. Rules by subject type:
  * Mathematics / Physics / Chemistry / Statistics: Write the complete worked solution exactly as a student would present it for marking. Show every calculation step on its own numbered line. Include all formula substitutions, intermediate values with units, and state the final answer clearly on the last line. No prose, no commentary, no "therefore" or "we can see that".
  * Programming / Computer Science: Provide only the final production-ready code. No explanation, no inline comments beyond what the code itself requires.
  * Essays / English / History / Social Studies: Write the complete, polished final response as if submitting it. Full sentences, proper paragraphs, no notes or meta-commentary.
  * Definitions / Vocabulary: Write only the concise, precise final definition.
  * Multiple Choice: State the correct option letter and answer, then include only the essential supporting calculation or one-line justification if needed.
  This field must be completely self-contained. A student must be able to skip the entire explanation above, read ONLY this field, and have everything needed to submit a correct, complete, polished answer.

FORMATTING RULES (CRITICAL - FOLLOW EXACTLY):
- ALL mathematical expressions MUST be wrapped in LaTeX delimiters: $...$ for inline math, $$...$$ for block math.
- NEVER use raw LaTeX commands outside $...$ or $$...$$ delimiters. Never write \\text{}, \\frac{}, \\sqrt{}, \\rightarrow outside math delimiters.
- Use proper Markdown: **bold**, *italic*, backticks for code, dashes for lists, hashes for headings.
- NEVER use stray backslashes, asterisks, or underscores outside their proper context.
- The "expression" field should contain ONLY the mathematical expression wrapped in $...$ or $$...$$ delimiters.
- All text fields should use clean Markdown with proper math delimiters.

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
- Produce an EXHAUSTIVE, DEEPLY DETAILED solution. Aim for AT LEAST 15-20 steps, each with a thorough multi-sentence explanation.
- Each step explanation MUST be at least 7-10 sentences: state what you are doing, WHY, the rule or theorem that justifies it, any edge cases, and how it connects to the next step.
- Include a WORKED EXAMPLE section showing a COMPLETE similar problem solved from scratch — this example must itself have at least 12 steps.
- The conceptExplained field must be a LONG, RICH paragraph (15-20 sentences) covering: the underlying theory, historical context or motivation, formal definition, intuitive explanation, when the concept applies, common pitfalls, and how it connects to at least 5 related topics.
- The answer field must be a FULL paragraph (7-10 sentences) restating the result, interpreting it, and noting any important caveats or special cases.
- Tips must be detailed, actionable, and specific (6-8 sentences each). Include at least 6 tips.
- The workedExample.solution must be a LONG narrative (at least 450 words) walking through every single step.

FORMATTING RULES (CRITICAL - FOLLOW EXACTLY):
- ALL mathematical expressions MUST be wrapped in LaTeX delimiters: $...$ for inline math, $$...$$ for block math.
- NEVER use raw LaTeX commands outside $...$ or $$...$$ delimiters. Never write \\text{}, \\frac{}, \\sqrt{}, \\rightarrow outside math delimiters.
- Use proper Markdown: **bold**, *italic*, backticks for code, dashes for lists, hashes for headings.
- NEVER use stray backslashes, asterisks, or underscores outside their proper context.
- The "expression" field should contain ONLY the mathematical expression wrapped in $...$ or $$...$$ delimiters.
- All text fields should use clean Markdown with proper math delimiters.

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
 * Simple problems get a concise prompt; complex problems get the full exhaustive prompt.
 */
function buildSolveSystemPromptScaled(subject: string, problem: string): string {
  const tokens = estimateSolveTokens(problem, subject);
  const base = buildSolveSystemPrompt(subject);

  if (tokens <= 800) {
    // Replace the exhaustive length requirements with concise ones
    return base
      .replace('Aim for AT LEAST 10-15 steps, each with a thorough multi-sentence explanation.', 'Use 3-6 clear steps.')
      .replace('Each step explanation MUST be at least 5-8 sentences: state what you are doing, WHY, the rule or theorem that justifies it, any edge cases, and how it connects to the next step.', 'Each step explanation should be 2-3 sentences: what you are doing and why.')
      .replace('Include a WORKED EXAMPLE section showing a COMPLETE similar problem solved from scratch — this example must itself have at least 8 steps.', 'Include a brief worked example (3-4 steps).')
      .replace('The conceptExplained field must be a LONG, RICH paragraph (10-15 sentences) covering: the underlying theory, historical context or motivation, formal definition, intuitive explanation, when the concept applies, common pitfalls, and how it connects to at least 3 related topics.', 'The conceptExplained field should be 3-4 sentences: a clear, simple explanation of the concept.')
      .replace('The answer field must be a FULL paragraph (5-8 sentences) restating the result, interpreting it, and noting any important caveats or special cases.', 'The answer field should be 2-3 sentences: state the result clearly and simply.')
      .replace('Tips must be detailed, actionable, and specific (4-6 sentences each). Include at least 4 tips.', 'Include 2-3 short, practical tips (2 sentences each).')
      .replace('The workedExample.solution must be a LONG narrative (at least 300 words) walking through every single step.', 'The workedExample.solution should be a brief narrative (50-80 words).');
  }

  if (tokens <= 1400) {
    return base
      .replace('Aim for AT LEAST 10-15 steps, each with a thorough multi-sentence explanation.', 'Use 5-8 well-explained steps.')
      .replace('Each step explanation MUST be at least 5-8 sentences: state what you are doing, WHY, the rule or theorem that justifies it, any edge cases, and how it connects to the next step.', 'Each step explanation should be 3-4 sentences: what you are doing, why, and the rule that justifies it.')
      .replace('Include a WORKED EXAMPLE section showing a COMPLETE similar problem solved from scratch — this example must itself have at least 8 steps.', 'Include a worked example with 4-6 steps.')
      .replace('The conceptExplained field must be a LONG, RICH paragraph (10-15 sentences)', 'The conceptExplained field should be a solid paragraph (5-7 sentences)')
      .replace('Tips must be detailed, actionable, and specific (4-6 sentences each). Include at least 4 tips.', 'Include 3 practical tips (3-4 sentences each).')
      .replace('The workedExample.solution must be a LONG narrative (at least 300 words) walking through every single step.', 'The workedExample.solution should be a clear narrative (100-150 words).');
  }

  return base; // full exhaustive prompt for complex problems
}

const CHAT_SYSTEM_PROMPT = `You are TutorSnap, a friendly and expert academic tutor covering all school subjects.
You help students understand concepts across Mathematics, English/Language Arts, Science, and Social Studies.
Be encouraging, clear, and pedagogical. Use examples when helpful.
Format mathematical expressions clearly. Keep responses concise but complete.
Adapt your tone and vocabulary to the subject: precise for math/science, analytical for literature/history.

FORMATTING RULES (CRITICAL):
- ALL mathematical expressions MUST be wrapped in LaTeX delimiters: $...$ for inline math, $$...$$ for block math.
- NEVER use raw LaTeX commands outside $...$ or $$...$$ delimiters. Never write \\text{}, \\frac{}, \\sqrt{}, \\rightarrow outside math delimiters.
- Use proper Markdown: **bold**, *italic*, backticks for code, dashes for lists, hashes for headings.
- NEVER use stray backslashes, asterisks, or underscores outside their proper context.`;

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
The "answer" field must be a FULL PARAGRAPH (4-6 sentences) explaining the complete solution.
The "steps" array must have AT LEAST 5-8 steps, each with a detailed explanation (3-5 sentences).
The "submissionReady" field is a COMPLETELY INDEPENDENT second output. Do NOT summarise or extract from the explanation. Generate it fresh as if writing only the answer a student would hand in. Maths/science: numbered calculation lines, all substitutions, units, final answer on last line. Programming: final code only. Essays: complete polished prose. Definitions: concise precise definition. Multiple choice: correct option + essential supporting work only. NO prose commentary, NO preamble.
Respond ONLY with this JSON (no extra text):
{"id":"p1","subject":"${subject}","difficulty":"${difficulty}","problem":"<question>","answer":"<full paragraph answer, 4-6 sentences>","steps":[{"stepNumber":1,"title":"<descriptive title>","explanation":"<detailed explanation, 3-5 sentences>","expression":"<formula if any>"}],"hints":["<hint 1, 1-2 sentences>","<hint 2, 1-2 sentences>","<hint 3, 1-2 sentences>"],"submissionReady":"<independently generated submission answer>"}`;
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
  // Remove trailing incomplete key-value pair (e.g. ,"key":"partial)
  s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, "");
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

async function invokeLLMWithFallback(primaryModel: string, fallbackModel: string, params: Parameters<typeof invokeLLM>[0]): Promise<string> {
  // Try primary model
  try {
    const result = await invokeLLM({ ...params, model: primaryModel });
    const text = extractLLMContent(result);
    const jsonStr = extractJsonFromContent(text);
    JSON.parse(jsonStr); // validate
    return jsonStr;
  } catch {
    // Fallback to stronger model
    const result2 = await invokeLLM({ ...params, model: fallbackModel, max_tokens: Math.min((params.max_tokens ?? 4000) + 1000, 6000) });
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

// ─── Academic router ──────────────────────────────────────────────────────────

const academicRouter = router({
  solve: publicProcedure
    .input(z.object({
      problem: z.string().min(1),
      subject: z.string().default("other"),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const tokenBudget = estimateSolveTokens(input.problem, input.subject);
        const systemPrompt = buildSolveSystemPromptScaled(input.subject, input.problem) + gradeContext(input.gradeLevel);
        const params = {
          model: "gemini-3-flash-preview" as const,
          messages: [
            { role: "system" as const, content: systemPrompt },
            { role: "user" as const, content: input.problem },
          ],
          max_tokens: tokenBudget,
          response_format: { type: "json_object" as const },
        };
        const jsonStr = await invokeLLMWithFallback("gemini-3-flash-preview", "claude-haiku-4-5", params);
        return JSON.parse(jsonStr);
      } catch (err: unknown) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : "Failed to solve problem. Please try again." });
      }
    }),

  solveExplanation: publicProcedure
    .input(z.object({
      problem: z.string().min(1),
      correctAnswer: z.string(),
      selectedAnswer: z.string(),
      subject: z.string().default("other"),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `You are TutorSnap, an expert academic tutor.${gradeContext(input.gradeLevel)}
A student answered a multiple-choice question.
Question: "${input.problem}"
Correct answer: ${input.correctAnswer}
Student selected: ${input.selectedAnswer}
${input.selectedAnswer === input.correctAnswer ? "The student got it RIGHT." : "The student got it WRONG."}

Respond ONLY with this JSON (no extra text):
{
  "explanation": "FULL DETAILED worked solution: (1) state the correct answer clearly, (2) explain WHY it is correct with full reasoning (4-6 sentences), (3) show the complete working/derivation step by step, (4) if the student was wrong explain specifically why their choice was incorrect (2-3 sentences), (5) give a key insight or tip to remember this concept. Be thorough and educational.",
  "submissionReady": "INDEPENDENTLY GENERATED - not a summary of the explanation above. Write only what a student would hand in. State the correct option letter and answer, then show only the essential supporting work or one-line justification (2-4 lines max). No prose commentary, no preamble."
}`;
      const result = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Explain the answer fully." },
        ],
        max_tokens: 900,
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

  solveFromImage: publicProcedure
    .input(z.object({
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      subject: z.string().default("other"),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Use gemini for vision (best multimodal) with gpt-5-mini fallback
        const messages = [
          { role: "system" as const, content: IMAGE_SOLVE_SYSTEM_PROMPT + gradeContext(input.gradeLevel) },
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
          model: "gemini-3-flash-preview" as const,
          messages,
          max_tokens: 2500,
          response_format: { type: "json_object" as const },
        };
        const jsonStr = await invokeLLMWithFallback("gemini-3-flash-preview", "claude-haiku-4-5", params);
        return JSON.parse(jsonStr);
      } catch (err: unknown) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : "Failed to process image. Please try again." });
      }
    }),

  generatePractice: publicProcedure
    .input(z.object({
      subject: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Scale token budget by difficulty: easy=700, medium=1100, hard=1800
      const practiceTokens = input.difficulty === 'easy' ? 700 : input.difficulty === 'medium' ? 1100 : 1800;
      const practicePrompt = buildPracticePrompt(input.subject, input.difficulty) + gradeContext(input.gradeLevel);
      const result = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: practicePrompt },
          { role: "user", content: `Generate a ${input.difficulty} ${input.subject} practice question.` },
        ],
        max_tokens: practiceTokens,
        response_format: { type: "json_object" },
      });
      const text = extractLLMContent(result);
      const jsonStr = extractJsonFromContent(text);
      try {
        return JSON.parse(jsonStr);
      } catch {
        // Try repair for truncated JSON
        try {
          const repaired = repairTruncatedJson(jsonStr);
          return JSON.parse(repaired);
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON. Please try again." });
        }
      }
    }),

  generateQuiz: publicProcedure
    .input(z.object({
      subject: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      count: z.number().min(3).max(10).default(5),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const quizPrompt = `You are TutorSnap, an expert academic tutor.${gradeContext(input.gradeLevel)}
Generate exactly ${input.count} ${input.difficulty} multiple-choice questions for: ${input.subject}.
Each question has 4 options (A-D), one correct answer, and a brief 1-sentence explanation.
Respond ONLY with this JSON:
{"questions":[{"id":"q1","problem":"<question>","options":{"A":"<a>","B":"<b>","C":"<c>","D":"<d>"},"correctAnswer":"A","explanation":"<1 sentence>"}]}`;

      const result = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: quizPrompt },
          { role: "user", content: `Generate ${input.count} ${input.difficulty} multiple-choice questions for ${input.subject}.` },
        ],
        // Scale per-question token budget by difficulty
        max_tokens: Math.min(input.count * (input.difficulty === 'easy' ? 150 : input.difficulty === 'medium' ? 250 : 350), 2500),
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
    }))
    .mutation(async ({ input }) => {
      const subjectContext = input.subject
        ? `\nThe student is currently focused on: ${input.subject}. Tailor your explanations to this subject when relevant.`
        : "";
      const gradeContext = input.gradeLevel && GRADE_LEVEL_DESCRIPTIONS[input.gradeLevel]
        ? `\nADAPT YOUR RESPONSE to this student's level: ${GRADE_LEVEL_DESCRIPTIONS[input.gradeLevel]}`
        : "";
      const systemPrompt = CHAT_SYSTEM_PROMPT + subjectContext + gradeContext;
      const result = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: systemPrompt },
          ...input.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        // Scale chat response length by message complexity
        max_tokens: (() => {
          const lastMsg = input.messages[input.messages.length - 1]?.content ?? "";
          const wordCount = lastMsg.trim().split(/\s+/).length;
          if (wordCount <= 10) return 600;   // short/simple question
          if (wordCount <= 30) return 1000;  // medium question
          return 1500;                        // long/complex question
        })(),
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
- Format math with LaTeX: $...$ for inline, $$...$$ for block.
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

  /** Generate structured study blocks from an AI response for Study View mode */
  generateStudyBlocks: publicProcedure
    .input(z.object({
      aiResponse: z.string().min(1),
      subject: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const subjectHint = input.subject ? `The subject context is: ${input.subject}.` : "";
      const systemPrompt = `You are an expert academic content structurer. Transform a raw AI tutor response into structured study blocks for review and revision.

Analyze the response and identify its major educational components. For each component create a block with a semantic type, a concise title (3-6 words), and the full content.

Available block types:
- core_answer: The direct answer or main result
- key_concept: A core concept being taught
- worked_example: A full worked example with steps
- formula: A formula, equation, or expression
- definition: A term definition
- tip: A study tip or common mistake warning
- analogy: A real-world analogy
- code: A code block (programming subjects)
- summary: A concise summary or takeaway
- step_breakdown: A numbered step-by-step breakdown
- visual_note: A visual or spatial description

Rules:
- Generate 3 to 7 blocks. Quality over quantity.
- Each block must be self-contained.
- Do NOT summarize. Use actual content from the response.
- Titles must be 3-6 words, no trailing punctuation.
- Content must be clean markdown. No dollar signs for math. Use plain text for equations.
- Do NOT use em dashes or en dashes.
- Choose block types that genuinely match the content.
${subjectHint}

Respond ONLY with valid JSON: {"blocks": [{"type": "core_answer", "title": "The Direct Answer", "content": "..."}]}`;
      const result = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Transform this AI response into study blocks:\n\n${input.aiResponse.slice(0, 3000)}` },
        ],
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });
      const text = extractLLMContent(result);
      try {
        const parsed = JSON.parse(extractJsonFromContent(text)) as { blocks: Array<{ type: string; title: string; content: string }> };
        const validTypes = ["core_answer","key_concept","worked_example","formula","definition","tip","analogy","code","summary","step_breakdown","visual_note"];
        const blocks = (parsed.blocks ?? []).filter((b: any) => validTypes.includes(b.type) && b.title && b.content).slice(0, 7);
        return { blocks };
      } catch {
        return { blocks: [] };
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

// Auth router stub (required by tests)
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
  academic: academicRouter,
  auth: authRouter,
  user: userRouter,
  system: systemRouter,
  voice: voiceRouter,
  referral: referralRouter,
  oauth: oauthRouter,
  emailAuth: emailAuthRouter,
});

export type AppRouter = typeof appRouter;
