/**
 * OpenAI integration for math problem solving
 * Uses gpt-4o for best accuracy on image-based math problems
 */

// Use native fetch (available in Node 18+)

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; [key: string]: any }>;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens: number;
  response_format?: { type: string; [key: string]: any };
  temperature?: number;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_API_URL = `${OPENAI_API_BASE}/chat/completions`;

if (!OPENAI_API_KEY) {
  console.warn("[OpenAI] OPENAI_API_KEY not set. Image solving will fail.");
}

console.log(`[OpenAI] Using API endpoint: ${OPENAI_API_URL}`);

/**
 * Call OpenAI API with retry logic
 */
export async function callOpenAI(request: OpenAIRequest): Promise<OpenAIResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[OpenAI] Attempt ${attempt + 1}/${maxRetries} with model ${request.model}`);

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `OpenAI API error: ${response.status} ${response.statusText} – ${errorText}`;
        console.error(`[OpenAI] ${errorMessage}`);

        // Check for specific errors
        if (response.status === 401) {
          throw new Error("Authentication failed: Invalid API key");
        } else if (response.status === 429) {
          // Rate limit - wait and retry
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`[OpenAI] Rate limited. Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        } else if (response.status === 500 || response.status === 503) {
          // Server error - retry with backoff
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`[OpenAI] Server error. Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        } else {
          throw new Error(errorMessage);
        }
      }

      const data = (await response.json()) as OpenAIResponse;
      console.log(`[OpenAI] Success with ${request.model}. Tokens: ${data.usage?.total_tokens ?? "unknown"}`);
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[OpenAI] Attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`[OpenAI] Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error("OpenAI API call failed after all retries");
}

/**
 * Solve a math problem from an image using OpenAI
 */
export async function solveImageWithOpenAI(
  imageBase64: string,
  mimeType: string,
  subject: string,
  systemPrompt: string
): Promise<string> {
  const request: OpenAIRequest = {
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Please identify and answer the question in this image. Subject hint: ${subject}`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
    max_tokens: 1500,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "solution",
        schema: {
          type: "object",
          properties: {
            problem: { type: "string" },
            subject: { type: "string" },
            answer: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  stepNumber: { type: "number" },
                  title: { type: "string" },
                  explanation: { type: "string" },
                  expression: { type: "string" },
                },
                required: ["stepNumber", "title", "explanation"],
              },
            },
            conceptExplained: { type: "string" },
            tips: {
              type: "array",
              items: { type: "string" },
            },
            workedExample: {
              type: "object",
              properties: {
                problem: { type: "string" },
                solution: { type: "string" },
              },
            },
          },
          required: ["problem", "subject", "answer", "steps"],
        },
      },
    },
  };

  const response = await callOpenAI(request);
  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  return content;
}
