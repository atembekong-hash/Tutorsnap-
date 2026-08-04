import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return {
    ...actual,
    getDb: getDbMock,
  };
});

import { appRouter } from "../server/routers";

function createNonPremiumDb() {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: async () => [],
          }),
        }),
      }),
    }),
  } as any;
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "email:nonpremium@tutorsnap.test",
      email: "nonpremium@tutorsnap.test",
      name: "Non Premium Learner",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      appearanceSettings: null,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("academic premium error codes", () => {
  it.each([
    [
      "solve",
      (caller: ReturnType<typeof appRouter.createCaller>) =>
        caller.academic.solve({
          problem: "What is 2 + 2?",
          subject: "mathematics",
          gradeLevel: "Grade 5",
        }),
    ],
    [
      "solveFromImage",
      (caller: ReturnType<typeof appRouter.createCaller>) =>
        caller.academic.solveFromImage({
          imageBase64: "AA==",
          mimeType: "image/jpeg",
          subject: "mathematics",
          gradeLevel: "Grade 5",
        }),
    ],
  ])("preserves PAYMENT_REQUIRED for %s", async (_name, invoke) => {
    getDbMock.mockResolvedValue(createNonPremiumDb());
    const caller = appRouter.createCaller(createAuthContext());

    await expect(invoke(caller)).rejects.toMatchObject({
      code: "PAYMENT_REQUIRED",
      message: "Premium subscription required (10003)",
    });
  });
});
