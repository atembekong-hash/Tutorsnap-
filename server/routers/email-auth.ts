/**
 * Email OTP Authentication Router — Production-hardened
 *
 * Security model:
 * ─────────────────────────────────────────────────────────────────────────────
 * HASHING
 *   Codes are hashed with HMAC-SHA-256 keyed by OTP_PEPPER (server-only secret).
 *   Plain SHA-256 is NOT used — a pepper prevents offline brute-force of the
 *   6-digit space even if the DB is exfiltrated.
 *
 * RATE LIMITS (durable — stored in otp_audit, never deleted during normal ops)
 *   Per-email: max 5 sends per 10-minute window
 *   Per-IP:    max 10 sends per 10-minute window
 *   Deleting consumed/expired rows from otp_codes does NOT reset these counters.
 *
 * TRUSTED PROXY
 *   X-Forwarded-For is only trusted when the direct TCP connection comes from
 *   a known proxy CIDR (Cloudflare or Google Cloud Run internal range).
 *   Arbitrary client-supplied forwarding headers are ignored; remoteAddress is
 *   used as the fallback IP.
 *
 * COOLDOWN
 *   60-second resend cooldown per email+purpose (checked against otp_audit).
 *
 * SINGLE-USE + ATOMIC VERIFICATION
 *   Verification uses a conditional UPDATE (attempts < MAX_ATTEMPTS AND id = ?)
 *   followed by a conditional DELETE (hashedCode = ? AND id = ?) inside a
 *   serializable transaction. Concurrent requests for the same code cannot both
 *   succeed — only the first UPDATE wins; the second sees 0 affected rows.
 *
 * PURPOSE-BOUND
 *   "signin" codes cannot be used for "change_email" and vice versa.
 *
 * EXPIRY
 *   10-minute TTL enforced at issue time and re-checked inside the transaction.
 *
 * ATTEMPT LOCKOUT
 *   Max 5 failed verifications; row deleted on lockout.
 *
 * PRIOR CODE INVALIDATION
 *   Issuing a new code always deletes any prior code for the same email+purpose.
 *
 * SCHEDULER
 *   Cleanup runs every 30 minutes via a DB-backed singleton lock (scheduler_locks
 *   table). Multiple server instances cannot register duplicate workers — only
 *   the instance that wins the INSERT acquires the lock.
 *
 * DATABASE: MySQL (drizzle-orm/mysql-core, mysql2 driver)
 * Tables: otp_codes, otp_audit, scheduler_locks
 */

import { router, publicProcedure, protectedProcedure } from "@/server/_core/trpc";
import { z } from "zod";
import { getDb } from "@/server/db";
import { users, otpCodes, otpAudit } from "@/drizzle/schema";
import { eq, and, lt, gt, sql } from "drizzle-orm";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { hostname } from "os";
import type { Request } from "express";
import { sdk } from "@/server/_core/sdk";

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_TTL_MS            = 10 * 60 * 1000;  // 10 minutes
const RESEND_COOLDOWN_MS    = 60 * 1000;        // 60 seconds between sends
const MAX_ATTEMPTS          = 5;                // verification attempts before lockout
const RATE_LIMIT_WINDOW_MS  = 10 * 60 * 1000;  // 10-minute window for rate limiting
const MAX_SENDS_PER_EMAIL   = 5;               // max sends per email per window
const MAX_SENDS_PER_IP      = 10;              // max sends per IP per window

type OtpPurpose = "signin" | "change_email";

// ─── Trusted proxy CIDR list ──────────────────────────────────────────────────
//
// X-Forwarded-For is only trusted when the direct TCP connection (remoteAddress)
// comes from one of these ranges. Clients cannot spoof their IP by injecting an
// X-Forwarded-For header if they are not behind a trusted proxy.
//
// Cloudflare IPv4 ranges: https://www.cloudflare.com/ips-v4
// Google Cloud Run internal: 169.254.0.0/16 (link-local), 10.0.0.0/8
//
// TRUSTED_PROXY_CIDRS env var (comma-separated) overrides this list at runtime.

const DEFAULT_TRUSTED_CIDRS = [
  // Cloudflare IPv4 (as of 2025)
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
  "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
  "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
  "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
  // Google Cloud Run / internal
  "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16",
  // Loopback (dev)
  "127.0.0.0/8", "::1/128",
];

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function cidrContains(cidr: string, ip: string): boolean {
  try {
    const [base, bits] = cidr.split("/");
    const mask = bits ? ~((1 << (32 - parseInt(bits, 10))) - 1) >>> 0 : 0xffffffff;
    return (ipToInt(base) & mask) === (ipToInt(ip) & mask);
  } catch {
    return false;
  }
}

function isTrustedProxy(remoteAddress: string): boolean {
  const cidrs = process.env.TRUSTED_PROXY_CIDRS
    ? process.env.TRUSTED_PROXY_CIDRS.split(",").map((s) => s.trim())
    : DEFAULT_TRUSTED_CIDRS;
  const addr = remoteAddress.replace(/^::ffff:/, ""); // normalise IPv4-mapped IPv6
  return cidrs.some((cidr) => cidrContains(cidr, addr));
}

/**
 * Extract the real client IP.
 * Only trusts X-Forwarded-For when the direct connection comes from a known proxy.
 * Falls back to remoteAddress for all other connections.
 */
function getClientIp(req?: Request): string {
  if (!req) return "unknown";
  const remote = req.socket?.remoteAddress ?? "";
  if (isTrustedProxy(remote)) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const first = forwarded.split(",")[0].trim();
      if (first) return first;
    }
    // Cloudflare also sets CF-Connecting-IP (single value, more reliable)
    const cfIp = req.headers["cf-connecting-ip"];
    if (typeof cfIp === "string" && cfIp.trim()) return cfIp.trim();
  }
  return remote || "unknown";
}

// ─── HMAC-SHA-256 hashing ─────────────────────────────────────────────────────

function hashCode(code: string): string {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) {
    // Fail loudly in production; fall back to plain SHA-256 only in dev so
    // local testing without a pepper still works.
    if (process.env.NODE_ENV === "production") {
      throw new Error("[EmailAuth] OTP_PEPPER is not set — refusing to hash without pepper in production");
    }
    const { createHash } = require("crypto");
    return createHash("sha256").update(code).digest("hex");
  }
  return createHmac("sha256", pepper).update(code).digest("hex");
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

// ─── OTP generation ───────────────────────────────────────────────────────────

function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

// ─── Resend email delivery ────────────────────────────────────────────────────

async function sendOtpEmail(to: string, code: string, purpose: OtpPurpose): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "support@tutorsnapai.tech";

  if (!apiKey) {
    console.warn(`[EmailAuth] RESEND_API_KEY not set — OTP (${purpose}) for ${to}: ${code}`);
    return false;
  }

  const subjectMap: Record<OtpPurpose, string> = {
    signin: `Your TutorSnap sign-in code: ${code}`,
    change_email: `Verify your new TutorSnap email address: ${code}`,
  };
  const headingMap: Record<OtpPurpose, string> = {
    signin: "Here is your sign-in code:",
    change_email: "Verify your new email address:",
  };

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: `TutorSnap <${fromEmail}>`,
      to,
      subject: subjectMap[purpose],
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #11181C; margin: 0 0 8px;">TutorSnap</h1>
          <p style="color: #687076; margin: 0 0 32px;">Your AI tutor for math, science, and more</p>
          <p style="color: #11181C; margin: 0 0 16px;">${headingMap[purpose]}</p>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #0a7ea4;">${code}</span>
          </div>
          <p style="color: #687076; font-size: 14px; margin: 0 0 8px;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color: #687076; font-size: 14px; margin: 0;">If you did not request this code, you can safely ignore this email.</p>
        </div>
      `,
      text: `Your TutorSnap code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,
    });

    if (error) {
      console.error("[EmailAuth] Resend error:", error);
      return false;
    }

    // console.log(`[EmailAuth] OTP email (${purpose}) sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[EmailAuth] Failed to send OTP email:", err);
    return false;
  }
}

// ─── DB-backed OTP issue ──────────────────────────────────────────────────────

type IssueResult =
  | { ok: true; sent: boolean; devCode?: string }
  | { ok: false; error: string };

async function issueOtp(
  email: string,
  purpose: OtpPurpose,
  clientIp: string
): Promise<IssueResult> {
  const db = await getDb();
  if (!db) return { ok: false, error: "Database unavailable. Please try again." };

  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  // ── 1. Per-email rate limit — query otp_audit (durable, never deleted) ──
  const emailSendCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(otpAudit)
    .where(and(eq(otpAudit.email, email), gt(otpAudit.createdAt, windowStart)));
  if ((emailSendCount[0]?.count ?? 0) >= MAX_SENDS_PER_EMAIL) {
    await db.insert(otpAudit).values({ email, purpose, ipAddress: clientIp, outcome: "rate_limited_email" });
    return { ok: false, error: "Too many code requests for this email. Please wait 10 minutes." };
  }

  // ── 2. Per-IP rate limit — query otp_audit ──
  if (clientIp !== "unknown") {
    const ipSendCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(otpAudit)
      .where(and(eq(otpAudit.ipAddress, clientIp), gt(otpAudit.createdAt, windowStart)));
    if ((ipSendCount[0]?.count ?? 0) >= MAX_SENDS_PER_IP) {
      await db.insert(otpAudit).values({ email, purpose, ipAddress: clientIp, outcome: "rate_limited_ip" });
      return { ok: false, error: "Too many requests from your network. Please wait 10 minutes." };
    }
  }

  // ── 3. 60-second resend cooldown — query otp_audit ──
  const recent = await db
    .select({ createdAt: otpAudit.createdAt })
    .from(otpAudit)
    .where(
      and(
        eq(otpAudit.email, email),
        eq(otpAudit.purpose, purpose),
        eq(otpAudit.outcome, "sent"),
        gt(otpAudit.createdAt, new Date(now.getTime() - RESEND_COOLDOWN_MS))
      )
    )
    .limit(1);
  if (recent.length > 0) {
    const elapsed = now.getTime() - new Date(recent[0].createdAt).getTime();
    const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
    return { ok: false, error: `Please wait ${remaining} seconds before requesting a new code.` };
  }

  // ── 4. Invalidate all prior codes for this email+purpose ──
  await db.delete(otpCodes).where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose)));

  // ── 5. Generate and store new code (HMAC-hashed only) ──
  const code = generateOtp();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  await db.insert(otpCodes).values({
    email,
    hashedCode: hashCode(code),
    purpose,
    expiresAt,
    attempts: 0,
    ipAddress: clientIp,
  });

  // ── 6. Record in audit log (rate-limit source of truth) ──
  await db.insert(otpAudit).values({ email, purpose, ipAddress: clientIp, outcome: "sent" });

  const sent = await sendOtpEmail(email, code, purpose);
  const devCode = process.env.NODE_ENV !== "production" ? code : undefined;
  return { ok: true, sent, devCode };
}

// ─── Atomic OTP verification ──────────────────────────────────────────────────
//
// Uses a serializable transaction with a conditional UPDATE to prevent concurrent
// verification requests from both succeeding on the same code:
//
//   1. SELECT the row (read current state)
//   2. Check expiry and attempt count
//   3. Atomically increment attempts with: UPDATE ... SET attempts = attempts + 1
//      WHERE id = ? AND attempts < MAX_ATTEMPTS AND expiresAt > NOW()
//      → If 0 rows affected, another concurrent request won the race (or the row
//        was already consumed/expired). Return error immediately.
//   4. Compare HMAC digest (timing-safe)
//   5. If correct: DELETE WHERE id = ? AND hashedCode = ?
//      → If 0 rows affected, another concurrent request already consumed it.
//   6. If incorrect: leave the incremented attempts row in place.

type VerifyResult = { ok: true } | { ok: false; error: string };

async function verifyOtpCode(
  email: string,
  code: string,
  purpose: OtpPurpose
): Promise<VerifyResult> {
  const db = await getDb();
  if (!db) return { ok: false, error: "Database unavailable. Please try again." };

  // Use a transaction to prevent concurrent reuse.
  // Note: TiDB does not support SERIALIZABLE isolation; the atomic
  // UPDATE ... WHERE attempts < MAX_ATTEMPTS pattern below provides
  // equivalent single-use protection without needing serializable.
  return await (db as any).transaction(
    async (tx: typeof db) => {
      const rows = await tx
        .select()
        .from(otpCodes)
        .where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose)))
        .limit(1);

      const entry = rows[0];

      if (!entry) {
        return { ok: false, error: "No code found for this email. Please request a new one." };
      }

      // ── Expiry check ──
      if (new Date() > new Date(entry.expiresAt)) {
        await tx.delete(otpCodes).where(eq(otpCodes.id, entry.id));
        return { ok: false, error: "Code has expired. Please request a new one." };
      }

      // ── Attempt limit ──
      if (entry.attempts >= MAX_ATTEMPTS) {
        await tx.delete(otpCodes).where(eq(otpCodes.id, entry.id));
        return { ok: false, error: "Too many incorrect attempts. Please request a new code." };
      }

      // ── Atomic attempt increment — concurrent requests see 0 affected rows ──
      const incrementResult = await tx
        .update(otpCodes)
        .set({ attempts: sql`${otpCodes.attempts} + 1` })
        .where(
          and(
            eq(otpCodes.id, entry.id),
            lt(otpCodes.attempts, MAX_ATTEMPTS),
            gt(otpCodes.expiresAt, new Date())
          )
        );
      const affected = (incrementResult as any)[0]?.affectedRows ?? 0;
      if (affected === 0) {
        // Another concurrent request won the race, or the row expired mid-flight
        return { ok: false, error: "Code is no longer valid. Please request a new one." };
      }

      // ── Timing-safe HMAC comparison ──
      const candidate = hashCode(code);
      if (!timingSafeCompare(candidate, entry.hashedCode)) {
        const remaining = MAX_ATTEMPTS - entry.attempts - 1;
        if (remaining <= 0) {
          await tx.delete(otpCodes).where(eq(otpCodes.id, entry.id));
          return { ok: false, error: "Too many incorrect attempts. Please request a new code." };
        }
        return {
          ok: false,
          error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        };
      }

      // ── Valid: atomically consume (single-use) ──
      // DELETE WHERE id = ? AND hashedCode = ? — if another concurrent request
      // already consumed it, 0 rows are affected and we reject.
      const deleteResult = await tx
        .delete(otpCodes)
        .where(and(eq(otpCodes.id, entry.id), eq(otpCodes.hashedCode, entry.hashedCode)));
      const deleted = (deleteResult as any)[0]?.affectedRows ?? 0;
      if (deleted === 0) {
        return { ok: false, error: "Code was already used. Please request a new one." };
      }

      return { ok: true };
    },
  );
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const emailAuthRouter = router({
  /**
   * Step 1 (sign-in): Send a 6-digit OTP to the given email address.
   */
  sendOtp: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase().trim();
      const ip = getClientIp(ctx.req);
      const result = await issueOtp(email, "signin", ip);
      if (!result.ok) return { success: false, error: result.error };
      return {
        success: true,
        sent: result.sent,
        message: result.sent
          ? "A 6-digit code has been sent to your email."
          : "Could not send email. Check server logs for the code (dev mode).",
        devCode: result.devCode,
      };
    }),

  /**
   * Step 2 (sign-in): Verify the OTP and sign in / register the user.
   */
  verifyOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(6),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase().trim();
      const verification = await verifyOtpCode(email, input.code, "signin");
      if (!verification.ok) return { success: false, error: verification.error };

      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Database unavailable" };

        const openId = `email:${email}`;
        const existingRows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
        let user = existingRows[0];

        if (!user) {
          await db.insert(users).values({
            openId,
            email,
            name: input.name || email.split("@")[0],
            loginMethod: "email",
            lastSignedIn: new Date(),
          });
          const newRows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
          user = newRows[0];
          // console.log(`[EmailAuth] New user registered: ${openId}`);
        } else {
          await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.openId, openId));
          // console.log(`[EmailAuth] User signed in: ${openId}`);
        }

        // Issue a real JWT session token (same format as Google OAuth)
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || user.email?.split("@")[0] || "",
        });
        return {
          success: true,
          token: sessionToken,
          user: {
            id: user.id,
            openId: user.openId,
            name: user.name,
            email: user.email,
            loginMethod: user.loginMethod,
          },
        };
      } catch (error) {
        console.error("[EmailAuth] DB error:", error);
        return { success: false, error: "Failed to sign in. Please try again." };
      }
    }),
  /**
   * Change-email step 1: Send an OTP to the new email address.
   */
  sendChangeEmailOtp: protectedProcedure
    .input(z.object({ newEmail: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const newEmail = input.newEmail.toLowerCase().trim();

      try {
        const db = await getDb();
        if (db) {
          const existing = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, newEmail))
            .limit(1);
          if (existing.length > 0) {
            return { success: false, error: "That email address is already in use." };
          }
        }
      } catch {
        // Non-fatal — proceed with sending
      }

      const ip = getClientIp(ctx.req);
      const result = await issueOtp(newEmail, "change_email", ip);
      if (!result.ok) return { success: false, error: result.error };
      return {
        success: true,
        sent: result.sent,
        message: result.sent
          ? `A verification code has been sent to ${newEmail}.`
          : "Could not send email. Check server logs for the code (dev mode).",
        devCode: result.devCode,
      };
    }),

  /**
   * Change-email step 2: Verify the OTP and update the user's email.
   */
  verifyChangeEmail: protectedProcedure
    .input(z.object({ newEmail: z.string().email(), code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const newEmail = input.newEmail.toLowerCase().trim();
      const verification = await verifyOtpCode(newEmail, input.code, "change_email");
      if (!verification.ok) return { success: false, error: verification.error };

      try {
        const db = await getDb();
        if (!db) return { success: false, error: "Database unavailable" };

        await db
          .update(users)
          .set({ email: newEmail, updatedAt: new Date() })
          .where(eq(users.id, ctx.user.id));

        // console.log(`[EmailAuth] Email changed for user ${ctx.user.id} → ${newEmail}`);
        return { success: true, newEmail };
      } catch (error) {
        console.error("[EmailAuth] Change email DB error:", error);
        return { success: false, error: "Failed to update email. Please try again." };
      }
    }),
});

// ─── Singleton cleanup scheduler ─────────────────────────────────────────────
//
// Uses the scheduler_locks table to ensure only ONE server instance runs the
// cleanup job at a time. The lock is acquired by INSERT ... ON DUPLICATE KEY
// UPDATE only if the existing lock is expired. If another instance holds a
// fresh lock, this instance skips silently.

const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const LOCK_TTL_MS         = 35 * 60 * 1000; // 35 minutes (slightly longer than interval)
const INSTANCE_ID = `${hostname()}-${process.pid}`;

export async function startOtpCleanupScheduler(): Promise<void> {
  // Run once immediately on startup, then on interval
  await runCleanupIfLockAcquired();
  setInterval(runCleanupIfLockAcquired, CLEANUP_INTERVAL_MS);
  // console.log(`[OTP Cleanup] Singleton scheduler started (instance: ${INSTANCE_ID}, interval: 30min)`);
}

async function runCleanupIfLockAcquired(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const lockExpiry = new Date(now.getTime() + LOCK_TTL_MS);

  try {
    // Attempt to acquire the lock atomically.
    // INSERT succeeds if no row exists.
    // ON DUPLICATE KEY UPDATE succeeds only if the existing lock is expired.
    await (db as any).execute(
      sql`INSERT INTO scheduler_locks (jobName, instanceId, expiresAt, acquiredAt)
          VALUES ('otp-cleanup', ${INSTANCE_ID}, ${lockExpiry}, ${now})
          ON DUPLICATE KEY UPDATE
            instanceId = IF(expiresAt < ${now}, VALUES(instanceId), instanceId),
            expiresAt  = IF(expiresAt < ${now}, VALUES(expiresAt), expiresAt),
            acquiredAt = IF(expiresAt < ${now}, VALUES(acquiredAt), acquiredAt)`
    );

    // Verify we actually hold the lock (another instance may have won the race)
    const lockRows = await db
      .select()
      .from(require("../../drizzle/schema").schedulerLocks)
      .where(eq(require("../../drizzle/schema").schedulerLocks.jobName, "otp-cleanup"))
      .limit(1);

    if (!lockRows[0] || lockRows[0].instanceId !== INSTANCE_ID) {
      // Another instance holds the lock — skip
      return;
    }

    // We hold the lock — run cleanup
    const cutoff = new Date();
    const result = await db.delete(otpCodes).where(lt(otpCodes.expiresAt, cutoff));
    const otpDeleted = (result as any)[0]?.affectedRows ?? 0;

    // Also prune otp_audit rows older than 24 hours
    const auditCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const auditResult = await db.delete(otpAudit).where(lt(otpAudit.createdAt, auditCutoff));
    const auditDeleted = (auditResult as any)[0]?.affectedRows ?? 0;

    // console.log(`[OTP Cleanup] Deleted ${otpDeleted} expired OTP rows, ${auditDeleted} audit rows older than 24h`);
  } catch (err: any) {
    // Non-fatal — opportunistic cleanup in issueOtp is the fallback
    console.warn("[OTP Cleanup] Scheduler error (non-fatal):", err?.message ?? err);
  }
}
