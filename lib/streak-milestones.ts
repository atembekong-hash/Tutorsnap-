/**
 * Streak milestone celebration logic.
 * Milestones: 3, 7, 14, 30 days.
 * Each milestone fires exactly once (tracked in AsyncStorage).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const STREAK_MILESTONES = [3, 7, 14, 30] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

const CELEBRATED_KEY = "@tutorsnap/celebratedMilestones";

export interface MilestoneInfo {
  days: StreakMilestone;
  emoji: string;
  title: string;
  subtitle: string;
}

const MILESTONE_INFO: Record<StreakMilestone, MilestoneInfo> = {
  3: {
    days: 3,
    emoji: "🔥",
    title: "3-Day Streak!",
    subtitle: "You're on fire! Keep the momentum going.",
  },
  7: {
    days: 7,
    emoji: "⚡",
    title: "7-Day Streak!",
    subtitle: "One full week of learning — incredible!",
  },
  14: {
    days: 14,
    emoji: "💪",
    title: "14-Day Streak!",
    subtitle: "Two weeks strong. You're unstoppable!",
  },
  30: {
    days: 30,
    emoji: "🏆",
    title: "30-Day Streak!",
    subtitle: "A whole month! You're a TutorSnap legend.",
  },
};

/** Returns the set of milestone day counts already celebrated. */
async function getCelebrated(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(CELEBRATED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

/** Marks a milestone as celebrated so it never fires again. */
async function markCelebrated(days: number): Promise<void> {
  const set = await getCelebrated();
  set.add(days);
  await AsyncStorage.setItem(CELEBRATED_KEY, JSON.stringify(Array.from(set)));
}

/**
 * Given the current streak count, returns the MilestoneInfo for any
 * uncelebrated milestone that the streak has just reached or passed.
 * Returns null if no new milestone should fire.
 *
 * Call this after every recordSolve() or recordQuizBonus() that may
 * have incremented the streak.
 */
export async function checkStreakMilestone(
  currentStreak: number
): Promise<MilestoneInfo | null> {
  if (currentStreak <= 0) return null;
  const celebrated = await getCelebrated();

  // Find the highest uncelebrated milestone that the streak has reached
  // (iterate in ascending order so we always show the freshest one)
  let hit: StreakMilestone | null = null;
  for (const m of STREAK_MILESTONES) {
    if (currentStreak >= m && !celebrated.has(m)) {
      hit = m;
    }
  }

  if (hit === null) return null;

  await markCelebrated(hit);
  return MILESTONE_INFO[hit];
}
