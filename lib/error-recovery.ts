/**
 * Comprehensive error recovery with exponential backoff retry logic
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attemptsUsed: number;
  totalTimeMs: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
  timeoutMs: 60000, // 60 seconds per attempt
};

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;
  let totalTimeMs = 0;
  let attempt = 0;

  for (attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      // Execute with timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Request timeout")),
            finalConfig.timeoutMs
          )
        ),
      ]);

      return {
        success: true,
        data: result as T,
        attemptsUsed: attempt + 1,
        totalTimeMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < finalConfig.maxRetries) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.initialDelayMs * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelayMs
        );

        totalTimeMs += delay;

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError || new Error("Unknown error"),
    attemptsUsed: attempt,
    totalTimeMs,
  };
}

/**
 * Retry multiple operations in parallel with fallback
 */
export async function retryParallel<T>(
  operations: Array<{ name: string; fn: () => Promise<T> }>,
  config: Partial<RetryConfig> = {}
): Promise<{ winner: string; data: T; totalTimeMs: number } | null> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  const promises = operations.map(async (op) => {
    const result = await retryWithBackoff(op.fn, finalConfig);
    return {
      name: op.name,
      ...result,
    };
  });

  // Return first successful result
  for (const promise of promises) {
    try {
      const result = await promise;
      if (result.success && result.data !== undefined) {
        return {
          winner: result.name,
          data: result.data as T,
          totalTimeMs: Date.now() - startTime,
        };
      }
    } catch {
      // Continue to next
    }
  }

  // All failed
  return null;
}

/**
 * Validate response format
 */
export function validateResponse(data: any, schema: any): boolean {
  if (!data) return false;

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) return false;
    }
  }

  // Check field types
  if (schema.properties) {
    for (const [field, fieldSchema] of Object.entries(schema.properties)) {
      if (field in data && (fieldSchema as any).type) {
        const expectedType = (fieldSchema as any).type;
        const actualType = typeof data[field];
        if (actualType !== expectedType) return false;
      }
    }
  }

  return true;
}

/**
 * Determine if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes("network") || message.includes("timeout")) return true;
  if (message.includes("econnrefused") || message.includes("econnreset")) return true;

  // Server errors (5xx)
  if (message.includes("500") || message.includes("503")) return true;

  // Rate limiting
  if (message.includes("429") || message.includes("rate limit")) return true;

  // Temporary failures
  if (message.includes("temporarily")) return true;

  return false;
}
