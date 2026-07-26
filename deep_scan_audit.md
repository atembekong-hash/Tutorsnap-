# TutorSnap Deep Scan Audit — v1.8.6 (Jul 26 2026)

## TypeScript
- **0 errors** — `npx tsc --noEmit` passes clean.

## Routes
- All `router.push` / `router.replace` targets are registered in `app/_layout.tsx`.
- All screen files exist on disk.
- No orphaned routes.

## Icon Mapping
- **BUG**: `name="waveform"` used in `app/aire-analytics.tsx:236` is NOT in the icon-symbol.tsx mapping.
  - Fix: add `"waveform": "equalizer"` to the MAPPING in `components/ui/icon-symbol.tsx`.
  - On iOS the native SF Symbol `waveform` is valid, so only the Android/web fallback is broken.

## Empty `onPress` Handlers (intentional stop-propagation pattern)
- `app/(tabs)/chat.tsx:3274` — inner sheet wrapper, stops backdrop tap from closing. ✅ Intentional.
- `app/bookmarks.tsx:688` — inner folder modal wrapper, stops backdrop tap from closing. ✅ Intentional.
- `app/solution.tsx:848` — inner share menu wrapper, stops backdrop tap from closing. ✅ Intentional.

## Dev Server
- Only warning: `expo-notifications` push token listener not supported on web. ✅ Expected, non-blocking.

## Feature A — A/B Dashboard
- Screen exists: `app/ab-test-dashboard.tsx` ✅
- Route registered in `app/_layout.tsx` ✅
- Long-press wired in `app/settings.tsx` with `delayLongPress={800}` ✅
- All imports from `lib/ab-test.ts` resolve correctly ✅
- **Enhancement opportunity**: Dashboard does not show lock status. Could show "🔒 Locked" badge.

## Feature B — QR Share
- `captureRef`, `expo-sharing`, `expo-file-system/legacy` all imported ✅
- `qrViewRef` declared as `useRef<View>(null)` ✅ (View is imported from react-native)
- `collapsable={false}` set on QR wrapper View ✅
- `handleShareQR` handles both native (PNG capture) and web (text share) ✅
- ActivityIndicator shown while sharing ✅

## Feature C — Variant Lock
- `TRIAL_VARIANT_LOCKED_KEY` defined ✅
- `lockVariant()` and `unlockVariant()` exported ✅
- `getTrialVariantConfig()` checks lock flag first ✅
- `lockVariant()` called in `paywall.tsx` `handleStartTrial` after success ✅

## Fixes Required
1. **icon-symbol.tsx**: Add `"waveform": "equalizer"` to MAPPING (aire-analytics.tsx crashes on Android/web without it)

## Tests
- 89/89 passing ✅
