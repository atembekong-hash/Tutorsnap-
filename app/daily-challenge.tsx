/**
 * app/daily-challenge.tsx
 *
 * Daily Challenge screen:
 *  - Shows today's curated problem with 4 answer options
 *  - Awards 50 bonus XP on first correct answer
 *  - "Come back tomorrow" state with countdown timer to midnight
 *  - Resets automatically at midnight
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
} from "react-native";
import * as H from "@/lib/haptics";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getTodayQuestion,
  getDailyChallengeState,
  saveDailyChallengeState,
  msUntilMidnight,
  type DailyChallengeState,
} from "@/lib/daily-challenge";
import { recordSolve } from "@/lib/progress";
import { loadGlobalGrade } from "@/lib/grade-levels";
import { cleanMathText } from "@/lib/clean-math-text";
import { useScreenTransition } from "@/hooks/use-screen-transition";

type OptionKey = "A" | "B" | "C" | "D";

/** Format milliseconds as HH:MM:SS */
function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DailyChallengeScreen() {
  const colors = useColors();
  const { fadeStyle: animatedStyle } = useScreenTransition();
  const router = useRouter();
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const question = getTodayQuestion(gradeLevel);

  const [state, setState] = useState<DailyChallengeState | null>(null);
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [countdown, setCountdown] = useState(msUntilMidnight());

  // Load grade level
  useEffect(() => {
    loadGlobalGrade().then(setGradeLevel);
  }, []);

  // Load persisted state
  useEffect(() => {
    getDailyChallengeState().then((s) => {
      setState(s);
      if (s.completed && s.selectedOption) {
        setSelectedOption(s.selectedOption as OptionKey);
        setRevealed(true);
      }
    });
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(msUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = useCallback(async (option: OptionKey) => {
    if (revealed || !state) return;
    H.impactLight()

    const isCorrect = option === question.correctAnswer;
    setSelectedOption(option);
    setRevealed(true);

    if (Platform.OS !== "web") {
      if (isCorrect) {
        H.notificationSuccess();
      } else {
        H.notificationError();
      }
    }

    const newState: DailyChallengeState = {
      ...state,
      completed: true,
      correct: isCorrect,
      selectedOption: option,
      bonusXpAwarded: isCorrect && !state.bonusXpAwarded,
    };
    setState(newState);
    await saveDailyChallengeState(newState);

    // Award bonus XP by recording a solve for the challenge subject
    if (isCorrect && !state.bonusXpAwarded) {
      try {
        await recordSolve(question.subject as any);
      } catch { /* non-critical */ }
    }
  }, [revealed, state, question]);

  const subjectColors: Record<string, string> = {
    algebra: "#6366F1",
    geometry: "#10B981",
    calculus: "#F59E0B",
    statistics: "#3B82F6",
    physics: "#EF4444",
    chemistry: "#8B5CF6",
  };
  const subjectColor = subjectColors[question.subject] ?? colors.primary;

  const difficultyLabel = question.difficulty === "hard" ? "🔥 Hard" : "⚡ Medium";

  if (!state) return null;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Nav bar */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back" accessibilityHint="Returns to the previous screen"
          accessibilityRole="button"
        >
          <IconSymbol size={22} name="chevron.left.forwardslash.chevron.right" color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Daily Challenge</Text>
        <View style={[styles.difficultyBadge, { backgroundColor: `${subjectColor}18` }]}>
          <Text style={[styles.difficultyText, { color: subjectColor }]}>{difficultyLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Subject + bonus XP header */}
        <View style={styles.headerRow}>
          <View style={[styles.subjectPill, { backgroundColor: `${subjectColor}15` }]}>
            <Text style={[styles.subjectText, { color: subjectColor }]}>{question.subjectLabel}</Text>
          </View>
          <View style={[styles.xpPill, { backgroundColor: `${colors.warning}18` }]}>
            <Text style={[styles.xpText, { color: colors.warning }]}>+{question.bonusXp} Bonus XP</Text>
          </View>
        </View>

        {/* Problem card */}
        <View style={[styles.problemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.problemLabel, { color: colors.muted }]}>Today's Problem</Text>
          <Text style={[styles.problemText, { color: colors.foreground }]}>{cleanMathText(question.problem)}</Text>
        </View>

        {/* Answer options */}
        {(["A", "B", "C", "D"] as OptionKey[]).map((key) => {
          const isSelected = selectedOption === key;
          const isCorrect = key === question.correctAnswer;
          let bgColor = colors.surface;
          let borderColor = colors.border;
          let textColor = colors.foreground;

          if (revealed) {
            if (isCorrect) {
              bgColor = `${colors.success}18`;
              borderColor = colors.success;
              textColor = colors.success;
            } else if (isSelected && !isCorrect) {
              bgColor = `${colors.error}18`;
              borderColor = colors.error;
              textColor = colors.error;
            }
          } else if (isSelected) {
            bgColor = `${subjectColor}18`;
            borderColor = subjectColor;
            textColor = subjectColor;
          }

          return (
            <TouchableOpacity
              key={key}
              onPress={() => handleSelect(key)}
              disabled={revealed}
              activeOpacity={0.75}
              style={[styles.optionBtn, { backgroundColor: bgColor, borderColor }]}
              accessibilityLabel={`Option ${key}: ${question.options[key]}`}
              accessibilityRole="button"
            >
              <View style={[styles.optionKeyBadge, { backgroundColor: `${borderColor}25` }]}>
                <Text style={[styles.optionKey, { color: borderColor }]}>{key}</Text>
              </View>
              <Text style={[styles.optionText, { color: textColor, flex: 1 }]}>{cleanMathText(question.options[key])}</Text>
              {revealed && isCorrect && (
                <IconSymbol size={18} name="checkmark.circle.fill" color={colors.success} />
              )}
              {revealed && isSelected && !isCorrect && (
                <IconSymbol size={18} name="xmark.circle.fill" color={colors.error} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Result / explanation */}
        {revealed && (
          <View style={[
            styles.resultCard,
            { backgroundColor: state.correct ? `${colors.success}12` : `${colors.error}12`, borderColor: state.correct ? `${colors.success}40` : `${colors.error}40` }
          ]}>
            <Text style={[styles.resultHeadline, { color: state.correct ? colors.success : colors.error }]}>
              {state.correct ? `🎉 Correct! +${question.bonusXp} Bonus XP` : "❌ Not quite — here's why:"}
            </Text>
            <Text style={[styles.resultExplanation, { color: colors.foreground }]}>
              {cleanMathText(question.explanation)}
            </Text>
          </View>
        )}

        {/* Come back tomorrow countdown */}
        {revealed && (
          <View style={[styles.countdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.countdownLabel, { color: colors.muted }]}>Next challenge in</Text>
            <Text style={[styles.countdownTimer, { color: colors.primary }]}>{formatCountdown(countdown)}</Text>
            <Text style={[styles.countdownSub, { color: colors.muted }]}>Come back tomorrow for a new problem!</Text>
          </View>
        )}

        {/* Back to home */}
        {revealed && (
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            style={[styles.homeBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Back to home"
            accessibilityRole="button"
          >
            <IconSymbol size={18} name="house.fill" color="#FFFFFF" />
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 36, alignItems: "flex-start" },
  navTitle: { fontSize: 17, fontWeight: "700" },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  difficultyText: { fontSize: 12, fontWeight: "700" },
  content: { padding: 20, paddingBottom: 48, gap: 14 },
  headerRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  subjectPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  subjectText: { fontSize: 13, fontWeight: "700" },
  xpPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  xpText: { fontSize: 13, fontWeight: "700" },
  problemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  problemLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  problemText: { fontSize: 18, fontWeight: "700", lineHeight: 26 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  optionKeyBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  optionKey: { fontSize: 13, fontWeight: "800" },
  optionText: { fontSize: 15, lineHeight: 21 },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  resultHeadline: { fontSize: 15, fontWeight: "800", lineHeight: 21 },
  resultExplanation: { fontSize: 14, lineHeight: 21 },
  countdownCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  countdownLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  countdownTimer: { fontSize: 36, fontWeight: "800", letterSpacing: 2, fontVariant: ["tabular-nums"] },
  countdownSub: { fontSize: 13, textAlign: "center" },
  homeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
  },
  homeBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
