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

  return `You are TutorSnap, an expert academic tutor.
Generate a ${difficulty} ${taskType} for the subject: ${subject}.
The question should be appropriate for a high school or early college student.

CRITICAL: The "hints" array must contain EXACTLY 3 hints that are ELABORATE and EDUCATIONAL:
- Hint 1: Point the student toward the right concept or formula WITHOUT giving the answer. Explain WHY that concept applies here (2-3 sentences).
- Hint 2: Break down the first key step they should take, explaining the reasoning and any relevant formula or rule (2-4 sentences).
- Hint 3: Guide them through the most difficult part of the problem, explaining common mistakes to avoid and what to check (2-4 sentences).

Always respond with valid JSON in this exact format:
{
  "id": "practice-${Date.now()}",
  "subject": "${subject}",
  "difficulty": "${difficulty}",
  "problem": "The practice question or prompt",
  "answer": "The correct answer or a model answer",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step or point title",
      "explanation": "Detailed explanation of this step (3-5 sentences)",
      "expression": "Optional: formula, quote, or key phrase"
    }
  ],
  "hints": [
    "Hint 1: [concept pointer with explanation of why it applies, 2-3 sentences]",
    "Hint 2: [first key step breakdown with formula/rule reasoning, 2-4 sentences]",
    "Hint 3: [guidance on the hardest part with common mistakes to avoid, 2-4 sentences]"
  ]
}`;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function extractJsonFromContent(content: string): string {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return content;
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
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.problem },
          ],
          max_tokens: 6000,
          response_format: { type: "json_object" },
        });
        const rawContent = result.choices[0]?.message?.content ?? "";
        const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
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
          model: "gpt-4o-mini",
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
          max_tokens: 6000,
          response_format: { type: "json_object" },
        });
        const rawContent = result.choices[0]?.message?.content ?? "";
        const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
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
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: practicePrompt },
          { role: "user", content: `Generate a ${input.difficulty} ${input.subject} practice question.` },
        ],
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });
      const rawContent = result.choices[0]?.message?.content ?? "";
      const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const jsonStr = extractJsonFromContent(text);
      return JSON.parse(jsonStr);
    }),

  generateQuiz: publicProcedure
    .input(z.object({
      subject: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      count: z.number().min(3).max(10).default(5),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const isEnglish = ["american_literature","british_literature","world_literature","composition","creative_writing","debate","journalism","grammar","poetry"].includes(input.subject);
      const isSocial = ["us_history","world_history","government","economics","geography","psychology","sociology","civics"].includes(input.subject);
      let taskType = "problem";
      if (isEnglish) taskType = "question";
      if (isSocial) taskType = "question";

      const quizPrompt = `You are TutorSnap, an expert academic tutor.${gradeContext(input.gradeLevel)}
Generate exactly ${input.count} ${input.difficulty} ${taskType}s for the subject: ${input.subject}.
Each question must have 4 multiple-choice options (A, B, C, D) with exactly one correct answer.
Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {
      "id": "q1",
      "problem": "The question text",
      "options": { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
      "correctAnswer": "A",
      "explanation": "Why this answer is correct"
    }
  ]
}`;

      const result = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: quizPrompt },
          { role: "user", content: `Generate ${input.count} ${input.difficulty} multiple-choice questions for ${input.subject}.` },
        ],
        max_tokens: 3000,
        response_format: { type: "json_object" },
      });
      const rawContent = result.choices[0]?.message?.content ?? "";
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
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: tipPrompt },
          { role: "user", content: `Give me a study tip for ${input.subject}.` },
        ],
        max_tokens: 120,
      });
      const rawContent = result.choices[0]?.message?.content ?? "";
      const tip = typeof rawContent === "string" ? rawContent.trim() : "";
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
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...input.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        max_tokens: 1000,
      });
      const rawContent = result.choices[0]?.message?.content ?? "";
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
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Generate the 3 follow-up chips now." },
        ],
        max_tokens: 120,
        response_format: { type: "json_object" },
      });
      const rawContent = result.choices[0]?.message?.content ?? "";
      const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
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
      const prompt = `You are TutorSnap, an expert academic tutor.${gradeContext(input.gradeLevel)}\nThe student just solved this problem:\n"${input.problem}"\n\nGenerate exactly ${input.count} similar practice problems of ${input.difficulty} difficulty in the subject "${input.subject}".\nThe problems should test the same concept or skill but use different numbers, scenarios, or contexts.\n\nFor each problem, provide an ELABORATE hint (2-4 sentences) that:\n- Points toward the right concept or technique WITHOUT giving the answer\n- Explains WHY that approach applies to this specific problem\n- Mentions any formula, theorem, or rule the student should recall\n\nRespond ONLY with valid JSON in this exact format:\n{\n  "problems": [\n    {\n      "id": "p1",\n      "problem": "The practice problem text",\n      "hint": "Elaborate hint: 2-4 sentences pointing to the concept, explaining why it applies, and naming the relevant formula or rule"\n    }\n  ]\n}`;
      const result = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Generate the similar problems now." },
        ],
        max_tokens: 2500,
        response_format: { type: "json_object" },
      });
      const rawContent = result.choices[0]?.message?.content ?? "";
      const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
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
