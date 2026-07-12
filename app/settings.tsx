import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
  Modal,
  Alert,
  TextInput,
  type ScrollView as ScrollViewType,
} from "react-native";
import { useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import * as H from "@/lib/haptics";
import * as Linking from "expo-linking";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { getProgress, setDailyGoal } from "@/lib/progress";
import {
  getReminderSettings,
  saveReminderSettings,
  formatReminderTime,
  type ReminderSettings,
} from "@/lib/notifications";
import { SUBJECT_CATEGORIES, type SubjectCategory } from "@/lib/subjects";
import { useFontSize, FONT_SIZE_SCALES, SCALE_LABELS, type FontSizeScale } from "@/lib/font-size-provider";
import { SUPPORT_EMAIL, PRIVACY_URL, TERMS_URL } from "@/constants/app";
import { GRADE_OPTIONS, GRADE_LABELS, loadGlobalGrade, saveGlobalGrade } from "@/lib/grade-levels";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  getSubscriptionStatus,
  restorePurchases,
  openManageSubscriptions,
  type SubscriptionStatus,
} from "@/lib/subscription";

const GOAL_OPTIONS = [1, 2, 3, 5, 7, 10];
const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 6);
const MINUTE_OPTIONS = [0, 15, 30, 45];

const CATEGORIES = Object.entries(SUBJECT_CATEGORIES) as [SubjectCategory, { label: string; emoji: string; color: string }][];

const WHATS_NEW: { title: string; desc: string }[] = [
  { title: "Quiz History Detail", desc: "Tap any past quiz to see a full per-question breakdown — correct answer, your answer, and an explanation for every wrong response." },
  { title: "Classroom Overhaul", desc: "Feed search, sort & subject filter, homework due-date reminders, completion tracking, comment threads with replies, and bookmark buttons on every card." },
  { title: "Challenge History", desc: "Every challenge attempt is saved. Review past results with time, outcome, and problem text in the Leaderboard and Progress screens." },
  { title: "Deeper AI Solutions", desc: "Solve page now handles any difficulty — calculus, differential equations, abstract algebra — with 6-10 detailed steps, worked examples, and concept explanations." },
  { title: "Subject Accuracy Chart", desc: "Progress screen now shows a colour-coded bar chart of your average accuracy per subject so you can see exactly where to focus." },
];

const HOW_TO_STEPS = [
  { emoji: "📸", title: "Snap a Photo", desc: "Tap the Scan tab and point your camera at any homework problem. TutorSnap will read and solve it instantly." },
  { emoji: "⌨️", title: "Type a Question", desc: "On the Home tab, type any question in the input box and tap Solve. Works for any subject." },
  { emoji: "🎙️", title: "Speak Your Question", desc: "Tap the mic icon to record your question. TutorSnap transcribes and answers it." },
  { emoji: "💬", title: "Chat with AI Tutor", desc: "Open the Chat tab for a back-and-forth conversation. Ask follow-up questions, request examples, or explore topics." },
  { emoji: "🔥", title: "Build Your Streak", desc: "Solve at least your daily goal every day to keep your streak alive. Earn badges as you master subjects." },
  { emoji: "📚", title: "Practice Mode", desc: "Go to Practice to generate problems by subject and difficulty. Use Timed Quiz for a scored challenge." },
];

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.muted }]}>{title}</Text>
  );
}

function SettingsRow({
  icon,
  label,
  subtitle,
  right,
  onPress,
  colors,
  danger,
}: {
  icon: any;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  colors: any;
  danger?: boolean;
}) {
  const content = (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? `${colors.error}15` : `${colors.primary}15` }]}>
        <IconSymbol size={18} name={icon} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: danger ? colors.error : colors.foreground }]}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      {right ? (
        <View style={styles.rowRight}>{right}</View>
      ) : onPress ? (
        <IconSymbol size={16} name="chevron.right" color={colors.muted} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${period}`;
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { scrollTo } = useLocalSearchParams<{ scrollTo?: string }>();
  const scrollRef = useRef<ScrollViewType>(null);
  const whatsNewYRef = useRef<number>(0);
  const { colorScheme, setColorScheme } = useThemeContext();
  const isDark = colorScheme === "dark";
  const { scale: fontScale, setScale: setFontScale } = useFontSize();

  const [dailyGoal, setDailyGoalState] = useState(3);
  const [todaySolved, setTodaySolved] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [streak, setStreak] = useState(0);

  // Reminder state
  const [reminder, setReminder] = useState<ReminderSettings>({ enabled: false, hour: 19, minute: 0 });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerHour, setPickerHour] = useState(19);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [reminderSaving, setReminderSaving] = useState(false);

  // Modal states
  const [showHowTo, setShowHowTo] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // Preferred categories
  const [preferredCategories, setPreferredCategories] = useState<Set<SubjectCategory>>(new Set(["math", "english", "science", "social"]));

  // Subscription status
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [restoringPurchases, setRestoringPurchases] = useState(false);

  // Global grade level
  const [gradeLevel, setGradeLevelState] = useState<string | null>(null);
  const [showGradePicker, setShowGradePicker] = useState(false);

  // User name
  const [userName, setUserNameState] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // Redeem referral code
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);

  const handleRedeemCode = async () => {
    const code = redeemCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      Alert.alert("Invalid Code", "Please enter a valid referral code.");
      return;
    }
    setRedeemLoading(true);
    try {
      const { getOrCreateReferralCode } = await import("@/lib/affiliate");
      const myCode = await getOrCreateReferralCode();
      if (code === myCode.toUpperCase()) {
        Alert.alert("Oops!", "You cannot use your own referral code.");
        setRedeemLoading(false);
        return;
      }
      const applied = await AsyncStorage.getItem("@referral_applied");
      if (applied) {
        Alert.alert("Already Applied", "You have already redeemed a referral code on this device.");
        setRedeemLoading(false);
        return;
      }
      await AsyncStorage.setItem("@referral_applied", code);
      setShowRedeemModal(false);
      setRedeemCode("");
      Alert.alert(
        "🎁 Code Applied!",
        `Your 14-day free trial has been activated. Enjoy unlimited TutorSnap!`,
        [{ text: "Start Learning 🚀" }]
      );
    } catch {
      Alert.alert("Error", "Could not apply code. Please try again.");
    } finally {
      setRedeemLoading(false);
    }
  };

  // Auto-scroll to What's New when opened via notification deep link
  useEffect(() => {
    if (scrollTo === "whats_new" && whatsNewYRef.current > 0) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: whatsNewYRef.current - 16, animated: true });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [scrollTo]);

  useEffect(() => {
    getProgress().then((p) => {
      setDailyGoalState(p.streak.dailyGoal);
      setTodaySolved(p.streak.todaySolved);
      setTotalSolved(p.streak.totalSolved);
      setStreak(p.streak.currentStreak);
    });
    getReminderSettings().then(setReminder);
    getSubscriptionStatus().then(setSubStatus).catch(() => {});
    loadGlobalGrade().then((g: string | null) => setGradeLevelState(g));
    AsyncStorage.getItem("@tutorsnap/userName").then((n: string | null) => setUserNameState(n || null));
    AsyncStorage.getItem("@tutorsnap/preferredCategories").then((raw) => {
      if (raw) {
        try {
          const arr = JSON.parse(raw) as SubjectCategory[];
          if (arr.length > 0) setPreferredCategories(new Set(arr));
        } catch { /* ignore */ }
      }
    });
  }, []);

  const handleToggleTheme = () => {
    H.impactMedium()
    setColorScheme(isDark ? "light" : "dark");
  };

  const handleSetGoal = async (goal: number) => {
    H.impactLight()
    setDailyGoalState(goal);
    try {
      await setDailyGoal(goal);
    } catch { /* goal save failure is non-critical */ }
  };

  const handleToggleReminder = async (value: boolean) => {
    H.impactMedium()
    if (value) {
      setPickerHour(reminder.hour);
      setPickerMinute(reminder.minute);
      setShowTimePicker(true);
    } else {
      setReminderSaving(true);
      try {
        const updated = { ...reminder, enabled: false };
        await saveReminderSettings(updated);
        setReminder(updated);
      } catch { /* reminder save failure is non-critical */ } finally {
        setReminderSaving(false);
      }
    }
  };

  const handleSaveTime = async () => {
    H.notificationSuccess()
    setShowTimePicker(false);
    setReminderSaving(true);
    try {
      const updated: ReminderSettings = { enabled: true, hour: pickerHour, minute: pickerMinute };
      await saveReminderSettings(updated);
      setReminder(updated);
    } catch { /* reminder save failure is non-critical */ } finally {
      setReminderSaving(false);
    }
  };

  const handleEditTime = () => {
    if (!reminder.enabled) return;
    setPickerHour(reminder.hour);
    setPickerMinute(reminder.minute);
    setShowTimePicker(true);
  };

  const handleToggleCategory = async (cat: SubjectCategory) => {
    H.impactLight()
    const next = new Set(preferredCategories);
    if (next.has(cat)) {
      if (next.size <= 1) return; // must keep at least one
      next.delete(cat);
    } else {
      next.add(cat);
    }
    setPreferredCategories(next);
    try {
      await AsyncStorage.setItem("@tutorsnap/preferredCategories", JSON.stringify(Array.from(next)));
    } catch { /* category save failure is non-critical */ }
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "This will permanently delete all your solved problems. Your streak and progress stats will not be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear History",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("math_history");
              H.notificationSuccess()
            } catch {
              Alert.alert("Error", "Could not clear history. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleResetProgress = () => {
    Alert.alert(
      "Reset All Progress",
      "This will permanently delete your streak, daily stats, quiz history, bookmarks, and badges. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
            try {
              const keysToDelete = [
                // Progress & streaks
                "math_progress",
                "streak_shield",
                "streak_freeze_v2",
                // History & bookmarks
                "math_history",
                "math_bookmarks",
                // Quiz
                "tutorsnap_quiz_history",
                "tutorsnap_weekly_quiz_goal",
                // Challenge history
                "challenge_history_v1",
                // Badges & crash log
                "@tutorsnap/seenBadges",
                "tutorsnap_crash_log",
                // Chat sessions
                "@tutorsnap/chatSessions/index",
                "@tutorsnap/chatSessions/pins",
                "@tutorsnap/chatHistory",
                "@tutorsnap/chatSessionsMigrated",
                // Notification prefs
                "@tutorsnap/notificationPrefs",
                "@tutorsnap/reminderEnabled",
                "@tutorsnap/reminderHour",
                "@tutorsnap/reminderMinute",
                "@tutorsnap/reminderNotifId",
                "@tutorsnap/streakAlertNotifId",
                "@tutorsnap/weeklyReportNotifId",
                "@tutorsnap/plannerNotifIds",
                "@tutorsnap/hw_notif_ids",
                // Study planner
                "@tutorsnap/studyPlanner",
                // Daily challenge
                "@tutorsnap/dailyChallengeState",
                // Classroom
                "@tutorsnap/classroom",
                "@tutorsnap/classroom_feed",
                "@tutorsnap/classroom_leaderboard",
                "@tutorsnap/classroom_notif_prefs",
                "@tutorsnap/joined_classroom",
                "@tutorsnap/problem_comments",
                // Affiliate / referral
                "@tutorsnap/affiliateLastActivity",
                "@tutorsnap/leaderboard_friends",
                "@tutorsnap/my_invite_code",
                "@referral_applied",
                // Appearance & preferences
                "@tutorsnap/appearanceSettings",
                "@tutorsnap/preferredCategories",
                "chat_grade_level",
                "global_grade_level",
                // Consent
                "@tutorsnap/consent",
                // Misc
                "@tutorsnap/firstLaunchDate",
                "@tutorsnap/lastReviewPromptDate",
                "@tutorsnap/lastUpdateCheckDismissed",
                "@tutorsnap/trialStartedAt",
              ];
              await AsyncStorage.multiRemove(keysToDelete);
              // Clear per-subject difficulty keys, per-day quiz-bonus keys, and per-session chat keys
              const allKeys = await AsyncStorage.getAllKeys();
              const dynamicKeys = allKeys.filter((k) =>
                k.startsWith("@tutorsnap/subjectDifficulty_") ||
                k.startsWith("math_progress_quiz_bonus_") ||
                k.startsWith("@tutorsnap/chatSessions/")
              );
              if (dynamicKeys.length > 0) await AsyncStorage.multiRemove(dynamicKeys);
              H.notificationSuccess()
              // Refresh UI state
              setStreak(0);
              setTodaySolved(0);
              setTotalSolved(0);
              setDailyGoalState(3);
              setGradeLevelState(null);
              setUserNameState(null);
              setPreferredCategories(new Set(["math", "english", "science", "social"]));
              setReminder({ enabled: false, hour: 19, minute: 0 });
              Alert.alert("Reset Complete", "All progress and data has been cleared.");
            } catch {
              Alert.alert("Error", "Could not reset all data. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleShareProgress = async () => {
    H.impactLight()
    const header = userName ? `📚 ${userName}'s TutorSnap Progress` : "📚 TutorSnap Progress";
    const message = `${header}\n🔥 ${streak}-day streak\n✅ ${totalSolved} problems solved\n🎯 Daily goal: ${dailyGoal} problems\n\nDownload TutorSnap to ace your studies!`;
    try {
      if (Platform.OS === "web") {
        await Linking.openURL(`mailto:?subject=My TutorSnap Progress&body=${encodeURIComponent(message)}`);
      } else {
        const Sharing = await import("expo-sharing");
        const FileSystem = await import("expo-file-system/legacy");
        const fileUri = FileSystem.documentDirectory + "tutorsnap_progress.txt";
        await FileSystem.writeAsStringAsync(fileUri, message);
        await Sharing.shareAsync(fileUri, { mimeType: "text/plain", dialogTitle: "Share Progress" });
      }
    } catch { /* ignore */ }
  };

  const handleRateApp = async () => {
    H.impactLight()
    try {
      if (Platform.OS !== "web") {
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          await StoreReview.requestReview();
          return;
        }
      }
      // Fallback: open store page
      const url = Platform.OS === "ios"
        ? "https://apps.apple.com/app/tutorsnap/id6748052679"
        : "https://play.google.com/store/apps/details?id=space.manus.mathgenius";
      await Linking.openURL(url);
    } catch { /* store review or linking failure is non-critical */ }
  };

  const handleRestorePurchases = async () => {
    H.impactLight()
    setRestoringPurchases(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        H.notificationSuccess()
        Alert.alert("Purchases Restored", "Your premium subscription has been restored.");
        const updated = await getSubscriptionStatus();
        setSubStatus(updated);
      } else {
        Alert.alert("No Purchases Found", "We couldn't find any previous purchases for this account.");
      }
    } catch {
      Alert.alert("Error", "Could not restore purchases. Please try again.");
    } finally {
      setRestoringPurchases(false);
    }
  };

  // ── Delete Account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    H.impactLight();
    Alert.alert(
      "Delete Account",
      "This will permanently delete all your data — history, progress, bookmarks, flashcards, chat sessions, and settings. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            try {
              // Remove every known key
              const keysToDelete = [
                "math_progress", "streak_shield", "streak_freeze_v2",
                "math_history", "math_bookmarks",
                "tutorsnap_quiz_history", "tutorsnap_weekly_quiz_goal",
                "challenge_history_v1",
                "@tutorsnap/seenBadges", "tutorsnap_crash_log",
                "@tutorsnap/chatSessions/index", "@tutorsnap/chatSessions/pins",
                "@tutorsnap/chatHistory", "@tutorsnap/chatSessionsMigrated",
                "@tutorsnap/notificationPrefs",
                "@tutorsnap/reminderEnabled", "@tutorsnap/reminderHour",
                "@tutorsnap/reminderMinute", "@tutorsnap/reminderNotifId",
                "@tutorsnap/streakAlertNotifId", "@tutorsnap/weeklyReportNotifId",
                "@tutorsnap/plannerNotifIds", "@tutorsnap/hw_notif_ids",
                "@tutorsnap/studyPlanner", "@tutorsnap/dailyChallengeState",
                "@tutorsnap/classroom", "@tutorsnap/classroom_feed",
                "@tutorsnap/classroom_leaderboard", "@tutorsnap/classroom_notif_prefs",
                "@tutorsnap/joined_classroom", "@tutorsnap/problem_comments",
                "@tutorsnap/affiliateLastActivity", "@tutorsnap/leaderboard_friends",
                "@tutorsnap/my_invite_code", "@referral_applied",
                "@tutorsnap/appearanceSettings", "@tutorsnap/preferredCategories",
                "chat_grade_level", "global_grade_level",
                "@tutorsnap/consent", "@tutorsnap/onboardingDone",
                "@tutorsnap/userName",
                "@tutorsnap/firstLaunchDate", "@tutorsnap/lastReviewPromptDate",
                "@tutorsnap/lastUpdateCheckDismissed", "@tutorsnap/trialStartedAt",
                "@tutorsnap/colorScheme",
              ];
              await AsyncStorage.multiRemove(keysToDelete);
              // Also remove all dynamic keys
              const allKeys = await AsyncStorage.getAllKeys();
              const dynamicKeys = allKeys.filter((k) =>
                k.startsWith("math_progress_quiz_bonus_") ||
                k.startsWith("@tutorsnap/chatSessions/") ||
                k.startsWith("@tutorsnap/usage/")
              );
              if (dynamicKeys.length > 0) await AsyncStorage.multiRemove(dynamicKeys);
              H.notificationSuccess();
              // Navigate to onboarding
              router.replace("/onboarding" as any);
            } catch {
              Alert.alert("Error", "Could not delete account data. Please try again.");
            }
          },
        },
      ]
    );
  };

  // ── Export My Data ───────────────────────────────────────────────────────────
  const handleExportData = async () => {
    H.impactLight();
    try {
      // Gather all known keys
      const allKeys = await AsyncStorage.getAllKeys();
      const tutorKeys = allKeys.filter((k) =>
        k.startsWith("@tutorsnap/") ||
        k.startsWith("math_") ||
        k.startsWith("tutorsnap_") ||
        k.startsWith("challenge_") ||
        k.startsWith("streak_") ||
        k.startsWith("global_grade") ||
        k.startsWith("chat_grade")
      );
      const pairs = await AsyncStorage.multiGet(tutorKeys);
      const exportObj: Record<string, any> = {
        exportedAt: new Date().toISOString(),
        appVersion: Constants.expoConfig?.version ?? "1.1.0",
        data: {} as Record<string, any>,
      };
      for (const [key, value] of pairs) {
        try {
          exportObj.data[key] = value ? JSON.parse(value) : null;
        } catch {
          exportObj.data[key] = value;
        }
      }
      const json = JSON.stringify(exportObj, null, 2);
      const fileName = `tutorsnap-export-${new Date().toISOString().slice(0, 10)}.json`;
      const fileUri = (FileSystem.cacheDirectory ?? "") + fileName;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Export TutorSnap Data",
          UTI: "public.json",
        });
      } else {
        Alert.alert("Exported", `Data saved to:\n${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert("Export Failed", "Could not export your data. Please try again.");
    }
  };

  const handleManageSubscription = async () => {
    H.impactLight();
    try {
      await openManageSubscriptions();
    } catch {
      // openManageSubscriptions is a no-op on web/dev — show a helpful fallback
      Alert.alert(
        "Manage Subscription",
        "To manage your subscription, open the App Store (iOS) or Google Play Store (Android), go to your account, and select Subscriptions."
      );
    }
  };

  const handlePrivacyPolicy = () => {
    H.impactLight()
    Linking.openURL(PRIVACY_URL).catch(() => {});
  };

  const handleContactSupport = () => {
    H.impactLight()
    const subject = encodeURIComponent("TutorSnap Support Request");
    const body = encodeURIComponent(`Hi TutorSnap team,\n\nApp version: ${Constants.expoConfig?.version ?? "1.1.0"}\nPlatform: ${Platform.OS}\n\nIssue / Question:\n`);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() => {});
  };

  const handleTerms = () => {
    H.impactLight()
    Linking.openURL(TERMS_URL).catch(() => {});
  };

  const preferredCategoryLabels = Array.from(preferredCategories)
    .map((c) => SUBJECT_CATEGORIES[c]?.emoji)
    .join(" ");

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Stats Summary */}
        <View style={[styles.statsCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Day Streak</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{todaySolved}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Today</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalSolved}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Total Solved</Text>
          </View>
        </View>

        {/* Appearance */}
        <SectionHeader title="APPEARANCE" colors={colors} />
        <SettingsRow
          icon="paintbrush.fill"
          label="Appearance & Personalisation"
          subtitle="Fonts, colors, widgets, chat style, accessibility"
          colors={colors}
          onPress={() => router.push("/appearance-settings" as any)}
        />
        <SettingsRow
          icon="gear"
          label="Dark Mode"
          subtitle={isDark ? "Currently using dark theme" : "Currently using light theme"}
          colors={colors}
          right={
            <Switch
              value={isDark}
              onValueChange={handleToggleTheme}
              trackColor={{ false: colors.border, true: `${colors.primary}80` }}
              thumbColor={isDark ? colors.primary : "#FFFFFF"}
            />
          }
        />

        {/* Daily Goal */}
        <SectionHeader title="DAILY GOAL" colors={colors} />
        <View style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.goalHeader}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.warning}15` }]}>
              <IconSymbol size={18} name="flame.fill" color={colors.warning} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Problems per day</Text>
              <Text style={[styles.rowSubtitle, { color: colors.muted }]}>
                You've solved {todaySolved} of {dailyGoal} today
              </Text>
            </View>
            <View style={[styles.goalBadge, { backgroundColor: `${colors.warning}20` }]}>
              <Text style={[styles.goalBadgeText, { color: colors.warning }]}>{dailyGoal}</Text>
            </View>
          </View>
          <View style={styles.goalOptions}>
            {GOAL_OPTIONS.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => handleSetGoal(g)}
                style={[
                  styles.goalOption,
                  {
                    backgroundColor: dailyGoal === g ? colors.primary : colors.background,
                    borderColor: dailyGoal === g ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.goalOptionText, { color: dailyGoal === g ? "#FFFFFF" : colors.foreground }]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <SectionHeader title="NOTIFICATIONS" colors={colors} />
        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}15` }]}>
            <IconSymbol size={18} name="bell.fill" color={colors.primary} />
          </View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Daily Study Reminder</Text>
            <Text style={[styles.rowSubtitle, { color: colors.muted }]}>
              {reminder.enabled
                ? `Reminder set for ${formatReminderTime(reminder.hour, reminder.minute)}`
                : "Get a daily nudge to keep your streak going"}
            </Text>
          </View>
          <View style={styles.rowRight}>
            {reminderSaving ? null : (
              <Switch
                value={reminder.enabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                thumbColor={reminder.enabled ? colors.primary : "#FFFFFF"}
                disabled={Platform.OS === "web"}
              />
            )}
          </View>
        </View>
        {reminder.enabled && Platform.OS !== "web" && (
          <TouchableOpacity
            accessibilityLabel="Edit"
            onPress={handleEditTime}
            activeOpacity={0.7}
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 2 }]}
          >
            <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol size={18} name="clock.fill" color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Reminder Time</Text>
              <Text style={[styles.rowSubtitle, { color: colors.muted }]}>
                {formatReminderTime(reminder.hour, reminder.minute)}
              </Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.muted} />
          </TouchableOpacity>
        )}

        <SettingsRow
          icon="bell.badge.fill"
          label="Notification Center"
          subtitle="Manage all notification types"
          colors={colors}
          onPress={() => router.push("/notification-center" as any)}
        />

        {/* Progress & Data */}
        <SectionHeader title="PROGRESS & DATA" colors={colors} />
        <SettingsRow
          icon="chart.xyaxis.line"
          label="View Progress"
          subtitle="Streaks, mastery, and weekly activity"
          colors={colors}
          onPress={() => router.push("/progress" as any)}
        />
        <SettingsRow
          icon="bookmark.fill"
          label="Bookmarks"
          subtitle="Your saved solutions"
          colors={colors}
          onPress={() => router.push("/bookmarks" as any)}
        />
        <SettingsRow
          icon="rectangle.stack.fill"
          label="Flashcards"
          subtitle="Review saved problems as flashcards"
          colors={colors}
          onPress={() => router.push("/flashcards" as any)}
        />
        <SettingsRow
          icon="calendar"
          label="Study Planner"
          subtitle="Schedule weekly study sessions with reminders"
          colors={colors}
          onPress={() => router.push("/study-planner" as any)}
        />
        <SettingsRow
          icon="trophy.fill"
          label="Streak Leaderboard"
          subtitle="Compare streaks with friends"
          colors={colors}
          onPress={() => router.push("/(tabs)/leaderboard" as any)}
        />
        <SettingsRow
          icon="person.2.fill"
          label="Preferred Subjects"
          subtitle={preferredCategoryLabels || "All subjects"}
          colors={colors}
          onPress={() => setShowSubjectPicker(true)}
        />
        <SettingsRow
          icon="person.crop.circle.fill"
          label="Your Name"
          subtitle={userName || "Not set — tap to add your name"}
          colors={colors}
          onPress={() => {
            setNameInput(userName || "");
            setShowNameModal(true);
          }}
        />
        <SettingsRow
          icon="graduationcap.fill"
          label="Default Grade Level"
          subtitle={gradeLevel ? GRADE_LABELS[gradeLevel] : "Not set — all screens will ask per session"}
          colors={colors}
          onPress={() => setShowGradePicker(true)}
        />
        <SettingsRow
          icon="person.2.fill"
          label="Classroom"
          subtitle="Share problems with your class or join one"
          colors={colors}
          onPress={() => router.push("/(tabs)/classroom" as any)}
        />
        <SettingsRow
          icon="square.and.arrow.up.fill"
          label="Share Progress"
          subtitle="Share your streak and stats"
          colors={colors}
          onPress={handleShareProgress}
        />
        <SettingsRow
          icon="eraser.fill"
          label="Clear History"
          subtitle="Delete all solved problems"
          colors={colors}
          onPress={handleClearHistory}
          danger
        />
        <SettingsRow
          icon="arrow.counterclockwise.circle.fill"
          label="Reset All Progress"
          subtitle="Delete streak, stats, badges, and history"
          colors={colors}
          onPress={handleResetProgress}
          danger
        />
        <SettingsRow
          icon="square.and.arrow.up.on.square.fill"
          label="Export My Data"
          subtitle="Download your history, progress, and settings as JSON"
          colors={colors}
          onPress={handleExportData}
        />
        <SettingsRow
          icon="person.crop.circle.badge.minus"
          label="Delete Account"
          subtitle="Permanently erase all data and return to onboarding"
          colors={colors}
          onPress={handleDeleteAccount}
          danger
        />

        {/* Subscription */}
        <SectionHeader title="SUBSCRIPTION" colors={colors} />
        {/* Status row */}
        {subStatus && (
          <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol size={18} name="star.fill" color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>TutorSnap Premium</Text>
              <Text style={[styles.rowSubtitle, { color: colors.muted }]}>
                {subStatus.isDevMode
                  ? "Dev mode — all features unlocked"
                  : subStatus.activeProductId
                  ? `Active — ${subStatus.activeProductId === "tutorsnap_annual" ? "Annual plan" : "Monthly plan"}`
                  : subStatus.isTrialActive
                  ? `Free trial — ${subStatus.trialDaysRemaining} day${subStatus.trialDaysRemaining !== 1 ? "s" : ""} remaining`
                  : "Free tier — upgrade to unlock all features"}
              </Text>
            </View>
            {(subStatus.isPremium || subStatus.isTrialActive) && (
              <View style={[styles.goalBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.goalBadgeText, { color: colors.primary }]}>✓</Text>
              </View>
            )}
          </View>
        )}
        <SettingsRow
          icon="arrow.clockwise.circle.fill"
          label={restoringPurchases ? "Restoring…" : "Restore Purchases"}
          subtitle="Recover a previous subscription"
          colors={colors}
          onPress={restoringPurchases ? undefined : handleRestorePurchases}
        />
        <SettingsRow
          icon="creditcard.fill"
          label="Manage Subscription"
          subtitle="Change or cancel your plan in the App Store"
          colors={colors}
          onPress={handleManageSubscription}
        />
        <SettingsRow
          icon="crown.fill"
          label="View Premium Plans"
          subtitle="Upgrade for unlimited access"
          colors={colors}
          onPress={() => router.push("/paywall" as any)}
        />
        <SettingsRow
          icon="paperplane.fill"
          label="Affiliate & Referrals"
          subtitle="Earn free days — 5 ways to earn, tier rewards"
          colors={colors}
          onPress={() => router.push("/refer" as any)}
        />
        <SettingsRow
          icon="trophy.fill"
          label="Global Rankings"
          subtitle="See the weekly top learners"
          colors={colors}
          onPress={() => router.push("/(tabs)/leaderboard" as any)}
        />
        <SettingsRow
          icon="gift.fill"
          label="Redeem a Friend's Code"
          subtitle="Enter a referral code to activate your free trial"
          colors={colors}
          onPress={() => setShowRedeemModal(true)}
        />

        {/* About */}
        <SectionHeader title="ABOUT" colors={colors} />
        <SettingsRow
          icon="info.circle"
          label="About TutorSnap"
          subtitle={`Version ${Constants.expoConfig?.version ?? "1.1.0"} — AI-powered academic tutor`}
          colors={colors}
          onPress={() => setShowAbout(true)}
        />
        <SettingsRow
          icon="book.fill"
          label="How to use TutorSnap"
          subtitle="Step-by-step guide for all features"
          colors={colors}
          onPress={() => setShowHowTo(true)}
        />
        <SettingsRow
          icon="questionmark.circle"
          label="Help Center / FAQ"
          subtitle="Browse 25+ answers to common questions"
          colors={colors}
          onPress={() => router.push("/faq" as any)}
        />
        <SettingsRow
          icon="star.bubble.fill"
          label="Rate TutorSnap"
          subtitle="Love the app? Leave us a review"
          colors={colors}
          onPress={handleRateApp}
        />
        <SettingsRow
          icon="hand.raised.fill"
          label="Privacy Policy"
          subtitle="How we handle your data"
          colors={colors}
          onPress={handlePrivacyPolicy}
        />
        <SettingsRow
          icon="doc.text.fill"
          label="Terms of Service"
          subtitle="Usage terms and conditions"
          colors={colors}
          onPress={handleTerms}
        />
        <SettingsRow
          icon="envelope.fill"
          label="Contact Support"
          subtitle="Get help or send feedback"
          colors={colors}
          onPress={handleContactSupport}
        />
        <SettingsRow
          icon="bubble.left.and.text.bubble.right.fill"
          label="Send Feedback"
          subtitle="Share ideas, suggestions, or compliments"
          colors={colors}
          onPress={() => router.push("/feedback" as any)}
        />
        <SettingsRow
          icon="ladybug.fill"
          label="Report a Bug"
          subtitle="Found a problem? Let us know"
          colors={colors}
          onPress={() => router.push("/report-bug" as any)}
        />

        {/* Legal */}
        <SectionHeader title="LEGAL & PRIVACY" colors={colors} />
        <SettingsRow
          icon="scale.3d"
          label="Legal & Privacy Hub"
          subtitle="Privacy Policy, Terms, Licenses, and more"
          colors={colors}
          onPress={() => router.push("/legal" as any)}
        />

        {/* What's New */}
        <View
          style={[styles.whatsNewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onLayout={(e) => { whatsNewYRef.current = e.nativeEvent.layout.y; }}
        >
          <View style={styles.whatsNewHeader}>
            <Text style={{ fontSize: 16 }}>🎉</Text>
            <Text style={[styles.whatsNewTitle, { color: colors.foreground }]}>What's New</Text>
            <View style={[styles.versionBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.versionBadgeText, { color: colors.primary }]}>v1.1.0</Text>
            </View>
          </View>
          {WHATS_NEW.map((item, i) => (
            <View key={i} style={styles.changelogRow}>
              <Text style={[styles.changelogDot, { color: colors.primary }]}>•</Text>
              <View style={styles.changelogContent}>
                <Text style={[styles.changelogLabel, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.changelogDesc, { color: colors.muted }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Subjects covered */}
        <View style={[styles.subjectsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.subjectsTitle, { color: colors.foreground }]}>Subjects Covered</Text>
          <View style={styles.subjectTags}>
            {CATEGORIES.map(([key, cat]) => (
              <View key={key} style={[styles.subjectTag, { backgroundColor: `${cat.color}15` }]}>
                <Text style={{ fontSize: 13 }}>{cat.emoji}</Text>
                <Text style={[styles.subjectTagText, { color: cat.color }]}>{cat.label}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.subjectsCount, { color: colors.muted }]}>
            38 subjects across 4 categories
          </Text>
        </View>

        {/* App version footer */}
        <View style={styles.versionFooter}>
          <Text style={[styles.versionText, { color: colors.muted }]}>
            TutorSnap v{Constants.expoConfig?.version ?? "1.1.0"}
          </Text>
          <Text style={[styles.versionBuild, { color: colors.border }]}>
            Expo SDK {Constants.expoConfig?.sdkVersion ?? "54"} · {Platform.OS}
          </Text>
        </View>

      </ScrollView>

      {/* ── Time Picker Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Set Reminder Time</Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              You'll get a daily nudge at this time
            </Text>
            <Text style={[styles.pickerLabel, { color: colors.muted }]}>HOUR</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4, gap: 8, flexDirection: "row" }}
              style={{ marginBottom: 16 }}
            >
              {HOUR_OPTIONS.map((h) => (
                <TouchableOpacity
                  accessibilityLabel="Toggle picker hour"
                  key={h}
                  onPress={() => {
                    H.impactLight()
                    setPickerHour(h);
                  }}
                  style={[styles.pickerChip, { backgroundColor: pickerHour === h ? colors.primary : colors.surface, borderColor: pickerHour === h ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.pickerChipText, { color: pickerHour === h ? "#FFFFFF" : colors.foreground }]}>
                    {formatHour(h)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.pickerLabel, { color: colors.muted }]}>MINUTE</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
              {MINUTE_OPTIONS.map((m) => (
                <TouchableOpacity
                  accessibilityLabel="Toggle picker minute"
                  key={m}
                  onPress={() => {
                    H.impactLight()
                    setPickerMinute(m);
                  }}
                  style={[styles.pickerChip, { backgroundColor: pickerMinute === m ? colors.primary : colors.surface, borderColor: pickerMinute === m ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.pickerChipText, { color: pickerMinute === m ? "#FFFFFF" : colors.foreground }]}>
                    :{m.toString().padStart(2, "0")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.previewTime, { color: colors.primary }]}>
              {formatReminderTime(pickerHour, pickerMinute)}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)} style={[styles.modalBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}
                accessibilityLabel="Toggle show time picker">
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveTime} style={[styles.modalBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}
                accessibilityLabel="Save">
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Set Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── How To Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={showHowTo}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHowTo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border, maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>How to use TutorSnap</Text>
              <TouchableOpacity onPress={() => setShowHowTo(false)} style={styles.modalClose}
                accessibilityLabel="Toggle show how to">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
              {HOW_TO_STEPS.map((step, i) => (
                <View key={i} style={[styles.howToRow, { borderBottomColor: colors.border, borderBottomWidth: i < HOW_TO_STEPS.length - 1 ? 0.5 : 0 }]}>
                  <Text style={styles.howToEmoji}>{step.emoji}</Text>
                  <View style={styles.howToContent}>
                    <Text style={[styles.howToTitle, { color: colors.foreground }]}>{step.title}</Text>
                    <Text style={[styles.howToDesc, { color: colors.muted }]}>{step.desc}</Text>
                  </View>
                </View>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── About Modal ───────────────────────────────────────────────────── */}
      <Modal
        visible={showAbout}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAbout(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>About TutorSnap</Text>
              <TouchableOpacity onPress={() => setShowAbout(false)} style={styles.modalClose}
                accessibilityLabel="Toggle show about">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.aboutLogoRow}>
              <Text style={styles.aboutLogo}>🎓</Text>
              <View>
                <Text style={[styles.aboutAppName, { color: colors.foreground }]}>TutorSnap</Text>
                <Text style={[styles.aboutVersion, { color: colors.muted }]}>
                  Version {Constants.expoConfig?.version ?? "1.1.0"}
                </Text>
              </View>
            </View>
            <Text style={[styles.aboutDesc, { color: colors.muted }]}>
              TutorSnap is your AI-powered academic tutor for every subject — from Algebra and Calculus to World History and Creative Writing. Snap a photo of any problem, type a question, or speak your query to get instant step-by-step solutions.
            </Text>
            <View style={[styles.aboutDivider, { backgroundColor: colors.border }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutRowLabel, { color: colors.muted }]}>Platform</Text>
              <Text style={[styles.aboutRowValue, { color: colors.foreground }]}>{Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web"}</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutRowLabel, { color: colors.muted }]}>Expo SDK</Text>
              <Text style={[styles.aboutRowValue, { color: colors.foreground }]}>{Constants.expoConfig?.sdkVersion ?? "54"}</Text>
            </View>
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutRowLabel, { color: colors.muted }]}>Subjects</Text>
              <Text style={[styles.aboutRowValue, { color: colors.foreground }]}>38 across 4 categories</Text>
            </View>
            <View style={[styles.aboutDivider, { backgroundColor: colors.border }]} />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                accessibilityLabel="Rate app"
                onPress={() => { setShowAbout(false); handleRateApp(); }}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>⭐ Rate the App</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Preferred Subjects Modal ──────────────────────────────────────── */}
      <Modal
        visible={showSubjectPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubjectPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Preferred Subjects</Text>
              <TouchableOpacity onPress={() => setShowSubjectPicker(false)} style={styles.modalClose}
                accessibilityLabel="Toggle show subject picker">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              Choose which subject categories appear first in Practice and Solve.
            </Text>
            {CATEGORIES.map(([id, cat]) => {
              const isSelected = preferredCategories.has(id);
              return (
                <TouchableOpacity
                  accessibilityLabel="Toggle"
                  key={id}
                  onPress={() => handleToggleCategory(id)}
                  activeOpacity={0.7}
                  style={[
                    styles.catRow,
                    {
                      backgroundColor: isSelected ? `${cat.color}15` : colors.surface,
                      borderColor: isSelected ? cat.color : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catLabel, { color: isSelected ? cat.color : colors.foreground }]}>
                    {cat.label}
                  </Text>
                  {isSelected && (
                    <IconSymbol size={18} name="checkmark.circle.fill" color={cat.color} />
                  )}
                </TouchableOpacity>
              );
            })}
            <Text style={[styles.catHint, { color: colors.muted }]}>
              At least one category must remain selected.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Redeem Code Modal */}
      <Modal
        visible={showRedeemModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRedeemModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRedeemModal(false)}
        >
          <View
            style={[styles.redeemSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.redeemTitle, { color: colors.foreground }]}>🎁 Redeem a Friend's Code</Text>
            <Text style={[styles.redeemSubtitle, { color: colors.muted }]}>
              Enter the referral code your friend shared with you. Each device can redeem one code.
            </Text>
            <TextInput
              style={[styles.redeemInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Enter code (e.g. AB12CD34)"
              placeholderTextColor={colors.muted}
              value={redeemCode}
              onChangeText={(t) => setRedeemCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              returnKeyType="done"
              onSubmitEditing={handleRedeemCode}
            />
            <TouchableOpacity
              style={[styles.redeemBtn, { backgroundColor: colors.primary, opacity: redeemLoading ? 0.6 : 1 }]}
              onPress={handleRedeemCode}
              disabled={redeemLoading}
              activeOpacity={0.8}
            >
              <Text style={[styles.redeemBtnText, { color: "#fff" }]}>
                {redeemLoading ? "Applying..." : "Apply Code"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowRedeemModal(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={[styles.redeemBtnText, { color: colors.muted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>


      {/* ── Name Edit Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Your Name</Text>
              <TouchableOpacity onPress={() => setShowNameModal(false)} accessibilityLabel="Close" accessibilityRole="button">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              Used for your personalised greeting on the home screen.
            </Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter your first name"
              placeholderTextColor={colors.muted}
              autoFocus
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={async () => {
                const trimmed = nameInput.trim();
                await AsyncStorage.setItem("@tutorsnap/userName", trimmed);
                setUserNameState(trimmed || null);
                setShowNameModal(false);
                H.notificationSuccess();
              }}
              style={[
                styles.nameInput,
                { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowNameModal(false)}
                style={[styles.nameModalBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={[styles.nameModalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const trimmed = nameInput.trim();
                  await AsyncStorage.setItem("@tutorsnap/userName", trimmed);
                  setUserNameState(trimmed || null);
                  setShowNameModal(false);
                  H.notificationSuccess();
                }}
                style={[styles.nameModalBtn, { backgroundColor: colors.primary, flex: 1 }]}
                accessibilityLabel="Save name"
                accessibilityRole="button"
              >
                <Text style={[styles.nameModalBtnText, { color: "#fff" }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Grade Level Picker Modal ──────────────────────────────────────── */}
      <Modal
        visible={showGradePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGradePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border, maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Default Grade Level</Text>
              <TouchableOpacity onPress={() => setShowGradePicker(false)} accessibilityLabel="Close grade picker" accessibilityRole="button">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              This level will be pre-selected on every screen. You can still change it per session.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
              {/* "Any level" clear option */}
              <TouchableOpacity
                onPress={() => {
                  H.impactLight();
                  setGradeLevelState(null);
                  saveGlobalGrade(null);
                  setShowGradePicker(false);
                }}
                style={[styles.gradePickerRow, { backgroundColor: !gradeLevel ? `${colors.primary}15` : colors.surface, borderColor: !gradeLevel ? colors.primary : colors.border }]}
                activeOpacity={0.7}
                accessibilityLabel="Any level"
                accessibilityRole="radio"
                accessibilityState={{ checked: !gradeLevel }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gradePickerLabel, { color: !gradeLevel ? colors.primary : colors.foreground }]}>Any level</Text>
                  <Text style={[styles.gradePickerSub, { color: colors.muted }]}>Ask me each time</Text>
                </View>
                {!gradeLevel && <IconSymbol size={18} name="checkmark.circle.fill" color={colors.primary} />}
              </TouchableOpacity>
              {GRADE_OPTIONS.map((opt) => {
                const isActive = gradeLevel === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => {
                      H.impactLight();
                      setGradeLevelState(opt.id);
                      saveGlobalGrade(opt.id);
                      setShowGradePicker(false);
                    }}
                    style={[styles.gradePickerRow, { backgroundColor: isActive ? `${colors.primary}15` : colors.surface, borderColor: isActive ? colors.primary : colors.border }]}
                    activeOpacity={0.7}
                    accessibilityLabel={opt.label}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isActive }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gradePickerLabel, { color: isActive ? colors.primary : colors.foreground }]}>{opt.label}</Text>
                      <Text style={[styles.gradePickerSub, { color: colors.muted }]}>{opt.sub}</Text>
                    </View>
                    {isActive && <IconSymbol size={18} name="checkmark.circle.fill" color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScreenContainer>
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
  statsCard: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  statDivider: { width: 1, height: 36, marginHorizontal: 8 },
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
    marginBottom: 2,
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
  rowRight: { marginLeft: 8 },
  goalCard: {
    marginHorizontal: 16,
    marginBottom: 2,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  goalBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  goalBadgeText: { fontSize: 18, fontWeight: "800" },
  goalOptions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  goalOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  goalOptionText: { fontSize: 16, fontWeight: "700" },
  subjectsCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 2,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  subjectsTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  subjectTags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  subjectTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  subjectDot: { width: 7, height: 7, borderRadius: 4 },
  subjectTagText: { fontSize: 13, fontWeight: "600" },
  subjectsCount: { fontSize: 12, marginTop: 4 },
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
  modalSubtitle: { fontSize: 14, marginBottom: 20 },
  pickerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 10 },
  pickerChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  pickerChipText: { fontSize: 14, fontWeight: "700" },
  previewTime: { fontSize: 32, fontWeight: "800", textAlign: "center", marginBottom: 24, letterSpacing: -1 },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 16, fontWeight: "700" },
  // How To
  howToRow: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 14,
    alignItems: "flex-start",
  },
  howToEmoji: { fontSize: 26, lineHeight: 32 },
  howToContent: { flex: 1 },
  howToTitle: { fontSize: 15, fontWeight: "700", marginBottom: 3 },
  howToDesc: { fontSize: 13, lineHeight: 19 },
  // About
  aboutLogoRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16, marginTop: 8 },
  aboutLogo: { fontSize: 48 },
  aboutAppName: { fontSize: 22, fontWeight: "800" },
  aboutVersion: { fontSize: 13, marginTop: 2 },
  aboutDesc: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  aboutDivider: { height: 0.5, marginVertical: 12 },
  aboutRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  aboutRowLabel: { fontSize: 14 },
  aboutRowValue: { fontSize: 14, fontWeight: "600" },
  // Category picker
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  catEmoji: { fontSize: 22 },
  catLabel: { flex: 1, fontSize: 16, fontWeight: "600" },
  catHint: { fontSize: 12, textAlign: "center", marginTop: 8 },
  // Version footer
  versionFooter: { alignItems: "center", paddingVertical: 24, gap: 4 },
  versionText: { fontSize: 13, fontWeight: "600" },
  versionBuild: { fontSize: 11, fontWeight: "400" },
  // What's New
  whatsNewCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1, padding: 16 },
  whatsNewHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  whatsNewTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  versionBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  versionBadgeText: { fontSize: 12, fontWeight: "700" },
  changelogRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  changelogDot: { fontSize: 16, lineHeight: 20, marginTop: 1 },
  changelogContent: { flex: 1 },
  changelogLabel: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  changelogDesc: { fontSize: 13, lineHeight: 18 },
  redeemSheet: {
    margin: 24,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    gap: 12,
  },
  redeemTitle: { fontSize: 18, fontWeight: "700" },
  redeemSubtitle: { fontSize: 14, lineHeight: 20 },
  redeemInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 2,
    textAlign: "center",
  },
  redeemBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  redeemBtnText: { fontSize: 15, fontWeight: "700" },
  gradePickerRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 12 },
  gradePickerLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  gradePickerSub: { fontSize: 12 },
  nameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginTop: 8,
  },
  nameModalBtn: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  nameModalBtnText: { fontSize: 15, fontWeight: "700" },
});
