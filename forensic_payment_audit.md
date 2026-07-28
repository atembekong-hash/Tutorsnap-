# Forensic Payment Architecture Audit
Date: 2026-07-28
Auditor: Manus
Checkpoint: ae45f534 (current HEAD)

## Verdict
The original claim that the system is "100% code-ready except for configuration" is **partially correct but overstated**. The core happy-path is solid. However, there are **5 implementation gaps** and **4 security/production risks** that require code changes, not just configuration.

---

## CONFIRMED SOLID (no action needed)

1. RevenueCat SDK lazy import — correct, no web/test crashes
2. initRevenueCat singleton — fast-exit on `_initialised` flag
3. Platform guards — dev/web unlock, production SDK path
4. purchaseProduct — finds package by productId, caches locally on success
5. restorePurchases — checks RC entitlement, falls back to local cache
6. loginRevenueCat — called after sign-in in auth-screen.tsx (fire-and-forget)
7. Webhook body parsing — uses express.raw() before express.json() (correct order)
8. Webhook idempotency — out-of-order guard with 5s clock skew tolerance
9. Webhook duplicate guard — same status + same expiresAt + same timestamp skipped
10. PRODUCT_CHANGE, TRANSFER, NON_RENEWING_PURCHASE — all mapped to "active"
11. UNCANCELLATION — mapped to "active", isInGracePeriod cleared correctly
12. MySQL TIMESTAMP_MAX clamp — prevents ER_TRUNCATED_WRONG_VALUE on lifetime subs
13. Owner notification — fires on INITIAL_PURCHASE and RENEWAL (fire-and-forget)
14. subscriptionRouter.getStatus — correct cancelled-but-active logic, grace period flag
15. getOfferings — static fallback when RC unavailable (paywall always shows prices)

---

## IMPLEMENTATION GAPS (require code changes)

### GAP 1 — CRITICAL: initRevenueCat has a race condition
**Classification: Implementation work**

`initRevenueCat()` uses a boolean `_initialised` flag but does NOT use a promise-based mutex. If two callers invoke it concurrently before `_initialised` is set to true (e.g., `getSubscriptionStatus()` and `purchaseProduct()` called simultaneously on app launch), both will pass the `if (_initialised) return` guard and both will call `Purchases.configure()`. Calling configure() twice on the RevenueCat SDK causes undefined behavior and can corrupt the session.

**Fix needed:** Replace the boolean flag with a singleton promise:
```ts
let _initPromise: Promise<void> | null = null;
export async function initRevenueCat(): Promise<void> {
  if (!_initPromise) _initPromise = _doInit();
  return _initPromise;
}
```

---

### GAP 2 — HIGH: restorePurchases does not clear stale local cache on failure
**Classification: Implementation work**

When `restorePurchases()` is called and RC confirms the user has NO active entitlement (returns false), the function does NOT clear `PREMIUM_KEY` from AsyncStorage. This means a user who previously had premium, whose subscription has since expired, can still access premium features indefinitely if they never restore purchases — the stale `PREMIUM_KEY = "true"` from their old purchase persists forever.

**Fix needed:** When RC is available and returns no entitlement, explicitly clear the local cache:
```ts
await AsyncStorage.removeItem(PREMIUM_KEY);
await AsyncStorage.removeItem(PREMIUM_PRODUCT_KEY);
```

---

### GAP 3 — HIGH: No server-side enforcement on AI/solve endpoints
**Classification: Implementation work**

The `academic.solve`, `academic.solveFromImage`, `academic.generatePractice`, `academic.generateQuiz`, and `academic.solveExplanation` procedures all use `publicProcedure` — they are completely unauthenticated and have no premium check. The usage limit is enforced **only on the client** via `checkLimit("solves")` in `handleSolve`. Any user who intercepts the tRPC call (via Proxyman, Charles, or a simple fetch() call) can bypass the free tier limit entirely and make unlimited AI calls at your cost.

**Fix needed:** Add a server-side rate-limit middleware or move the `checkLimit` logic to a `protectedProcedure` that reads usage counts from the DB (or Redis) per user per day.

---

### GAP 4 — MEDIUM: purchaseProduct uses err?.userCancelled but RC v10 uses PurchasesErrorCode
**Classification: Implementation work**

In `react-native-purchases` v10.x, the error object for a user cancellation is a `PurchasesError` with `code: PurchasesErrorCode.PurchaseCancelledError`. The current code checks `err?.userCancelled` which was the v7/v8 API. In v10, `userCancelled` is `undefined` on the error object, so a user cancellation will be treated as a real error and show the "Purchase Failed" alert instead of silently dismissing.

**Fix needed:**
```ts
import Purchases, { PurchasesErrorCode } from "react-native-purchases";
// ...
if ((err as any)?.code === PurchasesErrorCode.PurchaseCancelledError) {
  return { success: false, cancelled: true };
}
```

---

### GAP 5 — MEDIUM: incrementUsage called BEFORE the API call succeeds
**Classification: Implementation work**

In `handleSolve` (index.tsx line ~930), `await incUsage("solves")` is called **before** `solveMutation.mutate()`. This means if the API call fails (network error, server error, timeout), the usage counter is still incremented. A user on the free tier who experiences a network error loses one of their 2 daily solves for nothing.

**Fix needed:** Move `incUsage("solves")` to the `onSuccess` callback of `solveMutation`, not before the mutation fires.

---

## SECURITY / PRODUCTION RISKS

### RISK 1 — CRITICAL: Webhook secret is optional (currently unenforced)
**Classification: Configuration work** (but has a code implication)

The webhook secret check is wrapped in `if (secret) { ... }`. Without `REVENUECAT_WEBHOOK_SECRET` set, the endpoint accepts **any unauthenticated POST request** and will process it as a real subscription event. An attacker who discovers the endpoint URL can forge an `INITIAL_PURCHASE` event for any `app_user_id` and grant themselves premium access in the database.

This is configuration work (set the secret), but the code should also be hardened to **reject requests when no secret is configured in production** (i.e., treat missing secret as a misconfiguration, not a permissive default).

---

### RISK 2 — HIGH: Local AsyncStorage premium cache is the source of truth in production (no SDK keys)
**Classification: Configuration work**

Without `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` / `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY` set, `_rcAvailable` is always `false`. The fallback path in `purchaseProduct()` and `restorePurchases()` grants premium by writing directly to AsyncStorage with no SDK validation. In production without keys, a user who clears their app data loses premium access permanently (no way to restore), and there is no receipt validation.

---

### RISK 3 — MEDIUM: purchased_at_ms used as event timestamp for out-of-order guard
**Classification: Implementation work**

The webhook out-of-order guard uses `event.purchased_at_ms` as the event timestamp. However, for events like `CANCELLATION`, `EXPIRATION`, and `REFUND`, RevenueCat does not populate `purchased_at_ms` — it is null or absent. The code falls back to `Date.now()`, which means the guard always allows these events through (since `Date.now()` is always newer than any stored `updatedAt`). This is correct behavior for the happy path, but it means the duplicate-delivery guard does not work for cancellation/expiration events — a duplicate CANCELLATION webhook will always update the row.

This is low-severity in practice (idempotent writes are safe) but worth noting.

---

### RISK 4 — LOW: No webhook retry budget / dead-letter handling
**Classification: Implementation work (optional)**

The webhook returns HTTP 500 on unexpected errors, which causes RevenueCat to retry. There is no retry counter or dead-letter queue. A persistent DB outage will cause RevenueCat to exhaust its retry budget (typically 72 hours) and drop the event permanently. For a production app this means subscription state changes during a DB outage are silently lost.

---

## SUMMARY TABLE

| Issue | Severity | Type |
|---|---|---|
| initRevenueCat race condition | CRITICAL | Implementation |
| restorePurchases stale cache | HIGH | Implementation |
| No server-side API enforcement | HIGH | Implementation |
| userCancelled API mismatch (v10) | MEDIUM | Implementation |
| incrementUsage before API success | MEDIUM | Implementation |
| Webhook secret not enforced in prod | CRITICAL | Configuration + code hardening |
| No RC API keys (fallback to local) | HIGH | Configuration |
| purchased_at_ms null for cancel events | MEDIUM | Implementation (minor) |
| No webhook dead-letter handling | LOW | Implementation (optional) |
