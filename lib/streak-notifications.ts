/**
 * lib/streak-notifications.ts
 *
 * Manages two notification types:
 *  1. Streak Alert — fires at 8 PM if the student hasn't hit their daily goal yet.
 *     Cancelled automatically when the goal is met for the day.
 *     Gated by the "streakAlerts" Notification Center toggle.
 *
 *  2. Weekly Progress Report — fires every Sunday at 9 AM with a summary of
 *     the week's solved count, accuracy, and current streak.
 *     Gated by the "weeklyReport" Notification Center toggle.
 *
 * Both use expo-notifications scheduled triggers and are re-scheduled on every
 * app launch so they stay current.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isNotifEnabled } from "./notification-prefs";
import { getProgress, type ProgressData } from "./progress";
import { loadQuizHistory, type QuizResult } from "./quiz-history";

// ─── Storage keys ────────────────────────────────────────────────────────────
const STREAK_ALERT_ID_KEY = "@tutorsnap/streakAlertNotifId";
const WEEKLY_REPORT_ID_KEY = "@tutorsnap/weeklyReportNotifId";

// ─── Android channel setup ────────────────────────────────────────────────────
async function ensureChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("streak-alerts", {
    name: "Streak Alerts",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync("weekly-report", {
    name: "Weekly Progress Report",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// ─── Permission helper ────────────────────────────────────────────────────────
async function hasPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const { status: asked } = await Notifications.requestPermissionsAsync();
  return asked === "granted";
}

// ─── Cancel helpers ───────────────────────────────────────────────────────────
async function cancelById(storageKey: string): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(storageKey);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      await AsyncStorage.removeItem(storageKey);
    }
  } catch { /* ignore */ }
}

// ─── 1. Streak Alert ──────────────────────────────────────────────────────────

/**
 * Schedule a daily 8 PM streak alert if the student hasn't hit their daily
 * goal yet today. If they have already met the goal, cancel any pending alert.
 */
export async function syncStreakAlert(): Promise<void> {
  if (Platform.OS === "web") return;
  const enabled = await isNotifEnabled("streakAlerts");
  if (!enabled) {
    await cancelById(STREAK_ALERT_ID_KEY);
    return;
  }

  const granted = await hasPermission();
  if (!granted) return;

  const progress = await getProgress();
  const { todaySolved, dailyGoal, currentStreak } = progress.streak;

  // If goal already met today, cancel any pending alert
  if (todaySolved >= dailyGoal) {
    await cancelById(STREAK_ALERT_ID_KEY);
    return;
  }

  // Cancel old alert before scheduling new one
  await cancelById(STREAK_ALERT_ID_KEY);
  await ensureChannels();

  // Schedule for 8 PM today
  const trigger = new Date();
  trigger.setHours(20, 0, 0, 0);
  if (trigger.getTime() <= Date.now()) return; // already past 8 PM today

  const streakMsg = currentStreak > 0
    ? `Don't break your ${currentStreak}-day streak! Solve ${dailyGoal - todaySolved} more problem${dailyGoal - todaySolved === 1 ? "" : "s"} today.`
    : `Solve ${dailyGoal - todaySolved} problem${dailyGoal - todaySolved === 1 ? "" : "s"} to start your streak!`;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔥 Streak at risk!",
        body: streakMsg,
        sound: true,
        data: { type: "streakAlert" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
    await AsyncStorage.setItem(STREAK_ALERT_ID_KEY, id);
  } catch { /* ignore */ }
}

/**
 * Cancel the streak alert immediately — call this when the student meets
 * their daily goal.
 */
export async function cancelStreakAlert(): Promise<void> {
  await cancelById(STREAK_ALERT_ID_KEY);
}

// ─── 2. Weekly Progress Report ────────────────────────────────────────────────

/**
 * Schedule (or reschedule) the weekly progress report for next Sunday at 9 AM.
 * The notification body is generated from the current week's data at schedule
 * time; it will be re-scheduled each week on app launch so the content stays
 * current.
 */
export async function syncWeeklyReport(): Promise<void> {
  if (Platform.OS === "web") return;
  const enabled = await isNotifEnabled("weeklyReport");
  if (!enabled) {
    await cancelById(WEEKLY_REPORT_ID_KEY);
    return;
  }

  const granted = await hasPermission();
  if (!granted) return;

  // Cancel old report before scheduling new one
  await cancelById(WEEKLY_REPORT_ID_KEY);
  await ensureChannels();

  // Gather this week's stats
  const progress = await getProgress();
  const { currentStreak, totalSolved } = progress.streak;
  const weeklyActivity = progress.weeklyActivity;
  const weekTotal = weeklyActivity.reduce((a: number, b: number) => a + b, 0);

  // Quiz accuracy this week
  let accuracyStr = "";
  try {
    const history = await loadQuizHistory();
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay()); // Sunday
    thisWeekStart.setHours(0, 0, 0, 0);
    const weekQuizzes = history.filter((q: QuizResult) => q.completedAt >= thisWeekStart.getTime());
    if (weekQuizzes.length > 0) {
      const avgPct = Math.round(weekQuizzes.reduce((a: number, q: QuizResult) => a + q.pct, 0) / weekQuizzes.length);
      accuracyStr = ` · ${weekQuizzes.length} quiz${weekQuizzes.length === 1 ? "" : "zes"} avg ${avgPct}%`;
    }
  } catch { /* ignore */ }

  const body = `This week: ${weekTotal} problem${weekTotal === 1 ? "" : "s"} solved${accuracyStr} · Streak: ${currentStreak} day${currentStreak === 1 ? "" : "s"} · Total: ${totalSolved}`;

  // Next Sunday at 9 AM
  const nextSunday = new Date();
  const daysUntilSunday = (7 - nextSunday.getDay()) % 7 || 7;
  nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
  nextSunday.setHours(9, 0, 0, 0);

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "📊 Your weekly TutorSnap report",
        body,
        sound: true,
        data: { type: "weeklyReport" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextSunday,
      },
    });
    await AsyncStorage.setItem(WEEKLY_REPORT_ID_KEY, id);
  } catch { /* ignore */ }
}

/**
 * Schedule both streak alert and weekly report in one call.
 * Call this on app launch and after each solve.
 */
export async function syncAllStreakNotifications(): Promise<void> {
  await Promise.all([syncStreakAlert(), syncWeeklyReport()]);
}
