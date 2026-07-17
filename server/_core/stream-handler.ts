/**
 * Streaming response handler for incremental answer delivery.
 * Parses AI responses and yields chunks for progressive UI updates.
 */

export interface StreamChunk {
  type: "answer" | "step" | "tip" | "complete" | "error";
  content: string;
  index?: number;
}

/**
 * Parse a complete solver response and yield chunks for streaming.
 * This allows the client to show the answer immediately, then steps, then tips.
 */
export async function* streamSolverResponse(response: any): AsyncGenerator<StreamChunk> {
  try {
    // Yield answer immediately
    if (response.answer) {
      yield {
        type: "answer",
        content: response.answer,
      };
    }

    // Yield steps one by one
    if (response.steps && Array.isArray(response.steps)) {
      for (let i = 0; i < response.steps.length; i++) {
        yield {
          type: "step",
          content: response.steps[i],
          index: i + 1,
        };
      }
    }

    // Yield tips
    if (response.tips) {
      yield {
        type: "tip",
        content: response.tips,
      };
    }

    // Signal completion
    yield {
      type: "complete",
      content: "Answer complete",
    };
  } catch (err) {
    yield {
      type: "error",
      content: err instanceof Error ? err.message : "Streaming error",
    };
  }
}

/**
 * Convert an async generator to a readable stream for HTTP response.
 * Used for Server-Sent Events (SSE) streaming.
 */
export function createSSEStream(generator: AsyncGenerator<StreamChunk>) {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
