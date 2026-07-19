# Google OAuth Setup Guide for TutorSnap

This guide walks you through creating Google OAuth credentials for TutorSnap on Android, iOS, and Web platforms.

## Prerequisites

- Google Cloud Project (create one at [console.cloud.google.com](https://console.cloud.google.com))
- Android app with SHA-1 fingerprint (for Android OAuth)
- Apple Developer Account (for iOS configuration)
- Production domain: `tutorsnapai.tech`

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a Project" → "New Project"
3. Enter project name: `TutorSnap`
4. Click "Create"
5. Wait for project to be created and select it

## Step 2: Enable OAuth 2.0 API

1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"
4. Go back to "APIs & Services" → "Credentials"

## Step 3: Create OAuth 2.0 Consent Screen

1. In "APIs & Services", click "OAuth consent screen" (left sidebar)
2. Select "External" user type
3. Click "Create"
4. Fill in the form:
   - **App name**: TutorSnap
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
5. Click "Save and Continue"
6. On "Scopes" page, click "Add or Remove Scopes"
7. Add these scopes:
   - `openid`
   - `profile`
   - `email`
8. Click "Update" → "Save and Continue"
9. On "Test users" page, add your test email addresses
10. Click "Save and Continue" → "Back to Dashboard"

## Step 4: Create Android OAuth Credentials

### 4.1 Get SHA-1 Fingerprint

You need the SHA-1 fingerprint of your Android app's signing key.

**For development (debug key):**
```bash
# macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1

# Windows
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

**For production (release key):**
```bash
# Replace path/to/your/keystore.jks with your actual keystore file
keytool -list -v -keystore path/to/your/keystore.jks -alias your_key_alias | grep SHA1
```

### 4.2 Create Android Credential

1. In "APIs & Services" → "Credentials", click "Create Credentials" → "OAuth client ID"
2. Select "Android"
3. Fill in:
   - **Package name**: `com.tutorsnap.app`
   - **SHA-1 certificate fingerprint**: [Paste the SHA-1 from step 4.1]
4. Click "Create"
5. **Save the Client ID** - you'll need this for environment variables

## Step 5: Create iOS OAuth Credentials

### 5.1 Create iOS Credential

1. In "APIs & Services" → "Credentials", click "Create Credentials" → "OAuth client ID"
2. Select "iOS"
3. Fill in:
   - **Bundle ID**: `com.tutorsnap.app`
   - **Team ID**: [Your Apple Team ID - find at [developer.apple.com/account](https://developer.apple.com/account)]
4. Click "Create"
5. **Save the Client ID** - you'll need this for environment variables

## Step 6: Create Web OAuth Credentials

1. In "APIs & Services" → "Credentials", click "Create Credentials" → "OAuth client ID"
2. Select "Web application"
3. Fill in:
   - **Name**: TutorSnap Web
   - **Authorized JavaScript origins**: Add these:
     - `https://tutorsnapai.tech`
     - `https://www.tutorsnapai.tech`
     - `http://localhost:8081` (for local development)
   - **Authorized redirect URIs**: Add these:
     - `https://tutorsnapai.tech/api/oauth/callback`
     - `http://localhost:3000/api/oauth/callback` (for local development)
4. Click "Create"
5. **Save the Client ID and Client Secret** - you'll need both for backend

## Step 7: Configure Environment Variables

Create a `.env.local` file in your project root with these values:

```bash
# Google OAuth - Android
GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID_HERE

# Google OAuth - iOS
GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID_HERE

# Google OAuth - Web (for backend verification)
GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID_HERE
GOOGLE_WEB_CLIENT_SECRET=YOUR_WEB_CLIENT_SECRET_HERE
```

## Step 8: Configure Android App

### 8.1 Update app.config.ts

The app already has the correct configuration:
- Package name: `com.tutorsnap.app`
- Deep link scheme: `tutorsnap://`
- Redirect path: `tutorsnap://oauth/callback`

### 8.2 Build and Test

```bash
# Build debug APK
eas build --platform android --profile preview

# Or build locally
pnpm run android
```

## Step 9: Configure iOS App

### 9.1 Update app.config.ts

The app already has the correct configuration:
- Bundle ID: `com.tutorsnap.app`
- Deep link scheme: `tutorsnap://`
- Associated domains configured for universal links

### 9.2 Build and Test

```bash
# Build debug build
eas build --platform ios --profile preview

# Or build locally
pnpm run ios
```

## Step 10: Test OAuth Flows

### Android Testing
1. Install the debug APK on an Android device or emulator
2. Tap "Sign in with Google"
3. Complete the Google sign-in flow
4. Verify user is logged in

### iOS Testing
1. Install the debug build on an iOS device or simulator
2. Tap "Sign in with Google"
3. Complete the Google sign-in flow
4. Verify user is logged in

### Web Testing
1. Run `pnpm dev` locally
2. Navigate to `http://localhost:8081`
3. Tap "Sign in with Google"
4. Complete the Google sign-in flow
5. Verify user is logged in

## Troubleshooting

### "Invalid OAuth client" Error
- Verify Client ID is correct in environment variables
- Check that package name/bundle ID matches exactly
- Verify SHA-1 fingerprint is correct (for Android)

### "Redirect URI mismatch" Error
- Verify redirect URI in Google Console matches exactly:
  - Mobile: `tutorsnap://oauth/callback`
  - Web: `https://tutorsnapai.tech/api/oauth/callback`

### "Sign-in cancelled" Error
- User cancelled the sign-in flow - this is normal
- No action needed

### Token Verification Fails
- Ensure `GOOGLE_WEB_CLIENT_SECRET` is set on backend
- Verify token hasn't expired
- Check backend logs for verification errors

## Next Steps

1. After creating credentials, proceed to [Apple Sign-In Setup](./APPLE_SIGNIN_SETUP.md)
2. Configure backend token verification
3. Test end-to-end OAuth flows on all platforms
4. Deploy to production

## References

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Android](https://developers.google.com/identity/sign-in/android)
- [Google Sign-In for iOS](https://developers.google.com/identity/sign-in/ios)
- [Google Sign-In for Web](https://developers.google.com/identity/sign-in/web)
