/**
 * Classroom — local-first classroom feature.
 *
 * Teachers can create a classroom with a 6-character code.
 * Students join by entering the code.
 * Problems can be shared to the classroom feed.
 *
 * All data is stored locally in AsyncStorage.
 * (Cross-device sync would require a backend — this is the local-first version.)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const CLASSROOM_KEY = "@tutorsnap/classroom";
const JOINED_KEY = "@tutorsnap/joined_classroom";
const FEED_KEY = "@tutorsnap/classroom_feed";

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
  classCode: string;
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
  const updated = [item, ...existing].slice(0, 50); // keep last 50
  await AsyncStorage.setItem(`${FEED_KEY}_${classCode}`, JSON.stringify(updated));
  return item;
}

/** Remove a problem from the classroom feed */
export async function removeFromClassroomFeed(classCode: string, id: string): Promise<void> {
  const existing = await getClassroomFeed(classCode);
  const updated = existing.filter((p) => p.id !== id);
  await AsyncStorage.setItem(`${FEED_KEY}_${classCode}`, JSON.stringify(updated));
}
