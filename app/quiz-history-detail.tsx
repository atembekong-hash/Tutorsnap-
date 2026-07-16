import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as H from "@/lib/haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { loadQuizHistory, type QuizResult, type QuizQuestionSnapshot } from "@/lib/quiz-history";
import { getSubjectLabel } from "@/lib/subjects";
import { cleanMathText } from "@/lib/clean-math-text";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradeLabel(pct: number): { letter: string; color: string } {
  if (pct >= 90) return { letter: "A", color: "#22C55E" };
  if (pct >= 80) return { letter: "B", color: "#4ADE80" };
  if (pct >= 70) return { letter: "C", color: "#F59E0B" };
  if (pct >= 60) return { letter: "D", color: "#F97316" };
  return { letter: "F", color: "#EF4444" };
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Option Key Badge ─────────────────────────────────────────────────────────

type OptionKey = "A" | "B" | "C" | "D";
const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

function OptionBadge({
  optKey,
  text,
  isCorrect,
  isUserAnswer,
  colors,
}: {
  optKey: OptionKey;
  text: string;
  isCorrect: boolean;
  isUserAnswer: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  let bg = colors.surface;
  let borderColor = colors.border;
  let textColor = colors.foreground;
  let badgeBg = colors.border;
  let badgeText = colors.muted;

  if (isCorrect) {
    bg = `${colors.success}18`;
    borderColor = colors.success;
    textColor = colors.foreground;
    badgeBg = colors.success;
    badgeText = "#fff";
  } else if (isUserAnswer) {
    bg = `${colors.error}18`;
    borderColor = colors.error;
    textColor = colors.foreground;
    badgeBg = colors.error;
    badgeText = "#fff";
  }

  return (
    <View style={[styles.optionRow, { backgroundColor: bg, borderColor }]}>
      <View style={[styles.optionBadge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.optionBadgeText, { color: badgeText }]}>{optKey}</Text>
      </View>
      <Text style={[styles.optionText, { color: textColor }]} numberOfLines={3}>
        {cleanMathText(text)}
      </Text>
      {isCorrect && (
        <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
      )}
      {isUserAnswer && !isCorrect && (
        <IconSymbol size={16} name="xmark.circle.fill" color={colors.error} />
      )}
    </View>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({
  q,
  index,
  colors,
}: {
  q: QuizQuestionSnapshot;
  index: number;
  colors: ReturnType<typeof useColors>;
}) {
  const isCorrect = q.userAnswer === q.correctAnswer;
  const timedOut = q.userAnswer === null;
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={[
        styles.questionCard,
        {
          backgroundColor: colors.surface,
          borderColor: isCorrect
            ? `${colors.success}50`
            : timedOut
            ? `${colors.warning}50`
            : `${colors.error}50`,
        },
      ]}
    >
      {/* Question header */}
      <View style={styles.questionHeader}>
        <View
          style={[
            styles.questionNumBadge,
            {
              backgroundColor: isCorrect
                ? `${colors.success}20`
                : timedOut
                ? `${colors.warning}20`
                : `${colors.error}20`,
            },
          ]}
        >
          <IconSymbol
            size={14}
            name={
              isCorrect
                ? "checkmark.circle.fill"
                : timedOut
                ? "clock.fill"
                : "xmark.circle.fill"
            }
            color={isCorrect ? colors.success : timedOut ? colors.warning : colors.error}
          />
          <Text
            style={[
              styles.questionNumText,
              {
                color: isCorrect
                  ? colors.success
                  : timedOut
                  ? colors.warning
                  : colors.error,
              },
            ]}
          >
            Q{index + 1}
          </Text>
        </View>
        <Text style={[styles.resultLabel, { color: isCorrect ? colors.success : timedOut ? colors.warning : colors.error }]}>
          {isCorrect ? "Correct" : timedOut ? "Timed Out" : "Incorrect"}
        </Text>
      </View>

      {/* Problem text */}
      <Text style={[styles.problemText, { color: colors.foreground }]}>{cleanMathText(q.problem)}</Text>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {OPTION_KEYS.map((key) => (
          <OptionBadge
            key={key}
            optKey={key}
            text={q.options[key]}
            isCorrect={key === q.correctAnswer}
            isUserAnswer={key === q.userAnswer}
            colors={colors}
          />
        ))}
      </View>

      {/* Your answer summary */}
      {!isCorrect && (
        <View style={[styles.answerSummary, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}30` }]}>
          <Text style={[styles.answerSummaryText, { color: colors.error }]}>
            {timedOut
              ? "You ran out of time on this question."
              : `You answered ${q.userAnswer} · Correct answer: ${q.correctAnswer}`}
          </Text>
        </View>
      )}

      {/* Explanation toggle */}
      <TouchableOpacity
        onPress={() => {
          setExpanded((v) => !v);
          H.impactLight()
        }}
        style={[styles.explanationToggle, { borderTopColor: colors.border }]}
        activeOpacity={0.7}
        accessibilityLabel={expanded ? "Hide explanation" : "Show explanation"}
        accessibilityRole="button"
      >
        <Text style={[styles.explanationToggleText, { color: colors.primary }]}>
          {expanded ? "Hide Explanation" : "Show Explanation"}
        </Text>
        <IconSymbol
          size={14}
          name={expanded ? "chevron.up" : "chevron.down"}
          color={colors.primary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.explanationBody, { backgroundColor: `${colors.primary}08` }]}>
          <Text style={[styles.explanationText, { color: colors.foreground }]}>
            {cleanMathText(q.explanation)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function QuizHistoryDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [quiz, setQuiz] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    loadQuizHistory()
      .then((history) => {
        const found = history.find((h) => h.id === id) ?? null;
        setQuiz(found);
        setLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setLoading(false);
      });
  }, [id]);

  const handleShare = async () => {
    if (!quiz) return;
    H.impactLight()
    const subjectLabel = getSubjectLabel(quiz.subject);
    const grade = gradeLabel(quiz.pct);
    const correctCount = quiz.score;
    const total = quiz.total;
    const lines: string[] = [
      `📊 TutorSnap Quiz Review`,
      `Subject: ${subjectLabel} · ${quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}`,
      `Score: ${correctCount}/${total} (${quiz.pct}%) — Grade ${grade.letter}`,
      `Time: ${formatDuration(quiz.timeTaken)}`,
      `Date: ${formatDate(quiz.completedAt)}`,
    ];
    if (quiz.questions) {
      lines.push("");
      quiz.questions.forEach((q, i) => {
        const correct = q.userAnswer === q.correctAnswer;
        const icon = correct ? "✓" : q.userAnswer === null ? "⏱" : "✗";
        lines.push(`${icon} Q${i + 1}: ${q.problem}`);
        if (!correct) {
          lines.push(
            `   Your answer: ${q.userAnswer ?? "timed out"} | Correct: ${q.correctAnswer}`
          );
        }
      });
    }
    lines.push("", "Practiced with TutorSnap · tutorsnapai.tech");
    const message = lines.join("\n");

    if (Platform.OS === "web") {
      try {
        await Clipboard.setStringAsync(message);
        setCopied(true);
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => setCopied(false), 2500);
      } catch {
        // clipboard unavailable
      }
      return;
    }
    try {
      await Share.share({ message });
    } catch {
      // user cancelled
    }
  };

  // ── Loading / Error ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <ScreenContainer>
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Quiz Review</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (loadError || !quiz) {
    return (
      <ScreenContainer>
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Quiz Review</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Quiz Not Found</Text>
          <Text style={[styles.emptySub, { color: colors.muted }]}>
            This quiz result could not be loaded.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtnFilled, { backgroundColor: colors.primary }]}
            accessibilityLabel="Go back to quiz history"
            accessibilityRole="button"
          >
            <Text style={styles.backBtnFilledText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const grade = gradeLabel(quiz.pct);
  const subjectLabel = getSubjectLabel(quiz.subject);
  const hasDetail = quiz.questions && quiz.questions.length > 0;

  return (
    <ScreenContainer>
      {/* Nav bar */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back to quiz history"
          accessibilityRole="button"
        >
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>
          Quiz Review
        </Text>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareBtn}
          accessibilityLabel={Platform.OS === "web" ? "Copy quiz review to clipboard" : "Share quiz review"}
          accessibilityRole="button"
        >
          <IconSymbol
            size={20}
            name={copied ? "checkmark.circle.fill" : "square.and.arrow.up.fill"}
            color={copied ? colors.success : colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: `${grade.color}12`,
              borderColor: `${grade.color}40`,
            },
          ]}
        >
          <View style={styles.summaryTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summarySubject, { color: colors.foreground }]}>
                {subjectLabel}
              </Text>
              <Text style={[styles.summaryMeta, { color: colors.muted }]}>
                {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)} ·{" "}
                {formatDate(quiz.completedAt)} · {formatTime(quiz.completedAt)}
              </Text>
            </View>
            <View
              style={[
                styles.gradeBadge,
                { backgroundColor: `${grade.color}20`, borderColor: grade.color },
              ]}
            >
              <Text style={[styles.gradeText, { color: grade.color }]}>{grade.letter}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {quiz.score}/{quiz.total}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Correct</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: grade.color }]}>{quiz.pct}%</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Score</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {formatDuration(quiz.timeTaken)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Time</Text>
            </View>
            {hasDetail && (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.error }]}>
                    {quiz.questions!.filter((q) => q.userAnswer !== q.correctAnswer && q.userAnswer !== null).length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Wrong</Text>
                </View>
              </>
            )}
          </View>

          {/* Score bar */}
          <View style={[styles.barBg, { backgroundColor: `${grade.color}25` }]}>
            <View
              style={[
                styles.barFill,
                { width: `${quiz.pct}%` as any, backgroundColor: grade.color },
              ]}
            />
          </View>
        </View>

        {/* Per-question section */}
        {hasDetail ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Question Breakdown
            </Text>
            <Text style={[styles.sectionSub, { color: colors.muted }]}>
              Tap 201CShow Explanation201D on any question to review the reasoning.
            </Text>
            {quiz.questions!.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} colors={colors} />
            ))}
          </>
        ) : (
          <View style={[styles.noDetailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol size={32} name="clock.fill" color={colors.muted} />
            <Text style={[styles.noDetailTitle, { color: colors.foreground }]}>
              No Question Detail Available
            </Text>
            <Text style={[styles.noDetailSub, { color: colors.muted }]}>
              This quiz was completed before per-question tracking was added. Future quizzes
              will show a full breakdown here.
            </Text>
          </View>
        )}

        {/* Practice again button */}
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/quiz",
              params: { subject: quiz.subject, difficulty: quiz.difficulty, count: String(quiz.total) },
            } as any)
          }
          style={[styles.practiceBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          accessibilityLabel="Practice this quiz again"
          accessibilityRole="button"
        >
          <IconSymbol size={18} name="arrow.counterclockwise" color="#fff" />
          <Text style={styles.practiceBtnText}>Practice Again</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  navTitle: { flex: 1, fontSize: 17, fontWeight: "600", textAlign: "center" },
  shareBtn: { width: 40, alignItems: "flex-end" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  backBtnFilled: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  backBtnFilledText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  // Summary card
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 24,
  },
  summaryTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  summarySubject: { fontSize: 17, fontWeight: "700", marginBottom: 3 },
  summaryMeta: { fontSize: 12, lineHeight: 16 },
  gradeBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  gradeText: { fontSize: 20, fontWeight: "800" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 14,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: "500" },
  statDivider: { width: 1, height: 32 },
  barBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },

  // Section header
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  sectionSub: { fontSize: 13, lineHeight: 18, marginBottom: 14 },

  // Question card
  questionCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 14,
    overflow: "hidden",
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  questionNumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  questionNumText: { fontSize: 13, fontWeight: "700" },
  resultLabel: { fontSize: 13, fontWeight: "600" },
  problemText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  optionsContainer: { paddingHorizontal: 14, gap: 8, marginBottom: 12 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  optionBadgeText: { fontSize: 12, fontWeight: "700" },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20 },

  // Answer summary
  answerSummary: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  answerSummaryText: { fontSize: 13, lineHeight: 18, fontWeight: "500" },

  // Explanation
  explanationToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 0.5,
  },
  explanationToggleText: { fontSize: 13, fontWeight: "600" },
  explanationBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  explanationText: { fontSize: 14, lineHeight: 21 },

  // No detail placeholder
  noDetailCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  noDetailTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  noDetailSub: { fontSize: 13, lineHeight: 19, textAlign: "center" },

  // Practice again
  practiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 28,
    paddingVertical: 15,
    marginTop: 8,
  },
  practiceBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
