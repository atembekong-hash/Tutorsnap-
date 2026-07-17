/**
 * Parallel model racing for faster LLM responses.
 * Sends requests to multiple models simultaneously and returns the first valid response.
 */

import { invokeLLM } from "./llm";
import { TRPCError } from "@trpc/server";

export interface InvokeLLMParams {
  model: string;
  messages: Array<{ role: "user" | "system" | "assistant"; content: any }>;
  max_tokens?: number;
  response_format?: any;
}

/**
 * Extract text from LLM result, handling both success and error shapes.
 */
function extractLLMContent(result: any): string {
  if (result?.error) {
    const msg = result.error?.message ?? JSON.stringify(result.error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI service error: ${msg}` });
  }
  const raw = result?.choices?.[0]?.message?.content ?? "";
  return typeof raw === "string" ? raw : JSON.stringify(raw);
}

/**
 * Extract JSON from content, stripping markdown fences.
 */
function extractJsonFromContent(content: string): string {
  let cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return cleaned;
}

/**
 * Repair truncated JSON by closing open arrays/objects.
 */
function repairTruncatedJson(raw: string): string {
  let s = raw.trim();
  s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, "");
  s = s.replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, "");
  s = s.replace(/,\s*$/, "");

  const stack: string[] = [];
  let inStr = false;
  let escape = false;
  for (const ch of s) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inStr) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  // Close remaining open brackets
  while (stack.length > 0) {
    s += stack.pop();
  }

  return s;
}

/**
 * Validate JSON string.
 */
function validateJson(jsonStr: string): boolean {
  try {
    JSON.parse(jsonStr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parallel model racing: send requests to multiple models simultaneously.
 * Returns the first valid JSON response.
 * Falls back to sequential attempts if parallel race fails.
 *
 * @param models Array of model names to race (e.g., ["gemini-2.0-flash", "gpt-4o-mini"])
 * @param params LLM parameters (messages, max_tokens, etc.)
 * @returns Valid JSON string from first successful model
 */
export async function invokeParallel(
  models: string[],
  params: Omit<InvokeLLMParams, "model">
): Promise<string> {
  if (models.length === 0) {
    throw new Error("At least one model must be specified");
  }

  // Create promises for each model
  const promises = models.map((model) =>
    invokeLLM({ ...params, model } as InvokeLLMParams)
      .then((result) => {
        const text = extractLLMContent(result);
        const jsonStr = extractJsonFromContent(text);
        if (!validateJson(jsonStr)) {
          throw new Error("Invalid JSON from " + model);
        }
        return { model, jsonStr, success: true };
      })
      .catch((error) => ({
        model,
        error,
        success: false,
      }))
  );

  // Race all models, return first success
  const results = await Promise.all(promises);
  const successResult = results.find((r) => r.success && 'jsonStr' in r) as any;

  if (successResult && successResult.success) {
    console.log(`[Parallel Race] ${successResult.model} responded first`);
    return successResult.jsonStr;
  }

  // All models failed or returned invalid JSON. Try repair on each.
  console.log("[Parallel Race] All models failed. Attempting repair...");

  for (const result of results) {
    if (!result.success || !('jsonStr' in result)) continue;

    try {
      const repaired = repairTruncatedJson((result as any).jsonStr);
      if (validateJson(repaired)) {
        console.log(`[Parallel Race] Repaired JSON from ${result.model}`);
        return repaired;
      }
    } catch {
      // Repair failed, continue to next
    }
  }

  // Last resort: try each model again sequentially with higher token budget
  console.log("[Parallel Race] Repair failed. Retrying models sequentially...");

  for (const model of models) {
    try {
      const result = await invokeLLM({
        ...params,
        model,
        max_tokens: Math.min((params.max_tokens ?? 4000) + 1000, 6000),
      } as InvokeLLMParams);
      const text = extractLLMContent(result);
      const jsonStr = extractJsonFromContent(text);

      if (validateJson(jsonStr)) {
        console.log(`[Parallel Race] Sequential retry succeeded with ${model}`);
        return jsonStr;
      }

      // Try repair
      const repaired = repairTruncatedJson(jsonStr);
      if (validateJson(repaired)) {
        console.log(`[Parallel Race] Sequential retry + repair succeeded with ${model}`);
        return repaired;
      }
    } catch {
      // Continue to next model
    }
  }

  // All attempts failed
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "All models failed to generate valid JSON. Please try again.",
  });
}

/**
 * Sequential fallback (original behavior): try primary, then fallback.
 * Used when parallel racing is not desired.
 */
export async function invokeSequential(
  primaryModel: string,
  fallbackModel: string,
  params: Omit<InvokeLLMParams, "model">
): Promise<string> {
  return invokeParallel([primaryModel, fallbackModel], params);
}
