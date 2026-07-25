import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Alert,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter, useFocusEffect } from "expo-router";
import { ProgressSkeletonScreen } from "@/components/skeleton";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import {
  getProgress,
  setDailyGoal,
  getStreakEmoji,
  getDailyGoalPercent,
  getSubjectDisplay,
  type ProgressData,
} from "@/lib/progress";
import { loadQuizStats, type QuizStats } from "@/lib/quiz-history";
import {
  computeMasteryBadges,
  BADGE_COLORS,
  BADGE_EMOJI,
  getSeenBadges,
  markBadgeSeen,
  getTierForSolves,
  type MasteryBadge,
  type BadgeTier,
} from "@/lib/mastery-badges";
import { BadgeUnlockModal } from "@/components/badge-unlock-modal";
import { SubjectRing } from "@/components/subject-ring";
import { getSubjectEmoji } from "@/lib/subjects";
import { getChallengeHistory, getChallengeStats, type ChallengeAttempt } from "@/lib/challenge-history";
import { StreakShieldCard } from "@/components/streak-shield-card";
import { StreakFreezeCard } from "@/components/streak-freeze-card";
import { GRADE_LABELS } from "@/lib/grade-levels";
import { cleanMathText } from "@/lib/clean-math-text";


const GOAL_OPTIONS = [1, 3, 5, 10];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ProgressScreen() {
  const colors = useColors();
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [unlockModal, setUnlockModal] = useState<{ tier: BadgeTier; subjectLabel: string } | null>(null);
  const [challengeHistory, setChallengeHistory] = useState<ChallengeAttempt[]>([]);

  const loadProgress = async () => {
    try {
      const p = await getProgress();
      setProgress(p);
      // Load quiz accuracy stats for the per-subject chart
      try {
        const qs = await loadQuizStats();
        setQuizStats(qs);
      } catch { /* non-critical */ }
      // Check for newly unlocked badges
      try {
        const badges = computeMasteryBadges(p.subjectCounts);
        const seen = await getSeenBadges();
        for (const badge of badges) {
          const key = `${badge.subject}-${badge.tier}`;
          if (!seen.has(key)) {
            // Found a new badge — show unlock modal
            await markBadgeSeen(badge.subject, badge.tier);
            setUnlockModal({ tier: badge.tier, subjectLabel: badge.label });
            break; // show one at a time
          }
        }
      } catch { /* badge check failure is non-critical */ }
      // Load challenge history
      try {
        const ch = await getChallengeHistory();
        setChallengeHistory(ch);
      } catch { /* non-critical */ }
    } catch {
      // getProgress has internal fallbacks; this handles unexpected failures
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])   
  );

  const handleSetGoal = async (goal: number) => {
    H.impactLight();
    try {
      await setDailyGoal(goal);
      await loadProgress();
    } catch { /* goal save failure is non-critical */ } finally {
      setShowGoalPicker(false);
    }
  };

  if (!progress) {
    return (
      <ScreenContainer>
        <ProgressSkeletonScreen />
      </ScreenContainer>
    );
  }

  const { streak, subjectCounts } = progress;
  // Defensive fallback: weeklyActivity may be missing in old stored data formats
  const weeklyActivity: number[] =
    Array.isArray(progress.weeklyActivity) && progress.weeklyActivity.length === 7
      ? progress.weeklyActivity
      : [0, 0, 0, 0, 0, 0, 0];
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

  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });
  return (
    <ScreenContainer>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Go back" accessibilityHint="Returns to the previous screen" accessibilityRole="button" onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol size={24} name="arrow.left" color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Progress</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ paddingHorizontal: 16 }}>

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
              accessibilityLabel="Toggle show goal picker"
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

        {/* Streak Shield */}
        {streak.currentStreak > 0 && (
          <StreakShieldCard
            currentStreak={streak.currentStreak}
            onShieldEarned={() => loadProgress()}
          />
        )}

        {/* Streak Freeze */}
        <StreakFreezeCard
          currentStreak={streak.currentStreak}
          onFreezeActivated={() => loadProgress()}
          onFreezeEarned={() => loadProgress()}
        />

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

        {/* Subject Mastery — animated ring grid */}
        {subjectEntries.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Subject Mastery</Text>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
              Based on {streak.totalSolved} problems solved
            </Text>
            <View style={styles.ringGrid}>
              {subjectEntries.map(([subject, count]) => {
                const info = getSubjectDisplay(subject);
                const pct = Math.round((count / totalSolved) * 100);
                const emoji = getSubjectEmoji(subject);
                const tier = getTierForSolves(count);
                const tierLabel = tier ? `${BADGE_EMOJI[tier]} ${tier.charAt(0).toUpperCase() + tier.slice(1)}` : undefined;
                return (
                  <SubjectRing
                    key={subject}
                    label={info.label}
                    emoji={emoji}
                    color={info.color}
                    pct={pct}
                    solves={count}
                    tier={tierLabel}
                  />
                );
              })}
            </View>
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

        {/* Per-Subject Quiz Accuracy Chart */}
        {quizStats && quizStats.totalQuizzes > 0 && Object.keys(quizStats.bySubject).length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Quiz Accuracy by Subject</Text>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
              Average score across {quizStats.totalQuizzes} quiz{quizStats.totalQuizzes !== 1 ? "zes" : ""}
            </Text>
            {Object.entries(quizStats.bySubject)
              .sort(([, a], [, b]) => b.avg - a.avg)
              .map(([subject, data]) => {
                const info = getSubjectDisplay(subject);
                const barColor =
                  data.avg >= 90 ? colors.success :
                  data.avg >= 70 ? colors.primary :
                  data.avg >= 50 ? colors.warning :
                  colors.error;
                return (
                  <View key={subject} style={styles.accuracyRow}>
                    <View style={styles.accuracyLabelRow}>
                      <View style={[styles.accuracyDot, { backgroundColor: info.color }]} />
                      <Text style={[styles.accuracyLabel, { color: colors.foreground }]} numberOfLines={1}>
                        {info.label}
                      </Text>
                      <Text style={[styles.accuracyQuizCount, { color: colors.muted }]}>
                        {data.total} quiz{data.total !== 1 ? "zes" : ""}
                      </Text>
                    </View>
                    <View style={styles.accuracyBarRow}>
                      <View style={[styles.accuracyTrack, { backgroundColor: `${barColor}20` }]}>
                        <View
                          style={[
                            styles.accuracyFill,
                            { width: `${data.avg}%` as any, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                      <Text style={[styles.accuracyPct, { color: barColor }]}>{data.avg}%</Text>
                    </View>
                    <View style={styles.accuracyMetaRow}>
                      <Text style={[styles.accuracyMeta, { color: colors.muted }]}>Best: {data.best}%</Text>
                    </View>
                  </View>
                );
              })}
          </View>
        )}


        {/* Grade-Level Breakdown Card */}
        {quizStats && Object.keys(quizStats.byGrade).filter(k => k !== "unknown").length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Quiz Accuracy by Grade Level</Text>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
              How you perform at each curriculum level
            </Text>
            {Object.entries(quizStats.byGrade)
              .filter(([key]) => key !== "unknown")
              .sort(([, a], [, b]) => b.avg - a.avg)
              .map(([gradeKey, data]) => {
                const label = GRADE_LABELS[gradeKey] ?? gradeKey;
                const barColor =
                  data.avg >= 90 ? colors.success :
                  data.avg >= 70 ? colors.primary :
                  data.avg >= 50 ? colors.warning :
                  colors.error;
                return (
                  <View key={gradeKey} style={styles.accuracyRow}>
                    <View style={styles.accuracyLabelRow}>
                      <Text style={{ fontSize: 14 }}>📚</Text>
                      <Text style={[styles.accuracyLabel, { color: colors.foreground }]} numberOfLines={1}>
                        {label}
                      </Text>
                      <Text style={[styles.accuracyQuizCount, { color: colors.muted }]}>
                        {data.total} quiz{data.total !== 1 ? "zes" : ""}
                      </Text>
                    </View>
                    <View style={styles.accuracyBarRow}>
                      <View style={[styles.accuracyTrack, { backgroundColor: `${barColor}20` }]}>
                        <View
                          style={[
                            styles.accuracyFill,
                            { width: `${data.avg}%` as any, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                      <Text style={[styles.accuracyPct, { color: barColor }]}>{data.avg}%</Text>
                    </View>
                    <View style={styles.accuracyMetaRow}>
                      <Text style={[styles.accuracyMeta, { color: colors.muted }]}>Best: {data.best}%</Text>
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        {/* Challenge History Section */}
        {challengeHistory.length > 0 && (() => {
          const stats = getChallengeStats(challengeHistory);
          return (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>⚡ Challenge History</Text>
              {/* Stats row */}
              <View style={[styles.challengeStatsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.challengeStat}>
                  <Text style={[styles.challengeStatNum, { color: colors.primary }]}>{stats.total}</Text>
                  <Text style={[styles.challengeStatLabel, { color: colors.muted }]}>Total</Text>
                </View>
                <View style={[styles.challengeStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.challengeStat}>
                  <Text style={[styles.challengeStatNum, { color: colors.success }]}>{stats.correct}</Text>
                  <Text style={[styles.challengeStatLabel, { color: colors.muted }]}>Correct</Text>
                </View>
                <View style={[styles.challengeStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.challengeStat}>
                  <Text style={[styles.challengeStatNum, { color: stats.pct >= 70 ? colors.success : stats.pct >= 40 ? colors.warning : colors.error }]}>{stats.pct}%</Text>
                  <Text style={[styles.challengeStatLabel, { color: colors.muted }]}>Accuracy</Text>
                </View>
                <View style={[styles.challengeStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.challengeStat}>
                  <Text style={[styles.challengeStatNum, { color: colors.foreground }]}>{stats.avgTime}s</Text>
                  <Text style={[styles.challengeStatLabel, { color: colors.muted }]}>Avg Time</Text>
                </View>
                {stats.streak > 1 && (
                  <>
                    <View style={[styles.challengeStatDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.challengeStat}>
                      <Text style={[styles.challengeStatNum, { color: colors.warning }]}>🔥{stats.streak}</Text>
                      <Text style={[styles.challengeStatLabel, { color: colors.muted }]}>Streak</Text>
                    </View>
                  </>
                )}
              </View>
              {/* Recent attempts list */}
              {challengeHistory.slice(0, 10).map((attempt) => (
                <View key={attempt.id} style={[styles.challengeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.challengeRowAccent, { backgroundColor: attempt.correct ? colors.success : colors.error }]} />
                  <View style={styles.challengeRowBody}>
                    <Text style={[styles.challengeRowProblem, { color: colors.foreground }]} numberOfLines={2}>{cleanMathText(attempt.problem)}</Text>
                    <View style={styles.challengeRowMeta}>
                      <Text style={[styles.challengeRowSubject, { color: colors.muted }]}>{getSubjectEmoji(attempt.subject as any)} {attempt.subject}</Text>
                      <Text style={[styles.challengeRowTime, { color: colors.muted }]}>{attempt.timeTaken}s · {new Date(attempt.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Text>
                    </View>
                  </View>
                  <Text style={[styles.challengeRowResult, { color: attempt.correct ? colors.success : colors.error }]}>
                    {attempt.correct ? "✓" : "✗"}
                  </Text>
                </View>
              ))}
            </View>
          );
        })()}

        {/* Global Rankings entry */}
        <TouchableOpacity
          accessibilityLabel="View global rankings"
          onPress={() => router.push("/(tabs)/leaderboard" as any)}
          style={[styles.rankingsEntry, { backgroundColor: colors.surface, borderColor: `${colors.warning}40` }]}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 22 }}>🏆</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.rankingsEntryTitle, { color: colors.foreground }]}>Global Rankings</Text>
            <Text style={[styles.rankingsEntrySub, { color: colors.muted }]}>See where you stand this week</Text>
          </View>
          <IconSymbol size={16} name="chevron.right" color={colors.muted} />
        </TouchableOpacity>

        {/* Export Data Shortcut */}
        <TouchableOpacity
          accessibilityLabel="Export your data"
          accessibilityHint="Exports all your TutorSnap data as a JSON file"
          accessibilityRole="button"
          onPress={async () => {
            H.impactLight();
            try {
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
                try { exportObj.data[key] = value ? JSON.parse(value) : null; }
                catch { exportObj.data[key] = value; }
              }
              const json = JSON.stringify(exportObj, null, 2);
              const fileName = `tutorsnap-export-${new Date().toISOString().slice(0, 10)}.json`;
              const fileUri = (FileSystem.cacheDirectory ?? "") + fileName;
              await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
              const canShare = await Sharing.isAvailableAsync();
              if (canShare) {
                await Sharing.shareAsync(fileUri, { mimeType: "application/json", dialogTitle: "Export TutorSnap Data", UTI: "public.json" });
              } else {
                Alert.alert("Exported", `Data saved to:\n${fileUri}`);
              }
            } catch {
              Alert.alert("Export Failed", "Could not export your data. Please try again.");
            }
          }}
          style={[styles.exportBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 20 }}>📤</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.rankingsEntryTitle, { color: colors.foreground }]}>Export My Data</Text>
            <Text style={[styles.rankingsEntrySub, { color: colors.muted }]}>Download a backup of all your stats</Text>
          </View>
          <IconSymbol size={16} name="chevron.right" color={colors.muted} />
        </TouchableOpacity>

        {/* Empty State */}
        {streak.totalSolved === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Data Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Start solving problems to track your progress and build your streak!
            </Text>
            <TouchableOpacity accessibilityLabel="Go back" accessibilityHint="Returns to the previous screen" accessibilityRole="button"
              onPress={() => router.back()}
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.startBtnText}>Start Solving</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
      </ScrollView>
      {/* Badge Unlock Modal — only mounted when a badge is earned to prevent
           18 Reanimated Particle worklets from firing on every progress screen load */}
      {unlockModal && (
        <BadgeUnlockModal
          visible={true}
          tier={unlockModal.tier}
          subjectLabel={unlockModal.subjectLabel}
          onClose={() => setUnlockModal(null)}
        />
      )}
    
      </Animated.View></ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
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
  badgeProgressLabel: { fontSize: 10, fontWeight: "600" },
  ringGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginTop: 8,
    gap: 4,
  },
  accuracyRow: {
    marginBottom: 14,
  },
  accuracyLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  accuracyDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  accuracyLabel: { flex: 1, fontSize: 13, fontWeight: "600" },
  accuracyQuizCount: { fontSize: 11, fontWeight: "500" },
  accuracyBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accuracyTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  accuracyFill: {
    height: "100%",
    borderRadius: 5,
  },
  accuracyPct: { fontSize: 13, fontWeight: "700", minWidth: 36, textAlign: "right" },
  accuracyMetaRow: { marginTop: 3, marginLeft: 18 },
  accuracyMeta: { fontSize: 11 },
  section: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  challengeStatsRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "space-around",
  },
  challengeStat: {
    alignItems: "center",
    flex: 1,
  },
  challengeStatNum: {
    fontSize: 20,
    fontWeight: "800",
  },
  challengeStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  challengeStatDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 4,
  },
  challengeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  challengeRowAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  challengeRowBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  challengeRowProblem: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  challengeRowMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  challengeRowSubject: {
    fontSize: 11,
  },
  challengeRowTime: {
    fontSize: 11,
  },
  challengeRowResult: {
    fontSize: 20,
    fontWeight: "800",
    paddingRight: 12,
  },
  rankingsEntry: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  rankingsEntryTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  rankingsEntrySub: {
    fontSize: 12,
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
});
