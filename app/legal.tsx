import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Alert,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";

// ─── Cookie Policy Content ─────────────────────────────────────────────────
const COOKIE_POLICY = `Last updated: July 2025

TutorSnap uses local storage technologies (similar to cookies) to provide you with a better experience. This policy explains what data is stored and why.

WHAT WE STORE LOCALLY

• Study Progress — Your streak, daily goal, total problems solved, and badge history are stored on your device using AsyncStorage.

• Preferences — Your dark/light mode choice, text size preference, preferred subjects, and notification settings are stored locally.

• History — Your solved problems, bookmarks, and flashcard decks are stored on your device.

• Session Data — Temporary session tokens for AI chat continuity are stored locally.

WHAT WE DO NOT DO

• We do not use third-party advertising cookies.
• We do not track you across other apps or websites.
• We do not sell your data to third parties.
• We do not use analytics cookies without your consent.

MANAGING YOUR DATA

You can clear all locally stored data at any time via Settings → Clear History or Settings → Reset All Progress.

For questions, contact privacy@tutorsnapai.tech.`;

// ─── Open Source Licenses ──────────────────────────────────────────────────
const LICENSES = [
  { name: "React Native", version: "0.81.5", license: "MIT", url: "https://reactnative.dev" },
  { name: "Expo SDK", version: "54.0.x", license: "MIT", url: "https://expo.dev" },
  { name: "expo-router", version: "6.x", license: "MIT", url: "https://expo.github.io/router" },
  { name: "NativeWind", version: "4.x", license: "MIT", url: "https://nativewind.dev" },
  { name: "TanStack Query", version: "5.x", license: "MIT", url: "https://tanstack.com/query" },
  { name: "tRPC", version: "11.x", license: "MIT", url: "https://trpc.io" },
  { name: "AsyncStorage", version: "2.x", license: "MIT", url: "https://react-native-async-storage.github.io" },
  { name: "React Native Reanimated", version: "4.x", license: "MIT", url: "https://docs.swmansion.com/react-native-reanimated" },
  { name: "React Native Gesture Handler", version: "2.x", license: "MIT", url: "https://docs.swmansion.com/react-native-gesture-handler" },
  { name: "React Native Safe Area Context", version: "5.x", license: "MIT", url: "https://github.com/AppAndFlow/react-native-safe-area-context" },
  { name: "expo-notifications", version: "0.32.x", license: "MIT", url: "https://docs.expo.dev/versions/latest/sdk/notifications" },
  { name: "expo-camera", version: "17.x", license: "MIT", url: "https://docs.expo.dev/versions/latest/sdk/camera" },
  { name: "expo-haptics", version: "15.x", license: "MIT", url: "https://docs.expo.dev/versions/latest/sdk/haptics" },
  { name: "expo-sharing", version: "14.x", license: "MIT", url: "https://docs.expo.dev/versions/latest/sdk/sharing" },
  { name: "expo-store-review", version: "7.x", license: "MIT", url: "https://docs.expo.dev/versions/latest/sdk/storereview" },
  { name: "Tailwind CSS", version: "3.x", license: "MIT", url: "https://tailwindcss.com" },
  { name: "Zod", version: "4.x", license: "MIT", url: "https://zod.dev" },
  { name: "Express", version: "4.x", license: "MIT", url: "https://expressjs.com" },
  { name: "Drizzle ORM", version: "0.44.x", license: "Apache 2.0", url: "https://orm.drizzle.team" },
  { name: "clsx", version: "2.x", license: "MIT", url: "https://github.com/lukeed/clsx" },
];

// ─── Community Guidelines ──────────────────────────────────────────────────
const COMMUNITY_GUIDELINES = `TutorSnap Community Guidelines
Last updated: July 2025

TutorSnap is a learning platform for students of all ages. To keep it a safe and productive space, we ask all users to follow these guidelines.

1. ACADEMIC INTEGRITY
Use TutorSnap as a learning aid, not a shortcut. Understanding the solution is more valuable than copying it. We encourage you to review every step and ask follow-up questions.

2. RESPECTFUL USE
Do not submit content that is hateful, discriminatory, or harmful. TutorSnap is for academic questions only — off-topic or inappropriate queries may be filtered.

3. PRIVACY
Do not photograph or share content that contains personal information about others (names, faces, addresses, etc.). Only submit your own schoolwork.

4. HONEST FEEDBACK
When rating or reviewing TutorSnap, provide honest and constructive feedback. Fake reviews or spam are not permitted.

5. REPORTING ISSUES
If you encounter a bug, incorrect answer, or inappropriate AI response, please use the Report a Bug or Feedback features in Settings. Your reports help us improve.

6. CHILDREN'S SAFETY
TutorSnap is designed to be safe for students of all ages. We do not collect personal information from children under 13 without parental consent. Parents can request data deletion at any time via Settings → Data Deletion Request.

7. ENFORCEMENT
Violation of these guidelines may result in restricted access to TutorSnap features. For serious violations, please contact safety@tutorsnapai.tech.

Thank you for being part of the TutorSnap community!`;

export default function LegalScreen() {
  const colors = useColors();
  const router = useRouter();
  const [showCookies, setShowCookies] = useState(false);
  const [showLicenses, setShowLicenses] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showDataDeletion, setShowDataDeletion] = useState(false);

  // Consent state
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [consentLoaded, setConsentLoaded] = useState(false);

  const loadConsent = async () => {
    if (consentLoaded) return;
    try {
      const raw = await AsyncStorage.getItem("@tutorsnap/consent");
      if (raw) {
        const saved = JSON.parse(raw);
        setAnalyticsConsent(saved.analytics ?? false);
        setMarketingConsent(saved.marketing ?? false);
      }
    } catch { /* ignore */ }
    setConsentLoaded(true);
  };

  const saveConsent = async (analytics: boolean, marketing: boolean) => {
    await AsyncStorage.setItem("@tutorsnap/consent", JSON.stringify({ analytics, marketing }));
  };

  const handleOpenConsent = () => {
    H.impactLight()
    loadConsent();
    setShowConsent(true);
  };

  const handleDataDeletionRequest = async () => {
    H.impactLight()
    const version = Constants.expoConfig?.version ?? "1.1.0";
    const subject = encodeURIComponent("Data Deletion Request — TutorSnap");
    const body = encodeURIComponent(
      `DATA DELETION REQUEST\n\nApp Version: ${version}\nPlatform: ${Platform.OS}\n\nI would like to request the deletion of all personal data associated with my TutorSnap account.\n\n[Please describe any specific data you'd like deleted, or write "all data"]\n\nThank you.`
    );
    try {
      await Linking.openURL(`mailto:privacy@tutorsnapai.tech?subject=${subject}&body=${body}`);
    } catch { /* ignore */ }
    setShowDataDeletion(false);
  };

  const LEGAL_ROWS = [
    {
      icon: "hand.raised.fill" as any,
      label: "Privacy Policy",
      subtitle: "How we collect, use, and protect your data",
      onPress: () => {
        H.impactLight()
        Linking.openURL("https://tutorsnapai.tech/privacy");
      },
    },
    {
      icon: "doc.text.fill" as any,
      label: "Terms of Service",
      subtitle: "Rules and conditions for using TutorSnap",
      onPress: () => {
        H.impactLight()
        Linking.openURL("https://tutorsnapai.tech/terms");
      },
    },
    {
      icon: "cookie.fill" as any,
      label: "Cookie Policy",
      subtitle: "What data is stored locally on your device",
      onPress: () => {
        H.impactLight()
        setShowCookies(true);
      },
    },
    {
      icon: "doc.plaintext.fill" as any,
      label: "Open Source Licenses",
      subtitle: "Third-party libraries powering TutorSnap",
      onPress: () => {
        H.impactLight()
        setShowLicenses(true);
      },
    },
    {
      icon: "person.3.fill" as any,
      label: "Community Guidelines",
      subtitle: "How to use TutorSnap responsibly",
      onPress: () => {
        H.impactLight()
        setShowCommunity(true);
      },
    },
    {
      icon: "checkmark.shield.fill" as any,
      label: "Consent Management",
      subtitle: "Manage your analytics and marketing preferences",
      onPress: handleOpenConsent,
    },
    {
      icon: "person.badge.minus.fill" as any,
      label: "Data Deletion Request",
      subtitle: "Request deletion of your personal data",
      onPress: () => {
        H.impactLight()
        setShowDataDeletion(true);
      },
      danger: true,
    },
  ];

  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });
  return (
    <ScreenContainer>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      {/* Header */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Legal & Privacy</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
          <Text style={styles.introEmoji}>⚖️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.introTitle, { color: colors.foreground }]}>Your Privacy Matters</Text>
            <Text style={[styles.introDesc, { color: colors.muted }]}>
              TutorSnap is committed to protecting your data. All your study data is stored locally on your device.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.muted }]}>LEGAL DOCUMENTS</Text>
        {LEGAL_ROWS.map((row, idx) => (
          <TouchableOpacity
            key={row.label}
            onPress={row.onPress}
            activeOpacity={0.7}
            style={[
              styles.row,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                marginBottom: idx === LEGAL_ROWS.length - 1 ? 0 : 2,
              },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: (row as any).danger ? `${colors.error}15` : `${colors.primary}15` }]}>
              <IconSymbol size={18} name={row.icon} color={(row as any).danger ? colors.error : colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: (row as any).danger ? colors.error : colors.foreground }]}>{row.label}</Text>
              <Text style={[styles.rowSubtitle, { color: colors.muted }]}>{row.subtitle}</Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.muted} />
          </TouchableOpacity>
        ))}

        {/* Contact */}
        <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.contactTitle, { color: colors.foreground }]}>Legal Inquiries</Text>
          <Text style={[styles.contactDesc, { color: colors.muted }]}>
            For legal questions, privacy concerns, or GDPR/CCPA requests, contact us at:
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL("mailto:legal@tutorsnapai.tech")}
            activeOpacity={0.7}
          >
            <Text style={[styles.contactEmail, { color: colors.primary }]}>legal@tutorsnapai.tech</Text>
          </TouchableOpacity>
          <Text style={[styles.contactDesc, { color: colors.muted, marginTop: 8 }]}>
            TutorSnap · tutorsnapai.tech
          </Text>
        </View>

      </ScrollView>

      {/* ── Cookie Policy Modal ──────────────────────────────────────────── */}
      <Modal visible={showCookies} transparent animationType="slide" onRequestClose={() => setShowCookies(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border, maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Cookie Policy</Text>
              <TouchableOpacity onPress={() => setShowCookies(false)} style={styles.modalClose}
                accessibilityLabel="Toggle show cookies">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
              <Text style={[styles.legalText, { color: colors.muted }]}>{COOKIE_POLICY}</Text>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Open Source Licenses Modal ───────────────────────────────────── */}
      <Modal visible={showLicenses} transparent animationType="slide" onRequestClose={() => setShowLicenses(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border, maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Open Source Licenses</Text>
              <TouchableOpacity onPress={() => setShowLicenses(false)} style={styles.modalClose}
                accessibilityLabel="Toggle show licenses">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              TutorSnap is built on these amazing open source projects.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 4 }}>
              {LICENSES.map((lib, i) => (
                <TouchableOpacity
                  key={lib.name}
                  onPress={() => Linking.openURL(lib.url)}
                  activeOpacity={0.7}
                  style={[
                    styles.licenseRow,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: i < LICENSES.length - 1 ? 0.5 : 0,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.licenseName, { color: colors.foreground }]}>{lib.name}</Text>
                    <Text style={[styles.licenseVersion, { color: colors.muted }]}>v{lib.version}</Text>
                  </View>
                  <View style={[styles.licenseBadge, { backgroundColor: `${colors.primary}15` }]}>
                    <Text style={[styles.licenseBadgeText, { color: colors.primary }]}>{lib.license}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Community Guidelines Modal ───────────────────────────────────── */}
      <Modal visible={showCommunity} transparent animationType="slide" onRequestClose={() => setShowCommunity(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border, maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Community Guidelines</Text>
              <TouchableOpacity onPress={() => setShowCommunity(false)} style={styles.modalClose}
                accessibilityLabel="Toggle show community">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
              <Text style={[styles.legalText, { color: colors.muted }]}>{COMMUNITY_GUIDELINES}</Text>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Consent Management Modal ─────────────────────────────────────── */}
      <Modal visible={showConsent} transparent animationType="slide" onRequestClose={() => setShowConsent(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Consent Management</Text>
              <TouchableOpacity onPress={() => setShowConsent(false)} style={styles.modalClose}
                accessibilityLabel="Toggle show consent">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              Control how TutorSnap uses your data. Essential data (study progress, preferences) is always stored locally and cannot be disabled.
            </Text>

            {/* Analytics Toggle */}
            <View style={[styles.consentRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.consentIcon, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol size={18} name="chart.bar.fill" color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.consentLabel, { color: colors.foreground }]}>Analytics</Text>
                <Text style={[styles.consentDesc, { color: colors.muted }]}>
                  Helps us understand how the app is used to improve features. No personal data is shared.
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Toggle analytics consent"
                onPress={async () => {
                  H.impactMedium()
                  const next = !analyticsConsent;
                  setAnalyticsConsent(next);
                  await saveConsent(next, marketingConsent);
                }}
                style={[
                  styles.consentToggle,
                  { backgroundColor: analyticsConsent ? colors.primary : colors.border },
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.consentThumb, { transform: [{ translateX: analyticsConsent ? 20 : 2 }] }]} />
              </TouchableOpacity>
            </View>

            {/* Marketing Toggle */}
            <View style={[styles.consentRow, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 8 }]}>
              <View style={[styles.consentIcon, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol size={18} name="bell.fill" color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.consentLabel, { color: colors.foreground }]}>Marketing Communications</Text>
                <Text style={[styles.consentDesc, { color: colors.muted }]}>
                  Receive tips, feature announcements, and educational content from TutorSnap.
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Toggle marketing consent"
                onPress={async () => {
                  H.impactMedium()
                  const next = !marketingConsent;
                  setMarketingConsent(next);
                  await saveConsent(analyticsConsent, next);
                }}
                style={[
                  styles.consentToggle,
                  { backgroundColor: marketingConsent ? colors.primary : colors.border },
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.consentThumb, { transform: [{ translateX: marketingConsent ? 20 : 2 }] }]} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.consentNote, { color: colors.muted }]}>
              Changes are saved automatically. For full data removal, use Data Deletion Request.
            </Text>

            <TouchableOpacity
              accessibilityLabel="Toggle show consent"
              onPress={() => setShowConsent(false)}
              style={[styles.consentDoneBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.consentDoneBtnText, { color: "#FFFFFF" }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Data Deletion Modal ──────────────────────────────────────────── */}
      <Modal visible={showDataDeletion} transparent animationType="slide" onRequestClose={() => setShowDataDeletion(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Data Deletion Request</Text>
              <TouchableOpacity onPress={() => setShowDataDeletion(false)} style={styles.modalClose}
                accessibilityLabel="Toggle show data deletion">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              You have the right to request deletion of your personal data under GDPR, CCPA, and other applicable privacy laws.
            </Text>

            <View style={[styles.deletionInfo, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}30` }]}>
              <Text style={styles.deletionInfoEmoji}>⚠️</Text>
              <Text style={[styles.deletionInfoText, { color: colors.foreground }]}>
                Deleting your data is permanent and cannot be undone. Your study history, badges, and streak will be lost.
              </Text>
            </View>

            <Text style={[styles.deletionStep, { color: colors.foreground }]}>
              1. Clear local data now via Settings → Reset All Progress
            </Text>
            <Text style={[styles.deletionStep, { color: colors.foreground }]}>
              2. Submit a formal request to our privacy team by tapping below
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                accessibilityLabel="Toggle show data deletion"
                onPress={() => setShowDataDeletion(false)}
                style={[styles.modalBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDataDeletionRequest}
                style={[styles.modalBtn, { backgroundColor: colors.error }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    
      </Animated.View></ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "700" },
  introCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  introEmoji: { fontSize: 32 },
  introTitle: { fontSize: 16, fontWeight: "700", marginBottom: 3 },
  introDesc: { fontSize: 13, lineHeight: 18 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600" },
  rowSubtitle: { fontSize: 12, marginTop: 1 },
  contactCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  contactTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  contactDesc: { fontSize: 13, lineHeight: 19 },
  contactEmail: { fontSize: 14, fontWeight: "700", marginTop: 6 },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalClose: { padding: 4 },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalSubtitle: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  legalText: { fontSize: 13, lineHeight: 21 },
  licenseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  licenseName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  licenseVersion: { fontSize: 12 },
  licenseBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  licenseBadgeText: { fontSize: 12, fontWeight: "700" },
  // Consent
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  consentIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  consentLabel: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  consentDesc: { fontSize: 12, lineHeight: 17 },
  consentToggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  consentThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  consentNote: { fontSize: 12, lineHeight: 18, marginTop: 12, marginBottom: 16 },
  consentDoneBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  consentDoneBtnText: { fontSize: 16, fontWeight: "700" },
  // Data Deletion
  deletionInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  deletionInfoEmoji: { fontSize: 18, lineHeight: 22 },
  deletionInfoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  deletionStep: { fontSize: 14, lineHeight: 22, marginBottom: 8, paddingLeft: 4 },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  modalBtnText: { fontSize: 16, fontWeight: "700" },
});
