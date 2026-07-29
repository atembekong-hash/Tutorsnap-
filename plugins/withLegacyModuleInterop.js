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
 * Fix: Call ReactNativeFeatureFlags.override() in MainApplication.onCreate() BEFORE
 * loadReactNative(this) to set useTurboModuleInterop = true.
 *
 * This is the correct RN 0.81 API. The previous approach of subclassing
 * DefaultTurboModuleManagerDelegate.Builder was wrong because:
 *   - DefaultTurboModuleManagerDelegate.Builder is not open (effectively final in Kotlin)
 *   - unstable_shouldEnableLegacyModuleInterop() is on the delegate, not the Builder
 *
 * References:
 * - ReactNativeFeatureFlags.kt (RN 0.81) — override() method
 * - ReactNativeFeatureFlagsDefaults.kt (RN 0.81) — useTurboModuleInterop() defaults to false
 * - ReactPackageTurboModuleManagerDelegate.kt (RN 0.81) — shouldEnableLegacyModuleInterop
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

    // Step 1: Add the required imports for ReactNativeFeatureFlags and ReactNativeFeatureFlagsDefaults.
    // Insert after the last existing import line.
    const importBlock =
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

    // Step 2: Insert ReactNativeFeatureFlags.override() call at the beginning of onCreate(),
    // BEFORE loadReactNative(this) so the flag is set before RN initializes.
    //
    // The generated onCreate() looks like:
    //   override fun onCreate() {
    //     super.onCreate()
    //     DefaultNewArchitectureEntryPoint.releaseLevel = ...
    //     loadReactNative(this)
    //     ...
    //   }
    //
    // We insert the override call right after super.onCreate()
    const featureFlagOverride =
      '\n    ReactNativeFeatureFlags.override(object : ReactNativeFeatureFlagsDefaults() {\n' +
      '      override fun useTurboModuleInterop(): Boolean = true\n' +
      '    })';

    const onCreateRegex = /(override fun onCreate\(\) \{[\s\S]*?super\.onCreate\(\))/;
    if (onCreateRegex.test(contents)) {
      contents = contents.replace(
        onCreateRegex,
        (match) => match + featureFlagOverride
      );
      console.log('[withLegacyModuleInterop] ✅ Patched MainApplication.kt onCreate() to enable useTurboModuleInterop.');
    } else {
      console.warn('[withLegacyModuleInterop] ⚠️ Could not find onCreate() in MainApplication.kt. Manual patch required.');
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withLegacyModuleInterop;

