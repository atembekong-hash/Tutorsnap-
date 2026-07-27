# v2.2.0 Audit — Jul 27 2026

## Current State (bd597e05)

### subscriptions table (drizzle/schema.ts lines 391-413)
Columns: id, userId (FK nullable), revenueCatUserId, productId, status (enum: active|cancelled|expired|refunded), expiresAt (timestamp nullable), createdAt, updatedAt
NO grace_period, platform, store, event_id, or event_type columns.

### Webhook STATUS_MAP (server/_core/index.ts)
INITIAL_PURCHASE → active
RENEWAL → active
PRODUCT_CHANGE → active
CANCELLATION → cancelled
EXPIRATION → expired
REFUND → refunded
BILLING_ISSUE → cancelled
MISSING: GRACE_PERIOD_START, GRACE_PERIOD_END, SUBSCRIBER_ALIAS, TRANSFER, UNCANCELLATION, NON_RENEWING_PURCHASE

### Critical Issues Found:
1. BILLING_ISSUE → "cancelled" is WRONG. Billing issues put user in grace period (still premium). Should be "active" with a grace flag.
2. CANCELLATION → "cancelled" is correct (user cancelled but still active until expiresAt).
3. No idempotency guard — duplicate webhook delivery updates the row again (harmless but wasteful).
4. No event ordering guard — out-of-order events can overwrite newer state with older state.
5. Missing events: GRACE_PERIOD_START (billing failed, still active), GRACE_PERIOD_END (grace expired), UNCANCELLATION (user re-subscribed before expiry), NON_RENEWING_PURCHASE, TRANSFER, SUBSCRIBER_ALIAS.
6. getStatus isPremium check: `row.status === "active"` — this is WRONG for grace period (billing issue). User in grace period should still be premium.

### Schema Changes Needed (NO migration — use existing columns):
- status enum needs "grace_period" added — BUT user said no destructive migrations.
- Alternative: use status="active" for BILLING_ISSUE (grace period = still active) and add a separate boolean or rely on eventType in logs.
- SAFEST approach: treat BILLING_ISSUE as "active" (user still has access during grace period per RC docs), add GRACE_PERIOD_START → "active", GRACE_PERIOD_END → "expired", UNCANCELLATION → "active".

### subscription-history.tsx current state:
- Has status chips (color coded), plan label, Updated/Expires/First seen dates
- MISSING: platform (iOS/Android), store, grace period state, billing state, user guidance text
- History query returns: id, productId, status, expiresAt, createdAt, updatedAt — NO platform/store/eventType

### settings.tsx subscription section:
- Line 234: trpc.subscription.getStatus.useQuery() present
- Line 1617: serverSubStatus?.isPremium badge shown
- Line 1622: subStatus.isPremium || subStatus.isTrialActive shown
- NO grace period indicator ("Premium until [date]" when cancelled)

### getStatus isPremium logic (routers.ts line 1770):
isPremium = row.status === "active"
ISSUE: Does not handle grace period (billing issue = still premium)
ISSUE: Does not handle cancelled-but-not-expired (still premium until expiresAt)

## Phase 2 Plan: Robust Webhook (server/_core/index.ts only)

### New STATUS_MAP:
INITIAL_PURCHASE → active
RENEWAL → active  
PRODUCT_CHANGE → active
UNCANCELLATION → active
NON_RENEWING_PURCHASE → active
GRACE_PERIOD_START → active (billing failed but still in grace = still premium)
CANCELLATION → cancelled (still premium until expiresAt — handled in getStatus)
BILLING_ISSUE → active (grace period — RC keeps entitlement active during grace)
GRACE_PERIOD_END → expired (grace period ended, access revoked)
EXPIRATION → expired
REFUND → refunded
TRANSFER → active (subscription transferred to new user)
SUBSCRIBER_ALIAS → no-op (user alias, no subscription change)

### Idempotency: add RC event_id dedup check (use eventId from payload if present)
### Out-of-order guard: only update if new event is not "older" than existing row

## Phase 3 Plan: Enriched History Screen (app/subscription-history.tsx only)

### Add to history query response (routers.ts): revenueCatUserId (for platform detection)
### Enrich HistoryCard with:
- Platform chip (iOS/Android detected from productId prefix or rcUserId pattern)
- Grace period guidance: "Your billing failed. Access continues until [date]."
- Cancelled guidance: "Cancelled. Premium access until [date]."
- Expired guidance: "Subscription ended on [date]."
- Refunded guidance: "Refund processed on [date]."
- Active guidance: "Next renewal: [date]."

