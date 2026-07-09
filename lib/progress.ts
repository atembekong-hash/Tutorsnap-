import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MathSubject } from "@/shared/types";

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

export const SUBJECT_DISPLAY: Partial<Record<MathSubject, { label: string; color: string }>> = {
  algebra: { label: "Algebra", color: "#6C3CE1" },
  calculus: { label: "Calculus", color: "#3B82F6" },
  geometry: { label: "Geometry", color: "#10B981" },
  trigonometry: { label: "Trigonometry", color: "#F97316" },
  statistics: { label: "Statistics", color: "#EC4899" },
  arithmetic: { label: "Arithmetic", color: "#8B5CF6" },
  linear_algebra: { label: "Linear Algebra", color: "#06B6D4" },
  differential_equations: { label: "Diff. Equations", color: "#EF4444" },
  number_theory: { label: "Number Theory", color: "#F59E0B" },
  other: { label: "Other", color: "#6B7280" },
};
