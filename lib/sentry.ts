/**
 * Sentry crash reporting integration
 *
 * Initialises Sentry with the DSN from the EXPO_PUBLIC_SENTRY_DSN environment
 * variable. If the variable is not set, Sentry is silently disabled so the app
 * still works without a Sentry account.
 *
 * Usage:
 *   import { initSentry, captureError } from "@/lib/sentry";
 *   initSentry();                          // call once at app start
 *   captureError(err, { context: "..." }); // call anywhere an error is caught
 */
import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";
import Constants from "expo-constants";

// DSN is read from the EXPO_PUBLIC_SENTRY_DSN env var (set via webdev_request_secrets)
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

let _initialised = false;

/**
 * Initialise Sentry. Call once at the root of the app (before any rendering).
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initSentry(): void {
  if (_initialised || !DSN || Platform.OS === "web") return;
  _initialised = true;

  Sentry.init({
    dsn: DSN,
    // Capture 100% of transactions in dev, 10% in production
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    // Attach app version and build number to every event
    release: `${Constants.expoConfig?.name}@${Constants.expoConfig?.version}`,
    dist: String(
      (Constants.expoConfig?.ios?.buildNumber ??
        Constants.expoConfig?.android?.versionCode) ?? "0"
    ),
    // Useful breadcrumbs for debugging crashes
    attachStacktrace: true,
    // Don't send events in development unless explicitly requested
    enabled: !__DEV__,
    beforeSend(event) {
      // Strip any PII from the event before sending
      if (event.user?.email) {
        event.user.email = "[redacted]";
      }
      return event;
    },
  });
}

/**
 * Capture an error and send it to Sentry with optional extra context.
 * Safe to call even if Sentry is not initialised (no-op).
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!_initialised) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Add a breadcrumb for navigation or user action tracking.
 */
export function addBreadcrumb(
  message: string,
  category: "navigation" | "ui" | "network" | "error" = "ui",
  data?: Record<string, unknown>
): void {
  if (!_initialised) return;
  Sentry.addBreadcrumb({ message, category, data, level: "info" });
}

/**
 * Set the current user context (non-PII only — no email).
 */
export function setSentryUser(userId: string | null): void {
  if (!_initialised) return;
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
