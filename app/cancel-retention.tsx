/**
 * Pre-cancellation retention screen.
 *
 * Shown when the user taps "Manage Subscription" from Settings.
 * Presents an exit survey and a personalised offer before forwarding
 * to the App Store subscription management page.
 *
 * Uses inline error messages instead of Alert.alert() so the screen
 * works correctly on web (where Alert.alert() is a no-op).
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import * as H from "@/lib/haptics";
import { openManageSubscriptions } from "@/lib/subscription";
import { trpc } from "@/lib/trpc";

// ─── Exit survey reasons ──────────────────────────────────────────────────────
const REASONS = [
  { id: "price",    emoji: "💸", label: "It's too expensive" },
  { id: "usage",    emoji: "📉", label: "I'm not using it enough" },
  { id: "better",   emoji: "🔄", label: "I found a better app" },
  { id: "features", emoji: "🔧", label: "Missing features I need" },
  { id: "other",    emoji: "💬", label: "Other reason" },
] as const;

type ReasonId = (typeof REASONS)[number]["id"];

// ─── Personalised offer copy per reason ──────────────────────────────────────
const OFFER_COPY: Record<ReasonId, { headline: string; body: string; cta: string }> = {
  price: {
    headline: "Before you go — here's a special offer",
    body: "We'd hate to lose you over price. Contact our support team and mention this screen — we'll do our best to find a plan that works for you.",
    cta: "Contact Support for a Discount",
  },
  usage: {
    headline: "You can pause instead of cancelling",
    body: "If life is busy right now, you can cancel and resubscribe any time — your progress, streaks, and history are saved forever. Come back whenever you're ready.",
    cta: "I'll Come Back Later",
  },
  better: {
    headline: "We'd love to know what we're missing",
    body: "Tell us what the other app does better and we'll work on it. Your feedback directly shapes TutorSnap's roadmap.",
    cta: "Send Feedback",
  },
  features: {
    headline: "Tell us what you need",
    body: "Feature requests from real users are our top priority. Share what's missing and we'll add it to the roadmap.",
    cta: "Request a Feature",
  },
  other: {
    headline: "We're sorry to see you go",
    body: "If there's anything we can do to improve your experience, please let us know. Your feedback makes TutorSnap better for everyone.",
    cta: "Share Feedback",
  },
};

// ─── Platform-aware alert helper ─────────────────────────────────────────────
// On native, we use inline state (same as web) for consistency.
// This helper is kept for any future native-only dialogs.

// ─── Component ────────────────────────────────────────────────────────────────
export default function CancelRetentionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedReason, setSelectedReason] = useState<ReasonId | null>(null);
  const [step, setStep] = useState<"survey" | "offer">("survey");
  // Inline error messages (replaces Alert.alert — works on both web and native)
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);

  const { data: serverSubStatus } = trpc.subscription.getStatus.useQuery(undefined, {
    staleTime: 60_000,
  });

  const offerCopy = selectedReason ? OFFER_COPY[selectedReason] : null;

  const handleSelectReason = (id: ReasonId) => {
    H.impactLight();
    setSelectedReason(id);
    // Clear error when user makes a selection
    if (surveyError) setSurveyError(null);
  };

  const handleContinueToOffer = () => {
    if (!selectedReason) {
      setSurveyError("Please select a reason so we can improve TutorSnap.");
      return;
    }
    setSurveyError(null);
    H.impactMedium();
    setStep("offer");
  };

  const handleKeepPremium = () => {
    H.notificationSuccess();
    router.back();
  };

  const handleProceedToManage = async () => {
    H.impactLight();
    setManageError(null);
    try {
      await openManageSubscriptions();
      router.back();
    } catch {
      // openManageSubscriptions failed (e.g. no store link available on web)
      setManageError(
        Platform.OS === "web"
          ? "To manage your subscription, open the App Store (iOS) or Google Play Store (Android) on your device, go to your account, and select Subscriptions."
          : "Could not open the subscription management page. Please try again or visit your device's app store settings."
      );
    }
  };

  const handleOfferCta = () => {
    if (!selectedReason) return;
    H.impactLight();
    // For usage: just go back (user acknowledged they'll return)
    if (selectedReason === "usage") {
      router.back();
      return;
    }
    // For all other reasons: open support email
    const subject = encodeURIComponent("TutorSnap Feedback");
    const body = encodeURIComponent(
      `Reason for considering cancellation: ${REASONS.find((r) => r.id === selectedReason)?.label ?? selectedReason}\n\n`
    );
    import("react-native").then(({ Linking }) => {
      Linking.openURL(`mailto:support@tutorsnapai.com?subject=${subject}&body=${body}`).catch(() => {});
    });
  };

  // ── Expiry date display ───────────────────────────────────────────────────
  const expiryLabel = serverSubStatus?.expiresAt
    ? new Date(serverSubStatus.expiresAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>

        {step === "survey" ? (
          <>
            {/* Survey header */}
            <Text style={[styles.title, { color: colors.foreground }]}>
              Before you cancel…
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              You still have Premium access
              {expiryLabel ? ` until ${expiryLabel}` : ""}.
              Help us improve by telling us why you're leaving.
            </Text>

            {/* Reason cards */}
            <View style={styles.reasonList}>
              {REASONS.map((r) => {
                const selected = selectedReason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => handleSelectReason(r.id)}
                    activeOpacity={0.8}
                    style={[
                      styles.reasonCard,
                      { borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.surface },
                      selected && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={r.label}
                  >
                    <Text style={styles.reasonEmoji}>{r.emoji}</Text>
                    <Text style={[styles.reasonLabel, { color: colors.foreground }]}>{r.label}</Text>
                    <View style={[styles.radioOuter, { borderColor: selected ? colors.primary : colors.border }]}>
                      {selected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Inline survey error — shown instead of Alert.alert */}
            {surveyError && (
              <View style={[styles.inlineError, { backgroundColor: `${colors.error}15`, borderColor: colors.error }]}>
                <Text style={[styles.inlineErrorText, { color: colors.error }]}>
                  {surveyError}
                </Text>
              </View>
            )}

            {/* Continue button */}
            <TouchableOpacity
              onPress={handleContinueToOffer}
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>

            {/* Skip straight to manage */}
            <TouchableOpacity
              onPress={handleProceedToManage}
              activeOpacity={0.7}
              style={styles.skipBtn}
              accessibilityRole="button"
              accessibilityLabel="Skip and manage subscription"
            >
              <Text style={[styles.skipText, { color: colors.muted }]}>
                Skip — take me to manage subscription
              </Text>
            </TouchableOpacity>

            {/* Inline manage error */}
            {manageError && (
              <View style={[styles.inlineError, { backgroundColor: `${colors.warning}15`, borderColor: colors.warning }]}>
                <Text style={[styles.inlineErrorText, { color: colors.foreground }]}>
                  {manageError}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Offer step */}
            <View style={[styles.offerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.offerEmoji}>
                {REASONS.find((r) => r.id === selectedReason)?.emoji ?? "💡"}
              </Text>
              <Text style={[styles.offerHeadline, { color: colors.foreground }]}>
                {offerCopy?.headline}
              </Text>
              <Text style={[styles.offerBody, { color: colors.muted }]}>
                {offerCopy?.body}
              </Text>
              <TouchableOpacity
                onPress={handleOfferCta}
                activeOpacity={0.85}
                style={[styles.offerCtaBtn, { borderColor: colors.primary }]}
                accessibilityRole="button"
              >
                <Text style={[styles.offerCtaText, { color: colors.primary }]}>
                  {offerCopy?.cta}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Keep Premium CTA */}
            <TouchableOpacity
              onPress={handleKeepPremium}
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Keep my Premium subscription"
            >
              <Text style={styles.primaryBtnText}>Keep My Premium 👑</Text>
            </TouchableOpacity>

            {/* Proceed to cancel */}
            <TouchableOpacity
              onPress={handleProceedToManage}
              activeOpacity={0.7}
              style={styles.skipBtn}
              accessibilityRole="button"
              accessibilityLabel="Proceed to manage subscription"
            >
              <Text style={[styles.skipText, { color: colors.muted }]}>
                I still want to cancel — manage subscription
              </Text>
            </TouchableOpacity>

            {/* Inline manage error */}
            {manageError && (
              <View style={[styles.inlineError, { backgroundColor: `${colors.warning}15`, borderColor: colors.warning }]}>
                <Text style={[styles.inlineErrorText, { color: colors.foreground }]}>
                  {manageError}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  backBtn: {
    marginBottom: 20,
    alignSelf: "flex-start",
    padding: 4,
  },
  backText: {
    fontSize: 17,
    fontWeight: "600",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 10,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  reasonList: {
    gap: 10,
    marginBottom: 16,
  },
  reasonCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  reasonEmoji: {
    fontSize: 22,
    width: 30,
    textAlign: "center",
  },
  reasonLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  inlineError: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  inlineErrorText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  skipText: {
    fontSize: 13,
    textDecorationLine: "underline",
  },
  offerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    marginBottom: 24,
    gap: 10,
  },
  offerEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  offerHeadline: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 24,
  },
  offerBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  offerCtaBtn: {
    marginTop: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  offerCtaText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
