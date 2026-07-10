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
} from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
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

const GOAL_OPTIONS = [1, 2, 3, 5, 7, 10];
const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 6);
const MINUTE_OPTIONS = [0, 15, 30, 45];

const CATEGORIES = Object.entries(SUBJECT_CATEGORIES) as [SubjectCategory, { label: string; emoji: string; color: string }][];

const WHATS_NEW: { title: string; desc: string }[] = [
  { title: "Error Recovery", desc: "Each screen now catches crashes and shows a friendly retry card instead of going blank." },
  { title: "Offline Indicator", desc: "A banner appears when you lose connection and confirms when you're back online." },
  { title: "Camera Scan Fix", desc: "The Scan tab now opens the live camera viewfinder directly on launch." },
  { title: "Adaptive Difficulty", desc: "Practice mode remembers your difficulty per subject and suggests upgrades based on quiz scores." },
  { title: "Timed Quiz Mode", desc: "30-second multiple-choice quizzes with scoring, streaks, and history tracking." },
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

  useEffect(() => {
    getProgress().then((p) => {
      setDailyGoalState(p.streak.dailyGoal);
      setTodaySolved(p.streak.todaySolved);
      setTotalSolved(p.streak.totalSolved);
      setStreak(p.streak.currentStreak);
    });
    getReminderSettings().then(setReminder);
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
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setColorScheme(isDark ? "light" : "dark");
  };

  const handleSetGoal = async (goal: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDailyGoalState(goal);
    await setDailyGoal(goal);
  };

  const handleToggleReminder = async (value: boolean) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (value) {
      setPickerHour(reminder.hour);
      setPickerMinute(reminder.minute);
      setShowTimePicker(true);
    } else {
      setReminderSaving(true);
      const updated = { ...reminder, enabled: false };
      await saveReminderSettings(updated);
      setReminder(updated);
      setReminderSaving(false);
    }
  };

  const handleSaveTime = async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowTimePicker(false);
    setReminderSaving(true);
    const updated: ReminderSettings = { enabled: true, hour: pickerHour, minute: pickerMinute };
    await saveReminderSettings(updated);
    setReminder(updated);
    setReminderSaving(false);
  };

  const handleEditTime = () => {
    if (!reminder.enabled) return;
    setPickerHour(reminder.hour);
    setPickerMinute(reminder.minute);
    setShowTimePicker(true);
  };

  const handleToggleCategory = async (cat: SubjectCategory) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = new Set(preferredCategories);
    if (next.has(cat)) {
      if (next.size <= 1) return; // must keep at least one
      next.delete(cat);
    } else {
      next.add(cat);
    }
    setPreferredCategories(next);
    await AsyncStorage.setItem("@tutorsnap/preferredCategories", JSON.stringify(Array.from(next)));
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
            await AsyncStorage.removeItem("math_history");
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
            const keysToDelete = [
              "math_progress",
              "streak_shield",
              "math_history",
              "math_bookmarks",
              "tutorsnap_quiz_history",
              "tutorsnap_weekly_quiz_goal",
              "@tutorsnap/seenBadges",
              "tutorsnap_crash_log",
            ];
            await AsyncStorage.multiRemove(keysToDelete);
            // Also clear per-subject difficulty keys
            const allKeys = await AsyncStorage.getAllKeys();
            const diffKeys = allKeys.filter((k) => k.startsWith("@tutorsnap/subjectDifficulty_"));
            if (diffKeys.length > 0) await AsyncStorage.multiRemove(diffKeys);
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Refresh stats
            setStreak(0);
            setTodaySolved(0);
            setTotalSolved(0);
            setDailyGoalState(3);
          },
        },
      ]
    );
  };

  const handleShareProgress = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const message = `📚 TutorSnap Progress\n🔥 ${streak}-day streak\n✅ ${totalSolved} problems solved\n🎯 Daily goal: ${dailyGoal} problems\n\nDownload TutorSnap to ace your studies!`;
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
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS !== "web") {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
        return;
      }
    }
    // Fallback: open store page
    const url = Platform.OS === "ios"
      ? "https://apps.apple.com/app/id0000000000"
      : "https://play.google.com/store/apps/details?id=com.tutorsnap.app";
    Linking.openURL(url);
  };

  const handlePrivacyPolicy = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("https://tutorsnapai.tech/privacy");
  };

  const handleContactSupport = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const subject = encodeURIComponent("TutorSnap Support Request");
    const body = encodeURIComponent(`Hi TutorSnap team,\n\nApp version: ${Constants.expoConfig?.version ?? "1.1.0"}\nPlatform: ${Platform.OS}\n\nIssue / Question:\n`);
    Linking.openURL(`mailto:support@tutorsnapai.tech?subject=${subject}&body=${body}`);
  };

  const handleTerms = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("https://tutorsnapai.tech/terms");
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

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
        {/* Font Size */}
        <View style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 2 }]}>
          <View style={styles.goalHeader}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol size={18} name="textformat.size" color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Text Size</Text>
              <Text style={[styles.rowSubtitle, { color: colors.muted }]}>{SCALE_LABELS[fontScale]}</Text>
            </View>
          </View>
          <View style={styles.goalOptions}>
            {FONT_SIZE_SCALES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFontScale(s);
                }}
                style={[
                  styles.goalOption,
                  { flex: 1, width: undefined,
                    backgroundColor: fontScale === s ? colors.primary : colors.background,
                    borderColor: fontScale === s ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.goalOptionText, { color: fontScale === s ? "#FFFFFF" : colors.foreground, fontSize: s === "small" ? 11 : s === "medium" ? 13 : s === "large" ? 15 : 17 }]}>
                  {s === "small" ? "A" : s === "medium" ? "A" : s === "large" ? "A" : "A"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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
          onPress={() => router.push("/leaderboard" as any)}
        />
        <SettingsRow
          icon="person.2.fill"
          label="Preferred Subjects"
          subtitle={preferredCategoryLabels || "All subjects"}
          colors={colors}
          onPress={() => setShowSubjectPicker(true)}
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
          icon="questionmark.circle"
          label="How to use TutorSnap"
          subtitle="Step-by-step guide for all features"
          colors={colors}
          onPress={() => setShowHowTo(true)}
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
        <View style={[styles.whatsNewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
            {[
              { label: "Mathematics", color: "#4F46E5" },
              { label: "English / ELA", color: "#0891B2" },
              { label: "Science", color: "#059669" },
              { label: "Social Studies", color: "#D97706" },
            ].map((s) => (
              <View key={s.label} style={[styles.subjectTag, { backgroundColor: `${s.color}15` }]}>
                <View style={[styles.subjectDot, { backgroundColor: s.color }]} />
                <Text style={[styles.subjectTagText, { color: s.color }]}>{s.label}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.subjectsCount, { color: colors.muted }]}>
            36 subjects across 4 categories
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
                  key={h}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                  key={m}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              <TouchableOpacity onPress={() => setShowTimePicker(false)} style={[styles.modalBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveTime} style={[styles.modalBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
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
              <TouchableOpacity onPress={() => setShowHowTo(false)} style={styles.modalClose}>
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
              <TouchableOpacity onPress={() => setShowAbout(false)} style={styles.modalClose}>
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
              <Text style={[styles.aboutRowValue, { color: colors.foreground }]}>36 across 4 categories</Text>
            </View>
            <View style={[styles.aboutDivider, { backgroundColor: colors.border }]} />
            <View style={styles.modalButtons}>
              <TouchableOpacity
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
              <TouchableOpacity onPress={() => setShowSubjectPicker(false)} style={styles.modalClose}>
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
});
