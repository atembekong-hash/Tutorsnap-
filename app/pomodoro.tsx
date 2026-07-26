/**
 * TutorSnap — Pomodoro Timer
 *
 * A focused study timer screen launched from the Study Planner.
 * Supports custom duration, pause/resume, and session completion tracking.
 *
 * Phase 10: Timer ring replaced with a proper animated SVG arc.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Animated,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import ReAnimated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as H from "@/lib/haptics";
import { useKeepAwake } from "expo-keep-awake";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import { getSubjectDef } from "@/lib/subjects";
import type { SubjectId } from "@/lib/subjects";

type Phase = "focus" | "break" | "done";

const BREAK_DURATION = 5 * 60; // 5-minute break after each session

// SVG ring dimensions
const RING_SIZE = 220;
const RING_RADIUS = 96;
const RING_STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Animated Circle component (Reanimated animatedProps)
const AnimatedCircle = ReAnimated.createAnimatedComponent(Circle);

/** Animated SVG arc ring that smoothly tracks progress */
function TimerRing({
  progress,
  color,
  children,
}: {
  progress: number; // 0..1
  color: string;
  children: React.ReactNode;
}) {
  const animatedProgress = useSharedValue(progress);

  // Animate whenever progress changes
  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  return (
    <View style={styles.timerWrap}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        {/* Background track */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={`${color}20`}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={color}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      {/* Inner content */}
      <View style={styles.timerInner}>{children}</View>
    </View>
  );
}

export default function PomodoroScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    duration?: string;
    subject?: string;
    label?: string;
  }>();

  const totalSeconds = Math.max(parseInt(params.duration ?? "25") * 60, 60);
  const subjectId = (params.subject ?? "algebra") as SubjectId;
  const sessionLabel = params.label ?? "Study Session";

  const subjectDef = getSubjectDef(subjectId);
  const subjectColor = subjectDef?.color ?? colors.primary;

  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep screen awake while timer is running
  useKeepAwake();

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handlePhaseComplete = useCallback(() => {
    clearTimer();
    H.notificationSuccess();
    if (phase === "focus") {
      const newCount = sessionsCompleted + 1;
      setSessionsCompleted(newCount);
      setPhase("break");
      setSecondsLeft(BREAK_DURATION);
      setRunning(true); // auto-start break
    } else if (phase === "break") {
      setPhase("done");
      setRunning(false);
    }
  }, [phase, sessionsCompleted, clearTimer]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          handlePhaseComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [running, handlePhaseComplete, clearTimer]);

  const handleStartPause = () => {
    H.impactMedium();
    setRunning((v) => !v);
  };

  const handleReset = () => {
    clearTimer();
    setRunning(false);
    setPhase("focus");
    setSecondsLeft(totalSeconds);
  };

  const handleSkipBreak = () => {
    clearTimer();
    setPhase("done");
    setRunning(false);
    setSecondsLeft(0);
  };

  const handleExit = () => {
    if (running) {
      Alert.alert(
        "Exit Timer?",
        "The timer is still running. Are you sure you want to leave?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Exit",
            style: "destructive",
            onPress: () => {
              clearTimer();
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  };

  // Format seconds as MM:SS
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Progress arc percentage
  const totalForPhase = phase === "focus" ? totalSeconds : BREAK_DURATION;
  const progress = phase === "done" ? 1 : 1 - secondsLeft / totalForPhase;
  const progressPct = Math.round(progress * 100);

  const phaseColor = phase === "focus" ? subjectColor : colors.success;
  const phaseLabel = phase === "focus" ? "Focus Time" : phase === "break" ? "Break Time" : "Session Complete!";
  const phaseEmoji = phase === "focus" ? (subjectDef?.emoji ?? "📚") : phase === "break" ? "☕" : "🎉";

  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });
  return (
    <ScreenContainer>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleExit} style={styles.backBtn}>
          <IconSymbol size={24} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{sessionLabel}</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {subjectDef?.label ?? subjectId}
          </Text>
        </View>
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}
          accessibilityLabel="Reset">
          <IconSymbol size={20} name="arrow.counterclockwise" color={colors.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Phase label */}
        <View style={[styles.phaseBadge, { backgroundColor: `${phaseColor}18`, borderColor: `${phaseColor}35` }]}>
          <Text style={styles.phaseEmoji}>{phaseEmoji}</Text>
          <Text style={[styles.phaseLabel, { color: phaseColor }]}>{phaseLabel}</Text>
        </View>

        {/* Timer ring — animated SVG arc */}
        <TimerRing progress={progress} color={phaseColor}>
          <Text style={[styles.timerText, { color: colors.foreground }]}>{timeStr}</Text>
          <Text style={[styles.timerSub, { color: colors.muted }]}>
            {phase === "done" ? "Well done!" : running ? "in progress" : "paused"}
          </Text>
        </TimerRing>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: `${phaseColor}20` }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: phaseColor, width: `${progressPct}%` },
            ]}
          />
        </View>
        <Text style={[styles.progressPct, { color: colors.muted }]}>{progressPct}% complete</Text>

        {/* Sessions completed */}
        {sessionsCompleted > 0 && (
          <View style={[styles.sessionsRow, { backgroundColor: `${colors.success}12` }]}>
            <Text style={styles.sessionsEmoji}>✅</Text>
            <Text style={[styles.sessionsText, { color: colors.success }]}>
              {sessionsCompleted} session{sessionsCompleted !== 1 ? "s" : ""} completed today
            </Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {phase === "done" ? (
            <View style={styles.doneControls}>
              <TouchableOpacity
                accessibilityLabel="Reset"
                onPress={handleReset}
                style={[styles.doneBtn, { backgroundColor: `${subjectColor}18`, borderColor: `${subjectColor}35` }]}
                activeOpacity={0.8}
              >
                <IconSymbol size={20} name="arrow.counterclockwise" color={subjectColor} />
                <Text style={[styles.doneBtnText, { color: subjectColor }]}>New Session</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.doneBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <IconSymbol size={20} name="checkmark.circle.fill" color="#FFF" />
                <Text style={[styles.doneBtnText, { color: "#FFF" }]}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mainControls}>
              {phase === "break" && (
                <TouchableOpacity
                  accessibilityLabel="Skip"
                  onPress={handleSkipBreak}
                  style={[styles.skipBtn, { borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.skipText, { color: colors.muted }]}>Skip Break</Text>
                  <IconSymbol size={16} name="forward.end.fill" color={colors.muted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                accessibilityLabel="Start"
                onPress={handleStartPause}
                style={[styles.playBtn, { backgroundColor: phaseColor }]}
                activeOpacity={0.85}
              >
                <IconSymbol
                  size={36}
                  name={running ? "pause.fill" : "play.fill"}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tips */}
        {phase === "focus" && !running && secondsLeft === totalSeconds && (
          <Text style={[styles.tip, { color: colors.muted }]}>
            💡 Tip: Put your phone face-down and eliminate distractions before starting.
          </Text>
        )}
        {phase === "break" && (
          <Text style={[styles.tip, { color: colors.muted }]}>
            ☕ Take a real break — stand up, stretch, or grab water. No screens!
          </Text>
        )}
      </View>
    
      </Animated.View></ScreenContainer>
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
  resetBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 20,
  },
  phaseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  phaseEmoji: { fontSize: 18 },
  phaseLabel: { fontSize: 16, fontWeight: "700" },
  timerWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  timerInner: { alignItems: "center", gap: 4 },
  timerText: { fontSize: 52, fontWeight: "800", letterSpacing: -2 },
  timerSub: { fontSize: 13 },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressPct: { fontSize: 12, marginTop: -8 },
  sessionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  sessionsEmoji: { fontSize: 16 },
  sessionsText: { fontSize: 14, fontWeight: "600" },
  controls: { width: "100%", alignItems: "center" },
  mainControls: { alignItems: "center", gap: 16 },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  skipText: { fontSize: 14 },
  doneControls: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  doneBtnText: { fontSize: 15, fontWeight: "700" },
  tip: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
  },
});
