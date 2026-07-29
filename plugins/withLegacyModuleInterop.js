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
 * References:
 * - ReactPackageTurboModuleManagerDelegate.kt (RN 0.81)
 * - DefaultTurboModuleManagerDelegate.kt (RN 0.81)
 * - https://reactnative.dev/docs/new-architecture-intro#interoperability-layer
 */

const { withMainApplication } = require('@expo/config-plugins');

const withLegacyModuleInterop = (config) => {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    // Check if already patched
    if (contents.includes('shouldEnableLegacyModuleInterop')) {
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

    // Minimal override: only override unstable_shouldEnableLegacyModuleInterop.
    // DefaultTurboModuleManagerDelegate.Builder handles setPackages() and
    // setReactApplicationContext() internally — no need to override build().
    const legacyInteropOverride = `
        override fun getReactPackageTurboModuleManagerDelegateBuilder(): ReactPackageTurboModuleManagerDelegate.Builder? {
          return if (isNewArchEnabled) {
            object : com.facebook.react.defaults.DefaultTurboModuleManagerDelegate.Builder() {
              override fun unstable_shouldEnableLegacyModuleInterop(): Boolean = true
            }
          } else {
            null
          }
        }`;

    // Insert after the isNewArchEnabled line inside DefaultReactNativeHost
    const isNewArchLine = 'override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED';
    if (contents.includes(isNewArchLine)) {
      contents = contents.replace(
        isNewArchLine,
        isNewArchLine + legacyInteropOverride
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
