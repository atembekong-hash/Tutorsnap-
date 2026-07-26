/**
 * E2E Cloud Sync Test Script
 * Run with: pnpm tsx scripts/e2e-cloud-sync.ts
 *
 * Simulates the full reinstall scenario:
 *   1. Sign in via email OTP
 *   2. Push solve history, chat sessions, progress, bookmarks, notes
 *   3. Simulate reinstall (data cleared from device)
 *   4. Call pullAll — verify all data is restored
 */

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../server/routers";

const API_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:3000";
const TEST_EMAIL = "cloudsync-e2e@tutorsnap.test";

async function getToken(): Promise<string | null> {
  // Send OTP
  const sendRes = await fetch(`${API_BASE}/api/trpc/emailAuth.sendOtp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { email: TEST_EMAIL, purpose: "login" } }),
  });
  const sendData = await sendRes.json() as { result?: { data?: { json?: { devCode?: string } } } };
  const devCode = sendData?.result?.data?.json?.devCode;
  if (!devCode) {
    console.error("No devCode in response:", JSON.stringify(sendData).slice(0, 300));
    return null;
  }
  console.log("✓ Got devCode:", devCode);

  // Verify OTP
  const verifyRes = await fetch(`${API_BASE}/api/trpc/emailAuth.verifyOtp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { email: TEST_EMAIL, code: devCode, purpose: "login" } }),
  });
  const verifyData = await verifyRes.json() as { result?: { data?: { json?: { token?: string } } } };
  const token = verifyData?.result?.data?.json?.token;
  if (!token) {
    console.error("No token in response:", JSON.stringify(verifyData).slice(0, 300));
    return null;
  }
  console.log("✓ Got session token:", token.slice(0, 20) + "...");
  return token;
}

async function main() {
  console.log("=== Cloud Sync E2E Test ===\n");

  const token = await getToken();
  if (!token) {
    console.error("FAILED: Could not obtain session token");
    process.exit(1);
  }

  const client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${API_BASE}/api/trpc`,
        transformer: superjson,
        headers: () => ({ Authorization: `Bearer ${token}` }),
      }),
    ],
  });

  const now = Date.now();
  const sessionId = `e2e-session-${now}`;
  const bookmarkId = `e2e-bm-${now}`;
  const noteId = `e2e-note-${now}`;

  // ── Phase 1: Push all data ─────────────────────────────────────────────────
  console.log("\n--- Phase 1: Pushing data to server ---");

  const r1 = await client.cloudSync.pushSolveHistory.mutate({
    items: [{ problem: "E2E: What is 2+2?", answer: "4", subject: "arithmetic", solvedAt: now - 1000 }],
  });
  console.log("pushSolveHistory:", r1.ok ? "✓ OK" : "✗ FAILED");

  const r2 = await client.cloudSync.pushChatSession.mutate({
    sessionId,
    title: "E2E Test Session",
    subject: "algebra",
    messagesJson: JSON.stringify([{ id: "m1", role: "user", content: "Hello E2E", timestamp: now }]),
    messageCount: 1,
    sessionCreatedAt: now - 2000,
    sessionUpdatedAt: now - 1000,
  });
  console.log("pushChatSession:", r2.ok ? "✓ OK" : "✗ FAILED");

  const r3 = await client.cloudSync.pushProgress.mutate({
    progressJson: JSON.stringify({
      streak: { currentStreak: 7, longestStreak: 14, totalSolved: 99, todaySolved: 3, dailyGoal: 3, lastSolvedDate: "2026-07-25" },
      subjectCounts: { arithmetic: 20, algebra: 10 },
      weeklyActivity: [1, 1, 1, 0, 1, 1, 1],
    }),
  });
  console.log("pushProgress:", r3.ok ? "✓ OK" : "✗ FAILED");

  const r4 = await client.cloudSync.pushBookmarks.mutate({
    bookmarks: [{
      bookmarkId,
      itemJson: JSON.stringify({ id: bookmarkId, problem: "E2E bookmark problem", answer: "42", subject: "arithmetic", steps: [], solvedAt: now }),
      subject: "arithmetic",
    }],
  });
  console.log("pushBookmarks:", r4.ok ? "✓ OK" : "✗ FAILED");

  const r5 = await client.cloudSync.pushNotes.mutate({
    notes: [{ noteId, noteJson: JSON.stringify({ id: noteId, content: "E2E test note content", savedAt: now }) }],
  });
  console.log("pushNotes:", r5.ok ? "✓ OK" : "✗ FAILED");

  // ── Phase 2: Simulate reinstall ────────────────────────────────────────────
  console.log("\n--- Phase 2: Simulating reinstall (local data wiped) ---");
  console.log("(In a real reinstall, AsyncStorage would be empty. We call pullAll to restore.)");

  // ── Phase 3: Pull all and verify ──────────────────────────────────────────
  console.log("\n--- Phase 3: Pulling all data from server ---");
  const data = await client.cloudSync.pullAll.query();

  console.log("solveHistory count:", data.solveHistory.length);
  console.log("chatSessions count:", data.chatSessions.length);
  console.log("progressJson present:", !!data.progressJson);
  console.log("bookmarks count:", data.bookmarks.length);
  console.log("notes count:", data.notes.length);

  // ── Phase 4: Verify ────────────────────────────────────────────────────────
  console.log("\n--- Phase 4: Verification ---");

  const ourSolve = data.solveHistory.find((s) => s.problem === "E2E: What is 2+2?");
  const ourSession = data.chatSessions.find((s) => s.sessionId === sessionId);
  const ourBookmark = data.bookmarks.find((b) => b.bookmarkId === bookmarkId);
  const ourNote = data.notes.find((n) => n.noteId === noteId);
  const progress = data.progressJson ? JSON.parse(data.progressJson) : null;

  const checks = [
    { name: "Solve history restored", pass: !!ourSolve && ourSolve.answer === "4" },
    { name: "Chat session restored", pass: !!ourSession && ourSession.title === "E2E Test Session" },
    { name: "Progress restored (streak=7)", pass: progress?.streak?.currentStreak === 7 },
    { name: "Bookmark restored", pass: !!ourBookmark },
    { name: "Note restored", pass: !!ourNote },
  ];

  let allPassed = true;
  for (const check of checks) {
    console.log(check.pass ? `  ✓ ${check.name}` : `  ✗ ${check.name}`);
    if (!check.pass) allPassed = false;
  }

  // Clean up test session
  await client.cloudSync.deleteChatSession.mutate({ sessionId });
  console.log("\n✓ Cleaned up test session");

  console.log("\n=== RESULT:", allPassed ? "ALL TESTS PASSED ✓" : "SOME TESTS FAILED ✗", "===");
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("E2E test crashed:", err);
  process.exit(1);
});
