import { afterEach, describe, expect, it } from "vitest";

import type { TrpcContext } from "../server/_core/context";
import { classroomInternals } from "../server/routers/classroom";
import { appRouter } from "../server/routers";

const ORIGINAL_FLAG = process.env.CLASSROOM_MVP_ENABLED;

function context(authenticated: boolean): TrpcContext {
  const now = new Date();
  return {
    user: authenticated
      ? {
          id: 999_001,
          openId: "classroom-security-test",
          name: "Security Test",
          email: "security@example.test",
          loginMethod: "test",
          role: "user",
          createdAt: now,
          updatedAt: now,
          lastSignedIn: now,
          appearanceSettings: null,
        }
      : null,
    req: {
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

afterEach(() => {
  if (ORIGINAL_FLAG === undefined) delete process.env.CLASSROOM_MVP_ENABLED;
  else process.env.CLASSROOM_MVP_ENABLED = ORIGINAL_FLAG;
});

describe("Guided Classroom security primitives", () => {
  it("normalizes only presentation separators and preserves an eight-character code", () => {
    expect(classroomInternals.normalizeJoinCode(" abcd-23 45 ")).toBe(
      "ABCD2345",
    );
  });

  it("stores a one-way fixed-length hash instead of a raw join code", () => {
    const raw = "ABCD2345";
    const hashed = classroomInternals.hashJoinCode(raw);
    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
    expect(hashed).not.toContain(raw);
    expect(classroomInternals.hashJoinCode(raw)).toBe(hashed);
  });

  it("generates join codes only from the ambiguity-free alphabet", () => {
    const generated = new Set(
      Array.from({ length: 100 }, () => classroomInternals.generateJoinCode()),
    );
    expect(generated.size).toBeGreaterThan(90);
    for (const code of generated) {
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
    }
  });

  it("round-trips opaque cursors and rejects malformed cursors", () => {
    const cursor = classroomInternals.encodeCursor(12345);
    expect(cursor).not.toContain("12345");
    expect(classroomInternals.decodeCursor(cursor)).toBe(12345);
    expect(() => classroomInternals.decodeCursor("not-a-valid-id")).toThrow(
      "Invalid pagination cursor",
    );
  });

  it("fails closed when the feature flag is absent or false", () => {
    delete process.env.CLASSROOM_MVP_ENABLED;
    expect(classroomInternals.isClassroomEnabled()).toBe(false);
    process.env.CLASSROOM_MVP_ENABLED = "false";
    expect(classroomInternals.isClassroomEnabled()).toBe(false);
    process.env.CLASSROOM_MVP_ENABLED = "true";
    expect(classroomInternals.isClassroomEnabled()).toBe(true);
  });

  it("requires authentication even for the feature-status query", async () => {
    const caller = appRouter.createCaller(context(false));
    await expect(caller.classroom.status()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("returns status while disabled but blocks all Classroom data procedures before database access", async () => {
    process.env.CLASSROOM_MVP_ENABLED = "false";
    const caller = appRouter.createCaller(context(true));
    await expect(caller.classroom.status()).resolves.toEqual({
      enabled: false,
    });
    await expect(
      caller.classroom.create({
        name: "Blocked",
        subject: "algebra",
        gradeLevel: null,
      }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "Guided Classroom is temporarily unavailable.",
    });
  });
});
