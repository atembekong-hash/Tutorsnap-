import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getDb } from "../db.js";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

const loggingMiddleware = t.middleware(async (opts) => {
  const { path, type, input } = opts;
  // console.log('[tRPC Server Request]', {
    // timestamp: new Date().toISOString(),
    // type,
    // path,
    // input: JSON.stringify(input),
    // inputType: typeof input,
    // inputIsUndefined: input === undefined,
  // });
  try {
    const result = await opts.next();
    // console.log('[tRPC Server Response]', {
      // timestamp: new Date().toISOString(),
      // type,
      // path,
      // success: true,
    // });
    return result;
  } catch (error) {
    // console.log('[tRPC Server Error]', {
      // timestamp: new Date().toISOString(),
      // type,
      // path,
      // error: error instanceof Error ? error.message : String(error),
    // });
    throw error;
  }
});

export const router = t.router;
export const publicProcedure = t.procedure.use(loggingMiddleware);

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(loggingMiddleware).use(requireUser);

export const adminProcedure = t.procedure.use(loggingMiddleware).use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// ─── FIX-4 ───────────────────────────────────────────────────────────────────
export async function checkServerSidePremium(userId: number, db: Awaited<ReturnType<typeof getDb>> | null): Promise<boolean> {
  if (!db) return false;
  try {
    const { subscriptions } = await import("../../drizzle/schema.js");
    const { eq, desc } = await import("drizzle-orm");
    const rows = await (db as any).select({ status: subscriptions.status, expiresAt: subscriptions.expiresAt }).from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.updatedAt)).limit(1);
    if (!rows || rows.length === 0) return false;
    const { status, expiresAt } = rows[0];
    if (status === "active") return true;
    if (status === "cancelled" && expiresAt && new Date(expiresAt) > new Date()) return true;
    return false;
  } catch { return false; }
}
