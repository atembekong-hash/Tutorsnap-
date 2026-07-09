import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getProgress,
  setDailyGoal,
  getStreakEmoji,
  getDailyGoalPercent,
  getSubjectDisplay,
  type ProgressData,
} from "@/lib/progress";
import {
  computeMasteryBadges,
  BADGE_COLORS,
  BADGE_EMOJI,
  BADGE_THRESHOLDS,
  type MasteryBadge,
} from "@/lib/mastery-badges";

const GOAL_OPTIONS = [1, 3, 5, 10];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ProgressScreen() {
  const colors = useColors();
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [showGoalPicker, setShowGoalPicker] = useState(false);

  const loadProgress = async () => {
    const p = await getProgress();
    setProgress(p);
  };

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  const handleSetGoal = async (goal: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await setDailyGoal(goal);
    await loadProgress();
    setShowGoalPicker(false);
  };

  if (!progress) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted }}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const { streak, subjectCounts, weeklyActivity } = progress;
  const dailyGoalPct = getDailyGoalPercent(streak.todaySolved, streak.dailyGoal);
  const streakEmoji = getStreakEmoji(streak.currentStreak);
  const maxWeekly = Math.max(...weeklyActivity, 1);

  // Subject mastery data
  const totalSolved = Object.values(subjectCounts).reduce((a, b) => a + b, 0) || 1;
  const subjectEntries = Object.entries(subjectCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // Get today's day index (0=Mon, 6=Sun)
  const todayDayIndex = (new Date().getDay() + 6) % 7;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={24} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Streak Card */}
        <View style={[styles.streakCard, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}30` }]}>
          <View style={styles.streakTop}>
            <Text style={styles.streakBigEmoji}>{streakEmoji}</Text>
            <View style={styles.streakInfo}>
              <Text style={[styles.streakBigNumber, { color: colors.warning }]}>
                {streak.currentStreak}
              </Text>
              <Text style={[styles.streakBigLabel, { color: colors.foreground }]}>
                Day Streak
              </Text>
              <Text style={[styles.streakSub, { color: colors.muted }]}>
                Best: {streak.longestStreak} days
              </Text>
            </View>
            <View style={styles.streakStats}>
              <View style={[styles.streakStatBox, { backgroundColor: `${colors.primary}15` }]}>
                <Text style={[styles.streakStatNum, { color: colors.primary }]}>
                  {streak.totalSolved}
                </Text>
                <Text style={[styles.streakStatLabel, { color: colors.muted }]}>Total</Text>
              </View>
              <View style={[styles.streakStatBox, { backgroundColor: `${colors.success}15` }]}>
                <Text style={[styles.streakStatNum, { color: colors.success }]}>
                  {streak.todaySolved}
                </Text>
                <Text style={[styles.streakStatLabel, { color: colors.muted }]}>Today</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Daily Goal */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Daily Goal</Text>
            <TouchableOpacity
              onPress={() => setShowGoalPicker((v) => !v)}
              style={[styles.editBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
            >
              <Text style={[styles.editBtnText, { color: colors.primary }]}>
                {showGoalPicker ? "Cancel" : "Change"}
              </Text>
            </TouchableOpacity>
          </View>

          {showGoalPicker ? (
            <View style={styles.goalOptions}>
              {GOAL_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => handleSetGoal(g)}
                  style={[
                    styles.goalOption,
                    {
                      backgroundColor: streak.dailyGoal === g ? colors.primary : colors.background,
                      borderColor: streak.dailyGoal === g ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.goalOptionText, { color: streak.dailyGoal === g ? "#FFF" : colors.foreground }]}>
                    {g} / day
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.goalProgressRow}>
                <Text style={[styles.goalProgressText, { color: colors.muted }]}>
                  {streak.todaySolved} of {streak.dailyGoal} problems solved today
                </Text>
                <Text style={[styles.goalProgressPct, { color: dailyGoalPct >= 100 ? colors.success : colors.primary }]}>
                  {dailyGoalPct}%
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: `${colors.primary}20` }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: dailyGoalPct >= 100 ? colors.success : colors.primary,
                      width: `${dailyGoalPct}%`,
                    },
                  ]}
                />
              </View>
              {dailyGoalPct >= 100 && (
                <Text style={[styles.goalCompleteText, { color: colors.success }]}>
                  🎉 Goal complete! Keep going!
                </Text>
              )}
            </>
          )}
        </View>

        {/* Weekly Activity */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Weekly Activity</Text>
          <View style={styles.weeklyChart}>
            {weeklyActivity.map((count, i) => {
              const barHeight = maxWeekly > 0 ? (count / maxWeekly) * 80 : 0;
              const isToday = i === todayDayIndex;
              return (
                <View key={i} style={styles.weeklyBar}>
                  <Text style={[styles.weeklyCount, { color: count > 0 ? colors.primary : colors.muted }]}>
                    {count > 0 ? count : ""}
                  </Text>
                  <View style={[styles.weeklyBarTrack, { backgroundColor: `${colors.primary}15` }]}>
                    <View
                      style={[
                        styles.weeklyBarFill,
                        {
                          height: Math.max(barHeight, count > 0 ? 4 : 0),
                          backgroundColor: isToday ? colors.primary : `${colors.primary}70`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.weeklyDayLabel, { color: isToday ? colors.primary : colors.muted, fontWeight: isToday ? "700" : "400" }]}>
                    {DAY_LABELS[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Subject Mastery */}
        {subjectEntries.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Subject Mastery</Text>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
              Based on {streak.totalSolved} problems solved
            </Text>
            {subjectEntries.map(([subject, count]) => {
              const info = getSubjectDisplay(subject);
              const label = info.label;
              const color = info.color;
              const pct = Math.round((count / totalSolved) * 100);
              return (
                <View key={subject} style={styles.subjectRow}>
                  <View style={styles.subjectRowLeft}>
                    <View style={[styles.subjectDot, { backgroundColor: color }]} />
                    <Text style={[styles.subjectLabel, { color: colors.foreground }]}>{label}</Text>
                  </View>
                  <View style={styles.subjectRowRight}>
                    <View style={[styles.subjectTrack, { backgroundColor: `${color}20` }]}>
                      <View
                        style={[
                          styles.subjectFill,
                          { backgroundColor: color, width: `${pct}%` },
                        ]}
                      />
                    </View>
                    <Text style={[styles.subjectCount, { color: colors.muted }]}>
                      {count}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Mastery Badges */}
        {(() => {
          const badges = computeMasteryBadges(subjectCounts);
          if (badges.length === 0) return null;
          return (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>🏅 Mastery Badges</Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                Earn Bronze at 10 · Silver at 25 · Gold at 50 solves
              </Text>
              <View style={styles.badgeGrid}>
                {badges.map((badge: MasteryBadge) => (
                  <View
                    key={badge.subject}
                    style={[styles.badgeCard, { backgroundColor: `${BADGE_COLORS[badge.tier]}12`, borderColor: `${BADGE_COLORS[badge.tier]}40` }]}
                  >
                    <Text style={styles.badgeEmoji}>{BADGE_EMOJI[badge.tier]}</Text>
                    <Text style={[styles.badgeSubject, { color: colors.foreground }]} numberOfLines={1}>
                      {badge.label}
                    </Text>
                    <Text style={[styles.badgeTier, { color: BADGE_COLORS[badge.tier] }]}>
                      {badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1)}
                    </Text>
                    <Text style={[styles.badgeSolves, { color: colors.muted }]}>{badge.solves} solved</Text>
                    {badge.nextTier && (
                      <View style={styles.badgeProgressWrap}>
                        <View style={[styles.badgeProgressTrack, { backgroundColor: `${BADGE_COLORS[badge.nextTier]}25` }]}>
                          <View
                            style={[
                              styles.badgeProgressFill,
                              { backgroundColor: BADGE_COLORS[badge.nextTier], width: `${badge.progress}%` },
                            ]}
                          />
                        </View>
                        <Text style={[styles.badgeProgressLabel, { color: colors.muted }]}>
                          {badge.nextThreshold! - badge.solves} to {badge.nextTier}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Empty State */}
        {streak.totalSolved === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Data Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Start solving problems to track your progress and build your streak!
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.startBtnText}>Start Solving</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: "800" },
  streakCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
  },
  streakTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  streakBigEmoji: { fontSize: 48 },
  streakInfo: { flex: 1 },
  streakBigNumber: { fontSize: 40, fontWeight: "900", lineHeight: 44 },
  streakBigLabel: { fontSize: 16, fontWeight: "700" },
  streakSub: { fontSize: 13, marginTop: 2 },
  streakStats: { gap: 8 },
  streakStatBox: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 60,
  },
  streakStatNum: { fontSize: 20, fontWeight: "800" },
  streakStatLabel: { fontSize: 11, fontWeight: "600" },
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSubtitle: { fontSize: 13, marginTop: 2, marginBottom: 14 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 13, fontWeight: "600" },
  goalOptions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  goalOption: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  goalOptionText: { fontSize: 14, fontWeight: "700" },
  goalProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  goalProgressText: { fontSize: 14 },
  goalProgressPct: { fontSize: 14, fontWeight: "700" },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  goalCompleteText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  weeklyChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 12,
    height: 120,
  },
  weeklyBar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  weeklyCount: { fontSize: 11, fontWeight: "700", height: 16 },
  weeklyBarTrack: {
    width: 28,
    height: 80,
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  weeklyBarFill: {
    width: "100%",
    borderRadius: 8,
  },
  weeklyDayLabel: { fontSize: 11 },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  subjectRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 120,
  },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  subjectLabel: { fontSize: 13, fontWeight: "600" },
  subjectRowRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subjectTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  subjectFill: {
    height: "100%",
    borderRadius: 4,
  },
  subjectCount: { fontSize: 12, fontWeight: "600", minWidth: 20, textAlign: "right" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptySubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  startBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  startBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  badgeCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 3,
  },
  badgeEmoji: { fontSize: 28 },
  badgeSubject: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  badgeTier: { fontSize: 12, fontWeight: "600" },
  badgeSolves: { fontSize: 11, marginTop: 2 },
  badgeProgressWrap: { width: "100%", marginTop: 6, gap: 3 },
  badgeProgressTrack: { height: 5, borderRadius: 3, overflow: "hidden", width: "100%" },
  badgeProgressFill: { height: "100%", borderRadius: 3 },
  badgeProgressLabel: { fontSize: 10, textAlign: "center" },
});
