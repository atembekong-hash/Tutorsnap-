"""
Patch server/_core/index.ts: replace the webhook STATUS_MAP and upsert logic
with the robust idempotent implementation.
"""
import re, sys, os

src_path = os.path.join(os.path.dirname(__file__), "..", "server", "_core", "index.ts")
with open(src_path) as f:
    src = f.read()

# Use regex to replace from "// ── 3. Determine new status" through "res.json({ ok: true, handled: true"
# This is more resilient to minor whitespace differences than exact string matching.

PATTERN = re.compile(
    r'(        // ── 3\. Determine new status ─+\n)'   # anchor: section header
    r'.*?'                                               # everything in between (non-greedy)
    r'(        res\.json\(\{ ok: true, handled: true, status: newStatus \}\);)',  # anchor: final response
    re.DOTALL
)

NEW_BLOCK = r'''\1        //
        // Full RevenueCat event type coverage.
        // Reference: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
        //
        // Grace-period semantics (per RC docs):
        //   BILLING_ISSUE      → billing failed; RC keeps entitlement active during
        //                        the grace period (typically 16 days). Map to "active".
        //   GRACE_PERIOD_START → same as BILLING_ISSUE — grace period begins.
        //   GRACE_PERIOD_END   → grace period ended without recovery; access revoked.
        //   CANCELLATION       → user cancelled; still active until expiresAt.
        //   UNCANCELLATION     → user re-subscribed before expiry; back to active.
        //
        // No-op events (no subscription state change):
        //   SUBSCRIBER_ALIAS   → user alias merge; no entitlement change.
        //
        type SubStatus = "active" | "cancelled" | "expired" | "refunded";
        const NO_OP_EVENTS = new Set(["SUBSCRIBER_ALIAS"]);
        const STATUS_MAP: Record<string, SubStatus> = {
          // Purchase / renewal events → active
          INITIAL_PURCHASE:      "active",
          RENEWAL:               "active",
          PRODUCT_CHANGE:        "active",
          UNCANCELLATION:        "active",
          NON_RENEWING_PURCHASE: "active",
          TRANSFER:              "active",
          // Grace-period events — user still has entitlement
          BILLING_ISSUE:         "active",   // RC keeps access during grace period
          GRACE_PERIOD_START:    "active",   // billing failed; grace period begins
          // Termination events
          GRACE_PERIOD_END:      "expired",  // grace period ended; access revoked
          EXPIRATION:            "expired",
          CANCELLATION:          "cancelled",// still active until expiresAt
          REFUND:                "refunded",
        };

        // No-op events: acknowledge without touching the DB
        if (NO_OP_EVENTS.has(eventType)) {
          console.log(`[RC Webhook] No-op event: ${eventType} — acknowledged`);
          res.json({ ok: true, handled: false, reason: "no-op event" });
          return;
        }

        const newStatus = STATUS_MAP[eventType];
        if (!newStatus) {
          // Unknown event type — acknowledge but do nothing (forward-compatible)
          console.log(`[RC Webhook] Unknown event type: ${eventType} — acknowledged`);
          res.json({ ok: true, handled: false, reason: "unknown event type" });
          return;
        }

        // ── 4. Upsert subscription row (idempotent + out-of-order safe) ───────
        const { getDb } = await import("../db.js");
        const { subscriptions, users } = await import("../../drizzle/schema.js");
        const { eq, and } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) {
          console.warn("[RC Webhook] DB unavailable — cannot persist subscription event");
          // Return 200 so RevenueCat does not keep retrying indefinitely
          res.json({ ok: true, persisted: false });
          return;
        }

        // Resolve RevenueCat app_user_id → local user.
        // Purchases.logIn(openId) sets app_user_id = openId on the client.
        // Anonymous RC users (not yet logged in) are stored with userId=null
        // and can be reconciled later when the user signs in.
        let localUserId: number | null = null;
        if (rcUserId) {
          const userRows = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.openId, rcUserId))
            .limit(1);
          if (userRows.length > 0) {
            localUserId = userRows[0].id;
          }
        }

        // MySQL TIMESTAMP max is 2038-01-19 03:14:07 UTC.
        // RevenueCat may send far-future timestamps (e.g. lifetime subscriptions).
        // Clamp to prevent ER_TRUNCATED_WRONG_VALUE errors.
        const MYSQL_TIMESTAMP_MAX = new Date("2038-01-19T03:14:07.000Z");
        const expiresAt = expiresAtMs
          ? new Date(Math.min(expiresAtMs, MYSQL_TIMESTAMP_MAX.getTime()))
          : null;

        // Idempotency + out-of-order guard:
        //   Read the existing row (if any). If the existing row was updated MORE
        //   recently than the event timestamp, skip the update — this prevents
        //   a late-arriving duplicate or out-of-order delivery from overwriting
        //   a newer state. We use event.purchased_at_ms as the event timestamp
        //   (falls back to Date.now() if absent, which always allows the update).
        const eventTimestampMs: number = (event.purchased_at_ms as number | null) ?? Date.now();

        const existing = await db
          .select({
            id: subscriptions.id,
            status: subscriptions.status,
            updatedAt: subscriptions.updatedAt,
          })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.revenueCatUserId, rcUserId),
              eq(subscriptions.productId, productId),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          const existingRow = existing[0];
          const existingUpdatedMs = existingRow.updatedAt.getTime();
          // Out-of-order guard: skip if existing row is newer than this event
          // (5 s tolerance to absorb clock skew between RC and our server)
          if (existingUpdatedMs > eventTimestampMs + 5_000) {
            console.log(
              `[RC Webhook] Skipping out-of-order event: ${eventType} ` +
              `(existing updatedAt=${existingUpdatedMs} > event ts=${eventTimestampMs})`
            );
            res.json({ ok: true, handled: false, reason: "out-of-order event skipped" });
            return;
          }
          await db
            .update(subscriptions)
            .set({
              status: newStatus,
              ...(localUserId !== null ? { userId: localUserId } : {}),
              ...(expiresAt !== null ? { expiresAt } : {}),
            })
            .where(eq(subscriptions.id, existingRow.id));
        } else {
          await db.insert(subscriptions).values({
            revenueCatUserId: rcUserId,
            productId,
            status: newStatus,
            ...(localUserId !== null ? { userId: localUserId } : {}),
            ...(expiresAt !== null ? { expiresAt } : {}),
          });
        }

        console.log(`[RC Webhook] Persisted: ${eventType} → ${newStatus} for rcUser=${rcUserId}`);

        // ── 5. Owner notification for revenue events (fire-and-forget) ──────────
        if (eventType === "INITIAL_PURCHASE" || eventType === "RENEWAL") {
          const { notifyOwner } = await import("./notification.js");
          notifyOwner({
            title: eventType === "INITIAL_PURCHASE" ? "🎉 New Subscription!" : "🔄 Subscription Renewed",
            content: `Product: ${productId || "unknown"}\nRC User: ${rcUserId || "anonymous"}\nStatus: ${newStatus}`,
          }).catch((err: unknown) => {
            console.warn("[RC Webhook] Owner notification failed (non-fatal):", err);
          });
        }

        \2'''

new_src, count = PATTERN.subn(NEW_BLOCK, src)
if count == 1:
    with open(src_path, "w") as f:
        f.write(new_src)
    print(f"SUCCESS: replaced {count} block(s)")
else:
    print(f"ERROR: pattern matched {count} times (expected 1)")
    sys.exit(1)
