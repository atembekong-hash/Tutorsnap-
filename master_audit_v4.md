# Master Audit v4 — v1.8.5 Session (Jul 26 2026)

## Feature Scope

### Feature A: A/B Test Analytics
- **Goal**: Add `logAbTestEvent(variant, event)` to `lib/ab-test.ts`; fire on paywall view and conversion
- **Existing infra**: `lib/analytics.ts` has `addAnalyticsEvent`, `logShareEvent`, `logReferralEvent` — same pattern to follow
- **Files to touch**: `lib/ab-test.ts` (add logAbTestEvent), `app/paywall.tsx` (fire on mount + on subscribe press)
- **Risk**: Low — additive only, no existing logic changed

### Feature B: Classroom QR Code
- **Goal**: "Show QR" button in manage tab renders `tutorsnap://classroom/join?code=XXXX` as a QR code in a Modal
- **Package**: `react-native-qrcode-svg` 6.3.21 just installed (depends on `react-native-svg` 15.12.1 already present)
- **Files to touch**: `app/(tabs)/classroom.tsx` (add state, Modal, QR button in manage tab)
- **Risk**: Low — additive only, new Modal + state only

### Feature C: Streak Personalisation
- **Status**: ALREADY DONE — `scheduleStreakAtRiskCheck` already includes `currentStreak` in the body:
  `"You're on a ${currentStreak}-day streak — solve one problem before midnight to keep it alive."`
- **Action**: Verify and mark as done, no code change needed

## Mitigation Protocol
1. Audit file written first ✅
2. Re-read files fresh at start of each phase ✅
3. One phase at a time with checkpoint between each
4. Phases bounded: Feature A touches 2 files, Feature B touches 1 file
5. Screenshot verification after each checkpoint

## Deep Scan Checklist (from prior work)
- [ ] Feature A: logAbTestEvent in lib/ab-test.ts
- [ ] Feature A: paywall.tsx fires on mount (view) and on subscribe press (conversion)
- [ ] Feature B: classroom.tsx showQRModal state + QR Modal + Show QR button in manage tab
- [ ] Feature C: ALREADY DONE — verified scheduleStreakAtRiskCheck body includes streak count
- [ ] All prior: 62 screen transitions, 10 animated lists, 12 skeleton screens — verified in v1.8.4
- [ ] Tests: 89/89 passing
- [ ] TS: 0 errors
