/**
 * withLegacyModuleInterop.js
 *
 * Expo config plugin that enables the React Native New Architecture legacy module
 * interop layer for Android. This is required for react-native-purchases (RevenueCat)
 * which uses the old ReactContextBaseJavaModule bridge and is not yet a TurboModule.
 *
 * Root cause: In RN 0.81 New Architecture (Bridgeless) mode, NativeModules.RNPurchases
 * returns undefined because:
 *   1. RNPurchasesModule is a legacy ReactContextBaseJavaModule (not a TurboModule)
 *   2. ReactPackageTurboModuleManagerDelegate.unstable_shouldEnableLegacyModuleInterop()
 *      returns enableBridgelessArchitecture() && useTurboModuleInterop()
 *   3. ReactNativeFeatureFlags.useTurboModuleInterop() defaults to false
 *
 * Fix: Call SoLoader.init() then ReactNativeFeatureFlags.override() in MainApplication.onCreate()
 * BEFORE loadReactNative(this) to set useTurboModuleInterop = true.
 *
 * IMPORTANT: ReactNativeFeatureFlags.override() calls ReactNativeFeatureFlagsCxxInterop.override()
 * which is a JNI call that requires SoLoader to be initialized first. Without SoLoader.init(),
 * the app crashes immediately on launch because the native library cannot be loaded.
 *
 * The fix calls SoLoader.init(this, false) before the override() call. SoLoader.init() is
 * idempotent — loadReactNative() will call it again harmlessly.
 *
 * References:
 * - ReactNativeFeatureFlags.kt (RN 0.81) — override() method
 * - ReactNativeFeatureFlagsCxxInterop.kt (RN 0.81) — loads react_featureflagsjni via SoLoader
 * - GenerateEntryPointTask.kt (RN 0.81) — loadReactNative() calls SoLoader.init() first
 * - ReactNativeFeatureFlagsDefaults.kt (RN 0.81) — useTurboModuleInterop() defaults to false
 */

const { withMainApplication } = require('expo/config-plugins');

const withLegacyModuleInterop = (config) => {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    // Check if already patched
    if (contents.includes('useTurboModuleInterop')) {
      console.log('[withLegacyModuleInterop] Already patched — skipping.');
      return config;
    }

    // Step 1: Add the required imports.
    // We need:
    //   - SoLoader (to call SoLoader.init before the JNI-backed feature flags override)
    //   - ReactNativeFeatureFlags + ReactNativeFeatureFlagsDefaults (for the override itself)
    const importBlock =
      'import com.facebook.soloader.SoLoader\n' +
      'import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags\n' +
      'import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsDefaults';

    const lines = contents.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIdx = i;
      }
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, importBlock);
      contents = lines.join('\n');
    }

    // Step 2: Insert SoLoader.init() + ReactNativeFeatureFlags.override() call at the beginning
    // of onCreate(), BEFORE loadReactNative(this) so the flag is set before RN initializes.
    //
    // The generated onCreate() looks like:
    //   override fun onCreate() {
    //     super.onCreate()
    //     DefaultNewArchitectureEntryPoint.releaseLevel = ...
    //     loadReactNative(this)
    //     ...
    //   }
    //
    // We insert after super.onCreate():
    //   SoLoader.init(this, false)   ← required before any JNI-backed feature flag calls
    //   ReactNativeFeatureFlags.override(object : ReactNativeFeatureFlagsDefaults() {
    //     override fun useTurboModuleInterop(): Boolean = true
    //   })
    const featureFlagOverride =
      '\n    // Initialize SoLoader before calling ReactNativeFeatureFlags.override().\n' +
      '    // ReactNativeFeatureFlags.override() is backed by a JNI call that requires\n' +
      '    // SoLoader to be initialized first. Without this, the app crashes on launch.\n' +
      '    // SoLoader.init() is idempotent — loadReactNative() will call it again safely.\n' +
      '    SoLoader.init(this, false)\n' +
      '    ReactNativeFeatureFlags.override(object : ReactNativeFeatureFlagsDefaults() {\n' +
      '      override fun useTurboModuleInterop(): Boolean = true\n' +
      '    })';

    const onCreateRegex = /(override fun onCreate\(\) \{[\s\S]*?super\.onCreate\(\))/;
    if (onCreateRegex.test(contents)) {
      contents = contents.replace(
        onCreateRegex,
        (match) => match + featureFlagOverride
      );
      console.log('[withLegacyModuleInterop] ✅ Patched MainApplication.kt onCreate() with SoLoader.init() + useTurboModuleInterop override.');
    } else {
      console.warn('[withLegacyModuleInterop] ⚠️ Could not find onCreate() in MainApplication.kt. Manual patch required.');
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withLegacyModuleInterop;
