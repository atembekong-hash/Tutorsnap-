/**
 * Sentry server-side SDK initialisation — @sentry/node only.
 *
 * IMPORTANT: This is completely separate from the client SDK (@sentry/react-native).
 * No Expo plugin is involved. This runs only in the Node.js server process.
 */
import * as Sentry from "@sentry/node";
import { ENV } from "./env";

// Use the same DSN as the client — stored in SENTRY_DSN (server-side, not EXPO_PUBLIC_)
const DSN = process.env.SENTRY_DSN ?? process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

type EnvironmentMap = Record<string, string | undefined>;

export function resolveSentryEnvironment(
  env: EnvironmentMap = process.env,
): string {
  return (
    env.SENTRY_ENVIRONMENT?.trim() ||
    env.RAILWAY_ENVIRONMENT_NAME?.trim() ||
    (env.NODE_ENV === "production" ? "production" : "development")
  );
}

export function resolveSentryRelease(
  env: EnvironmentMap = process.env,
): string | undefined {
  const version = env.APP_VERSION?.trim() || env.RELEASE_VERSION?.trim();
  return version ? `tutorsnap-api@${version}` : undefined;
}

export function initSentryServer(): void {
  if (!DSN) {
    if (!ENV.isProduction) {
      console.log("[Sentry Server] SENTRY_DSN not set — Sentry server disabled");
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: resolveSentryEnvironment(),
    release: resolveSentryRelease(),
    enabled: ENV.isProduction,
    tracesSampleRate: ENV.isProduction ? 0.1 : 1.0,
  });
}

export function captureServerError(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}
