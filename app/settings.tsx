import React, { useState, useEffect , useRef } from "react";
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
  scheduleMonthlyBackupReminder,
  cancelMonthlyBackupReminder,
  isBackupReminderEnabled,
  getBackupReminderSettings,
  DEFAULT_BACKUP_REMINDER,
  type BackupReminderSettings,
} from "@/lib/notifications";
import { SUBJECT_CATEGORIES, type SubjectCategory } from "@/lib/subjects";
import { useFontSize } from "@/lib/font-size-provider";
import { SUPPORT_EMAIL } from "@/constants/app";
import { GRADE_OPTIONS, GRADE_LABELS, loadGlobalGrade, saveGlobalGrade } from "@/lib/grade-levels";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import * as MailComposer from "expo-mail-composer";
import * as Print from "expo-print";
import { getSubscriptionStatus,
  restorePurchases,
  openManageSubscriptions,
  type SubscriptionStatus,
} from "@/lib/subscription";
import { TutorSettingsModal } from "@/components/tutor-settings-modal";
import { useTutorSettings } from "@/components/tutor-settings-modal";

const GOAL_OPTIONS = [1, 2, 3, 5, 7, 10];
const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 6);
const MINUTE_OPTIONS = [0, 15, 30, 45];

const CATEGORIES = Object.entries(SUBJECT_CATEGORIES) as [SubjectCategory, { label: string; emoji: string; color: string }][];

const WHATS_NEW: { title: string; desc: string }[] = [
  { title: "Quiz History Detail", desc: "Tap any past quiz to see a full per-question breakdown: correct answer, your answer, and an explanation for every wrong response." },
  { title: "Classroom Overhaul", desc: "Feed search, sort & subject filter, homework due-date reminders, completion tracking, comment threads with replies, and bookmark buttons on every card." },
  { title: "Challenge History", desc: "Every challenge attempt is saved. Review past results with time, outcome, and problem text in the Leaderboard and Progress screens." },
  { title: "Deeper AI Solutions", desc: "Solve page now handles any difficulty (calculus, differential equations, abstract algebra) with 6-10 detailed steps, worked examples, and concept explanations." },
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
  const { scale: _fontScale, setScale: _setFontScale } = useFontSize();

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

  // Monthly backup reminder
  const [backupReminderEnabled, setBackupReminderEnabled] = useState(false);
  const [backupReminderSettings, setBackupReminderSettings] = useState<BackupReminderSettings>(DEFAULT_BACKUP_REMINDER);
  const [showBackupTimePicker, setShowBackupTimePicker] = useState(false);

  // Last export timestamp
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(null);

  // Data operation log (last 3 import/export actions)
  type DataOp = { type: "export_json" | "export_pdf" | "import_file" | "import_url"; date: string; items: number };
  const [dataOpLog, setDataOpLog] = useState<DataOp[]>([]);

  // Redeem referral code
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [showTutorSettings, setShowTutorSettings] = useState(false);
  const { settings: tutorSettings, update: updateTutorSetting, reset: resetTutorSettings } = useTutorSettings();

  const handleToggleBackupReminder = async (value: boolean) => {
    if (value) {
      const ok = await scheduleMonthlyBackupReminder(backupReminderSettings);
      if (ok) {
        setBackupReminderEnabled(true);
      } else {
        Alert.alert(
          "Permission Required",
          Platform.OS === "web"
            ? "Backup reminders are not available on web."
            : "Please allow notifications in your device settings to enable backup reminders."
        );
      }
    } else {
      await cancelMonthlyBackupReminder();
      setBackupReminderEnabled(false);
    }
  };

  const handleSaveBackupTime = async (newSettings: BackupReminderSettings) => {
    setBackupReminderSettings(newSettings);
    setShowBackupTimePicker(false);
    if (backupReminderEnabled) {
      await scheduleMonthlyBackupReminder(newSettings);
    }
  };

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
    isBackupReminderEnabled().then(setBackupReminderEnabled);
    getBackupReminderSettings().then(setBackupReminderSettings);
    AsyncStorage.getItem("@tutorsnap/lastExportedAt").then((v) => setLastExportedAt(v));
    AsyncStorage.getItem("@tutorsnap/dataOpLog").then((v) => { try { if (v) setDataOpLog(JSON.parse(v)); } catch {} });
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
                "@tutorsnap/classroom_display_name",
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
                // Data export log
                "@tutorsnap/dataOpLog",
                "@tutorsnap/lastExportedAt",
                // Backup reminder
                "@tutorsnap/backupReminderNotifId",
                "@tutorsnap/backupReminderEnabled",
                "@tutorsnap/backupReminderDay",
                "@tutorsnap/backupReminderHour",
                "@tutorsnap/backupReminderMinute",
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
        : "https://play.google.com/store/apps/details?id=com.tutorsnap.app";
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
                "@tutorsnap/classroom_display_name",
                "@tutorsnap/joined_classroom", "@tutorsnap/problem_comments",
                "@tutorsnap/affiliateLastActivity", "@tutorsnap/leaderboard_friends",
                "@tutorsnap/my_invite_code", "@referral_applied",
                "@tutorsnap/appearanceSettings", "@tutorsnap/preferredCategories",
                "chat_grade_level", "global_grade_level",
                "@tutorsnap/consent", "@tutorsnap/onboardingDone",
                "@tutorsnap/userName",
                "@tutorsnap/backupReminderNotifId", "@tutorsnap/backupReminderEnabled",
                "@tutorsnap/backupReminderDay", "@tutorsnap/backupReminderHour",
                "@tutorsnap/backupReminderMinute",
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
              // Offer a GDPR data-deletion confirmation email
              try {
                const canMail = await MailComposer.isAvailableAsync();
                if (canMail) {
                  await MailComposer.composeAsync({
                    recipients: [SUPPORT_EMAIL],
                    subject: "TutorSnap - Data Deletion Confirmation",
                    body:
                      `Hi TutorSnap Team,\n\nI have just deleted my account and all local data from the TutorSnap app on this device.\n\nPlease confirm that any server-side data associated with my account has also been removed in accordance with your Privacy Policy.\n\nDate: ${new Date().toISOString()}\n\nThank you.`,
                  });
                }
              } catch {
                // Mail composer unavailable — silently skip
              }
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
      const now = new Date().toISOString();
      await AsyncStorage.setItem("@tutorsnap/lastExportedAt", now);
      setLastExportedAt(now);
      const newJsonLog = [
        ...(JSON.parse((await AsyncStorage.getItem("@tutorsnap/dataOpLog")) ?? "[]")).slice(-2),
        { type: "export_json", date: now, items: Object.keys(exportObj.data).length },
      ];
      await AsyncStorage.setItem("@tutorsnap/dataOpLog", JSON.stringify(newJsonLog));
      setDataOpLog(newJsonLog);
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

  // ── Import My Data ───────────────────────────────────────────────────────────
  const [showImportUrlModal, setShowImportUrlModal] = useState(false);
  const [importUrlInput, setImportUrlInput] = useState("");
  const [importUrlLoading, setImportUrlLoading] = useState(false);

  /** Shared restore logic used by both file and URL import */
  const restoreFromParsed = async (parsed: any) => {
    if (!parsed?.data || typeof parsed.data !== "object") {
      Alert.alert("Invalid File", "The file does not contain a valid TutorSnap data export.");
      return;
    }
    Alert.alert(
      "Restore Data?",
      `This will overwrite your current data with the backup from ${parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleDateString() : "unknown date"}. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            try {
              const pairs: [string, string][] = Object.entries(parsed.data)
                .filter(([, v]) => v !== null && v !== undefined)
                .map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]);
              await AsyncStorage.multiSet(pairs);
              H.notificationSuccess();
              const d = parsed.data as Record<string, any>;
              const historyCount = (() => { try { const h = typeof d["math_history"] === "string" ? JSON.parse(d["math_history"]) : d["math_history"]; return Array.isArray(h) ? h.length : 0; } catch { return 0; } })();
              const bookmarkCount = (() => { try { const b = typeof d["math_bookmarks"] === "string" ? JSON.parse(d["math_bookmarks"]) : d["math_bookmarks"]; return Array.isArray(b) ? b.length : 0; } catch { return 0; } })();
              const quizCount = (() => { try { const q = typeof d["tutorsnap_quiz_history"] === "string" ? JSON.parse(d["tutorsnap_quiz_history"]) : d["tutorsnap_quiz_history"]; return Array.isArray(q) ? q.length : 0; } catch { return 0; } })();
              const streakVal = (() => { try { const p = typeof d["math_progress"] === "string" ? JSON.parse(d["math_progress"]) : d["math_progress"]; return p?.currentStreak ?? 0; } catch { return 0; } })();
              const lines = [
                historyCount > 0 ? `• ${historyCount} solved problem${historyCount !== 1 ? "s" : ""}` : null,
                bookmarkCount > 0 ? `• ${bookmarkCount} bookmark${bookmarkCount !== 1 ? "s" : ""}` : null,
                quizCount > 0 ? `• ${quizCount} quiz result${quizCount !== 1 ? "s" : ""}` : null,
                streakVal > 0 ? `• ${streakVal}-day streak` : null,
              ].filter(Boolean);
              const summary = lines.length > 0 ? `\n\n${lines.join("\n")}` : "";
              // Log the import operation
              const importNow = new Date().toISOString();
              const prevLog = JSON.parse((await AsyncStorage.getItem("@tutorsnap/dataOpLog")) ?? "[]");
              const newLog = [...prevLog.slice(-2), { type: "import_file", date: importNow, items: historyCount }];
              await AsyncStorage.setItem("@tutorsnap/dataOpLog", JSON.stringify(newLog));
              setDataOpLog(newLog);
              Alert.alert("Data Restored", `Your backup has been restored successfully.${summary}\n\nRestart the app to see all changes.`);
            } catch {
              Alert.alert("Restore Failed", "Could not restore data. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleImportFromUrl = async () => {
    const url = importUrlInput.trim();
    if (!url.startsWith("http")) {
      Alert.alert("Invalid URL", "Please enter a valid https:// URL pointing to your TutorSnap backup JSON.");
      return;
    }
    setImportUrlLoading(true);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      let parsed: any;
      try { parsed = JSON.parse(text); } catch {
        Alert.alert("Invalid File", "The URL did not return a valid JSON file.");
        setImportUrlLoading(false);
        return;
      }
      setShowImportUrlModal(false);
      setImportUrlInput("");
      await restoreFromParsed(parsed);
      // Log URL import operation
      const urlImportNow = new Date().toISOString();
      const prevUrlLog = JSON.parse((await AsyncStorage.getItem("@tutorsnap/dataOpLog")) ?? "[]");
      const newUrlLog = [...prevUrlLog.slice(-2), { type: "import_url", date: urlImportNow, items: 0 }];
      await AsyncStorage.setItem("@tutorsnap/dataOpLog", JSON.stringify(newUrlLog));
      setDataOpLog(newUrlLog);
    } catch (e: any) {
      Alert.alert("Download Failed", e?.message ?? "Could not download the backup file. Check the URL and try again.");
    } finally {
      setImportUrlLoading(false);
    }
  };

  const handleImportData = async () => {
    H.impactLight();
    try {
      // Accept JSON from local storage, iCloud Drive, and Google Drive.
      // On iOS, iCloud files arrive as public.json or public.plain-text UTIs;
      // on Android, Google Drive files may arrive as text/plain or application/octet-stream.
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain", "application/octet-stream", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const fileUri = result.assets[0].uri;
      const raw = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        Alert.alert("Invalid File", "The selected file is not a valid TutorSnap export.");
        return;
      }
      await restoreFromParsed(parsed);
    } catch {
      Alert.alert("Import Failed", "Could not open the file. Please try again.");
    }
  };

  // ── Export as PDF ────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    H.impactLight();
    try {
      // Gather data
      const [historyRaw, bookmarksRaw, quizRaw, progressRaw] = await Promise.all([
        AsyncStorage.getItem("math_history"),
        AsyncStorage.getItem("math_bookmarks"),
        AsyncStorage.getItem("tutorsnap_quiz_history"),
        AsyncStorage.getItem("math_progress"),
      ]);
      const history: any[] = historyRaw ? JSON.parse(historyRaw) : [];
      const bookmarks: any[] = bookmarksRaw ? JSON.parse(bookmarksRaw) : [];
      const quizHistory: any[] = quizRaw ? JSON.parse(quizRaw) : [];
      const progress: any = progressRaw ? JSON.parse(progressRaw) : {};

      const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const reportName = userName ? `${userName}'s TutorSnap Report` : "TutorSnap Progress Report";
      const gradeLine = gradeLevel ? ` · ${GRADE_LABELS[gradeLevel as keyof typeof GRADE_LABELS] ?? gradeLevel}` : "";
      const totalSolvedCount = history.length;
      const totalQuizzes = quizHistory.length;
      const avgScore = totalQuizzes > 0
        ? Math.round(quizHistory.reduce((s: number, q: any) => s + (q.score ?? 0), 0) / totalQuizzes)
        : 0;

      // Subject breakdown
      const subjectMap: Record<string, { solved: number; quizzes: number; totalScore: number }> = {};
      for (const h of history) {
        const s = h.subject ?? "Unknown";
        if (!subjectMap[s]) subjectMap[s] = { solved: 0, quizzes: 0, totalScore: 0 };
        subjectMap[s].solved++;
      }
      for (const q of quizHistory) {
        const s = q.subject ?? "Unknown";
        if (!subjectMap[s]) subjectMap[s] = { solved: 0, quizzes: 0, totalScore: 0 };
        subjectMap[s].quizzes++;
        subjectMap[s].totalScore += q.score ?? 0;
      }
      const subjectRows = Object.entries(subjectMap)
        .sort((a, b) => b[1].solved - a[1].solved)
        .map(([subj, data], i) => {
          const avgQ = data.quizzes > 0 ? Math.round(data.totalScore / data.quizzes) : null;
          return `<tr style="background:${i % 2 === 0 ? "#f9f9f9" : "#fff"}">
            <td style="padding:6px 10px;border:1px solid #e5e7eb">${subj}</td>
            <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">${data.solved}</td>
            <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">${data.quizzes}</td>
            <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center">${avgQ !== null ? avgQ + "%" : "-"}</td>
          </tr>`;
        }).join("");

      const historyRows = history.slice(0, 50).map((h: any, i: number) =>
        `<tr style="background:${i % 2 === 0 ? "#f9f9f9" : "#fff"}">
          <td style="padding:6px 10px;border:1px solid #e5e7eb">${i + 1}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb">${h.subject ?? "-"}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;max-width:300px;word-break:break-word">${(h.question ?? "").slice(0, 120)}${(h.question ?? "").length > 120 ? "…" : ""}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb">${h.timestamp ? new Date(h.timestamp).toLocaleDateString() : "-"}</td>
        </tr>`
      ).join("");

      const quizRows = quizHistory.slice(0, 30).map((q: any, i: number) =>
        `<tr style="background:${i % 2 === 0 ? "#f9f9f9" : "#fff"}">
          <td style="padding:6px 10px;border:1px solid #e5e7eb">${i + 1}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb">${q.subject ?? "-"}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb">${q.score ?? 0}%</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb">${q.correctAnswers ?? 0}/${q.totalQuestions ?? 0}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb">${q.gradeLevel ? (GRADE_LABELS[q.gradeLevel as keyof typeof GRADE_LABELS] ?? q.gradeLevel) : "-"}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb">${q.completedAt ? new Date(q.completedAt).toLocaleDateString() : "-"}</td>
        </tr>`
      ).join("");

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, Arial, sans-serif; margin: 32px; color: #11181C; }
    h1 { color: #0a7ea4; font-size: 24px; margin-bottom: 4px; }
    h2 { color: #0a7ea4; font-size: 16px; margin: 24px 0 8px; border-bottom: 2px solid #0a7ea4; padding-bottom: 4px; }
    .meta { color: #687076; font-size: 13px; margin-bottom: 24px; }
    .stats { display: flex; gap: 24px; margin-bottom: 24px; }
    .stat { background: #f5f5f5; border-radius: 10px; padding: 12px 20px; text-align: center; }
    .stat-val { font-size: 28px; font-weight: bold; color: #0a7ea4; }
    .stat-lbl { font-size: 12px; color: #687076; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #0a7ea4; color: #fff; padding: 8px 10px; text-align: left; }
    .footer { margin-top: 32px; color: #687076; font-size: 11px; text-align: center; }
  </style>
</head>
<body>
  <h1>🎓 ${reportName}</h1>
  <p class="meta">Exported on ${today}${gradeLine} · App v${Constants.expoConfig?.version ?? "1.1.0"}</p>
  <div class="stats">
    <div class="stat"><div class="stat-val">${totalSolvedCount}</div><div class="stat-lbl">Problems Solved</div></div>
    <div class="stat"><div class="stat-val">${bookmarks.length}</div><div class="stat-lbl">Bookmarks</div></div>
    <div class="stat"><div class="stat-val">${totalQuizzes}</div><div class="stat-lbl">Quizzes Taken</div></div>
    <div class="stat"><div class="stat-val">${avgScore}%</div><div class="stat-lbl">Avg Quiz Score</div></div>
    <div class="stat"><div class="stat-val">${progress.currentStreak ?? 0}🔥</div><div class="stat-lbl">Current Streak</div></div>
  </div>
  ${subjectRows ? `<h2>Subject Breakdown</h2><table><thead><tr><th>Subject</th><th style="text-align:center">Problems Solved</th><th style="text-align:center">Quizzes</th><th style="text-align:center">Avg Quiz Score</th></tr></thead><tbody>${subjectRows}</tbody></table>` : ""}
  ${historyRows ? `<h2>Solve History (last 50)</h2><table><thead><tr><th>#</th><th>Subject</th><th>Question</th><th>Date</th></tr></thead><tbody>${historyRows}</tbody></table>` : ""}
  ${quizRows ? `<h2>Quiz Results (last 30)</h2><table><thead><tr><th>#</th><th>Subject</th><th>Score</th><th>Correct</th><th>Grade</th><th>Date</th></tr></thead><tbody>${quizRows}</tbody></table>` : ""}
  <p class="footer">Generated by TutorSnap · tutorsnapai.tech</p>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const pdfName = `tutorsnap-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      const destUri = (FileSystem.cacheDirectory ?? "") + pdfName;
      await FileSystem.moveAsync({ from: uri, to: destUri });
      const canShare = await Sharing.isAvailableAsync();
      const canMail = await MailComposer.isAvailableAsync();

      // Build a brief preview of report contents
      const topSubject = Object.entries(subjectMap).sort((a, b) => b[1].solved - a[1].solved)[0];
      const previewLines = [
        `📝 ${totalSolvedCount} problem${totalSolvedCount !== 1 ? "s" : ""} solved`,
        totalQuizzes > 0 ? `🎯 ${totalQuizzes} quiz${totalQuizzes !== 1 ? "zes" : ""} · avg ${avgScore}%` : null,
        topSubject ? `🏆 Top subject: ${topSubject[0]}` : null,
        progress?.currentStreak > 0 ? `🔥 ${progress.currentStreak}-day streak` : null,
      ].filter(Boolean).join("  ·  ");
      const previewMsg = previewLines ? `${previewLines}\n\nHow would you like to share your PDF report?` : "How would you like to share your PDF report?";

      // Save PDF export to log
      const pdfNow = new Date().toISOString();
      await AsyncStorage.setItem("@tutorsnap/lastExportedAt", pdfNow);
      setLastExportedAt(pdfNow);
      let prevPdfLog: any[] = [];
      try { prevPdfLog = JSON.parse((await AsyncStorage.getItem("@tutorsnap/dataOpLog")) ?? "[]"); } catch { /* ignore */ }
      const newPdfLog = [
        ...prevPdfLog.slice(-2),
        { type: "export_pdf", date: pdfNow, items: totalSolvedCount },
      ];
      await AsyncStorage.setItem("@tutorsnap/dataOpLog", JSON.stringify(newPdfLog));
      setDataOpLog(newPdfLog);

      if (canShare && canMail) {
        // Offer both options
        Alert.alert(
          "Export Progress Report",
          previewMsg,
          [
            {
              text: "Share",
              onPress: () => Sharing.shareAsync(destUri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Export Progress Report" }),
            },
            {
              text: "Email",
              onPress: () => MailComposer.composeAsync({
                subject: `${userName ? `${userName}'s ` : ""}TutorSnap Progress Report`,
                body: "Hi,\n\nPlease find my TutorSnap progress report attached.\n\nSent from TutorSnap",
                attachments: [destUri],
              }),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      } else if (canShare) {
        await Sharing.shareAsync(destUri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Export Progress Report" });
      } else if (canMail) {
        await MailComposer.composeAsync({
          subject: `${userName ? `${userName}'s ` : ""}TutorSnap Progress Report`,
          body: "Hi,\n\nPlease find my TutorSnap progress report attached.\n\nSent from TutorSnap",
          attachments: [destUri],
        });
      } else {
        Alert.alert("PDF Saved", `Report saved to:\n${destUri}`);
      }
    } catch {
      Alert.alert("Export Failed", "Could not generate the PDF. Please try again.");
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

  const handleContactSupport = () => {
    H.impactLight()
    const subject = encodeURIComponent("TutorSnap Support Request");
    const body = encodeURIComponent(`Hi TutorSnap team,\n\nApp version: ${Constants.expoConfig?.version ?? "1.1.0"}\nPlatform: ${Platform.OS}\n\nIssue / Question:\n`);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() => {});
  };

  const preferredCategoryLabels = Array.from(preferredCategories)
    .map((c) => SUBJECT_CATEGORIES[c]?.emoji)
    .join(" ");

  // ── Settings search ─────────────────────────────────────────────────────────
  const [settingsQuery, setSettingsQuery] = useState("");
  const sq = settingsQuery.toLowerCase().trim();
  /** Returns true when the row should be visible given the current search query. */
  const ms = (label: string, subtitle?: string) =>
    sq === "" ||
    label.toLowerCase().includes(sq) ||
    (subtitle ?? "").toLowerCase().includes(sq);

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ minWidth: 30 }} />
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

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol size={16} name="magnifyingglass" color={colors.muted} />
          <TextInput
            value={settingsQuery}
            onChangeText={setSettingsQuery}
            placeholder="Search settings…"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={[styles.searchInput, { color: colors.foreground }]}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {settingsQuery.length > 0 && Platform.OS !== "ios" && (
            <TouchableOpacity onPress={() => setSettingsQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <IconSymbol size={16} name="xmark.circle.fill" color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── PROFILE ─────────────────────────────────────────────────────── */}
        {(ms("Your Name") || ms("Default Grade Level") || ms("Preferred Subjects")) && <SectionHeader title="PROFILE" colors={colors} />}
        {ms("Your Name", "Not set") && (
          <SettingsRow
            icon="person.crop.circle.fill"
            label="Your Name"
            subtitle={userName || "Not set - tap to add your name"}
            colors={colors}
            onPress={() => {
              setNameInput(userName || "");
              setShowNameModal(true);
            }}
          />
        )}
        {ms("Default Grade Level", "Not set - all screens will ask per session") && (
          <SettingsRow
            icon="graduationcap.fill"
            label="Default Grade Level"
            subtitle={gradeLevel ? GRADE_LABELS[gradeLevel] : "Not set - all screens will ask per session"}
            colors={colors}
            onPress={() => setShowGradePicker(true)}
          />
        )}
        {ms("Preferred Subjects", "All subjects") && (
          <SettingsRow
            icon="person.2.fill"
            label="Preferred Subjects"
            subtitle={preferredCategoryLabels || "All subjects"}
            colors={colors}
            onPress={() => setShowSubjectPicker(true)}
          />
        )}

        {/* ── APPEARANCE ──────────────────────────────────────────────────── */}
        {(ms("Appearance & Personalisation", "Fonts, colors, widgets") || ms("Dark Mode")) && <SectionHeader title="APPEARANCE" colors={colors} />}
        {ms("Appearance & Personalisation", "Fonts, colors, widgets, chat style, accessibility") && (
          <SettingsRow
            icon="paintbrush.fill"
            label="Appearance & Personalisation"
            subtitle="Fonts, colors, widgets, chat style, accessibility"
            colors={colors}
            onPress={() => router.push("/appearance-settings" as any)}
          />
        )}
        {ms("Dark Mode", "theme") && (
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
        )}

        {/* ── DAILY GOAL ──────────────────────────────────────────────────── */}
        {ms("Daily Goal", "Problems per day") && <SectionHeader title="DAILY GOAL" colors={colors} />}
        {ms("Daily Goal", "Problems per day") && (
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
        )}

        {/* ── NOTIFICATIONS ─────────────────────────────────────────────── */}
        {(ms("Daily Study Reminder") || ms("Reminder Time") || ms("All Notification Settings") || ms("Monthly Backup Reminder") || ms("Backup Reminder Schedule")) && <SectionHeader title="NOTIFICATIONS" colors={colors} />}
        {ms("Daily Study Reminder", "daily nudge") && (
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
        )}
        {ms("Reminder Time") && reminder.enabled && Platform.OS !== "web" && (
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
        {ms("All Notification Settings", "Manage streaks, homework") && (
          <SettingsRow
            icon="bell.badge.fill"
            label="All Notification Settings"
          subtitle="Manage streaks, homework, weekly reports, and more"
          colors={colors}
            onPress={() => router.push("/notification-center" as any)}
          />
        )}
        {ms("Monthly Backup Reminder", "monthly nudge") && (
          <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol size={18} name="square.and.arrow.down.fill" color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Monthly Backup Reminder</Text>
              <Text style={[styles.rowSubtitle, { color: colors.muted }]}>
                {backupReminderEnabled
                  ? "Reminder set for the 1st of each month"
                  : "Get a monthly nudge to export your data"}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Switch
                value={backupReminderEnabled}
                onValueChange={handleToggleBackupReminder}
                trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                thumbColor={backupReminderEnabled ? colors.primary : "#FFFFFF"}
                disabled={Platform.OS === "web"}
              />
            </View>
          </View>
        )}
        {ms("Backup Reminder Schedule") && backupReminderEnabled && Platform.OS !== "web" && (
          <TouchableOpacity
            accessibilityLabel="Edit backup reminder schedule"
            onPress={() => setShowBackupTimePicker(true)}
            activeOpacity={0.7}
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 2 }]}
          >
            <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol size={18} name="clock.fill" color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Backup Reminder Schedule</Text>
              <Text style={[styles.rowSubtitle, { color: colors.muted }]}>
                {`Day ${backupReminderSettings.day} of each month · ${formatReminderTime(backupReminderSettings.hour, backupReminderSettings.minute)}`}
              </Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.muted} />
          </TouchableOpacity>
        )}

        {/* ── LEARNING ──────────────────────────────────────────────────── */}
        {(ms("View Progress") || ms("Bookmarks") || ms("Flashcards") || ms("Study Planner") || ms("Classroom")) && <SectionHeader title="LEARNING" colors={colors} />}
        {ms("View Progress", "Streaks, mastery") && (
          <SettingsRow icon="chart.xyaxis.line" label="View Progress" subtitle="Streaks, mastery, and weekly activity" colors={colors} onPress={() => router.push("/progress" as any)} />
        )}
        {ms("Bookmarks", "saved solutions") && (
          <SettingsRow icon="bookmark.fill" label="Bookmarks" subtitle="Your saved solutions" colors={colors} onPress={() => router.push("/bookmarks" as any)} />
        )}
        {ms("Flashcards", "Review saved problems") && (
          <SettingsRow icon="rectangle.stack.fill" label="Flashcards" subtitle="Review saved problems as flashcards" colors={colors} onPress={() => router.push("/flashcards" as any)} />
        )}
        {ms("Study Planner", "Schedule weekly") && (
          <SettingsRow icon="calendar" label="Study Planner" subtitle="Schedule weekly study sessions with reminders" colors={colors} onPress={() => router.push("/study-planner" as any)} />
        )}
        {ms("Classroom", "Share problems") && (
          <SettingsRow icon="person.2.fill" label="Classroom" subtitle="Share problems with your class or join one" colors={colors} onPress={() => router.push("/(tabs)/classroom" as any)} />
        )}
        {ms("AI Tutor Settings", "Personality, style") && (
          <SettingsRow
            icon="waveform"
            label="AI Tutor Settings"
            subtitle="Personality, response style, chat behaviour & accessibility"
            colors={colors}
            onPress={() => { setShowTutorSettings(true); H.impactLight(); }}
          />
        )}

        {/* ── SUBSCRIPTION & REFERRALS ──────────────────────────────── */}
        {(ms("TutorSnap Premium") || ms("View Premium Plans") || ms("Restore Purchases") || ms("Manage Subscription") || ms("Affiliate & Referrals") || ms("Redeem")) && <SectionHeader title="SUBSCRIPTION & REFERRALS" colors={colors} />}
        {ms("TutorSnap Premium", "subscription") && subStatus && (
          <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol size={18} name="star.fill" color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>TutorSnap Premium</Text>
              <Text style={[styles.rowSubtitle, { color: colors.muted }]}>
                {subStatus.isDevMode
                  ? "Dev mode - all features unlocked"
                  : subStatus.activeProductId
                  ? `Active - ${subStatus.activeProductId === "tutorsnap_annual" ? "Annual plan" : "Monthly plan"}`
                  : subStatus.isTrialActive
                  ? `Free trial - ${subStatus.trialDaysRemaining} day${subStatus.trialDaysRemaining !== 1 ? "s" : ""} remaining`
                  : "Free tier - upgrade to unlock all features"}
              </Text>
            </View>
            {(subStatus.isPremium || subStatus.isTrialActive) && (
              <View style={[styles.goalBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.goalBadgeText, { color: colors.primary }]}>✓</Text>
              </View>
            )}
          </View>
        )}
        {ms("View Premium Plans", "Upgrade") && (
          <SettingsRow icon="crown.fill" label="View Premium Plans" subtitle="Upgrade for unlimited access" colors={colors} onPress={() => router.push("/paywall" as any)} />
        )}
        {ms("Restore Purchases", "subscription") && (
          <SettingsRow icon="arrow.clockwise.circle.fill" label={restoringPurchases ? "Restoring…" : "Restore Purchases"} subtitle="Recover a previous subscription" colors={colors} onPress={restoringPurchases ? undefined : handleRestorePurchases} />
        )}
        {ms("Manage Subscription", "cancel your plan") && (
          <SettingsRow icon="creditcard.fill" label="Manage Subscription" subtitle="Change or cancel your plan in the App Store" colors={colors} onPress={handleManageSubscription} />
        )}
        {ms("Affiliate & Referrals", "Earn free days") && (
          <SettingsRow icon="paperplane.fill" label="Affiliate & Referrals" subtitle="Earn free days - 5 ways to earn, tier rewards" colors={colors} onPress={() => router.push("/refer" as any)} />
        )}
        {ms("Redeem a Friend's Code", "referral code") && (
          <SettingsRow icon="gift.fill" label="Redeem a Friend's Code" subtitle="Enter a referral code to activate your free trial" colors={colors} onPress={() => setShowRedeemModal(true)} />
        )}

        {/* ── COMMUNITY ─────────────────────────────────────────────────── */}
        {(ms("Leaderboard") || ms("Share Progress")) && <SectionHeader title="COMMUNITY" colors={colors} />}
        {ms("Leaderboard", "weekly top learners") && (
          <SettingsRow icon="trophy.fill" label="Leaderboard" subtitle="Compare streaks and see the weekly top learners" colors={colors} onPress={() => router.push("/(tabs)/leaderboard" as any)} />
        )}
        {ms("Share Progress", "streak and stats") && (
          <SettingsRow icon="square.and.arrow.up.fill" label="Share Progress" subtitle="Share your streak and stats with friends" colors={colors} onPress={handleShareProgress} />
        )}

        {/* ── DATA MANAGEMENT ───────────────────────────────────────────── */}
        {(ms("Export My Data") || ms("Export as PDF") || ms("Import My Data") || ms("Import from URL") || ms("Clear History") || ms("Reset All Progress") || ms("Delete Account") || ms("Recent Data Activity")) && <SectionHeader title="DATA MANAGEMENT" colors={colors} />}
        {!lastExportedAt ? (
          <TouchableOpacity
            onPress={handleExportData}
            accessibilityRole="button"
            accessibilityLabel="Back up your data"
            style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: `${colors.warning}22`, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: `${colors.warning}55` }}
          >
            <Text style={{ fontSize: 18 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.warning }}>No backup yet</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Tap to export your data and keep it safe.</Text>
            </View>
          </TouchableOpacity>
        ) : (() => {
          const daysSince = Math.floor((Date.now() - new Date(lastExportedAt).getTime()) / 86400000);
          return daysSince > 30 ? (
            <TouchableOpacity
              onPress={handleExportData}
              accessibilityRole="button"
              accessibilityLabel="Back up your data"
              style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: `${colors.warning}22`, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: `${colors.warning}55` }}
            >
              <Text style={{ fontSize: 18 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.warning }}>Backup is {daysSince} days old</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Tap to export a fresh backup of your data.</Text>
              </View>
            </TouchableOpacity>
          ) : null;
        })()}
        {ms("Export My Data", "Download your history") && (
          <SettingsRow
            icon="square.and.arrow.up.on.square.fill"
            label="Export My Data"
          subtitle={lastExportedAt ? `Last exported: ${(() => { const d = new Date(lastExportedAt); const diff = Math.floor((Date.now() - d.getTime()) / 86400000); return diff === 0 ? "today" : diff === 1 ? "yesterday" : `${diff} days ago`; })()}` : "Download your history, progress, and settings as JSON"}
          colors={colors}
          onPress={handleExportData}
          />
        )}
        {ms("Export as PDF Report", "progress report") && (
          <SettingsRow
            icon="doc.text.fill"
            label="Export as PDF Report"
          subtitle="Share a formatted progress report with solve history and quiz scores"
          colors={colors}
          onPress={handleExportPDF}
          />
        )}
        {ms("Import My Data", "Restore a previous") && (
          <SettingsRow
            icon="square.and.arrow.down.fill"
            label="Import My Data"
          subtitle="Restore a previous TutorSnap JSON backup"
          colors={colors}
          onPress={handleImportData}
          />
        )}
        {ms("Import from URL", "cloud share link") && (
          <SettingsRow
            icon="link"
            label="Import from URL"
          subtitle="Restore a backup from a cloud share link"
          colors={colors}
          onPress={() => { H.impactLight(); setShowImportUrlModal(true); }}
          />
        )}
        {ms("Clear History", "Delete all solved") && (
          <SettingsRow
            icon="eraser.fill"
            label="Clear History"
          subtitle="Delete all solved problems"
          colors={colors}
          onPress={handleClearHistory}
            danger
          />
        )}
        {ms("Reset All Progress", "Delete streak") && (
          <SettingsRow
            icon="arrow.counterclockwise.circle.fill"
            label="Reset All Progress"
          subtitle="Delete streak, stats, badges, and history"
          colors={colors}
          onPress={handleResetProgress}
            danger
          />
        )}
        {ms("Delete Account", "Permanently erase") && (
          <SettingsRow
            icon="person.crop.circle.badge.minus"
            label="Delete Account"
          subtitle="Permanently erase all data and return to onboarding"
          colors={colors}
          onPress={handleDeleteAccount}
            danger
          />
        )}
        {ms("Recent Data Activity") && dataOpLog.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 12 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 0 }]}>Recent Data Activity</Text>
              <TouchableOpacity
                onPress={async () => {
                  await AsyncStorage.removeItem("@tutorsnap/dataOpLog");
                  setDataOpLog([]);
                }}
                accessibilityLabel="Clear activity log"
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 12, color: colors.error, fontWeight: "600" }}>Clear</Text>
              </TouchableOpacity>
            </View>
            {dataOpLog.slice().reverse().map((op, i) => {
              const opLabel = op.type === "export_json" ? "Exported JSON" : op.type === "export_pdf" ? "Exported PDF" : op.type === "import_file" ? "Imported from file" : "Imported from URL";
              const opIcon = op.type.startsWith("export") ? "↑" : "↓";
              const d = new Date(op.date);
              const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
              const dateStr = diff === 0 ? "Today" : diff === 1 ? "Yesterday" : `${diff} days ago`;
              return (
                <View key={i} style={[styles.dataOpRow, i < dataOpLog.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}>
                  <Text style={[styles.dataOpIcon, { color: op.type.startsWith("export") ? colors.primary : colors.success }]}>{opIcon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dataOpLabel, { color: colors.foreground }]}>{opLabel}</Text>
                    <Text style={[styles.dataOpMeta, { color: colors.muted }]}>{dateStr} · {op.items} item{op.items !== 1 ? "s" : ""}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── ABOUT & SUPPORT ───────────────────────────────────────────── */}
        {(ms("About TutorSnap") || ms("How to Use") || ms("Help Center") || ms("Rate TutorSnap") || ms("Contact Support") || ms("Send Feedback") || ms("Report a Bug")) && <SectionHeader title="ABOUT & SUPPORT" colors={colors} />}
        {ms("About TutorSnap", "AI-powered") && (
          <SettingsRow
            icon="info.circle"
            label="About TutorSnap"
          subtitle={`Version ${Constants.expoConfig?.version ?? "1.1.0"} - AI-powered academic tutor`}
          colors={colors}
          onPress={() => setShowAbout(true)}
          />
        )}
        {ms("How to Use TutorSnap", "Step-by-step guide") && (
          <SettingsRow
            icon="book.fill"
            label="How to Use TutorSnap"
          subtitle="Step-by-step guide for all features"
          colors={colors}
          onPress={() => setShowHowTo(true)}
          />
        )}
        {ms("Help Center / FAQ", "25+ answers") && (
          <SettingsRow
            icon="questionmark.circle"
            label="Help Center / FAQ"
          subtitle="Browse 25+ answers to common questions"
          colors={colors}
          onPress={() => router.push("/faq" as any)}
          />
        )}
        {ms("Rate TutorSnap", "Leave us a review") && (
          <SettingsRow
            icon="star.bubble.fill"
            label="Rate TutorSnap"
          subtitle="Love the app? Leave us a review"
          colors={colors}
          onPress={handleRateApp}
          />
        )}
        {ms("Contact Support", "Get help") && (
          <SettingsRow
            icon="envelope.fill"
            label="Contact Support"
          subtitle="Get help with your account or a feature"
          colors={colors}
          onPress={handleContactSupport}
          />
        )}
        {ms("Send Feedback", "ideas, suggestions") && (
          <SettingsRow
            icon="bubble.left.and.text.bubble.right.fill"
            label="Send Feedback"
          subtitle="Share ideas, suggestions, or compliments"
          colors={colors}
          onPress={() => router.push("/feedback" as any)}
          />
        )}
        {ms("Report a Bug", "Found a problem") && (
          <SettingsRow
            icon="ladybug.fill"
            label="Report a Bug"
          subtitle="Found a problem? Let us know"
          colors={colors}
          onPress={() => router.push("/report-bug" as any)}
          />
        )}

        {/* ── LEGAL & PRIVACY ───────────────────────────────────────────── */}
        {ms("Legal & Privacy Hub", "Privacy Policy, Terms") && <SectionHeader title="LEGAL & PRIVACY" colors={colors} />}
        {ms("Legal & Privacy Hub", "Privacy Policy, Terms") && (
          <SettingsRow
            icon="scale.3d"
            label="Legal & Privacy Hub"
          subtitle="Privacy Policy, Terms of Service, Licenses, and more"
          colors={colors}
          onPress={() => router.push("/legal" as any)}
          />
        )}

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
              TutorSnap is your AI-powered academic tutor for every subject, from Algebra and Calculus to World History and Creative Writing. Snap a photo of any problem, type a question, or speak your query to get instant step-by-step solutions.
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

      {/* ── Import from URL Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={showImportUrlModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImportUrlModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Import from URL</Text>
              <TouchableOpacity onPress={() => setShowImportUrlModal(false)} accessibilityLabel="Close" accessibilityRole="button">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              Paste a direct link to your TutorSnap backup JSON file (e.g. from iCloud Drive, Google Drive, or Dropbox).
            </Text>
            <TextInput
              style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 16 }]}
              value={importUrlInput}
              onChangeText={setImportUrlInput}
              placeholder="https://..."
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleImportFromUrl}
              editable={!importUrlLoading}
            />
            <TouchableOpacity
              onPress={handleImportFromUrl}
              style={[styles.nameModalBtn, { backgroundColor: importUrlLoading ? colors.border : colors.primary }]}
              disabled={importUrlLoading}
              accessibilityLabel="Download and restore backup"
              accessibilityRole="button"
            >
              <Text style={[styles.nameModalBtnText, { color: importUrlLoading ? colors.muted : colors.background }]}>
                {importUrlLoading ? "Downloading…" : "Download & Restore"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Backup Reminder Schedule Picker Modal ─────────────────────────── */}
      <Modal
        visible={showBackupTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBackupTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Backup Reminder Schedule</Text>
              <TouchableOpacity onPress={() => setShowBackupTimePicker(false)} accessibilityLabel="Close" accessibilityRole="button">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Choose which day of the month and time to receive your backup reminder.</Text>

            {/* Day picker */}
            <Text style={[styles.rowLabel, { color: colors.foreground, marginBottom: 6 }]}>Day of Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {[1, 5, 10, 15, 20, 25, 28].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setBackupReminderSettings((s) => ({ ...s, day: d }))}
                  style={[{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: backupReminderSettings.day === d ? colors.primary : colors.surface,
                    borderWidth: 1, borderColor: backupReminderSettings.day === d ? colors.primary : colors.border,
                  }]}
                  accessibilityLabel={`Day ${d}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: backupReminderSettings.day === d }}
                >
                  <Text style={{ color: backupReminderSettings.day === d ? colors.background : colors.foreground, fontWeight: "600" }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Hour picker */}
            <Text style={[styles.rowLabel, { color: colors.foreground, marginBottom: 6 }]}>Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
              {[7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 20, 21].map((h) => (
                <TouchableOpacity
                  key={h}
                  onPress={() => setBackupReminderSettings((s) => ({ ...s, hour: h, minute: 0 }))}
                  style={[{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: backupReminderSettings.hour === h ? colors.primary : colors.surface,
                    borderWidth: 1, borderColor: backupReminderSettings.hour === h ? colors.primary : colors.border,
                  }]}
                  accessibilityLabel={formatReminderTime(h, 0)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: backupReminderSettings.hour === h }}
                >
                  <Text style={{ color: backupReminderSettings.hour === h ? colors.background : colors.foreground, fontWeight: "600" }}>{formatReminderTime(h, 0)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => handleSaveBackupTime(backupReminderSettings)}
              style={[styles.nameModalBtn, { backgroundColor: colors.primary }]}
              accessibilityLabel="Save backup schedule"
              accessibilityRole="button"
            >
              <Text style={[styles.nameModalBtnText, { color: colors.background }]}>Save Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI Tutor System Settings Modal */}
      <TutorSettingsModal
        visible={showTutorSettings}
        onClose={() => setShowTutorSettings(false)}
        settings={tutorSettings}
        onUpdate={(patch) => updateTutorSetting(patch)}
        onReset={() => resetTutorSettings()}
        onClearHistory={() => {}}
        onExportChat={() => {}}
      />

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
  card: { borderRadius: 14, borderWidth: 0.5, padding: 14, marginHorizontal: 16 },
  cardTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 },
  dataOpRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 10 },
  dataOpIcon: { fontSize: 18, fontWeight: "700", width: 22, textAlign: "center" },
  dataOpLabel: { fontSize: 14, fontWeight: "600" },
  dataOpMeta: { fontSize: 12, marginTop: 1 },
  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
});
