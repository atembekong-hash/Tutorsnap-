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
import ReAnimated, { FadeInDown, ZoomIn, useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { USER_NAME_KEY } from "@/app/onboarding";
import { PRIVACY_URL, TERMS_URL } from "@/constants/app";
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

const TESTIMONIALS = [
  {
    name: "Amara K.",
    grade: "Grade 11",
    text: "I went from failing Algebra 2 to getting an A in one month. The step-by-step explanations actually make sense, unlike my textbook.",
    stars: 5,
  },
  {
    name: "Jaylen M.",
    grade: "University Year 1",
    text: "TutorSnap saved my Calculus final. I asked the AI Tutor to walk me through integration by parts at 2 AM and it did it perfectly.",
    stars: 5,
  },
  {
    name: "Sofia R.",
    grade: "Grade 9",
    text: "I use the Scan feature every day for homework. It reads my handwriting, solves the problem, and explains every step. Absolutely worth it.",
    stars: 5,
  },
];

const FEATURES = [
  { icon: "∞", label: "Unlimited AI solves across all subjects" },
  { icon: "∞", label: "Unlimited quiz questions and practice sets" },
  { icon: "∞", label: "Unlimited AI Tutor chat messages per day" },
  { icon: "📷", label: "Camera scan: photograph any problem to solve" },
  { icon: "🧠", label: "Step-by-step explanations with worked examples" },
  { icon: "📊", label: "Detailed progress analytics and mastery tracking" },
  { icon: "🏫", label: "Full Classroom: join or create study groups" },
  { icon: "📄", label: "PDF and text export of all chat sessions" },
  { icon: "🏆", label: "Leaderboard rankings and challenge history" },
  { icon: "🔥", label: "Streak shields to protect your daily streak" },
  { icon: "📚", label: "Flashcard decks with spaced repetition" },
  { icon: "🔔", label: "Smart study reminders and daily goal nudges" },
  { icon: "⭐", label: "Priority support from the TutorSnap team" },
];

const SOCIAL_PROOF_COUNT = "12,400+";

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const colors = useColors();
  const { fadeStyle: animatedStyle } = useScreenTransition();
  const params = useLocalSearchParams<{ fromOnboarding?: string }>();
  const fromOnboarding = params.fromOnboarding === "1";
  const [userName, setUserName] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const [selectedPlan, setSelectedPlan] = useState<string>(PRODUCT_ANNUAL);
  const [offerings, setOfferings] = useState<Record<string, OfferingInfo>>({});
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offeringsLoaded, setOfferingsLoaded] = useState(false);
  const [offeringsError, setOfferingsError] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [trialDaysUsed, setTrialDaysUsed] = useState<number | null>(null);
  const [trialVariant, setTrialVariant] = useState<TrialVariantConfig>(getDefaultTrialVariantConfig());
  const [stickyVisible, setStickyVisible] = useState(false);

  // Animated scale for plan card selection
  const monthlyScale = useSharedValue(1);
  const annualScale = useSharedValue(1.02);
  const monthlyAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: withTiming(monthlyScale.value, { duration: 180 }) }] }));
  const annualAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: withTiming(annualScale.value, { duration: 180 }) }] }));

  // Load offerings on mount
  useEffect(() => {
    (async () => {
      try {
        const [pkgs, status, trialStart, variantConfig, savedName] = await Promise.all([
          getOfferings(),
          getSubscriptionStatus(),
          getTrialStartDate(),
          getTrialVariantConfig(),
          AsyncStorage.getItem(USER_NAME_KEY),
        ]);
        if (savedName) setUserName(savedName);
        setTrialVariant(variantConfig);
        // Log paywall view for A/B test analytics
        logAbTestEvent("paywall_view", variantConfig.variant).catch(() => {});
        // Log onboarding-to-paywall funnel event
        if (fromOnboarding) {
          logAbTestEvent("onboarding_paywall_view", variantConfig.variant).catch(() => {});
        }
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
        setOfferingsError(true);
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

  // Post-trial price label — shown under the CTA button
  const postTrialPriceLabel = selectedPlan === PRODUCT_ANNUAL
    ? `Free for ${trialVariant.trialDays} days, then ${annualPrice} (${annualMonthlyEquiv}). Cancel anytime.`
    : `Free for ${trialVariant.trialDays} days, then ${monthlyPrice}. Cancel anytime.`;

  const s = makeStyles(colors);

  return (
    <ReAnimated.View entering={FadeInDown.delay(0).duration(350)} style={[s.root, { paddingTop: insets.top }]}>
      {/* Close / skip button */}
      <TouchableOpacity
        style={s.closeBtn}
        onPress={() => {
          if (fromOnboarding) {
            router.replace({ pathname: "/(tabs)", params: { fromOnboarding: "1" } } as any);
          } else {
            router.back();
          }
        }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel={fromOnboarding ? "Continue with free tier" : "Close paywall"}
        accessibilityRole="button"
      >
        <Text style={s.closeBtnText}>{fromOnboarding ? "Maybe Later" : "✕"}</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setStickyVisible(e.nativeEvent.contentOffset.y > 220)}
        scrollEventThrottle={16}
      >
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.trialBadge}>
            <Text style={s.trialBadgeText}>{trialVariant.badgeText}</Text>
          </View>
          {fromOnboarding && userName ? (
            <Text style={s.heroTitle}>You're all set, {userName}!{"\n"}Unlock the full experience</Text>
          ) : (
            <Text style={s.heroTitle}>Unlock TutorSnap{"\n"}Premium</Text>
          )}
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
        ) : offeringsError ? (
          <View style={s.loadingPlans}>
            <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", marginBottom: 12 }}>
              Could not load plans. Check your connection.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setOfferingsLoaded(false);
                setOfferingsError(false);
                // Re-run the load
                (async () => {
                  try {
                    const pkgs = await getOfferings();
                    const map: Record<string, OfferingInfo> = {};
                    for (const pkg of pkgs) { map[pkg.productId] = pkg; }
                    setOfferings(map);
                  } catch { setOfferingsError(true); } finally { setOfferingsLoaded(true); }
                })();
              }}
              style={{ paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.primary }}
            >
              <Text style={{ color: colors.background, fontSize: 14, fontWeight: "600" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.loadingPlans}>
            <DotsLoader color={colors.primary} />
          </View>
        )}

        {/* Dev mode notice — only visible in development builds, never in production */}
        {isDevMode && __DEV__ && (
          <View style={s.devNotice}>
            <Text style={s.devNoticeText}>
              🛠 Dev mode - RevenueCat API key not configured. Purchases are simulated.
            </Text>
          </View>
        )}

        {/* ── Social proof counter ─────────────────────────────────── */}
        <ReAnimated.View entering={FadeInDown.delay(280).duration(350)} style={{ alignItems: "center", marginBottom: 6, marginTop: 4 }}>
          <Text style={{ color: "#9BA1A6", fontSize: 13, fontWeight: "500", letterSpacing: 0.2 }}>
            Join {SOCIAL_PROOF_COUNT} students already on Premium
          </Text>
        </ReAnimated.View>
        {/* ── Early CTA — visible without scrolling ──────────────── */}
        <ReAnimated.View entering={FadeInDown.delay(300).duration(400).springify()} style={{ marginHorizontal: 0, marginBottom: 8 }}>
          <TouchableOpacity
            style={[s.ctaBtn, (!offeringsLoaded || loading) && s.ctaBtnDisabled]}
            onPress={handleStartTrial}
            disabled={loading || !offeringsLoaded}
            activeOpacity={0.85}
            accessibilityLabel="Start free trial"
            accessibilityRole="button"
          >
            {loading ? (
              <DotsLoader color="#fff" />
            ) : (
              <Text style={s.ctaBtnText}>Start Free Trial</Text>
            )}
          </TouchableOpacity>
          <Text style={s.ctaSubtext}>{postTrialPriceLabel}</Text>
        </ReAnimated.View>
        {/* ── Testimonials ─────────────────────────────────────────── */}
        <ReAnimated.View entering={FadeInDown.delay(360).duration(400)} style={[s.featuresCard, { marginBottom: 12 }]}>
          <Text style={s.featuresTitle}>What students are saying</Text>
          {TESTIMONIALS.map((t, i) => (
            <View key={i} style={[s.testimonialRow, i < TESTIMONIALS.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: "#ffffff20", paddingBottom: 14, marginBottom: 14 }]}>
              <View style={s.testimonialStars}>
                {Array.from({ length: t.stars }).map((_, si) => (
                  <Text key={si} style={s.testimonialStar}>★</Text>
                ))}
              </View>
              <Text style={s.testimonialText}>{t.text}</Text>
              <Text style={s.testimonialAuthor}>{t.name} · {t.grade}</Text>
            </View>
          ))}
        </ReAnimated.View>
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
          {postTrialPriceLabel}
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

        {/* ── ToS / Privacy links — required by Apple App Store Review ── */}
        <View style={s.legalLinks}>
          <TouchableOpacity
            onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}
            accessibilityLabel="Terms of Service"
            accessibilityRole="link"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={s.legalLinkSep}>·</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
            accessibilityLabel="Privacy Policy"
            accessibilityRole="link"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* ── Sticky bottom CTA ──────────────────────────────────── */}
      {stickyVisible && (
        <ReAnimated.View
          entering={FadeInDown.duration(200)}
          style={[{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            backgroundColor: "rgba(21,23,24,0.97)",
            borderTopWidth: 0.5,
            borderTopColor: "#334155",
          }]}
        >
          <TouchableOpacity
            style={[s.ctaBtn, loading && s.ctaBtnDisabled]}
            onPress={handleStartTrial}
            disabled={loading || !offeringsLoaded}
            activeOpacity={0.85}
            accessibilityLabel="Start free trial"
            accessibilityRole="button"
          >
            {loading ? <DotsLoader color="#fff" /> : <Text style={s.ctaBtnText}>Start Free Trial</Text>}
          </TouchableOpacity>
        </ReAnimated.View>
      )}
    </ReAnimated.View>
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
      top: 8,
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

    // Legal links row
    legalLinks: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 12,
      marginBottom: 8,
      gap: 8,
    },
    legalLink: {
      fontSize: 12,
      color: ACCENT,
      textDecorationLine: "underline",
    },
    legalLinkSep: {
      fontSize: 12,
      color: colors.muted,
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

    // Testimonials
    testimonialRow: {
      marginBottom: 0,
    },
    testimonialStars: {
      flexDirection: "row",
      gap: 2,
      marginBottom: 6,
    },
    testimonialStar: {
      color: "#FFD700",
      fontSize: 14,
    },
    testimonialText: {
      color: "#ffffffcc",
      fontSize: 13,
      lineHeight: 19,
      fontStyle: "italic",
      marginBottom: 6,
    },
    testimonialAuthor: {
      color: "#ffffff80",
      fontSize: 12,
      fontWeight: "600",
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
