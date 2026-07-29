/**
 * Comprehensive unit tests for the RevenueCat webhook business logic.
 *
 * These tests validate the logic extracted from server/_core/index.ts in
 * isolation — no Express server, no database, no external services.
 *
 * Scenarios covered:
 *   - All RC event types → correct status mapping
 *   - Grace-period events (BILLING_ISSUE, GRACE_PERIOD_START/END)
 *   - Idempotency: duplicate delivery of the same event
 *   - Out-of-order events: late-arriving older event must not overwrite newer state
 *   - Missing / anonymous users (userId=null)
 *   - Invalid signatures (Authorization header)
 *   - SUBSCRIBER_ALIAS no-op
 *   - Unknown / future event types
 *   - MySQL TIMESTAMP clamping for far-future expiresAt
 *   - Grace-period isPremium semantics in getStatus
 *   - Cancellation grace period (cancelled but expiresAt in future → still premium)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// ── Extracted logic mirrors (replicate the exact logic from server files) ──────

type SubStatus = "active" | "cancelled" | "expired" | "refunded";

const NO_OP_EVENTS = new Set(["SUBSCRIBER_ALIAS"]);

const STATUS_MAP: Record<string, SubStatus> = {
  INITIAL_PURCHASE:      "active",
  RENEWAL:               "active",
  PRODUCT_CHANGE:        "active",
  UNCANCELLATION:        "active",
  NON_RENEWING_PURCHASE: "active",
  TRANSFER:              "active",
  REFUND_REVERSED:       "active",
  SUBSCRIPTION_EXTENDED: "active",
  BILLING_ISSUE:         "active",
  GRACE_PERIOD_START:    "active",
  GRACE_PERIOD_END:      "expired",
  EXPIRATION:            "expired",
  CANCELLATION:          "cancelled",
  REFUND:                "refunded",
};

function resolveEventStatus(eventType: string): {
  handled: boolean;
  noOp: boolean;
  status: SubStatus | null;
  reason?: string;
} {
  if (NO_OP_EVENTS.has(eventType)) {
    return { handled: false, noOp: true, status: null, reason: "no-op event" };
  }
  const status = STATUS_MAP[eventType] ?? null;
  if (!status) {
    return { handled: false, noOp: false, status: null, reason: "unknown event type" };
  }
  return { handled: true, noOp: false, status };
}

function shouldSkipOutOfOrder(
  existingUpdatedAtMs: number,
  eventTimestampMs: number,
  toleranceMs = 5_000
): boolean {
  return existingUpdatedAtMs > eventTimestampMs + toleranceMs;
}

const MYSQL_TIMESTAMP_MAX = new Date("2038-01-19T03:14:07.000Z").getTime();

function clampExpiresAt(expiresAtMs: number | null): Date | null {
  if (expiresAtMs === null) return null;
  return new Date(Math.min(expiresAtMs, MYSQL_TIMESTAMP_MAX));
}

function checkWebhookAuth(
  secret: string | undefined,
  authHeader: string | undefined
): { allowed: boolean; statusCode: number; error?: string } {
  if (!secret) return { allowed: true, statusCode: 200 };
  if (authHeader !== secret) return { allowed: false, statusCode: 401, error: "Unauthorized" };
  return { allowed: true, statusCode: 200 };
}

// Grace-period isPremium logic (mirrors routers.ts getStatus)
function computeIsPremium(
  status: SubStatus | null,
  expiresAtMs: number | null,
  now = Date.now()
): { isPremium: boolean; isInGracePeriod: boolean; cancelledButActive: boolean } {
  if (!status) return { isPremium: false, isInGracePeriod: false, cancelledButActive: false };
  const cancelledButActive = status === "cancelled" && expiresAtMs !== null && expiresAtMs > now;
  const isInGracePeriod = status === "active" && expiresAtMs !== null && expiresAtMs < now;
  const isPremium = status === "active" || cancelledButActive;
  return { isPremium, isInGracePeriod, cancelledButActive };
}

// ── TRANSFER user resolution logic (mirrors DEFECT-4 fix in server/_core/index.ts) ──
function resolveRcUserId(
  eventType: string,
  appUserId: string,
  transferredTo?: string
): string {
  if (eventType === "TRANSFER" && transferredTo) {
    return transferredTo;
  }
  return appUserId;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("RevenueCat webhook — event type → status mapping", () => {
  describe("purchase and renewal events → active", () => {
    const activeEvents = [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "PRODUCT_CHANGE",
      "UNCANCELLATION",
      "NON_RENEWING_PURCHASE",
      "TRANSFER",
      "REFUND_REVERSED",
      "SUBSCRIPTION_EXTENDED",
    ];
    for (const evt of activeEvents) {
      it(`${evt} → active`, () => {
        const result = resolveEventStatus(evt);
        expect(result.handled).toBe(true);
        expect(result.status).toBe("active");
      });
    }
  });

  describe("grace-period events", () => {
    it("BILLING_ISSUE → active (RC keeps entitlement during grace period)", () => {
      const result = resolveEventStatus("BILLING_ISSUE");
      expect(result.handled).toBe(true);
      expect(result.status).toBe("active");
    });

    it("GRACE_PERIOD_START → active (billing failed; grace period begins)", () => {
      const result = resolveEventStatus("GRACE_PERIOD_START");
      expect(result.handled).toBe(true);
      expect(result.status).toBe("active");
    });

    it("GRACE_PERIOD_END → expired (grace period ended; access revoked)", () => {
      const result = resolveEventStatus("GRACE_PERIOD_END");
      expect(result.handled).toBe(true);
      expect(result.status).toBe("expired");
    });
  });

  describe("DEFECT-3 fix: REFUND_REVERSED and SUBSCRIPTION_EXTENDED", () => {
    it("REFUND_REVERSED → active (RC claws back refund; access restored)", () => {
      const result = resolveEventStatus("REFUND_REVERSED");
      expect(result.handled).toBe(true);
      expect(result.status).toBe("active");
    });

    it("SUBSCRIPTION_EXTENDED → active (new expiry date set)", () => {
      const result = resolveEventStatus("SUBSCRIPTION_EXTENDED");
      expect(result.handled).toBe(true);
      expect(result.status).toBe("active");
    });

    it("REFUND_REVERSED was previously falling through to 'unknown event type' (regression guard)", () => {
      // Before DEFECT-3 fix, REFUND_REVERSED was not in STATUS_MAP and would
      // return { handled: false, reason: 'unknown event type' }.
      // This test ensures it is now handled.
      const result = resolveEventStatus("REFUND_REVERSED");
      expect(result.reason).toBeUndefined(); // no reason means it was handled
      expect(result.handled).toBe(true);
    });

    it("SUBSCRIPTION_EXTENDED was previously falling through to 'unknown event type' (regression guard)", () => {
      const result = resolveEventStatus("SUBSCRIPTION_EXTENDED");
      expect(result.reason).toBeUndefined();
      expect(result.handled).toBe(true);
    });
  });

  describe("termination events", () => {
    it("CANCELLATION → cancelled", () => {
      const result = resolveEventStatus("CANCELLATION");
      expect(result.handled).toBe(true);
      expect(result.status).toBe("cancelled");
    });

    it("EXPIRATION → expired", () => {
      const result = resolveEventStatus("EXPIRATION");
      expect(result.handled).toBe(true);
      expect(result.status).toBe("expired");
    });

    it("REFUND → refunded", () => {
      const result = resolveEventStatus("REFUND");
      expect(result.handled).toBe(true);
      expect(result.status).toBe("refunded");
    });
  });

  describe("no-op events", () => {
    it("SUBSCRIBER_ALIAS → no-op (no DB write)", () => {
      const result = resolveEventStatus("SUBSCRIBER_ALIAS");
      expect(result.handled).toBe(false);
      expect(result.noOp).toBe(true);
      expect(result.status).toBeNull();
      expect(result.reason).toBe("no-op event");
    });
  });

  describe("unknown / future event types", () => {
    it("UNKNOWN_FUTURE_EVENT → not handled (forward-compatible)", () => {
      const result = resolveEventStatus("UNKNOWN_FUTURE_EVENT");
      expect(result.handled).toBe(false);
      expect(result.noOp).toBe(false);
      expect(result.status).toBeNull();
      expect(result.reason).toBe("unknown event type");
    });

    it("empty string event type → not handled", () => {
      const result = resolveEventStatus("");
      expect(result.handled).toBe(false);
    });
  });
});

describe("DEFECT-4 fix: TRANSFER event user resolution", () => {
  it("TRANSFER with transferred_to → subscription attributed to new user", () => {
    const oldUser = "google:old-user-sub";
    const newUser = "google:new-user-sub";
    const rcUserId = resolveRcUserId("TRANSFER", oldUser, newUser);
    expect(rcUserId).toBe(newUser);
    expect(rcUserId).not.toBe(oldUser);
  });

  it("TRANSFER without transferred_to → falls back to app_user_id", () => {
    const oldUser = "google:old-user-sub";
    const rcUserId = resolveRcUserId("TRANSFER", oldUser, undefined);
    expect(rcUserId).toBe(oldUser);
  });

  it("TRANSFER with empty transferred_to → falls back to app_user_id", () => {
    const oldUser = "google:old-user-sub";
    const rcUserId = resolveRcUserId("TRANSFER", oldUser, "");
    // empty string is falsy → falls back to app_user_id
    expect(rcUserId).toBe(oldUser);
  });

  it("non-TRANSFER event is never redirected to transferred_to", () => {
    const appUser = "google:user-sub";
    const someOtherUser = "google:other-sub";
    // Even if transferred_to is present on a non-TRANSFER event, it should be ignored
    for (const evt of ["RENEWAL", "CANCELLATION", "REFUND", "EXPIRATION"]) {
      const rcUserId = resolveRcUserId(evt, appUser, someOtherUser);
      expect(rcUserId).toBe(appUser);
    }
  });

  it("TRANSFER: subscription status is still 'active' for the new user", () => {
    const result = resolveEventStatus("TRANSFER");
    expect(result.handled).toBe(true);
    expect(result.status).toBe("active");
  });
});

describe("RevenueCat webhook — idempotency and out-of-order delivery", () => {
  const BASE_TS = 1_700_000_000_000; // arbitrary fixed timestamp

  it("duplicate delivery (same timestamp) → should process (not skip)", () => {
    // Same timestamp means existingUpdatedAt === eventTimestamp → should NOT skip
    const skip = shouldSkipOutOfOrder(BASE_TS, BASE_TS);
    expect(skip).toBe(false);
  });

  it("event is newer than existing row → should process", () => {
    const newerEventTs = BASE_TS + 10_000;
    const skip = shouldSkipOutOfOrder(BASE_TS, newerEventTs);
    expect(skip).toBe(false);
  });

  it("event is slightly older than existing row (within tolerance) → should process", () => {
    // existingUpdatedAt is 3s newer than event — within 5s tolerance
    const existingUpdatedAt = BASE_TS + 3_000;
    const skip = shouldSkipOutOfOrder(existingUpdatedAt, BASE_TS);
    expect(skip).toBe(false);
  });

  it("event is significantly older than existing row → should skip (out-of-order)", () => {
    // existingUpdatedAt is 10s newer than event — exceeds 5s tolerance
    const existingUpdatedAt = BASE_TS + 10_000;
    const skip = shouldSkipOutOfOrder(existingUpdatedAt, BASE_TS);
    expect(skip).toBe(true);
  });

  it("out-of-order: CANCELLATION arriving after EXPIRATION should be skipped", () => {
    // EXPIRATION was processed at T+10s, CANCELLATION arrives with T (older)
    const expirationProcessedAt = BASE_TS + 10_000;
    const cancellationEventTs = BASE_TS;
    const skip = shouldSkipOutOfOrder(expirationProcessedAt, cancellationEventTs);
    expect(skip).toBe(true);
  });

  it("out-of-order: RENEWAL arriving after CANCELLATION should be processed (newer)", () => {
    // CANCELLATION was processed at T, RENEWAL arrives with T+20s (newer)
    const cancellationProcessedAt = BASE_TS;
    const renewalEventTs = BASE_TS + 20_000;
    const skip = shouldSkipOutOfOrder(cancellationProcessedAt, renewalEventTs);
    expect(skip).toBe(false);
  });
});

describe("RevenueCat webhook — MySQL TIMESTAMP clamping", () => {
  it("normal near-future expiresAt is not clamped", () => {
    const nearFuture = new Date("2030-01-01T00:00:00.000Z").getTime();
    const result = clampExpiresAt(nearFuture);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBe(nearFuture);
  });

  it("far-future expiresAt (year 2286) is clamped to MySQL TIMESTAMP max", () => {
    const farFuture = new Date("2286-11-20T17:46:40.000Z").getTime();
    const result = clampExpiresAt(farFuture);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBe(MYSQL_TIMESTAMP_MAX);
  });

  it("null expiresAt returns null", () => {
    expect(clampExpiresAt(null)).toBeNull();
  });

  it("exactly MySQL max is not clamped", () => {
    const result = clampExpiresAt(MYSQL_TIMESTAMP_MAX);
    expect(result!.getTime()).toBe(MYSQL_TIMESTAMP_MAX);
  });

  it("one millisecond over MySQL max is clamped", () => {
    const result = clampExpiresAt(MYSQL_TIMESTAMP_MAX + 1);
    expect(result!.getTime()).toBe(MYSQL_TIMESTAMP_MAX);
  });
});

describe("RevenueCat webhook — Authorization header check", () => {
  it("correct secret → allowed", () => {
    expect(checkWebhookAuth("secret123", "secret123").allowed).toBe(true);
  });

  it("wrong secret → 401", () => {
    const r = checkWebhookAuth("secret123", "wrong");
    expect(r.allowed).toBe(false);
    expect(r.statusCode).toBe(401);
  });

  it("missing header → 401 when secret is set", () => {
    const r = checkWebhookAuth("secret123", undefined);
    expect(r.allowed).toBe(false);
    expect(r.statusCode).toBe(401);
  });

  it("no secret configured → always allowed (dev mode)", () => {
    expect(checkWebhookAuth(undefined, undefined).allowed).toBe(true);
    expect(checkWebhookAuth(undefined, "anything").allowed).toBe(true);
    expect(checkWebhookAuth("", undefined).allowed).toBe(true);
  });
});

describe("Grace-period isPremium semantics (getStatus logic)", () => {
  const FUTURE = Date.now() + 7 * 24 * 60 * 60 * 1000;  // 7 days from now
  const PAST   = Date.now() - 7 * 24 * 60 * 60 * 1000;  // 7 days ago

  it("active + future expiresAt → isPremium=true, no grace period", () => {
    const r = computeIsPremium("active", FUTURE);
    expect(r.isPremium).toBe(true);
    expect(r.isInGracePeriod).toBe(false);
    expect(r.cancelledButActive).toBe(false);
  });

  it("active + past expiresAt → isPremium=true but isInGracePeriod=true", () => {
    // This is the BILLING_ISSUE state: RC keeps status=active but expiresAt is past
    const r = computeIsPremium("active", PAST);
    expect(r.isPremium).toBe(true);
    expect(r.isInGracePeriod).toBe(true);
  });

  it("cancelled + future expiresAt → isPremium=true (cancelledButActive)", () => {
    // User cancelled but subscription hasn't expired yet
    const r = computeIsPremium("cancelled", FUTURE);
    expect(r.isPremium).toBe(true);
    expect(r.cancelledButActive).toBe(true);
  });

  it("cancelled + past expiresAt → isPremium=false", () => {
    const r = computeIsPremium("cancelled", PAST);
    expect(r.isPremium).toBe(false);
    expect(r.cancelledButActive).toBe(false);
  });

  it("cancelled + null expiresAt → isPremium=false", () => {
    const r = computeIsPremium("cancelled", null);
    expect(r.isPremium).toBe(false);
  });

  it("expired → isPremium=false", () => {
    const r = computeIsPremium("expired", FUTURE);
    expect(r.isPremium).toBe(false);
  });

  it("refunded → isPremium=false", () => {
    const r = computeIsPremium("refunded", FUTURE);
    expect(r.isPremium).toBe(false);
  });

  it("null status (no subscription) → isPremium=false", () => {
    const r = computeIsPremium(null, null);
    expect(r.isPremium).toBe(false);
  });
});

describe("Source code contract verification", () => {
  const webhookSrc = readFileSync(
    join(__dirname, "..", "server", "_core", "index.ts"),
    "utf8"
  );
  const routersSrc = readFileSync(
    join(__dirname, "..", "server", "routers.ts"),
    "utf8"
  );

  it("webhook: NO_OP_EVENTS set contains SUBSCRIBER_ALIAS", () => {
    expect(webhookSrc).toContain('NO_OP_EVENTS');
    expect(webhookSrc).toContain('"SUBSCRIBER_ALIAS"');
  });

  it("webhook: GRACE_PERIOD_START maps to active", () => {
    expect(webhookSrc).toContain('GRACE_PERIOD_START');
    expect(webhookSrc).toMatch(/GRACE_PERIOD_START.*"active"/);
  });

  it("webhook: GRACE_PERIOD_END maps to expired", () => {
    expect(webhookSrc).toContain('GRACE_PERIOD_END');
    expect(webhookSrc).toMatch(/GRACE_PERIOD_END.*"expired"/);
  });

  it("webhook: BILLING_ISSUE maps to active (not cancelled)", () => {
    expect(webhookSrc).toMatch(/BILLING_ISSUE.*"active"/);
  });

  it("webhook: UNCANCELLATION maps to active", () => {
    expect(webhookSrc).toMatch(/UNCANCELLATION.*"active"/);
  });

  it("webhook: REFUND_REVERSED maps to active (DEFECT-3 fix)", () => {
    expect(webhookSrc).toMatch(/REFUND_REVERSED.*"active"/);
  });

  it("webhook: SUBSCRIPTION_EXTENDED maps to active (DEFECT-3 fix)", () => {
    expect(webhookSrc).toMatch(/SUBSCRIPTION_EXTENDED.*"active"/);
  });

  it("webhook: TRANSFER uses transferred_to for user resolution (DEFECT-4 fix)", () => {
    expect(webhookSrc).toContain('transferred_to');
    expect(webhookSrc).toContain('DEFECT-4 FIX');
  });

  it("webhook: out-of-order guard is present", () => {
    expect(webhookSrc).toContain('out-of-order');
    expect(webhookSrc).toContain('eventTimestampMs');
  });

  it("webhook: MySQL TIMESTAMP clamping is present", () => {
    expect(webhookSrc).toContain('MYSQL_TIMESTAMP_MAX');
    expect(webhookSrc).toContain('2038-01-19');
  });

  it("routers: getStatus returns cancelledButActive field", () => {
    expect(routersSrc).toContain('cancelledButActive');
  });

  it("routers: getStatus returns isInGracePeriod field", () => {
    expect(routersSrc).toContain('isInGracePeriod');
  });

  it("routers: history returns platform field", () => {
    expect(routersSrc).toContain('platform');
  });

  it("routers: isPremium includes cancelledButActive logic", () => {
    expect(routersSrc).toMatch(/isPremium.*=.*status.*===.*"active".*\|\|.*cancelledButActive/);
  });
});
