/**
 * Classroom — local-first classroom feature.
 *
 * Teachers can create a classroom with a 6-character code.
 * Students join by entering the code.
 * Problems can be shared to the classroom feed, assigned as homework, and
 * challenge results are tracked for a leaderboard.
 *
 * All data is stored locally in AsyncStorage.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const CLASSROOM_KEY = "@tutorsnap/classroom";
const JOINED_KEY = "@tutorsnap/joined_classroom";
const FEED_KEY = "@tutorsnap/classroom_feed";
const LEADERBOARD_KEY = "@tutorsnap/classroom_leaderboard";
const NOTIF_PREFS_KEY = "@tutorsnap/classroom_notif_prefs";
const DISPLAY_NAME_KEY = "@tutorsnap/classroom_display_name";

export interface ClassroomInfo {
  code: string;          // 6-char uppercase code
  name: string;          // e.g. "Mr. Smith's Algebra Class"
  role: "teacher" | "student";
  createdAt: string;     // ISO date
  memberCount: number;   // local estimate
}

export interface ClassroomProblem {
  id: string;
  problem: string;
  answer: string;
  subject: string;
  steps: string[];
  sharedAt: string;      // ISO date
  sharedBy: string;      // display name or "You"
  sharerAvatarUri?: string; // optional profile photo of the sharer
  classCode: string;
  // Homework fields (optional)
  isHomework?: boolean;
  dueDate?: string;      // ISO date
  homeworkTitle?: string;
}

export interface LeaderboardEntry {
  name: string;
  avatarUri?: string;             // optional profile photo
  challengesCompleted: number;
  challengesCorrect: number;
  bestTimeSeconds: number | null; // fastest correct solve
  lastActive: string;             // ISO date
}

export interface ClassroomNotifPrefs {
  enabled: boolean;
  newProblem: boolean;
  newHomework: boolean;
}

/** Generate a random 6-char classroom code */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** Get the classroom the user created (teacher) */
export async function getMyClassroom(): Promise<ClassroomInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(CLASSROOM_KEY);
    return raw ? (JSON.parse(raw) as ClassroomInfo) : null;
  } catch { return null; }
}

/** Create a new classroom (teacher role) */
export async function createClassroom(name: string): Promise<ClassroomInfo> {
  const info: ClassroomInfo = {
    code: generateCode(),
    name: name.trim() || "My Classroom",
    role: "teacher",
    createdAt: new Date().toISOString(),
    memberCount: 1,
  };
  await AsyncStorage.setItem(CLASSROOM_KEY, JSON.stringify(info));
  return info;
}

/** Delete the classroom the user created */
export async function deleteMyClassroom(): Promise<void> {
  await AsyncStorage.removeItem(CLASSROOM_KEY);
}

/** Get the classroom the user joined (student) */
export async function getJoinedClassroom(): Promise<ClassroomInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(JOINED_KEY);
    return raw ? (JSON.parse(raw) as ClassroomInfo) : null;
  } catch { return null; }
}

/** Join a classroom by code (student role) */
export async function joinClassroom(code: string, name?: string): Promise<ClassroomInfo> {
  const info: ClassroomInfo = {
    code: code.toUpperCase().trim(),
    name: name || "Shared Classroom",
    role: "student",
    createdAt: new Date().toISOString(),
    memberCount: 1,
  };
  await AsyncStorage.setItem(JOINED_KEY, JSON.stringify(info));
  return info;
}

/** Leave the joined classroom */
export async function leaveClassroom(): Promise<void> {
  await AsyncStorage.removeItem(JOINED_KEY);
}

/** Get the classroom feed (shared problems) for a given class code */
export async function getClassroomFeed(classCode: string): Promise<ClassroomProblem[]> {
  try {
    const raw = await AsyncStorage.getItem(`${FEED_KEY}_${classCode}`);
    return raw ? (JSON.parse(raw) as ClassroomProblem[]) : [];
  } catch { return []; }
}

/** Share a problem to the classroom feed */
export async function shareToClassroom(
  classCode: string,
  problem: Omit<ClassroomProblem, "id" | "sharedAt" | "classCode">
): Promise<ClassroomProblem> {
  const item: ClassroomProblem = {
    ...problem,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sharedAt: new Date().toISOString(),
    classCode,
  };
  const existing = await getClassroomFeed(classCode);
  const updated = [item, ...existing].slice(0, 50);
  await AsyncStorage.setItem(`${FEED_KEY}_${classCode}`, JSON.stringify(updated));
  return item;
}

/** Assign a problem as homework with a due date */
export async function assignAsHomework(
  classCode: string,
  problemId: string,
  dueDate: string,
  homeworkTitle?: string
): Promise<void> {
  const feed = await getClassroomFeed(classCode);
  const updated = feed.map((p) =>
    p.id === problemId
      ? { ...p, isHomework: true, dueDate, homeworkTitle: homeworkTitle || p.problem.slice(0, 40) }
      : p
  );
  await AsyncStorage.setItem(`${FEED_KEY}_${classCode}`, JSON.stringify(updated));
}

/** Remove homework assignment from a problem */
export async function unassignHomework(classCode: string, problemId: string): Promise<void> {
  const feed = await getClassroomFeed(classCode);
  const updated = feed.map((p) =>
    p.id === problemId
      ? { ...p, isHomework: false, dueDate: undefined, homeworkTitle: undefined }
      : p
  );
  await AsyncStorage.setItem(`${FEED_KEY}_${classCode}`, JSON.stringify(updated));
}

/** Remove a problem from the classroom feed */
export async function removeFromClassroomFeed(classCode: string, id: string): Promise<void> {
  const existing = await getClassroomFeed(classCode);
  const updated = existing.filter((p) => p.id !== id);
  await AsyncStorage.setItem(`${FEED_KEY}_${classCode}`, JSON.stringify(updated));
}

// ─── Leaderboard ────────────────────────────────────────────────────────────

/** Get the leaderboard for a classroom */
export async function getLeaderboard(classCode: string): Promise<LeaderboardEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(`${LEADERBOARD_KEY}_${classCode}`);
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
  } catch { return []; }
}

/** Record a challenge result for the leaderboard */
export async function recordChallengeResult(
  classCode: string,
  playerName: string,
  correct: boolean,
  timeTakenSeconds: number,
  avatarUri?: string
): Promise<void> {
  const board = await getLeaderboard(classCode);
  const idx = board.findIndex((e) => e.name === playerName);
  if (idx >= 0) {
    const entry = board[idx];
    entry.challengesCompleted += 1;
    if (correct) {
      entry.challengesCorrect += 1;
      if (entry.bestTimeSeconds === null || timeTakenSeconds < entry.bestTimeSeconds) {
        entry.bestTimeSeconds = timeTakenSeconds;
      }
    }
    entry.lastActive = new Date().toISOString();
    // Update avatar if a newer one is provided
    if (avatarUri) entry.avatarUri = avatarUri;
    board[idx] = entry;
  } else {
    board.push({
      name: playerName,
      avatarUri: avatarUri ?? undefined,
      challengesCompleted: 1,
      challengesCorrect: correct ? 1 : 0,
      bestTimeSeconds: correct ? timeTakenSeconds : null,
      lastActive: new Date().toISOString(),
    });
  }
  // Sort: most correct first, then fastest time
  board.sort((a, b) => {
    if (b.challengesCorrect !== a.challengesCorrect) return b.challengesCorrect - a.challengesCorrect;
    if (a.bestTimeSeconds !== null && b.bestTimeSeconds !== null) return a.bestTimeSeconds - b.bestTimeSeconds;
    if (a.bestTimeSeconds !== null) return -1;
    if (b.bestTimeSeconds !== null) return 1;
    return 0;
  });
  await AsyncStorage.setItem(`${LEADERBOARD_KEY}_${classCode}`, JSON.stringify(board));
}

// ─── Notification Preferences ───────────────────────────────────────────────

/** Get classroom notification preferences */
export async function getClassroomNotifPrefs(): Promise<ClassroomNotifPrefs> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
    return raw
      ? (JSON.parse(raw) as ClassroomNotifPrefs)
      : { enabled: true, newProblem: true, newHomework: true };
  } catch {
    return { enabled: true, newProblem: true, newHomework: true };
  }
}

/** Save classroom notification preferences */
export async function saveClassroomNotifPrefs(prefs: ClassroomNotifPrefs): Promise<void> {
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
}

// ─── Display Name ────────────────────────────────────────────────────────────

/** Get the student's saved display name for the classroom leaderboard */
export async function getClassroomDisplayName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DISPLAY_NAME_KEY);
  } catch { return null; }
}

/** Save the student's display name */
export async function saveClassroomDisplayName(name: string): Promise<void> {
  await AsyncStorage.setItem(DISPLAY_NAME_KEY, name.trim());
}

/** Clear the student's display name */
export async function clearClassroomDisplayName(): Promise<void> {
  await AsyncStorage.removeItem(DISPLAY_NAME_KEY);
}

// ─── Reset Leaderboard ───────────────────────────────────────────────────────

/** Reset (clear) the leaderboard for a classroom */
export async function resetLeaderboard(classCode: string): Promise<void> {
  await AsyncStorage.removeItem(`${LEADERBOARD_KEY}_${classCode}`);
}
