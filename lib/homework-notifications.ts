import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { isNotifEnabled } from "./notification-prefs";

const ASSIGNMENT_NOTIF_IDS_KEY = "@tutorsnap/classroom_assignment_reminder_ids_v2";
const CHANNEL_ID = "classroom-assignments";

type StoredReminder = {
  classroomId: string;
  assignmentId: string;
  dueAt: string;
  notificationIds: string[];
};

type ReminderMap = Record<string, StoredReminder>;

export type ReminderAssignment = {
  id: string;
  title: string;
  dueAt: Date | string | null;
  status: "pending" | "complete";
};

async function requestAssignmentNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Class assignment reminders",
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

async function readReminderMap(): Promise<ReminderMap> {
  try {
    const raw = await AsyncStorage.getItem(ASSIGNMENT_NOTIF_IDS_KEY);
    return raw ? (JSON.parse(raw) as ReminderMap) : {};
  } catch {
    return {};
  }
}

async function writeReminderMap(map: ReminderMap): Promise<void> {
  await AsyncStorage.setItem(ASSIGNMENT_NOTIF_IDS_KEY, JSON.stringify(map));
}

async function cancelStoredReminder(reminder: StoredReminder): Promise<void> {
  await Promise.all(
    reminder.notificationIds.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
    ),
  );
}

function reminderTimes(dueAt: Date): Date[] {
  const eveningBefore = new Date(dueAt);
  eveningBefore.setDate(eveningBefore.getDate() - 1);
  eveningBefore.setHours(19, 0, 0, 0);

  const morningOf = new Date(dueAt);
  morningOf.setHours(8, 0, 0, 0);

  return [eveningBefore, morningOf].filter((date) => date.getTime() > Date.now());
}

async function scheduleOneAssignment(
  classroomId: string,
  assignment: ReminderAssignment,
): Promise<StoredReminder | null> {
  if (Platform.OS === "web" || !assignment.dueAt || assignment.status === "complete") return null;
  const dueAt = assignment.dueAt instanceof Date ? assignment.dueAt : new Date(assignment.dueAt);
  if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= Date.now()) return null;

  const notificationIds: string[] = [];
  for (const [index, date] of reminderTimes(dueAt).entries()) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: index === 0 ? "Assignment due tomorrow" : "Assignment due today",
          body: assignment.title,
          data: {
            type: "classroom_assignment_reminder",
            screen: "classroom_assignment",
            classroomId,
            assignmentId: assignment.id,
          },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
        },
      });
      notificationIds.push(notificationId);
    } catch {
      // A reminder can become stale between computation and scheduling.
    }
  }

  return notificationIds.length > 0
    ? {
        classroomId,
        assignmentId: assignment.id,
        dueAt: dueAt.toISOString(),
        notificationIds,
      }
    : null;
}

/**
 * Reconcile local reminders with the learner's current published assignment list.
 * Completed, removed, archived, or rescheduled assignments are cancelled first.
 */
export async function syncAssignmentReminders(
  classroomId: string,
  assignments: ReminderAssignment[],
): Promise<void> {
  if (Platform.OS === "web") return;
  const enabled = await isNotifEnabled("studyReminders");
  const map = await readReminderMap();
  const relevant = Object.values(map).filter((entry) => entry.classroomId === classroomId);

  const activeAssignments = enabled
    ? assignments.filter((assignment) => {
        if (assignment.status === "complete" || !assignment.dueAt) return false;
        const dueAt = assignment.dueAt instanceof Date ? assignment.dueAt : new Date(assignment.dueAt);
        return !Number.isNaN(dueAt.getTime()) && dueAt.getTime() > Date.now();
      })
    : [];
  const activeIds = new Set(activeAssignments.map((assignment) => assignment.id));

  for (const stored of relevant) {
    const active = activeAssignments.find((assignment) => assignment.id === stored.assignmentId);
    const activeDueAt = active?.dueAt ? new Date(active.dueAt).toISOString() : null;
    if (!activeIds.has(stored.assignmentId) || activeDueAt !== stored.dueAt) {
      await cancelStoredReminder(stored);
      delete map[stored.assignmentId];
    }
  }

  if (activeAssignments.length === 0) {
    await writeReminderMap(map);
    return;
  }

  const granted = await requestAssignmentNotificationPermission();
  if (!granted) {
    await writeReminderMap(map);
    return;
  }

  for (const assignment of activeAssignments) {
    if (map[assignment.id]) continue;
    const scheduled = await scheduleOneAssignment(classroomId, assignment);
    if (scheduled) map[assignment.id] = scheduled;
  }
  await writeReminderMap(map);
}

export async function cancelAssignmentReminders(assignmentId: string): Promise<void> {
  if (Platform.OS === "web") return;
  const map = await readReminderMap();
  const reminder = map[assignmentId];
  if (!reminder) return;
  await cancelStoredReminder(reminder);
  delete map[assignmentId];
  await writeReminderMap(map);
}

export async function cancelClassroomAssignmentReminders(classroomId: string): Promise<void> {
  if (Platform.OS === "web") return;
  const map = await readReminderMap();
  const reminders = Object.values(map).filter((entry) => entry.classroomId === classroomId);
  await Promise.all(reminders.map(cancelStoredReminder));
  for (const reminder of reminders) delete map[reminder.assignmentId];
  await writeReminderMap(map);
}

export async function cancelAllHomeworkReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  const map = await readReminderMap();
  await Promise.all(Object.values(map).map(cancelStoredReminder));
  await AsyncStorage.removeItem(ASSIGNMENT_NOTIF_IDS_KEY);
}
