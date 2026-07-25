/**
 * SubjectRing
 *
 * A static SVG circular progress ring for a single subject.
 *
 * ANDROID CRASH HISTORY — two separate crash causes fixed here:
 * 1. Animated.createAnimatedComponent(Circle) — crashes on Android/web. Removed.
 * 2. Animated.Value interpolated into strokeDashoffset on a plain <Circle> —
 *    also crashes on Android. React Native's Animated API can only drive
 *    transform/opacity props via useNativeDriver, and layout props on native
 *    Views via useNativeDriver:false. It CANNOT drive SVG element props like
 *    strokeDashoffset on any platform.
 *
 * Solution: fully static ring. strokeDashoffset is a plain computed number.
 * No Animated import, no useRef, no useEffect. Zero animation risk.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

interface SubjectRingProps {
  label: string;
  emoji: string;
  color: string;
  /** 0–100 percentage toward the next tier (or 100 if gold) */
  pct: number;
  /** Raw solve count */
  solves: number;
  /** Tier label: Bronze / Silver / Gold */
  tier?: string;
  size?: number;
}

const STROKE_WIDTH = 6;

export function SubjectRing({
  label,
  emoji,
  color,
  pct,
  solves,
  tier,
  size = 72,
}: SubjectRingProps) {
  const colors = useColors();
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  // Clamp pct defensively to [0, 100]
  const clampedPct = Math.min(100, Math.max(0, pct));
  // Plain number — no Animated API involved at all
  const strokeDashoffset = circumference * (1 - clampedPct / 100);

  return (
    <View style={[styles.container, { width: size + 16 }]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Track (background ring) */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`${color}22`}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress arc — all props are plain numbers/strings */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        {/* Center content — absolutely positioned over the SVG */}
        <View style={[styles.center, { width: size, height: size }]}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={[styles.pctText, { color }]}>{clampedPct}%</Text>
        </View>
      </View>
      <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.meta, { color: colors.muted }]}>
        {solves} solved{tier ? ` · ${tier}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 8,
  },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 18, marginBottom: 1 },
  pctText: { fontSize: 11, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "600", marginTop: 6, textAlign: "center" },
  meta: { fontSize: 10, marginTop: 1, textAlign: "center" },
});
