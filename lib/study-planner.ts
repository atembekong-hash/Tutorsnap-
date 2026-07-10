/**
 * TutorSnap — Study Planner
 *
 * Manages weekly study schedule: time slots per day with subject, duration,
 * and optional local notification reminders.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SubjectId } from "@/lib/subjects";

const PLANNER_KEY = "@tutorsnap/studyPlanner";
const NOTIF_IDS_KEY = "@tutorsnap/plannerNotifIds";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, …

export interface StudySlot {
  id: string;
  weekday: Weekday;
  hour: number;
  minute: number;
  durationMinutes: number;
  subject: SubjectId;
  label: string;
  notifyEnabled: boolean;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Load all study slots */
export async function loadStudySlots(): Promise<StudySlot[]> {
  try {
    const raw = await AsyncStorage.getItem(PLANNER_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StudySlot[];
  } catch {
    return [];
  }
}

/** Save all study slots */
export async function saveStudySlots(slots: StudySlot[]): Promise<void> {
  await AsyncStorage.setItem(PLANNER_KEY, JSON.stringify(slots));
}

/** Add or update a study slot */
export async function upsertStudySlot(slot: StudySlot): Promise<StudySlot[]> {
  const slots = await loadStudySlots();
  const idx = slots.findIndex((s) => s.id === slot.id);
  if (idx >= 0) {
    slots[idx] = slot;
  } else {
    slots.push(slot);
  }
  await saveStudySlots(slots);
  return slots;
}

/** Delete a study slot by id */
export async function deleteStudySlot(id: string): Promise<StudySlot[]> {
  const slots = await loadStudySlots();
  const updated = slots.filter((s) => s.id !== id);
  await saveStudySlots(updated);
  return updated;
}

/** Format hour/minute as 12-hour time string */
export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${period}`;
}

/** Schedule weekly notifications for all slots that have notifyEnabled */
export async function syncPlannerNotifications(slots: StudySlot[]): Promise<void> {
  if (Platform.OS === "web") return;

  // Cancel all previously scheduled planner notifications
  try {
    const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    if (raw) {
      const ids: string[] = JSON.parse(raw);
      await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
    }
  } catch { /* ignore */ }

  // Set up Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("study-planner", {
      name: "Study Planner",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const newIds: string[] = [];
  for (const slot of slots) {
    if (!slot.notifyEnabled) continue;
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📚 Study time: ${slot.label}`,
          body: `${slot.durationMinutes} min session scheduled. Open TutorSnap to get started!`,
          sound: true,
          data: { slotId: slot.id, subject: slot.subject },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: slot.weekday + 1, // expo-notifications: 1=Sunday, 2=Monday, …
          hour: slot.hour,
          minute: slot.minute,
        },
      });
      newIds.push(id);
    } catch { /* ignore individual failures */ }
  }

  await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(newIds));
}

/** Generate a unique slot ID */
export function generateSlotId(): string {
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
