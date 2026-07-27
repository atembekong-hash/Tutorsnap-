# Phase G Screenshot Audit — Jul 27 2026

## Current State
- Checkpoint: 18ac9a3e (v2.0.1)
- New preview URL: https://8081-i95fj0thain9m9bd7mx5d-5fe6aeaf.us1.manus.computer
- Auth screen renders correctly (dark theme, Google + Email buttons)
- Browser is currently on auth-screen, entering test@tutorsnap.test

## Screens to Screenshot
1. /onboarding — last slide (trial slide) — plan cards should stack VERTICALLY on web (Fix 3)
2. /paywall — full paywall screen (no dev-mode banner in production)
3. /cancel-retention — inline error state (no native Alert) (Fix 5)
4. /subscription-history — shows real subscription data (Fix 1)

## Status
- [x] /onboarding trial slide — VERIFIED: MONTHLY card on top, ANNUAL card below (vertical stack on web). Fix 3 confirmed.
- [ ] /paywall — need auth
- [ ] /cancel-retention — need auth
- [ ] /subscription-history — need auth

## Auth flow
- Email: test@tutorsnap.test
- OTP: check server logs at http://127.0.0.1:3000 or DB
- After sign in, navigate to each screen and capture

## Task 3 — Multi-step flow test
File: tests/is-in-grace-period.test.ts
Add a new describe block:
  "CANCELLATION → GRACE_PERIOD_START → GRACE_PERIOD_END multi-step flow"
  Steps:
    1. INITIAL_PURCHASE → status=active, isInGracePeriod=0
    2. CANCELLATION → status=cancelled, isInGracePeriod=0, isPremium still true (expiresAt future)
    3. GRACE_PERIOD_START → status=active, isInGracePeriod=1
    4. GRACE_PERIOD_END → status=expired, isInGracePeriod=0, isPremium=false
  Assert DB state after each step.
