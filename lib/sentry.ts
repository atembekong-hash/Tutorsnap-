/**
 * Sentry client SDK initialisation — JS-only, no Expo plugin.
 *
 * IMPORTANT: @sentry/react-native/expo is intentionally NOT added to app.config.ts plugins.
 * The Sentry Android Gradle Plugin (SAGP) it injects (v6.15.0) is incompatible with
 * React Native 0.81 / Expo SDK 54 and causes a native crash on startup.
 * JS-level crash reporting works perfectly without the native plugin.
 */
import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

export function initSentry(): void {
  if (!DSN) {
    if (__DEV__) {
      console.log("[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — Sentry disabled");
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    // Disable native crash handling — JS-only mode
    enableNative: false,
    // Only send events in production
    enabled: !__DEV__,
    // Capture 100% of transactions in dev, 10% in production
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    environment: __DEV__ ? "development" : "production",
    // Tag every event with platform
    initialScope: {
      tags: {
        platform: Platform.OS,
      },
    },
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
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

export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

export { Sentry };
