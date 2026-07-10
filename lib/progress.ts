import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MathSubject } from "@/shared/types";
import { getSubjectColor, getSubjectLabel } from "@/lib/subjects";

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastSolvedDate: string | null; // ISO date string YYYY-MM-DD
  totalSolved: number;
  todaySolved: number;
  dailyGoal: number;
};

export type SubjectProgress = {
  subject: MathSubject;
  solved: number;
  correct: number; // for practice
};

export type ProgressData = {
  streak: StreakData;
  subjectCounts: Partial<Record<MathSubject, number>>;
  weeklyActivity: number[]; // last 7 days solved counts [oldest...newest]
};

const PROGRESS_KEY = "math_progress";
const DEFAULT_DAILY_GOAL = 3;

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function getDayString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

export async function getProgress(): Promise<ProgressData> {
  try {
    const stored = await AsyncStorage.getItem(PROGRESS_KEY);
    if (stored) {
      return JSON.parse(stored) as ProgressData;
    }
  } catch (e) {
    // ignore
  }
  return getDefaultProgress();
}

function getDefaultProgress(): ProgressData {
  return {
    streak: {
      currentStreak: 0,
      longestStreak: 0,
      lastSolvedDate: null,
      totalSolved: 0,
      todaySolved: 0,
      dailyGoal: DEFAULT_DAILY_GOAL,
    },
    subjectCounts: {},
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
  };
}

export async function recordSolve(subject: MathSubject): Promise<ProgressData> {
  const progress = await getProgress();
  const today = getTodayString();
  const yesterday = getYesterdayString();

  // Update streak
  const streak = { ...progress.streak };
  if (streak.lastSolvedDate === today) {
    // Already solved today, just increment today count
    streak.todaySolved += 1;
  } else if (streak.lastSolvedDate === yesterday) {
    // Continuing streak from yesterday
    streak.currentStreak += 1;
    streak.todaySolved = 1;
    streak.lastSolvedDate = today;
  } else {
    // New streak or first solve
    streak.currentStreak = 1;
    streak.todaySolved = 1;
    streak.lastSolvedDate = today;
  }
  streak.totalSolved += 1;
  streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);

  // Update subject counts
  const subjectCounts = { ...progress.subjectCounts };
  subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;

  // Update weekly activity (last 7 days)
  // weeklyActivity[6] = today, weeklyActivity[5] = yesterday, etc.
  const weeklyActivity = [...progress.weeklyActivity];
  // Check if last solve was today
  if (progress.streak.lastSolvedDate === today) {
    weeklyActivity[6] += 1;
  } else {
    // Shift the array if it's a new day
    const lastDate = progress.streak.lastSolvedDate;
    if (lastDate) {
      const daysDiff = Math.floor(
        (new Date(today).getTime() - new Date(lastDate).getTime()) / 86400000
      );
      if (daysDiff >= 7) {
        // Reset all
        weeklyActivity.fill(0);
      } else {
        // Shift by daysDiff
        for (let i = 0; i < daysDiff; i++) {
          weeklyActivity.shift();
          weeklyActivity.push(0);
        }
      }
    }
    weeklyActivity[6] = 1;
  }

  const updated: ProgressData = {
    streak,
    subjectCounts,
    weeklyActivity,
  };

  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Award a bonus streak increment when a quiz is completed with 80%+ score.
 * Only awards once per day (tracked by a separate key).
 */
export async function recordQuizBonus(pct: number): Promise<{ awarded: boolean; newStreak: number }> {
  if (pct < 80) return { awarded: false, newStreak: 0 };
  const today = getTodayString();
  const bonusKey = `${PROGRESS_KEY}_quiz_bonus_${today}`;
  const alreadyAwarded = await AsyncStorage.getItem(bonusKey);
  if (alreadyAwarded) return { awarded: false, newStreak: 0 };

  const progress = await getProgress();
  const streak = { ...progress.streak };
  streak.currentStreak = Math.max(streak.currentStreak, 1) + 1;
  streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
  // Mark today as solved if not already
  if (!streak.lastSolvedDate || streak.lastSolvedDate !== today) {
    streak.lastSolvedDate = today;
    streak.todaySolved = (streak.todaySolved || 0) + 1;
  }
  const updated = { ...progress, streak };
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
  await AsyncStorage.setItem(bonusKey, "1");
  return { awarded: true, newStreak: streak.currentStreak };
}

// ===== STREAK SHIELD =====
const SHIELD_KEY = "streak_shield";

/** Returns current shield count (0-3 max) */
export async function getShieldCount(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(SHIELD_KEY);
    return val ? Math.min(3, Math.max(0, parseInt(val, 10))) : 0;
  } catch { return 0; }
}

/** Award a shield (max 3). Returns new count. */
export async function earnShield(): Promise<number> {
  const current = await getShieldCount();
  if (current >= 3) return current;
  const next = current + 1;
  await AsyncStorage.setItem(SHIELD_KEY, String(next));
  return next;
}

/**
 * Check if streak should be protected on app load.
 * If the user missed exactly one day and has a shield, auto-consume it and preserve streak.
 * Returns { shieldUsed: boolean, newStreak: number }
 */
export async function applyStreakShieldIfNeeded(): Promise<{ shieldUsed: boolean; newStreak: number }> {
  const progress = await getProgress();
  const streak = progress.streak;
  const today = getTodayString();
  const yesterday = getYesterdayString();
  // Only apply if last solved was 2 days ago (missed exactly one day)
  if (!streak.lastSolvedDate || streak.lastSolvedDate === today || streak.lastSolvedDate === yesterday) {
    return { shieldUsed: false, newStreak: streak.currentStreak };
  }
  const lastDate = new Date(streak.lastSolvedDate);
  const todayDate = new Date(today);
  const daysMissed = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);
  if (daysMissed !== 2) return { shieldUsed: false, newStreak: streak.currentStreak };
  const shields = await getShieldCount();
  if (shields <= 0) return { shieldUsed: false, newStreak: streak.currentStreak };
  // Consume shield and preserve streak by setting lastSolvedDate to yesterday
  const newShields = shields - 1;
  await AsyncStorage.setItem(SHIELD_KEY, String(newShields));
  const updatedStreak = { ...streak, lastSolvedDate: yesterday };
  const updated = { ...progress, streak: updatedStreak };
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
  return { shieldUsed: true, newStreak: streak.currentStreak };
}

export async function setDailyGoal(goal: number): Promise<void> {
  const progress = await getProgress();
  progress.streak.dailyGoal = goal;
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function getStreakEmoji(streak: number): string {
  if (streak === 0) return "🌱";
  if (streak < 3) return "🔥";
  if (streak < 7) return "⚡";
  if (streak < 14) return "💪";
  if (streak < 30) return "🚀";
  return "🏆";
}

export function getDailyGoalPercent(todaySolved: number, dailyGoal: number): number {
  return Math.min(100, Math.round((todaySolved / dailyGoal) * 100));
}

/** Returns display info for any subject ID, using centralized subjects lib */
export function getSubjectDisplay(subject: string): { label: string; color: string } {
  return { label: getSubjectLabel(subject), color: getSubjectColor(subject) };
}

/** @deprecated Use getSubjectDisplay() instead */
export const SUBJECT_DISPLAY: Partial<Record<MathSubject, { label: string; color: string }>> = {};
