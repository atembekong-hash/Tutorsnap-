import "dotenv/config";
// Sentry server SDK must be initialised before any other imports
import { initSentryServer } from "./sentry-server";
initSentryServer();
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerVoiceUploadRoute } from "./voiceUpload";
import { registerChatStreamRoute } from "./chatStream";
import { registerMathRenderRoute } from "./mathRender";
import { registerClassroomAcceptanceRoute } from "./classroomAcceptanceRoute";
import { appRouter } from "../routers";
import { createContext } from "./context";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://tutorsnapai.tech",
  "https://www.tutorsnapai.tech",
  "http://localhost:8081",
  "http://localhost:19006",
];

function getAllowedOrigins(): Set<string> {
  const configured = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}

function getReleaseVersion(): string {
  return process.env.APP_VERSION?.trim() || "2.3.0";
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const allowedOrigins = getAllowedOrigins();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Enable CORS for all routes.
  // Native Android/iOS fetch calls do NOT send an Origin header, so we must
  // always set Access-Control-Allow-Origin regardless of whether Origin is present.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isAllowedOrigin = !origin || allowedOrigins.has(origin);

    if (!isAllowedOrigin) {
      res.status(403).json({ ok: false, error: "Origin not allowed" });
      return;
    }

    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Id, X-Cron-Secret",
    );
    res.header("X-Content-Type-Options", "nosniff");
    res.header("Referrer-Policy", "no-referrer");

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerVoiceUploadRoute(app);
  registerChatStreamRoute(app);
  registerMathRenderRoute(app);
  registerClassroomAcceptanceRoute(app);

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "tutorsnap-api",
      version: getReleaseVersion(),
      commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 12) || null,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/ready", async (_req, res) => {
    try {
      const { getDb } = await import("../db.js");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) {
        res.status(503).json({ ok: false, database: "unavailable" });
        return;
      }
      await db.execute(sql`select 1`);
      res.json({
        ok: true,
        database: "ready",
        version: getReleaseVersion(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Readiness] Database check failed:", error);
      res.status(503).json({ ok: false, database: "unavailable" });
    }
  });

  // OTP cleanup is handled by the singleton scheduler in email-auth.ts.
  // This endpoint is retained for authenticated manual/monitoring use only.
  app.post("/api/scheduled/otp-cleanup", async (req, res) => {
    const scheduleSecret = process.env.SCHEDULE_SECRET?.trim();
    if (!scheduleSecret) {
      res.status(503).json({ ok: false, error: "Scheduled operation is not configured" });
      return;
    }
    const authorization = req.headers.authorization;
    const headerSecret = req.headers["x-cron-secret"];
    if (
      authorization !== `Bearer ${scheduleSecret}` &&
      headerSecret !== scheduleSecret
    ) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    try {
      const { getDb } = await import("../db.js");
      const { otpCodes } = await import("../../drizzle/schema.js");
      const { lt } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) { res.status(503).json({ ok: false, error: "DB unavailable" }); return; }
      const result = await db.delete(otpCodes).where(lt(otpCodes.expiresAt, new Date()));
      const deleted = (result as any)[0]?.affectedRows ?? 0;
      // console.log(`[OTP Cleanup] Manual cleanup: deleted ${deleted} expired rows`);
      res.json({ ok: true, deleted });
    } catch (err) {
      console.error("[OTP Cleanup] Error:", err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Version metadata endpoint used by the native in-app update check.
  app.get("/version.json", (_req, res) => {
    const latestVersion = getReleaseVersion();
    res.json({
      latestVersion,
      minVersion: process.env.MIN_SUPPORTED_VERSION?.trim() || latestVersion,
      releaseNotes: (process.env.RELEASE_NOTES ?? "")
        .split("|")
        .map((note) => note.trim())
        .filter(Boolean),
      iosStoreUrl: process.env.IOS_STORE_URL?.trim() || "https://apps.apple.com/app/tutorsnap/id6748752791",
      androidStoreUrl: process.env.ANDROID_STORE_URL?.trim() || "https://play.google.com/store/apps/details?id=com.tutorsnap.app",
      forceUpdate: process.env.FORCE_UPDATE === "true",
    });
  });

  // ─── RevenueCat Webhook ─────────────────────────────────────────────────────
  // Last deployed: 2026-07-29 (Phase 4 — REVENUECAT_WEBHOOK_SECRET push)
  //
  // RevenueCat sends real-time subscription events to this endpoint.
  // The body must be read as raw bytes before JSON.parse so that a future
  // HMAC/Authorization check can be added without re-reading the stream.
  //
  // Supported events:
  //   INITIAL_PURCHASE / RENEWAL  → upsert subscription as "active"
  //   CANCELLATION                → upsert subscription as "cancelled"
  //   EXPIRATION                  → upsert subscription as "expired"
  //   REFUND                      → upsert subscription as "refunded"
  //
  // Authorization:
  //   When REVENUECAT_WEBHOOK_SECRET is set, the Authorization header must
  //   match exactly. If the env var is absent the check is skipped (dev mode).
  //
  // Reference: https://www.revenuecat.com/docs/integrations/webhooks
  app.post(
    "/api/webhooks/revenuecat",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        // ── 1. Authorization check (FIX-2) ───────────────────────────────
        // In production, REVENUECAT_WEBHOOK_SECRET MUST be configured.
        // Accepting unauthenticated webhook requests in production would allow
        // any party to forge subscription events (grant/revoke premium).
        const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
        const isProduction = process.env.NODE_ENV === "production";
        if (!secret) {
          if (isProduction) {
            console.error(
              "[RC Webhook] CRITICAL: REVENUECAT_WEBHOOK_SECRET is not set in production. "
              + "All webhook requests are rejected to prevent unauthorized subscription grants."
            );
            res.status(500).json({ ok: false, error: "Webhook secret not configured" });
            return;
          }
          // Development/test: allow unauthenticated requests (no real purchases)
          console.warn("[RC Webhook] REVENUECAT_WEBHOOK_SECRET not set — skipping auth check (dev mode)");
        } else {
          const authHeader = req.headers["authorization"];
          if (authHeader !== secret) {
            console.warn("[RC Webhook] Unauthorized request — Authorization header mismatch");
            res.status(401).json({ ok: false, error: "Unauthorized" });
            return;
          }
        }

        // ── 2. Parse body ─────────────────────────────────────────────────────
        let payload: any;
        try {
          const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
          payload = JSON.parse(raw);
        } catch {
          console.warn("[RC Webhook] Invalid JSON body");
          res.status(400).json({ ok: false, error: "Invalid JSON" });
          return;
        }

        const event = payload?.event;
        if (!event) {
          console.warn("[RC Webhook] Missing event object in payload");
          res.status(400).json({ ok: false, error: "Missing event" });
          return;
        }

        const eventType: string = event.type ?? "";
        // DEFECT-4 FIX: For TRANSFER events, app_user_id is the OLD user.
        // The subscription must be attributed to event.transferred_to (the new user).
        // For all other events, use app_user_id as normal.
        const rcUserId: string =
          (eventType === "TRANSFER" && event.transferred_to)
            ? (event.transferred_to as string)
            : (event.app_user_id ?? "");
        const productId: string = event.product_id ?? "";
        const expiresAtMs: number | null = event.expiration_at_ms ?? null;

        console.log(`[RC Webhook] event=${eventType} rcUser=${rcUserId} product=${productId}`);

        // ── 3. Determine new status ───────────────────────────────────────────
        //
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
        // Grace-period events: set isInGracePeriod=true in DB; all other events clear it.
        const GRACE_PERIOD_EVENTS = new Set(["BILLING_ISSUE", "GRACE_PERIOD_START"]);
        const STATUS_MAP: Record<string, SubStatus> = {
          // Purchase / renewal events → active
          INITIAL_PURCHASE:      "active",
          RENEWAL:               "active",
          PRODUCT_CHANGE:        "active",
          UNCANCELLATION:        "active",
          NON_RENEWING_PURCHASE: "active",
          TRANSFER:              "active",
          // Refund reversed → re-activate (RC claws back the refund; access restored)
          REFUND_REVERSED:       "active",
          // Subscription extended → still active with new expiry
          SUBSCRIPTION_EXTENDED: "active",
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
        // FIX-7: purchased_at_ms is null for CANCELLATION/EXPIRATION events
        const eventTimestampMs: number | null = (event.purchased_at_ms as number | null) ?? (event.event_timestamp_ms as number | null) ?? (expiresAtMs ?? null);

        const existing = await db
          .select({
            id: subscriptions.id,
            status: subscriptions.status,
            expiresAt: subscriptions.expiresAt,
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
          if (eventTimestampMs !== null && existingUpdatedMs > eventTimestampMs + 5_000) {
            console.log(
              `[RC Webhook] Skipping out-of-order event: ${eventType} ` +
              `(existing updatedAt=${existingUpdatedMs} > event ts=${eventTimestampMs})`
            );
            res.json({ ok: true, handled: false, reason: "out-of-order event skipped" });
            return;
          }
          // Exact-duplicate guard: skip if same status, same expiresAt, and event timestamp
          // matches the stored updatedAt (within 5 s). This prevents duplicate deliveries
          // from bumping updatedAt and polluting audit logs.
          const existingExpiresMs = existingRow.expiresAt ? existingRow.expiresAt.getTime() : null;
          const incomingExpiresMs = expiresAt ? expiresAt.getTime() : null;
          const sameStatus = existingRow.status === newStatus;
          const sameExpiry = existingExpiresMs === incomingExpiresMs;
          const sameTimestamp = eventTimestampMs !== null && Math.abs(existingUpdatedMs - eventTimestampMs) <= 5_000;
          if (sameStatus && sameExpiry && sameTimestamp) {
            console.log(`[RC Webhook] Exact duplicate skipped: ${eventType} for rcUser=${rcUserId}`);
            res.json({ ok: true, handled: false, reason: "exact duplicate skipped" });
            return;
          }
          await db
            .update(subscriptions)
            .set({
              status: newStatus,
              isInGracePeriod: GRACE_PERIOD_EVENTS.has(eventType),
              ...(localUserId !== null ? { userId: localUserId } : {}),
              ...(expiresAt !== null ? { expiresAt } : {}),
            })
            .where(eq(subscriptions.id, existingRow.id));
        } else {
          await db.insert(subscriptions).values({
            revenueCatUserId: rcUserId,
            productId,
            status: newStatus,
            isInGracePeriod: GRACE_PERIOD_EVENTS.has(eventType),
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
            content: `Product: ${productId || "unknown"}
RC User: ${rcUserId || "anonymous"}
Status: ${newStatus}`,
          }).catch((err: unknown) => {
            console.warn("[RC Webhook] Owner notification failed (non-fatal):", err);
          });
        }

                res.json({ ok: true, handled: true, status: newStatus });
      } catch (err) {
        console.error("[RC Webhook] Unexpected error:", err);
        // Return 500 so RevenueCat retries the event
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    },
  );

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const port = Number.parseInt(process.env.PORT || "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
  }

  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(port, "0.0.0.0", () => {
      server.off("error", onError);
      console.log(`[API] TutorSnap ${getReleaseVersion()} listening on port ${port}`);
      resolve();
    });
  });

  await startCleanupScheduler();

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[API] ${signal} received; draining connections`);

    const forceExitTimer = setTimeout(() => {
      console.error("[API] Graceful shutdown timed out");
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    server.close((error) => {
      clearTimeout(forceExitTimer);
      if (error) {
        console.error("[API] Shutdown failed:", error);
        process.exit(1);
      }
      console.log("[API] Shutdown complete");
      process.exit(0);
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((error: unknown) => {
  console.error("[API] Failed to start:", error);
  process.exitCode = 1;
});

/**
 * Start database-backed singleton cleanup schedulers. Each job uses its own
 * scheduler_locks key, so horizontal API replicas cannot run duplicate work.
 */
async function startCleanupScheduler() {
  try {
    const [{ startOtpCleanupScheduler }, { startClassroomCleanupScheduler }] = await Promise.all([
      import("../routers/email-auth.js"),
      import("../routers/classroom.js"),
    ]);
    await Promise.all([
      startOtpCleanupScheduler(),
      startClassroomCleanupScheduler(),
    ]);
  } catch (err: any) {
    console.warn("[Cleanup] Could not start a scheduler (non-fatal):", err?.message ?? err);
  }
}
