import "dotenv/config";
// Sentry server SDK must be initialised before any other imports
import { initSentryServer } from "./sentry-server";
initSentryServer();
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerVoiceUploadRoute } from "./voiceUpload";
import { registerChatStreamRoute } from "./chatStream";
import { registerMathRenderRoute } from "./mathRender";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes.
  // Native Android/iOS fetch calls do NOT send an Origin header, so we must
  // always set Access-Control-Allow-Origin regardless of whether Origin is present.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Reflect origin if present (needed for web + credentials); otherwise allow all
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    // Only send Allow-Credentials when we have a specific origin (wildcard + credentials is invalid)
    if (origin) {
      res.header("Access-Control-Allow-Credentials", "true");
    }

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
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

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

// OTP cleanup is handled by the singleton scheduler in email-auth.ts.
  // The /api/scheduled/otp-cleanup endpoint is kept for manual/monitoring use only.
  app.post("/api/scheduled/otp-cleanup", async (_req, res) => {
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

  // Version metadata endpoint — used by the in-app update check hook.
  // The live tutorsnapai.tech/version.json is the canonical source for production.
  // This endpoint serves the same data from the local API server so the update
  // prompt can be tested in development without a deployed domain.
  app.get("/version.json", (_req, res) => {
    res.json({
      latestVersion: "1.1.0",
      minVersion: "1.0.0",
      releaseNotes: [
        "Flashcard PDF export — share your entire deck as a printable PDF",
        "Classroom leaderboard and homework assignment tools",
        "153 accessibility improvements for screen readers",
        "App Store privacy manifest and NSUsageDescription strings",
        "Pomodoro focus timer for Study Planner sessions",
        "Streak freeze mechanic and badge unlock animations",
      ],
      iosStoreUrl: "https://apps.apple.com/app/tutorsnap/id6748752791",
      androidStoreUrl: "https://play.google.com/store/apps/details?id=com.tutorsnap.app",
      forceUpdate: false,
    });
  });

  // ─── RevenueCat Webhook ─────────────────────────────────────────────────────
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
        // ── 1. Optional Authorization check ──────────────────────────────────
        const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
        if (secret) {
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
        const rcUserId: string = event.app_user_id ?? "";
        const productId: string = event.product_id ?? "";
        const expiresAtMs: number | null = event.expiration_at_ms ?? null;

        console.log(`[RC Webhook] event=${eventType} rcUser=${rcUserId} product=${productId}`);

        // ── 3. Determine new status ───────────────────────────────────────────
        type SubStatus = "active" | "cancelled" | "expired" | "refunded";
        const STATUS_MAP: Record<string, SubStatus> = {
          INITIAL_PURCHASE: "active",
          RENEWAL: "active",
          PRODUCT_CHANGE: "active",
          CANCELLATION: "cancelled",
          EXPIRATION: "expired",
          REFUND: "refunded",
          BILLING_ISSUE: "cancelled",
        };

        const newStatus = STATUS_MAP[eventType];
        if (!newStatus) {
          // Unhandled event type — acknowledge but do nothing
          console.log(`[RC Webhook] Unhandled event type: ${eventType}`);
          res.json({ ok: true, handled: false });
          return;
        }

        // ── 4. Upsert subscription row ────────────────────────────────────────
        const { getDb } = await import("../db.js");
        const { subscriptions, users } = await import("../../drizzle/schema.js");
        const { eq, and } = await import("drizzle-orm");

        const db = await getDb();
        if (!db) {
          console.warn("[RC Webhook] DB unavailable — cannot persist subscription event");
          // Still return 200 so RevenueCat does not keep retrying
          res.json({ ok: true, persisted: false });
          return;
        }

        // Try to resolve the RevenueCat user ID to a local user.
        // The RC app_user_id is set to the local user's openId when Purchases.logIn
        // is called from the client. If the app has not called logIn yet the
        // rcUserId will be an anonymous RC-generated ID — we still store the row
        // with userId=null so it can be reconciled later.
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
        // RevenueCat may send far-future timestamps (e.g. lifetime subscriptions);
        // clamp to the MySQL max to avoid ER_TRUNCATED_WRONG_VALUE errors.
        const MYSQL_TIMESTAMP_MAX = new Date("2038-01-19T03:14:07.000Z");
        const expiresAt = expiresAtMs
          ? new Date(Math.min(expiresAtMs, MYSQL_TIMESTAMP_MAX.getTime()))
          : null;

        // Upsert: if a row for (revenueCatUserId, productId) already exists update it;
        // otherwise insert a new row.
        const existing = await db
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.revenueCatUserId, rcUserId),
              eq(subscriptions.productId, productId),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(subscriptions)
            .set({
              status: newStatus,
              ...(localUserId !== null ? { userId: localUserId } : {}),
              ...(expiresAt !== null ? { expiresAt } : {}),
            })
            .where(eq(subscriptions.id, existing[0].id));
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
        // Sends an owner alert when a new subscription is purchased or renewed.
        // If the notification service is unavailable the webhook still returns 200.
        if (eventType === "INITIAL_PURCHASE" || eventType === "RENEWAL") {
          const { notifyOwner } = await import("./notification.js");
          notifyOwner({
            title: eventType === "INITIAL_PURCHASE" ? "🎉 New Subscription!" : "🔄 Subscription Renewed",
            content: `Product: ${productId || "unknown"}\nRC User: ${rcUserId || "anonymous"}\nStatus: ${newStatus}`,
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

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    // console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    // console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);

/**
 * Start the OTP cleanup singleton scheduler.
 * Uses the scheduler_locks MySQL table to ensure only ONE server instance
 * runs the cleanup job at a time across horizontal scaling.
 * Replaces the heartbeat-based cron approach.
 */
async function startCleanupScheduler() {
  try {
    const { startOtpCleanupScheduler } = await import("../routers/email-auth.js");
    await startOtpCleanupScheduler();
  } catch (err: any) {
    console.warn("[OTP Cleanup] Could not start scheduler (non-fatal):", err?.message ?? err);
  }
}

startCleanupScheduler();
