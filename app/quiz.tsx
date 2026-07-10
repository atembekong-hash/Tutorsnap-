import React, { useState, useRef, useCallback, useEffect } from "react";
import { Share } from "react-native";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { getSubjectColor, getSubjectLabel } from "@/lib/subjects";
import { saveQuizResult } from "@/lib/quiz-history";
import { recordQuizBonus } from "@/lib/progress";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: string;
  problem: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
}

type OptionKey = "A" | "B" | "C" | "D";

// ─── Timer per question (seconds) ─────────────────────────────────────────────
const SECONDS_PER_QUESTION = 30;

// ─── Option Row ───────────────────────────────────────────────────────────────
function OptionRow({
  optKey,
  text,
  selected,
  correct,
  revealed,
  onPress,
  colors,
}: {
  optKey: OptionKey;
  text: string;
  selected: boolean;
  correct: boolean;
  revealed: boolean;
  onPress: () => void;
  colors: any;
}) {
  let bg = colors.surface;
  let border = colors.border;
  let textColor = colors.foreground;

  if (revealed) {
    if (correct) { bg = `${colors.success}20`; border = colors.success; textColor = colors.success; }
    else if (selected) { bg = `${colors.error}20`; border = colors.error; textColor = colors.error; }
  } else if (selected) {
    bg = `${colors.primary}20`;
    border = colors.primary;
    textColor = colors.primary;
  }

  const stateLabel = revealed ? (correct ? " — correct" : selected ? " — incorrect" : "") : selected ? " — selected" : "";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={revealed}
      style={[styles.optionRow, { backgroundColor: bg, borderColor: border }]}
      activeOpacity={0.75}
      accessibilityLabel={`Option ${optKey}: ${text}${stateLabel}`}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: revealed }}
    >
      <View style={[styles.optionBadge, { backgroundColor: revealed && correct ? colors.success : revealed && selected ? colors.error : selected ? colors.primary : colors.border }]}>
        <Text style={[styles.optionBadgeText, { color: revealed || selected ? "#fff" : colors.muted }]}>{optKey}</Text>
      </View>
      <Text style={[styles.optionText, { color: textColor }]}>{text}</Text>
      {revealed && correct && <IconSymbol size={18} name="checkmark.circle.fill" color={colors.success} />}
      {revealed && selected && !correct && <IconSymbol size={18} name="xmark.circle.fill" color={colors.error} />}
    </TouchableOpacity>
  );
}

// ─── Score Summary Screen ─────────────────────────────────────────────────────
function ScoreSummary({
  questions,
  answers,
  timeTaken,
  bonusAwarded,
  bonusStreak,
  subject,
  onRetry,
  onHome,
  colors,
}: {
  questions: QuizQuestion[];
  answers: (OptionKey | null)[];
  timeTaken: number;
  bonusAwarded: boolean;
  bonusStreak: number;
  subject: string;
  onRetry: () => void;
  onHome: () => void;
  colors: any;
}) {
  const correct = answers.filter((a, i) => a === questions[i].correctAnswer).length;
  const total = questions.length;
  const pct = Math.round((correct / total) * 100);
  const grade = pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
  const gradeColor = pct >= 80 ? colors.success : pct >= 60 ? colors.warning : colors.error;
  const mins = Math.floor(timeTaken / 60);
  const secs = timeTaken % 60;
  const subjectLabel = getSubjectLabel(subject);

  const [copied, setCopied] = React.useState(false);

  const handleShareResults = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const emoji = pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "📚";
    const message = [
      `${emoji} TutorSnap Quiz Results`,
      `Subject: ${subjectLabel}`,
      `Score: ${correct}/${total} (${pct}%) — Grade ${grade}`,
      `Time: ${timeStr}`,
      bonusAwarded ? `🔥 Streak bonus earned! ${bonusStreak}-day streak` : "",
      "",
      "Practiced with TutorSnap · tutorsnapai.tech",
    ]
      .filter(Boolean)
      .join("\n");

    if (Platform.OS === "web") {
      // Share.share is not available on web — copy to clipboard instead
      try {
        await Clipboard.setStringAsync(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // clipboard unavailable — ignore
      }
      return;
    }

    try {
      await Share.share({ message });
    } catch {
      // User cancelled
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      {/* Grade Card */}
      <View style={[styles.gradeCard, { backgroundColor: `${gradeColor}15`, borderColor: `${gradeColor}40` }]}>
        <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
        <Text style={[styles.scoreText, { color: colors.foreground }]}>{correct} / {total} correct</Text>
        <Text style={[styles.pctText, { color: gradeColor }]}>{pct}%</Text>
        <Text style={[styles.timeText, { color: colors.muted }]}>
          ⏱ {mins > 0 ? `${mins}m ` : ""}{secs}s
        </Text>
        {bonusAwarded && (
          <View style={[styles.bonusBadge, { backgroundColor: `${colors.warning}20`, borderColor: `${colors.warning}50` }]}>
            <Text style={[styles.bonusBadgeText, { color: colors.warning }]}>
              🔥 Streak Bonus! Now {bonusStreak} days
            </Text>
          </View>
        )}
      </View>

      {/* Per-question review */}
      <Text style={[styles.reviewTitle, { color: colors.foreground }]}>Review</Text>
      {questions.map((q, i) => {
        const userAns = answers[i];
        const isCorrect = userAns === q.correctAnswer;
        return (
          <View key={q.id} style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: isCorrect ? `${colors.success}40` : `${colors.error}40` }]}>
            <View style={styles.reviewHeader}>
              <IconSymbol size={16} name={isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill"} color={isCorrect ? colors.success : colors.error} />
              <Text style={[styles.reviewQ, { color: colors.foreground }]} numberOfLines={2}>{q.problem}</Text>
            </View>
            <Text style={[styles.reviewAns, { color: isCorrect ? colors.success : colors.error }]}>
              Your answer: {userAns ?? "Timed out"} — {isCorrect ? "Correct ✓" : `Correct: ${q.correctAnswer}`}
            </Text>
            <Text style={[styles.reviewExp, { color: colors.muted }]}>{q.explanation}</Text>
          </View>
        );
      })}

      {/* Buttons */}
      <View style={styles.summaryBtns}>
        <TouchableOpacity onPress={onRetry} style={[styles.summaryBtn, { backgroundColor: colors.primary }]}>
          <IconSymbol size={18} name="arrow.counterclockwise" color="#fff" />
          <Text style={styles.summaryBtnText}>Retry Quiz</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onHome} style={[styles.summaryBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
          <IconSymbol size={18} name="house.fill" color={colors.foreground} />
          <Text style={[styles.summaryBtnText, { color: colors.foreground }]}>Home</Text>
        </TouchableOpacity>
      </View>
      {/* Share Results / Copy Results (web) */}
      <TouchableOpacity
        onPress={handleShareResults}
        accessibilityLabel={Platform.OS === "web" ? (copied ? "Results copied to clipboard" : "Copy quiz results to clipboard") : "Share quiz results"}
        style={[styles.shareResultsBtn, { borderColor: copied ? colors.success : colors.border }]}
        activeOpacity={0.75}
      >
        <IconSymbol
          size={16}
          name={copied ? "checkmark.circle.fill" : "square.and.arrow.up.fill"}
          color={copied ? colors.success : colors.primary}
        />
        <Text style={[styles.shareResultsBtnText, { color: copied ? colors.success : colors.primary }]}>
          {Platform.OS === "web" ? (copied ? "Copied!" : "Copy Results") : "Share Results"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Main Quiz Screen ─────────────────────────────────────────────────────────
export default function QuizScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ subject: string; difficulty: string; count: string }>();

  const subject = params.subject ?? "algebra";
  const difficulty = (params.difficulty ?? "medium") as "easy" | "medium" | "hard";
  const count = parseInt(params.count ?? "5", 10);

  const subjectColor = getSubjectColor(subject);
  const subjectLabel = getSubjectLabel(subject);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(OptionKey | null)[]>([]);
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [totalTime, setTotalTime] = useState(0);
  const [bonusAwarded, setBonusAwarded] = useState(false);
  const [bonusStreak, setBonusStreak] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  const generateMutation = trpc.academic.generateQuiz.useMutation({
    onSuccess: (data) => {
      const qs = data as QuizQuestion[];
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));
      setCurrentIdx(0);
      setSelectedOption(null);
      setRevealed(false);
      setFinished(false);
      setTimeLeft(SECONDS_PER_QUESTION);
      setTotalTime(0);
      startTimer();
    },
    onError: () => {
      // Error state is shown via generateMutation.isError in render
    },
  });

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(SECONDS_PER_QUESTION);
    Animated.timing(progressAnim, { toValue: 1, duration: 0, useNativeDriver: false }).start();
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: SECONDS_PER_QUESTION * 1000,
      useNativeDriver: false,
    }).start();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          // Auto-advance on timeout
          setRevealed(true);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return 0;
        }
        return t - 1;
      });
      setTotalTime((t) => t + 1);
    }, 1000);
  }, [progressAnim]);

  useEffect(() => {
    generateMutation.mutate({ subject, difficulty, count });
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectOption = (key: OptionKey) => {
    if (revealed) return;
    setSelectedOption(key);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleConfirm = () => {
    if (!selectedOption && timeLeft > 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setRevealed(true);
    const newAnswers = [...answers];
    newAnswers[currentIdx] = selectedOption;
    setAnswers(newAnswers);
    const correct = selectedOption === questions[currentIdx]?.correctAnswer;
    if (Platform.OS !== "web") {
      if (correct) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleNext = async () => {
    if (currentIdx + 1 >= questions.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      // Save quiz result to history
      const finalAnswers = [...answers];
      finalAnswers[currentIdx] = selectedOption;
      const correctCount = finalAnswers.filter((a, i) => a === questions[i]?.correctAnswer).length;
      const pct = Math.round((correctCount / questions.length) * 100);
      try {
        const questionSnapshots = questions.map((q, i) => ({
          id: q.id,
          problem: q.problem,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          userAnswer: finalAnswers[i] ?? null,
        }));
        await saveQuizResult({
          subject,
          difficulty,
          score: correctCount,
          total: questions.length,
          pct,
          timeTaken: totalTime,
          completedAt: Date.now(),
          questions: questionSnapshots,
        });
      } catch { /* history save failure is non-critical */ }
      let bonus = { awarded: false, newStreak: 0 };
      try {
        bonus = await recordQuizBonus(pct);
      } catch { /* bonus recording failure is non-critical */ }
      setBonusAwarded(bonus.awarded);
      setBonusStreak(bonus.newStreak);
      if (bonus.awarded && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setFinished(true);
    } else {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      setRevealed(false);
      startTimer();
    }
  };

  const handleRetry = () => {
    generateMutation.mutate({ subject, difficulty, count });
  };

  // Error state
  if (generateMutation.isError) {
    return (
      <ScreenContainer>
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Quiz</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={[styles.loadingText, { color: colors.foreground, fontWeight: "700" }]}>Could not generate quiz</Text>
          <Text style={[styles.loadingText, { color: colors.muted, textAlign: "center" }]}>Please check your connection and try again.</Text>
          <TouchableOpacity
            onPress={() => generateMutation.mutate({ subject, difficulty, count })}
            style={[styles.actionBtn, { backgroundColor: colors.primary, paddingHorizontal: 32, marginTop: 8 }]}
            activeOpacity={0.85}
            accessibilityLabel="Retry quiz generation"
          >
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // Loading state
  if (generateMutation.isPending || questions.length === 0) {
    return (
      <ScreenContainer>
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Quiz</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Generating your quiz…</Text>
        </View>
      </ScreenContainer>
    );
  }

  const q = questions[currentIdx];

  return (
    <ScreenContainer>
      {/* Nav Bar */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>
          {finished ? "Results" : `${subjectLabel} Quiz`}
        </Text>
        <View style={[styles.questionCounter, { backgroundColor: `${subjectColor}20` }]}>
          <Text style={[styles.questionCounterText, { color: subjectColor }]}>
            {finished ? "Done" : `${currentIdx + 1}/${questions.length}`}
          </Text>
        </View>
      </View>

      {finished ? (
          <ScoreSummary
            questions={questions}
            answers={answers}
            timeTaken={totalTime}
            bonusAwarded={bonusAwarded}
            bonusStreak={bonusStreak}
            subject={subject}
            onRetry={handleRetry}
            onHome={() => router.push("/(tabs)/practice" as any)}
            colors={colors}
          />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Timer Bar */}
          <View style={[styles.timerBarBg, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.timerBarFill,
                {
                  backgroundColor: timeLeft > 10 ? colors.success : colors.error,
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                },
              ]}
            />
          </View>
          <View style={styles.timerRow}>
            <Text style={[styles.timerText, { color: timeLeft <= 10 ? colors.error : colors.muted }]}>
              ⏱ {timeLeft}s
            </Text>
            <Text style={[styles.difficultyBadge, { color: subjectColor, backgroundColor: `${subjectColor}15` }]}>
              {difficulty.toUpperCase()}
            </Text>
          </View>

          {/* Question */}
          <View style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.questionText, { color: colors.foreground }]}>{q.problem}</Text>
          </View>

          {/* Options */}
          {(["A", "B", "C", "D"] as OptionKey[]).map((key) => (
            <OptionRow
              key={key}
              optKey={key}
              text={q.options[key]}
              selected={selectedOption === key}
              correct={key === q.correctAnswer}
              revealed={revealed}
              onPress={() => handleSelectOption(key)}
              colors={colors}
            />
          ))}

          {/* Explanation (after reveal) */}
          {revealed && (
            <View style={[styles.explanationCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
              <Text style={[styles.explanationLabel, { color: colors.primary }]}>💡 Explanation</Text>
              <Text style={[styles.explanationText, { color: colors.foreground }]}>{q.explanation}</Text>
            </View>
          )}

          {/* Action Button */}
          {!revealed ? (
            <TouchableOpacity
              accessibilityLabel="Confirm"
              onPress={handleConfirm}
              disabled={!selectedOption}
              style={[styles.actionBtn, { backgroundColor: selectedOption ? colors.primary : colors.border }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.actionBtnText, { color: selectedOption ? "#fff" : colors.muted }]}>
                Confirm Answer
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              accessibilityLabel="Next"
              onPress={handleNext}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.actionBtnText, { color: "#fff" }]}>
                {currentIdx + 1 >= questions.length ? "See Results" : "Next Question →"}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
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
  questionCounter: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  questionCounterText: { fontSize: 13, fontWeight: "700" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { fontSize: 15 },
  timerBarBg: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  timerBarFill: { height: 6, borderRadius: 3 },
  timerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  timerText: { fontSize: 13, fontWeight: "600" },
  difficultyBadge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  questionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  questionText: { fontSize: 16, fontWeight: "600", lineHeight: 24 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  optionBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  optionBadgeText: { fontSize: 13, fontWeight: "700" },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20 },
  explanationCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
    gap: 6,
  },
  explanationLabel: { fontSize: 13, fontWeight: "700" },
  explanationText: { fontSize: 14, lineHeight: 21 },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  actionBtnText: { fontSize: 16, fontWeight: "700" },
  // Score summary
  gradeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    gap: 4,
  },
  gradeText: { fontSize: 72, fontWeight: "900", lineHeight: 80 },
  scoreText: { fontSize: 20, fontWeight: "700" },
  pctText: { fontSize: 16, fontWeight: "600" },
  timeText: { fontSize: 13, marginTop: 4 },
  reviewTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  reviewHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  reviewQ: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  reviewAns: { fontSize: 13, fontWeight: "600" },
  reviewExp: { fontSize: 13, lineHeight: 19 },
  summaryBtns: { flexDirection: "row", gap: 12, marginTop: 20 },
  summaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  summaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  bonusBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  bonusBadgeText: { fontSize: 14, fontWeight: "700" },
  shareResultsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    alignSelf: "center",
  },
  shareResultsBtnText: { fontSize: 15, fontWeight: "700" },
});
