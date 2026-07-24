import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import { loadQuizHistory, type QuizQuestionSnapshot } from "@/lib/quiz-history";
import { cleanMathText } from "@/lib/clean-math-text";
import { useFontSize } from "@/lib/font-size-provider";
import { DotsLoader } from "@/components/skeleton";

// ─── Option Badge ─────────────────────────────────────────────────────────────

type OptionKey = "A" | "B" | "C" | "D";
const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

function OptionBadge({
  optKey,
  text,
  isCorrect,
  isUserAnswer,
  colors,
  fs,
}: {
  optKey: OptionKey;
  text: string;
  isCorrect: boolean;
  isUserAnswer: boolean;
  colors: ReturnType<typeof useColors>;
  fs: (n: number) => number;
}) {
  let bg = colors.surface;
  let borderColor = colors.border;
  let textColor = colors.foreground;
  let badgeBg = colors.border;
  let badgeText = colors.muted;

  if (isCorrect) {
    bg = `${colors.success}18`;
    borderColor = colors.success;
    badgeBg = colors.success;
    badgeText = "#fff";
  } else if (isUserAnswer) {
    bg = `${colors.error}18`;
    borderColor = colors.error;
    badgeBg = colors.error;
    badgeText = "#fff";
  }

  return (
    <View style={[styles.optionRow, { backgroundColor: bg, borderColor }]}>
      <View style={[styles.optionBadge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.optionBadgeText, { color: badgeText }]}>{optKey}</Text>
      </View>
      <Text style={[styles.optionText, { color: textColor, fontSize: fs(13) }]} numberOfLines={3}>
        {cleanMathText(text)}
      </Text>
      {isCorrect && <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />}
      {isUserAnswer && !isCorrect && <IconSymbol size={16} name="xmark.circle.fill" color={colors.error} />}
    </View>
  );
}

// ─── Missed Question Card ─────────────────────────────────────────────────────

function MissedQuestionCard({
  q,
  index,
  totalMissed,
  colors,
  fs,
}: {
  q: QuizQuestionSnapshot;
  index: number;
  totalMissed: number;
  colors: ReturnType<typeof useColors>;
  fs: (n: number) => number;
}) {
  const timedOut = q.userAnswer === null;
  const [showExplanation, setShowExplanation] = useState(false);
  const [copiedExplanation, setCopiedExplanation] = useState(false);
  const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <View
      style={[
        styles.questionCard,
        {
          backgroundColor: colors.surface,
          borderColor: timedOut ? `${colors.warning}50` : `${colors.error}50`,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.questionHeader}>
        <View
          style={[
            styles.questionNumBadge,
            { backgroundColor: timedOut ? `${colors.warning}20` : `${colors.error}20` },
          ]}
        >
          <IconSymbol
            size={14}
            name={timedOut ? "clock.fill" : "xmark.circle.fill"}
            color={timedOut ? colors.warning : colors.error}
          />
          <Text
            style={[
              styles.questionNumText,
              { color: timedOut ? colors.warning : colors.error, fontSize: fs(12) },
            ]}
          >
            {index + 1} of {totalMissed}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: timedOut ? `${colors.warning}15` : `${colors.error}15` },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: timedOut ? colors.warning : colors.error, fontSize: fs(11) },
            ]}
          >
            {timedOut ? "Timed Out" : "Incorrect"}
          </Text>
        </View>
      </View>

      {/* Problem */}
      <Text style={[styles.problemText, { color: colors.foreground, fontSize: fs(14) }]}>
        {cleanMathText(q.problem)}
      </Text>

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
            fs={fs}
          />
        ))}
      </View>

      {/* Answer summary */}
      <View
        style={[
          styles.answerSummary,
          { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}30` },
        ]}
      >
        <Text style={[styles.answerSummaryText, { color: colors.error, fontSize: fs(12) }]}>
          {timedOut
            ? "You ran out of time on this question."
            : `You answered ${q.userAnswer} · Correct answer: ${q.correctAnswer}`}
        </Text>
      </View>

      {/* Explanation toggle */}
      <TouchableOpacity
        onPress={() => {
          setShowExplanation((v) => !v);
          H.impactLight();
        }}
        style={[styles.explanationToggle, { borderTopColor: colors.border }]}
        activeOpacity={0.7}
        accessibilityLabel={showExplanation ? "Hide explanation" : "Show explanation"}
      >
        <Text style={[styles.explanationToggleText, { color: colors.primary, fontSize: fs(13) }]}>
          {showExplanation ? "Hide Explanation" : "Show Explanation"}
        </Text>
        <IconSymbol
          size={14}
          name={showExplanation ? "chevron.up" : "chevron.down"}
          color={colors.primary}
        />
      </TouchableOpacity>

      {showExplanation && (
        <View
          style={[
            styles.explanationBody,
            { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Text
              style={[styles.explanationText, { color: colors.foreground, fontSize: fs(13), flex: 1 }]}
            >
              {cleanMathText(q.explanation)}
            </Text>
            <TouchableOpacity
              accessibilityLabel="Copy explanation"
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(q.explanation);
                  setCopiedExplanation(true);
                  H.impactLight();
                  if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
                  copiedTimerRef.current = setTimeout(() => setCopiedExplanation(false), 2000);
                } catch { /* ignore */ }
              }}
              style={[
                styles.copyBtn,
                {
                  backgroundColor: copiedExplanation
                    ? `${colors.success}20`
                    : `${colors.primary}12`,
                  borderColor: copiedExplanation ? `${colors.success}40` : `${colors.primary}20`,
                },
              ]}
            >
              <IconSymbol
                size={13}
                name={copiedExplanation ? "checkmark.circle.fill" : "doc.on.doc"}
                color={copiedExplanation ? colors.success : colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReviewMissedScreen() {
  const colors = useColors();
  const { fs } = useFontSize();
  const router = useRouter();
  const { quizId } = useLocalSearchParams<{ quizId: string }>();

  const [loading, setLoading] = useState(true);
  const [missedQuestions, setMissedQuestions] = useState<QuizQuestionSnapshot[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) {
      setError("No quiz ID provided.");
      setLoading(false);
      return;
    }
    loadQuizHistory()
      .then((history) => {
        const quiz = history.find((r) => r.id === quizId);
        if (!quiz) {
          setError("Quiz not found.");
          setLoading(false);
          return;
        }
        const missed = (quiz.questions ?? []).filter(
          (q) => q.userAnswer !== q.correctAnswer
        );
        setTotalQuestions(quiz.total);
        setMissedQuestions(missed);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load quiz data.");
        setLoading(false);
      });
  }, [quizId]);

  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });
  return (
    <ScreenContainer>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontSize: fs(17) }]}>
            Review Missed Questions
          </Text>
          {!loading && !error && (
            <Text style={[styles.headerSubtitle, { color: colors.muted, fontSize: fs(12) }]}>
              {missedQuestions.length} missed out of {totalQuestions}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <DotsLoader color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted, fontSize: fs(14) }]}>
            Loading missed questions...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <IconSymbol size={40} name="exclamationmark.triangle.fill" color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error, fontSize: fs(15) }]}>{error}</Text>
          <TouchableOpacity accessibilityLabel="Go back" accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.backBtnLarge, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.backBtnLargeText, { fontSize: fs(14) }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : missedQuestions.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🎉</Text>
          <Text style={[styles.perfectTitle, { color: colors.foreground, fontSize: fs(20) }]}>
            Perfect Score!
          </Text>
          <Text style={[styles.perfectSubtitle, { color: colors.muted, fontSize: fs(14) }]}>
            You answered all {totalQuestions} questions correctly.
          </Text>
          <TouchableOpacity accessibilityLabel="Go back" accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.backBtnLarge, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.backBtnLargeText, { fontSize: fs(14) }]}>Back to Results</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {/* Summary banner */}
          <View
            style={[
              styles.summaryBanner,
              { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}30` },
            ]}
          >
            <IconSymbol size={18} name="xmark.circle.fill" color={colors.error} />
            <Text style={[styles.summaryBannerText, { color: colors.error, fontSize: fs(13) }]}>
              {missedQuestions.length} question{missedQuestions.length !== 1 ? "s" : ""} to review
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.summaryBannerScore, { color: colors.muted, fontSize: fs(12) }]}>
              {totalQuestions - missedQuestions.length}/{totalQuestions} correct
            </Text>
          </View>

          {/* Tip card */}
          <View
            style={[
              styles.tipCard,
              { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` },
            ]}
          >
            <Text style={{ fontSize: 16 }}>💡</Text>
            <Text style={[styles.tipText, { color: colors.muted, fontSize: fs(12) }]}>
              Tap "Show Explanation" on each card to understand where you went wrong.
            </Text>
          </View>

          {/* Missed question cards */}
          {missedQuestions.map((q, i) => (
            <MissedQuestionCard
              key={q.id}
              q={q}
              index={i}
              totalMissed={missedQuestions.length}
              colors={colors}
              fs={fs}
            />
          ))}

          {/* Done button */}
          <TouchableOpacity accessibilityLabel="Confirm" accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <IconSymbol size={18} name="checkmark.circle.fill" color="#FFFFFF" />
            <Text style={[styles.doneBtnText, { fontSize: fs(15) }]}>Done Reviewing</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    
      </Animated.View></ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontWeight: "700" },
  headerSubtitle: { marginTop: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: { marginTop: 8 },
  errorText: { fontWeight: "600", textAlign: "center" },
  perfectTitle: { fontWeight: "700", textAlign: "center" },
  perfectSubtitle: { textAlign: "center", lineHeight: 20 },
  backBtnLarge: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backBtnLargeText: { color: "#FFFFFF", fontWeight: "700" },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },
  summaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryBannerText: { fontWeight: "700" },
  summaryBannerScore: {},
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipText: { flex: 1, lineHeight: 18 },
  questionCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  questionNumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  questionNumText: { fontWeight: "700" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: { fontWeight: "700" },
  problemText: { fontWeight: "600", lineHeight: 22 },
  optionsContainer: { gap: 6 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  optionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  optionBadgeText: { fontSize: 12, fontWeight: "700" },
  optionText: { flex: 1, lineHeight: 18 },
  answerSummary: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  answerSummaryText: { fontWeight: "600" },
  explanationToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  explanationToggleText: { fontWeight: "600" },
  explanationBody: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  explanationText: { lineHeight: 20 },
  copyBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  doneBtnText: { color: "#FFFFFF", fontWeight: "700" },
});
