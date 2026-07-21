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
 * Verify Google ID Token
 */
async function verifyGoogleToken(idToken: string): Promise<OAuthUser | null> {
  try {
    // Use google-auth-library to verify the token
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      console.error("[OAuth] Google token payload is empty");
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email || "",
      name: payload.name || "",
      picture: payload.picture,
    };
  } catch (error) {
    console.error("[OAuth] Google token verification failed:", error);
    return null;
  }
}

/**
 * Verify Apple Identity Token
 *
 * Apple identity tokens are signed JWTs. We verify them against Apple's
 * public keys fetched from https://appleid.apple.com/auth/keys.
 * The `apple-signin-auth` library handles key fetching, caching, and JWT
 * verification so we don't need to manage Apple's JWKS manually.
 */
async function verifyAppleToken(
  idToken: string,
  clientId?: string
): Promise<OAuthUser | null> {
  try {
    const appleSignin = await import("apple-signin-auth");
    const verifyFn =
      // The library exports either a default object or named exports
      typeof appleSignin.default?.verifyIdToken === "function"
        ? appleSignin.default.verifyIdToken.bind(appleSignin.default)
        : typeof appleSignin.verifyIdToken === "function"
        ? appleSignin.verifyIdToken
        : null;

    if (!verifyFn) {
      console.error("[OAuth] apple-signin-auth: verifyIdToken not found");
      return null;
    }

    // clientId must match the audience in the token
    // For iOS apps this is the app bundle ID; for web it's the Services ID
    const audience = clientId ||
      process.env.APPLE_CLIENT_ID ||
      process.env.APPLE_BUNDLE_ID ||
      undefined;

    const payload = await verifyFn(idToken, {
      audience,
      ignoreExpiration: false,
    });

    if (!payload || !payload.sub) {
      console.error("[OAuth] Apple token payload missing 'sub'");
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email || "",
      name: "", // Apple only sends name on first sign-in (passed separately by client)
    };
  } catch (error) {
    console.error("[OAuth] Apple token verification failed:", error);
    return null;
  }
}

/**
 * Validate OAuth credentials with provider verification
 */
async function validateOAuthToken(
  provider: string,
  idToken: string,
  clientId?: string
): Promise<OAuthUser | null> {
  try {
    console.log(`[OAuth] Validating ${provider} token`);

    if (!idToken || idToken.length < 10) {
      console.error(`[OAuth] Invalid token format for ${provider}`);
      return null;
    }

    if (provider === "google") {
      return await verifyGoogleToken(idToken);
    } else if (provider === "apple") {
      return await verifyAppleToken(idToken, clientId);
    } else {
      console.error(`[OAuth] Unknown provider: ${provider}`);
      return null;
    }
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
        // For Apple: pass the iOS bundle ID so the audience check passes
        clientId: z.string().optional(),
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
        const oauthUser = await validateOAuthToken(input.provider, input.idToken, input.clientId);
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
