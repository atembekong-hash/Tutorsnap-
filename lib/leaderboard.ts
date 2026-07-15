/**
 * TutorSnap — Streak Leaderboard
 *
 * Local-first leaderboard: friends are added via a shareable invite code.
 * Each entry stores a name, streak, and last-updated timestamp.
 * No server required — friends manually share their progress cards.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const FRIENDS_KEY = "@tutorsnap/leaderboard_friends";
const MY_CODE_KEY = "@tutorsnap/my_invite_code";

export interface FriendEntry {
  id: string;
  name: string;
  streak: number;
  totalSolved: number;
  addedAt: number; // timestamp
  updatedAt: number;
  avatar: string; // emoji avatar
}

/** Generate a random 6-char alphanumeric code */
function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Get or create the user's own invite code */
export async function getMyInviteCode(): Promise<string> {
  const existing = await AsyncStorage.getItem(MY_CODE_KEY);
  if (existing) return existing;
  const code = generateCode();
  await AsyncStorage.setItem(MY_CODE_KEY, code);
  return code;
}

/** Load all friend entries */
export async function loadFriends(): Promise<FriendEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(FRIENDS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FriendEntry[];
  } catch {
    return [];
  }
}

/** Save all friend entries */
async function saveFriends(friends: FriendEntry[]): Promise<void> {
  await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
}

/** Add a friend manually (by name and streak they share) */
export async function addFriend(
  name: string,
  streak: number,
  totalSolved: number,
  avatar: string
): Promise<FriendEntry> {
  const friends = await loadFriends();
  const entry: FriendEntry = {
    id: generateCode(),
    name: name.trim(),
    streak,
    totalSolved,
    addedAt: Date.now(),
    updatedAt: Date.now(),
    avatar,
  };
  friends.push(entry);
  await saveFriends(friends);
  return entry;
}

/** Update a friend's streak */
export async function updateFriend(
  id: string,
  streak: number,
  totalSolved: number
): Promise<void> {
  const friends = await loadFriends();
  const idx = friends.findIndex((f) => f.id === id);
  if (idx >= 0) {
    friends[idx].streak = streak;
    friends[idx].totalSolved = totalSolved;
    friends[idx].updatedAt = Date.now();
    await saveFriends(friends);
  }
}

/** Remove a friend */
export async function removeFriend(id: string): Promise<void> {
  const friends = await loadFriends();
  await saveFriends(friends.filter((f) => f.id !== id));
}

/** Build a shareable progress text for the share sheet */
export function buildShareText(
  myName: string,
  myStreak: number,
  totalSolved: number,
  inviteCode: string
): string {
  const streakEmoji = myStreak >= 30 ? "🔥🔥🔥" : myStreak >= 14 ? "🔥🔥" : myStreak >= 7 ? "🔥" : "⚡";
  return (
    `${streakEmoji} ${myName} has a ${myStreak}-day streak on TutorSnap!\n` +
    `📚 ${totalSolved} problems solved\n\n` +
    `Challenge me - download TutorSnap and enter my code: ${inviteCode}\n` +
    `https://tutorsnap.app`
  );
}

/** Sort entries by streak descending, then totalSolved */
export function rankEntries(
  me: { name: string; streak: number; totalSolved: number },
  friends: FriendEntry[]
): {
  rank: number;
  name: string;
  streak: number;
  totalSolved: number;
  avatar: string;
  isMe: boolean;
  id: string;
}[] {
  const all = [
    { name: me.name, streak: me.streak, totalSolved: me.totalSolved, avatar: "🧑‍🎓", isMe: true, id: "me" },
    ...friends.map((f) => ({ ...f, isMe: false })),
  ];
  all.sort((a, b) => b.streak - a.streak || b.totalSolved - a.totalSolved);
  return all.map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export const AVATAR_OPTIONS = ["🧑‍🎓", "👩‍🎓", "🧑‍💻", "👩‍💻", "🦊", "🐼", "🦁", "🐯", "🐸", "🦋", "🌟", "🚀"];
