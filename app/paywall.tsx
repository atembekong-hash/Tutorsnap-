/**
 * app/paywall.tsx
 *
 * TutorSnap Premium Paywall
 *
 * Features:
 *  - Hero section with 14-day free trial badge
 *  - Two plan cards: Monthly ($9.99) and Annual ($69.99 — Save 42%)
 *  - Annual plan highlighted as recommended
 *  - Feature list (unlimited solves, quizzes, chat, classroom, PDF export)
 *  - "Start Free Trial" CTA → purchaseProduct()
 *  - "Restore Purchases" link
 *  - Works in dev mode (shows mock prices)
 *  - Loading states and error handling
 */

import React, { useCallback, useEffect, useState } from "react";
import ReAnimated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as H from "@/lib/haptics";

import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import {
  DISCOUNT_PCT,
  PRICE_ANNUAL,
  PRICE_ANNUAL_MONTHLY_EQUIV,
  PRICE_MONTHLY,
  PRODUCT_ANNUAL,
  PRODUCT_MONTHLY,
  getOfferings,
  getSubscriptionStatus,
  getTrialStartDate,
  getTrialDaysRemaining,
  purchaseProduct,
  restorePurchases,
} from "@/lib/subscription";
import { DotsLoader } from "@/components/skeleton";
import { getTrialVariantConfig, getDefaultTrialVariantConfig, logAbTestEvent, lockVariant, type TrialVariantConfig } from "@/lib/ab-test";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OfferingInfo {
  productId: string;
  priceString: string;
  introPrice: string | null;
}

// ─── Feature list ─────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: "∞", label: "Unlimited AI math solves per day" },
  { icon: "∞", label: "Unlimited quiz questions per day" },
  { icon: "∞", label: "Unlimited AI tutor chat messages" },
  { icon: "📄", label: "PDF export of chat sessions" },
  { icon: "🏫", label: "Full classroom & homework features" },
  { icon: "📷", label: "Camera scan to solve problems" },
  { icon: "📊", label: "Detailed progress analytics" },
  { icon: "🏆", label: "Leaderboard & challenge history" },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const colors = useColors();
  const { fadeStyle: animatedStyle } = useScreenTransition();
  const insets = useSafeAreaInsets();

  const [selectedPlan, setSelectedPlan] = useState<string>(PRODUCT_ANNUAL);
  const [offerings, setOfferings] = useState<Record<string, OfferingInfo>>({});
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offeringsLoaded, setOfferingsLoaded] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [trialDaysUsed, setTrialDaysUsed] = useState<number | null>(null);
  const [trialVariant, setTrialVariant] = useState<TrialVariantConfig>(getDefaultTrialVariantConfig());

  // Load offerings on mount
  useEffect(() => {
    (async () => {
      try {
        const [pkgs, status, trialStart, variantConfig] = await Promise.all([
          getOfferings(),
          getSubscriptionStatus(),
          getTrialStartDate(),
          getTrialVariantConfig(),
        ]);
        setTrialVariant(variantConfig);
        // Log paywall view for A/B test analytics
        logAbTestEvent("paywall_view", variantConfig.variant).catch(() => {});
        setIsDevMode(status.isDevMode);
        if (trialStart !== null) {
          const remaining = getTrialDaysRemaining(trialStart);
          setTrialDaysUsed(variantConfig.trialDays - remaining);
        }
        const map: Record<string, OfferingInfo> = {};
        for (const pkg of pkgs) {
          map[pkg.productId] = pkg;
        }
        setOfferings(map);
      } catch {
        // Offerings load failure is non-critical; show empty state with fallback prices
      } finally {
        setOfferingsLoaded(true);
      }
    })();
  }, []);

  const handleSelectPlan = useCallback((productId: string) => {
    H.impactLight();
    setSelectedPlan(productId);
  }, []);

  const handleStartTrial = useCallback(async () => {
    H.impactMedium();
    setLoading(true);
    try {
      const result = await purchaseProduct(selectedPlan);
      if (result.success) {
        H.notificationSuccess();
        // Log trial/purchase conversion for A/B test analytics
        logAbTestEvent("trial_started", trialVariant.variant, { plan: selectedPlan }).catch(() => {});
        // Lock the variant so it never re-randomises after a trial is started
        lockVariant().catch(() => {});
        // Navigate to the celebration screen instead of a plain Alert
        router.replace("/premium-welcome" as any);
      } else if (!result.cancelled) {
        Alert.alert(
          "Purchase Failed",
          result.error ?? "Something went wrong. Please try again.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPlan]);

  const handleRestore = useCallback(async () => {
    H.impactLight();
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        H.notificationSuccess();
        // Log restore event for A/B test analytics
        logAbTestEvent("restore_completed", trialVariant.variant).catch(() => {});
        // Navigate to the celebration screen with restored variant
        router.replace(("/premium-welcome?restored=true") as any);
      } else {
        Alert.alert(
          "No Purchases Found",
          "We couldn't find any previous purchases for this account.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setRestoring(false);
    }
  }, []);

  // Derived display values
  const monthlyPrice =
    offerings[PRODUCT_MONTHLY]?.priceString ?? `$${PRICE_MONTHLY.toFixed(2)}/mo`;
  const annualPrice =
    offerings[PRODUCT_ANNUAL]?.priceString ?? `$${PRICE_ANNUAL.toFixed(2)}/yr`;
  const annualMonthlyEquiv = `$${PRICE_ANNUAL_MONTHLY_EQUIV}/mo`;

  const s = makeStyles(colors);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Close / skip button */}
      <TouchableOpacity
        style={s.closeBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel="Close paywall"
        accessibilityRole="button"
      >
        <Text style={s.closeBtnText}>✕</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.trialBadge}>
            <Text style={s.trialBadgeText}>{trialVariant.badgeText}</Text>
          </View>
          <Text style={s.heroTitle}>Unlock TutorSnap{"\n"}Premium</Text>
          <Text style={s.heroSubtitle}>
            {`Solve unlimited problems, ace every quiz, and get personalised AI tutoring — free for ${trialVariant.trialDays} days.`}
          </Text>

          {/* Trial progress bar — shown when trial has started */}
          {trialDaysUsed !== null && (
            <View style={s.trialProgressWrap}>
              <View style={s.trialProgressRow}>
                <Text style={s.trialProgressLabel}>
                  {trialDaysUsed === 0 ? "Trial just started" : `Day ${trialDaysUsed} of ${trialVariant.trialDays}`}
                </Text>
                <Text style={s.trialProgressDaysLeft}>
                  {Math.max(0, trialVariant.trialDays - trialDaysUsed)} days left
                </Text>
              </View>
              <View style={s.trialProgressTrack}>
                <View
                  style={[
                    s.trialProgressFill,
                    { width: `${Math.min(100, (trialDaysUsed / trialVariant.trialDays) * 100)}%` as any },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* ── Plan cards ───────────────────────────────────────────── */}
        {offeringsLoaded ? (
          <View style={s.plansRow}>
            {/* Monthly */}
            <Pressable
              style={({ pressed }) => [
                s.planCard,
                selectedPlan === PRODUCT_MONTHLY && s.planCardSelected,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => handleSelectPlan(PRODUCT_MONTHLY)}
              accessibilityLabel={`Monthly plan, ${monthlyPrice} billed monthly`}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedPlan === PRODUCT_MONTHLY }}
            >
              <Text style={s.planLabel}>Monthly</Text>
              <Text
                style={[
                  s.planPrice,
                  selectedPlan === PRODUCT_MONTHLY && s.planPriceSelected,
                ]}
              >
                {monthlyPrice}
              </Text>
              <Text style={s.planNote}>Billed monthly</Text>
            </Pressable>

            {/* Annual — recommended */}
            <Pressable
              style={({ pressed }) => [
                s.planCard,
                s.planCardAnnual,
                selectedPlan === PRODUCT_ANNUAL && s.planCardSelected,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => handleSelectPlan(PRODUCT_ANNUAL)}
              accessibilityLabel={`Annual plan, ${annualPrice}, best value, save ${DISCOUNT_PCT}%`}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedPlan === PRODUCT_ANNUAL }}
            >
              {/* Recommended badge */}
              <View style={s.recommendedBadge}>
                <Text style={s.recommendedBadgeText}>Best Value</Text>
              </View>

              <Text style={[s.planLabel, s.planLabelAnnual]}>Annual</Text>
              <Text
                style={[
                  s.planPrice,
                  s.planPriceAnnual,
                  selectedPlan === PRODUCT_ANNUAL && s.planPriceSelected,
                ]}
              >
                {annualPrice}
              </Text>
              <Text style={[s.planNote, s.planNoteAnnual]}>
                {annualMonthlyEquiv} · Save {DISCOUNT_PCT}%
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.loadingPlans}>
            <DotsLoader color={colors.primary} />
          </View>
        )}

        {/* Dev mode notice */}
        {isDevMode && (
          <View style={s.devNotice}>
            <Text style={s.devNoticeText}>
              🛠 Dev mode - RevenueCat API key not configured. Purchases are simulated.
            </Text>
          </View>
        )}

        {/* ── Feature list ─────────────────────────────────────────── */}
        <ReAnimated.View entering={FadeInDown.delay(420).duration(400)} style={s.featuresCard}>
          <Text style={s.featuresTitle}>Everything included</Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <Text style={s.featureLabel}>{f.label}</Text>
            </View>
          ))}
                </ReAnimated.View>
        {/* ── CTA ──────────────────────────────────────────────────── */}
        <ReAnimated.View entering={FadeInDown.delay(500).duration(400).springify()}>
        <TouchableOpacity
          style={[s.ctaBtn, loading && s.ctaBtnDisabled]}
          onPress={handleStartTrial}
          disabled={loading || !offeringsLoaded}
          activeOpacity={0.85}
          accessibilityLabel={`Start ${trialVariant.trialDays}-day free trial`}
          accessibilityRole="button"
        >
          {loading ? (
            <DotsLoader color="#fff" />
          ) : (
            <Text style={s.ctaBtnText}>Start Free Trial</Text>
          )}
        </TouchableOpacity>

        <Text style={s.ctaSubtext}>
          {trialVariant.ctaSubLabel}
        </Text>
        </ReAnimated.View>

        {/* ── Restore ──────────────────────────────────────────────── */}
        <TouchableOpacity
          style={s.restoreBtn}
          onPress={handleRestore}
          disabled={restoring}
          accessibilityLabel="Restore previous purchases"
          accessibilityRole="button"
        >
          {restoring ? (
            <DotsLoader color={colors.muted} />
          ) : (
            <Text style={s.restoreBtnText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {/* ── Legal ────────────────────────────────────────────────── */}
        <Text style={s.legal}>
          Subscription auto-renews unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your device's subscription settings.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useColors>) {
  const ACCENT = "#6C63FF"; // TutorSnap purple accent

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    closeBtn: {
      position: "absolute",
      top: 52,
      right: 20,
      zIndex: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    closeBtnText: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "600",
    },
    scroll: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },

    // Hero
    hero: {
      alignItems: "center",
      marginBottom: 28,
    },
    trialBadge: {
      backgroundColor: ACCENT,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 6,
      marginBottom: 16,
    },
    trialBadgeText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    heroTitle: {
      fontSize: 30,
      fontWeight: "800",
      color: colors.foreground,
      textAlign: "center",
      lineHeight: 38,
      marginBottom: 12,
    },
    heroSubtitle: {
      fontSize: 15,
      color: colors.muted,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 8,
    },

    // Trial progress bar
    trialProgressWrap: {
      width: "100%",
      marginTop: 20,
      paddingHorizontal: 4,
    },
    trialProgressRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    trialProgressLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.foreground,
    },
    trialProgressDaysLeft: {
      fontSize: 12,
      fontWeight: "600",
      color: ACCENT,
    },
    trialProgressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    trialProgressFill: {
      height: 6,
      borderRadius: 3,
      backgroundColor: ACCENT,
    },

    // Plan cards
    plansRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 20,
    },
    planCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16,
      alignItems: "center",
      position: "relative",
      overflow: "visible",
    },
    planCardAnnual: {
      borderColor: ACCENT,
    },
    planCardSelected: {
      borderColor: ACCENT,
      backgroundColor: `${ACCENT}18`,
    },
    planLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.muted,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    planLabelAnnual: {
      color: ACCENT,
    },
    planPrice: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.foreground,
      marginBottom: 4,
    },
    planPriceAnnual: {
      color: colors.foreground,
    },
    planPriceSelected: {
      color: ACCENT,
    },
    planNote: {
      fontSize: 11,
      color: colors.muted,
      textAlign: "center",
    },
    planNoteAnnual: {
      color: ACCENT,
      fontWeight: "600",
    },
    recommendedBadge: {
      position: "absolute",
      top: -12,
      backgroundColor: ACCENT,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    recommendedBadgeText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    loadingPlans: {
      height: 120,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },

    // Dev mode
    devNotice: {
      backgroundColor: "#FFF3CD",
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    devNoticeText: {
      fontSize: 12,
      color: "#856404",
      textAlign: "center",
    },

    // Features
    featuresCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    featuresTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
      marginBottom: 14,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      gap: 12,
    },
    featureIcon: {
      fontSize: 18,
      width: 28,
      textAlign: "center",
    },
    featureLabel: {
      fontSize: 14,
      color: colors.foreground,
      flex: 1,
      lineHeight: 20,
    },

    // CTA
    ctaBtn: {
      backgroundColor: ACCENT,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: "center",
      marginBottom: 10,
      shadowColor: ACCENT,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    ctaBtnDisabled: {
      opacity: 0.7,
    },
    ctaBtnText: {
      color: "#fff",
      fontSize: 17,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
    ctaSubtext: {
      fontSize: 12,
      color: colors.muted,
      textAlign: "center",
      marginBottom: 20,
    },

    // Restore
    restoreBtn: {
      alignItems: "center",
      paddingVertical: 12,
      marginBottom: 16,
    },
    restoreBtnText: {
      fontSize: 14,
      color: colors.muted,
      textDecorationLine: "underline",
    },

    // Legal
    legal: {
      fontSize: 10,
      color: colors.muted,
      textAlign: "center",
      lineHeight: 15,
      paddingHorizontal: 8,
    },
  });
}
