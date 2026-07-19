# EAS Build Guide - Build Native Android APK

This guide shows you how to build a production-ready Android APK using Expo's EAS Build service.

## Prerequisites

✅ Expo account (free) - https://expo.dev
✅ GitHub account - https://github.com
✅ Project pushed to GitHub repository

## Step 1: Prepare Your GitHub Repository

If you haven't already, push this project to GitHub:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Native Google Sign-In implementation"

# Add GitHub remote (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Link Project to Expo

From your phone or computer, open a terminal and run:

```bash
cd /home/ubuntu/mathgenius-ai

# Login to Expo (will open browser for authentication)
eas login

# Link project to Expo
eas project:create
```

This will:
1. Prompt you to authenticate with your Expo account
2. Create a new Expo project
3. Generate `eas.json` configuration

## Step 3: Configure Credentials for Android

```bash
# Set up Android credentials
eas credentials

# Follow prompts:
# 1. Select "Android"
# 2. Choose "Google Play Keystore"
# 3. Let EAS generate a new keystore (recommended for first build)
# 4. Save the credentials securely
```

## Step 4: Build Android APK

```bash
# Build for preview (APK for testing)
eas build --platform android --profile preview

# Or build for production (AAB for Google Play)
eas build --platform android --profile production
```

This will:
1. Upload your code to EAS Build servers
2. Compile the native Android app
3. Sign with your keystore
4. Generate APK/AAB file

**Build takes 5-15 minutes**

## Step 5: Download APK

Once the build completes:

```bash
# View build status
eas build:list

# Download the APK (replace BUILD_ID with actual ID from list)
eas build:download BUILD_ID
```

Or download directly from Expo Dashboard:
1. Go to https://expo.dev/projects
2. Select your project
3. Click on the build
4. Download APK

## Step 6: Install on Android Device

### Via ADB (if you have Android SDK):
```bash
adb install -r app-release.apk
```

### Via Direct Download:
1. Download APK to your phone
2. Open file manager
3. Tap APK file
4. Follow installation prompts
5. Allow installation from unknown sources if prompted

## Testing the Native Google Sign-In

After installation:

1. **Launch TutorSnap app**
2. **Tap "Continue with Google"**
3. **Expected:** Native Google account selector appears (NOT a browser)
4. **Select your Google account**
5. **Expected:** App returns to home screen with user logged in
6. **Verify:** User info is displayed correctly

## Troubleshooting

### Build Failed: "Credentials not found"
**Solution:** Run `eas credentials` and set up Android credentials

### Build Failed: "Invalid package name"
**Solution:** Package name must be `com.tutorsnap.app` (already configured)

### APK Installation Failed: "App not installed"
**Solution:** 
- Uninstall previous version first
- Enable "Unknown Sources" in Settings
- Try again

### Google Sign-In Shows Browser Instead of Native Picker
**Solution:**
- Verify APK is native build (not Expo Go)
- Check that @react-native-google-signin/google-signin is in APK
- Verify Google credentials are set correctly

## Important Notes

- **First build takes longer** (15-20 minutes) due to compilation
- **Subsequent builds are faster** (5-10 minutes) due to caching
- **Credentials are stored securely** by EAS
- **APK is signed automatically** with your keystore
- **Keep your keystore credentials safe** - you'll need them for production releases

## Next Steps

1. ✅ Build APK with EAS
2. ✅ Install on Android device
3. ✅ Test native Google Sign-In
4. ✅ Verify session persistence
5. ⏳ Implement Apple Sign-In (iOS)
6. ⏳ Submit to Google Play Store

## Quick Reference

| Command | Purpose |
|---------|---------|
| `eas login` | Authenticate with Expo |
| `eas project:create` | Link project to Expo |
| `eas credentials` | Manage Android/iOS credentials |
| `eas build --platform android --profile preview` | Build APK for testing |
| `eas build:list` | View all builds |
| `eas build:download BUILD_ID` | Download APK |

## Support

- Expo Docs: https://docs.expo.dev/build/setup/
- EAS Build: https://docs.expo.dev/build/introduction/
- Google Sign-In: https://docs.expo.dev/guides/google-authentication/
