import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "../shared/const";

// ─── Subject-aware system prompt builder ────────────────────────────────────

function buildSolveSystemPrompt(subject: string | null | undefined): string {
  const subjectHints: Record<string, string> = {
    // Math
    algebra: "You are an expert algebra tutor. Focus on equations, inequalities, polynomials, factoring, systems, and functions.",
    calculus: "You are an expert calculus tutor. Focus on limits, derivatives, integrals, series, and applications.",
    geometry: "You are an expert geometry tutor. Focus on shapes, proofs, coordinates, transformations, and measurements.",
    trigonometry: "You are an expert trigonometry tutor. Focus on trig functions, identities, unit circle, and applications.",
    statistics: "You are an expert statistics tutor. Focus on probability, distributions, hypothesis testing, and data analysis.",
    arithmetic: "You are an expert arithmetic tutor. Focus on operations, fractions, decimals, percentages, and number properties.",
    precalculus: "You are an expert pre-calculus tutor. Focus on functions, sequences, series, conic sections, and limits.",
    linear_algebra: "You are an expert linear algebra tutor. Focus on matrices, vectors, linear transformations, and eigenvalues.",
    differential_equations: "You are an expert differential equations tutor. Focus on ODEs, PDEs, initial value problems, and modeling.",
    number_theory: "You are an expert number theory tutor. Focus on primes, divisibility, modular arithmetic, and proofs.",
    // English / ELA
    american_literature: "You are an expert American literature teacher. Help analyze texts, themes, characters, symbolism, historical context, and literary devices in American works.",
    british_literature: "You are an expert British literature teacher. Help analyze texts, themes, characters, symbolism, historical context, and literary devices in British works.",
    world_literature: "You are an expert world literature teacher. Help analyze texts from global traditions, themes, cultural context, and literary devices.",
    composition: "You are an expert writing teacher. Help with essay structure, thesis development, argumentation, evidence, transitions, and revision strategies.",
    creative_writing: "You are an expert creative writing teacher. Help with narrative craft, character development, dialogue, plot structure, voice, and style.",
    debate: "You are an expert debate and rhetoric teacher. Help with argumentation, logical fallacies, evidence evaluation, persuasion, and debate structure.",
    journalism: "You are an expert journalism teacher. Help with news writing, inverted pyramid structure, AP style, interviewing, and media ethics.",
    grammar: "You are an expert grammar and language teacher. Help with parts of speech, sentence structure, punctuation, vocabulary, and usage.",
    poetry: "You are an expert poetry teacher. Help with poetic forms, meter, rhyme, literary devices, analysis, and interpretation.",
    // Science
    biology: "You are an expert biology teacher. Help with cells, genetics, evolution, ecology, physiology, and biological processes.",
    chemistry: "You are an expert chemistry teacher. Help with atomic structure, chemical reactions, stoichiometry, bonding, thermodynamics, and lab concepts.",
    physics: "You are an expert physics teacher. Help with mechanics, energy, waves, electricity, magnetism, optics, and modern physics.",
    earth_science: "You are an expert earth science teacher. Help with geology, weather, climate, oceans, plate tectonics, and Earth's systems.",
    space_science: "You are an expert astronomy and space science teacher. Help with the solar system, stars, galaxies, cosmology, and space exploration.",
    environmental_science: "You are an expert environmental science teacher. Help with ecosystems, biodiversity, climate change, pollution, and sustainability.",
    anatomy: "You are an expert anatomy and physiology teacher. Help with body systems, organs, tissues, cells, and physiological processes.",
    forensics: "You are an expert forensic science teacher. Help with crime scene investigation, evidence analysis, forensic techniques, and case studies.",
    general_science: "You are an expert general science teacher. Help with broad scientific concepts, the scientific method, and cross-disciplinary topics.",
    // Social Studies
    us_history: "You are an expert U.S. history teacher. Help with American historical events, figures, causes and effects, primary sources, and historical analysis.",
    world_history: "You are an expert world history teacher. Help with global civilizations, historical events, causes and effects, and historical analysis.",
    government: "You are an expert government and civics teacher. Help with political systems, the Constitution, branches of government, laws, and policy.",
    economics: "You are an expert economics teacher. Help with supply and demand, market structures, macroeconomics, microeconomics, and economic analysis.",
    geography: "You are an expert geography teacher. Help with physical and human geography, maps, regions, cultures, and geographic analysis.",
    psychology: "You are an expert psychology teacher. Help with psychological theories, research methods, behavior, cognition, and mental processes.",
    sociology: "You are an expert sociology teacher. Help with social structures, institutions, culture, inequality, and sociological theories.",
    civics: "You are an expert civics teacher. Help with citizenship, rights, democratic processes, government, and civic participation.",
  };

  const subjectContext = subject && subjectHints[subject]
    ? subjectHints[subject]
    : "You are an expert academic tutor covering all subjects including math, science, English, and social studies.";

  const isMath = !subject || ["algebra","calculus","geometry","trigonometry","statistics","arithmetic","precalculus","linear_algebra","differential_equations","number_theory"].includes(subject ?? "");
  const isEnglish = ["american_literature","british_literature","world_literature","composition","creative_writing","debate","journalism","grammar","poetry"].includes(subject ?? "");
  const isScience = ["biology","chemistry","physics","earth_science","space_science","environmental_science","anatomy","forensics","general_science"].includes(subject ?? "");
  const isSocial = ["us_history","world_history","government","economics","geography","psychology","sociology","civics"].includes(subject ?? "");

  let stepGuidance = "Break down the solution into clear numbered steps.";
  let answerGuidance = "the final answer, clear and concise";
  let expressionNote = '"expression": "Optional: relevant formula, equation, or key term for this step"';

  if (isEnglish) {
    stepGuidance = "Break down the analysis or response into clear numbered steps (e.g., identify the question, analyze evidence, form interpretation, conclusion).";
    answerGuidance = "a clear, direct answer or thesis statement";
    expressionNote = '"expression": "Optional: key quote, term, or literary device relevant to this step"';
  } else if (isSocial) {
    stepGuidance = "Break down the analysis into clear numbered steps (e.g., identify the context, analyze causes/effects, evaluate evidence, form conclusion).";
    answerGuidance = "a clear, direct answer or thesis statement";
    expressionNote = '"expression": "Optional: key date, term, or concept relevant to this step"';
  } else if (isScience) {
    stepGuidance = "Break down the solution into clear numbered steps, showing formulas and scientific reasoning.";
    answerGuidance = "the final answer with appropriate units or conclusion";
    expressionNote = '"expression": "Optional: formula, equation, or scientific notation for this step"';
  }

  return `${subjectContext}

When given a question or problem, you must:
1. Identify the specific topic within the subject
2. Provide a clear, correct answer
3. ${stepGuidance}
4. Explain the key concept
5. Provide helpful study tips
6. Suggest related topics to explore

Always respond with valid JSON in this exact format:
{
  "problem": "the original question or problem statement",
  "subject": "${subject || "general"}",
  "answer": "${answerGuidance}",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "explanation": "Detailed explanation of this step",
      ${expressionNote}
    }
  ],
  "conceptExplained": "A brief explanation of the key concept used",
  "tips": ["Study tip 1", "Study tip 2", "Study tip 3"],
  "relatedTopics": ["Related topic 1", "Related topic 2", "Related topic 3"]
}`;
}

function buildImageSolveSystemPrompt(subject: string | null | undefined): string {
  const base = buildSolveSystemPrompt(subject);
  return `You are an expert academic tutor with vision capabilities.
Analyze the image and identify any question, problem, or text in it.
Then answer or solve it completely.

${base}`;
}

function buildChatSystemPrompt(subject: string | null | undefined): string {
  const subjectContext: Record<string, string> = {
    algebra: "algebra and mathematics",
    calculus: "calculus and advanced mathematics",
    geometry: "geometry and spatial reasoning",
    trigonometry: "trigonometry and circular functions",
    statistics: "statistics and probability",
    arithmetic: "arithmetic and basic mathematics",
    precalculus: "pre-calculus and functions",
    linear_algebra: "linear algebra and matrices",
    differential_equations: "differential equations",
    number_theory: "number theory",
    american_literature: "American literature and literary analysis",
    british_literature: "British literature and literary analysis",
    world_literature: "world literature and literary analysis",
    composition: "writing and composition",
    creative_writing: "creative writing and storytelling",
    debate: "debate, rhetoric, and argumentation",
    journalism: "journalism and news writing",
    grammar: "grammar, language, and writing mechanics",
    poetry: "poetry and poetic analysis",
    biology: "biology and life sciences",
    chemistry: "chemistry and chemical sciences",
    physics: "physics and physical sciences",
    earth_science: "earth science and geology",
    space_science: "astronomy and space science",
    environmental_science: "environmental science and ecology",
    anatomy: "anatomy and physiology",
    forensics: "forensic science",
    general_science: "general science",
    us_history: "U.S. history and American studies",
    world_history: "world history and global studies",
    government: "government, civics, and political science",
    economics: "economics and financial literacy",
    geography: "geography and spatial studies",
    psychology: "psychology and human behavior",
    sociology: "sociology and social sciences",
    civics: "civics and citizenship",
  };

  const ctx = subject && subjectContext[subject]
    ? subjectContext[subject]
    : "all academic subjects including math, science, English/ELA, and social studies";

  return `You are StudyGenius AI, a friendly and expert academic tutor specializing in ${ctx}.
You help students understand concepts, answer questions, analyze texts, solve problems, and study effectively.
Be encouraging, clear, and pedagogical. Use examples when helpful.
Keep responses concise but complete. Format key terms in **bold**.
If showing math, write expressions clearly (e.g., x^2 + 3x - 4 = 0).`;
}

function buildPracticePrompt(subject: string, difficulty: string): string {
  const isEnglish = ["american_literature","british_literature","world_literature","composition","creative_writing","debate","journalism","grammar","poetry"].includes(subject);
  const isSocial = ["us_history","world_history","government","economics","geography","psychology","sociology","civics"].includes(subject);
  const isScience = ["biology","chemistry","physics","earth_science","space_science","environmental_science","anatomy","forensics","general_science"].includes(subject);

  let problemType = "math problem";
  if (isEnglish) problemType = "English/ELA question (e.g., analysis prompt, grammar question, vocabulary, or comprehension question)";
  else if (isSocial) problemType = "social studies question (e.g., historical analysis, cause-and-effect, definition, or short answer)";
  else if (isScience) problemType = "science question (e.g., conceptual question, calculation, diagram interpretation, or lab scenario)";

  return `You are an expert academic tutor. Generate a ${difficulty} ${subject} practice ${problemType}.

Always respond with valid JSON in this exact format:
{
  "id": "practice-${Date.now()}",
  "subject": "${subject}",
  "difficulty": "${difficulty}",
  "problem": "The practice question or problem statement",
  "answer": "The correct answer",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "explanation": "Explanation",
      "expression": "Optional: key formula, quote, or term"
    }
  ],
  "hints": ["Hint 1", "Hint 2", "Hint 3"]
}`;
}

function extractJsonFromContent(content: string | unknown): string {
  const text = typeof content === "string" ? content : JSON.stringify(content);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return jsonMatch[0];
}

// ─── Routers ────────────────────────────────────────────────────────────────

const academicRouter = router({
  solve: publicProcedure
    .input(z.object({
      problem: z.string().min(1).max(5000),
      subject: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = buildSolveSystemPrompt(input.subject);
      const result = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Question/Problem: ${input.problem}` },
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
      subject: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = buildImageSolveSystemPrompt(input.subject);
      const result = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Please identify and answer the question or problem in this image." },
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

  chat: publicProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
      subject: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = buildChatSystemPrompt(input.subject);
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
});

// Keep math as alias for backward compatibility
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
});

export type AppRouter = typeof appRouter;
