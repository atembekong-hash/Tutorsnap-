/**
 * withLegacyModuleInterop.js
 *
 * Expo config plugin that enables legacy module interop in React Native 0.81 New Architecture.
 *
 * PROBLEM:
 *   react-native-purchases@10.4.4 is a legacy (non-TurboModule) native module.
 *   In New Architecture (Bridgeless) mode, NativeModules.RNPurchases is undefined
 *   because legacy module interop is disabled by default.
 *
 * ROOT CAUSE (confirmed by reading RN 0.81 source):
 *   ReactPackageTurboModuleManagerDelegate reads shouldEnableLegacyModuleInterop from
 *   ReactNativeNewArchitectureFeatureFlags.useTurboModuleInterop() at construction time.
 *   ReactNativeNewArchitectureFeatureFlags.useTurboModuleInterop() delegates to
 *   ReactNativeFeatureFlags.useTurboModuleInterop() which defaults to false.
 *
 *   DefaultNewArchitectureEntryPoint.load() (called INSIDE loadReactNative()) calls
 *   ReactNativeFeatureFlags.override() with stable defaults that set useTurboModuleInterop=false.
 *   Any override() call BEFORE loadReactNative() gets overwritten by this.
 *
 * SOLUTION:
 *   Call ReactNativeFeatureFlags.dangerouslyForceOverride() AFTER loadReactNative(this).
 *   dangerouslyForceOverride() is designed to override flags even after they have been set/read.
 *   It resets the accessor and applies the new provider, setting useTurboModuleInterop=true.
 *   This happens before the JS bundle executes, so the delegate picks up the correct value.
 *
 * PREVIOUS ATTEMPTS AND WHY THEY FAILED:
 *   1. override() BEFORE loadReactNative() — overwritten by DefaultNewArchitectureEntryPoint.load()
 *   2. SoLoader.init() + override() BEFORE loadReactNative() — same overwrite problem
 *   3. Downgrade Reanimated to v3 + newArchEnabled:false — fails because react-native-css-interop
 *      (used by NativeWind v4) hardcodes react-native-worklets/plugin which requires Reanimated v4
 */

const { withMainApplication } = require('expo/config-plugins');

const withLegacyModuleInterop = (config) => {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    // Skip if already patched
    if (contents.includes('dangerouslyForceOverride')) {
      console.log('[withLegacyModuleInterop] Already patched — skipping.');
      return config;
    }

    // Step 1: Add required imports after the last import line
    const lines = contents.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIdx = i;
      }
    }

    const importsToAdd = [
      'import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags',
      'import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsDefaults',
    ];

    if (lastImportIdx >= 0) {
      const newImports = importsToAdd.filter(imp => !contents.includes(imp));
      if (newImports.length > 0) {
        lines.splice(lastImportIdx + 1, 0, newImports.join('\n'));
        contents = lines.join('\n');
      }
    }

    // Step 2: Insert dangerouslyForceOverride() AFTER loadReactNative(this)
    //
    // The generated onCreate() looks like:
    //   override fun onCreate() {
    //     super.onCreate()
    //     DefaultNewArchitectureEntryPoint.releaseLevel = ...
    //     loadReactNative(this)
    //     ...
    //   }
    //
    // We insert AFTER loadReactNative(this):
    //   ReactNativeFeatureFlags.dangerouslyForceOverride(object : ReactNativeFeatureFlagsDefaults() {
    //     override fun useTurboModuleInterop(): Boolean = true
    //   })
    //
    // WHY AFTER: DefaultNewArchitectureEntryPoint.load() (inside loadReactNative) calls
    // ReactNativeFeatureFlags.override() which would overwrite any pre-loadReactNative setting.
    // dangerouslyForceOverride() is designed to override flags even after they have been set.

    const overrideBlock =
      '\n    // Enable legacy module interop for react-native-purchases (non-TurboModule).\n' +
      '    // Must be called AFTER loadReactNative() because DefaultNewArchitectureEntryPoint.load()\n' +
      '    // (called inside loadReactNative) calls ReactNativeFeatureFlags.override() with stable\n' +
      '    // defaults that reset useTurboModuleInterop to false. dangerouslyForceOverride() overrides\n' +
      '    // flags even after they have been set/read by the stable defaults.\n' +
      '    ReactNativeFeatureFlags.dangerouslyForceOverride(object : ReactNativeFeatureFlagsDefaults() {\n' +
      '      override fun useTurboModuleInterop(): Boolean = true\n' +
      '    })';

    // Match loadReactNative(this) with any surrounding whitespace
    const loadReactNativeRegex = /([ \t]*loadReactNative\(this\))/;
    if (loadReactNativeRegex.test(contents)) {
      contents = contents.replace(
        loadReactNativeRegex,
        (match) => match + overrideBlock
      );
      console.log('[withLegacyModuleInterop] ✅ Patched MainApplication.kt: dangerouslyForceOverride after loadReactNative().');
    } else {
      console.warn('[withLegacyModuleInterop] ⚠️ Could not find loadReactNative(this) in MainApplication.kt. Manual patch required.');
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withLegacyModuleInterop;
