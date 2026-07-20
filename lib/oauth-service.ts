/**
 * OAuth Service
 * Handles Google and Apple Sign-In integration
 */

import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { getApiBaseUrl } from "@/constants/oauth";

export interface OAuthCredentials {
  provider: "google" | "apple";
  idToken: string;
  accessToken?: string;
  email?: string;
  name?: string;
  photoUrl?: string;
}

export interface OAuthResponse {
  success: boolean;
  user?: {
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
    profilePhoto?: string | null;
    loginMethod: string;
  };
  error?: string;
  message?: string;
}

/**
 * Validate OAuth credentials with backend
 */
export async function validateOAuthCredentials(credentials: OAuthCredentials): Promise<OAuthResponse> {
  try {
    const apiUrl = getApiBaseUrl();
    if (!apiUrl) {
      throw new Error("API base URL not configured");
    }

    // tRPC v11 single-procedure POST format: POST /api/trpc/oauth.validate
    // Body: {"json":{...input...}} — server responds with {"result":{"data":{"json":{...}}}}
    const response = await fetch(`${apiUrl}/api/trpc/oauth.validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: {
          provider: credentials.provider,
          idToken: credentials.idToken,
          accessToken: credentials.accessToken,
          email: credentials.email,
          name: credentials.name,
          photoUrl: credentials.photoUrl,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OAuth] tRPC validate HTTP error:", response.status, errorText);
      return {
        success: false,
        error: "OAuth validation failed (HTTP " + response.status + ")",
      };
    }

    const raw = await response.json();
    // tRPC single response: {result:{data:{json:{...}}}}
    const result = raw?.result?.data?.json;
    if (!result) {
      console.error("[OAuth] Unexpected tRPC response shape:", JSON.stringify(raw).slice(0, 200));
      return { success: false, error: "Unexpected server response" };
    }
    return {
      success: result.success,
      user: result.user,
      error: result.error,
      message: result.message,
    };
  } catch (error) {
    console.error("[OAuth] Validation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Initiate Google Sign-In flow
 * This is a placeholder - actual implementation depends on platform
 */
export async function initiateGoogleSignIn(): Promise<OAuthCredentials | null> {
  try {
    if (Platform.OS === "web") {
      // Web implementation would use @react-oauth/google
      console.log("[OAuth] Google Sign-In on web requires @react-oauth/google component");
      return null;
    }

    // Native implementation would use @react-native-google-signin/google-signin
    console.log("[OAuth] Google Sign-In on native requires platform-specific setup");
    return null;
  } catch (error) {
    console.error("[OAuth] Google Sign-In failed:", error);
    return null;
  }
}

/**
 * Initiate Apple Sign-In flow
 * This is a placeholder - actual implementation uses expo-apple-authentication
 */
export async function initiateAppleSignIn(): Promise<OAuthCredentials | null> {
  try {
    if (Platform.OS !== "ios") {
      console.log("[OAuth] Apple Sign-In is only available on iOS");
      return null;
    }

    // Native implementation would use expo-apple-authentication
    console.log("[OAuth] Apple Sign-In on iOS requires expo-apple-authentication setup");
    return null;
  } catch (error) {
    console.error("[OAuth] Apple Sign-In failed:", error);
    return null;
  }
}

/**
 * Handle OAuth callback from deep link
 */
export async function handleOAuthCallback(url: string): Promise<OAuthResponse> {
  try {
    const parsed = Linking.parse(url);
    const { path, queryParams } = parsed;

    console.log("[OAuth] Handling callback:", { path, queryParams });

    if (!queryParams) {
      return {
        success: false,
        error: "Invalid callback URL",
      };
    }

    const { token, error, message } = queryParams as Record<string, string>;

    if (error) {
      return {
        success: false,
        error,
        message,
      };
    }

    if (!token) {
      return {
        success: false,
        error: "No token in callback",
      };
    }

    // Token is already validated by backend, just return success
    return {
      success: true,
      message: "OAuth callback processed",
    };
  } catch (error) {
    console.error("[OAuth] Callback handling failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Callback processing failed",
    };
  }
}

/**
 * Revoke OAuth tokens on logout
 */
export async function revokeOAuthTokens(provider: "google" | "apple"): Promise<boolean> {
  try {
    const apiUrl = getApiBaseUrl();
    if (!apiUrl) {
      console.warn("[OAuth] Cannot revoke tokens: API URL not configured");
      return false;
    }

    const response = await fetch(`${apiUrl}/api/oauth/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ provider }),
    });

    return response.ok;
  } catch (error) {
    console.error("[OAuth] Token revocation failed:", error);
    return false;
  }
}
