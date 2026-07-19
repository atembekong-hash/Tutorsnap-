# OAuth Credentials Integration Template

This document provides templates and instructions for integrating your OAuth credentials into TutorSnap.

## Environment Variables Required

After obtaining your OAuth credentials from Google and Apple, you'll need to set these environment variables:

### Google OAuth (Mobile & Web)

```
GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID_HERE
GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID_HERE
GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID_HERE
GOOGLE_WEB_CLIENT_SECRET=YOUR_WEB_CLIENT_SECRET_HERE
```

**Where to find these:**
- Android Client ID: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs (Android)
- iOS Client ID: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs (iOS)
- Web Client ID & Secret: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs (Web)

### Apple Sign-In

```
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_BUNDLE_ID=com.tutorsnap.app
APPLE_SERVICES_ID=com.tutorsnap.app
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----
APPLE_REDIRECT_URI=https://tutorsnapai.tech/api/oauth/callback
```

**Where to find these:**
- Team ID: Apple Developer Account → Membership
- Key ID: Apple Developer Account → Certificates, Identifiers & Profiles → Keys
- Private Key: Download from Apple Developer Account (AuthKey_XXXXXXXXXX.p8)

## Setting Environment Variables

### For Development (Local Testing)

1. Create a `.env.local` file in your project root:

```bash
cp .env.example .env.local
```

2. Edit `.env.local` and fill in your credentials:

```bash
# Google OAuth
GOOGLE_ANDROID_CLIENT_ID=YOUR_VALUE
GOOGLE_IOS_CLIENT_ID=YOUR_VALUE
GOOGLE_WEB_CLIENT_ID=YOUR_VALUE
GOOGLE_WEB_CLIENT_SECRET=YOUR_VALUE

# Apple Sign-In
APPLE_TEAM_ID=YOUR_VALUE
APPLE_KEY_ID=YOUR_VALUE
APPLE_PRIVATE_KEY=YOUR_VALUE
```

3. The app will automatically load these when running `pnpm dev`

### For Production (EAS Build)

Use the Manus webdev secrets management:

```bash
# Add secrets via the Management UI
# Or use webdev_request_secrets in the CLI
```

The secrets will be available as environment variables during the build and runtime.

## Integrating Credentials into Code

### 1. Google Sign-In (lib/google-signin.ts)

The Google Sign-In implementation already reads from environment variables:

```typescript
const GOOGLE_ANDROID_CLIENT_ID = process.env.GOOGLE_ANDROID_CLIENT_ID || "PLACEHOLDER_ANDROID_CLIENT_ID";
const GOOGLE_IOS_CLIENT_ID = process.env.GOOGLE_IOS_CLIENT_ID || "PLACEHOLDER_IOS_CLIENT_ID";
const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || "PLACEHOLDER_WEB_CLIENT_ID";
```

**No changes needed** - just set the environment variables.

### 2. Apple Sign-In (lib/apple-signin.ts - To be created)

Create a new file `lib/apple-signin.ts`:

```typescript
/**
 * Apple Sign-In Integration
 * Production-grade implementation for iOS
 */

import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as SecureStore from "expo-secure-store";
import { OAuthCredentials } from "./oauth-service";

const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || "com.tutorsnap.app";
const APPLE_SERVICES_ID = process.env.APPLE_SERVICES_ID || "com.tutorsnap.app";

/**
 * Check if Apple Sign-In is available (iOS only)
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return false;
  }
  
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Perform Apple Sign-In
 */
export async function signInWithApple(): Promise<OAuthCredentials | null> {
  try {
    if (Platform.OS !== "ios") {
      throw new Error("Apple Sign-In is only available on iOS");
    }

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

    return {
      provider: "apple",
      idToken: credential.identityToken || "",
      email: credential.email || undefined,
      name: credential.fullName
        ? `${credential.fullName.givenName || ""} ${credential.fullName.familyName || ""}`.trim()
        : undefined,
    };
  } catch (error) {
    console.error("[AppleSignIn] Error:", error);
    throw error;
  }
}

/**
 * Sign out from Apple
 */
export async function signOutApple(): Promise<void> {
  try {
    // Apple doesn't provide a sign-out method
    // Just clear stored tokens
    await SecureStore.deleteItemAsync("apple_identity_token");
    console.log("[AppleSignIn] Signed out");
  } catch (error) {
    console.error("[AppleSignIn] Sign-out error:", error);
    throw error;
  }
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
  isAvailable: isAppleSignInAvailable,
};
```

### 3. Backend Token Verification (server/routers/oauth.ts)

Update the backend to verify real tokens:

```typescript
/**
 * Verify Google ID Token
 */
async function verifyGoogleToken(idToken: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?id_token=${idToken}`
    );
    
    if (response.data.aud !== process.env.GOOGLE_WEB_CLIENT_ID) {
      throw new Error("Invalid audience");
    }
    
    return {
      id: response.data.sub,
      email: response.data.email,
      name: response.data.name,
      picture: response.data.picture,
    };
  } catch (error) {
    console.error("Google token verification failed:", error);
    throw error;
  }
}

/**
 * Verify Apple Identity Token
 */
async function verifyAppleToken(identityToken: string): Promise<any> {
  try {
    // Get Apple's public keys
    const keysResponse = await axios.get("https://appleid.apple.com/auth/keys");
    const keys = keysResponse.data.keys;

    // Decode token header
    const decoded = jwt.decode(identityToken, { complete: true });
    if (!decoded) {
      throw new Error("Invalid token format");
    }

    const kid = decoded.header.kid;
    const key = keys.find((k: any) => k.kid === kid);
    
    if (!key) {
      throw new Error("Key not found");
    }

    // Convert JWK to PEM and verify
    const publicKey = jwkToPem(key);
    const verified = jwt.verify(identityToken, publicKey, {
      algorithms: ["RS256"],
      audience: process.env.APPLE_SERVICES_ID,
      issuer: "https://appleid.apple.com",
    });

    return {
      id: verified.sub,
      email: verified.email,
      name: undefined, // Apple doesn't include name in token
    };
  } catch (error) {
    console.error("Apple token verification failed:", error);
    throw error;
  }
}
```

## Testing OAuth Flows

### 1. Test Google Sign-In

```bash
# Development
pnpm dev

# Navigate to http://localhost:8081
# Click "Sign in with Google"
# Complete the flow
```

### 2. Test Apple Sign-In

```bash
# Build for iOS
eas build --platform ios --profile preview

# Or run locally
pnpm run ios

# On iOS device, tap "Sign in with Apple"
# Complete the flow
```

### 3. Verify Backend Token Verification

Check server logs to confirm tokens are being verified correctly:

```bash
# Watch server logs
tail -f .manus-logs/devserver.log | grep -i "oauth\|token\|verify"
```

## Troubleshooting

### Credentials Not Loading

1. Verify `.env.local` file exists and is readable
2. Check that environment variable names match exactly (case-sensitive)
3. Restart dev server: `pnpm dev`
4. Check that values don't have quotes: `GOOGLE_ANDROID_CLIENT_ID=abc123` not `GOOGLE_ANDROID_CLIENT_ID="abc123"`

### Token Verification Fails

1. Verify token hasn't expired
2. Check that audience/issuer match your configuration
3. Ensure private key is in correct format (with newlines)
4. Check backend logs for detailed error messages

### Sign-In Button Not Working

1. Verify credentials are set in environment variables
2. Check browser console for errors
3. Verify redirect URIs match exactly in OAuth provider configuration
4. Test with a different browser or incognito window

## Security Best Practices

1. **Never commit secrets** - Add `.env.local` to `.gitignore`
2. **Use different credentials** for development and production
3. **Rotate keys regularly** - Especially Apple private keys
4. **Monitor token usage** - Check OAuth provider dashboards for suspicious activity
5. **Validate tokens on backend** - Never trust tokens from client
6. **Use HTTPS** - Always use HTTPS for production OAuth flows
7. **Store tokens securely** - Use `SecureStore` for sensitive data on mobile

## Next Steps

1. ✅ Create Google OAuth credentials
2. ✅ Create Apple Sign-In credentials
3. ✅ Set environment variables
4. ✅ Test OAuth flows on all platforms
5. ✅ Deploy to production with real credentials
6. ✅ Monitor OAuth provider dashboards for issues

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign-In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Expo Authentication Documentation](https://docs.expo.dev/guides/authentication/)
