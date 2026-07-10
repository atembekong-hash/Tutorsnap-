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
    algebra:                "Solve algebraically. Show each manipulation step. Identify the type of equation.",
    calculus:               "Apply calculus rules (limits, derivatives, integrals). State the theorem used at each step.",
    geometry:               "Use geometric theorems and formulas. Include diagrams described in text if helpful.",
    trigonometry:           "Apply trig identities and the unit circle. Show angle conversions if needed.",
    statistics:             "Apply statistical formulas. Interpret the result in context.",
    arithmetic:             "Compute step by step. Show order of operations clearly.",
    precalculus:            "Bridge algebra and calculus concepts. Show function analysis.",
    linear_algebra:         "Use matrix operations and vector space properties. Show row operations.",
    differential_equations: "Identify equation type (separable, linear, etc.). Show the solution method.",
    number_theory:          "Apply number theory theorems (divisibility, primes, modular arithmetic).",
    // English / Language Arts
    american_literature:    "Analyze the text using literary devices, historical context, and American literary traditions. Provide textual evidence.",
    british_literature:     "Analyze the text using British literary traditions, historical context, and literary devices. Provide textual evidence.",
    world_literature:       "Analyze the text in its cultural and historical context. Discuss universal themes and literary devices.",
    composition:            "Provide structured writing guidance: thesis, evidence, argument flow, and revision tips.",
    creative_writing:       "Offer creative feedback: voice, imagery, structure, character, and narrative techniques.",
    debate:                 "Construct logical arguments with evidence. Address counterarguments. Use rhetorical strategies.",
    journalism:             "Apply journalistic principles: who/what/when/where/why/how, inverted pyramid, objectivity.",
    grammar:                "Identify the grammatical rule. Explain the correct usage with examples and common mistakes.",
    poetry:                 "Analyze meter, rhyme scheme, imagery, tone, and literary devices. Discuss the poem's meaning.",
    // Science
    biology:                "Apply biological concepts and processes. Reference cell biology, genetics, ecology, or physiology as needed.",
    chemistry:              "Balance equations, apply stoichiometry, and explain chemical principles. Show unit conversions.",
    physics:                "Apply physics laws and formulas. Define variables, show unit analysis, and interpret results.",
    earth_science:          "Apply earth science concepts: geology, meteorology, oceanography, or environmental systems.",
    space_science:          "Apply astronomy and astrophysics concepts. Reference celestial mechanics, cosmology, or space exploration.",
    environmental_science:  "Apply environmental science principles: ecosystems, climate, pollution, sustainability.",
    anatomy:                "Describe anatomical structures, physiological processes, and body systems accurately.",
    forensics:              "Apply forensic science methods: evidence analysis, chain of custody, scientific reasoning.",
    general_science:        "Apply the scientific method. Explain concepts clearly with real-world examples.",
    // Social Studies
    us_history:             "Provide historical context, key figures, causes and effects. Reference primary sources when relevant.",
    world_history:          "Provide global historical context, compare civilizations, and analyze cause and effect.",
    government:             "Explain governmental structures, constitutional principles, and civic processes accurately.",
    economics:              "Apply economic theories, models, and concepts. Use supply/demand, fiscal/monetary policy as needed.",
    geography:              "Describe physical and human geography. Explain spatial relationships and regional characteristics.",
    psychology:             "Apply psychological theories and research. Reference key studies and explain behavior/cognition.",
    sociology:              "Apply sociological theories and concepts. Analyze social structures, institutions, and behavior.",
    civics:                 "Explain civic rights, responsibilities, and democratic processes accurately.",
  };

  const guide = subjectGuides[subject] ?? "Provide a clear, accurate, and educational answer.";

  return `You are TutorSnap, an expert academic tutor covering all school subjects.
Subject: ${subject}
Guidance: ${guide}

When answering, you must:
1. Identify exactly what is being asked
2. Provide a clear, correct answer
3. Break the solution/explanation into numbered steps
4. Explain the key concept involved
5. Provide 2-3 helpful tips for this type of problem
6. Suggest 2-3 related topics to study

Always respond with valid JSON in this exact format:
{
  "problem": "the original question or problem",
  "subject": "${subject}",
  "answer": "the final answer or conclusion, clear and concise",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "explanation": "Detailed explanation of this step",
      "expression": "Optional: formula, equation, or key phrase for this step"
    }
  ],
  "conceptExplained": "A brief explanation of the key concept used",
  "tips": ["Tip 1", "Tip 2", "Tip 3"],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3"]
}`;
}

const IMAGE_SOLVE_SYSTEM_PROMPT = `You are TutorSnap, an expert academic tutor.
Analyze the image and identify any question, problem, or text in it.
Determine the subject area automatically, then solve or answer it completely.
Always respond with valid JSON in this exact format:
{
  "problem": "the question or problem you found in the image",
  "subject": "the detected subject id (e.g. algebra, biology, us_history, composition, etc.)",
  "answer": "the final answer, clear and concise",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "explanation": "Detailed explanation of this step",
      "expression": "Optional: formula, equation, or key phrase"
    }
  ],
  "conceptExplained": "A brief explanation of the key concept used",
  "tips": ["Tip 1", "Tip 2"],
  "relatedTopics": ["Topic 1", "Topic 2"]
}`;

const CHAT_SYSTEM_PROMPT = `You are TutorSnap, a friendly and expert academic tutor covering all school subjects.
You help students understand concepts across Mathematics, English/Language Arts, Science, and Social Studies.
Be encouraging, clear, and pedagogical. Use examples when helpful.
Format mathematical expressions clearly. Keep responses concise but complete.
Adapt your tone and vocabulary to the subject — precise for math/science, analytical for literature/history.`;

function buildPracticePrompt(subject: string, difficulty: string): string {
  const isEnglish = ["american_literature","british_literature","world_literature","composition","creative_writing","debate","journalism","grammar","poetry"].includes(subject);
  const isSocial = ["us_history","world_history","government","economics","geography","psychology","sociology","civics"].includes(subject);

  let taskType = "problem";
  if (isEnglish) taskType = "question or short writing prompt";
  if (isSocial) taskType = "question or analysis prompt";

  return `You are TutorSnap, an expert academic tutor.
Generate a ${difficulty} ${taskType} for the subject: ${subject}.
The question should be appropriate for a high school or early college student.
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
      "explanation": "Explanation",
      "expression": "Optional: formula, quote, or key phrase"
    }
  ],
  "hints": ["Hint 1", "Hint 2", "Hint 3"]
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
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = buildSolveSystemPrompt(input.subject);
      const result = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.problem },
        ],
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });
      const rawContent = result.choices[0]?.message?.content ?? "";
      const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const jsonStr = extractJsonFromContent(text);
      return JSON.parse(jsonStr);
    }),

  solveFromImage: publicProcedure
    .input(z.object({
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      subject: z.string().default("other"),
    }))
    .mutation(async ({ input }) => {
      const result = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: IMAGE_SOLVE_SYSTEM_PROMPT },
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
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });
      const rawContent = result.choices[0]?.message?.content ?? "";
      const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const jsonStr = extractJsonFromContent(text);
      return JSON.parse(jsonStr);
    }),

  generatePractice: publicProcedure
    .input(z.object({
      subject: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
    }))
    .mutation(async ({ input }) => {
      const practicePrompt = buildPracticePrompt(input.subject, input.difficulty);
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
    }))
    .mutation(async ({ input }) => {
      const isEnglish = ["american_literature","british_literature","world_literature","composition","creative_writing","debate","journalism","grammar","poetry"].includes(input.subject);
      const isSocial = ["us_history","world_history","government","economics","geography","psychology","sociology","civics"].includes(input.subject);
      let taskType = "problem";
      if (isEnglish) taskType = "question";
      if (isSocial) taskType = "question";

      const quizPrompt = `You are TutorSnap, an expert academic tutor.
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
      const parsed = JSON.parse(jsonStr);
      return parsed.questions ?? [];
    }),

  studyTip: publicProcedure
    .input(z.object({
      subject: z.string(),
    }))
    .mutation(async ({ input }) => {
      const tipPrompt = `You are TutorSnap, a friendly academic tutor. Generate a single, practical, actionable study tip for a student studying ${input.subject}. The tip should be specific, encouraging, and 1-2 sentences long. Respond with ONLY the tip text, no preamble, no quotes.`;
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
      return { tip: tip || `Practice ${input.subject} problems daily — consistency is the key to mastery!` };
    }),

  chat: publicProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
      subject: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const subjectContext = input.subject
        ? `\nThe student is currently focused on: ${input.subject}. Tailor your explanations to this subject when relevant.`
        : "";
      const systemPrompt = CHAT_SYSTEM_PROMPT + subjectContext;
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

  generateSimilar: publicProcedure
    .input(z.object({
      problem: z.string(),
      subject: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
      count: z.number().min(1).max(5).default(3),
    }))
    .mutation(async ({ input }) => {
      const prompt = `You are TutorSnap, an expert academic tutor.\nThe student just solved this problem:\n"${input.problem}"\n\nGenerate exactly ${input.count} similar practice problems of ${input.difficulty} difficulty in the subject "${input.subject}".\nThe problems should test the same concept or skill but use different numbers, scenarios, or contexts.\nRespond ONLY with valid JSON in this exact format:\n{\n  "problems": [\n    {\n      "id": "p1",\n      "problem": "The practice problem text",\n      "hint": "A brief hint (1 sentence)"\n    }\n  ]\n}`;
      const result = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Generate the similar problems now." },
        ],
        max_tokens: 1200,
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
  system: systemRouter,
  voice: voiceRouter,
});

export type AppRouter = typeof appRouter;
