# Native Google Sign-In Implementation Guide

## Overview

TutorSnap uses the native Google Sign-In SDK (`@react-native-google-signin/google-signin`) for Android and iOS, **NOT** web-based OAuth. This ensures:

- Native Google account selector appears (not a browser)
- Secure token handling via native APIs
- Proper integration with device's Google account settings
- No redirect URLs or browser callbacks needed

## Runtime Call Path

When user taps "Continue with Google" button:

```
auth-screen.tsx (handleGoogleSignIn)
  ↓
lib/google-signin.ts (signInWithGoogle)
  ↓
Platform.OS check
  ├─ Android → signInWithGoogleAndroid()
  ├─ iOS → signInWithGoogleIOS()
  └─ Web → signInWithGoogleWeb() [browser-based, for web preview only]
  ↓
GoogleSignin.configure() [native SDK initialization]
  ├─ webClientId: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  ├─ offlineAccess: true
  └─ scopes: ["openid", "profile", "email"]
  ↓
GoogleSignin.signIn() [native Google account selector]
  ↓
Returns: { idToken, accessToken, user: { email, name, photo } }
  ↓
Backend verification: /api/oauth/validate
  ├─ Receives idToken
  ├─ Verifies with Google's public keys
  ├─ Creates/updates user in database
  └─ Returns session token
```

## Android Implementation Details

### Configuration (app.config.ts)

```typescript
// Plugin registration
[
  "@react-native-google-signin/google-signin",
  {
    // Native SDK configuration
  },
],

// Android build properties
android: {
  package: "com.tutorsnap.app",
  permissions: ["POST_NOTIFICATIONS"],
  // Google Play Services repository
  extraMavenRepos: [
    "https://maven.google.com",
  ],
}
```

### Native Code (lib/google-signin.ts)

```typescript
async function signInWithGoogleAndroid(config: GoogleSignInConfig): Promise<OAuthCredentials | null> {
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

  // Configure native Google Sign-In
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,  // For backend token verification
    offlineAccess: true,
    scopes: ["openid", "profile", "email"],
  });

  // Show native Google account selector
  const userInfo = await GoogleSignin.signIn();

  // Extract ID token for backend verification
  return {
    provider: "google",
    idToken: userInfo.idToken,  // Sent to backend for verification
    email: userInfo.user.email,
    name: userInfo.user.name,
  };
}
```

### Required Credentials

1. **EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID** - Android OAuth Client ID
   - Used by native SDK for account selection
   - Must match package: `com.tutorsnap.app`
   - Must match signing certificate SHA-1

2. **EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID** - Web OAuth Client ID
   - Used as `webClientId` in native SDK configuration
   - Enables backend token verification
   - NOT used for OAuth flow itself

3. **GOOGLE_WEB_CLIENT_SECRET** - Backend only
   - Never included in APK
   - Used by backend to verify ID tokens
   - Stored in server environment variables

### APK Signing Requirements

The APK must be signed with the certificate whose SHA-1 fingerprint is registered in Google Cloud Console:

```bash
# Debug build (development)
SHA-1: 73:4C:0C:13:F0:20:36:8C:ED:C0:19:BF:9C:97:F8:A9:86:97:A2:B1

# Release build (production)
SHA-1: [Obtained from Google Play Console after enabling App Signing]
```

## Building and Testing

### Step 1: Verify Credentials

```bash
# Check that credentials are set as Application Secrets
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<your-android-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your-ios-client-id>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>
```

### Step 2: Build Debug APK

```bash
# Using Expo CLI (recommended for development)
eas build --platform android --profile preview

# Or local build (requires Android SDK)
npx react-native run-android
```

### Step 3: Install on Device/Emulator

```bash
# Copy APK to device
adb install -r app-release.apk

# Or use Android Studio device manager
```

### Step 4: Test Native Flow

1. Launch TutorSnap app
2. Tap "Continue with Google"
3. **Expected:** Native Google account selector appears
4. **NOT expected:** Browser window or 404 error
5. Select Google account
6. **Expected:** App returns to auth screen and shows user info
7. **Verify:** User is created in database and session is valid

## Troubleshooting

### Issue: Browser opens instead of native selector

**Cause:** Web OAuth flow is being used instead of native SDK

**Fix:**
- Verify `Platform.OS === "android"` check in signInWithGoogle()
- Ensure @react-native-google-signin/google-signin is installed
- Check that APK is native build, not Expo Go wrapper

### Issue: Error 404 from Google

**Cause:** Web OAuth flow with invalid redirect URL

**Fix:**
- Remove all WebBrowser.openAuthSessionAsync calls from Android path
- Use native GoogleSignin.signIn() only
- Verify no custom OAuth URL construction on native

### Issue: "Google Sign-In not configured"

**Cause:** EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID not set

**Fix:**
- Add credential to Application Secrets
- Restart dev server
- Rebuild APK

### Issue: "Invalid package name" from Google

**Cause:** APK package name doesn't match OAuth client configuration

**Fix:**
- Verify app.config.ts has `package: "com.tutorsnap.app"`
- Verify OAuth client is created for `com.tutorsnap.app`
- Rebuild APK

### Issue: "Invalid signing certificate"

**Cause:** APK SHA-1 doesn't match registered certificate

**Fix:**
- Get debug SHA-1: `keytool -list -v -keystore ~/.android/debug.keystore`
- Add to Google Cloud Console Android OAuth client
- Rebuild APK

## Files Modified

- `app.config.ts` - Added Google Sign-In plugin
- `lib/google-signin.ts` - Native implementation
- `app/auth-screen.tsx` - Sign-in button handler
- `server/routers/oauth.ts` - Backend token verification

## Web Preview vs Native Build

| Aspect | Web Preview | Native APK |
|--------|------------|-----------|
| Sign-In Flow | Browser-based OAuth | Native SDK |
| Account Selector | Google's web page | Device's native selector |
| Redirect | tutorsnap://oauth/callback | None (native) |
| Token | Authorization code | ID token |
| Backend | Exchanges code for token | Verifies ID token |

## Next Steps

1. ✅ Verify app.config.ts has Google Sign-In plugin
2. ✅ Verify credentials are set as Application Secrets
3. 🔄 Build fresh APK with native configuration
4. 🔄 Test on Android device/emulator
5. 🔄 Verify native account selector appears
6. 🔄 Verify successful sign-in creates user in database
7. 🔄 Test session persistence across app restarts
