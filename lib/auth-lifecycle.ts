/**
 * Auth Lifecycle Manager
 * Handles token refresh, logout, session restoration, and error recovery
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check session every minute

export interface StoredSession {
  idToken: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt: number;
  provider: "google" | "apple";
  userId: string;
}

interface TokenPayload {
  iat: number;
  exp: number;
  sub: string;
  email?: string;
  [key: string]: any;
}

/**
 * Decode JWT token without verification (for client-side expiry checking)
 */
function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const decoded = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf-8")
    );
    return decoded;
  } catch (error) {
    console.error("[Auth] Token decode failed:", error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;

  const expiresAt = payload.exp * 1000;
  const now = Date.now();
  return now >= expiresAt;
}

/**
 * Check if token is about to expire (within buffer)
 */
export function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;

  const expiresAt = payload.exp * 1000;
  const now = Date.now();
  return now >= expiresAt - TOKEN_EXPIRY_BUFFER;
}

/**
 * Get time until token expiry in milliseconds
 */
export function getTokenExpiryTime(token: string): number {
  const payload = decodeToken(token);
  if (!payload) return 0;

  const expiresAt = payload.exp * 1000;
  const now = Date.now();
  return Math.max(0, expiresAt - now);
}

/**
 * Save session securely
 */
export async function saveSession(session: StoredSession): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem("tutorsnap_session", JSON.stringify(session));
    } else {
      await SecureStore.setItemAsync("tutorsnap_session", JSON.stringify(session));
    }
    console.log("[Auth] Session saved securely");
  } catch (error) {
    console.error("[Auth] Failed to save session:", error);
    throw error;
  }
}

/**
 * Retrieve stored session
 */
export async function getStoredSession(): Promise<StoredSession | null> {
  try {
    const sessionStr = Platform.OS === "web"
      ? localStorage.getItem("tutorsnap_session")
      : await SecureStore.getItemAsync("tutorsnap_session");
    if (!sessionStr) return null;

    const session = JSON.parse(sessionStr) as StoredSession;

    // Validate session structure
    if (!session.idToken || !session.provider || !session.userId) {
      console.warn("[Auth] Invalid session structure, clearing");
      await clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error("[Auth] Failed to retrieve session:", error);
    return null;
  }
}

/**
 * Clear session completely
 */
export async function clearSession(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem("tutorsnap_session");
      localStorage.removeItem("google_id_token");
      localStorage.removeItem("google_access_token");
      localStorage.removeItem("google_refresh_token");
    } else {
      await SecureStore.deleteItemAsync("tutorsnap_session");
      await SecureStore.deleteItemAsync("google_id_token");
      await SecureStore.deleteItemAsync("google_access_token");
      await SecureStore.deleteItemAsync("google_refresh_token");
    }
    console.log("[Auth] Session cleared");
  } catch (error) {
    console.error("[Auth] Failed to clear session:", error);
  }
}

/**
 * Refresh Google ID token using access token
 * Note: Google ID tokens don't refresh like OAuth tokens
 * Instead, we validate the current token and re-authenticate if needed
 */
export async function refreshGoogleSession(): Promise<boolean> {
  try {
    const session = await getStoredSession();
    if (!session) {
      console.warn("[Auth] No session to refresh");
      return false;
    }

    // Check if token is expired
    if (isTokenExpired(session.idToken)) {
      console.warn("[Auth] ID token expired, re-authentication required");
      await clearSession();
      return false;
    }

    // If token is expiring soon, trigger re-authentication
    if (isTokenExpiringSoon(session.idToken)) {
      console.warn("[Auth] ID token expiring soon, re-authentication recommended");
      return false;
    }

    console.log("[Auth] Session valid, no refresh needed");
    return true;
  } catch (error) {
    console.error("[Auth] Session refresh failed:", error);
    return false;
  }
}

/**
 * Revoke Google token (server-side)
 */
export async function revokeGoogleToken(accessToken: string): Promise<boolean> {
  try {
    if (!accessToken) {
      console.warn("[Auth] No access token to revoke");
      return true; // Not an error if no token
    }

    const response = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${accessToken}`,
      { method: "POST" }
    );

    if (!response.ok) {
      console.error("[Auth] Google token revocation failed:", response.status);
      return false;
    }

    console.log("[Auth] Google token revoked successfully");
    return true;
  } catch (error) {
    console.error("[Auth] Token revocation error:", error);
    // Don't fail logout if revocation fails
    return true;
  }
}

/**
 * Logout: Revoke tokens and clear session
 */
export async function logout(): Promise<void> {
  try {
    const session = await getStoredSession();

    // Revoke access token if available
    if (session?.accessToken) {
      await revokeGoogleToken(session.accessToken);
    }

    // Sign out from Google SDK if available
    if (Platform.OS !== "web") {
      try {
        const { GoogleSignin } = await import(
          "@react-native-google-signin/google-signin"
        );
        await GoogleSignin.signOut();
        console.log("[Auth] Signed out from Google SDK");
      } catch (error) {
        console.warn("[Auth] Google SDK sign-out failed:", error);
      }
    }

    // Clear local session
    await clearSession();
    console.log("[Auth] Logout complete");
  } catch (error) {
    console.error("[Auth] Logout error:", error);
    // Always clear local session even if revocation fails
    await clearSession();
  }
}

/**
 * Validate session on app startup
 */
export async function validateSessionOnStartup(): Promise<StoredSession | null> {
  try {
    const session = await getStoredSession();
    if (!session) {
      console.log("[Auth] No session found on startup");
      return null;
    }

    // Check if token is expired
    if (isTokenExpired(session.idToken)) {
      console.warn("[Auth] Stored session expired on startup");
      await clearSession();
      return null;
    }

    // Check if token is expiring soon
    if (isTokenExpiringSoon(session.idToken)) {
      console.warn("[Auth] Stored session expiring soon on startup");
      // Still return it but mark for refresh
      return session;
    }

    console.log("[Auth] Stored session valid on startup");
    return session;
  } catch (error) {
    console.error("[Auth] Session validation on startup failed:", error);
    return null;
  }
}

/**
 * Handle corrupted or tampered session
 */
export async function handleCorruptedSession(): Promise<void> {
  console.error("[Auth] Corrupted or tampered session detected");
  await clearSession();
}

/**
 * Get session status for UI
 */
export async function getSessionStatus(): Promise<{
  isAuthenticated: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  timeToExpiry: number;
}> {
  const session = await getStoredSession();

  if (!session) {
    return {
      isAuthenticated: false,
      isExpired: false,
      isExpiringSoon: false,
      timeToExpiry: 0,
    };
  }

  const isExpired = isTokenExpired(session.idToken);
  const isExpiringSoon = isTokenExpiringSoon(session.idToken);
  const timeToExpiry = getTokenExpiryTime(session.idToken);

  return {
    isAuthenticated: !isExpired,
    isExpired,
    isExpiringSoon,
    timeToExpiry,
  };
}
