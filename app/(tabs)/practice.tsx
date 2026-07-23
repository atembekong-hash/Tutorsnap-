import React, { useState, useCallback, useEffect, useRef } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams , useFocusEffect } from "expo-router";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type { PracticeQuestion, Difficulty } from "@/shared/types";
import { SubjectPicker } from "@/components/subject-picker";
import { type SubjectId, getSubjectColor, getSubjectLabel , type SubjectCategory } from "@/lib/subjects";
import { loadQuizStats, getAdaptiveDifficultySuggestion, getDifficultyDownSuggestion, type QuizStats, type DifficultyUpSuggestion, type DifficultyDownSuggestion } from "@/lib/quiz-history";
import { getProgress, type ProgressData } from "@/lib/progress";
import { getWeeklyData, type WeeklyData } from "@/lib/weekly-goals";
import { getCheatSheet, hasCheatSheet } from "@/lib/cheat-sheets";
import * as Clipboard from "expo-clipboard";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { getSubjectDifficulty, setSubjectDifficulty } from "@/lib/subject-difficulty";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GRADE_OPTIONS, GRADE_LABELS, loadGlobalGrade, saveGlobalGrade } from "@/lib/grade-levels";
import { PracticeSkeletonCard } from "@/components/skeleton";
import { loadQuizHistory } from "@/lib/quiz-history";
import { savePrefetchedQuiz } from "@/lib/quiz-prefetch";
import { cleanMathText } from "@/lib/clean-math-text";
const QUIZ_COUNTS = [3, 5, 10];

function getDifficulties(gradeLevel: string | null): { id: Difficulty; label: string; color: string; desc: string }[] {
  if (!gradeLevel) return [
    { id: "easy", label: "Easy", color: "#10B981", desc: "Basic concepts" },
    { id: "medium", label: "Medium", color: "#F59E0B", desc: "Intermediate" },
    { id: "hard", label: "Hard", color: "#EF4444", desc: "Advanced" },
  ];
  const g = gradeLevel;
  const isElem = ["grade1","grade2","grade3","grade4","grade5"].includes(g);
  const isMiddle = ["grade6","grade7","grade8"].includes(g);
  const isHigh = ["grade9","grade10","grade11","grade12"].includes(g);
  const isUni = g === "university";
  const gradeLabel = g.startsWith("grade") ? `Grade ${g.replace("grade","")}` : "University";
  if (isElem) return [
    { id: "easy",   label: "Intro",     color: "#10B981", desc: `${gradeLabel} starter` },
    { id: "medium", label: "Standard",  color: "#F59E0B", desc: `${gradeLabel} core` },
    { id: "hard",   label: "Challenge", color: "#EF4444", desc: `${gradeLabel} stretch` },
  ];
  if (isMiddle) return [
    { id: "easy",   label: "Foundation", color: "#10B981", desc: `${gradeLabel} basics` },
    { id: "medium", label: "On-Level",   color: "#F59E0B", desc: `${gradeLabel} standard` },
    { id: "hard",   label: "Advanced",  color: "#EF4444", desc: `${gradeLabel} enrichment` },
  ];
  if (isHigh) return [
    { id: "easy",   label: "Foundational", color: "#10B981", desc: `${gradeLabel} review` },
    { id: "medium", label: "Standard",     color: "#F59E0B", desc: `${gradeLabel} curriculum` },
    { id: "hard",   label: "Exam-Ready",   color: "#EF4444", desc: `${gradeLabel} exam prep` },
  ];
  if (isUni) return [
    { id: "easy",   label: "Introductory", color: "#10B981", desc: "100-level concepts" },
    { id: "medium", label: "Intermediate", color: "#F59E0B", desc: "200-300 level" },
    { id: "hard",   label: "Advanced",     color: "#EF4444", desc: "400+ / graduate" },
  ];
  return [
    { id: "easy",   label: "Easy",   color: "#10B981", desc: "Basic concepts" },
    { id: "medium", label: "Medium", color: "#F59E0B", desc: "Intermediate" },
    { id: "hard",   label: "Hard",   color: "#EF4444", desc: "Advanced" },
  ];
}

function PracticeScreenContent() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string }>();
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>("algebra");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("medium");
  const [preferredCategories, setPreferredCategories] = useState<SubjectCategory[]>([]);
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [showGradePicker, setShowGradePicker] = useState(false);

  // Load global grade default on mount
  useEffect(() => {
    loadGlobalGrade().then((g) => { if (g) setGradeLevel(g); });
  }, []);

  // Pre-select subject from navigation params (e.g. from Bookmarks "Practice Similar")
  useEffect(() => {
    if (params.subject) {
      setSelectedSubject(params.subject as SubjectId);
    }
  }, [params.subject]);

  // Load preferred subjects from Settings on mount and pre-select first preferred subject
  useEffect(() => {
    AsyncStorage.getItem("@tutorsnap/preferredCategories").then((raw) => {
      if (raw) {
        try {
          const cats: SubjectCategory[] = JSON.parse(raw);
          setPreferredCategories(cats);
        } catch { /* ignore */ }
      }
    });
  }, []);

  // Load persisted difficulty when subject changes
  const handleSubjectChange = useCallback(async (id: SubjectId) => {
    setSelectedSubject(id);
    const saved = await getSubjectDifficulty(id);
    setSelectedDifficulty(saved);
  }, []);

  // Persist difficulty when it changes
  const handleDifficultyChange = useCallback(async (diff: Difficulty) => {
    setSelectedDifficulty(diff);
    await setSubjectDifficulty(selectedSubject, diff);
  }, [selectedSubject]);
  const [currentQuestion, setCurrentQuestion] = useState<PracticeQuestion | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [showStreakNudge, setShowStreakNudge] = useState(false);
  const [quizCount, setQuizCount] = useState(5);
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);
  const [diffSuggestion, setDiffSuggestion] = useState<DifficultyUpSuggestion | null>(null);
  const [diffDownSuggestion, setDiffDownSuggestion] = useState<DifficultyDownSuggestion | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [downSuggestionDismissed, setDownSuggestionDismissed] = useState(false);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [cheatSheetExpanded, setCheatSheetExpanded] = useState(false);
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);
  const { isOnline } = useNetworkStatus();

  useFocusEffect(
    useCallback(() => {
      loadQuizStats().then(setQuizStats);
      getProgress().then(setProgressData);
      getWeeklyData().then(setWeeklyData);
      setSuggestionDismissed(false);
    }, [])
  );

  // Re-check adaptive suggestions (both up and down) whenever subject or difficulty changes
  useEffect(() => {
    setSuggestionDismissed(false);
    setDownSuggestionDismissed(false);
    getAdaptiveDifficultySuggestion(selectedSubject, selectedDifficulty).then(setDiffSuggestion);
    getDifficultyDownSuggestion(selectedSubject, selectedDifficulty).then(setDiffDownSuggestion);
  }, [selectedSubject, selectedDifficulty]);

  // ── Pre-fetch: keep a queued-up next problem ready ───────────────────────────
  const prefetchedRef = useRef<PracticeQuestion | null>(null);
  const prefetchMutation = trpc.academic.generatePractice.useMutation({
    onSuccess: (data) => { prefetchedRef.current = data as PracticeQuestion; },
  });

  const triggerPrefetch = useCallback(() => {
    prefetchedRef.current = null;
    prefetchMutation.mutate({ subject: selectedSubject, difficulty: selectedDifficulty, gradeLevel: gradeLevel ?? undefined });
  }, [selectedSubject, selectedDifficulty, gradeLevel]);

  // Kick off first prefetch once subject/difficulty are ready
  useEffect(() => { triggerPrefetch(); }, [selectedSubject, selectedDifficulty, gradeLevel]);

  const generateMutation = trpc.academic.generatePractice.useMutation({
    onSuccess: (data) => {
      setCurrentQuestion(data as PracticeQuestion);
      setShowAnswer(false);
      setHintsShown(0);
      // Haptic: skeleton → content arrived
      if (Platform.OS !== "web") H.impactLight();
      // Start pre-fetching the next problem in the background
      triggerPrefetch();
    },
  });

  const handleGenerate = () => {
    H.impactMedium();
    setShowStreakNudge(false);
    // If we have a pre-fetched problem ready, use it instantly
    if (prefetchedRef.current) {
      const q = prefetchedRef.current;
      prefetchedRef.current = null;
      setCurrentQuestion(q);
      setShowAnswer(false);
      setHintsShown(0);
      H.notificationSuccess();
      // Start pre-fetching the next one
      triggerPrefetch();
      return;
    }
    generateMutation.mutate({ subject: selectedSubject, difficulty: selectedDifficulty, gradeLevel: gradeLevel ?? undefined });
  };

  const handleSelfGrade = (correct: boolean) => {
    const next = correct ? consecutiveCorrect + 1 : 0;
    setConsecutiveCorrect(next);
    if (correct) {
      H.notificationSuccess();
      if (next >= 5) setShowStreakNudge(true);
    } else {
      H.notificationError();
    }
    // Auto-advance to next problem
    handleGenerate();
  };

  const handleShowHint = () => {
    if (currentQuestion && hintsShown < currentQuestion.hints.length) {
      setHintsShown(hintsShown + 1);
      H.impactLight();
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    H.notificationSuccess();
  };

  const handleViewSolution = () => {
    if (!currentQuestion) return;
    router.push({
      pathname: "/solution",
      params: {
        data: JSON.stringify({
          problem: currentQuestion.problem,
          subject: currentQuestion.subject,
          answer: currentQuestion.answer,
          steps: currentQuestion.steps,
          ...(currentQuestion.finalSolution ? { finalSolution: currentQuestion.finalSolution } : {}),
        }),
      },
    });
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Practice</Text>
            <TouchableOpacity
              onPress={() => { setShowGradePicker(true); H.impactLight(); }}
              style={[styles.gradePill, { backgroundColor: gradeLevel ? `${colors.primary}18` : colors.surface, borderColor: gradeLevel ? colors.primary : colors.border }]}
              accessibilityLabel={gradeLevel ? `Level: ${GRADE_LABELS[gradeLevel]}. Tap to change.` : "Set level"}
              accessibilityRole="button"
            >
              <Text style={[styles.gradePillText, { color: gradeLevel ? colors.primary : colors.muted }]}>
                {gradeLevel ? GRADE_LABELS[gradeLevel] : "Level"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Generate problems to sharpen your skills
          </Text>
        </View>

        {/* Subject Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>SUBJECT</Text>
          <View style={{ marginTop: 10 }}>
            <SubjectPicker
              value={selectedSubject}
              onChange={(id) => handleSubjectChange(id ?? "algebra")}
              showAll={false}
              preferredCategories={preferredCategories}
            />
          </View>
        </View>

        {/* Difficulty Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>DIFFICULTY</Text>
          <View style={styles.difficultyRow}>
            {getDifficulties(gradeLevel).map((diff) => {
              const isSelected = selectedDifficulty === diff.id;
              return (
                <TouchableOpacity
                  key={diff.id}
                  onPress={() => {
                    handleDifficultyChange(diff.id);
                    H.impactLight();
                  }}
                  style={[
                    styles.difficultyCard,
                    {
                      backgroundColor: isSelected ? `${diff.color}20` : colors.surface,
                      borderColor: isSelected ? diff.color : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.difficultyDot, { backgroundColor: diff.color }]} />
                  <Text style={[styles.difficultyLabel, { color: isSelected ? diff.color : colors.foreground }]}>
                    {diff.label}
                  </Text>
                  <Text style={[styles.difficultyDesc, { color: colors.muted }]}>{diff.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={generateMutation.isPending || !isOnline}
          style={[
            styles.generateBtn,
            { backgroundColor: isOnline ? colors.primary : colors.muted },
            (generateMutation.isPending || !isOnline) && { opacity: 0.7 },
          ]}
          activeOpacity={0.85}
        >
          {generateMutation.isPending ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.generateBtnText}>Generating...</Text>
            </>
          ) : (
            <>
              <IconSymbol size={20} name="bolt.fill" color="#FFFFFF" />
              <Text style={styles.generateBtnText}>
                {currentQuestion ? "New Problem" : "Generate Problem"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Quiz Count Picker + Start Quiz */}
        <View style={[styles.quizSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.quizSectionHeader}>
            <Text style={{ fontSize: 18 }}>🎯</Text>
            <Text style={[styles.quizBtnTitle, { color: colors.foreground }]}>Timed Quiz Mode</Text>
          </View>
          <Text style={[styles.quizBtnSub, { color: colors.muted, marginBottom: 10 }]}>30s per question · multiple choice · scored</Text>
          {/* Count picker */}
          <View style={styles.countPickerRow}>
            <Text style={[styles.countPickerLabel, { color: colors.muted }]}>Questions:</Text>
            {QUIZ_COUNTS.map((n) => (
              <TouchableOpacity
                accessibilityLabel="Toggle quiz count"
                key={n}
                onPress={() => setQuizCount(n)}
                style={[styles.countChip, { backgroundColor: quizCount === n ? colors.primary : colors.border }]}
                activeOpacity={0.75}
              >
                <Text style={[styles.countChipText, { color: quizCount === n ? "#fff" : colors.foreground }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => {
              if (!isOnline) return;
              H.impactMedium();
              // Navigate to quiz — questions generated on mount in quiz.tsx
              router.push({ pathname: "/quiz", params: { subject: selectedSubject, difficulty: selectedDifficulty, count: String(quizCount), gradeLevel: gradeLevel ?? "" } });
            }}
            disabled={!isOnline}
            style={[styles.startQuizBtn, { backgroundColor: isOnline ? colors.primary : colors.muted, opacity: isOnline ? 1 : 0.6 }]}
            activeOpacity={0.85}
          >
            <IconSymbol size={18} name="bolt.fill" color="#fff" />
            <Text style={styles.startQuizBtnText}>Start {quizCount}-Question Quiz</Text>
          </TouchableOpacity>
        </View>

        {/* ── Progress Snapshot Widget ── */}
        {progressData && (
          <View style={[pStyles.widgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={pStyles.widgetHeader}>
              <View style={pStyles.widgetTitleRow}>
                <Text style={{ fontSize: 16 }}>🔥</Text>
                <Text style={[pStyles.widgetTitle, { color: colors.foreground }]}>Your Progress</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/progress" as any)}
                style={[pStyles.widgetLink, { borderColor: colors.primary }]}
                activeOpacity={0.7}
              >
                <Text style={[pStyles.widgetLinkText, { color: colors.primary }]}>Full Stats</Text>
                <IconSymbol size={12} name="chevron.right" color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={pStyles.progressStatRow}>
              <View style={pStyles.progressStat}>
                <Text style={[pStyles.progressStatValue, { color: colors.primary }]}>{progressData.streak.currentStreak}</Text>
                <Text style={[pStyles.progressStatLabel, { color: colors.muted }]}>Day Streak</Text>
              </View>
              <View style={[pStyles.progressStatDivider, { backgroundColor: colors.border }]} />
              <View style={pStyles.progressStat}>
                <Text style={[pStyles.progressStatValue, { color: colors.success }]}>{progressData.streak.totalSolved}</Text>
                <Text style={[pStyles.progressStatLabel, { color: colors.muted }]}>Total Solved</Text>
              </View>
              <View style={[pStyles.progressStatDivider, { backgroundColor: colors.border }]} />
              <View style={pStyles.progressStat}>
                <Text style={[pStyles.progressStatValue, { color: colors.warning }]}>{progressData.streak.todaySolved}/{progressData.streak.dailyGoal}</Text>
                <Text style={[pStyles.progressStatLabel, { color: colors.muted }]}>Today's Goal</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Weekly Activity Bar Chart Widget ── */}
        {weeklyData && (
          <View style={[pStyles.widgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={pStyles.widgetHeader}>
              <View style={pStyles.widgetTitleRow}>
                <Text style={{ fontSize: 16 }}>📅</Text>
                <Text style={[pStyles.widgetTitle, { color: colors.foreground }]}>This Week</Text>
              </View>
              <Text style={[pStyles.weeklyGoalBadge, { color: colors.muted }]}>
                {weeklyData.quizzesThisWeek}/{weeklyData.weeklyGoal} quizzes
              </Text>
            </View>
            <View style={pStyles.weeklyBarRow}>
              {weeklyData.days.map((day, i) => {
                const maxQ = Math.max(...weeklyData.days.map((d) => d.quizzes), 1);
                const fillPct = day.quizzes / maxQ;
                return (
                  <View key={i} style={pStyles.weeklyBarCol}>
                    <View style={pStyles.weeklyBarTrack}>
                      <View
                        style={[
                          pStyles.weeklyBarFill,
                          {
                            height: `${Math.max(fillPct * 100, day.quizzes > 0 ? 12 : 0)}%`,
                            backgroundColor: day.isToday ? colors.primary : day.quizzes > 0 ? `${colors.primary}60` : colors.border,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[pStyles.weeklyBarLabel, { color: day.isToday ? colors.primary : colors.muted, fontWeight: day.isToday ? "700" : "400" }]}>
                      {day.label.slice(0, 1)}
                    </Text>
                    {day.quizzes > 0 && (
                      <Text style={[pStyles.weeklyBarCount, { color: colors.primary }]}>{day.quizzes}</Text>
                    )}
                  </View>
                );
              })}
            </View>
            {/* Weekly goal progress bar */}
            <View style={pStyles.weeklyGoalBar}>
              <View style={[pStyles.weeklyGoalTrack, { backgroundColor: colors.border }]}>
                <View style={[pStyles.weeklyGoalFill, { width: `${Math.min(weeklyData.goalPct, 100)}%`, backgroundColor: weeklyData.goalPct >= 100 ? colors.success : colors.primary }]} />
              </View>
              <Text style={[pStyles.weeklyGoalPct, { color: weeklyData.goalPct >= 100 ? colors.success : colors.muted }]}>
                {weeklyData.goalPct >= 100 ? "Goal reached!" : `${Math.round(weeklyData.goalPct)}% of weekly goal`}
              </Text>
            </View>
          </View>
        )}

        {/* ── Quick Links Row ── */}
        <View style={pStyles.quickLinksRow}>
          {[
            { icon: "clock.fill" as const, label: "Quiz History", route: "/quiz-history" },
            { icon: "bookmark.fill" as const, label: "Bookmarks", route: "/bookmarks" },
            { icon: "rectangle.stack.fill" as const, label: "Flashcards", route: "/flashcards" },
            { icon: "chart.xyaxis.line" as const, label: "Progress", route: "/progress" },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route as any)}
              style={[pStyles.quickLinkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.75}
            >
              <IconSymbol size={22} name={item.icon} color={colors.primary} />
              <Text style={[pStyles.quickLinkLabel, { color: colors.foreground }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Subject Cheat Sheet Widget ── */}
        {hasCheatSheet(selectedSubject) && (() => {
          const sheet = getCheatSheet(selectedSubject);
          if (!sheet) return null;
          const preview = sheet.sections[0]?.items.slice(0, 3) ?? [];
          return (
            <View style={[pStyles.widgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => { setCheatSheetExpanded((v) => !v); H.impactLight(); }}
                style={pStyles.widgetHeader}
                activeOpacity={0.8}
              >
                <View style={pStyles.widgetTitleRow}>
                  <Text style={{ fontSize: 16 }}>📐</Text>
                  <Text style={[pStyles.widgetTitle, { color: colors.foreground }]}>{sheet.title} Cheat Sheet</Text>
                </View>
                <IconSymbol size={16} name={cheatSheetExpanded ? "chevron.up" : "chevron.down"} color={colors.muted} />
              </TouchableOpacity>
              {(cheatSheetExpanded ? sheet.sections[0]?.items ?? [] : preview).map((item, i) => (
                <View key={i} style={[pStyles.formulaRow, { borderTopColor: colors.border }]}>
                  <View style={pStyles.formulaInfo}>
                    <Text style={[pStyles.formulaLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[pStyles.formulaValue, { color: colors.primary }]}>{item.formula}</Text>
                    {item.note && <Text style={[pStyles.formulaNote, { color: colors.muted }]}>{item.note}</Text>}
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      await Clipboard.setStringAsync(item.formula);
                      setCopiedFormula(item.formula);
                      setTimeout(() => setCopiedFormula(null), 1800);
                      H.impactLight();
                    }}
                    style={pStyles.formulaCopyBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol size={14} name={copiedFormula === item.formula ? "checkmark.circle.fill" : "doc.on.doc.fill"} color={copiedFormula === item.formula ? colors.success : colors.muted} />
                  </TouchableOpacity>
                </View>
              ))}
              {!cheatSheetExpanded && sheet.sections[0] && sheet.sections[0].items.length > 3 && (
                <TouchableOpacity onPress={() => setCheatSheetExpanded(true)} style={pStyles.showMoreBtn} activeOpacity={0.7}>
                  <Text style={[pStyles.showMoreText, { color: colors.primary }]}>Show all {sheet.sections[0].items.length} formulas</Text>
                </TouchableOpacity>
              )}
              {cheatSheetExpanded && (
                <TouchableOpacity
                  onPress={async () => {
                    const allFormulas = (sheet.sections[0]?.items ?? [])
                      .map((item) => `${item.label}: ${item.formula}${item.note ? ` (${item.note})` : ""}`)
                      .join("\n");
                    await Clipboard.setStringAsync(`${sheet.title} Formulas:\n${allFormulas}`);
                    setCopiedFormula("__all__");
                    setTimeout(() => setCopiedFormula(null), 2000);
                    H.notificationSuccess();
                  }}
                  style={[pStyles.copyAllBtn, { borderTopColor: colors.border, backgroundColor: `${colors.primary}10` }]}
                  activeOpacity={0.75}
                >
                  <IconSymbol size={15} name={copiedFormula === "__all__" ? "checkmark.circle.fill" : "doc.on.doc.fill"} color={copiedFormula === "__all__" ? colors.success : colors.primary} />
                  <Text style={[pStyles.copyAllText, { color: copiedFormula === "__all__" ? colors.success : colors.primary }]}>
                    {copiedFormula === "__all__" ? "All formulas copied!" : `Copy all ${sheet.sections[0]?.items.length ?? 0} formulas`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        {/* Quiz Stats Card */}
        {quizStats && quizStats.totalQuizzes > 0 && (
            <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statsHeader}>
              <Text style={[styles.statsTitle, { color: colors.foreground }]}>📊 Quiz Stats</Text>
              <TouchableOpacity
                onPress={() => router.push("/quiz-history")}
                style={[styles.viewHistoryBtn, { borderColor: colors.primary }]}
              >
                <Text style={[styles.viewHistoryText, { color: colors.primary }]}>View History</Text>
                <IconSymbol size={13} name="chevron.right" color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{quizStats.totalQuizzes}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Quizzes</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.success }]}>{quizStats.bestScore}%</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Best</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.warning }]}>{quizStats.averageScore}%</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Average</Text>
              </View>
            </View>
          </View>
        )}

        {/* Adaptive Difficulty Suggestion Banner — shown below stats for maximum visibility */}
        {diffSuggestion && !suggestionDismissed && (
          <View
            style={[
              styles.suggestionBanner,
              { backgroundColor: colors.surface, borderColor: colors.success },
            ]}
          >
            {/* Top accent strip */}
            <View style={[styles.suggestionAccentStrip, { backgroundColor: colors.success }]} />
            <View style={styles.suggestionInner}>
              <View style={styles.suggestionIconWrap}>
                <Text style={styles.suggestionEmoji}>🚀</Text>
              </View>
              <View style={styles.suggestionBody}>
                <Text style={[styles.suggestionTitle, { color: colors.foreground }]}>
                  Ready to level up?
                </Text>
                <Text style={[styles.suggestionSub, { color: colors.muted }]}>
                  You averaged{" "}
                  <Text style={{ fontWeight: "700", color: colors.success }}>
                    {diffSuggestion.avgPct}%
                  </Text>{" "}
                  on your last 3{" "}
                  <Text style={{ fontWeight: "600", color: colors.foreground }}>
                    {diffSuggestion.currentDifficulty}
                  </Text>{" "}
                  {getSubjectLabel(selectedSubject)} quizzes. Try{" "}
                  <Text style={{ fontWeight: "700", color: colors.success }}>
                    {diffSuggestion.suggestedDifficulty}
                  </Text>!
                </Text>
                <View style={styles.suggestionBtnRow}>
                  <TouchableOpacity
                    accessibilityLabel={`Switch to ${diffSuggestion.suggestedDifficulty} difficulty`}
                    accessibilityRole="button"
                    onPress={() => {
                      handleDifficultyChange(diffSuggestion.suggestedDifficulty);
                      setSuggestionDismissed(true);
                      if (Platform.OS !== "web")
                        H.notificationSuccess();
                    }}
                    style={[styles.suggestionAccept, { backgroundColor: colors.success }]}
                    activeOpacity={0.85}
                  >
                    <IconSymbol size={14} name="arrow.up.circle.fill" color="#fff" />
                    <Text style={styles.suggestionAcceptText}>
                      Switch to {diffSuggestion.suggestedDifficulty}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSuggestionDismissed(true)}
                    style={styles.suggestionDismiss}
                    accessibilityLabel="Dismiss difficulty suggestion"
                    accessibilityRole="button"
                  >
                    <Text style={[styles.suggestionDismissText, { color: colors.muted }]}>Not now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Skeleton loading card — shown while generating (no prefetch available) */}
        {generateMutation.isPending && (
          <View style={{ marginTop: 4 }}>
            <PracticeSkeletonCard />
          </View>
        )}

        {/* Downward difficulty suggestion banner — shown when student is struggling */}
        {diffDownSuggestion && !downSuggestionDismissed && !diffSuggestion && (
          <View
            style={[
              styles.suggestionBanner,
              { backgroundColor: colors.surface, borderColor: colors.warning },
            ]}
          >
            <View style={[styles.suggestionAccentStrip, { backgroundColor: colors.warning }]} />
            <View style={styles.suggestionInner}>
              <View style={[styles.suggestionIconWrap, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
                <Text style={styles.suggestionEmoji}>💪</Text>
              </View>
              <View style={styles.suggestionBody}>
                <Text style={[styles.suggestionTitle, { color: colors.foreground }]}>
                  Let’s build confidence first
                </Text>
                <Text style={[styles.suggestionSub, { color: colors.muted }]}>
                  You averaged{" "}
                  <Text style={{ fontWeight: "700", color: colors.warning }}>
                    {diffDownSuggestion.avgPct}%
                  </Text>{" "}
                  on your last 3{" "}
                  <Text style={{ fontWeight: "600", color: colors.foreground }}>
                    {diffDownSuggestion.currentDifficulty}
                  </Text>{" "}
                  {getSubjectLabel(selectedSubject)} quizzes. Try{" "}
                  <Text style={{ fontWeight: "700", color: colors.warning }}>
                    {diffDownSuggestion.suggestedDifficulty}
                  </Text>{" "}to solidify the fundamentals!
                </Text>
                <View style={styles.suggestionBtnRow}>
                  <TouchableOpacity
                    onPress={() => {
                      handleDifficultyChange(diffDownSuggestion.suggestedDifficulty);
                      setDownSuggestionDismissed(true);
                      if (Platform.OS !== "web") H.impactMedium();
                    }}
                    style={[styles.suggestionAccept, { backgroundColor: colors.warning }]}
                    activeOpacity={0.85}
                  >
                    <IconSymbol size={14} name="arrow.down.circle.fill" color="#fff" />
                    <Text style={styles.suggestionAcceptText}>
                      Switch to {diffDownSuggestion.suggestedDifficulty}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDownSuggestionDismissed(true)}
                    style={styles.suggestionDismiss}
                  >
                    <Text style={[styles.suggestionDismissText, { color: colors.muted }]}>Not now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Current Question */}
        {currentQuestion && !generateMutation.isPending && (
          <View style={styles.questionSection}>
            <View style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.questionHeader}>
                <View style={[styles.difficultyBadge, { backgroundColor: `${getDifficulties(gradeLevel).find((d) => d.id === currentQuestion.difficulty)?.color}20` }]}>
                  <Text style={[styles.difficultyBadgeText, { color: getDifficulties(gradeLevel).find((d) => d.id === currentQuestion.difficulty)?.color }]}>
                    {currentQuestion.difficulty.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.subjectBadge, { backgroundColor: `${getSubjectColor(currentQuestion.subject)}20` }]}>
                  <Text style={[styles.subjectBadgeText, { color: getSubjectColor(currentQuestion.subject) }]}>
                    {getSubjectLabel(currentQuestion.subject)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.questionText, { color: colors.foreground }]}>
                {cleanMathText(currentQuestion.problem)}
              </Text>
            </View>

            {/* Hints */}
            {hintsShown > 0 && (
              <View style={[styles.hintsCard, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}30` }]}>
                <Text style={[styles.hintsTitle, { color: colors.warning }]}>
                  💡 Hints ({hintsShown}/{currentQuestion.hints.length})
                </Text>
                {currentQuestion.hints.slice(0, hintsShown).map((hint, i) => (
                  <View key={i} style={styles.hintRow}>
                    <Text style={[styles.hintNumber, { color: colors.warning }]}>{i + 1}.</Text>
                    <Text style={[styles.hintText, { color: colors.foreground }]}>{cleanMathText(hint)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Answer */}
            {showAnswer && (
              <View style={[styles.answerCard, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}>
                <View style={styles.answerHeader}>
                  <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
                  <Text style={[styles.answerLabel, { color: colors.success }]}>ANSWER</Text>
                </View>
                <Text style={[styles.answerText, { color: colors.foreground }]}>
                  {cleanMathText(currentQuestion.answer)}
                </Text>
              </View>
            )}

            {/* Streak nudge — shown after 5 consecutive correct */}
            {showStreakNudge && (
              <View style={[styles.streakNudge, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}40` }]}>
                <Text style={styles.streakNudgeEmoji}>🔥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.streakNudgeTitle, { color: colors.foreground }]}>You're on fire!</Text>
                  <Text style={[styles.streakNudgeSub, { color: colors.muted }]}>{consecutiveCorrect} in a row — try a harder one?</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const diffs: Difficulty[] = ["easy", "medium", "hard"];
                    const idx = diffs.indexOf(selectedDifficulty);
                    if (idx < diffs.length - 1) handleDifficultyChange(diffs[idx + 1]);
                    setShowStreakNudge(false);
                    H.impactMedium();
                  }}
                  style={[styles.streakNudgeBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.streakNudgeBtnText}>Level Up</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowStreakNudge(false)} style={{ padding: 6 }}>
                  <IconSymbol size={16} name="xmark" color={colors.muted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              {!showAnswer && hintsShown < (currentQuestion.hints?.length || 0) && (
                <TouchableOpacity
                  onPress={handleShowHint}
                  style={[styles.hintBtn, { borderColor: colors.warning, backgroundColor: `${colors.warning}10` }]}
                  activeOpacity={0.8}
                >
                  <IconSymbol size={16} name="lightbulb.fill" color={colors.warning} />
                  <Text style={[styles.hintBtnText, { color: colors.warning }]}>Hint</Text>
                </TouchableOpacity>
              )}
              {!showAnswer && (
                <TouchableOpacity
                  onPress={handleShowAnswer}
                  style={[styles.answerBtn, { borderColor: colors.success, backgroundColor: `${colors.success}10` }]}
                  activeOpacity={0.8}
                >
                  <IconSymbol size={16} name="eye.fill" color={colors.success} />
                  <Text style={[styles.answerBtnText, { color: colors.success }]}>Show Answer</Text>
                </TouchableOpacity>
              )}
              {showAnswer && (
                <>
                  <TouchableOpacity
                    onPress={() => handleSelfGrade(true)}
                    style={[styles.selfGradeBtn, { backgroundColor: colors.success }]}
                    activeOpacity={0.85}
                  >
                    <IconSymbol size={16} name="checkmark" color="#fff" />
                    <Text style={styles.selfGradeBtnText}>Got it ✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleSelfGrade(false)}
                    style={[styles.selfGradeBtn, { backgroundColor: colors.error }]}
                    activeOpacity={0.85}
                  >
                    <IconSymbol size={16} name="xmark" color="#fff" />
                    <Text style={styles.selfGradeBtnText}>Missed ✗</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                onPress={handleViewSolution}
                style={[styles.solutionBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <IconSymbol size={16} name="list.bullet" color="#FFFFFF" />
                <Text style={styles.solutionBtnText}>Full Solution</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Grade Picker Sheet */}
      {showGradePicker && (
        <View style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
            activeOpacity={1}
            onPress={() => setShowGradePicker(false)}
          />
          <View style={[styles.gradeSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.gradeSheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.gradeSheetTitle, { color: colors.foreground }]}>Set your level</Text>
            <Text style={[{ color: colors.muted, fontSize: 13, marginBottom: 12 }]}>Questions will be tailored to your grade level.</Text>
            <View style={styles.gradeGrid}>
              {GRADE_OPTIONS.map((opt) => {
                const isActive = gradeLevel === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.gradeCell, { backgroundColor: isActive ? `${colors.primary}18` : colors.background, borderColor: isActive ? colors.primary : colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      const next = isActive ? null : opt.id;
                      setGradeLevel(next);
                      saveGlobalGrade(next);
                      H.impactLight();
                      setShowGradePicker(false);
                    }}
                  >
                    <Text style={[styles.gradeCellLabel, { color: isActive ? colors.primary : colors.foreground }]}>{opt.label}</Text>
                    <Text style={[styles.gradeCellSub, { color: colors.muted }]}>{opt.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

export default function PracticeScreen() {
  return (
    <ErrorBoundary label="Practice">
      <PracticeScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 12 },
  subjectGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  subjectCard: {
    width: "47%",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    gap: 6,
  },
  subjectEmoji: { fontSize: 24 },
  subjectLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  difficultyRow: { flexDirection: "row", gap: 10 },
  difficultyCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    gap: 4,
  },
  difficultyDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  difficultyLabel: { fontSize: 14, fontWeight: "700" },
  difficultyDesc: { fontSize: 11, textAlign: "center" },
  generateBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  generateBtnText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  questionSection: { paddingHorizontal: 16, marginTop: 20 },
  questionCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  questionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  difficultyBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  subjectTag: { fontSize: 13, fontWeight: "500", textTransform: "capitalize" },
  subjectBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  subjectBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  questionText: { fontSize: 17, lineHeight: 26, fontWeight: "500" },
  hintsCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  hintsTitle: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  hintRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  hintNumber: { fontSize: 14, fontWeight: "700" },
  hintText: { flex: 1, fontSize: 14, lineHeight: 20 },
  answerCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  answerHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  answerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  answerText: { fontSize: 20, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  hintBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  hintBtnText: { fontSize: 14, fontWeight: "600" },
  answerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  answerBtnText: { fontSize: 14, fontWeight: "600" },
  solutionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  solutionBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  quizBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 12,
  },
  quizBtnTitle: { fontSize: 15, fontWeight: "700" },
  quizBtnSub: { fontSize: 12, marginTop: 2 },
  quizSection: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 0,
  },
  quizSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  countPickerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  countPickerLabel: { fontSize: 13, fontWeight: "600", marginRight: 4 },
  countChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  countChipText: { fontSize: 14, fontWeight: "700" },
  startQuizBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  startQuizBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  statsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  statsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  statsTitle: { fontSize: 15, fontWeight: "700" },
  viewHistoryBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  viewHistoryText: { fontSize: 12, fontWeight: "600" },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 36 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12 },
  suggestionBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  suggestionAccentStrip: { height: 4, width: "100%" },
  suggestionInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  suggestionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(34,197,94,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  suggestionEmoji: { fontSize: 22 },
  suggestionBody: { flex: 1 },
  suggestionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  suggestionSub: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  suggestionBtnRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  suggestionAccept: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  suggestionAcceptText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  suggestionDismiss: { padding: 4 },
  suggestionDismissText: { fontSize: 13, fontWeight: "500" },
  gradePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  gradePillText: { fontSize: 13, fontWeight: "700" },
  gradeSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  gradeSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  gradeSheetTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  gradeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gradeCell: {
    width: "30%",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 2,
  },
  gradeCellLabel: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  gradeCellSub: { fontSize: 10, textAlign: "center" },
  selfGradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
  },
  selfGradeBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  streakNudge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  streakNudgeEmoji: { fontSize: 24 },
  streakNudgeTitle: { fontWeight: "700", fontSize: 14 },
  streakNudgeSub: { fontSize: 12, marginTop: 1 },
  streakNudgeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  streakNudgeBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

const pStyles = StyleSheet.create({
  widgetCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  widgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  widgetTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  widgetTitle: { fontSize: 15, fontWeight: "700" },
  widgetLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  widgetLinkText: { fontSize: 12, fontWeight: "600" },
  progressStatRow: { flexDirection: "row", alignItems: "center" },
  progressStat: { flex: 1, alignItems: "center", gap: 4 },
  progressStatDivider: { width: 1, height: 36 },
  progressStatValue: { fontSize: 24, fontWeight: "800" },
  progressStatLabel: { fontSize: 12, textAlign: "center" },
  weeklyGoalBadge: { fontSize: 12, fontWeight: "600" },
  weeklyBarRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 60, marginBottom: 12 },
  weeklyBarCol: { flex: 1, alignItems: "center", gap: 4 },
  weeklyBarTrack: { flex: 1, width: "100%", justifyContent: "flex-end", borderRadius: 4, overflow: "hidden" },
  weeklyBarFill: { width: "100%", borderRadius: 4, minHeight: 0 },
  weeklyBarLabel: { fontSize: 11 },
  weeklyBarCount: { fontSize: 10, fontWeight: "700" },
  weeklyGoalBar: { gap: 6 },
  weeklyGoalTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  weeklyGoalFill: { height: "100%", borderRadius: 3 },
  weeklyGoalPct: { fontSize: 12, fontWeight: "600" },
  quickLinksRow: {
    marginHorizontal: 16,
    marginTop: 24,
    flexDirection: "row",
    gap: 10,
  },
  quickLinkCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  quickLinkLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  formulaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  formulaInfo: { flex: 1 },
  formulaLabel: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  formulaValue: { fontSize: 14, fontWeight: "700", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  formulaNote: { fontSize: 11, marginTop: 2 },
  formulaCopyBtn: { padding: 4 },
  showMoreBtn: { paddingTop: 10, alignItems: "center" },
  showMoreText: { fontSize: 13, fontWeight: "600" },
  copyAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, paddingVertical: 10, borderTopWidth: 1, borderRadius: 8 },
  copyAllText: { fontSize: 13, fontWeight: "600" },
});
