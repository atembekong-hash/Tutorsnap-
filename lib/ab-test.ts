/**
 * lib/ab-test.ts
 * Lightweight A/B test framework for TutorSnap.
 *
 * Currently manages one experiment: the paywall trial variant.
 *   - "14day"       → 14-day free trial (control)
 *   - "7day_50off"  → 7-day free trial + 50% off first month (variant B)
 *
 * Assignment is deterministic: derived from a stable install-ID hash so the
 * same device always lands in the same bucket, even after reinstall of the
 * same build.  The variant can be overridden at any time (e.g. from a
 * remote-config fetch or a debug menu).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrialVariant = "14day" | "7day_50off";

export interface TrialVariantConfig {
  variant: TrialVariant;
  /** Badge text shown in the paywall hero section */
  badgeText: string;
  /** Number of trial days */
  trialDays: number;
  /** CTA sub-label shown under the subscribe button */
  ctaSubLabel: string;
  /** Bullet text for the onboarding trial slide */
  onboardingBullet: string;
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const TRIAL_VARIANT_KEY = "@tutorsnap/trialVariant";
const TRIAL_VARIANT_LOCKED_KEY = "@tutorsnap/trialVariantLocked";
const INSTALL_ID_KEY = "@tutorsnap/installId";
const AB_ANALYTICS_KEY = "@tutorsnap/ab_analytics_events";
const MAX_AB_EVENTS = 500;

// ── Variant configs ───────────────────────────────────────────────────────────

const VARIANT_CONFIGS: Record<TrialVariant, TrialVariantConfig> = {
  "14day": {
    variant: "14day",
    badgeText: "14-Day Free Trial",
    trialDays: 14,
    ctaSubLabel: "14-day free trial, then cancel anytime",
    onboardingBullet: "14-day free trial, cancel anytime",
  },
  "7day_50off": {
    variant: "7day_50off",
    badgeText: "7-Day Free Trial + 50% Off",
    trialDays: 7,
    ctaSubLabel: "7-day free trial, then 50% off your first month",
    onboardingBullet: "7-day free trial + 50% off first month",
  },
};

// ── Install ID ────────────────────────────────────────────────────────────────

/** Returns a stable random install ID, creating one on first call. */
async function getInstallId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
    if (existing) return existing;
    // Generate a simple random ID
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await AsyncStorage.setItem(INSTALL_ID_KEY, id);
    return id;
  } catch {
    return "fallback";
  }
}

/** Simple djb2 hash → 0..99 bucket */
function hashToBucket(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash % 100;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the trial variant config for this install.
 * - First checks if the variant is locked (set after trial started) — if so,
 *   returns the stored variant without re-randomising.
 * - Then checks for an explicit override stored in AsyncStorage.
 * - Falls back to deterministic assignment from install ID hash.
 * - 50% control (14day), 50% variant B (7day_50off).
 */
export async function getTrialVariantConfig(): Promise<TrialVariantConfig> {
  try {
    // If variant is locked, always return the stored variant (no re-randomisation)
    const locked = await AsyncStorage.getItem(TRIAL_VARIANT_LOCKED_KEY);
    if (locked === "true") {
      const stored = await AsyncStorage.getItem(TRIAL_VARIANT_KEY);
      if (stored === "14day" || stored === "7day_50off") {
        return VARIANT_CONFIGS[stored];
      }
    }
    // Check for explicit override (set by remote config fetch or debug menu)
    const override = await AsyncStorage.getItem(TRIAL_VARIANT_KEY);
    if (override === "14day" || override === "7day_50off") {
      return VARIANT_CONFIGS[override];
    }
    // Deterministic assignment from install ID
    const installId = await getInstallId();
    const bucket = hashToBucket(installId);
    const variant: TrialVariant = bucket < 50 ? "14day" : "7day_50off";
    // Persist so future calls are instant
    await AsyncStorage.setItem(TRIAL_VARIANT_KEY, variant);
    return VARIANT_CONFIGS[variant];
  } catch {
    return VARIANT_CONFIGS["14day"]; // safe fallback
  }
}

/**
 * Override the trial variant (e.g. from a remote config fetch or debug menu).
 * Pass null to clear the override and revert to hash-based assignment.
 */
export async function setTrialVariant(variant: TrialVariant | null): Promise<void> {
  try {
    if (variant === null) {
      await AsyncStorage.removeItem(TRIAL_VARIANT_KEY);
    } else {
      await AsyncStorage.setItem(TRIAL_VARIANT_KEY, variant);
    }
  } catch {
    // non-critical
  }
}

/**
 * Lock the current trial variant so it is never re-randomised.
 * Call this after a trial is successfully started to ensure the user
 * always sees the same variant they converted on.
 * Fire-and-forget — never throws.
 */
export async function lockVariant(): Promise<void> {
  try {
    await AsyncStorage.setItem(TRIAL_VARIANT_LOCKED_KEY, "true");
  } catch {
    // non-critical
  }
}

/**
 * Unlock the variant lock (e.g. for testing or after a refund).
 * Fire-and-forget — never throws.
 */
export async function unlockVariant(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TRIAL_VARIANT_LOCKED_KEY);
  } catch {
    // non-critical
  }
}

/** Synchronously returns the default config (for SSR / initial render). */
export function getDefaultTrialVariantConfig(): TrialVariantConfig {
  return VARIANT_CONFIGS["14day"];
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export type AbTestEvent = "paywall_view" | "trial_started" | "purchase_completed" | "restore_completed";

export interface AbTestAnalyticsEvent {
  event: AbTestEvent;
  variant: TrialVariant;
  timestamp: number;
  /** Optional extra metadata (e.g. selected plan product ID) */
  meta?: Record<string, string | number | boolean>;
}

/**
 * Log an A/B test analytics event to local AsyncStorage.
 * Fire-and-forget — never throws.
 *
 * Events stored:
 *   - paywall_view      : user opened the paywall screen
 *   - trial_started     : user tapped "Start Free Trial" and purchase succeeded
 *   - purchase_completed: user completed a paid purchase (no trial)
 *   - restore_completed : user restored a previous purchase
 *
 * @example
 *   logAbTestEvent("paywall_view", trialVariant.variant);
 *   logAbTestEvent("trial_started", trialVariant.variant, { plan: selectedPlan });
 */
export async function logAbTestEvent(
  event: AbTestEvent,
  variant: TrialVariant,
  meta?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    const entry: AbTestAnalyticsEvent = {
      event,
      variant,
      timestamp: Date.now(),
      ...(meta ? { meta } : {}),
    };
    const stored = await AsyncStorage.getItem(AB_ANALYTICS_KEY);
    const events: AbTestAnalyticsEvent[] = stored ? JSON.parse(stored) : [];
    events.push(entry);
    // Keep only the most recent MAX_AB_EVENTS to avoid unbounded growth
    if (events.length > MAX_AB_EVENTS) events.splice(0, events.length - MAX_AB_EVENTS);
    await AsyncStorage.setItem(AB_ANALYTICS_KEY, JSON.stringify(events));
  } catch {
    // non-critical — never throw
  }
}

/**
 * Retrieve all stored A/B test analytics events.
 * Returns an empty array on error.
 */
export async function getAbTestAnalyticsEvents(): Promise<AbTestAnalyticsEvent[]> {
  try {
    const stored = await AsyncStorage.getItem(AB_ANALYTICS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Clear all stored A/B test analytics events.
 * Call after exporting/uploading to a backend.
 */
export async function clearAbTestAnalyticsEvents(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AB_ANALYTICS_KEY);
  } catch {
    // non-critical
  }
}
