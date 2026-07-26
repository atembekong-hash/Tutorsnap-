# Execution Plan Audit — Jul 26 2026

## Current State
- Version: 1.8.5 / versionCode 38
- Tests: 88/89 passing (1 failing: revenuecat-env.test.ts)
- TypeScript: 0 errors
- Last checkpoint: 6b4a391b (webhook endpoint + subscriptions table)

## Failing Test
- tests/revenuecat-env.test.ts: "does not import react-native-purchases"
- Root cause: lib/subscription.ts uses `await import("react-native-purchases")` inside getPurchases()
- The test was written when RN-purchases was removed; it was re-added in a later session
- Fix: Update the test to match current reality (RC SDK is now back in use)

## Three Next-Steps from Last Session (to implement)
1. Enable webhook auth: REVENUECAT_WEBHOOK_SECRET env var + Authorization header check (already coded, just needs env var set)
2. Call Purchases.logIn(openId) after sign-in so RC app_user_id matches local users.openId
3. Add subscription.getStatus tRPC query to verify premium server-side

## Pending Items from todo.md (actionable, non-deferred)
- U9: Ensure paywall dev mode banner never shows in production (hide when !__DEV__)
- Q5: Fix paywall timer in _layout.tsx to use longer delay and auth gate
- U3: Hide tab bar when chat screen is open (already coded via hideTabBarOnChat setting, needs verification)
- Chat layout: Keep input bar pinned to bottom before/after sending
- Chat layout: Fix auto-scroll so latest message lands fully at bottom
- Chat layout: Remove scroll resistance during/after AI response generation
- Chat layout: Refactor so composer height is reserved correctly in message list

## Files to Touch Per Phase
- Phase A (test fix): tests/revenuecat-env.test.ts only
- Phase B (RC logIn): lib/subscription.ts + app/_layout.tsx or hooks/use-auth.ts
- Phase C (tRPC subscription.getStatus): server/routers.ts only
- Phase D (U9 dev banner): app/paywall.tsx only
- Phase E (Q5 paywall timer): app/_layout.tsx only
- Phase F (chat layout): app/(tabs)/chat.tsx only
- Phase G (deep scan + EAS build)
