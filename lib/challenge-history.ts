import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "challenge_history_v1";
const MAX_ENTRIES = 100;

export interface ChallengeAttempt {
  id: string;
  problem: string;
  subject: string;
  classCode: string;
  classroomName?: string;
  correct: boolean;
  timeTaken: number; // seconds
  date: string; // ISO string
}

export async function saveChallengeAttempt(attempt: Omit<ChallengeAttempt, "id">): Promise<void> {
  try {
    const existing = await getChallengeHistory();
    const entry: ChallengeAttempt = { ...attempt, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export async function getChallengeHistory(): Promise<ChallengeAttempt[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChallengeAttempt[];
  } catch {
    return [];
  }
}

export async function clearChallengeHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function getChallengeStats(history: ChallengeAttempt[]) {
  if (history.length === 0) return { total: 0, correct: 0, pct: 0, avgTime: 0, streak: 0 };
  const correct = history.filter((h) => h.correct).length;
  const pct = Math.round((correct / history.length) * 100);
  const avgTime = Math.round(history.reduce((sum, h) => sum + h.timeTaken, 0) / history.length);

  // Current win streak (from most recent)
  let streak = 0;
  for (const h of history) {
    if (h.correct) streak++;
    else break;
  }

  return { total: history.length, correct, pct, avgTime, streak };
}
