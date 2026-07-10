/**
 * Challenge a Classmate Screen
 *
 * Timed challenge flow: a problem from the Classroom feed is shown with a
 * countdown timer. The student types their answer, submits, and sees whether
 * they matched the correct answer. Results can be shared back to the class feed.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Platform,
  Alert,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getSubjectColor, getSubjectLabel, getSubjectEmoji } from "@/lib/subjects";
import { recordChallengeResult, getClassroomDisplayName } from "@/lib/classroom";
import type { MathSubject } from "@/shared/types";

type Phase = "ready" | "active" | "result";

const CHALLENGE_DURATIONS = [60, 120, 180] as const;
type Duration = (typeof CHALLENGE_DURATIONS)[number];

export default function ChallengeScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    problem: string;
    answer: string;
    subject: string;
    steps: string;
    classCode: string;
  }>();

  const problem = params.problem ?? "";
  const correctAnswer = params.answer ?? "";
  const subject = (params.subject ?? "algebra") as MathSubject;
  const classCode = params.classCode ?? "";

  const [phase, setPhase] = useState<Phase>("ready");
  const [selectedDuration, setSelectedDuration] = useState<Duration>(120);
  const [timeLeft, setTimeLeft] = useState<number>(selectedDuration);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeTaken, setTimeTaken] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const subjectColor = getSubjectColor(subject);
  const subjectLabel = getSubjectLabel(subject);
  const subjectEmoji = getSubjectEmoji(subject);

  // Pulse animation for timer when low
  useEffect(() => {
    if (phase === "active" && timeLeft <= 10) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [phase, timeLeft]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTimeUp = useCallback(() => {
    stopTimer();
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    setTimeTaken(elapsed);
    setIsCorrect(false);
    setPhase("result");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [stopTimer]);

  useEffect(() => {
    if (phase === "active") {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => stopTimer();
  }, [phase, handleTimeUp, stopTimer]);

  const handleStart = () => {
    setTimeLeft(selectedDuration);
    setUserAnswer("");
    setIsCorrect(null);
    setTimeTaken(0);
    setPhase("active");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSubmit = () => {
    stopTimer();
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    setTimeTaken(elapsed);

    // Flexible answer matching: strip whitespace, compare lowercase
    const normalize = (s: string) =>
      s.toLowerCase().replace(/\s+/g, "").replace(/[.,]/g, "");
    const correct =
      normalize(userAnswer) === normalize(correctAnswer) ||
      userAnswer.trim().length > 0 && correctAnswer.toLowerCase().includes(normalize(userAnswer));

    setIsCorrect(correct);
    setPhase("result");

    // Record result in leaderboard if this came from a classroom
    if (classCode) {
      getClassroomDisplayName()
        .then((name) => recordChallengeResult(classCode, name || "Student", correct, elapsed))
        .catch(() => {/* ignore */});
    }

    if (Platform.OS !== "web") {
      if (correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleShareResult = async () => {
    const timedOut = !isCorrect && timeTaken >= selectedDuration;
    const status = isCorrect ? "✅ Solved" : timedOut ? "⏰ Timed out" : "❌ Incorrect";
    const timeStr = isCorrect ? `in ${timeTaken}s` : timedOut ? `(${selectedDuration}s limit)` : `after ${timeTaken}s`;
    try {
      await Share.share({
        message: `TutorSnap Challenge ${status} ${timeStr}!\n\n📚 ${subjectEmoji} ${subjectLabel}\n❓ ${problem}\n\nChallenge your classmates at tutorsnapai.tech`,
        title: "TutorSnap Challenge Result",
      });
    } catch { /* ignore */ }
  };

  const handleRetry = () => {
    setPhase("ready");
    setUserAnswer("");
    setIsCorrect(null);
    setTimeTaken(0);
  };

  const timerPct = (timeLeft as number) / selectedDuration;
  const timerColor =
    timerPct > 0.5 ? colors.success : timerPct > 0.25 ? colors.warning : colors.error;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <IconSymbol size={22} name="chevron.left" color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Challenge</Text>
          {classCode ? (
            <Text style={[styles.headerSub, { color: colors.muted }]}>Class {classCode}</Text>
          ) : null}
        </View>
        <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}20` }]}>
          <Text style={styles.subjectEmoji}>{subjectEmoji}</Text>
          <Text style={[styles.subjectText, { color: subjectColor }]}>{subjectLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Problem card */}
        <View style={[styles.problemCard, { backgroundColor: colors.surface, borderColor: `${subjectColor}40`, borderLeftColor: subjectColor }]}>
          <Text style={[styles.problemLabel, { color: colors.muted }]}>Problem</Text>
          <Text style={[styles.problemText, { color: colors.foreground }]}>{problem}</Text>
        </View>

        {/* READY phase */}
        {phase === "ready" && (
          <View style={styles.readyContainer}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose Time Limit</Text>
            <View style={styles.durationRow}>
              {CHALLENGE_DURATIONS.map((d) => (
                <TouchableOpacity
                  accessibilityLabel="Toggle selected duration"
                  key={d}
                  style={[
                    styles.durationBtn,
                    {
                      backgroundColor: selectedDuration === d ? colors.primary : colors.surface,
                      borderColor: selectedDuration === d ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedDuration(d)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.durationText,
                      { color: selectedDuration === d ? "#FFFFFF" : colors.foreground },
                    ]}
                  >
                    {formatTime(d)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              accessibilityLabel="Start"
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
              onPress={handleStart}
              activeOpacity={0.85}
            >
              <IconSymbol size={20} name="timer" color="#FFFFFF" />
              <Text style={styles.startBtnText}>Start Challenge</Text>
            </TouchableOpacity>

            <Text style={[styles.readyHint, { color: colors.muted }]}>
              Type your answer before the timer runs out. You can use any notation (e.g. "x=5", "5", "x = 5").
            </Text>
          </View>
        )}

        {/* ACTIVE phase */}
        {phase === "active" && (
          <View style={styles.activeContainer}>
            {/* Timer */}
            <Animated.View
              style={[
                styles.timerCircle,
                {
                  borderColor: timerColor,
                  backgroundColor: `${timerColor}12`,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Text style={[styles.timerText, { color: timerColor }]}>{formatTime(timeLeft)}</Text>
              <Text style={[styles.timerLabel, { color: colors.muted }]}>remaining</Text>
            </Animated.View>

            {/* Progress bar */}
            <View style={[styles.timerBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.timerBarFill,
                  { width: `${timerPct * 100}%` as any, backgroundColor: timerColor },
                ]}
              />
            </View>

            {/* Answer input */}
            <Text style={[styles.answerLabel, { color: colors.foreground }]}>Your Answer</Text>
            <TextInput
              style={[
                styles.answerInput,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
              ]}
              placeholder="Type your answer here…"
              placeholderTextColor={colors.muted}
              value={userAnswer}
              onChangeText={setUserAnswer}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <TouchableOpacity
              accessibilityLabel="Submit"
              style={[
                styles.submitBtn,
                {
                  backgroundColor: userAnswer.trim() ? colors.primary : colors.border,
                  opacity: userAnswer.trim() ? 1 : 0.6,
                },
              ]}
              onPress={handleSubmit}
              disabled={!userAnswer.trim()}
              activeOpacity={0.85}
            >
              <IconSymbol size={18} name="checkmark.circle.fill" color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Submit Answer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RESULT phase */}
        {phase === "result" && (
          <View style={styles.resultContainer}>
            <View
              style={[
                styles.resultBadge,
                {
                  backgroundColor: isCorrect ? `${colors.success}18` : `${colors.error}12`,
                  borderColor: isCorrect ? colors.success : colors.error,
                },
              ]}
            >
              <Text style={styles.resultIcon}>{isCorrect ? "🎉" : "⏰"}</Text>
              <Text style={[styles.resultTitle, { color: isCorrect ? colors.success : colors.error }]}>
                {isCorrect ? "Correct!" : (timeLeft as number) === 0 ? "Time's Up!" : "Not Quite"}
              </Text>
              <Text style={[styles.resultSub, { color: colors.muted }]}>
                {isCorrect
                  ? `Solved in ${timeTaken} second${timeTaken !== 1 ? "s" : ""}`
                  : `Time taken: ${timeTaken}s / ${selectedDuration}s`}
              </Text>
            </View>

            {/* Correct answer reveal */}
            {!isCorrect && (
              <View style={[styles.answerReveal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.answerRevealLabel, { color: colors.muted }]}>Correct Answer</Text>
                <Text style={[styles.answerRevealText, { color: colors.foreground }]}>{correctAnswer}</Text>
                {userAnswer.trim() ? (
                  <>
                    <Text style={[styles.answerRevealLabel, { color: colors.muted, marginTop: 8 }]}>Your Answer</Text>
                    <Text style={[styles.answerRevealText, { color: colors.error }]}>{userAnswer}</Text>
                  </>
                ) : null}
              </View>
            )}

            <View style={styles.resultActions}>
              <TouchableOpacity
                accessibilityLabel="Retry"
                style={[styles.resultBtn, { backgroundColor: colors.primary }]}
                onPress={handleRetry}
                activeOpacity={0.85}
              >
                <IconSymbol size={16} name="arrow.counterclockwise" color="#FFFFFF" />
                <Text style={styles.resultBtnText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Share"
                style={[styles.resultBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5 }]}
                onPress={handleShareResult}
                activeOpacity={0.85}
              >
                <IconSymbol size={16} name="paperplane.fill" color={colors.primary} />
                <Text style={[styles.resultBtnText, { color: colors.primary }]}>Share Result</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.viewSolutionBtn, { borderColor: colors.border }]}
              onPress={() =>
                router.push({
                  pathname: "/solution",
                  params: {
                    data: JSON.stringify({
                      problem,
                      subject,
                      answer: correctAnswer,
                      steps: [],
                    }),
                  },
                } as any)
              }
              activeOpacity={0.75}
            >
              <IconSymbol size={15} name="list.bullet" color={colors.primary} />
              <Text style={[styles.viewSolutionText, { color: colors.primary }]}>View Full Solution</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSub: { fontSize: 11, marginTop: 1 },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  subjectEmoji: { fontSize: 14 },
  subjectText: { fontSize: 12, fontWeight: "700" },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  problemCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderLeftWidth: 4,
    padding: 16,
    gap: 6,
  },
  problemLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  problemText: { fontSize: 16, fontWeight: "600", lineHeight: 24 },
  readyContainer: { gap: 14 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  durationRow: { flexDirection: "row", gap: 10 },
  durationBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  durationText: { fontSize: 16, fontWeight: "700" },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  startBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  readyHint: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  activeContainer: { gap: 16, alignItems: "center" },
  timerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  timerText: { fontSize: 30, fontWeight: "900" },
  timerLabel: { fontSize: 11, fontWeight: "600" },
  timerBar: { width: "100%", height: 6, borderRadius: 3, overflow: "hidden" },
  timerBarFill: { height: 6, borderRadius: 3 },
  answerLabel: { fontSize: 14, fontWeight: "700", alignSelf: "flex-start" },
  answerInput: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: "100%",
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  resultContainer: { gap: 16, alignItems: "center" },
  resultBadge: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  resultIcon: { fontSize: 40, marginBottom: 4 },
  resultTitle: { fontSize: 22, fontWeight: "800" },
  resultSub: { fontSize: 13 },
  answerReveal: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  answerRevealLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  answerRevealText: { fontSize: 16, fontWeight: "700" },
  resultActions: { flexDirection: "row", gap: 10, width: "100%" },
  resultBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  resultBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  viewSolutionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  viewSolutionText: { fontSize: 14, fontWeight: "600" },
});
