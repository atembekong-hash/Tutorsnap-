/**
 * lib/subscription.ts
 *
 * RevenueCat subscription layer for TutorSnap.
 *
 * Product IDs (configure these in App Store Connect & Google Play Console):
 *   - tutorsnap_monthly   → $9.99/month, 14-day free trial
 *   - tutorsnap_annual    → $69.99/year, 14-day free trial
 *
 * Environment variables:
 *   EXPO_PUBLIC_REVENUECAT_APPLE_KEY  — iOS public key (starts with appl_)
 *   EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY — Android public key (starts with goog_)
 *
 * Behaviour:
 * - In __DEV__ or web: all features unlocked (no SDK calls)
 * - In production iOS/Android: real RevenueCat SDK used
 * - Falls back to local AsyncStorage trial if SDK not configured
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

// ─── RevenueCat SDK (lazy import to avoid web/dev crashes) ───────────────────

let _initialised = false;
let _devMode = false;
let _rcAvailable = false; // true when SDK was successfully configured

async function getPurchases() {
  // Dynamic import so web bundle doesn't crash on missing native module
  const mod = await import("react-native-purchases");
  return mod.default;
}

// ─── Subscription initialisation ────────────────────────────────────────────

export async function initRevenueCat(): Promise<void> {
  if (_initialised) return;

  // In development or web, unlock all features without SDK
  if (__DEV__ || Platform.OS === "web") {
    _devMode = true;
    _initialised = true;
    return;
  }

  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ?? "";
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY ?? "";
  const apiKey = Platform.OS === "ios" ? iosKey : androidKey;

  if (!apiKey) {
    // No key configured — fall back to local trial management
    console.warn(
      "[RevenueCat] No API key configured. Set EXPO_PUBLIC_REVENUECAT_APPLE_KEY (iOS) " +
      "or EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY (Android) in your environment."
    );
    _initialised = true;
    return;
  }

  // Validate key format — iOS keys start with 'appl_', Android with 'goog_'
  const expectedPrefix = Platform.OS === "ios" ? "appl_" : "goog_";
  if (!apiKey.startsWith(expectedPrefix)) {
    console.warn(
      `[RevenueCat] API key format looks wrong for ${Platform.OS}. ` +
      `Expected key starting with '${expectedPrefix}', got '${apiKey.slice(0, 8)}...'. ` +
      "Check your RevenueCat dashboard → Project → API Keys."
    );
  }

  try {
    const Purchases = await getPurchases();
    Purchases.configure({ apiKey });
    _rcAvailable = true;
    _initialised = true;
  } catch (err) {
    console.warn("[RevenueCat] configure failed:", err);
    _initialised = true;
  }
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

  // Check RevenueCat entitlement (production)
  if (_rcAvailable) {
    try {
      const Purchases = await getPurchases();
      const customerInfo = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[RC_ENTITLEMENT_ID];
      if (entitlement) {
        return {
          isPremium: true,
          isTrialActive: false,
          trialDaysRemaining,
          activeProductId: entitlement.productIdentifier,
          isDevMode: false,
        };
      }
    } catch (err) {
      console.warn("[RevenueCat] getCustomerInfo failed:", err);
    }
  }

  // Fall back to local premium state (e.g. after offline purchase)
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
  await initRevenueCat();

  if (_devMode || Platform.OS === "web") {
    // Dev / web: grant immediately
    await AsyncStorage.setItem(PREMIUM_KEY, "true");
    await AsyncStorage.setItem(PREMIUM_PRODUCT_KEY, productId);
    return { success: true, productId };
  }

  if (_rcAvailable) {
    try {
      const Purchases = await getPurchases();
      // Get the current offering and find the matching package
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current) {
        return { success: false, cancelled: false, error: "No offerings available" };
      }

      const pkg = current.availablePackages.find(
        (p) => p.product.identifier === productId
      );
      if (!pkg) {
        return { success: false, cancelled: false, error: `Product ${productId} not found in offering` };
      }

      const result = await Purchases.purchasePackage(pkg);
      const entitlement = result.customerInfo.entitlements.active[RC_ENTITLEMENT_ID];
      if (entitlement) {
        // Cache locally for offline access
        await AsyncStorage.setItem(PREMIUM_KEY, "true");
        await AsyncStorage.setItem(PREMIUM_PRODUCT_KEY, productId);
        return { success: true, productId };
      }
      return { success: false, cancelled: false, error: "Entitlement not activated" };
    } catch (err: any) {
      if (err?.userCancelled) {
        return { success: false, cancelled: true };
      }
      return { success: false, cancelled: false, error: err?.message ?? "Purchase failed" };
    }
  }

  // Fallback: local grant (no SDK)
  await AsyncStorage.setItem(PREMIUM_KEY, "true");
  await AsyncStorage.setItem(PREMIUM_PRODUCT_KEY, productId);
  return { success: true, productId };
}

export async function restorePurchases(): Promise<boolean> {
  await initRevenueCat();

  if (_devMode || Platform.OS === "web") return false;

  if (_rcAvailable) {
    try {
      const Purchases = await getPurchases();
      const customerInfo = await Purchases.restorePurchases();
      const entitlement = customerInfo.entitlements.active[RC_ENTITLEMENT_ID];
      if (entitlement) {
        await AsyncStorage.setItem(PREMIUM_KEY, "true");
        await AsyncStorage.setItem(PREMIUM_PRODUCT_KEY, entitlement.productIdentifier);
        return true;
      }
      return false;
    } catch (err) {
      console.warn("[RevenueCat] restorePurchases failed:", err);
    }
  }

  // Fallback: check local state
  try {
    const premiumActive = await AsyncStorage.getItem(PREMIUM_KEY);
    return premiumActive === "true";
  } catch {
    return false;
  }
}

export async function openManageSubscriptions(): Promise<void> {
  await initRevenueCat();
  if (_rcAvailable) {
    try {
      const Purchases = await getPurchases();
      await Purchases.showManageSubscriptions();
      return;
    } catch { /* fall through */ }
  }
  throw new Error("manage_subscriptions_unavailable");
}

// ─── User identity (link RC app_user_id to our openId) ─────────────────────────

/**
 * Call this immediately after a successful sign-in so that RevenueCat's
 * app_user_id matches the user's openId from our auth system.
 * This allows the webhook to link subscription rows to real user accounts.
 * Safe to call multiple times — RC de-dupes logIn calls.
 */
export async function loginRevenueCat(openId: string): Promise<void> {
  if (!openId || _devMode || Platform.OS === "web") return;
  await initRevenueCat();
  if (!_rcAvailable) return;
  try {
    const Purchases = await getPurchases();
    await Purchases.logIn(openId);
    console.log("[RevenueCat] Logged in as:", openId);
  } catch (err) {
    // Non-fatal — RC will still work with anonymous ID
    console.warn("[RevenueCat] logIn failed (non-fatal):", err);
  }
}

// ─── Offerings (for displaying prices from the store) ────────────────────────

export interface OfferingPackage {
  productId: string;
  title: string;
  priceString: string;
  introPrice: string | null;
}

export async function getOfferings(): Promise<OfferingPackage[]> {
  await initRevenueCat();

  if (_rcAvailable) {
    try {
      const Purchases = await getPurchases();
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (current && current.availablePackages.length > 0) {
        return current.availablePackages.map((pkg) => ({
          productId: pkg.product.identifier,
          title: pkg.packageType === "MONTHLY" ? "Monthly" : "Annual",
          priceString: pkg.product.priceString,
          introPrice: pkg.product.introPrice?.priceString ?? null,
        }));
      }
    } catch (err) {
      console.warn("[RevenueCat] getOfferings failed:", err);
    }
  }

  // Fallback: static pricing data
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
