/**
 * SubjectRing
 *
 * An animated SVG circular progress ring for a single subject.
 * Uses react-native-svg + Reanimated for a smooth stroke-dashoffset animation.
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

// Animated version of SVG Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(pct / 100, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [pct]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={[styles.container, { width: size + 16 }]}>
      {/* Ring */}
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`${color}22`}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Animated fill */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        {/* Center content */}
        <View style={[styles.center, { width: size, height: size }]}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={[styles.pctText, { color }]}>{pct}%</Text>
        </View>
      </View>

      {/* Label */}
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
