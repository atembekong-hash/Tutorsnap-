/**
 * Enhanced Authentication Service
 * Handles OAuth tokens, session management, and automatic refresh
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/oauth";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  profilePhoto?: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
};

export type AuthToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshExpiresAt: number;
};

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const TOKEN_EXPIRY_KEY = "auth_token_expiry";
const REFRESH_EXPIRY_KEY = "auth_refresh_expiry";

/**
 * Get stored auth token
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error("[Auth] Failed to get auth token:", error);
    return null;
  }
}

/**
 * Get stored refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("[Auth] Failed to get refresh token:", error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export async function isTokenExpired(): Promise<boolean> {
  try {
    const expiryStr = Platform.OS === "web" 
      ? localStorage.getItem(TOKEN_EXPIRY_KEY)
      : await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    
    if (!expiryStr) return true;
    
    const expiry = parseInt(expiryStr, 10);
    return Date.now() >= expiry;
  } catch (error) {
    console.error("[Auth] Failed to check token expiry:", error);
    return true;
  }
}

/**
 * Store auth tokens securely
 */
export async function setAuthTokens(tokens: AuthToken): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      localStorage.setItem(TOKEN_EXPIRY_KEY, tokens.expiresAt.toString());
      localStorage.setItem(REFRESH_EXPIRY_KEY, tokens.refreshExpiresAt.toString());
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, tokens.accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, tokens.expiresAt.toString());
      await SecureStore.setItemAsync(REFRESH_EXPIRY_KEY, tokens.refreshExpiresAt.toString());
    }
    console.log("[Auth] Tokens stored successfully");
  } catch (error) {
    console.error("[Auth] Failed to store tokens:", error);
    throw error;
  }
}

/**
 * Clear all auth tokens
 */
export async function clearAuthTokens(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      localStorage.removeItem(REFRESH_EXPIRY_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
      await SecureStore.deleteItemAsync(REFRESH_EXPIRY_KEY);
    }
    console.log("[Auth] Tokens cleared successfully");
  } catch (error) {
    console.error("[Auth] Failed to clear tokens:", error);
  }
}

/**
 * Get session token (legacy compatibility)
 */
export async function getSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(SESSION_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error("[Auth] Failed to get session token:", error);
    return null;
  }
}

/**
 * Set session token (legacy compatibility)
 */
export async function setSessionToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    }
    console.log("[Auth] Session token stored successfully");
  } catch (error) {
    console.error("[Auth] Failed to set session token:", error);
    throw error;
  }
}

/**
 * Remove session token (legacy compatibility)
 */
export async function removeSessionToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    }
    console.log("[Auth] Session token removed successfully");
  } catch (error) {
    console.error("[Auth] Failed to remove session token:", error);
  }
}

/**
 * Get user info
 */
export async function getUserInfo(): Promise<User | null> {
  try {
    let info: string | null = null;
    if (Platform.OS === "web") {
      info = localStorage.getItem(USER_INFO_KEY);
    } else {
      info = await SecureStore.getItemAsync(USER_INFO_KEY);
    }

    if (!info) {
      console.log("[Auth] No user info found");
      return null;
    }
    const user = JSON.parse(info);
    console.log("[Auth] User info retrieved");
    return user;
  } catch (error) {
    console.error("[Auth] Failed to get user info:", error);
    return null;
  }
}

/**
 * Set user info
 */
export async function setUserInfo(user: User): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    } else {
      await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
    }
    console.log("[Auth] User info stored successfully");
  } catch (error) {
    console.error("[Auth] Failed to set user info:", error);
  }
}

/**
 * Clear user info
 */
export async function clearUserInfo(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(USER_INFO_KEY);
    } else {
      await SecureStore.deleteItemAsync(USER_INFO_KEY);
    }
    console.log("[Auth] User info cleared successfully");
  } catch (error) {
    console.error("[Auth] Failed to clear user info:", error);
  }
}

/**
 * Complete logout - clear all auth data and revoke server-side tokens.
 *
 * Steps:
 * 1. Revoke Google access token with Google's revocation endpoint (non-fatal).
 * 2. Sign out of Google SDK so the account picker shows next time.
 * 3. Clear all local tokens from SecureStore/AsyncStorage.
 * 4. Clear session cookie via the backend auth.logout mutation.
 */
export async function logout(): Promise<void> {
  try {
    // 1. Revoke Google token server-side (non-fatal)
    const accessToken = await getAuthToken();
    if (accessToken) {
      try {
        const { getApiBaseUrl } = await import("@/constants/oauth");
        await fetch(`${getApiBaseUrl()}/api/trpc/oauth.revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ json: { provider: "google", token: accessToken } }),
        });
      } catch {
        // Non-fatal: token will expire naturally
      }
    }

    // 2. Sign out of Google SDK
    try {
      const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser) {
        await GoogleSignin.signOut();
      }
    } catch {
      // Non-fatal: SDK may not be initialised if user signed in via email
    }

    // 3. Clear all local credentials
    await clearAuthTokens();
    await removeSessionToken();
    await clearUserInfo();
  } catch (error) {
    console.error("[Auth] Failed to logout:", error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    const user = await getUserInfo();
    return !!(token && user);
  } catch (error) {
    console.error("[Auth] Failed to check authentication:", error);
    return false;
  }
}
