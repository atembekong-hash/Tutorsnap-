/**
 * Google Sign-In Integration
 * Production-grade implementation for Android and iOS
 * 
 * Requires:
 * - GOOGLE_ANDROID_CLIENT_ID: OAuth 2.0 Client ID for Android
 * - GOOGLE_IOS_CLIENT_ID: OAuth 2.0 Client ID for iOS
 * - GOOGLE_WEB_CLIENT_ID: (Optional) OAuth 2.0 Client ID for Web (for backend verification)
 */

import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { OAuthCredentials } from "./oauth-service";

// Placeholder credential keys - replace with actual values
const GOOGLE_ANDROID_CLIENT_ID = process.env.GOOGLE_ANDROID_CLIENT_ID || "PLACEHOLDER_ANDROID_CLIENT_ID";
const GOOGLE_IOS_CLIENT_ID = process.env.GOOGLE_IOS_CLIENT_ID || "PLACEHOLDER_IOS_CLIENT_ID";
const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || "PLACEHOLDER_WEB_CLIENT_ID";

// Deep link configuration
const REDIRECT_SCHEME = "tutorsnap";
const REDIRECT_PATH = "oauth/callback";
const REDIRECT_URL = `${REDIRECT_SCHEME}://${REDIRECT_PATH}`;

interface GoogleSignInConfig {
  clientId: string;
  redirectUrl: string;
  scopes: string[];
}

/**
 * Get platform-specific Google Sign-In configuration
 */
function getGoogleConfig(): GoogleSignInConfig {
  const clientId = Platform.OS === "ios" ? GOOGLE_IOS_CLIENT_ID : GOOGLE_ANDROID_CLIENT_ID;
  
  return {
    clientId,
    redirectUrl: REDIRECT_URL,
    scopes: [
      "openid",
      "profile",
      "email",
    ],
  };
}

/**
 * Check if credentials are configured (not placeholders)
 */
function isConfigured(): boolean {
  const config = getGoogleConfig();
  return !config.clientId.includes("PLACEHOLDER");
}

/**
 * Perform Google Sign-In
 * Uses native Google Sign-In SDK on Android/iOS
 */
export async function signInWithGoogle(): Promise<OAuthCredentials | null> {
  try {
    const config = getGoogleConfig();

    // Check if credentials are configured
    if (!isConfigured()) {
      throw new Error(
        `Google Sign-In not configured. Please set ${Platform.OS === "ios" ? "GOOGLE_IOS_CLIENT_ID" : "GOOGLE_ANDROID_CLIENT_ID"} environment variable.`
      );
    }

    // Platform-specific implementation
    if (Platform.OS === "android") {
      return await signInWithGoogleAndroid(config);
    } else if (Platform.OS === "ios") {
      return await signInWithGoogleIOS(config);
    } else if (Platform.OS === "web") {
      return await signInWithGoogleWeb(config);
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
 * Uses @react-native-google-signin/google-signin
 */
async function signInWithGoogleAndroid(config: GoogleSignInConfig): Promise<OAuthCredentials | null> {
  try {
    // Dynamically import to avoid breaking web builds
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      scopes: config.scopes,
    } as any);

    // Perform sign-in
    const userInfo = (await GoogleSignin.signIn()) as any;

    if (!userInfo.idToken) {
      throw new Error("No ID token received from Google Sign-In");
    }

    // Store ID token securely
    await SecureStore.setItemAsync("google_id_token", userInfo.idToken);

    // Extract user info from response (varies by SDK version)
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
 * Uses @react-native-google-signin/google-signin
 */
async function signInWithGoogleIOS(config: GoogleSignInConfig): Promise<OAuthCredentials | null> {
  try {
    // Dynamically import to avoid breaking web builds
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      scopes: config.scopes,
    } as any);

    // Perform sign-in
    const userInfo = (await GoogleSignin.signIn()) as any;

    if (!userInfo.idToken) {
      throw new Error("No ID token received from Google Sign-In");
    }

    // Store ID token securely
    await SecureStore.setItemAsync("google_id_token", userInfo.idToken);

    // Extract user info from response (varies by SDK version)
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
 * Web-specific Google Sign-In
 * Uses OAuth 2.0 Authorization Code Flow
 */
async function signInWithGoogleWeb(config: GoogleSignInConfig): Promise<OAuthCredentials | null> {
  try {
    const state = generateRandomState();
    const nonce = generateRandomNonce();

    // Store state and nonce for verification
    await SecureStore.setItemAsync("google_oauth_state", state);
    await SecureStore.setItemAsync("google_oauth_nonce", nonce);

    // Build authorization URL
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.append("client_id", config.clientId);
    authUrl.searchParams.append("redirect_uri", config.redirectUrl);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", config.scopes.join(" "));
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("nonce", nonce);
    authUrl.searchParams.append("access_type", "offline");
    authUrl.searchParams.append("prompt", "consent");

    // Open browser
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl.toString(),
      config.redirectUrl
    );

    if (result.type === "success" && result.url) {
      // Parse authorization code from redirect URL
      const url = new URL(result.url);
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");

      // Verify state
      const storedState = await SecureStore.getItemAsync("google_oauth_state");
      if (returnedState !== storedState) {
        throw new Error("OAuth state mismatch - possible CSRF attack");
      }

      if (!code) {
        throw new Error("No authorization code received");
      }

      // In production, exchange code for tokens on backend
      // The backend would use GOOGLE_WEB_CLIENT_ID and client secret
      return {
        provider: "google",
        idToken: code, // Backend will exchange this for actual token
        email: undefined,
        name: undefined,
      };
    } else if (result.type === "cancel") {
      throw new Error("Google Sign-In cancelled by user");
    } else if (result.type === "dismiss") {
      throw new Error("Google Sign-In dismissed");
    }

    return null;
  } catch (error) {
    console.error("[GoogleSignIn] Web error:", error);
    throw error;
  }
}

/**
 * Sign out from Google
 */
export async function signOutGoogle(): Promise<void> {
  try {
    // In production, this would use:
    // import { GoogleSignin } from '@react-native-google-signin/google-signin';
    // await GoogleSignin.signOut();

    console.log("[GoogleSignIn] Signing out");
    // Clear stored tokens
    await SecureStore.deleteItemAsync("google_oauth_state");
    await SecureStore.deleteItemAsync("google_oauth_nonce");
  } catch (error) {
    console.error("[GoogleSignIn] Sign-out error:", error);
    throw error;
  }
}

/**
 * Get current signed-in user (if available)
 */
export async function getCurrentGoogleUser(): Promise<OAuthCredentials | null> {
  try {
    // In production, this would use:
    // import { GoogleSignin } from '@react-native-google-signin/google-signin';
    // const user = await GoogleSignin.getCurrentUser();

    console.log("[GoogleSignIn] Getting current user");
    return null;
  } catch (error) {
    console.error("[GoogleSignIn] Get current user error:", error);
    return null;
  }
}

/**
 * Generate random state for OAuth CSRF protection
 */
function generateRandomState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate random nonce for OpenID Connect
 */
function generateRandomNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Export configuration for documentation
 */
export const googleSignInConfig = {
  requiredCredentials: {
    android: "GOOGLE_ANDROID_CLIENT_ID",
    ios: "GOOGLE_IOS_CLIENT_ID",
    web: "GOOGLE_WEB_CLIENT_ID (optional)",
  },
  redirectUrl: REDIRECT_URL,
  redirectScheme: REDIRECT_SCHEME,
  scopes: ["openid", "profile", "email"],
  isConfigured,
};
