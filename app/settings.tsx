import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { getProgress, setDailyGoal } from "@/lib/progress";

const GOAL_OPTIONS = [1, 2, 3, 5, 7, 10];

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

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useThemeContext();
  const isDark = colorScheme === "dark";

  const [dailyGoal, setDailyGoalState] = useState(3);
  const [todaySolved, setTodaySolved] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    getProgress().then((p) => {
      setDailyGoalState(p.streak.dailyGoal);
      setTodaySolved(p.streak.todaySolved);
      setTotalSolved(p.streak.totalSolved);
      setStreak(p.streak.currentStreak);
    });
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

      </ScrollView>
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
});
