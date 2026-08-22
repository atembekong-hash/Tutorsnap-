/**
 * Google ID Token Auto-Refresh
 *
 * Google ID tokens expire after 1 hour. This module silently refreshes the
 * stored auth_token using GoogleSignin.getTokens() (which always returns a
 * fresh token) so long-running sessions stay authenticated without forcing
 * the user to sign in again.
 *
 * Usage: call startTokenRefreshTimer() once after a successful sign-in.
 *        call stopTokenRefreshTimer() on sign-out.
 */

import { Platform } from "react-native";
import { setAuthTokens, setSessionToken, getAuthToken, isTokenExpired } from "@/lib/_core/auth-enhanced";
import { validateOAuthCredentials } from "@/lib/oauth-service";

let _refreshTimer: ReturnType<typeof setInterval> | null = null;

// Refresh 5 minutes before the 1-hour expiry (i.e. every 55 minutes)
const REFRESH_INTERVAL_MS = 55 * 60 * 1000;

/**
 * Silently refresh the Google ID token and update stored auth tokens.
 * No-ops on web (Google Sign-In is not supported there).
 */
export async function refreshGoogleToken(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");

    // getTokens() always returns a fresh idToken without showing any UI
    const tokens = await GoogleSignin.getTokens();
    if (!tokens?.idToken) {
      console.warn("[TokenRefresh] getTokens() returned no idToken");
      return false;
    }

    // Exchange the fresh Google ID token for a fresh TutorSnap session JWT.
    // tRPC protected procedures accept only the latter, not a provider token.
    const validated = await validateOAuthCredentials({
      provider: "google",
      idToken: tokens.idToken,
    });
    if (!validated.success || !validated.token) {
      console.warn("[TokenRefresh] Backend did not issue a session token");
      return false;
    }

    await setSessionToken(validated.token);
    await setAuthTokens({
      accessToken: tokens.idToken,
      refreshToken: tokens.idToken,
      expiresAt: Date.now() + 60 * 60 * 1000,
      refreshExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    return true;
  } catch (error) {
    // Token refresh failure is non-fatal — the user will be prompted to sign in
    // again when they next open the app if the stored token has expired.
    console.warn("[TokenRefresh] Failed to refresh Google token:", error);
    return false;
  }
}

/**
 * Start the background token refresh timer.
 * Call this once after a successful Google Sign-In.
 */
export function startTokenRefreshTimer(): void {
  if (Platform.OS === "web") return;
  stopTokenRefreshTimer(); // Clear any existing timer first

  _refreshTimer = setInterval(async () => {
    try {
      const expired = await isTokenExpired();
      if (expired) {
        // console.log("[TokenRefresh] Token expired — attempting refresh");
        await refreshGoogleToken();
      } else {
        // Proactively refresh 5 min before expiry
        await refreshGoogleToken();
      }
    } catch { /* non-critical */ }
  }, REFRESH_INTERVAL_MS);

  // console.log("[TokenRefresh] Token refresh timer started (interval: 55 min)");
}

/**
 * Stop the background token refresh timer.
 * Call this on sign-out.
 */
export function stopTokenRefreshTimer(): void {
  if (_refreshTimer !== null) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
    // console.log("[TokenRefresh] Token refresh timer stopped");
  }
}

/**
 * Check if the current token needs refreshing and refresh it if so.
 * Call this on app foreground/resume.
 */
export async function refreshTokenIfNeeded(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const token = await getAuthToken();
    if (!token) return; // Not signed in
    const expired = await isTokenExpired();
    if (expired) {
      // console.log("[TokenRefresh] Token expired on resume — refreshing");
      await refreshGoogleToken();
    }
  } catch { /* non-critical */ }
}
