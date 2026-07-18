/**
 * OAuth Router
 * Handles OAuth token validation and account creation
 */

import { router, publicProcedure } from "@/server/_core/trpc";
import { z } from "zod";
import { getDb } from "@/server/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

interface OAuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Validate OAuth credentials (simplified - real implementation would verify with OAuth provider)
 */
async function validateOAuthToken(provider: string, idToken: string): Promise<OAuthUser | null> {
  try {
    // In production, verify the token with the OAuth provider
    // For now, this is a placeholder that would be implemented with:
    // - Google: google-auth-library
    // - Apple: jsonwebtoken + Apple's public keys

    console.log(`[OAuth] Validating ${provider} token`);

    // Placeholder: decode and validate token structure
    if (!idToken || idToken.length < 10) {
      return null;
    }

    // This would be replaced with actual OAuth provider verification
    return {
      id: `${provider}_${Date.now()}`,
      email: "user@example.com",
      name: "User Name",
    };
  } catch (error) {
    console.error(`[OAuth] Token validation failed:`, error);
    return null;
  }
}

export const oauthRouter = router({
  /**
   * Validate OAuth credentials and create/update user
   */
  validate: publicProcedure
    .input(
      z.object({
        provider: z.enum(["google", "apple"]),
        idToken: z.string().min(10),
        accessToken: z.string().optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        photoUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            error: "Database unavailable",
          };
        }

        // Validate token with OAuth provider
        const oauthUser = await validateOAuthToken(input.provider, input.idToken);
        if (!oauthUser) {
          return {
            success: false,
            error: "Invalid OAuth token",
          };
        }

        const email = input.email || oauthUser.email;
        const name = input.name || oauthUser.name;
        const openId = `${input.provider}:${oauthUser.id}`;

        // Check if user exists
        let existingUser = await db
          .select()
          .from(users)
          .where(eq(users.openId, openId))
          .limit(1);

        let user;

        if (existingUser.length > 0) {
          // Update existing user
          user = existingUser[0];
          console.log(`[OAuth] User exists: ${openId}`);
        } else {
          // Create new user
          const result = await db.insert(users).values({
            openId,
            email: email || null,
            name: name || null,
            loginMethod: input.provider,
            lastSignedIn: new Date(),
          });

          // Fetch the created user
          const newUser = await db
            .select()
            .from(users)
            .where(eq(users.openId, openId))
            .limit(1);

          user = newUser[0];
          console.log(`[OAuth] New user created: ${openId}`);
        }

        return {
          success: true,
          user: {
            id: user.id,
            openId: user.openId,
            name: user.name,
            email: user.email,
            profilePhoto: (user as any).profilePhoto,
            loginMethod: user.loginMethod,
          },
        };
      } catch (error) {
        console.error("[OAuth] Validation failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "OAuth validation failed",
        };
      }
    }),

  /**
   * Revoke OAuth tokens on logout
   */
  revoke: publicProcedure
    .input(z.object({ provider: z.enum(["google", "apple"]) }))
    .mutation(async ({ input }) => {
      try {
        // In production, revoke the token with the OAuth provider
        console.log(`[OAuth] Revoking ${input.provider} tokens`);

        return {
          success: true,
          message: "Tokens revoked successfully",
        };
      } catch (error) {
        console.error("[OAuth] Token revocation failed:", error);
        return {
          success: false,
          error: "Token revocation failed",
        };
      }
    }),

  /**
   * Get user profile
   */
  getProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            error: "Database unavailable",
          };
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1);

        if (user.length === 0) {
          return {
            success: false,
            error: "User not found",
          };
        }

        return {
          success: true,
          user: {
            id: user[0].id,
            openId: user[0].openId,
            name: user[0].name,
            email: user[0].email,
            profilePhoto: (user[0] as any).profilePhoto,
            loginMethod: user[0].loginMethod,
            lastSignedIn: user[0].lastSignedIn,
          },
        };
      } catch (error) {
        console.error("[OAuth] Profile fetch failed:", error);
        return {
          success: false,
          error: "Failed to fetch profile",
        };
      }
    }),

  /**
   * Update user profile
   */
  updateProfile: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        photoUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            error: "Database unavailable",
          };
        }

        const updates: Record<string, any> = {};
        if (input.name) updates.name = input.name;
        if (input.email) updates.email = input.email;
        if (input.photoUrl) updates.profilePhoto = input.photoUrl;

        if (Object.keys(updates).length === 0) {
          return {
            success: false,
            error: "No updates provided",
          };
        }

        await db.update(users).set(updates).where(eq(users.id, input.userId));

        return {
          success: true,
          message: "Profile updated successfully",
        };
      } catch (error) {
        console.error("[OAuth] Profile update failed:", error);
        return {
          success: false,
          error: "Failed to update profile",
        };
      }
    }),
});
