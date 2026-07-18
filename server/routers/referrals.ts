/**
 * Referral Code Validation Router
 * Handles server-side validation of referral codes with database persistence
 */

import { router, publicProcedure } from "@/server/_core/trpc";
import { z } from "zod";
import { db } from "@/server/db";
import { referralCodes } from "@/drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { checkFraud, logRedemptionAttempt } from "@/server/services/fraud-detection";

export const referralRouter = router({
  /**
   * Validate a referral code
   */
  validateCode: publicProcedure
    .input(z.object({ code: z.string().min(5).max(20), userId: z.number(), ipAddress: z.string().optional(), deviceId: z.string().optional() }))
    .mutation(async ({ input }) => {
      try {
        const codeUpper = input.code.toUpperCase().trim();
        
        // Check for fraud patterns
        const fraudCheck = await checkFraud({
          userId: input.userId,
          code: codeUpper,
          ipAddress: input.ipAddress,
          deviceId: input.deviceId,
        });

        if (fraudCheck.shouldBlock) {
          await logRedemptionAttempt({
            userId: input.userId,
            code: codeUpper,
            ipAddress: input.ipAddress,
            deviceId: input.deviceId,
            success: false,
            failureReason: "Fraud detected",
          });
          return {
            valid: false,
            message: "This account has been flagged for suspicious activity. Please contact support.",
            freeDaysReward: 0,
          };
        }
        
        // Find code in database
        const codeData = await db
          .select()
          .from(referralCodes)
          .where(eq(referralCodes.code, codeUpper))
          .limit(1);

        if (codeData.length === 0) {
          return {
            valid: false,
            message: "Invalid referral code",
            freeDaysReward: 0,
          };
        }

        const code = codeData[0];

        // Check if code has expired
        if (new Date() > code.expiresAt) {
          return {
            valid: false,
            message: "Referral code has expired",
            freeDaysReward: 0,
          };
        }

        // Check if code has reached max uses
        if (code.uses >= code.maxUses) {
          return {
            valid: false,
            message: "Referral code has reached maximum uses",
            freeDaysReward: 0,
          };
        }

        // Code is valid - increment use count
        await db
          .update(referralCodes)
          .set({ uses: code.uses + 1 })
          .where(eq(referralCodes.id, code.id));

        // Log successful redemption
        await logRedemptionAttempt({
          userId: input.userId,
          code: codeUpper,
          ipAddress: input.ipAddress,
          deviceId: input.deviceId,
          success: true,
        });

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
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        // Generate unique code
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const code = `${timestamp}${random}`;

        // Store code in database
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
        
        await db.insert(referralCodes).values({
          code,
          userId: input.userId,
          uses: 0,
          maxUses: 999,
          expiresAt,
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
        const codeData = await db
          .select()
          .from(referralCodes)
          .where(eq(referralCodes.code, input.code.toUpperCase()))
          .limit(1);

        if (codeData.length === 0) {
          return {
            found: false,
            uses: 0,
            maxUses: 0,
            remaining: 0,
            expiresAt: null,
          };
        }

        const code = codeData[0];
        return {
          found: true,
          uses: code.uses,
          maxUses: code.maxUses,
          remaining: code.maxUses - code.uses,
          expiresAt: code.expiresAt.toISOString(),
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

  /**
   * Get user's referral codes
   */
  getUserCodes: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      try {
        const codes = await db
          .select()
          .from(referralCodes)
          .where(eq(referralCodes.userId, input.userId));

        return {
          success: true,
          codes: codes.map((c) => ({
            code: c.code,
            uses: c.uses,
            maxUses: c.maxUses,
            remaining: c.maxUses - c.uses,
            expiresAt: c.expiresAt.toISOString(),
            createdAt: c.createdAt.toISOString(),
          })),
        };
      } catch (error) {
        console.error("Get user codes error:", error);
        return {
          success: false,
          codes: [],
        };
      }
    }),
});
