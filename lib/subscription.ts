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

let _devMode = false;
let _rcAvailable = false; // true when SDK was successfully configured

/**
 * FIX-1: Promise-mutex singleton for initRevenueCat.
 *
 * WHY: The previous boolean `_initialised` flag had a race condition — if two
 * callers invoked initRevenueCat() concurrently before the flag was set (e.g.
 * usePremium and the paywall both mount simultaneously on app launch), both
 * callers passed the guard and both called Purchases.configure() which corrupts
 * the RevenueCat session.
 *
 * FIX: Store the in-flight Promise itself. All concurrent callers await the
 * same promise, so _doInit() — and therefore Purchases.configure() — is called
 * exactly once per app session regardless of how many concurrent callers there
 * are. The pattern is equivalent to a one-shot mutex.
 */
let _initPromise: Promise<void> | null = null;

async function getPurchases() {
  // Dynamic import so web bundle doesn't crash on missing native module
  const mod = await import("react-native-purchases");
  return mod.default;
}

/** Internal one-shot init — only ever called once via _initPromise. */
async function _doInit(): Promise<void> {
  // In development or web, unlock all features without SDK
  if (__DEV__ || Platform.OS === "web") {
    _devMode = true;
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
  } catch (err) {
    console.warn("[RevenueCat] configure failed:", err);
    // _rcAvailable stays false — fallback path will be used
  }
}

// ─── Subscription initialisation ─────────────────────────────────────────────

/**
 * Initialise the RevenueCat SDK exactly once, even under concurrent callers.
 *
 * All callers await the same promise — configure() is guaranteed to run at most
 * once per app session regardless of how many concurrent invocations occur.
 */
export async function initRevenueCat(): Promise<void> {
  if (!_initPromise) _initPromise = _doInit();
  return _initPromise;
}

/**
 * Reset init state — FOR TESTING ONLY. Never call in production code.
 * Allows tests to simulate a fresh app session.
 */
export function _resetInitForTesting(): void {
  _initPromise = null;
  _devMode = false;
  _rcAvailable = false;
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
      // FIX-3 (partial): RC is available and confirmed no active entitlement.
      // Clear any stale local premium cache so expired users lose access
      // immediately rather than retaining it indefinitely on this device.
      try {
        await AsyncStorage.removeItem(PREMIUM_KEY);
        await AsyncStorage.removeItem(PREMIUM_PRODUCT_KEY);
      } catch { /* ignore storage errors */ }
    } catch (err) {
      console.warn("[RevenueCat] getCustomerInfo failed:", err);
      // On network error, fall through to local cache (offline access preserved)
    }
  }

  // Fall back to local premium state (e.g. after offline purchase, or when
  // RC is unavailable due to missing keys or network error)
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
      // FIX-5: RC v10 uses PurchasesErrorCode enum, not a boolean userCancelled property.
      // In react-native-purchases v10.x, user cancellation throws a PurchasesError
      // with code === PurchasesErrorCode.PurchaseCancelledError (value 1).
      // The old v7/v8 check (err?.userCancelled) is undefined in v10 and would
      // incorrectly show a "Purchase Failed" alert on every user cancellation.
      const isCancelled =
        err?.userCancelled === true || // v7/v8 legacy (kept for safety)
        err?.code === 1 ||             // PurchasesErrorCode.PurchaseCancelledError = 1
        err?.code === "PurchaseCancelledError"; // string form used in some RC versions
      if (isCancelled) {
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

export async function restorePurchases(openId?: string): Promise<boolean> {
  await initRevenueCat();

  if (_devMode || Platform.OS === "web") return false;

  // IDENTITY FIX (Phase 4): Ensure RC is identified with the authenticated user's openId
  // before restoring. Without this, a restore after app restart (where RC is still anonymous)
  // would be attributed to the anonymous RC ID, not the user's permanent account.
  // This prevents the restore from silently succeeding for the wrong customer.
  if (openId && _rcAvailable) {
    try {
      await loginRevenueCat(openId);
    } catch { /* non-fatal — proceed with current RC identity */ }
  }

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
      // FIX-3: RC confirmed no active entitlement — clear stale local cache.
      // Without this, a user whose subscription expired retains premium access
      // indefinitely on this device because PREMIUM_KEY = "true" persists from
      // their previous purchase and is never cleared.
      await AsyncStorage.removeItem(PREMIUM_KEY);
      await AsyncStorage.removeItem(PREMIUM_PRODUCT_KEY);
      return false;
    } catch (err) {
      console.warn("[RevenueCat] restorePurchases failed:", err);
      // On error, do NOT clear local cache — preserve offline access
    }
  }

  // Fallback: check local state (RC unavailable — no keys configured)
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

// ─── User identity (link RC app_user_id to our openId) ───────────────────────

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

// ─── Subscription change event bus (allows RC listener to trigger usePremium refresh) ─
type SubscriptionChangeListener = () => void;
const _subscriptionChangeListeners = new Set<SubscriptionChangeListener>();

/** Register a callback to be called when RC reports a subscription change. */
export function onSubscriptionChange(fn: SubscriptionChangeListener): () => void {
  _subscriptionChangeListeners.add(fn);
  return () => _subscriptionChangeListeners.delete(fn);
}

/** Fire all registered subscription change listeners. Internal use only. */
export function _notifySubscriptionChange(): void {
  _subscriptionChangeListeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

// ─── RevenueCat logout (call on sign-out to prevent identity leak on shared devices) ─
/**
 * Call this during sign-out so the RC SDK reverts to an anonymous identity.
 * Without this, the next user to sign in on the same device inherits the
 * previous user's subscription state until loginRevenueCat() is called.
 * Safe to call even if RC was never initialised — all guards are checked.
 */
export async function logoutRevenueCat(): Promise<void> {
  if (_devMode || Platform.OS === "web") return;
  if (!_rcAvailable) return;
  try {
    const Purchases = await getPurchases();
    await Purchases.logOut();
    console.log("[RevenueCat] Logged out — device reverted to anonymous identity");
  } catch (err) {
    // Non-fatal — anonymous identity will be used until next logIn
    console.warn("[RevenueCat] logOut failed (non-fatal):", err);
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
