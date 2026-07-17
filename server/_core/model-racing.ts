/**
 * Parallel model racing: send requests to multiple models simultaneously
 * Return whichever responds first with valid JSON
 */

import { solveImageWithOpenAI } from "./openai-integration";

export interface ModelRaceResult {
  winner: string; // Which model won
  response: string; // The response content
  confidence: number; // 0-100
  processingTime: number; // ms
}

export interface RaceConfig {
  imageBase64: string;
  mimeType: string;
  subject: string;
  systemPrompt: string;
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
 * Use OpenAI gpt-4o to solve math problems from images
 * Returns successful result with processing time
 */
export async function raceModels(config: RaceConfig): Promise<ModelRaceResult> {
  const startTime = Date.now();

  try {
    console.log("[Model Race] Using OpenAI gpt-4o for image solving...");
    const response = await solveImageWithOpenAI(
      config.imageBase64,
      config.mimeType,
      config.subject,
      config.systemPrompt
    );

    const processingTime = Date.now() - startTime;
    console.log(`[Model Race] gpt-4o succeeded in ${processingTime}ms`);

    return {
      winner: "gpt-4o",
      response,
      confidence: 95,
      processingTime,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Model Race] OpenAI gpt-4o failed:", errorMsg);
    throw new Error(`OpenAI gpt-4o failed: ${errorMsg}`);
  }
}


