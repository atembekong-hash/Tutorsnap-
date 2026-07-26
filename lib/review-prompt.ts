/**
 * lib/review-prompt.ts
 *
 * Triggers the native App Store / Google Play review prompt at the right moment.
 *
 * Trigger conditions:
 *  - After the user's 5th solved problem (first milestone), then at 10, 25, 50, 100
 *  - App has been installed for at least 3 days
 *  - Prompt has not been shown in the last 30 days (rate-limiting)
 *  - After a quiz score >= 80%
 *
 * Uses expo-store-review which is already in package.json.
 * The OS may silently suppress the dialog — this is expected behavior.
 */

import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const FIRST_LAUNCH_KEY = "@tutorsnap/firstLaunchDate";
const LAST_REVIEW_KEY = "@tutorsnap/lastReviewPromptDate";

const MIN_DAYS_SINCE_INSTALL = 3;
const MIN_DAYS_BETWEEN_PROMPTS = 30;

/** Record the first launch date if not already stored. Call on app start. */
export async function recordFirstLaunch(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    if (!existing) {
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, Date.now().toString());
    }
  } catch { /* ignore */ }
}

/** Returns the number of days since the first launch. */
async function daysSinceInstall(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    if (!raw) return 0;
    return (Date.now() - parseInt(raw, 10)) / (1000 * 60 * 60 * 24);
  } catch {
    return 0;
  }
}

/** Returns the number of days since the last review prompt was shown. */
async function daysSinceLastPrompt(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LAST_REVIEW_KEY);
    if (!raw) return Infinity;
    return (Date.now() - parseInt(raw, 10)) / (1000 * 60 * 60 * 24);
  } catch {
    return Infinity;
  }
}

/** Shared guard: checks availability, install age, and cooldown. */
async function canPrompt(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return false;
    const daysInstalled = await daysSinceInstall();
    if (daysInstalled < MIN_DAYS_SINCE_INSTALL) return false;
    const daysSinceLast = await daysSinceLastPrompt();
    if (daysSinceLast < MIN_DAYS_BETWEEN_PROMPTS) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempt to show the native review prompt after a quiz result.
 *
 * @param quizScorePct - The quiz score percentage (0-100). Prompt only fires for >= 80.
 *
 * Call this after a quiz result is shown. The function is a no-op on web
 * and silently skips if conditions are not met.
 */
export async function maybeRequestReview(quizScorePct: number): Promise<void> {
  if (quizScorePct < 80) return;
  try {
    if (!(await canPrompt())) return;
    await StoreReview.requestReview();
    await AsyncStorage.setItem(LAST_REVIEW_KEY, Date.now().toString());
  } catch { /* ignore — review prompt errors should never crash the app */ }
}

/**
 * Solve-count milestones that trigger the review prompt.
 * First trigger: 5th solve (early engagement signal).
 * Subsequent triggers: 10, 25, 50, 100 (long-term engagement).
 */
const SOLVE_MILESTONES = new Set([5, 10, 25, 50, 100]);

/**
 * Call after every successful problem solve.
 * Triggers the review prompt at the 5th, 10th, 25th, 50th, and 100th solve,
 * subject to the same install-age and rate-limit guards.
 *
 * @param totalSolves - The user's all-time solve count (after the latest solve).
 */
export async function maybeRequestReviewOnSolve(totalSolves: number): Promise<void> {
  if (!SOLVE_MILESTONES.has(totalSolves)) return;
  try {
    if (!(await canPrompt())) return;
    await StoreReview.requestReview();
    await AsyncStorage.setItem(LAST_REVIEW_KEY, Date.now().toString());
  } catch { /* ignore — review prompt errors should never crash the app */ }
}
