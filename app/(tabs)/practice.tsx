import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type { PracticeQuestion, MathSubject, Difficulty } from "@/shared/types";
import { SubjectPicker } from "@/components/subject-picker";
import { type SubjectId, getSubjectColor, getSubjectLabel } from "@/lib/subjects";
import { loadQuizStats, type QuizStats } from "@/lib/quiz-history";
import { useFocusEffect } from "expo-router";

const QUIZ_COUNTS = [3, 5, 10];

const DIFFICULTIES: { id: Difficulty; label: string; color: string; desc: string }[] = [
  { id: "easy", label: "Easy", color: "#10B981", desc: "Basic concepts" },
  { id: "medium", label: "Medium", color: "#F59E0B", desc: "Intermediate" },
  { id: "hard", label: "Hard", color: "#EF4444", desc: "Advanced" },
];

export default function PracticeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>("algebra");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("medium");
  const [currentQuestion, setCurrentQuestion] = useState<PracticeQuestion | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [quizCount, setQuizCount] = useState(5);
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadQuizStats().then(setQuizStats);
    }, [])
  );

  const generateMutation = trpc.academic.generatePractice.useMutation({
    onSuccess: (data) => {
      setCurrentQuestion(data as PracticeQuestion);
      setShowAnswer(false);
      setHintsShown(0);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const handleGenerate = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    generateMutation.mutate({ subject: selectedSubject, difficulty: selectedDifficulty });
  };

  const handleShowHint = () => {
    if (currentQuestion && hintsShown < currentQuestion.hints.length) {
      setHintsShown(hintsShown + 1);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
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
        }),
      },
    });
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Practice</Text>
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
              onChange={(id) => setSelectedSubject(id ?? "algebra")}
              showAll={false}
            />
          </View>
        </View>

        {/* Difficulty Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>DIFFICULTY</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTIES.map((diff) => {
              const isSelected = selectedDifficulty === diff.id;
              return (
                <TouchableOpacity
                  key={diff.id}
                  onPress={() => {
                    setSelectedDifficulty(diff.id);
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
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
          disabled={generateMutation.isPending}
          style={[
            styles.generateBtn,
            { backgroundColor: colors.primary },
            generateMutation.isPending && { opacity: 0.7 },
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
            onPress={() => router.push({ pathname: "/quiz", params: { subject: selectedSubject, difficulty: selectedDifficulty, count: String(quizCount) } })}
            style={[styles.startQuizBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <IconSymbol size={18} name="bolt.fill" color="#fff" />
            <Text style={styles.startQuizBtnText}>Start {quizCount}-Question Quiz</Text>
          </TouchableOpacity>
        </View>

        {/* Quiz Stats Card */}
        {quizStats && quizStats.totalQuizzes > 0 && (
          <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statsTitle, { color: colors.foreground }]}>📊 Quiz Stats</Text>
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

        {/* Current Question */}
        {currentQuestion && (
          <View style={styles.questionSection}>
            <View style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.questionHeader}>
                <View style={[styles.difficultyBadge, { backgroundColor: `${DIFFICULTIES.find(d => d.id === currentQuestion.difficulty)?.color}20` }]}>
                  <Text style={[styles.difficultyBadgeText, { color: DIFFICULTIES.find(d => d.id === currentQuestion.difficulty)?.color }]}>
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
                {currentQuestion.problem}
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
                    <Text style={[styles.hintText, { color: colors.foreground }]}>{hint}</Text>
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
                  {currentQuestion.answer}
                </Text>
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
    </ScreenContainer>
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
  statsTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 36 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12 },
});
