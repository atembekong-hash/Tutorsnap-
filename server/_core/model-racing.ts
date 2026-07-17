/**
 * Parallel model racing: send requests to multiple models simultaneously
 * Return whichever responds first with valid JSON
 */

import { invokeLLM } from "./llm";

export interface ModelRaceResult {
  winner: string; // Which model won
  response: string; // The response content
  confidence: number; // 0-100
  processingTime: number; // ms
}

export interface RaceConfig {
  models: string[]; // e.g., ["gemini-2.0-flash", "gpt-4o-mini"]
  messages: Array<{ role: "system" | "user"; content: any }>;
  maxTokens: number;
  timeout: number; // ms
}

/**
 * Extract JSON from response that may contain fenced code blocks or extra text
 */
function extractJsonFromResponse(text: string): string {
  // Try to find JSON in fenced code blocks first
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }

  // Try to find JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  // If no JSON found, return original text
  return text;
}

/**
 * Race multiple models in parallel
 * Returns first successful result, not first to finish
 */
export async function raceModels(config: RaceConfig): Promise<ModelRaceResult> {
  const startTime = Date.now();

  // Create promises for each model
  const racePromises = config.models.map((model) =>
    invokeModelWithTimeout(model, config, startTime)
  );

  // Use allSettled to get all results, then find first success
  const results = await Promise.allSettled(racePromises);

  // Find first successful result
  for (const result of results) {
    if (result.status === "fulfilled") {
      return result.value;
    }
  }

  // All models failed - throw error with details
  const errors = results
    .filter((r) => r.status === "rejected")
    .map((r) => {
      const reason = (r as PromiseRejectedResult).reason;
      return reason?.message || String(reason) || "Unknown error";
    })
    .join("; ");
  throw new Error(`All models failed in race: ${errors}`);
}

/**
 * Invoke a single model with timeout
 */
async function invokeModelWithTimeout(
  model: string,
  config: RaceConfig,
  startTime: number
): Promise<ModelRaceResult> {
  try {
    const result = await invokeLLM({
      model,
      messages: config.messages,
      max_tokens: config.maxTokens,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "solution",
          schema: {
            type: "object",
            properties: {
              answer: { type: "string" },
              steps: { type: "array", items: { type: "string" } },
              tips: { type: "array", items: { type: "string" } },
              problem: { type: "string" },
              conceptExplained: { type: "string" },
            },
            required: ["answer", "steps"],
          },
        },
      },
    });

    const processingTime = Date.now() - startTime;

    // Validate response
    let responseText = "";
    if (typeof result === "string") {
      responseText = result;
    } else if (result?.choices?.[0]?.message?.content) {
      const content = result.choices[0].message.content;
      responseText = typeof content === "string" ? content : JSON.stringify(content);
    }

    if (!responseText || responseText.length === 0) {
      throw new Error("Empty response from model");
    }

    // Extract JSON from response (handles fenced blocks, extra text, etc.)
    const jsonText = extractJsonFromResponse(responseText);

    // Validate JSON
    try {
      JSON.parse(jsonText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${jsonText.substring(0, 100)}`);
    }

    return {
      winner: model,
      response: jsonText,
      confidence: 85,
      processingTime,
    };
  } catch (error) {
    // Model failed - throw to trigger next in race
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Model ${model} failed: ${errorMsg}`);
  }
}

/**
 * Sequential fallback: try models one by one
 */
export async function sequentialFallback(
  config: RaceConfig
): Promise<ModelRaceResult> {
  const startTime = Date.now();

  for (const model of config.models) {
    try {
      const result = await invokeModelWithTimeout(model, config, startTime);
      return result;
    } catch (error) {
      console.warn(`Model ${model} failed, trying next:`, error);
      continue;
    }
  }

  throw new Error("All models failed in sequential fallback");
}
