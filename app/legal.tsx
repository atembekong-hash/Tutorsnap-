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
import { COMPANY_NAME, APP_FULL_NAME, COPYRIGHT } from "@/constants/app";

// ─── Cookie Policy Content ─────────────────────────────────────────────────
const COOKIE_POLICY = `COOKIE AND LOCAL STORAGE POLICY
Last updated: July 2026
Effective date: July 1, 2026

This Cookie and Local Storage Policy explains how TutorSnap AI ("TutorSnap", "we", "us", or "our"), developed by Etiendem Technologies, uses local storage technologies on your device. Because TutorSnap is a mobile application rather than a website, we use device-based storage (AsyncStorage) rather than traditional browser cookies. This policy describes what data is stored, why it is stored, and how you can manage or delete it.

1. WHAT IS LOCAL STORAGE?

Local storage refers to data stored directly on your device by the TutorSnap application. Unlike server-side databases, this data never leaves your device unless you explicitly share it. It is similar in function to browser cookies but is specific to mobile app storage.

TutorSnap uses React Native AsyncStorage as its primary local storage mechanism. All data is stored in a sandboxed app container that is inaccessible to other apps on your device.

2. CATEGORIES OF DATA WE STORE LOCALLY

2.1 Essential Storage (Required for app functionality)

Study Progress Data: Your current streak count, longest streak achieved, daily goal setting, total number of problems solved, XP (experience points) accumulated, subject mastery levels (Bronze, Silver, Gold), and badge history. This data is essential for the streak and progress features to function.

Solve History: A record of every problem you have solved, including the problem text, the AI-generated solution, the date and time, and any bookmarks you have added. This data powers the History tab and allows you to review past solutions.

Flashcard Data: All flashcard decks you have created, including card fronts, card backs, deck names, review history, and spaced repetition scheduling data.

Notes: Any notes you have written within the app.

App Preferences: Your chosen theme (light or dark mode), text size preference, preferred subjects, grade level setting, language preference, and any custom settings you have configured.

Notification Settings: Your notification preferences, daily reminder times, and notification type toggles.

Session Continuity Data: Temporary session identifiers that allow the AI Chat Tutor to maintain conversation context across app restarts. These identifiers are rotated regularly and do not contain personal information.

2.2 Optional Storage (Only with your consent)

Analytics Preferences: If you consent to analytics, a flag indicating your consent is stored locally. Anonymized usage data (such as which features are used most often) may then be collected to help us improve the app. You can withdraw this consent at any time via Settings > Legal and Privacy > Consent Management.

Marketing Preferences: If you consent to marketing communications, your preference is stored locally. You can withdraw consent at any time.

2.3 Authentication Data (Only if you create an account)

If you create a TutorSnap account, an encrypted authentication token is stored locally to keep you signed in. This token does not contain your password. It is invalidated when you sign out.

3. WHAT WE DO NOT STORE

TutorSnap does not store the following on your device or our servers:
- Your name, address, phone number, or payment information
- Your device's location or GPS coordinates
- Your contact list or call history
- Photos or camera roll content (images are processed temporarily and not saved)
- Biometric data
- Advertising identifiers (IDFA on iOS, GAID on Android)
- Cross-app tracking data

4. THIRD-PARTY STORAGE

TutorSnap does not use third-party advertising cookies, tracking pixels, or behavioral analytics SDKs. The only third-party data processing that occurs is:

AI Processing: When you submit a problem for solving, the problem text is sent to our AI processing service. This is a transient operation; the data is processed to generate a solution and is not stored by the third-party service beyond the processing window.

Crash Reporting (optional): If you consent to analytics, anonymized crash reports may be sent to help us identify and fix bugs. These reports contain no personal information or problem content.

5. HOW LONG IS DATA RETAINED?

Local data is retained on your device until you explicitly delete it or uninstall the app. There is no automatic expiry for local data.

Specific retention periods:
- Solve history: Retained indefinitely until you clear it via Settings > Clear History
- Flashcard decks: Retained until you delete individual decks
- Session tokens: Rotated every 30 days automatically
- Consent preferences: Retained until you change them in Consent Management

6. HOW TO MANAGE OR DELETE YOUR DATA

You have full control over your locally stored data:

Clear solve history only: Settings > Clear History. Deletes all solved problems but preserves streaks, badges, and preferences.

Reset all progress: Settings > Reset All Progress. Deletes all locally stored data including streaks, badges, history, flashcards, and preferences. This action cannot be undone.

Delete your account: Settings > Account > Delete Account. Removes your account and all server-side data.

Uninstall the app: Uninstalling TutorSnap from your device removes all locally stored data automatically.

Formal data deletion request: Settings > Legal and Privacy > Data Deletion Request, or email privacy@tutorsnapai.tech.

7. CHILDREN'S PRIVACY

TutorSnap does not require an account, and no personal information is collected from children under 13 without verifiable parental consent. All data stored for child users is stored locally on the device and is not transmitted to our servers.

Parents can request deletion of their child's data by emailing privacy@tutorsnapai.tech.

8. CHANGES TO THIS POLICY

We may update this Cookie and Local Storage Policy from time to time. When we make material changes, we will notify you through the app and update the "Last updated" date at the top of this policy. Continued use of TutorSnap after changes are posted constitutes your acceptance of the updated policy.

9. CONTACT US

If you have questions about this policy or our data practices, contact us at:

Etiendem Technologies
Privacy Team: privacy@tutorsnapai.tech
General: hello@tutorsnapai.tech
Website: tutorsnapai.tech/privacy`;

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
const COMMUNITY_GUIDELINES = `COMMUNITY GUIDELINES
Last updated: July 2026
Effective date: July 1, 2026

Welcome to TutorSnap AI, developed by Etiendem Technologies. TutorSnap is an academic learning platform designed to help students of all ages learn more effectively. These Community Guidelines exist to ensure that TutorSnap remains a safe, productive, and respectful environment for everyone.

By using TutorSnap, you agree to follow these guidelines. Violations may result in restricted access to features or, in serious cases, account suspension.

1. ACADEMIC INTEGRITY

TutorSnap is designed to be a learning aid, not a shortcut. We believe that understanding a concept is far more valuable than simply having an answer. We encourage all users to:

- Read and understand every step of a solution, not just the final answer
- Ask follow-up questions to the AI Tutor when a step is unclear
- Use solutions as a reference to check your own work, not to copy
- Attempt problems yourself before using TutorSnap to verify your approach

Using TutorSnap to complete graded assignments, exams, or tests without your teacher's knowledge may violate your school's academic integrity policy. We are not responsible for disciplinary consequences arising from misuse of the app.

If your teacher has approved the use of TutorSnap as a study tool, we encourage you to be transparent about how you use it.

2. APPROPRIATE USE

TutorSnap is designed for academic and educational purposes. You may use TutorSnap to:
- Solve and understand academic problems across all subjects
- Practice with quizzes and flashcards
- Get explanations of concepts from the AI Tutor
- Collaborate with classmates in the Classroom feature
- Plan your study schedule

You may not use TutorSnap to:
- Submit content that is hateful, discriminatory, violent, or sexually explicit
- Harass, bully, or threaten other users
- Attempt to circumvent content filters or safety measures
- Submit content that violates the intellectual property rights of others
- Use the app for commercial purposes without written permission from Etiendem Technologies
- Attempt to reverse-engineer, decompile, or tamper with the app
- Create multiple accounts to circumvent restrictions

3. RESPECTFUL COMMUNICATION

When using the Classroom feature, you are interacting with real teachers and students. We expect all users to:

- Communicate respectfully and professionally
- Avoid offensive, discriminatory, or inflammatory language
- Keep discussions focused on academic topics
- Respect the privacy of other users and not share their personal information
- Report inappropriate behavior using the reporting tools in the Classroom feature

Teachers using the Classroom feature are responsible for maintaining a respectful environment within their classrooms and for ensuring their use of TutorSnap complies with their institution's policies.

4. PRIVACY AND PERSONAL INFORMATION

When using TutorSnap, please protect your own privacy and the privacy of others:

- Do not photograph or submit content that contains personal information about other people, including names, faces, addresses, phone numbers, or financial information
- Only submit your own schoolwork for solving
- Do not share your account credentials with others
- Do not attempt to access another user's account or data
- Be mindful of what you include in Classroom posts, as they are visible to all classroom members

If you are under 18, we strongly recommend not including your full name, school name, or any other identifying information in your profile or classroom posts.

5. CONTENT STANDARDS

All content you submit to TutorSnap (problems, chat messages, classroom posts, feedback) must comply with the following standards.

Prohibited content includes:
- Hate speech targeting race, ethnicity, religion, gender, sexual orientation, disability, or national origin
- Violent or threatening content
- Sexually explicit or suggestive content
- Content that promotes illegal activities
- Spam, advertisements, or promotional content
- Misinformation or deliberately false academic content
- Content designed to manipulate or deceive the AI system

Our AI systems automatically filter content that violates these standards. Attempts to circumvent content filters are a violation of these guidelines.

6. CHILDREN'S SAFETY

TutorSnap is designed to be safe for students of all ages, including children under 13. We take children's safety very seriously:

- We do not collect personal information from children under 13 without verifiable parental consent
- All AI responses are filtered to ensure age-appropriate content
- The AI will not generate inappropriate, violent, or adult content in response to any query
- Parents can request deletion of their child's data at any time by emailing privacy@tutorsnapai.tech
- If you believe a child's safety is at risk, please contact us immediately at safety@tutorsnapai.tech

If you are a parent and have concerns about your child's use of TutorSnap, please review our Privacy Policy and contact us at privacy@tutorsnapai.tech.

7. INTELLECTUAL PROPERTY

TutorSnap respects intellectual property rights and expects users to do the same:

- Do not submit copyrighted textbook content in bulk for the purpose of reproducing it
- Do not use TutorSnap-generated content for commercial purposes without permission
- The solutions and explanations generated by TutorSnap are provided for personal educational use only
- TutorSnap's brand, logo, and app design are the property of Etiendem Technologies and may not be used without permission

8. REPORTING VIOLATIONS

If you encounter content or behavior that violates these guidelines, please report it:

In-app reporting:
- For AI responses: Tap the flag icon on any AI response
- For classroom content: Use the report button on any post or message
- For bugs or errors: Settings > Report a Bug

Direct contact:
- Safety concerns: safety@tutorsnapai.tech
- Privacy violations: privacy@tutorsnapai.tech
- General concerns: hello@tutorsnapai.tech

We review all reports and take appropriate action. We do not tolerate retaliation against users who report violations in good faith.

9. ENFORCEMENT

Violations of these guidelines may result in:

- A warning and request to modify behavior
- Temporary restriction of specific features (e.g., Classroom access)
- Permanent restriction of access to TutorSnap
- Reporting to appropriate authorities in cases involving illegal activity or imminent safety risks

We will always attempt to notify users of enforcement actions and provide an opportunity to appeal, except in cases involving serious safety risks or illegal activity.

To appeal an enforcement action, contact safety@tutorsnapai.tech with your account details and a description of the situation.

10. CHANGES TO THESE GUIDELINES

We may update these Community Guidelines from time to time to reflect changes in our platform, applicable laws, or community standards. We will notify users of material changes through the app. Continued use of TutorSnap after changes are posted constitutes acceptance of the updated guidelines.

11. CONTACT US

If you have questions about these guidelines or our enforcement practices, contact us at:

Etiendem Technologies
Safety Team: safety@tutorsnapai.tech
Privacy Team: privacy@tutorsnapai.tech
General: hello@tutorsnapai.tech
Website: tutorsnapai.tech

Thank you for being part of the TutorSnap community. Together, we can make learning better for everyone.`;

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
    try {
      await AsyncStorage.setItem("@tutorsnap/consent", JSON.stringify({ analytics, marketing }));
    } catch {
      // Non-critical: consent preference may not persist, but user flow continues
    }
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
            {APP_FULL_NAME} · {COMPANY_NAME}
          </Text>
          <Text style={[styles.contactDesc, { color: colors.border, marginTop: 4, fontSize: 11 }]}>
            {COPYRIGHT}
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
