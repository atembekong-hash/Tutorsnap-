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
| 2 | ⬜ TODO | Edit package.json + app.config.ts |
| 3 | ⬜ TODO | pnpm install, TypeScript check, tests |
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
Phase 1 complete. Next: Phase 2 — edit package.json and app.config.ts.
