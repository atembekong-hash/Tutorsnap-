import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "../shared/const";

const SOLVE_SYSTEM_PROMPT = `You are MathGenius AI, an expert mathematics tutor and solver. 
When given a math problem, you must:
1. Identify the subject area
2. Provide a clear, correct answer
3. Break down the solution into clear numbered steps
4. Explain the key concept
5. Provide helpful tips
6. Suggest related topics

Always respond with valid JSON in this exact format:
{
  "problem": "the original problem statement",
  "subject": "one of: algebra, calculus, geometry, trigonometry, statistics, arithmetic, linear_algebra, differential_equations, number_theory, other",
  "answer": "the final answer, clear and concise",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "explanation": "Detailed explanation of this step",
      "expression": "Optional: mathematical expression or equation for this step"
    }
  ],
  "conceptExplained": "A brief explanation of the key mathematical concept used",
  "tips": ["Tip 1", "Tip 2", "Tip 3"],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3"]
}`;

const IMAGE_SOLVE_SYSTEM_PROMPT = `You are MathGenius AI, an expert mathematics tutor and solver.
Analyze the image and identify any math problem in it.
Then solve it completely.

Always respond with valid JSON in this exact format:
{
  "problem": "the math problem you found in the image",
  "subject": "one of: algebra, calculus, geometry, trigonometry, statistics, arithmetic, linear_algebra, differential_equations, number_theory, other",
  "answer": "the final answer, clear and concise",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "explanation": "Detailed explanation of this step",
      "expression": "Optional: mathematical expression or equation for this step"
    }
  ],
  "conceptExplained": "A brief explanation of the key mathematical concept used",
  "tips": ["Tip 1", "Tip 2"],
  "relatedTopics": ["Topic 1", "Topic 2"]
}`;

const CHAT_SYSTEM_PROMPT = `You are MathGenius AI, a friendly and expert mathematics tutor.
You help students understand mathematical concepts, solve problems, and learn math effectively.
Be encouraging, clear, and pedagogical. Use examples when helpful.
Format mathematical expressions clearly. Keep responses concise but complete.`;

function extractJsonFromContent(content: string | unknown): string {
  const text = typeof content === "string" ? content : JSON.stringify(content);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return jsonMatch[0];
}

const mathRouter = router({
  solve: publicProcedure
    .input(z.object({ problem: z.string().min(1).max(5000) }))
    .mutation(async ({ input }) => {
      const result = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SOLVE_SYSTEM_PROMPT },
          { role: "user", content: `Solve this math problem: ${input.problem}` },
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
    }))
    .mutation(async ({ input }) => {
      const result = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: IMAGE_SOLVE_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Please identify and solve the math problem in this image." },
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
      const practicePrompt = `You are MathGenius AI, an expert mathematics tutor.
Generate a practice problem for the given subject and difficulty level.

Always respond with valid JSON in this exact format:
{
  "id": "practice-${Date.now()}",
  "subject": "${input.subject}",
  "difficulty": "${input.difficulty}",
  "problem": "The practice problem statement",
  "answer": "The correct answer",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "explanation": "Explanation",
      "expression": "Optional expression"
    }
  ],
  "hints": ["Hint 1", "Hint 2", "Hint 3"]
}`;

      const result = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: practicePrompt },
          { role: "user", content: `Generate a ${input.difficulty} ${input.subject} practice problem.` },
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
    }))
    .mutation(async ({ input }) => {
      const result = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: CHAT_SYSTEM_PROMPT },
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
  auth: authRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
