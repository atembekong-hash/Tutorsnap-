# v2.1.0 Audit — 2026-07-27

## Current state: v2.0.0 (2d5c420e)
- 108/108 tests passing, 0 TS errors
- Webhook endpoint: full CRUD, no owner notification on RENEWAL
- settings.tsx: serverVerified badge present (getStatus query)
- subscription-history.tsx: full screen
- usePremium: client-side only (RC SDK + AsyncStorage)
- home screen (index.tsx): crown icon uses client-side isPremium

## Three next-steps from v2.0.0 result:
1. Enable webhook auth secret in production (REVENUECAT_WEBHOOK_SECRET)
   → Already implemented in code; needs REVENUECAT_SETUP.md update only
   → No code change needed — just doc update

2. Wire subscription.getStatus into premium gate on home/profile screen
   → index.tsx line 641: usePremium() gives isPremium (client-side)
   → Need to add trpc.subscription.getStatus.useQuery() to index.tsx
   → When serverSubStatus.isPremium=true, show "Server ✓" chip near crown icon

3. Add push notification on RENEWAL webhook event
   → notification.ts is OWNER notification (not user push)
   → No user push token infrastructure exists in server
   → Correct interpretation: send owner notification when RENEWAL fires
   → This alerts the app owner that a user renewed (revenue event)

## Files to touch:
- Phase A: server/_core/index.ts — add sendNotification on INITIAL_PURCHASE + RENEWAL
- Phase B: app/(tabs)/index.tsx — add serverSubStatus chip near crown icon
- Phase C: REVENUECAT_SETUP.md — document webhook auth activation steps
- Phase D: Deep scan
