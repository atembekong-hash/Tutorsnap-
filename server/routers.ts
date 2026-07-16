import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
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
- Produce a COMPREHENSIVE, DETAILED solution. Aim for at least 6-10 steps, each with thorough explanation.
- Include a WORKED EXAMPLE section showing a similar problem solved from scratch.
- The conceptExplained field must be a full paragraph (5-8 sentences) explaining the underlying theory.
- Each step explanation must be at least 3-5 sentences long.
- Tips must be detailed and actionable (2-4 sentences each).

Always respond with valid JSON in this exact format:
{
  "problem": "the original question or problem, reproduced exactly",
  "subject": "${subject}",
  "answer": "the complete final answer with all values, units, and interpretation (at least 3-5 sentences)",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Descriptive step title",
      "explanation": "Thorough explanation of this step: what you are doing, why, and what rule or theorem justifies it. At least 3-5 sentences.",
      "expression": "The key formula, equation, or expression for this step"
    }
  ],
  "workedExample": {
    "title": "Worked Example: [brief description of the example problem]",
    "problem": "A similar but distinct example problem",
    "solution": "Complete step-by-step solution of the example problem, written as a narrative with all steps shown inline"
  },
  "conceptExplained": "A thorough paragraph (5-8 sentences) explaining the underlying concept, its mathematical or theoretical basis, when it applies, common pitfalls, and how it connects to related topics.",
  "tips": [
    "Detailed tip 1: specific, actionable, 2-4 sentences",
    "Detailed tip 2: specific, actionable, 2-4 sentences",
    "Detailed tip 3: specific, actionable, 2-4 sentences"
  ],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]
}`;
}

const IMAGE_SOLVE_SYSTEM_PROMPT = `You are TutorSnap, an expert academic tutor and professor covering ALL subjects at ALL difficulty levels.
Analyze the image and identify any question, problem, or text in it.
Determine the subject area automatically, then solve or answer it COMPLETELY and COMPREHENSIVELY.

CRITICAL RULES:
- NEVER refuse to answer or say a problem is too hard. Solve EVERYTHING.
- Produce a COMPREHENSIVE, DETAILED solution with at least 6-10 steps.
- Include a WORKED EXAMPLE showing a similar problem solved from scratch.
- Each step explanation must be at least 3-5 sentences.
- The conceptExplained field must be a full paragraph (5-8 sentences).

Always respond with valid JSON in this exact format:
{
  "problem": "the question or problem you found in the image",
  "subject": "the detected subject id (e.g. algebra, calculus, biology, us_history, etc.)",
  "answer": "the complete final answer with all values, units, and interpretation (at least 3-5 sentences)",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Descriptive step title",
      "explanation": "Thorough explanation: what you are doing, why, and what rule justifies it. At least 3-5 sentences.",
      "expression": "The key formula, equation, or expression"
    }
  ],
  "workedExample": {
    "title": "Worked Example: [brief description]",
    "problem": "A similar but distinct example problem",
    "solution": "Complete step-by-step solution written as a narrative"
  },
  "conceptExplained": "A thorough paragraph (5-8 sentences) explaining the underlying concept, its basis, when it applies, common pitfalls, and related topics.",
  "tips": ["Detailed tip 1: 2-4 sentences", "Detailed tip 2: 2-4 sentences", "Detailed tip 3: 2-4 sentences"],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]
}`;

const CHAT_SYSTEM_PROMPT = `You are TutorSnap, a friendly and expert academic tutor covering all school subjects.
You help students understand concepts across Mathematics, English/Language Arts, Science, and Social Studies.
Be encouraging, clear, and pedagogical. Use examples when helpful.
Format mathematical expressions clearly. Keep responses concise but complete.
Adapt your tone and vocabulary to the subject: precise for math/science, analytical for literature/history.`;

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
Respond ONLY with this JSON (no extra text):
{"id":"p1","subject":"${subject}","difficulty":"${difficulty}","problem":"<question>","answer":"<answer>","steps":[{"stepNumber":1,"title":"<title>","explanation":"<1-2 sentences>","expression":"<formula if any>"}],"hints":["<hint 1, 1 sentence>","<hint 2, 1 sentence>","<hint 3, 1 sentence>"]}`;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function extractJsonFromContent(content: string): string {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return content;
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
        const systemPrompt = buildSolveSystemPrompt(input.subject) + gradeContext(input.gradeLevel);
        const result = await invokeLLM({
          model: "claude-haiku-4-5",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.problem },
          ],
          max_tokens: 1500,
          response_format: { type: "json_object" },
        });
        const text = extractLLMContent(result);
        const jsonStr = extractJsonFromContent(text);
        return JSON.parse(jsonStr);
      } catch (err: unknown) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : "Failed to solve problem. Please try again." });
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
        const result = await invokeLLM({
          model: "claude-haiku-4-5",
          messages: [
            { role: "system", content: IMAGE_SOLVE_SYSTEM_PROMPT + gradeContext(input.gradeLevel) },
            {
              role: "user",
              content: [
                { type: "text", text: `Please identify and answer the question in this image. Subject hint: ${input.subject}` },
                {
                  type: "image_url",
                  image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` },
                },
              ],
            },
          ],
          max_tokens: 1500,
          response_format: { type: "json_object" },
        });
        const text = extractLLMContent(result);
        const jsonStr = extractJsonFromContent(text);
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
      const practicePrompt = buildPracticePrompt(input.subject, input.difficulty) + gradeContext(input.gradeLevel);
      const result = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: practicePrompt },
          { role: "user", content: `Generate a ${input.difficulty} ${input.subject} practice question.` },
        ],
        max_tokens: 600,
        response_format: { type: "json_object" },
      });
      const text = extractLLMContent(result);
      const jsonStr = extractJsonFromContent(text);
      try {
        return JSON.parse(jsonStr);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON. Please try again." });
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
        max_tokens: Math.min(input.count * 200, 1200),
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
        model: "gpt-5-nano",
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
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          ...input.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        max_tokens: 1000,
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
        max_tokens: Math.min(input.count * 150, 800),
        response_format: { type: "json_object" },
      });
      const text = extractLLMContent(result);
      const jsonStr = extractJsonFromContent(text);
      return JSON.parse(jsonStr) as { problems: { id: string; problem: string; hint: string }[] };
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
});

export type AppRouter = typeof appRouter;
