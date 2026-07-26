# Master Audit v3 — Session Jul 26 2026

## Three Features to Implement

### Feature A — Paywall A/B Test (remote-config flag)
**Goal:** Add a remote-config flag stored in AsyncStorage that switches the trial message
between "14-day free trial" (control) and "7-day free trial + 50% off" (variant B).
**Files to touch:**
- `lib/ab-test.ts` — NEW: getTrialVariant(), setTrialVariant(), TrialVariant type
- `app/paywall.tsx` — read variant, switch badge text + CTA copy
- `app/onboarding.tsx` — read variant, switch trial slide bullet text
**Key constants:**
- `TRIAL_VARIANT_KEY = "@tutorsnap/trialVariant"`
- Variants: `"14day"` (default/control) | `"7day_50off"` (variant B)
- Assignment: deterministic hash of install ID → 50/50 split

### Feature B — Streak At-Risk Notification (9 PM, only if no activity today)
**Goal:** Schedule a 9 PM notification that only fires when user has NOT solved anything today.
**Files to touch:**
- `lib/notifications.ts` — ADD: scheduleStreakAtRiskCheck(), cancelStreakAtRiskReminder()
- `app/_layout.tsx` — call scheduleStreakAtRiskCheck() on app foreground (AppState active)
**Key logic:**
- Check `progress.streak.lastSolvedDate` vs today's date
- If lastSolvedDate !== today AND currentStreak > 0 → schedule 9 PM notification
- If lastSolvedDate === today → cancel the 9 PM notification (already safe)
- Respect `isNotifEnabled("streakAlerts")` gate
- Store notification ID in `@tutorsnap/streakAtRiskNotifId`

### Feature C — Classroom Share Deep Link
**Goal:** `tutorsnap://classroom/join?code=XXXX` opens the app and navigates to classroom join flow.
**Files to touch:**
- `app/_layout.tsx` — add `classroom/join?code=` handler in existing `handleUrl` function
- `app/(tabs)/classroom.tsx` — add `joinCode` URL param handling to pre-fill the join input
**Key logic:**
- In handleUrl: if `parsed.path === "classroom/join"` and `parsed.queryParams?.code` → navigate to classroom tab with code param
- In classroom.tsx: read `useLocalSearchParams().code` and pre-fill the join input + auto-focus

## Mitigation Protocol
1. Write audit file FIRST (done — this file)
2. Re-read files fresh at start of each phase
3. One phase at a time, checkpoint between each
4. Keep phases small — bounded file sets
5. Verify after each phase
