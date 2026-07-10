/**
 * Problem Comments
 *
 * Stores short student comments per classroom problem ID in AsyncStorage.
 * Comments are local-only (no server sync) and keyed by problem ID.
 * Supports quoted replies via replyToId / replyToAuthor / replyToText fields.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const COMMENTS_KEY = "@tutorsnap/problem_comments";

export interface ProblemComment {
  id: string;
  problemId: string;
  author: string; // display name
  text: string;
  createdAt: string; // ISO
  // Optional reply fields
  replyToId?: string;
  replyToAuthor?: string;
  replyToText?: string; // snippet of the quoted comment (first 80 chars)
}

type CommentsMap = Record<string, ProblemComment[]>; // problemId → comments[]

async function getAll(): Promise<CommentsMap> {
  try {
    const raw = await AsyncStorage.getItem(COMMENTS_KEY);
    return raw ? (JSON.parse(raw) as CommentsMap) : {};
  } catch {
    return {};
  }
}

async function saveAll(map: CommentsMap): Promise<void> {
  await AsyncStorage.setItem(COMMENTS_KEY, JSON.stringify(map));
}

/** Get all comments for a problem, sorted oldest-first. */
export async function getComments(problemId: string): Promise<ProblemComment[]> {
  const map = await getAll();
  return (map[problemId] ?? []).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/** Add a new comment for a problem. Returns the updated list. */
export async function addComment(
  problemId: string,
  author: string,
  text: string,
  replyTo?: { id: string; author: string; text: string }
): Promise<ProblemComment[]> {
  const map = await getAll();
  const comment: ProblemComment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    problemId,
    author,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    ...(replyTo
      ? {
          replyToId: replyTo.id,
          replyToAuthor: replyTo.author,
          replyToText: replyTo.text.slice(0, 80),
        }
      : {}),
  };
  map[problemId] = [...(map[problemId] ?? []), comment];
  await saveAll(map);
  return map[problemId];
}

/** Delete a comment by ID. Returns the updated list. */
export async function deleteComment(
  problemId: string,
  commentId: string
): Promise<ProblemComment[]> {
  const map = await getAll();
  map[problemId] = (map[problemId] ?? []).filter((c) => c.id !== commentId);
  await saveAll(map);
  return map[problemId];
}

/** Get the total comment count for a problem (for badge display). */
export async function getCommentCount(problemId: string): Promise<number> {
  const map = await getAll();
  return (map[problemId] ?? []).length;
}
