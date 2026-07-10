/**
 * lib/subscription.ts
 *
 * RevenueCat subscription layer for TutorSnap.
 *
 * Product IDs (configure these in App Store Connect & Google Play Console):
 *   - tutorsnap_monthly   → $9.99/month, 14-day free trial
 *   - tutorsnap_annual    → $69.99/year, 14-day free trial
 *
 * Entitlement ID in RevenueCat dashboard: "premium"
 *
 * On first launch the SDK is configured with the RevenueCat API key.
 * If the key is not yet set (EXPO_PUBLIC_RC_API_KEY_IOS / _ANDROID), the module
 * falls back to a "dev mode" where every user is treated as premium so
 * development is not blocked.
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
export const FREE_LIMITS = {
  solvesPerDay: 3,
  quizQuestionsPerDay: 5,
  chatMessagesPerSession: 5,
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

// ─── RevenueCat initialisation ───────────────────────────────────────────────

let _rcInitialised = false;
let _devMode = false; // true when no API key is configured

export async function initRevenueCat(): Promise<void> {
  if (_rcInitialised) return;
  if (Platform.OS === "web") {
    _devMode = true;
    _rcInitialised = true;
    return;
  }

  const iosKey = process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? "";
  const androidKey = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? "";
  const apiKey = Platform.OS === "ios" ? iosKey : androidKey;

  if (!apiKey) {
    // No key configured yet — run in dev mode (all features unlocked)
    _devMode = true;
    _rcInitialised = true;
    return;
  }

  try {
    const Purchases = (await import("react-native-purchases")).default;
    Purchases.configure({ apiKey });
    _rcInitialised = true;
  } catch {
    _devMode = true;
    _rcInitialised = true;
  }
}

// ─── Entitlement check ────────────────────────────────────────────────────────

export interface SubscriptionStatus {
  isPremium: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  activeProductId: string | null;
  /** true when RevenueCat key is not yet configured */
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

  try {
    const Purchases = (await import("react-native-purchases")).default;
    const info = await Purchases.getCustomerInfo();
    const entitlement = info.entitlements.active[RC_ENTITLEMENT_ID];
    const isPremium = !!entitlement || isTrialActive;
    const activeProductId = entitlement?.productIdentifier ?? null;
    return {
      isPremium,
      isTrialActive: isTrialActive && !entitlement,
      trialDaysRemaining,
      activeProductId,
      isDevMode: false,
    };
  } catch {
    // Network error — grant access if trial is still active
    return {
      isPremium: isTrialActive,
      isTrialActive,
      trialDaysRemaining,
      activeProductId: null,
      isDevMode: false,
    };
  }
}

// ─── Purchase helpers ─────────────────────────────────────────────────────────

export type PurchaseResult =
  | { success: true; productId: string }
  | { success: false; cancelled: boolean; error?: string };

export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  if (_devMode || Platform.OS === "web") {
    return { success: true, productId };
  }
  try {
    const Purchases = (await import("react-native-purchases")).default;
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return { success: false, cancelled: false, error: "No offerings available" };

    const pkg = current.availablePackages.find(
      (p) => p.product.identifier === productId
    );
    if (!pkg) return { success: false, cancelled: false, error: "Product not found" };

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = !!customerInfo.entitlements.active[RC_ENTITLEMENT_ID];
    return active
      ? { success: true, productId }
      : { success: false, cancelled: false, error: "Entitlement not active after purchase" };
  } catch (e: any) {
    if (e?.userCancelled) return { success: false, cancelled: true };
    return { success: false, cancelled: false, error: e?.message ?? "Purchase failed" };
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (_devMode || Platform.OS === "web") return false;
  try {
    const Purchases = (await import("react-native-purchases")).default;
    const info = await Purchases.restorePurchases();
    return !!info.entitlements.active[RC_ENTITLEMENT_ID];
  } catch {
    return false;
  }
}

export async function openManageSubscriptions(): Promise<void> {
  if (_devMode || Platform.OS === "web") return;
  try {
    const Purchases = (await import("react-native-purchases")).default;
    await Purchases.showManageSubscriptions();
  } catch { /* ignore */ }
}

// ─── Offerings (for displaying prices from the store) ────────────────────────

export interface OfferingPackage {
  productId: string;
  title: string;
  priceString: string;
  introPrice: string | null;
}

export async function getOfferings(): Promise<OfferingPackage[]> {
  if (_devMode || Platform.OS === "web") {
    // Return mock data so the paywall renders correctly in dev/web
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
  try {
    const Purchases = (await import("react-native-purchases")).default;
    const offerings = await Purchases.getOfferings();
    const pkgs = offerings.current?.availablePackages ?? [];
    return pkgs.map((p) => ({
      productId: p.product.identifier,
      title: p.product.title,
      priceString: p.product.priceString,
      introPrice: p.product.introPrice?.priceString ?? null,
    }));
  } catch {
    return [];
  }
}
