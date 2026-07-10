/**
 * lib/notification-prefs.ts
 * Shared helper for reading notification preference gates.
 * All modules that schedule local notifications should call isNotifEnabled()
 * before scheduling to respect the user's Notification Center settings.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@tutorsnap/notificationPrefs";

export type NotifPrefKey =
  | "dailyReminder"
  | "streakAlerts"
  | "badgeNotifications"
  | "studyReminders"
  | "weeklyReport"
  | "practiceNudge"
  | "achievementAlerts";

const DEFAULTS: Record<NotifPrefKey, boolean> = {
  dailyReminder: true,
  streakAlerts: true,
  badgeNotifications: true,
  studyReminders: true,
  weeklyReport: false,
  practiceNudge: false,
  achievementAlerts: true,
};

/**
 * Returns true if the given notification type is enabled by the user.
 * Falls back to the default value if no preference has been saved.
 */
export async function isNotifEnabled(key: NotifPrefKey): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS[key];
    const saved = JSON.parse(raw) as Partial<Record<NotifPrefKey, boolean>>;
    return saved[key] ?? DEFAULTS[key];
  } catch {
    return DEFAULTS[key];
  }
}
