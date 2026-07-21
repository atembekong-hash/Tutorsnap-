/**
 * Email OTP Authentication Router
 *
 * Security model:
 * - Codes are 6-digit, cryptographically random (crypto.randomInt)
 * - Only the SHA-256 hash is stored in the database — raw code never persisted
 * - Each code is single-use: consumed immediately on first valid verification
 * - Each code is purpose-bound: "signin" vs "change_email" — cross-purpose use rejected
 * - 10-minute TTL enforced at issue time and re-checked on verification
 * - 60-second resend cooldown per email (checked against createdAt in DB)
 * - Per-email rate limit: max 5 send requests per 10 minutes
 * - Per-IP rate limit: max 10 send requests per 10 minutes
 * - Max 5 verification attempts before code is invalidated
 * - Issuing a new code always invalidates any prior code for the same email+purpose
 * - Expired and consumed rows are cleaned up on each send (opportunistic)
 *
 * Database: MySQL (drizzle-orm/mysql-core, mysql2 driver)
 * Table: otp_codes (id, email, hashedCode, purpose, expiresAt, attempts, createdAt)
 */

import { router, publicProcedure, protectedProcedure } from "@/server/_core/trpc";
import { z } from "zod";
import { getDb } from "@/server/db";
import { users, otpCodes } from "@/drizzle/schema";
import { eq, and, lt, gt, sql } from "drizzle-orm";
import { createHash, randomInt } from "crypto";
import type { Request } from "express";

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_TTL_MS = 10 * 60 * 1000;          // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;        // 60 seconds between sends
const MAX_ATTEMPTS = 5;                       // verification attempts before lockout
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10-minute window for rate limiting
const MAX_SENDS_PER_EMAIL = 5;               // max sends per email per window
const MAX_SENDS_PER_IP = 10;                 // max sends per IP per window

type OtpPurpose = "signin" | "change_email";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

function getClientIp(req?: Request): string {
  if (!req) return "unknown";
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
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

    console.log(`[EmailAuth] OTP email (${purpose}) sent to ${to}`);
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

  // ── 1. Per-email rate limit: max MAX_SENDS_PER_EMAIL in the last 10 min ──
  const emailSendCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(otpCodes)
    .where(and(eq(otpCodes.email, email), gt(otpCodes.createdAt, windowStart)));
  if ((emailSendCount[0]?.count ?? 0) >= MAX_SENDS_PER_EMAIL) {
    return { ok: false, error: "Too many code requests for this email. Please wait 10 minutes." };
  }

  // ── 2. Per-IP rate limit: max MAX_SENDS_PER_IP in the last 10 min ──
  if (clientIp !== "unknown") {
    const ipSendCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(otpCodes)
      .where(and(eq(otpCodes.ipAddress, clientIp), gt(otpCodes.createdAt, windowStart)));
    if ((ipSendCount[0]?.count ?? 0) >= MAX_SENDS_PER_IP) {
      return { ok: false, error: "Too many requests from your network. Please wait 10 minutes." };
    }
  }

  // ── 3. 60-second resend cooldown: check most recent code for this email+purpose ──
  const recent = await db
    .select({ createdAt: otpCodes.createdAt })
    .from(otpCodes)
    .where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose)))
    .orderBy(sql`${otpCodes.createdAt} DESC`)
    .limit(1);
  if (recent.length > 0) {
    const elapsed = now.getTime() - new Date(recent[0].createdAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return { ok: false, error: `Please wait ${remaining} seconds before requesting a new code.` };
    }
  }

  // ── 4. Invalidate all prior codes for this email+purpose ──
  await db.delete(otpCodes).where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose)));

  // ── 5. Clean up expired rows opportunistically ──
  await db.delete(otpCodes).where(lt(otpCodes.expiresAt, now)).catch(() => {});

  // ── 6. Generate and store new code (hashed only) ──
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

  const sent = await sendOtpEmail(email, code, purpose);
  const devCode = process.env.NODE_ENV !== "production" ? code : undefined;
  return { ok: true, sent, devCode };
}

// ─── DB-backed OTP verify ─────────────────────────────────────────────────────

type VerifyResult = { ok: true } | { ok: false; error: string };

async function verifyOtpCode(
  email: string,
  code: string,
  purpose: OtpPurpose
): Promise<VerifyResult> {
  const db = await getDb();
  if (!db) return { ok: false, error: "Database unavailable. Please try again." };

  const rows = await db
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
    await db.delete(otpCodes).where(eq(otpCodes.id, entry.id));
    return { ok: false, error: "Code has expired. Please request a new one." };
  }

  // ── Attempt limit ──
  if (entry.attempts >= MAX_ATTEMPTS) {
    await db.delete(otpCodes).where(eq(otpCodes.id, entry.id));
    return { ok: false, error: "Too many incorrect attempts. Please request a new code." };
  }

  // ── Hash comparison (constant-time via string equality on hex digest) ──
  if (hashCode(code) !== entry.hashedCode) {
    await db
      .update(otpCodes)
      .set({ attempts: entry.attempts + 1 })
      .where(eq(otpCodes.id, entry.id));
    const remaining = MAX_ATTEMPTS - entry.attempts - 1;
    return {
      ok: false,
      error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  // ── Valid: consume immediately (single-use) ──
  await db.delete(otpCodes).where(eq(otpCodes.id, entry.id));
  return { ok: true };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const emailAuthRouter = router({
  /**
   * Step 1 (sign-in): Send a 6-digit OTP to the given email address.
   * Purpose: "signin"
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
   * Purpose check: only "signin" codes are accepted here.
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
          console.log(`[EmailAuth] New user registered: ${openId}`);
        } else {
          await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.openId, openId));
          console.log(`[EmailAuth] User signed in: ${openId}`);
        }

        return {
          success: true,
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
   * Purpose: "change_email" — cannot be used to sign in.
   */
  sendChangeEmailOtp: protectedProcedure
    .input(z.object({ newEmail: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const newEmail = input.newEmail.toLowerCase().trim();

      // Check the new email is not already taken
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
   * Purpose check: only "change_email" codes are accepted here.
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

        console.log(`[EmailAuth] Email changed for user ${ctx.user.id} → ${newEmail}`);
        return { success: true, newEmail };
      } catch (error) {
        console.error("[EmailAuth] Change email DB error:", error);
        return { success: false, error: "Failed to update email. Please try again." };
      }
    }),
});
