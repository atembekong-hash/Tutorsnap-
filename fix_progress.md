# Fix Progress Notes

## Fix 1 — DONE ✅
- File: lib/_core/auth.ts
- Change: getSessionToken() on web now reads app_session_id from document.cookie and returns it as Bearer token
- Verified: subscription history screen now loads real data in browser

## Fix 2 — DONE ✅
- Files: drizzle/schema.ts, server/_core/index.ts, server/routers.ts
- Change: Added isInGracePeriod boolean column to subscriptions table (DEFAULT false, NOT NULL)
- Migration applied via webdev_execute_sql
- Webhook handler now sets isInGracePeriod=true on BILLING_ISSUE/GRACE_PERIOD_START, false on all other events
- getStatus now reads row.isInGracePeriod directly instead of heuristic

## Fix 3 — DONE ✅
- File: app/onboarding.tsx
- Change: trialPlanRow View now uses flexDirection:"column" on web via inline style override
- Platform.OS === "web" check added inline

## Fix 4 — DONE ✅
- File: server/_core/index.ts
- Change: Added exact-duplicate guard — skips if same status, same expiresAt, and eventTimestamp within 5s of updatedAt
- Also selects expiresAt in the existing row query

## Fix 5 — IN PROGRESS 🔄
- File: app/cancel-retention.tsx
- Change: Replace Alert.alert() with inline error state (web-compatible)
- Two Alert.alert calls to replace:
  1. handleContinueToOffer: "Please select a reason" → inline error text under reason list
  2. handleProceedToManage catch: "Manage Subscription" fallback → inline error text

## Checkpoint history:
- da6d25d5: Phase A (paywall ToS/Privacy + post-trial price)
- b929d323: Phase B (onboarding inline plan selector)
- 22d05df6: Phase C (cancel-retention screen)
- Next checkpoint: after all 5 fixes complete
