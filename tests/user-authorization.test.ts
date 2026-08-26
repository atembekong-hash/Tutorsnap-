import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      ip: "203.0.113.10",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("user-scoped authorization", () => {
  it("requires authentication for profile reads and writes", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());

    await expect(caller.oauth.getProfile()).rejects.toThrow();
    await expect(caller.oauth.updateProfile({ name: "Attacker" })).rejects.toThrow();
  });

  it("requires authentication for referral ownership operations", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());

    await expect(caller.referral.generateCode()).rejects.toThrow();
    await expect(caller.referral.getUserCodes()).rejects.toThrow();
    await expect(caller.referral.validateCode({ code: "SAMPLE-CODE" })).rejects.toThrow();
  });

  it("requires authentication for AI, voice, and feedback operations", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());

    await expect(caller.academic.studyTip({ subject: "algebra" })).rejects.toThrow();
    await expect(caller.academic.chat({ messages: [{ role: "user", content: "Help" }] })).rejects.toThrow();
    await expect(caller.voice.transcribe({ audioUrl: "https://api.example.com/manus-storage/voice/1/audio.m4a" })).rejects.toThrow();
    await expect(caller.aire.logFeedback({ difficulty: 2, rating: 0 })).rejects.toThrow();
  });
});
