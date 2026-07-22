/**
 * Apple Sign-In Integration
 * Production-grade implementation for iOS
 * 
 * Requires:
 * - APPLE_TEAM_ID: Apple Developer Team ID
 * - APPLE_KEY_ID: Key ID for Sign in with Apple
 * - APPLE_BUNDLE_ID: App Bundle ID (com.tutorsnap.app)
 * - APPLE_SERVICES_ID: Services ID (com.tutorsnap.app)
 * - APPLE_PRIVATE_KEY: Private key for token verification
 */

import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as SecureStore from "expo-secure-store";
import { OAuthCredentials } from "./oauth-service";

// Configuration from environment variables
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || "com.tutorsnap.app";
const APPLE_SERVICES_ID = process.env.APPLE_SERVICES_ID || "com.tutorsnap.app";
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || "PLACEHOLDER_TEAM_ID";
const APPLE_KEY_ID = process.env.APPLE_KEY_ID || "PLACEHOLDER_KEY_ID";

/**
 * Check if Apple Sign-In is available (iOS only)
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return false;
  }

  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    console.warn("[AppleSignIn] Availability check failed:", error);
    return false;
  }
}

/**
 * Perform Apple Sign-In
 * Uses native Apple Sign-In on iOS
 */
export async function signInWithApple(): Promise<OAuthCredentials | null> {
  try {
    if (Platform.OS !== "ios") {
      throw new Error("Apple Sign-In is only available on iOS");
    }

    // Check if Apple Sign-In is available
    const available = await isAppleSignInAvailable();
    if (!available) {
      throw new Error("Apple Sign-In is not available on this device");
    }

    // Perform sign-in
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Store identity token for backend verification
    if (credential.identityToken) {
      await SecureStore.setItemAsync("apple_identity_token", credential.identityToken);
    }

    // Extract user information
    const fullName = credential.fullName;
    const name = fullName
      ? `${fullName.givenName || ""} ${fullName.familyName || ""}`.trim()
      : undefined;

    return {
      provider: "apple",
      idToken: credential.identityToken || "",
      email: credential.email || undefined,
      name,
    };
  } catch (error) {
    if ((error as any).code === "ERR_CANCELED") {
      // console.log("[AppleSignIn] User cancelled sign-in");
      throw new Error("Apple Sign-In cancelled by user");
    }
    console.error("[AppleSignIn] Error:", error);
    throw error;
  }
}

/**
 * Sign out from Apple
 * Note: Apple doesn't provide a sign-out method, so we just clear stored tokens
 */
export async function signOutApple(): Promise<void> {
  try {
    // Clear stored tokens
    await SecureStore.deleteItemAsync("apple_identity_token");
    // console.log("[AppleSignIn] Signed out successfully");
  } catch (error) {
    console.error("[AppleSignIn] Sign-out error:", error);
    throw error;
  }
}

/**
 * Get current signed-in user (if available)
 * Note: Apple doesn't provide a way to get current user without re-authenticating
 */
export async function getCurrentAppleUser(): Promise<OAuthCredentials | null> {
  try {
    const token = await SecureStore.getItemAsync("apple_identity_token");
    if (!token) {
      return null;
    }

    return {
      provider: "apple",
      idToken: token,
      email: undefined,
      name: undefined,
    };
  } catch (error) {
    console.error("[AppleSignIn] Get current user error:", error);
    return null;
  }
}

/**
 * Check if credentials are configured (not placeholders)
 */
function isConfigured(): boolean {
  return (
    !APPLE_TEAM_ID.includes("PLACEHOLDER") &&
    !APPLE_KEY_ID.includes("PLACEHOLDER")
  );
}

/**
 * Export configuration for documentation
 */
export const appleSignInConfig = {
  requiredCredentials: {
    team_id: "APPLE_TEAM_ID",
    key_id: "APPLE_KEY_ID",
    private_key: "APPLE_PRIVATE_KEY",
  },
  bundleId: APPLE_BUNDLE_ID,
  servicesId: APPLE_SERVICES_ID,
  isConfigured,
  isAvailable: isAppleSignInAvailable,
};
