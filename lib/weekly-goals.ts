import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadQuizHistory } from "./quiz-history";

const WEEKLY_GOAL_KEY = "tutorsnap_weekly_quiz_goal";
const DEFAULT_WEEKLY_GOAL = 3;

export async function getWeeklyQuizGoal(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(WEEKLY_GOAL_KEY);
    if (raw) return parseInt(raw, 10);
  } catch {
    // ignore
  }
  return DEFAULT_WEEKLY_GOAL;
}

export async function setWeeklyQuizGoal(goal: number): Promise<void> {
  await AsyncStorage.setItem(WEEKLY_GOAL_KEY, String(goal));
}

/** Returns ISO date string YYYY-MM-DD for a day offset from today (0 = today, -1 = yesterday, etc.) */
function getDayString(offsetFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetFromToday);
  return d.toISOString().split("T")[0];
}

/** Short label for a day string, e.g. "Mon", "Tue" */
export function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export interface DayActivity {
  date: string;       // YYYY-MM-DD
  label: string;      // "Mon" etc.
  solves: number;     // problems solved
  quizzes: number;    // quizzes completed
  isToday: boolean;
}

export interface WeeklyData {
  days: DayActivity[];          // last 7 days, index 0 = 6 days ago, index 6 = today
  quizzesThisWeek: number;
  weeklyGoal: number;
  goalPct: number;              // 0-100
}

export async function getWeeklyData(): Promise<WeeklyData> {
  const [history, weeklyGoal] = await Promise.all([
    loadQuizHistory(),
    getWeeklyQuizGoal(),
  ]);

  const today = getDayString(0);

  // Build a map of date -> quiz count from quiz history
  const quizByDay: Record<string, number> = {};
  for (const q of history) {
    const d = new Date(q.completedAt).toISOString().split("T")[0];
    quizByDay[d] = (quizByDay[d] || 0) + 1;
  }

  // Build 7-day window (index 0 = 6 days ago, index 6 = today)
  const days: DayActivity[] = [];
  for (let i = -6; i <= 0; i++) {
    const date = getDayString(i);
    days.push({
      date,
      label: getDayLabel(date),
      solves: 0,   // will be filled from progress weeklyActivity below
      quizzes: quizByDay[date] || 0,
      isToday: date === today,
    });
  }

  // Count quizzes this week (last 7 days)
  const quizzesThisWeek = days.reduce((s, d) => s + d.quizzes, 0);
  const goalPct = Math.min(100, Math.round((quizzesThisWeek / weeklyGoal) * 100));

  return { days, quizzesThisWeek, weeklyGoal, goalPct };
}
