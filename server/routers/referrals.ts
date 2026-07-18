/**
 * Referral Code Validation Router
 * Handles server-side validation of referral codes to prevent fraud
 */

import { router, publicProcedure } from "@/server/_core/trpc";
import { z } from "zod";

// In-memory store for valid referral codes (in production, use database)
const VALID_CODES = new Map<string, { userId: string; uses: number; maxUses: number; expiresAt: Date }>();

// Initialize some test codes
VALID_CODES.set("WELCOME100", { userId: "admin", uses: 0, maxUses: 999, expiresAt: new Date("2027-12-31") });
VALID_CODES.set("FRIEND50", { userId: "admin", uses: 0, maxUses: 50, expiresAt: new Date("2026-12-31") });

export const referralRouter = router({
  /**
   * Validate a referral code
   */
  validateCode: publicProcedure
    .input(z.object({ code: z.string().min(5).max(20) }))
    .mutation(async ({ input }) => {
      try {
        const code = input.code.toUpperCase().trim();
        const codeData = VALID_CODES.get(code);

        if (!codeData) {
          return {
            valid: false,
            message: "Invalid referral code",
            freeDaysReward: 0,
          };
        }

        // Check if code has expired
        if (new Date() > codeData.expiresAt) {
          return {
            valid: false,
            message: "Referral code has expired",
            freeDaysReward: 0,
          };
        }

        // Check if code has reached max uses
        if (codeData.uses >= codeData.maxUses) {
          return {
            valid: false,
            message: "Referral code has reached maximum uses",
            freeDaysReward: 0,
          };
        }

        // Code is valid - increment use count
        codeData.uses += 1;

        return {
          valid: true,
          message: "Referral code validated successfully",
          freeDaysReward: 7,
        };
      } catch (error) {
        console.error("Referral code validation error:", error);
        return {
          valid: false,
          message: "Error validating referral code",
          freeDaysReward: 0,
        };
      }
    }),

  /**
   * Generate a new referral code for a user
   */
  generateCode: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Generate unique code
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const code = `${input.userId.substring(0, 3).toUpperCase()}${timestamp}${random}`;

        // Store code
        VALID_CODES.set(code, {
          userId: input.userId,
          uses: 0,
          maxUses: 999,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        });

        return {
          success: true,
          code,
          message: "Referral code generated successfully",
        };
      } catch (error) {
        console.error("Referral code generation error:", error);
        return {
          success: false,
          code: null,
          message: "Error generating referral code",
        };
      }
    }),

  /**
   * Get referral code stats
   */
  getCodeStats: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      try {
        const codeData = VALID_CODES.get(input.code.toUpperCase());

        if (!codeData) {
          return {
            found: false,
            uses: 0,
            maxUses: 0,
            remaining: 0,
            expiresAt: null,
          };
        }

        return {
          found: true,
          uses: codeData.uses,
          maxUses: codeData.maxUses,
          remaining: codeData.maxUses - codeData.uses,
          expiresAt: codeData.expiresAt.toISOString(),
        };
      } catch (error) {
        console.error("Referral stats error:", error);
        return {
          found: false,
          uses: 0,
          maxUses: 0,
          remaining: 0,
          expiresAt: null,
        };
      }
    }),
});
