# MathGenius AI — Full Application Audit Findings

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
