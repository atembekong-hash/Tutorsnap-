# Build Native Android APK via Expo Dashboard

Since you're working from your phone, the easiest way to build your APK is through Expo's web dashboard. No CLI commands needed!

## Step 1: Push Project to GitHub

First, your project needs to be on GitHub so Expo can access it.

```bash
cd /home/ubuntu/mathgenius-ai

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Native Google Sign-In implementation ready for EAS Build"

# Add GitHub remote (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/tutorsnap-mobile.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Connect GitHub to Expo

1. **Go to:** https://expo.dev/accounts/vvault07/projects/mathgenius-ai
2. **Click:** "Connect GitHub repository"
3. **Select:** Your GitHub repository (tutorsnap-mobile)
4. **Authorize:** Expo to access your GitHub account

## Step 3: Build APK via Dashboard

1. **Go to:** https://expo.dev/accounts/vvault07/projects/mathgenius-ai
2. **Click:** "Builds" tab
3. **Click:** "Create new build"
4. **Select:** 
   - Platform: **Android**
   - Build profile: **preview**
   - Branch: **main**
5. **Click:** "Build"

**Build will start automatically!** (Takes 15-20 minutes for first build)

## Step 4: Download APK

Once the build completes:

1. **Go to:** https://expo.dev/accounts/vvault07/projects/mathgenius-ai/builds
2. **Find:** Your completed build (green checkmark)
3. **Click:** The build
4. **Click:** "Download" button
5. **Save** the APK file

## Step 5: Install on Android Device

### Option A: Direct Download to Phone
1. Open this link on your phone: https://expo.dev/accounts/vvault07/projects/mathgenius-ai/builds
2. Find your build
3. Tap "Download"
4. When prompted, tap "Install"
5. Allow installation from unknown sources if asked

### Option B: Via Email/Cloud Storage
1. Download APK on computer
2. Email or upload to Google Drive
3. Download on phone
4. Open file manager
5. Tap APK file
6. Tap "Install"

## Step 6: Test Native Google Sign-In

After installation:

1. **Open TutorSnap app**
2. **Tap "Continue with Google"**
3. **Expected:** Native Google account selector appears (NOT a browser)
4. **Select** your Google account
5. **Verify:** App shows you're logged in

## Troubleshooting

### Build Failed
- Check the build logs in the Expo Dashboard
- Common issues: Missing credentials, config errors
- Contact Expo support if needed

### APK Won't Install
- Uninstall previous version first
- Enable "Unknown Sources" in Settings → Security
- Try again

### Google Sign-In Shows Browser
- Verify you're using the native APK (not Expo Go)
- Check that @react-native-google-signin/google-signin is included
- Rebuild if needed

## Important Notes

- **First build:** 15-20 minutes (compilation)
- **Subsequent builds:** 5-10 minutes (cached)
- **APK is signed automatically** by Expo
- **Credentials are secure** - stored in Expo's servers
- **Your GitHub repo** must be public or Expo must have access

## Next Steps After Testing

1. ✅ Build APK via Expo Dashboard
2. ✅ Install on Android device
3. ✅ Test native Google Sign-In
4. ✅ Verify session persistence
5. ⏳ Implement Apple Sign-In (iOS)
6. ⏳ Submit to Google Play Store

## Dashboard Links

- **Project:** https://expo.dev/accounts/vvault07/projects/mathgenius-ai
- **Builds:** https://expo.dev/accounts/vvault07/projects/mathgenius-ai/builds
- **Settings:** https://expo.dev/accounts/vvault07/projects/mathgenius-ai/settings

## Support

- Expo Docs: https://docs.expo.dev/build/setup/
- EAS Build Guide: https://docs.expo.dev/build/introduction/
- GitHub Integration: https://docs.expo.dev/build/github-integration/
