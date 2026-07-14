# TutorSnap Full Application Audit Findings

## Audit Date: 2026-07-14

## STATUS: TypeScript — 0 errors (clean build)

---

## ISSUES FOUND

### 1. Missing Cleanup on Unmount — Timer Refs in chat.tsx
**Severity:** Medium (memory leak risk)
**Root cause:** `slowTooltipTimerRef`, `transcriptToastTimerRef`, `subjectClearedTimerRef`, `highVelocityPauseTimerRef`, `scrollPendingRef`, `shareCopiedTimerRef` are cleared inline but there is no single `useEffect` cleanup that clears ALL of them on component unmount.
**Fix:** Add a single unmount cleanup useEffect that clears all timer refs.
**Files:** `app/(tabs)/chat.tsx`

### 2. Round 35 Suggested Improvements (not yet implemented)
- Reconnecting spinner in slow-connection tooltip that upgrades to "Fast connection restored" (green)
- Scroll momentum detector (deceleration phase pause, not just flick phase)
- Badge pulse animation when badge first increments

### 3. Inline Style Objects (198 instances)
**Severity:** Low (performance — recreated every render)
**Root cause:** `style={{ ... }}` inline objects in JSX are recreated on every render.
**Fix:** Move frequently-rendered inline styles to StyleSheet.create() or useMemo.
**Files:** Multiple screens — most are dynamic (color-dependent) so acceptable; flag only static ones.

### 4. Accessibility Gap — 914 interactive elements, only 287 have accessibilityLabel
**Severity:** Medium
**Root cause:** Many TouchableOpacity/Pressable elements lack accessibilityLabel.
**Fix:** Add accessibilityLabel to all icon-only buttons and critical interactive elements.
**Files:** All screens.

### 5. Scan screen Image missing accessibilityLabel
**Severity:** Low
**Root cause:** `<Image source={{ uri: selectedImage }} />` has no accessibilityLabel.
**Fix:** Add `accessibilityLabel="Captured problem image"`.
**Files:** `app/(tabs)/scan.tsx`

### 6. CommonJS require() in TSX files
**Severity:** Low (style issue, not a bug)
**Root cause:** `require("expo-haptics")` and `require("../paywall")` used inside callbacks.
**Fix:** Move to top-level ES imports where possible; dynamic require is acceptable for lazy-loaded paywall modal.
**Files:** `app/(tabs)/chat.tsx`, `app/(tabs)/index.tsx`, `app/quiz.tsx`

### 7. Empty catch blocks swallowing errors silently
**Severity:** Low (acceptable for fire-and-forget operations like AsyncStorage saves)
**Root cause:** Many `.catch(() => {})` patterns for non-critical operations.
**Assessment:** Acceptable for notification scheduling, AsyncStorage writes, and Linking.openURL. No action needed.

### 8. `as any` type casts (router.push paths)
**Severity:** Low (Expo Router typed routes not fully configured)
**Root cause:** Expo Router typed routes require `typedRoutes: true` in experiments (already set) but route types may not be fully generated.
**Assessment:** Acceptable pattern for now; no functional impact.

### 9. No branding issues — TutorSnap branding confirmed throughout
**Status:** PASS — no MathGenius/mathgeniusai strings found in app code.

### 10. No broken navigation flows found
**Status:** PASS — all 36+ router.push/replace calls point to valid screen files.

### 11. No TypeScript errors
**Status:** PASS — 0 errors confirmed.

### 12. chat.tsx missing global unmount cleanup for all timers
**Fix needed:** Add useEffect with empty deps that returns cleanup for all timer refs.

---

## FIXES TO APPLY

### Fix 1: Add unmount cleanup useEffect in chat.tsx (all timer refs)
### Fix 2: Implement Round 35 suggestions (reconnecting spinner, momentum pause, badge pulse)
### Fix 3: Add accessibilityLabel to scan screen image
### Fix 4: Add accessibilityLabel to key icon-only buttons across screens

---

## CONFIRMED WORKING
- TypeScript: 0 errors
- All screen routes exist and are reachable
- TutorSnap branding consistent
- Streaming fix (expo/fetch) in place
- Production API URL set correctly
- CORS fix applied
- All timer refs have inline clearTimeout guards
- FlatList used for all long lists
- StyleSheet.create used in all screens
