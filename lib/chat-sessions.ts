/**
 * Chat Session Persistence Layer
 *
 * Each AI Tutor conversation is stored as a named ChatSession.
 * Sessions persist across app restarts so students can resume any past chat.
 *
 * Storage layout (AsyncStorage):
 *   @tutorsnap/chatSessions/index  → string[]  (ordered list of session IDs, newest first)
 *   @tutorsnap/chatSessions/pins   → string[]  (up to 3 pinned session IDs)
 *   @tutorsnap/chatSessions/<id>   → ChatSession JSON
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatMessage } from "@/shared/types";
import { pushChatSession as cloudPushSession, deleteChatSessionFromCloud } from "@/lib/cloud-sync";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;           // Auto-generated from first user message, editable
  subject: string | null;  // Subject focus (SubjectId or null)
  gradeLevel: string | null; // Student's grade/level for AI response adaptation
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  messageCount: number;    // Cached for list display
  tags: string[];          // User-defined tags (e.g. "Exam Prep", "Homework")
  reactions?: Record<string, string>; // msgId -> emoji reaction
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  subject: string | null;
  gradeLevel: string | null; // Grade/level for this session
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  preview: string;         // Last AI message snippet
  pinned: boolean;         // Whether this session is pinned to the top
  tags: string[];          // User-defined tags
  topReactions: string[];  // Up to 3 most-used emoji reactions in this session
  diagramCount: number;    // Number of Mermaid diagram blocks in AI messages
  flashcardCount: number;  // Number of flashcard blocks in AI messages
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INDEX_KEY = "@tutorsnap/chatSessions/index";
const PINS_KEY = "@tutorsnap/chatSessions/pins";
const SESSION_KEY = (id: string) => `@tutorsnap/chatSessions/${id}`;
const MAX_MESSAGES_PER_SESSION = 200;
const MAX_SESSIONS = 100;
export const MAX_PINNED = 3;

// ─── ID Generation ────────────────────────────────────────────────────────────

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Title Generation ─────────────────────────────────────────────────────────

export function generateSessionTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim();
  if (trimmed.length <= 40) return trimmed;
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

// ─── Pins Operations ──────────────────────────────────────────────────────────

export async function readPins(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PINS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function writePins(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PINS_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

/** Pin a session. Returns false if already at MAX_PINNED and this session is not already pinned. */
export async function pinSession(id: string): Promise<boolean> {
  const pins = await readPins();
  if (pins.includes(id)) return true; // already pinned
  if (pins.length >= MAX_PINNED) return false; // limit reached
  await writePins([id, ...pins]);
  return true;
}

/** Unpin a session. */
export async function unpinSession(id: string): Promise<void> {
  const pins = await readPins();
  await writePins(pins.filter((p) => p !== id));
}

/** Toggle pin state. Returns the new pinned state, or null if pin limit reached. */
export async function togglePin(id: string): Promise<boolean | null> {
  const pins = await readPins();
  if (pins.includes(id)) {
    await writePins(pins.filter((p) => p !== id));
    return false;
  }
  if (pins.length >= MAX_PINNED) return null; // limit reached
  await writePins([id, ...pins]);
  return true;
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
    gradeLevel: null,
    messages: [],
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    tags: [],
  };
  await saveSession(session);
  return session;
}

/** Persist a session to storage and update the index.
 *
 * @param session  The session to save.
 * @param limit    Optional user-configured max sessions (from TutorSettings.maxSessions).
 *                 When provided, sessions beyond this limit are pruned from storage.
 *                 Pinned sessions are never pruned.
 */
export async function saveSession(session: ChatSession, limit?: number): Promise<void> {
  const trimmed: ChatSession = {
    ...session,
    messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
    messageCount: session.messages.length,
    updatedAt: Date.now(),
  };

  try {
    await AsyncStorage.setItem(SESSION_KEY(session.id), JSON.stringify(trimmed));
  } catch { return; }

  const index = await readIndex();
  const filtered = index.filter((id) => id !== session.id);
  const effectiveLimit = limit && limit > 0 && limit < MAX_SESSIONS ? limit : MAX_SESSIONS;
  const pins = await readPins();

  // Build the candidate list: current session first, then the rest
  const candidates = [session.id, ...filtered];

  // Separate pinned from unpinned so pins are never evicted
  const pinned = candidates.filter((id) => pins.includes(id));
  const unpinned = candidates.filter((id) => !pins.includes(id));

  // Trim only unpinned sessions to fit within the limit (reserve slots for pinned)
  const unpinnedLimit = Math.max(0, effectiveLimit - pinned.length);
  const keptUnpinned = unpinned.slice(0, unpinnedLimit);
  const pruned = unpinned.slice(unpinnedLimit);

  // Rebuild index: pinned always first, then kept unpinned
  const newIndex = [...pinned, ...keptUnpinned];

  // Fire-and-forget: delete pruned (non-pinned) session keys from storage
  if (pruned.length > 0) {
    Promise.all(pruned.map((id) => AsyncStorage.removeItem(SESSION_KEY(id)))).catch(() => {});
  }

  await writeIndex(newIndex);
  // Mirror to cloud (fire-and-forget)
  cloudPushSession({
    sessionId: trimmed.id,
    title: trimmed.title,
    subject: trimmed.subject,
    gradeLevel: trimmed.gradeLevel,
    messagesJson: JSON.stringify(trimmed.messages),
    tags: (trimmed.tags ?? []).join(","),
    pinned: pins.includes(trimmed.id),
    messageCount: trimmed.messageCount,
    sessionCreatedAt: trimmed.createdAt,
    sessionUpdatedAt: trimmed.updatedAt,
  }).catch(() => {});
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

/** Delete a session and remove it from the index and pins. */
export async function deleteSession(id: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY(id));
  } catch { /* ignore */ }
  const index = await readIndex();
  await writeIndex(index.filter((sid) => sid !== id));
  // Also remove from pins if present
  await unpinSession(id);
  // Mirror to cloud (fire-and-forget)
  deleteChatSessionFromCloud(id).catch(() => {});
}

/** Rename a session title. */
export async function renameSession(id: string, title: string): Promise<void> {
  const session = await loadSession(id);
  if (!session) return;
  // Preserve updatedAt — don't bump it just for a rename
  const renamed: ChatSession = { ...session, title: title.trim() || "Chat" };
  try {
    await AsyncStorage.setItem(SESSION_KEY(id), JSON.stringify(renamed));
  } catch { /* ignore */ }
}

// ─── List Operations ──────────────────────────────────────────────────────────

/** Load all session summaries (no full message arrays) for the history list.
 *  Pinned sessions are sorted to the top, then newest-first for the rest. */
export async function listSessionSummaries(): Promise<ChatSessionSummary[]> {
  const [index, pins] = await Promise.all([readIndex(), readPins()]);
  if (index.length === 0) return [];

  const keys = index.map(SESSION_KEY);
  let pairs: readonly [string, string | null][];
  try {
    pairs = await AsyncStorage.multiGet(keys);
  } catch {
    return [];
  }

  const pinSet = new Set(pins);
  const summaries: ChatSessionSummary[] = [];
  for (const [, raw] of pairs) {
    if (!raw) continue;
    try {
      const s = JSON.parse(raw) as ChatSession;
      const lastAI = [...s.messages].reverse().find((m) => m.role === "assistant");
      const preview = lastAI
        ? lastAI.content.replace(/[#*_`~\[\]]/g, "").slice(0, 80).trim()
        : "No messages yet";
      // Compute top 3 reactions by frequency
      const reactionCounts: Record<string, number> = {};
      if (s.reactions) {
        for (const emoji of Object.values(s.reactions)) {
          reactionCounts[emoji] = (reactionCounts[emoji] ?? 0) + 1;
        }
      }
      const topReactions = Object.entries(reactionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emoji]) => emoji);
      // Count diagrams and flashcards in AI messages
      let diagramCount = 0;
      let flashcardCount = 0;
      for (const m of s.messages) {
        if (m.role !== 'assistant') continue;
        const mermaidMatches = m.content.match(/```mermaid/gi);
        if (mermaidMatches) diagramCount += mermaidMatches.length;
        const flashcardMatches = m.content.match(/:::flashcard/gi);
        if (flashcardMatches) flashcardCount += flashcardMatches.length;
      }
      summaries.push({
        id: s.id,
        title: s.title,
        subject: s.subject,
        gradeLevel: s.gradeLevel ?? null,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messageCount,
        preview,
        pinned: pinSet.has(s.id),
        tags: s.tags ?? [],
        topReactions,
        diagramCount,
        flashcardCount,
      });
    } catch { /* skip malformed */ }
  }

  // Pinned first (in pin order), then newest-first for unpinned
  const pinned = pins
    .map((pid) => summaries.find((s) => s.id === pid))
    .filter((s): s is ChatSessionSummary => !!s);
  const unpinned = summaries
    .filter((s) => !pinSet.has(s.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return [...pinned, ...unpinned];
}

/** Delete all sessions and clear pins. */
export async function clearAllSessions(): Promise<void> {
  const index = await readIndex();
  const keys = index.map(SESSION_KEY);
  try {
    await AsyncStorage.multiRemove(keys);
  } catch { /* ignore */ }
  await writeIndex([]);
  await writePins([]);
}

// ─── Migration Helper ─────────────────────────────────────────────────────────

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
          gradeLevel: null,
          messages,
          createdAt: messages[0]?.timestamp ?? Date.now(),
          updatedAt: messages[messages.length - 1]?.timestamp ?? Date.now(),
          messageCount: messages.length,
          tags: [],
        };
        await saveSession(session);
      }
    }

    await AsyncStorage.setItem(MIGRATION_DONE_KEY, "1");
  } catch { /* ignore migration errors */ }
}

// ─── Tag Management ───────────────────────────────────────────────────────────

/** Update the tags on a session. Tags are trimmed, deduplicated, max 5 per session. */
export async function updateSessionTags(sessionId: string, tags: string[]): Promise<void> {
  const session = await loadSession(sessionId);
  if (!session) return;
  const cleaned = [...new Set(tags.map((t) => t.trim()).filter(Boolean))].slice(0, 5);
  await saveSession({ ...session, tags: cleaned });
}

/** Collect all unique tags across all sessions, sorted alphabetically. */
export async function getAllTags(): Promise<string[]> {
  const index = await readIndex();
  const tagSet = new Set<string>();
  const pairs = await AsyncStorage.multiGet(index.map(SESSION_KEY));
  for (const [, raw] of pairs) {
    if (!raw) continue;
    try {
      const s = JSON.parse(raw) as ChatSession;
      for (const tag of s.tags ?? []) tagSet.add(tag);
    } catch { /* skip */ }
  }
  return [...tagSet].sort((a, b) => a.localeCompare(b));
}
