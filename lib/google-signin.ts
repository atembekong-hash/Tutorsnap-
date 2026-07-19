/**
 * Native Google Sign-In Integration
 * Uses @react-native-google-signin/google-signin for Android and iOS
 * 
 * NO web browser fallbacks - native SDK only
 * 
 * Requires:
 * - EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: OAuth 2.0 Client ID for Android
 * - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: OAuth 2.0 Client ID for iOS
 * - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: Web Client ID for backend token verification
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { OAuthCredentials } from "./oauth-service";

// Credentials - EXPO_PUBLIC_ prefix required for client-side access
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

/**
 * Check if credentials are configured (not empty)
 */
function isConfigured(): boolean {
  if (Platform.OS === "android") {
    return GOOGLE_ANDROID_CLIENT_ID.length > 0 && GOOGLE_WEB_CLIENT_ID.length > 0;
  } else if (Platform.OS === "ios") {
    return GOOGLE_IOS_CLIENT_ID.length > 0 && GOOGLE_WEB_CLIENT_ID.length > 0;
  }
  return false;
}

/**
 * Get error message for unconfigured credentials
 */
function getConfigurationError(): string {
  if (Platform.OS === "android") {
    return "Google Sign-In not configured. Please set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID environment variables.";
  } else if (Platform.OS === "ios") {
    return "Google Sign-In not configured. Please set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID environment variables.";
  }
  return "Google Sign-In not supported on this platform.";
}

/**
 * Perform native Google Sign-In
 * Uses @react-native-google-signin/google-signin SDK
 * No web browser, no OAuth redirect URLs
 */
export async function signInWithGoogle(): Promise<OAuthCredentials | null> {
  try {
    // Check if credentials are configured
    if (!isConfigured()) {
      throw new Error(getConfigurationError());
    }

    // Platform-specific implementation
    if (Platform.OS === "android") {
      return await signInWithGoogleAndroid();
    } else if (Platform.OS === "ios") {
      return await signInWithGoogleIOS();
    } else if (Platform.OS === "web") {
      throw new Error("Google Sign-In not available on web platform. Use email authentication instead.");
    } else {
      throw new Error(`Unsupported platform: ${Platform.OS}`);
    }
  } catch (error) {
    console.error("[GoogleSignIn] Error:", error);
    throw error;
  }
}

/**
 * Android-specific Google Sign-In
 * Uses native Google Sign-In SDK
 */
async function signInWithGoogleAndroid(): Promise<OAuthCredentials | null> {
  try {
    // Dynamically import to avoid breaking web builds
    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");

    // Configure native Google Sign-In
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      scopes: ["openid", "profile", "email"],
    });

    // Show native Google account selector
    // This opens the native account picker, NOT a browser
    const userInfo = (await GoogleSignin.signIn()) as any;

    if (!userInfo.idToken) {
      throw new Error("No ID token received from Google Sign-In");
    }

    // Store ID token securely for session restoration
    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync("google_id_token", userInfo.idToken);
    }

    // Extract user info from response
    const user = userInfo.user || userInfo;

    return {
      provider: "google",
      idToken: userInfo.idToken,
      accessToken: userInfo.accessToken || undefined,
      email: user.email || undefined,
      name: user.name || undefined,
      photoUrl: user.photo || undefined,
    };
  } catch (error) {
    console.error("[GoogleSignIn] Android error:", error);
    throw error;
  }
}

/**
 * iOS-specific Google Sign-In
 * Uses native Google Sign-In SDK
 */
async function signInWithGoogleIOS(): Promise<OAuthCredentials | null> {
  try {
    // Dynamically import to avoid breaking web builds
    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");

    // Configure native Google Sign-In
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      scopes: ["openid", "profile", "email"],
    });

    // Show native Google account selector
    const userInfo = (await GoogleSignin.signIn()) as any;

    if (!userInfo.idToken) {
      throw new Error("No ID token received from Google Sign-In");
    }

    // Store ID token securely for session restoration
    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync("google_id_token", userInfo.idToken);
    }

    // Extract user info from response
    const user = userInfo.user || userInfo;

    return {
      provider: "google",
      idToken: userInfo.idToken,
      accessToken: userInfo.accessToken || undefined,
      email: user.email || undefined,
      name: user.name || undefined,
      photoUrl: user.photo || undefined,
    };
  } catch (error) {
    console.error("[GoogleSignIn] iOS error:", error);
    throw error;
  }
}

/**
 * Sign out from Google
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      // Web: clear localStorage
      localStorage.removeItem("google_id_token");
      return;
    }

    // Native: use GoogleSignin SDK
    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
    await GoogleSignin.signOut();

    // Clear stored token
    await SecureStore.deleteItemAsync("google_id_token");
  } catch (error) {
    console.error("[GoogleSignIn] Sign out error:", error);
    throw error;
  }
}

/**
 * Get current signed-in user
 */
export async function getCurrentGoogleUser(): Promise<any | null> {
  try {
    if (Platform.OS === "web") {
      return null;
    }

    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
    return await GoogleSignin.getCurrentUser();
  } catch (error) {
    console.error("[GoogleSignIn] Get current user error:", error);
    return null;
  }
}

/**
 * Revoke Google access
 */
export async function revokeGoogleAccess(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem("google_id_token");
      return;
    }

    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
    await GoogleSignin.revokeAccess();
    await SecureStore.deleteItemAsync("google_id_token");
  } catch (error) {
    console.error("[GoogleSignIn] Revoke access error:", error);
    throw error;
  }
}
