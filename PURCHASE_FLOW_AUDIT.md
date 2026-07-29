# Purchase Flow Audit — Root Cause & Fix

## Status: FIX IN PROGRESS (versionCode 46 build pending)

---

## Root Cause (CONFIRMED)

**`NativeModules.RNPurchases` is `undefined` at runtime in New Architecture (Bridgeless) mode.**

### Evidence Chain

1. **v45 AAB JS bundle** contains the string:
   `[RevenueCat] configure failed:[RevenueCat] isConfigured() returning false: Native module not available`
   This is the RC SDK's own error from `throwIfNativeModuleNotAvailable()`.

2. **`react-native-purchases@10.4.4` `environment.js` line 65**:
   ```js
   var RNPurchases = usingBrowserMode ? browserNativeModuleRNPurchases : NativeModules.RNPurchases;
   ```
   In production (not Expo Go, not web), `usingBrowserMode = false`, so it uses `NativeModules.RNPurchases`.

3. **`RNPurchasesModule.java`** extends `ReactContextBaseJavaModule` — it is a **legacy module**, NOT a TurboModule.

4. **`ReactPackageTurboModuleManagerDelegate.kt` (RN 0.81)**:
   ```kotlin
   override fun getModule(moduleName: String): TurboModule? {
     val isLegacyModule = resolvedModule !is TurboModule
     if (isLegacyModule) {
       return null  // ← RNPurchasesModule returns null here
     }
   }
   override fun getLegacyModule(moduleName: String): NativeModule? {
     if (!unstable_shouldEnableLegacyModuleInterop()) {
       return null  // ← Legacy interop disabled by default
     }
   }
   ```

5. **`shouldEnableLegacyModuleInterop` defaults to `false`** in `DefaultTurboModuleManagerDelegate`.

6. In New Arch (Bridgeless) mode, `NativeModules = global.nativeModuleProxy` which calls `__turboModuleProxy(name)`. Since `RNPurchasesModule` is not a TurboModule and legacy interop is disabled, `NativeModules.RNPurchases = undefined`.

7. `throwIfNativeModuleNotAvailable()` throws → caught by `_doInit()` catch block → `_rcAvailable = false`.

8. `purchaseProduct()` previously hit the **silent local-grant fallback** (already fixed in current code to return an error instead).

---

## Fix Applied

### File: `plugins/withLegacyModuleInterop.js` (NEW)

Expo config plugin that patches `MainApplication.kt` during EAS build to:
1. Add import: `import com.facebook.react.ReactPackageTurboModuleManagerDelegate`
2. Override `getReactPackageTurboModuleManagerDelegateBuilder()` inside `DefaultReactNativeHost` to return a custom `DefaultTurboModuleManagerDelegate.Builder` with `unstable_shouldEnableLegacyModuleInterop(): Boolean = true`

### File: `app.config.ts`

Added `"./plugins/withLegacyModuleInterop"` to the plugins array.

### File: `lib/subscription.ts`

- Removed silent local-grant fallback in `purchaseProduct()` — now returns explicit error
- Added comprehensive logging to `_doInit()` and `purchaseProduct()`
- `_rcAvailable = false` now surfaces as a user-visible error, not a silent premium grant

---

## Correct Plugin Code

The `build()` override in the plugin is NOT needed — `DefaultTurboModuleManagerDelegate.Builder`
already handles `setPackages()` and `setReactApplicationContext()` internally via the parent
`ReactPackageTurboModuleManagerDelegate.Builder.build()` method.

The correct minimal override is:

```kotlin
override fun getReactPackageTurboModuleManagerDelegateBuilder(): ReactPackageTurboModuleManagerDelegate.Builder? {
  return if (isNewArchEnabled) {
    object : com.facebook.react.defaults.DefaultTurboModuleManagerDelegate.Builder() {
      override fun unstable_shouldEnableLegacyModuleInterop(): Boolean = true
    }
  } else {
    null
  }
}
```

The `build()` override was removed in the final plugin version.

---

## Build History

| versionCode | Build ID | Status | Notes |
|-------------|----------|--------|-------|
| 44 | (previous) | Released | Silent purchase fallback bug present |
| 45 | 69351208-653e-415e-a473-f46f32d8e357 | Released | Silent fallback removed, but RC still fails (no interop fix) |
| 46 | PENDING | Building | withLegacyModuleInterop plugin added — should fix NativeModules.RNPurchases |

---

## What to Verify After v46 Build

1. `[RC-INIT] ✅ Purchases.configure() succeeded` appears in device logs
2. Tapping Monthly/Annual shows the Google Play purchase dialog
3. RevenueCat receives the purchase event
4. Premium entitlement is granted only after verified purchase

---

## References

- RN 0.81 ReactPackageTurboModuleManagerDelegate: `node_modules/.pnpm/react-native@0.81.5.../ReactPackageTurboModuleManagerDelegate.kt`
- DefaultTurboModuleManagerDelegate: `node_modules/.pnpm/react-native@0.81.5.../DefaultTurboModuleManagerDelegate.kt`
- react-native-purchases environment.js: `node_modules/.pnpm/react-native-purchases@10.4.4.../dist/utils/environment.js`
- react-native-purchases purchases.js line 65: `NativeModules.RNPurchases`
