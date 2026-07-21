/**
 * Email OTP Authentication Router
 *
 * Implements a 6-digit OTP flow:
 *   1. Client calls `sendOtp` with an email address
 *      → Server generates a 6-digit code, stores it (hashed) in the `otp_codes`
 *        DB table with a 10-min TTL, and sends it via Resend.
 *   2. Client calls `verifyOtp` with the email + code
 *      → Server validates the code, creates/finds the user, returns user object.
 *   3. Client calls `sendChangeEmailOtp` (protected) with new email
 *      → Sends an OTP to the new address for change-email verification.
 *   4. Client calls `verifyChangeEmail` (protected) with new email + OTP
 *      → Verifies OTP and updates the user record.
 *
 * OTP storage uses the `otp_codes` MySQL table so codes survive server restarts.
 */

import { router, publicProcedure, protectedProcedure } from "@/server/_core/trpc";
import { z } from "zod";
import { getDb } from "@/server/db";
import { users, otpCodes } from "@/drizzle/schema";
import { eq, and, lt } from "drizzle-orm";
import { createHash, randomInt } from "crypto";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

// ─── Resend email delivery ────────────────────────────────────────────────────

async function sendOtpEmail(to: string, code: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "support@tutorsnapai.tech";

  if (!apiKey) {
    console.warn(`[EmailAuth] RESEND_API_KEY not set — OTP for ${to}: ${code}`);
    return false;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: `TutorSnap <${fromEmail}>`,
      to,
      subject: `Your TutorSnap sign-in code: ${code}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #11181C; margin: 0 0 8px;">TutorSnap</h1>
          <p style="color: #687076; margin: 0 0 32px;">Your AI tutor for math, science, and more</p>
          <p style="color: #11181C; margin: 0 0 16px;">Here is your sign-in code:</p>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #0a7ea4;">${code}</span>
          </div>
          <p style="color: #687076; font-size: 14px; margin: 0 0 8px;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color: #687076; font-size: 14px; margin: 0;">If you did not request this code, you can safely ignore this email.</p>
        </div>
      `,
      text: `Your TutorSnap sign-in code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,
    });

    if (error) {
      console.error("[EmailAuth] Resend error:", error);
      return false;
    }

    console.log(`[EmailAuth] OTP email sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[EmailAuth] Failed to send OTP email:", err);
    return false;
  }
}

// ─── DB-backed OTP helpers ────────────────────────────────────────────────────

async function issueOtp(email: string): Promise<{ sent: boolean; devCode?: string }> {
  const db = await getDb();
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  if (db) {
    // Delete any existing OTP for this email, then insert the new one
    await db.delete(otpCodes).where(eq(otpCodes.email, email));
    await db.insert(otpCodes).values({
      email,
      hashedCode: hashCode(code),
      expiresAt,
      attempts: 0,
    });

    // Clean up expired rows from other emails opportunistically
    await db.delete(otpCodes).where(lt(otpCodes.expiresAt, new Date())).catch(() => {});
  } else {
    console.warn("[EmailAuth] DB unavailable — OTP will not be persisted");
  }

  const sent = await sendOtpEmail(email, code);
  const devCode = process.env.NODE_ENV !== "production" ? code : undefined;
  return { sent, devCode };
}

type OtpValidationResult = { ok: true } | { ok: false; error: string };

async function validateOtp(email: string, code: string): Promise<OtpValidationResult> {
  const db = await getDb();
  if (!db) {
    return { ok: false, error: "Database unavailable. Please try again." };
  }

  const rows = await db
    .select()
    .from(otpCodes)
    .where(eq(otpCodes.email, email))
    .limit(1);

  const entry = rows[0];

  if (!entry) {
    return { ok: false, error: "No code found for this email. Please request a new one." };
  }

  if (new Date() > entry.expiresAt) {
    await db.delete(otpCodes).where(eq(otpCodes.email, email));
    return { ok: false, error: "Code has expired. Please request a new one." };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    await db.delete(otpCodes).where(eq(otpCodes.email, email));
    return { ok: false, error: "Too many incorrect attempts. Please request a new code." };
  }

  if (hashCode(code) !== entry.hashedCode) {
    await db.update(otpCodes)
      .set({ attempts: entry.attempts + 1 })
      .where(eq(otpCodes.email, email));
    return {
      ok: false,
      error: `Incorrect code. ${MAX_ATTEMPTS - entry.attempts - 1} attempt(s) remaining.`,
    };
  }

  // Valid — consume it
  await db.delete(otpCodes).where(eq(otpCodes.email, email));
  return { ok: true };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const emailAuthRouter = router({
  /**
   * Step 1 (sign-in): Send a 6-digit OTP to the given email address.
   */
  sendOtp: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase().trim();
      const { sent, devCode } = await issueOtp(email);
      return {
        success: true,
        sent,
        message: sent
          ? "A 6-digit code has been sent to your email."
          : "Could not send email. Check server logs for the code (dev mode).",
        devCode,
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
      const validation = await validateOtp(email, input.code);
      if (!validation.ok) return { success: false, error: validation.error };

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
   * Change-email step 1: Send an OTP to the new email address for verification.
   */
  sendChangeEmailOtp: protectedProcedure
    .input(z.object({ newEmail: z.string().email() }))
    .mutation(async ({ input }) => {
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

      const { sent, devCode } = await issueOtp(newEmail);
      return {
        success: true,
        sent,
        message: sent
          ? `A verification code has been sent to ${newEmail}.`
          : "Could not send email. Check server logs for the code (dev mode).",
        devCode,
      };
    }),

  /**
   * Change-email step 2: Verify the OTP and update the user's email.
   */
  verifyChangeEmail: protectedProcedure
    .input(z.object({ newEmail: z.string().email(), code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const newEmail = input.newEmail.toLowerCase().trim();
      const validation = await validateOtp(newEmail, input.code);
      if (!validation.ok) return { success: false, error: validation.error };

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
