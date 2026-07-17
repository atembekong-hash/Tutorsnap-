import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "../shared/const";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";

// ─── Utility functions ─────────────────────────────────────────────────────────

/**
 * Extract JSON from LLM response that may contain markdown fences or extra text
 */
function extractJsonFromContent(text: string): string {
  // Try to find JSON in markdown code fence
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return text;
}

/**
 * Repair truncated JSON by adding missing closing braces
 */
function repairTruncatedJson(json: string): string {
  let repaired = json.trim();
  let braceCount = 0;
  let bracketCount = 0;

  for (const char of repaired) {
    if (char === "{") braceCount++;
    if (char === "}") braceCount--;
    if (char === "[") bracketCount++;
    if (char === "]") bracketCount--;
  }

  while (braceCount > 0) {
    repaired += "}";
    braceCount--;
  }
  while (bracketCount > 0) {
    repaired += "]";
    bracketCount--;
  }

  return repaired;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const IMAGE_SOLVE_SYSTEM_PROMPT = `You are an expert math tutor. Analyze the math problem in the image and provide a comprehensive solution.

Return a JSON object with this exact structure:
{
  "problem": "The problem statement extracted from the image",
  "answer": "The final answer",
  "steps": ["Step 1 explanation", "Step 2 explanation", ...],
  "conceptExplained": "Key concept explanation",
  "tips": ["Tip 1", "Tip 2", ...],
  "subject": "The subject (e.g., algebra, geometry, calculus)"
}

Be thorough, clear, and educational.`;

function gradeContext(gradeLevel?: string): string {
  if (!gradeLevel) return "";
  const levelMap: Record<string, string> = {
    elementary: "Explain for elementary school level (simple language, basic concepts).",
    middle_school: "Explain for middle school level (intermediate concepts).",
    high_school: "Explain for high school level (advanced concepts, formulas).",
    college: "Explain for college level (rigorous, theoretical).",
  };
  return `\n\nTarget audience: ${levelMap[gradeLevel] || "General audience"}`;
}

// ─── LLM helpers ──────────────────────────────────────────────────────────────

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
  solveFromImage: publicProcedure
    .input(z.object({
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      subject: z.string().default("other"),
      gradeLevel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      try {
        const imageSizeKB = (input.imageBase64.length / 1024).toFixed(1);
        console.log(`[solveFromImage] Starting. Image size: ${imageSizeKB}KB`);

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
          model: "gpt-5-nano" as const, // FASTEST model: 3-5x faster than Gemini for 10x speedup
          messages,
          max_tokens: 800, // Aggressive reduction: fast answer over perfect detail
          response_format: { type: "json_object" as const },
        };

        const llmStartTime = Date.now();
        // Fallback to gpt-5-mini if nano fails (still very fast)
        const jsonStr = await invokeLLMWithFallback("gpt-5-nano", "gpt-5-mini", params);
        const llmTime = Date.now() - llmStartTime;
        console.log(`[solveFromImage] LLM response received in ${llmTime}ms`);

        const result = JSON.parse(jsonStr);
        const totalTime = Date.now() - startTime;
        console.log(`[solveFromImage] Complete in ${totalTime}ms (LLM: ${llmTime}ms)`);

        return result;
      } catch (err: unknown) {
        const totalTime = Date.now() - startTime;
        console.error(`[solveFromImage] Error after ${totalTime}ms:`, err instanceof Error ? err.message : err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : "Failed to process image. Please try again." });
      }
    }),
});

// ─── Export ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  academic: academicRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
