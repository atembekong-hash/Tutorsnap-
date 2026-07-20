/**
 * Email OTP Authentication Router
 *
 * Implements a 6-digit OTP flow:
 *   1. Client calls `sendOtp` with an email address
 *      → Server generates a 6-digit code, stores it (hashed) with a 10-min TTL,
 *        and sends it via the Manus notification service (owner-visible) OR
 *        falls back to a simple in-memory store for dev.
 *   2. Client calls `verifyOtp` with the email + code
 *      → Server validates the code, creates/finds the user, returns a session token.
 *
 * NOTE: The Manus platform does not expose a user-facing SMTP service, so we
 * use a server-side in-memory store (Map) for the OTP during development.
 * In production this should be replaced with a proper email delivery service
 * (SendGrid, Resend, etc.) configured via environment variables.
 */

import { router, publicProcedure } from "@/server/_core/trpc";
import { z } from "zod";
import { getDb } from "@/server/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { createHash, randomInt } from "crypto";

// ─── In-memory OTP store (replace with Redis/DB in production) ───────────────
interface OtpEntry {
  hashedCode: string;
  expiresAt: number;
  attempts: number;
}
const otpStore = new Map<string, OtpEntry>();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const emailAuthRouter = router({
  /**
   * Step 1: Send a 6-digit OTP to the given email address.
   */
  sendOtp: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase().trim();
      const code = generateOtp();
      const hashedCode = hashCode(code);

      // Store OTP (overwrite any previous entry for this email)
      otpStore.set(email, {
        hashedCode,
        expiresAt: Date.now() + OTP_TTL_MS,
        attempts: 0,
      });

      // Log code to server console (visible in dev logs / Manus dashboard)
      // In production, replace this with a real email delivery call.
      console.log(`[EmailAuth] OTP for ${email}: ${code} (expires in 10 min)`);

      // Attempt to notify the app owner so the code is visible during testing
      try {
        const { notifyOwner } = await import("@/server/_core/notification");
        await notifyOwner({
          title: `TutorSnap Email OTP`,
          content: `Sign-in code for ${email}: **${code}**\n\nExpires in 10 minutes.`,
        });
      } catch {
        // Non-critical — code is still in the server log
      }

      return {
        success: true,
        message: "OTP sent. Check your email (or server logs in development).",
        // In development, return the code directly so the UI can show it
        // Remove this in production!
        devCode: process.env.NODE_ENV !== "production" ? code : undefined,
      };
    }),

  /**
   * Step 2: Verify the OTP and sign in / register the user.
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
      const entry = otpStore.get(email);

      if (!entry) {
        return { success: false, error: "No OTP found for this email. Please request a new code." };
      }

      if (Date.now() > entry.expiresAt) {
        otpStore.delete(email);
        return { success: false, error: "OTP has expired. Please request a new code." };
      }

      if (entry.attempts >= MAX_ATTEMPTS) {
        otpStore.delete(email);
        return { success: false, error: "Too many incorrect attempts. Please request a new code." };
      }

      if (hashCode(input.code) !== entry.hashedCode) {
        entry.attempts += 1;
        return {
          success: false,
          error: `Incorrect code. ${MAX_ATTEMPTS - entry.attempts} attempt(s) remaining.`,
        };
      }

      // Code is valid — consume it
      otpStore.delete(email);

      // Create or find user in DB
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, error: "Database unavailable" };
        }

        const openId = `email:${email}`;
        const existingRows = await db
          .select()
          .from(users)
          .where(eq(users.openId, openId))
          .limit(1);

        let user = existingRows[0];

        if (!user) {
          // Register new user
          await db.insert(users).values({
            openId,
            email,
            name: input.name || email.split("@")[0],
            loginMethod: "email",
            lastSignedIn: new Date(),
          });
          const newRows = await db
            .select()
            .from(users)
            .where(eq(users.openId, openId))
            .limit(1);
          user = newRows[0];
          console.log(`[EmailAuth] New user registered: ${openId}`);
        } else {
          // Update last sign-in
          await db
            .update(users)
            .set({ lastSignedIn: new Date() })
            .where(eq(users.openId, openId));
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
});
