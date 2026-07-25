/**
 * Server-side Sentry integration using @sentry/node.
 *
 * Initialised once at server startup. Captures unhandled exceptions,
 * promise rejections, and explicit captureServerError() calls from
 * tRPC route handlers.
 *
 * Usage:
 *   import { initSentryServer, captureServerError } from "./_core/sentry-server";
 *   initSentryServer();  // call once in server/_core/index.ts
 *   captureServerError(err, { procedure: "academic.solve" });
 */
import * as Sentry from "@sentry/node";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";
let _initialised = false;

/**
 * Initialise Sentry for the Node.js server process.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initSentryServer(): void {
  if (_initialised || !DSN) return;
  _initialised = true;

  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV ?? "development",
    // 10% of transactions sampled in production to avoid quota burn
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Capture unhandled rejections and exceptions automatically
    integrations: [
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
    ],
    beforeSend(event) {
      // Strip any PII from user fields before sending
      if (event.user?.email) {
        event.user.email = "[redacted]";
      }
      return event;
    },
  });
}

/**
 * Capture a server-side error with optional context tags.
 * Safe to call even if Sentry is not initialised (no-op).
 */
export function captureServerError(
  error: unknown,
  context?: {
    procedure?: string;
    userId?: number;
    subject?: string;
    extra?: Record<string, unknown>;
  }
): void {
  if (!_initialised) return;
  Sentry.withScope((scope) => {
    if (context?.procedure) scope.setTag("procedure", context.procedure);
    if (context?.subject) scope.setTag("subject", context.subject);
    if (context?.userId) scope.setUser({ id: String(context.userId) });
    if (context?.extra) scope.setExtras(context.extra);
    Sentry.captureException(error);
  });
}

/**
 * Add a server-side breadcrumb for tracing request flow.
 */
export function addServerBreadcrumb(
  message: string,
  category: "trpc" | "db" | "llm" | "auth" = "trpc",
  data?: Record<string, unknown>
): void {
  if (!_initialised) return;
  Sentry.addBreadcrumb({ message, category, data, level: "info" });
}

export { Sentry as SentryNode };
