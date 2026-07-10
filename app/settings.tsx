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
} from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
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

const GOAL_OPTIONS = [1, 2, 3, 5, 7, 10];

// Hours available for reminder (6 AM – 11 PM)
const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 6);
const MINUTE_OPTIONS = [0, 15, 30, 45];

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

  useEffect(() => {
    getProgress().then((p) => {
      setDailyGoalState(p.streak.dailyGoal);
      setTodaySolved(p.streak.todaySolved);
      setTotalSolved(p.streak.totalSolved);
      setStreak(p.streak.currentStreak);
    });
    getReminderSettings().then(setReminder);
  }, []);

  const handleToggleTheme = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setColorScheme(isDark ? "light" : "dark");
  };

  const handleSetGoal = async (goal: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDailyGoalState(goal);
    await setDailyGoal(goal);
  };

  const handleToggleReminder = async (value: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (value) {
      // Open time picker to choose time before enabling
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
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
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
                <Text
                  style={[
                    styles.goalOptionText,
                    { color: dailyGoal === g ? "#FFFFFF" : colors.foreground },
                  ]}
                >
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

        {/* About */}
        <SectionHeader title="ABOUT" colors={colors} />
        <SettingsRow
          icon="info.circle"
          label="TutorSnap"
          subtitle="Version 1.0.0 — AI-powered academic tutor"
          colors={colors}
        />
        <SettingsRow
          icon="questionmark.circle"
          label="How to use TutorSnap"
          subtitle="Type, scan, or speak any question to get instant help"
          colors={colors}
        />

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
            TutorSnap v{Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
          <Text style={[styles.versionBuild, { color: colors.border }]}>
            Expo SDK {Constants.expoConfig?.sdkVersion ?? "54"} · {Platform.OS}
          </Text>
        </View>

      </ScrollView>

      {/* Time Picker Modal */}
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

            {/* Hour picker */}
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
                  style={[
                    styles.pickerChip,
                    {
                      backgroundColor: pickerHour === h ? colors.primary : colors.surface,
                      borderColor: pickerHour === h ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.pickerChipText, { color: pickerHour === h ? "#FFFFFF" : colors.foreground }]}>
                    {formatHour(h)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Minute picker */}
            <Text style={[styles.pickerLabel, { color: colors.muted }]}>MINUTE</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
              {MINUTE_OPTIONS.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPickerMinute(m);
                  }}
                  style={[
                    styles.pickerChip,
                    {
                      backgroundColor: pickerMinute === m ? colors.primary : colors.surface,
                      borderColor: pickerMinute === m ? colors.primary : colors.border,
                    },
                  ]}
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
              <TouchableOpacity
                onPress={() => setShowTimePicker(false)}
                style={[styles.modalBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveTime}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Set Reminder</Text>
              </TouchableOpacity>
            </View>
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
  goalOptions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
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
  // Modal
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
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  modalSubtitle: { fontSize: 14, marginBottom: 20 },
  pickerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  pickerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pickerChipText: { fontSize: 14, fontWeight: "700" },
  previewTime: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: -1,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  modalBtnText: { fontSize: 16, fontWeight: "700" },
  versionFooter: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 4,
  },
  versionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  versionBuild: {
    fontSize: 11,
    fontWeight: "400",
  },
});
