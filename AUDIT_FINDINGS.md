# TutorSnap — Full Application Audit Findings

## Issues Found and Fixed

### 1. Generic accessibilityLabel on VoiceButton (voice-button.tsx)
- **Root cause**: `accessibilityLabel="Button"` — non-descriptive for screen readers.
- **Fix**: Changed to state-aware label: "Stop recording" / "Processing voice input" / "Start voice input", added `accessibilityRole="button"` and `accessibilityState`.

### 2. Unguarded setTimeout — shieldUsedToast (app/(tabs)/index.tsx)
- **Root cause**: `setTimeout(() => setShieldUsedToast(false), 4000)` called without a ref, could fire after unmount.
- **Fix**: Added `shieldToastTimerRef` and `clearTimeout` guard.

### 3. Unguarded setTimeout — shareCopied (app/(tabs)/chat.tsx)
- **Root cause**: `setTimeout(() => setShareCopied(false), 2500)` without cleanup ref.
- **Fix**: Added `shareCopiedTimerRef` and `clearTimeout` guard.

### 4. Unguarded setTimeout — copiedCode (app/(tabs)/classroom.tsx)
- **Root cause**: `setTimeout(() => setCopiedCode(false), 2000)` without cleanup ref.
- **Fix**: Added `copiedCodeTimerRef` and `clearTimeout` guard. Also added `useRef` to React import.

### 5. Unguarded setTimeout — copiedId (app/chat-history.tsx)
- **Root cause**: `setTimeout(() => setCopiedId(null), 2500)` without cleanup ref.
- **Fix**: Added `copiedIdTimerRef` and `clearTimeout` guard.

### 6. Unguarded setTimeout — toast/copied (app/refer.tsx)
- **Root cause**: Two bare `setTimeout` calls for toast and copied state.
- **Fix**: Added `toastTimerRef` and `copiedTimerRef` with `clearTimeout` guards.

### 7. Unguarded setTimeout — copied (app/leaderboard.tsx)
- **Root cause**: `setTimeout(() => setCopied(false), 2000)` without cleanup ref.
- **Fix**: Added `useRef` to import, added `copiedTimerRef` and `clearTimeout` guard.

### Still Needs Cleanup (lower risk — fire-and-forget on UI refs, not state)
- `app/(tabs)/chat.tsx` lines 758, 801: `setTimeout(() => flatListRef.current?.scrollToEnd(...))` — safe, refs don't cause state updates after unmount.
- `app/chat-history.tsx` lines 261, 359: `setTimeout(() => inputRef.current?.focus())` — safe, ref-only.
- `app/_layout.tsx` lines 77, 102: navigation redirects, one-shot.
- `app/oauth/callback.tsx` lines 64, 161, 216: navigation redirects, one-shot.
- `app/onboarding.tsx` line 98: navigation redirect, one-shot.
- `app/quiz-history-detail.tsx` line 307: copied state — same pattern, fix in pass 3.
- `app/quiz.tsx` line 167: copied state — same pattern, fix in pass 3.
- `app/settings.tsx` line 200: timer with cleanup (has `return () => clearTimeout(timer)`).
- `app/solution.tsx` line 115: copied state — same pattern, fix in pass 3.

### 8. Appearance Context — Undo preset (lib/appearance-context.tsx)
- **Added**: `previousSettings` field, `undoPreset` action, snapshot taken before each `applyPreset` call.

### 9. Appearance Settings — Undo toast (app/appearance-settings.tsx)
- **Added**: `undoVisible` state, `undoTimerRef`, `handleUndoPreset`, floating toast overlay with "Preset applied / Undo" row.

### 10. Preset dark-mode swatches (lib/appearance-context.tsx + app/appearance-settings.tsx)
- **Added**: `swatchesDark` field to `PresetTheme` interface and all four preset entries.
- **Fixed**: Swatch strip now renders `swatchesDark` when `colorScheme === "dark"`.

## Issues Found — Not Yet Fixed (queued for pass 3)
- `app/quiz-history-detail.tsx` line 307: unguarded copied timer.
- `app/quiz.tsx` line 167: unguarded copied timer.
- `app/solution.tsx` line 115: unguarded copied timer.
- `app/(tabs)/chat.tsx` line 758/801: scrollToEnd timers (low risk, ref-only).

## TypeScript Status
- 0 errors after all fixes above.

---

# Phase 4-7 Audit Findings (New Pass)

## CONFIRMED BUGS / ISSUES TO FIX

### 1. Notification Routing Bug (MEDIUM - Dead tap)
- **File**: `app/_layout.tsx` lines 126-148
- **Issue**: Affiliate notifications send `data: { screen: "/refer" }` and `data: { screen: "refer", type: "affiliate_digest" }`, but the notification tap handler has no branch for these.
- **Also**: Homework notifications send `data: { problemId }` (no `type` field) but handler checks `data.type === "homework_reminder"` — homework notification taps do nothing.
- **Fix**: Add `else if (data?.screen === "/refer" || data?.screen === "refer") { router.push("/refer") }` and `else if (data?.problemId) { router.push("/(tabs)/classroom") }` branches.

### 2. UTC Date Bug in Streak Logic (MEDIUM - Wrong streak for non-UTC users)
- **File**: `lib/progress.ts` lines 29-43
- **Issue**: `getTodayString()` and `getYesterdayString()` use `toISOString().split("T")[0]` (UTC), not local date. Streak resets at UTC midnight, not user's local midnight.
- **Also in**: `lib/weekly-goals.ts` line 25 (same pattern).
- **Fix**: Replace with local date helpers using `getFullYear()`, `getMonth()`, `getDate()`.

### 3. Unused Imports / Dead Code (ESLint Warnings)
- `components/upsell-nudge-banner.tsx:26` — `IconSymbol` imported but never used
- `app/appearance-settings.tsx:39` — `DEFAULT_WIDGET_ORDER` imported but never used
- `app/settings.tsx:39,141` — `FontSizeScale` type and `fontScale`/`setFontScale` never used
- `app/progress.tsx:28` — `BADGE_THRESHOLDS` imported but never used
- `components/almost-there-banner.tsx:14` — `withSpring` imported but never used
- `app/_layout.tsx:24` — `AppearanceSettings` type imported but never used
- `app/(tabs)/index.tsx:373` — `DailyChallengeCard` function defined but never rendered (dead code)
- `app/(tabs)/_layout.tsx:10` — `focused` param in `ScanTabIcon` unused

### 4. Unused Variables (ESLint Warnings)
- `app/(tabs)/index.tsx:147` — `visibleWidgetOrder` destructured but never used
- `app/onboarding.tsx:174` — `idx` in `.map()` unused
- `app/quiz.tsx:316` — `checkLimit` destructured but never used

### 5. Duplicate React Import
- `components/streak-protection-banner.tsx` — React imported twice

### 6. Unguarded JSON.parse calls (MEDIUM - Potential crashes)
- `lib/bookmarks.ts:10` — `JSON.parse(stored)` no guard
- `lib/challenge-history.ts:32` — `JSON.parse(raw)` no guard
- `lib/daily-challenge.ts:238` — `JSON.parse(raw)` no guard
- `lib/leaderboard.ts:42` — `JSON.parse(raw)` no guard
- `lib/mastery-badges.ts:14` — `JSON.parse(raw)` no guard
- `lib/quiz-history.ts:45` — `JSON.parse(raw)` no guard
- `lib/study-planner.ts:37,86,98` — `JSON.parse(raw)` no guard

### 7. Copied-state unguarded timers (from previous audit pass - queued)
- `app/quiz-history-detail.tsx:307` — unguarded copied timer
- `app/quiz.tsx:167` — unguarded copied timer
- `app/solution.tsx:115` — unguarded copied timer

### ROUTES VERIFIED ✓
All 35 routes exist and are navigable. All 58 icon names mapped.

### TYPESCRIPT ✓
0 errors.
