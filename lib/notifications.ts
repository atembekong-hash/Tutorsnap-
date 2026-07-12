/**
 * TutorSnap — Daily Study Reminder Notifications
 *
 * Handles scheduling and cancelling a single daily recurring notification.
 * Only works on iOS and Android (not web).
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isNotifEnabled } from "./notification-prefs";

const REMINDER_ENABLED_KEY = "@tutorsnap/reminderEnabled";
const REMINDER_HOUR_KEY = "@tutorsnap/reminderHour";
const REMINDER_MINUTE_KEY = "@tutorsnap/reminderMinute";
const REMINDER_ID_KEY = "@tutorsnap/reminderNotifId";

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  hour: 19, // 7:00 PM default
  minute: 0,
};

/** Load persisted reminder settings */
export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const [enabled, hour, minute] = await Promise.all([
      AsyncStorage.getItem(REMINDER_ENABLED_KEY),
      AsyncStorage.getItem(REMINDER_HOUR_KEY),
      AsyncStorage.getItem(REMINDER_MINUTE_KEY),
    ]);
    return {
      enabled: enabled === "true",
      hour: hour !== null ? parseInt(hour, 10) : DEFAULT_REMINDER.hour,
      minute: minute !== null ? parseInt(minute, 10) : DEFAULT_REMINDER.minute,
    };
  } catch {
    return DEFAULT_REMINDER;
  }
}

/** Request notification permissions. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/** Cancel the currently scheduled daily reminder (if any) */
export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const id = await AsyncStorage.getItem(REMINDER_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(REMINDER_ID_KEY);
    }
  } catch {
    // ignore
  }
}

/** Schedule (or reschedule) the daily reminder at the given hour:minute */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const enabled = await isNotifEnabled("dailyReminder");
  if (!enabled) return false;
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  // Cancel any existing reminder first
  await cancelDailyReminder();

  // Set up Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("study-reminder", {
      name: "Study Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const messages = [
    { title: "Time to study! 📚", body: "Keep your streak alive — solve a problem today." },
    { title: "Your streak is waiting 🔥", body: "Don't break the chain! Open TutorSnap and solve something." },
    { title: "Daily goal check-in 🎯", body: "Have you hit your daily goal yet? Let's go!" },
    { title: "Study reminder 🎓", body: "A few minutes of practice makes a big difference." },
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      },
    });
    await AsyncStorage.setItem(REMINDER_ID_KEY, id);
    return true;
  } catch {
    return false;
  }
}

/** Save settings and apply (schedule or cancel) */
export async function saveReminderSettings(settings: ReminderSettings): Promise<boolean> {
  await AsyncStorage.setItem(REMINDER_ENABLED_KEY, settings.enabled ? "true" : "false");
  await AsyncStorage.setItem(REMINDER_HOUR_KEY, String(settings.hour));
  await AsyncStorage.setItem(REMINDER_MINUTE_KEY, String(settings.minute));

  if (settings.enabled) {
    return scheduleDailyReminder(settings.hour, settings.minute);
  } else {
    await cancelDailyReminder();
    return true;
  }
}

/** Format hour/minute as 12-hour time string, e.g. "7:00 PM" */
export function formatReminderTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${period}`;
}

// ── Monthly Backup Reminder ────────────────────────────────────────────────────

const BACKUP_REMINDER_ID_KEY = "@tutorsnap/backupReminderNotifId";
const BACKUP_REMINDER_ENABLED_KEY = "@tutorsnap/backupReminderEnabled";

/** Schedule a monthly backup reminder on the 1st of each month at 10:00 AM */
export async function scheduleMonthlyBackupReminder(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  // Cancel any existing backup reminder
  await cancelMonthlyBackupReminder();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("backup-reminder", {
      name: "Backup Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Back up your TutorSnap data 💾",
        body: "It's been a month — export your progress to keep it safe.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: 1,
        hour: 10,
        minute: 0,
        repeats: true,
      },
    });
    await AsyncStorage.setItem(BACKUP_REMINDER_ID_KEY, id);
    await AsyncStorage.setItem(BACKUP_REMINDER_ENABLED_KEY, "true");
    return true;
  } catch {
    return false;
  }
}

/** Cancel the monthly backup reminder */
export async function cancelMonthlyBackupReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const id = await AsyncStorage.getItem(BACKUP_REMINDER_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(BACKUP_REMINDER_ID_KEY);
    }
    await AsyncStorage.removeItem(BACKUP_REMINDER_ENABLED_KEY);
  } catch {
    // ignore
  }
}

/** Returns true if the monthly backup reminder is currently scheduled */
export async function isBackupReminderEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(BACKUP_REMINDER_ENABLED_KEY);
    return val === "true";
  } catch {
    return false;
  }
}
