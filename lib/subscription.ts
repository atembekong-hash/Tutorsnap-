/**
 * lib/subscription.ts
 *
 * Local subscription layer for TutorSnap.
 *
 * Product IDs (configure these in App Store Connect & Google Play Console):
 *   - tutorsnap_monthly   → $9.99/month, 14-day free trial
 *   - tutorsnap_annual    → $69.99/year, 14-day free trial
 *
 * This module manages subscription state locally using AsyncStorage.
 * When RevenueCat integration is needed in the future, add react-native-purchases
 * back once a version compatible with the project's architecture is available.
 *
 * Current behavior:
 * - All users get a 14-day free trial from first launch
 * - After trial expires, free tier limits apply
 * - Premium purchase state is stored locally (for development/testing)
 * - In dev mode (__DEV__), all features are unlocked
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Product / Entitlement constants ─────────────────────────────────────────
export const RC_ENTITLEMENT_ID = "premium";
export const PRODUCT_MONTHLY = "tutorsnap_monthly";
export const PRODUCT_ANNUAL = "tutorsnap_annual";

// Pricing display (mirrors what you set in the stores)
export const PRICE_MONTHLY = 9.99;
export const PRICE_ANNUAL = 69.99;
export const PRICE_ANNUAL_MONTHLY_EQUIV = +(PRICE_ANNUAL / 12).toFixed(2); // 5.83
export const DISCOUNT_PCT = Math.round(
  ((PRICE_MONTHLY * 12 - PRICE_ANNUAL) / (PRICE_MONTHLY * 12)) * 100
); // 42

// ─── Trial tracking (local, for UI purposes) ─────────────────────────────────
const TRIAL_START_KEY = "@tutorsnap/trialStartedAt";
const PREMIUM_KEY = "@tutorsnap/premiumActive";
const PREMIUM_PRODUCT_KEY = "@tutorsnap/premiumProductId";

export async function getTrialStartDate(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(TRIAL_START_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export async function ensureTrialStartRecorded(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(TRIAL_START_KEY);
    if (!existing) {
      await AsyncStorage.setItem(TRIAL_START_KEY, String(Date.now()));
    }
  } catch { /* ignore */ }
}

export function getTrialDaysRemaining(trialStartMs: number): number {
  const TRIAL_DAYS = 14;
  const elapsed = (Date.now() - trialStartMs) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
}

// ─── Usage limits (free / trial tier) ────────────────────────────────────────
// Free users get 2 solves/day, 3 quiz questions/day, 3 chat messages/session.
// Premium (paid or trial) users have no limits.
export const FREE_LIMITS = {
  solvesPerDay: 2,
  quizQuestionsPerDay: 3,
  chatMessagesPerSession: 3,
} as const;

const USAGE_KEY = (type: string) => `@tutorsnap/usage/${type}/${new Date().toDateString()}`;

export async function getUsageCount(type: "solves" | "quiz" | "chat"): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(USAGE_KEY(type));
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export async function incrementUsage(type: "solves" | "quiz" | "chat"): Promise<number> {
  try {
    const current = await getUsageCount(type);
    const next = current + 1;
    await AsyncStorage.setItem(USAGE_KEY(type), String(next));
    return next;
  } catch {
    return 0;
  }
}

// ─── Subscription initialisation ────────────────────────────────────────────

let _initialised = false;
let _devMode = false; // true in __DEV__ or when no store integration is configured

export async function initRevenueCat(): Promise<void> {
  if (_initialised) return;

  // In development or web, unlock all features
  if (__DEV__ || Platform.OS === "web") {
    _devMode = true;
    _initialised = true;
    return;
  }

  // In production builds, check if RevenueCat keys are configured
  const iosKey = process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? "";
  const androidKey = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? "";
  const apiKey = Platform.OS === "ios" ? iosKey : androidKey;

  if (!apiKey || apiKey.startsWith("test_")) {
    // No production key configured — use local subscription management
    // Trial + local premium state will be used
    _initialised = true;
    return;
  }

  // Future: when a compatible react-native-purchases version is available,
  // initialize it here. For now, use local management.
  _initialised = true;
}

// ─── Entitlement check ────────────────────────────────────────────────────────

export interface SubscriptionStatus {
  isPremium: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  activeProductId: string | null;
  /** true when in development mode (all features unlocked) */
  isDevMode: boolean;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  await initRevenueCat();
  await ensureTrialStartRecorded();

  const trialStart = await getTrialStartDate();
  const trialDaysRemaining = trialStart ? getTrialDaysRemaining(trialStart) : 14;
  const isTrialActive = trialDaysRemaining > 0;

  if (_devMode) {
    return {
      isPremium: true,
      isTrialActive,
      trialDaysRemaining,
      activeProductId: null,
      isDevMode: true,
    };
  }

  // Check local premium state
  try {
    const premiumActive = await AsyncStorage.getItem(PREMIUM_KEY);
    const productId = await AsyncStorage.getItem(PREMIUM_PRODUCT_KEY);

    if (premiumActive === "true") {
      return {
        isPremium: true,
        isTrialActive: false,
        trialDaysRemaining,
        activeProductId: productId,
        isDevMode: false,
      };
    }
  } catch { /* ignore */ }

  // Not premium — check trial
  return {
    isPremium: isTrialActive,
    isTrialActive,
    trialDaysRemaining,
    activeProductId: null,
    isDevMode: false,
  };
}

// ─── Purchase helpers ─────────────────────────────────────────────────────────

export type PurchaseResult =
  | { success: true; productId: string }
  | { success: false; cancelled: boolean; error?: string };

export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  if (_devMode || Platform.OS === "web") {
    // In dev mode, simulate a successful purchase
    await AsyncStorage.setItem(PREMIUM_KEY, "true");
    await AsyncStorage.setItem(PREMIUM_PRODUCT_KEY, productId);
    return { success: true, productId };
  }

  // In production without RevenueCat, inform user that purchases
  // will be available through the App Store / Google Play
  return {
    success: false,
    cancelled: false,
    error: "In-app purchases will be available when the app is published to the stores. Your 14-day free trial is active.",
  };
}

export async function restorePurchases(): Promise<boolean> {
  if (_devMode || Platform.OS === "web") return false;

  // Check local premium state
  try {
    const premiumActive = await AsyncStorage.getItem(PREMIUM_KEY);
    return premiumActive === "true";
  } catch {
    return false;
  }
}

export async function openManageSubscriptions(): Promise<void> {
  // Cannot open native subscription manager without store integration
  throw new Error("manage_subscriptions_unavailable");
}

// ─── Offerings (for displaying prices from the store) ────────────────────────

export interface OfferingPackage {
  productId: string;
  title: string;
  priceString: string;
  introPrice: string | null;
}

export async function getOfferings(): Promise<OfferingPackage[]> {
  // Return static pricing data for the paywall UI
  return [
    {
      productId: PRODUCT_MONTHLY,
      title: "Monthly",
      priceString: `$${PRICE_MONTHLY.toFixed(2)}/mo`,
      introPrice: "Free for 14 days",
    },
    {
      productId: PRODUCT_ANNUAL,
      title: "Annual",
      priceString: `$${PRICE_ANNUAL.toFixed(2)}/yr`,
      introPrice: "Free for 14 days",
    },
  ];
}
