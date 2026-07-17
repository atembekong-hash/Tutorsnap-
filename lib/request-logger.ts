/**
 * Comprehensive request logging infrastructure
 * Traces every request from frontend through to response
 */

// Simple UUID v4 generator (no external dependency needed)
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface RequestLog {
  correlationId: string;
  timestamp: number;
  endpoint: string;
  method: string;
  headers?: Record<string, string>;
  payload?: any;
  responseCode?: number;
  responseBody?: any;
  latency?: number;
  retryAttempt?: number;
  error?: string;
  errorStack?: string;
  authStatus?: "authenticated" | "unauthenticated" | "expired" | "invalid";
  source: "frontend" | "backend";
}

class RequestLogger {
  private logs: RequestLog[] = [];
  private maxLogs = 1000;

  generateCorrelationId(): string {
    return generateUUID();
  }

  logFrontendRequest(
    endpoint: string,
    method: string,
    payload?: any,
    correlationId?: string
  ): RequestLog {
    const log: RequestLog = {
      correlationId: correlationId || this.generateCorrelationId(),
      timestamp: Date.now(),
      endpoint,
      method,
      payload,
      source: "frontend",
    };

    this.addLog(log);
    console.log(`[REQUEST] ${log.correlationId} → ${method} ${endpoint}`);
    if (payload) {
      console.log(`[PAYLOAD] ${log.correlationId}:`, JSON.stringify(payload).substring(0, 200));
    }

    return log;
  }

  logFrontendResponse(
    correlationId: string,
    responseCode: number,
    responseBody?: any,
    latency?: number
  ): void {
    const log = this.logs.find((l) => l.correlationId === correlationId);
    if (log) {
      log.responseCode = responseCode;
      log.responseBody = responseBody;
      log.latency = latency;
      console.log(`[RESPONSE] ${correlationId} ← ${responseCode} (${latency}ms)`);
      if (responseBody) {
        console.log(`[BODY] ${correlationId}:`, JSON.stringify(responseBody).substring(0, 200));
      }
    }
  }

  logFrontendError(
    correlationId: string,
    error: Error,
    authStatus?: RequestLog["authStatus"]
  ): void {
    const log = this.logs.find((l) => l.correlationId === correlationId);
    if (log) {
      log.error = error.message;
      log.errorStack = error.stack;
      log.authStatus = authStatus;
      console.error(`[ERROR] ${correlationId}:`, error.message);
      console.error(`[STACK] ${correlationId}:`, error.stack);
    }
  }

  logRetry(correlationId: string, attempt: number, waitTime: number): void {
    console.log(`[RETRY] ${correlationId} - Attempt ${attempt}, waiting ${waitTime}ms`);
  }

  logAuthStatus(correlationId: string, status: RequestLog["authStatus"]): void {
    const log = this.logs.find((l) => l.correlationId === correlationId);
    if (log) {
      log.authStatus = status;
      console.log(`[AUTH] ${correlationId}: ${status}`);
    }
  }

  addLog(log: RequestLog): void {
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getLogs(filter?: { correlationId?: string; endpoint?: string; error?: boolean }): RequestLog[] {
    if (!filter) return this.logs;

    return this.logs.filter((log) => {
      if (filter.correlationId && log.correlationId !== filter.correlationId) return false;
      if (filter.endpoint && log.endpoint !== filter.endpoint) return false;
      if (filter.error && !log.error) return false;
      return true;
    });
  }

  getLog(correlationId: string): RequestLog | undefined {
    return this.logs.find((l) => l.correlationId === correlationId);
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const requestLogger = new RequestLogger();
