/**
 * auth.logout — server-side logout mutation tests
 *
 * Tests the server-side auth.logout tRPC mutation which:
 * 1. Clears the session cookie with maxAge: -1 (immediate expiry)
 * 2. Returns { success: true }
 *
 * Client-side token revocation (Google SDK signOut, SecureStore clearing)
 * is handled in lib/_core/auth-enhanced.ts and is not testable in a Node
 * unit test (requires native modules). Those paths are covered by the
 * integration test on device.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "../server/_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "test@tutorsnapai.tech",
    name: "Test User",
    loginMethod: "google",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    appearanceSettings: null,
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as unknown as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie with correct options and returns success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    // Must return success
    expect(result).toEqual({ success: true });

    // Must clear exactly one cookie
    expect(clearedCookies).toHaveLength(1);

    // Must clear the correct cookie name
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);

    // Must use options that immediately expire the cookie and prevent JS access
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,       // Immediate expiry
      secure: true,     // HTTPS only
      sameSite: "none", // Required for cross-origin (mobile WebView + API)
      httpOnly: true,   // Not accessible via JavaScript
      path: "/",        // Global scope
    });
  });

  it("requires an authenticated user (protectedProcedure)", async () => {
    // Unauthenticated context — no user
    const unauthCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(unauthCtx);

    await expect(caller.auth.logout()).rejects.toThrow();
  });
});
