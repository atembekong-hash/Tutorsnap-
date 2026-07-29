/**
 * withLegacyModuleInterop.js
 *
 * Expo config plugin that enables the React Native New Architecture legacy module
 * interop layer for Android. This is required for react-native-purchases (RevenueCat)
 * which uses the old ReactContextBaseJavaModule bridge and is not yet a TurboModule.
 *
 * Root cause: In RN 0.81 New Architecture (Bridgeless) mode, NativeModules.RNPurchases
 * returns undefined because RNPurchasesModule is a legacy module and
 * ReactPackageTurboModuleManagerDelegate.shouldEnableLegacyModuleInterop defaults to false.
 *
 * Fix: Override getReactPackageTurboModuleManagerDelegateBuilder() in DefaultReactNativeHost
 * to return a delegate with unstable_shouldEnableLegacyModuleInterop() = true.
 *
 * IMPORTANT: The override MUST use Kotlin expression-body syntax (= if (...)) to match
 * the parent class method signature in DefaultReactNativeHost.kt. Using a block body
 * { return if (...) } causes a Kotlin type inference error at compile time.
 *
 * References:
 * - DefaultReactNativeHost.kt (RN 0.81) lines 40-47
 * - ReactPackageTurboModuleManagerDelegate.kt (RN 0.81)
 * - DefaultTurboModuleManagerDelegate.kt (RN 0.81)
 */

const { withMainApplication } = require('expo/config-plugins');

const withLegacyModuleInterop = (config) => {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    // Check if already patched
    if (contents.includes('unstable_shouldEnableLegacyModuleInterop')) {
      console.log('[withLegacyModuleInterop] Already patched — skipping.');
      return config;
    }

    // Add the required import for ReactPackageTurboModuleManagerDelegate
    const importToAdd = 'import com.facebook.react.ReactPackageTurboModuleManagerDelegate';
    if (!contents.includes(importToAdd)) {
      // Insert after the first import from com.facebook.react.defaults
      contents = contents.replace(
        /(import com\.facebook\.react\.defaults\.[^\n]+\n)/,
        '$1' + importToAdd + '\n'
      );
    }

    // Override using Kotlin expression-body syntax (= if (...)) to match the parent class.
    // Using a block body { return if (...) } causes a Kotlin type error because the
    // compiler cannot infer the return type from a block body override.
    const legacyInteropOverride = `
    override fun getReactPackageTurboModuleManagerDelegateBuilder(): ReactPackageTurboModuleManagerDelegate.Builder? =
        if (isNewArchEnabled) {
          object : com.facebook.react.defaults.DefaultTurboModuleManagerDelegate.Builder() {
            override fun unstable_shouldEnableLegacyModuleInterop(): Boolean = true
          }
        } else {
          null
        }`;

    // Insert after the isNewArchEnabled property line inside DefaultReactNativeHost.
    // Use a regex to be whitespace-agnostic (the generated file may have varying indentation).
    const isNewArchRegex = /([ \t]*override val isNewArchEnabled: Boolean = BuildConfig\.IS_NEW_ARCHITECTURE_ENABLED)/;
    if (isNewArchRegex.test(contents)) {
      contents = contents.replace(
        isNewArchRegex,
        (match, line) => line + legacyInteropOverride
      );
      console.log('[withLegacyModuleInterop] ✅ Patched MainApplication.kt to enable legacy module interop.');
    } else {
      console.warn('[withLegacyModuleInterop] ⚠️ Could not find isNewArchEnabled line in MainApplication.kt. Manual patch required.');
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withLegacyModuleInterop;
