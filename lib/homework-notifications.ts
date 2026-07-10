/**
 * Homework Due-Date Reminder Notifications
 *
 * Schedules a local push notification the morning a homework item is due
 * (8:00 AM on the due date) and an evening reminder the day before (7:00 PM).
 *
 * Notification IDs are stored in AsyncStorage keyed by problem ID so they
 * can be cancelled when the homework is unassigned or marked as done.
 *
 * Note: Local notifications only work on iOS and Android (not web).
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIF_IDS_KEY = "@tutorsnap/hw_notif_ids";

type NotifIdMap = Record<string, string[]>; // problemId → [notifId, ...]

// ─── Permission ─────────────────────────────────────────────────────────────

/** Request notification permission. Returns true if granted. */
export async function requestNotifPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("homework", {
        name: "Homework Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

// ─── Storage helpers ─────────────────────────────────────────────────────────

async function getNotifIds(): Promise<NotifIdMap> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    return raw ? (JSON.parse(raw) as NotifIdMap) : {};
  } catch {
    return {};
  }
}

async function saveNotifIds(map: NotifIdMap): Promise<void> {
  await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(map));
}

// ─── Schedule ────────────────────────────────────────────────────────────────

/**
 * Schedule two reminders for a homework item:
 *  1. Evening before (7 PM the day before the due date)
 *  2. Morning of (8 AM on the due date)
 *
 * If the trigger time is already in the past it is silently skipped.
 */
export async function scheduleHomeworkReminders(
  problemId: string,
  homeworkTitle: string,
  dueDateIso: string
): Promise<void> {
  if (Platform.OS === "web") return;
  const granted = await requestNotifPermission();
  if (!granted) return;

  const dueDate = new Date(dueDateIso);
  const ids: string[] = [];
  const now = Date.now();

  // Evening before: 7 PM the day before
  const evening = new Date(dueDate);
  evening.setDate(evening.getDate() - 1);
  evening.setHours(19, 0, 0, 0);
  if (evening.getTime() > now) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "📚 Homework due tomorrow",
          body: homeworkTitle,
          data: { problemId },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: evening },
      });
      ids.push(id);
    } catch { /* skip if past */ }
  }

  // Morning of: 8 AM on due date
  const morning = new Date(dueDate);
  morning.setHours(8, 0, 0, 0);
  if (morning.getTime() > now) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "📚 Homework due today",
          body: homeworkTitle,
          data: { problemId },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: morning },
      });
      ids.push(id);
    } catch { /* skip if past */ }
  }

  if (ids.length > 0) {
    const map = await getNotifIds();
    map[problemId] = ids;
    await saveNotifIds(map);
  }
}

// ─── Cancel ──────────────────────────────────────────────────────────────────

/** Cancel all scheduled reminders for a homework item. */
export async function cancelHomeworkReminders(problemId: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const map = await getNotifIds();
    const ids = map[problemId] ?? [];
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    delete map[problemId];
    await saveNotifIds(map);
  } catch { /* ignore */ }
}

/** Cancel all homework reminders (e.g. when leaving a classroom). */
export async function cancelAllHomeworkReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const map = await getNotifIds();
    const allIds = Object.values(map).flat();
    await Promise.all(allIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    await AsyncStorage.removeItem(NOTIF_IDS_KEY);
  } catch { /* ignore */ }
}
