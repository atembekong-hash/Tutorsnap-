/**
 * Cloud Sync Library
 *
 * This module is the single source of truth for syncing user data between the
 * device (AsyncStorage) and the server (MySQL via tRPC).
 *
 * Architecture:
 *   - Every write path calls a "push" function here (fire-and-forget, non-fatal).
 *   - On sign-in, `pullAllFromCloud()` is called once to restore all data.
 *   - The server is the source of truth; local storage is the cache.
 *
 * Why this fixes the reinstall problem:
 *   - Before this fix, ALL user data lived only in AsyncStorage, which is
 *     wiped on uninstall. Now every write is mirrored to the server.
 *   - After reinstall + sign-in, `pullAllFromCloud()` restores everything.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import { getSessionToken } from "@/lib/_core/auth-enhanced";

// ─── tRPC client ──────────────────────────────────────────────────────────────

let _client: ReturnType<typeof createTRPCClient<AppRouter>> | null = null;

/**
 * Returns a tRPC client that reads the session token at call time.
 * We create a new client after sign-in so the token is always fresh.
 */
async function getClient(): Promise<ReturnType<typeof createTRPCClient<AppRouter>>> {
  if (_client) return _client;
  const token = await getSessionToken();
  _client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        transformer: superjson,
        headers: () => (token ? { Authorization: `Bearer ${token}` } : {}),
      }),
    ],
  });
  return _client;
}

/** Reset the cached client (call after sign-in so the new token is picked up). */
export function resetSyncClient(): void {
  _client = null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function isSignedIn(): Promise<boolean> {
  const token = await getSessionToken();
  return !!token;
}

// ─── Push: Solve History ──────────────────────────────────────────────────────

export async function pushSolve(item: {
  problem: string;
  answer?: string;
  subject?: string;
  solutionJson?: string;
  bookmarked?: boolean;
  solvedAt: number;
}): Promise<void> {
  try {
    if (!(await isSignedIn())) return;
    const client = await getClient();
    await client.cloudSync.pushSolveHistory.mutate({ items: [item] });
  } catch (err) {
    console.warn("[cloudSync] pushSolve failed (non-fatal):", err);
  }
}

export async function pushAllSolveHistory(): Promise<void> {
  try {
    if (!(await isSignedIn())) return;
    const raw = await AsyncStorage.getItem("math_history");
    if (!raw) return;
    const items = JSON.parse(raw) as Array<{
      problem?: string;
      answer?: string;
      subject?: string;
      timestamp?: number;
      bookmarked?: boolean;
      solution?: unknown;
    }>;
    if (!Array.isArray(items) || items.length === 0) return;
    const client = await getClient();
    await client.cloudSync.pushSolveHistory.mutate({
      items: items.map((i) => ({
        problem: i.problem ?? "",
        answer: i.answer ?? "",
        subject: i.subject ?? "",
        solutionJson: i.solution ? JSON.stringify(i.solution) : undefined,
        bookmarked: i.bookmarked ?? false,
        solvedAt: i.timestamp ?? Date.now(),
      })),
    });
  } catch (err) {
    console.warn("[cloudSync] pushAllSolveHistory failed (non-fatal):", err);
  }
}

// ─── Push: Chat Sessions ──────────────────────────────────────────────────────

export async function pushChatSession(session: {
  sessionId: string;
  title?: string;
  subject?: string | null;
  gradeLevel?: string | null;
  messagesJson: string;
  tags?: string;
  pinned?: boolean;
  messageCount?: number;
  sessionCreatedAt: number;
  sessionUpdatedAt: number;
}): Promise<void> {
  try {
    if (!(await isSignedIn())) return;
    const client = await getClient();
    await client.cloudSync.pushChatSession.mutate({
      sessionId: session.sessionId,
      title: session.title,
      subject: session.subject ?? undefined,
      gradeLevel: session.gradeLevel ?? undefined,
      messagesJson: session.messagesJson,
      tags: session.tags,
      pinned: session.pinned,
      messageCount: session.messageCount,
      sessionCreatedAt: session.sessionCreatedAt,
      sessionUpdatedAt: session.sessionUpdatedAt,
    });
  } catch (err) {
    console.warn("[cloudSync] pushChatSession failed (non-fatal):", err);
  }
}

export async function deleteChatSessionFromCloud(sessionId: string): Promise<void> {
  try {
    if (!(await isSignedIn())) return;
    const client = await getClient();
    await client.cloudSync.deleteChatSession.mutate({ sessionId });
  } catch (err) {
    console.warn("[cloudSync] deleteChatSession failed (non-fatal):", err);
  }
}

export async function pushAllChatSessions(): Promise<void> {
  try {
    if (!(await isSignedIn())) return;
    const indexRaw = await AsyncStorage.getItem("@tutorsnap/chatSessions/index");
    if (!indexRaw) return;
    const ids = JSON.parse(indexRaw) as string[];
    if (!Array.isArray(ids) || ids.length === 0) return;
    const client = await getClient();
    for (const id of ids.slice(0, 100)) {
      const sessionRaw = await AsyncStorage.getItem(`@tutorsnap/chatSessions/${id}`);
      if (!sessionRaw) continue;
      const session = JSON.parse(sessionRaw);
      await client.cloudSync.pushChatSession.mutate({
        sessionId: session.id ?? id,
        title: session.title,
        subject: session.subject,
        gradeLevel: session.gradeLevel,
        messagesJson: JSON.stringify(session.messages ?? []),
        tags: Array.isArray(session.tags) ? session.tags.join(",") : "",
        pinned: session.pinned ?? false,
        messageCount: session.messageCount ?? 0,
        sessionCreatedAt: session.createdAt ?? Date.now(),
        sessionUpdatedAt: session.updatedAt ?? Date.now(),
      });
    }
  } catch (err) {
    console.warn("[cloudSync] pushAllChatSessions failed (non-fatal):", err);
  }
}

// ─── Push: Progress ───────────────────────────────────────────────────────────

export async function pushProgress(progressJson: string): Promise<void> {
  try {
    if (!(await isSignedIn())) return;
    const client = await getClient();
    await client.cloudSync.pushProgress.mutate({ progressJson });
  } catch (err) {
    console.warn("[cloudSync] pushProgress failed (non-fatal):", err);
  }
}

// ─── Push: Bookmarks ─────────────────────────────────────────────────────────

export async function pushBookmarks(bookmarks: Array<{
  bookmarkId: string;
  itemJson: string;
  subject?: string;
}>): Promise<void> {
  try {
    if (!(await isSignedIn())) return;
    const client = await getClient();
    await client.cloudSync.pushBookmarks.mutate({ bookmarks });
  } catch (err) {
    console.warn("[cloudSync] pushBookmarks failed (non-fatal):", err);
  }
}

// ─── Push: Notes ─────────────────────────────────────────────────────────────

export async function pushNotes(notes: Array<{
  noteId: string;
  noteJson: string;
}>): Promise<void> {
  try {
    if (!(await isSignedIn())) return;
    const client = await getClient();
    await client.cloudSync.pushNotes.mutate({ notes });
  } catch (err) {
    console.warn("[cloudSync] pushNotes failed (non-fatal):", err);
  }
}

// ─── Pull All (called on sign-in) ─────────────────────────────────────────────

/**
 * Pull ALL user data from the server and write it to AsyncStorage.
 * Called once immediately after successful sign-in.
 */
export async function pullAllFromCloud(): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = await getClient();
    const data = await client.cloudSync.pullAll.query();

    // ── Restore solve history ──────────────────────────────────────────────
    if (data.solveHistory && data.solveHistory.length > 0) {
      const localRaw = await AsyncStorage.getItem("math_history");
      const localItems: Array<Record<string, unknown>> = localRaw ? JSON.parse(localRaw) : [];

      const serverItems = data.solveHistory.map((r) => ({
        problem: r.problem,
        answer: r.answer,
        subject: r.subject,
        solution: r.solutionJson ? (() => { try { return JSON.parse(r.solutionJson!); } catch { return null; } })() : null,
        bookmarked: r.bookmarked,
        timestamp: r.solvedAt,
        id: String(r.solvedAt),
      }));

      const merged = new Map<string, Record<string, unknown>>();
      for (const item of localItems) {
        const key = String(item.timestamp ?? item.id ?? Math.random());
        merged.set(key, item);
      }
      for (const item of serverItems) {
        merged.set(String(item.timestamp), item);
      }

      const sorted = Array.from(merged.values()).sort(
        (a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0)
      );
      await AsyncStorage.setItem("math_history", JSON.stringify(sorted.slice(0, 200)));
    }

    // ── Restore chat sessions ──────────────────────────────────────────────
    if (data.chatSessions && data.chatSessions.length > 0) {
      const localIndexRaw = await AsyncStorage.getItem("@tutorsnap/chatSessions/index");
      const localIds: string[] = localIndexRaw ? JSON.parse(localIndexRaw) : [];

      const serverIds: string[] = [];
      for (const s of data.chatSessions) {
        const sessionId = s.sessionId;
        serverIds.push(sessionId);
        const sessionObj = {
          id: sessionId,
          title: s.title,
          subject: s.subject,
          gradeLevel: s.gradeLevel,
          messages: (() => { try { return JSON.parse(s.messagesJson); } catch { return []; } })(),
          tags: s.tags ? s.tags.split(",").filter(Boolean) : [],
          pinned: s.pinned,
          messageCount: s.messageCount,
          createdAt: s.sessionCreatedAt,
          updatedAt: s.sessionUpdatedAt,
        };
        await AsyncStorage.setItem(`@tutorsnap/chatSessions/${sessionId}`, JSON.stringify(sessionObj));
      }

      const mergedIds = [...new Set([...serverIds, ...localIds])];
      await AsyncStorage.setItem("@tutorsnap/chatSessions/index", JSON.stringify(mergedIds));

      const pinnedIds = data.chatSessions.filter((s) => s.pinned).map((s) => s.sessionId);
      if (pinnedIds.length > 0) {
        await AsyncStorage.setItem("@tutorsnap/chatSessions/pins", JSON.stringify(pinnedIds));
      }
    }

    // ── Restore progress ──────────────────────────────────────────────────
    if (data.progressJson) {
      const localRaw = await AsyncStorage.getItem("math_progress");
      if (!localRaw) {
        await AsyncStorage.setItem("math_progress", data.progressJson);
      } else {
        try {
          const local = JSON.parse(localRaw);
          const server = JSON.parse(data.progressJson);
          const merged = {
            ...server,
            streak: {
              ...server.streak,
              currentStreak: Math.max(local.streak?.currentStreak ?? 0, server.streak?.currentStreak ?? 0),
              longestStreak: Math.max(local.streak?.longestStreak ?? 0, server.streak?.longestStreak ?? 0),
              totalSolved: Math.max(local.streak?.totalSolved ?? 0, server.streak?.totalSolved ?? 0),
              lastSolvedDate: local.streak?.lastSolvedDate ?? server.streak?.lastSolvedDate,
              todaySolved: Math.max(local.streak?.todaySolved ?? 0, server.streak?.todaySolved ?? 0),
              dailyGoal: local.streak?.dailyGoal ?? server.streak?.dailyGoal ?? 3,
            },
          };
          await AsyncStorage.setItem("math_progress", JSON.stringify(merged));
        } catch {
          await AsyncStorage.setItem("math_progress", data.progressJson);
        }
      }
    }

    // ── Restore bookmarks ─────────────────────────────────────────────────
    if (data.bookmarks && data.bookmarks.length > 0) {
      const localRaw = await AsyncStorage.getItem("math_bookmarks");
      const localItems: Array<Record<string, unknown>> = localRaw ? JSON.parse(localRaw) : [];

      const serverItems = data.bookmarks.map((b) => {
        try { return JSON.parse(b.itemJson); } catch { return null; }
      }).filter(Boolean) as Array<Record<string, unknown>>;

      const merged = new Map<string, Record<string, unknown>>();
      for (const item of localItems) {
        const key = String(item.id ?? item.timestamp ?? Math.random());
        merged.set(key, item);
      }
      for (const item of serverItems) {
        const key = String(item.id ?? item.timestamp ?? Math.random());
        merged.set(key, item);
      }

      await AsyncStorage.setItem("math_bookmarks", JSON.stringify(Array.from(merged.values()).slice(0, 200)));
    }

    // ── Restore notes ─────────────────────────────────────────────────────
    if (data.notes && data.notes.length > 0) {
      const serverNotes = data.notes.map((n) => {
        try { return JSON.parse(n.noteJson); } catch { return null; }
      }).filter(Boolean);

      if (serverNotes.length > 0) {
        await AsyncStorage.setItem("tutor_saved_notes", JSON.stringify(serverNotes));
      }
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[cloudSync] pullAllFromCloud failed:", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Upload all local data to the server.
 * Called once after sign-in (after pullAllFromCloud) to ensure any
 * offline data created before sign-in is also persisted.
 */
export async function pushAllLocalDataToCloud(): Promise<void> {
  try {
    if (!(await isSignedIn())) return;
    await Promise.allSettled([
      pushAllSolveHistory(),
      pushAllChatSessions(),
      _pushAllBookmarks(),
      _pushAllNotes(),
      _pushCurrentProgress(),
    ]);
  } catch (err) {
    console.warn("[cloudSync] pushAllLocalDataToCloud failed (non-fatal):", err);
  }
}

async function _pushAllBookmarks(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem("math_bookmarks");
    if (!raw) return;
    const items = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(items) || items.length === 0) return;
    await pushBookmarks(
      items.map((item) => ({
        bookmarkId: String(item.id ?? item.timestamp ?? Math.random()),
        itemJson: JSON.stringify(item),
        subject: typeof item.subject === "string" ? item.subject : undefined,
      }))
    );
  } catch (err) {
    console.warn("[cloudSync] _pushAllBookmarks failed (non-fatal):", err);
  }
}

async function _pushAllNotes(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem("tutor_saved_notes");
    if (!raw) return;
    const items = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(items) || items.length === 0) return;
    await pushNotes(
      items.map((item) => ({
        noteId: String(item.id ?? item.timestamp ?? Math.random()),
        noteJson: JSON.stringify(item),
      }))
    );
  } catch (err) {
    console.warn("[cloudSync] _pushAllNotes failed (non-fatal):", err);
  }
}

async function _pushCurrentProgress(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem("math_progress");
    if (!raw) return;
    await pushProgress(raw);
  } catch (err) {
    console.warn("[cloudSync] _pushCurrentProgress failed (non-fatal):", err);
  }
}
