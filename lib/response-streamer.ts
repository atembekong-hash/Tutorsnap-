/**
 * Response streaming handler for progressive answer display
 * Streams text as it arrives instead of waiting for full response
 */

export interface StreamConfig {
  chunkSize: number; // Characters to display per chunk
  delayMs: number; // Delay between chunks (ms)
  enableStreaming: boolean; // true to stream, false for instant display
}

const DEFAULT_CONFIG: StreamConfig = {
  chunkSize: 3,
  delayMs: 20,
  enableStreaming: true,
};

/**
 * Stream text progressively
 */
export async function streamText(
  text: string,
  onChunk: (chunk: string, fullText: string) => void,
  config: Partial<StreamConfig> = {}
): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!finalConfig.enableStreaming) {
    onChunk(text, text);
    return;
  }

  let displayedText = "";

  for (let i = 0; i < text.length; i += finalConfig.chunkSize) {
    const chunk = text.slice(i, i + finalConfig.chunkSize);
    displayedText += chunk;
    onChunk(chunk, displayedText);

    // Add delay between chunks
    if (i + finalConfig.chunkSize < text.length) {
      await new Promise((resolve) => setTimeout(resolve, finalConfig.delayMs));
    }
  }
}

/**
 * Stream JSON response progressively
 */
export async function streamJsonResponse(
  jsonString: string,
  onUpdate: (partial: any) => void,
  config: Partial<StreamConfig> = {}
): Promise<any> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!finalConfig.enableStreaming) {
    try {
      const full = JSON.parse(jsonString);
      onUpdate(full);
      return full;
    } catch {
      throw new Error("Invalid JSON");
    }
  }

  let buffer = "";
  let lastValidJson: any = null;

  for (let i = 0; i < jsonString.length; i += finalConfig.chunkSize) {
    const chunk = jsonString.slice(i, i + finalConfig.chunkSize);
    buffer += chunk;

    // Try to parse accumulated buffer
    try {
      const partial = JSON.parse(buffer);
      lastValidJson = partial;
      onUpdate(partial);
    } catch {
      // Not valid JSON yet, continue accumulating
    }

    // Add delay between chunks
    if (i + finalConfig.chunkSize < jsonString.length) {
      await new Promise((resolve) => setTimeout(resolve, finalConfig.delayMs));
    }
  }

  // Ensure final parse succeeds
  try {
    const final = JSON.parse(jsonString);
    onUpdate(final);
    return final;
  } catch {
    if (lastValidJson) {
      return lastValidJson;
    }
    throw new Error("Failed to parse JSON response");
  }
}
