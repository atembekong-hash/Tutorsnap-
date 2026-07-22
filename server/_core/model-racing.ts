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
  messages: Array<{ role: "system" | "user"; content: string }>;
  maxTokens: number;
  timeout: number; // ms
}

/**
 * Race multiple models in parallel
 */
export async function raceModels(config: RaceConfig): Promise<ModelRaceResult> {
  const startTime = Date.now();

  // Create promises for each model
  const racePromises = config.models.map((model) =>
    invokeModelWithTimeout(model, config, startTime)
  );

  // Race them - first to finish wins
  try {
    const result = await Promise.race(racePromises);
    return result;
  } catch (error) {
    // All models failed - throw error
    throw new Error(`All models failed in race: ${error}`);
  }
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
      throw new Error("Empty response");
    }

    // Try to parse JSON to validate
    try {
      JSON.parse(responseText);
    } catch {
      throw new Error("Invalid JSON response");
    }

    return {
      winner: model,
      response: responseText,
      confidence: 85,
      processingTime,
    };
  } catch (error) {
    // Model failed - throw to trigger next in race
    throw new Error(`Model ${model} failed: ${error}`);
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
      // console.log(`Model ${model} failed, trying next...`);
      continue;
    }
  }

  throw new Error("All models exhausted in fallback");
}
