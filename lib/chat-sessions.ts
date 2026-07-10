/**
 * Chat Session Persistence Layer
 *
 * Each AI Tutor conversation is stored as a named ChatSession.
 * Sessions persist across app restarts so students can resume any past chat.
 *
 * Storage layout (AsyncStorage):
 *   @tutorsnap/chatSessions/index  → string[]  (ordered list of session IDs, newest first)
 *   @tutorsnap/chatSessions/<id>   → ChatSession JSON
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatMessage } from "@/shared/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;           // Auto-generated from first user message, editable
  subject: string | null;  // Subject focus (SubjectId or null)
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  messageCount: number;    // Cached for list display
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  subject: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  preview: string;         // Last AI message snippet
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INDEX_KEY = "@tutorsnap/chatSessions/index";
const SESSION_KEY = (id: string) => `@tutorsnap/chatSessions/${id}`;
const MAX_MESSAGES_PER_SESSION = 200;
const MAX_SESSIONS = 100;

// ─── ID Generation ────────────────────────────────────────────────────────────

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Title Generation ─────────────────────────────────────────────────────────

export function generateSessionTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim();
  if (trimmed.length <= 40) return trimmed;
  // Truncate at word boundary
  const truncated = trimmed.slice(0, 40);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

// ─── Index Operations ─────────────────────────────────────────────────────────

async function readIndex(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function writeIndex(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────

/** Create a new empty session and add it to the index. */
export async function createSession(subject: string | null = null): Promise<ChatSession> {
  const id = generateSessionId();
  const now = Date.now();
  const session: ChatSession = {
    id,
    title: "New Chat",
    subject,
    messages: [],
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
  await saveSession(session);
  return session;
}

/** Persist a session to storage and update the index. */
export async function saveSession(session: ChatSession): Promise<void> {
  // Trim messages to cap
  const trimmed: ChatSession = {
    ...session,
    messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
    messageCount: session.messages.length,
    updatedAt: Date.now(),
  };

  try {
    await AsyncStorage.setItem(SESSION_KEY(session.id), JSON.stringify(trimmed));
  } catch { return; }

  // Update index — newest first
  const index = await readIndex();
  const filtered = index.filter((id) => id !== session.id);
  const newIndex = [session.id, ...filtered].slice(0, MAX_SESSIONS);
  await writeIndex(newIndex);
}

/** Load a single session by ID. Returns null if not found. */
export async function loadSession(id: string): Promise<ChatSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY(id));
    if (!raw) return null;
    return JSON.parse(raw) as ChatSession;
  } catch {
    return null;
  }
}

/** Delete a session and remove it from the index. */
export async function deleteSession(id: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY(id));
  } catch { /* ignore */ }
  const index = await readIndex();
  await writeIndex(index.filter((sid) => sid !== id));
}

/** Rename a session title. */
export async function renameSession(id: string, title: string): Promise<void> {
  const session = await loadSession(id);
  if (!session) return;
  await saveSession({ ...session, title: title.trim() || "Chat" });
}

// ─── List Operations ──────────────────────────────────────────────────────────

/** Load all session summaries (no full message arrays) for the history list. */
export async function listSessionSummaries(): Promise<ChatSessionSummary[]> {
  const index = await readIndex();
  if (index.length === 0) return [];

  const keys = index.map(SESSION_KEY);
  let pairs: readonly [string, string | null][];
  try {
    pairs = await AsyncStorage.multiGet(keys);
  } catch {
    return [];
  }

  const summaries: ChatSessionSummary[] = [];
  for (const [, raw] of pairs) {
    if (!raw) continue;
    try {
      const s = JSON.parse(raw) as ChatSession;
      // Find last AI message for preview
      const lastAI = [...s.messages].reverse().find((m) => m.role === "assistant");
      const preview = lastAI
        ? lastAI.content.replace(/[#*_`~\[\]]/g, "").slice(0, 80).trim()
        : "No messages yet";
      summaries.push({
        id: s.id,
        title: s.title,
        subject: s.subject,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messageCount,
        preview,
      });
    } catch { /* skip malformed */ }
  }

  // Sort newest first (index order is already newest first, but re-sort to be safe)
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Delete all sessions. */
export async function clearAllSessions(): Promise<void> {
  const index = await readIndex();
  const keys = index.map(SESSION_KEY);
  try {
    await AsyncStorage.multiRemove(keys);
  } catch { /* ignore */ }
  await writeIndex([]);
}

// ─── Migration Helper ─────────────────────────────────────────────────────────

/**
 * Migrate the old single-session chat history to the new multi-session format.
 * Called once on first launch of the new version.
 */
const OLD_CHAT_KEY = "@tutorsnap/chatHistory";
const MIGRATION_DONE_KEY = "@tutorsnap/chatSessionsMigrated";

export async function migrateOldChatHistory(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
    if (done) return;

    const raw = await AsyncStorage.getItem(OLD_CHAT_KEY);
    if (raw) {
      const messages = JSON.parse(raw) as ChatMessage[];
      const userMessages = messages.filter((m) => m.role === "user");
      if (userMessages.length > 0) {
        const firstUser = userMessages[0];
        const session: ChatSession = {
          id: generateSessionId(),
          title: generateSessionTitle(firstUser.content),
          subject: null,
          messages,
          createdAt: messages[0]?.timestamp ?? Date.now(),
          updatedAt: messages[messages.length - 1]?.timestamp ?? Date.now(),
          messageCount: messages.length,
        };
        await saveSession(session);
      }
    }

    await AsyncStorage.setItem(MIGRATION_DONE_KEY, "1");
  } catch { /* ignore migration errors */ }
}
