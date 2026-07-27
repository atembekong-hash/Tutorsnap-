"""
Patch server/routers.ts:
1. getStatus: isPremium is true when status=active OR (status=cancelled AND expiresAt > now)
   Also add platform, isInGracePeriod, and cancelledButActive fields.
2. history: add platform field to the returned rows.
"""
import re, sys, os

src_path = os.path.join(os.path.dirname(__file__), "..", "server", "routers.ts")
with open(src_path) as f:
    src = f.read()

# ── Patch 1: getStatus ────────────────────────────────────────────────────────
OLD_GET_STATUS = '''  getStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return { isPremium: false, status: null, productId: null, expiresAt: null };
      const rows = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .orderBy(desc(subscriptions.updatedAt))
        .limit(1);
      if (rows.length === 0) {
        return { isPremium: false, status: null, productId: null, expiresAt: null };
      }
      const row = rows[0];
      const isPremium = row.status === "active";
      return {
        isPremium,
        status: row.status,
        productId: row.productId ?? null,
        expiresAt: row.expiresAt ? row.expiresAt.getTime() : null,
      };
    } catch (err) {
      console.error("[subscriptionRouter] getStatus error:", err);
      return { isPremium: false, status: null, productId: null, expiresAt: null };
    }
  }),'''

NEW_GET_STATUS = '''  getStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return { isPremium: false, status: null, productId: null, expiresAt: null, isInGracePeriod: false, cancelledButActive: false };
      const rows = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .orderBy(desc(subscriptions.updatedAt))
        .limit(1);
      if (rows.length === 0) {
        return { isPremium: false, status: null, productId: null, expiresAt: null, isInGracePeriod: false, cancelledButActive: false };
      }
      const row = rows[0];
      const now = Date.now();
      const expiresAtMs = row.expiresAt ? row.expiresAt.getTime() : null;
      // Grace-period semantics:
      //   "active"    → premium (normal)
      //   "cancelled" → still premium if expiresAt is in the future (cancelled but not yet expired)
      //   "expired"   → not premium
      //   "refunded"  → not premium
      const cancelledButActive = row.status === "cancelled" && expiresAtMs !== null && expiresAtMs > now;
      // isInGracePeriod: billing failed (BILLING_ISSUE/GRACE_PERIOD_START) but still active
      // We detect this by checking if status=active but the last event was a billing issue.
      // Since we don't store the event type, we approximate: status=active with expiresAt in the past
      // is a grace-period indicator (RC keeps the row active during grace).
      const isInGracePeriod = row.status === "active" && expiresAtMs !== null && expiresAtMs < now;
      const isPremium = row.status === "active" || cancelledButActive;
      return {
        isPremium,
        status: row.status,
        productId: row.productId ?? null,
        expiresAt: expiresAtMs,
        isInGracePeriod,
        cancelledButActive,
      };
    } catch (err) {
      console.error("[subscriptionRouter] getStatus error:", err);
      return { isPremium: false, status: null, productId: null, expiresAt: null, isInGracePeriod: false, cancelledButActive: false };
    }
  }),'''

# ── Patch 2: history — add platform inference from productId ─────────────────
OLD_HISTORY = '''      return rows.map((r) => ({
        id: r.id,
        productId: r.productId,
        status: r.status,
        expiresAt: r.expiresAt ? r.expiresAt.getTime() : null,
        createdAt: r.createdAt.getTime(),
        updatedAt: r.updatedAt.getTime(),
      }));'''

NEW_HISTORY = '''      return rows.map((r) => {
        // Infer platform from productId naming convention:
        //   RC iOS products typically start with "rc_" or contain "ios"/"apple"
        //   RC Android products typically contain "android"/"google"/"play"
        //   Fall back to "unknown" if we can't tell
        const pid = (r.productId ?? "").toLowerCase();
        const platform: "ios" | "android" | "unknown" =
          pid.includes("android") || pid.includes("google") || pid.includes("play")
            ? "android"
            : pid.includes("ios") || pid.includes("apple")
            ? "ios"
            : "unknown";
        return {
          id: r.id,
          productId: r.productId,
          status: r.status,
          expiresAt: r.expiresAt ? r.expiresAt.getTime() : null,
          createdAt: r.createdAt.getTime(),
          updatedAt: r.updatedAt.getTime(),
          platform,
        };
      });'''

count1 = src.count(OLD_GET_STATUS)
count2 = src.count(OLD_HISTORY)

if count1 != 1:
    print(f"ERROR: getStatus pattern matched {count1} times (expected 1)")
    raise SystemExit(1)
if count2 != 1:
    print(f"ERROR: history pattern matched {count2} times (expected 1)")
    raise SystemExit(1)

src = src.replace(OLD_GET_STATUS, NEW_GET_STATUS, 1)
src = src.replace(OLD_HISTORY, NEW_HISTORY, 1)

with open(src_path, "w") as f:
    f.write(src)

print("SUCCESS: routers.ts patched (getStatus grace period + history platform)")
