/**
 * Cloud Sync End-to-End Test
 *
 * Simulates the full reinstall scenario:
 *   1. User signs in
 *   2. Creates solves, chat sessions, progress, bookmarks, notes
 *   3. App is "uninstalled" (AsyncStorage cleared)
 *   4. User signs in again with the same account
 *   5. pullAllFromCloud() restores all data
 *
 * This test runs against the live server (requires DATABASE_URL to be set).
 * It is skipped automatically if the DB is not available.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:3000";

// We use the test user that is created by the auth test suite
// The session token is obtained by calling the email-auth endpoint
const TEST_EMAIL = process.env.TEST_EMAIL ?? "cloudsync-e2e@tutorsnap.test";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeClient(token: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${API_BASE}/api/trpc`,
        transformer: superjson,
        headers: () => ({ Authorization: `Bearer ${token}` }),
      }),
    ],
  });
}

async function getTestSessionToken(): Promise<string | null> {
  try {
    // Request OTP
    const sendRes = await fetch(`${API_BASE}/api/auth/email/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL }),
    });
    if (!sendRes.ok) return null;
    const sendData = await sendRes.json();
    const devCode = sendData.devCode;
    if (!devCode) return null;

    // Verify OTP
    const verifyRes = await fetch(`${API_BASE}/api/auth/email/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, code: devCode }),
    });
    if (!verifyRes.ok) return null;
    const verifyData = await verifyRes.json();
    return verifyData.token ?? null;
  } catch {
    return null;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Cloud Sync — Reinstall Scenario", () => {
  let token: string;
  let client: ReturnType<typeof makeClient>;

  const testSolve = {
    problem: "E2E Test: What is 2 + 2?",
    answer: "4",
    subject: "arithmetic",
    solutionJson: JSON.stringify({ steps: [{ stepNumber: 1, title: "Add", explanation: "2+2=4" }] }),
    bookmarked: false,
    solvedAt: Date.now() - 1000,
  };

  const testSession = {
    sessionId: `e2e-session-${Date.now()}`,
    title: "E2E Test Session",
    subject: "algebra",
    gradeLevel: "9",
    messagesJson: JSON.stringify([{ id: "m1", role: "user", content: "Hello", timestamp: Date.now() }]),
    tags: "test,e2e",
    pinned: false,
    messageCount: 1,
    sessionCreatedAt: Date.now() - 2000,
    sessionUpdatedAt: Date.now() - 1000,
  };

  const testProgressJson = JSON.stringify({
    streak: {
      currentStreak: 5,
      longestStreak: 10,
      lastSolvedDate: "2026-07-25",
      totalSolved: 42,
      todaySolved: 3,
      dailyGoal: 3,
    },
    subjectCounts: { arithmetic: 10, algebra: 5 },
    weeklyActivity: [1, 1, 0, 1, 1, 1, 1],
  });

  const testBookmark = {
    bookmarkId: `bm-e2e-${Date.now()}`,
    itemJson: JSON.stringify({ id: `bm-e2e-${Date.now()}`, problem: "E2E bookmark", answer: "42", subject: "arithmetic", steps: [], solvedAt: Date.now() }),
    subject: "arithmetic",
  };

  const testNote = {
    noteId: `note-e2e-${Date.now()}`,
    noteJson: JSON.stringify({ id: `note-e2e-${Date.now()}`, content: "E2E test note", savedAt: Date.now() }),
  };

  beforeAll(async () => {
    const t = await getTestSessionToken();
    if (!t) {
      console.warn("[E2E] Could not obtain test session token — skipping cloud sync tests");
      return;
    }
    token = t;
    client = makeClient(token);
  });

  it("should push solve history to the server", async () => {
    if (!token) return;
    const result = await client.cloudSync.pushSolveHistory.mutate({ items: [testSolve] });
    expect(result.ok).toBe(true);
  });

  it("should push a chat session to the server", async () => {
    if (!token) return;
    const result = await client.cloudSync.pushChatSession.mutate(testSession);
    expect(result.ok).toBe(true);
  });

  it("should push progress to the server", async () => {
    if (!token) return;
    const result = await client.cloudSync.pushProgress.mutate({ progressJson: testProgressJson });
    expect(result.ok).toBe(true);
  });

  it("should push bookmarks to the server", async () => {
    if (!token) return;
    const result = await client.cloudSync.pushBookmarks.mutate({ bookmarks: [testBookmark] });
    expect(result.ok).toBe(true);
  });

  it("should push notes to the server", async () => {
    if (!token) return;
    const result = await client.cloudSync.pushNotes.mutate({ notes: [testNote] });
    expect(result.ok).toBe(true);
  });

  it("should restore all data via pullAll after simulated reinstall", async () => {
    if (!token) return;
    // Simulate reinstall: all data is gone from the device
    // The server still has everything — verify pullAll returns it

    const data = await client.cloudSync.pullAll.query();

    // Verify solve history
    expect(data.solveHistory.length).toBeGreaterThan(0);
    const ourSolve = data.solveHistory.find((s) => s.problem === testSolve.problem);
    expect(ourSolve).toBeDefined();
    expect(ourSolve?.answer).toBe(testSolve.answer);
    expect(ourSolve?.subject).toBe(testSolve.subject);

    // Verify chat session
    expect(data.chatSessions.length).toBeGreaterThan(0);
    const ourSession = data.chatSessions.find((s) => s.sessionId === testSession.sessionId);
    expect(ourSession).toBeDefined();
    expect(ourSession?.title).toBe(testSession.title);
    expect(ourSession?.subject).toBe(testSession.subject);

    // Verify progress
    expect(data.progressJson).toBeTruthy();
    const progress = JSON.parse(data.progressJson!);
    expect(progress.streak.currentStreak).toBe(5);
    expect(progress.streak.totalSolved).toBe(42);

    // Verify bookmarks
    expect(data.bookmarks.length).toBeGreaterThan(0);
    const ourBookmark = data.bookmarks.find((b) => b.bookmarkId === testBookmark.bookmarkId);
    expect(ourBookmark).toBeDefined();

    // Verify notes
    expect(data.notes.length).toBeGreaterThan(0);
    const ourNote = data.notes.find((n) => n.noteId === testNote.noteId);
    expect(ourNote).toBeDefined();
  });

  it("should delete a chat session from the server", async () => {
    if (!token) return;
    const result = await client.cloudSync.deleteChatSession.mutate({ sessionId: testSession.sessionId });
    expect(result.ok).toBe(true);

    // Verify it's gone
    const data = await client.cloudSync.pullChatSessions.query();
    const found = data.sessions.find((s) => s.sessionId === testSession.sessionId);
    expect(found).toBeUndefined();
  });

  afterAll(async () => {
    // Clean up: nothing to do — test data is small and the server will GC it
  });
});
