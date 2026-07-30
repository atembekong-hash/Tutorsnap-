# Android Build Fix — Progress Log

## Goal
Fix Android launch crash and build failure by:
1. Keeping `newArchEnabled: false` (already done in checkpoint `0a5d420a`)
2. Downgrading `react-native-reanimated` from `4.1.6` → `3.19.5`
3. Removing `react-native-worklets` (v4 dependency, not needed in v3)
4. Incrementing versionCode from `47` → `48`
5. Triggering a clean APK build

## Root Cause Summary
- `react-native-purchases@10.4.4` is a legacy module — requires Old Architecture
- `react-native-reanimated@4.x` requires New Architecture (hard Gradle assertion)
- `withLegacyModuleInterop` plugin caused JNI crash on launch
- **Fix**: Downgrade Reanimated to v3.x (supports Old Architecture) + disable New Architecture

## Execution Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ DONE | Create progress log, commit baseline |
| 2 | ✅ DONE | Edit package.json + app.config.ts |
| 3 | ✅ DONE | pnpm install, TypeScript check, tests |
| 4 | ⬜ TODO | Checkpoint + trigger APK build |
| 5 | ⬜ TODO | Report to user |

## Baseline State
- Git commit: `0a5d420a` (checkpoint `0a5d420a`)
- `newArchEnabled: false` ✅
- `withLegacyModuleInterop` plugin: removed ✅
- `react-native-reanimated`: `4.1.6` (needs downgrade)
- `react-native-worklets`: `0.5.1` (needs removal)
- versionCode: `47` (needs increment to `48`)

## Known Issues
- Reanimated v3 does not use `react-native-worklets` — it must be removed from package.json
- babel.config.js may reference `react-native-reanimated/plugin` — this is the same in v3 and v4
- `react-native-worklets` may be referenced in babel.config.js — must check and remove if so

## Recovery Instructions
If environment resets:
1. `cd /home/ubuntu/mathgenius-ai`
2. `git log --oneline -5` — find latest commit
3. Read this file to find current phase
4. Resume from first ⬜ TODO phase

## Last Updated
Phase 3 complete. TypeScript: 0 errors. Tests: 235 passed (20 files). Next: Phase 4 — checkpoint + trigger APK build.

---

## versionCode 49 — dangerouslyForceOverride Fix (New Session)

### Context
Previous attempts to fix the Android launch crash:
- versionCode 46/47: ReactNativeFeatureFlags.override() BEFORE loadReactNative() → overwritten → crash
- versionCode 48: Downgraded Reanimated to v3 + newArchEnabled:false → EAS build failed (react-native-css-interop requires worklets/v4)

### Root Cause (Fully Confirmed)
DefaultNewArchitectureEntryPoint.load() (called INSIDE loadReactNative()) calls
ReactNativeFeatureFlags.override() with stable defaults that SET useTurboModuleInterop=false.
Any override() call BEFORE loadReactNative() gets overwritten.

### Fix Applied
- plugins/withLegacyModuleInterop.js: Rewritten to call dangerouslyForceOverride() AFTER loadReactNative(this)
- app.config.ts: Plugin re-added, newArchEnabled:true, versionCode:49
- components/hello-wave.tsx: Fixed TS error (animationName -> withRepeat/withTiming API)
- components/parallax-scroll-view.tsx: useScrollViewOffset -> useScrollOffset (v4 API)
- package.json: react-native-reanimated:~4.1.6 + react-native-worklets:0.5.1 (restored)
- babel.config.js: Restored to babel-preset-expo with nativewind

### Validation
- expo prebuild: PASS - dangerouslyForceOverride appears AFTER loadReactNative(this)
- TypeScript: 0 errors
- pnpm install: react-native-reanimated@4.1.7 + react-native-worklets@0.5.1 installed

### Phase Status
| Phase | Status | Description |
|-------|--------|-------------|
| 1 | DONE | Fix TS errors (hello-wave.tsx, parallax-scroll-view.tsx) |
| 2 | DONE | Add withLegacyModuleInterop plugin to app.config.ts |
| 3 | DONE | pnpm install (Reanimated v4 + worklets) |
| 4 | DONE | expo prebuild validation + TypeScript check |
| 5 | DONE | Commit + checkpoint |
| 6 | TODO | Trigger APK build |

### Last Updated
Phase 5 complete. All validations passed. Next: Phase 6 - trigger APK build.
