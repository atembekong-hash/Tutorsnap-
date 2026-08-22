import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

const { getDbMock, invokeLLMMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  invokeLLMMock: vi.fn(),
}));

vi.mock("../server/db", async () => {
  const actual =
    await vi.importActual<typeof import("../server/db")>("../server/db");
  return {
    ...actual,
    getDb: getDbMock,
  };
});

vi.mock("../server/_core/llm", () => ({
  invokeLLM: invokeLLMMock,
}));

import { appRouter } from "../server/routers";

type Caller = ReturnType<typeof appRouter.createCaller>;

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

function createContext(authenticated: boolean): TrpcContext {
  return {
    user: authenticated
      ? {
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
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const premiumCalls: {
  name: string;
  invoke: (caller: Caller) => Promise<unknown>;
}[] = [
  {
    name: "solve",
    invoke: (caller) =>
      caller.academic.solve({
        problem: "What is 2 + 2?",
        subject: "mathematics",
        gradeLevel: "Grade 5",
      }),
  },
  {
    name: "solveExplanation",
    invoke: (caller) =>
      caller.academic.solveExplanation({
        problem: "What is 2 + 2?",
        correctAnswer: "B",
        selectedAnswer: "A",
        options: { A: "3", B: "4", C: "5", D: "6" },
        difficulty: "easy",
        subject: "mathematics",
        gradeLevel: "Grade 5",
      }),
  },
  {
    name: "solveFromImage",
    invoke: (caller) =>
      caller.academic.solveFromImage({
        imageBase64: "AA==",
        mimeType: "image/jpeg",
        subject: "mathematics",
        gradeLevel: "Grade 5",
      }),
  },
  {
    name: "generatePractice",
    invoke: (caller) =>
      caller.academic.generatePractice({
        subject: "mathematics",
        difficulty: "easy",
        gradeLevel: "Grade 5",
      }),
  },
  {
    name: "generateQuiz",
    invoke: (caller) =>
      caller.academic.generateQuiz({
        subject: "mathematics",
        difficulty: "easy",
        count: 3,
        gradeLevel: "Grade 5",
      }),
  },
];

describe("academic access contract", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    invokeLLMMock.mockReset();
    getDbMock.mockResolvedValue(createNonPremiumDb());
    invokeLLMMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              problem: "What is 2 + 2?",
              answer: "4",
              explanation: "4 is the sum of 2 and 2.",
              submissionReady: "B) 4",
              steps: [{ stepNumber: 1, title: "Add", explanation: "2 + 2 = 4", expression: "2 + 2 = 4" }],
              hints: [],
              questions: [{ id: "q1", problem: "What is 1 + 1?", options: { A: "1", B: "2", C: "3", D: "4" }, correctAnswer: "B", explanation: "1 + 1 = 2" }],
            }),
          },
        },
      ],
    });
  });

  it.each(premiumCalls)(
    "rejects anonymous access to $name",
    async ({ invoke }) => {
      const caller = appRouter.createCaller(createContext(false));

      await expect(invoke(caller)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      expect(getDbMock).not.toHaveBeenCalled();
    },
  );

  it.each(premiumCalls)(
    "allows authenticated non-premium access to core feature $name",
    async ({ invoke }) => {
      const caller = appRouter.createCaller(createContext(true));

      await expect(invoke(caller)).resolves.toBeDefined();
    },
  );
});
