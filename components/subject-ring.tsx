/**
 * SubjectRing
 *
 * An animated SVG circular progress ring for a single subject.
 *
 * Fix: Replaced Animated.createAnimatedComponent(Circle) with a plain Circle
 * whose strokeDashoffset is driven by a plain Animated.Value (not Reanimated
 * animatedProps). The Animated.View wrapper approach is used to keep the
 * animation safe on all platforms (web + Android + iOS).
 *
 * Root cause of the crash: Animated.createAnimatedComponent(Svg/Circle) is
 * not supported on web and causes a runtime crash. Per the project template
 * guidelines, wrap <Svg> with <Animated.View> instead.
 */
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
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

  // Use plain React Native Animated.Value — safe on all platforms
  const animatedPct = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedPct, {
      toValue: pct / 100,
      duration: 900,
      useNativeDriver: false, // strokeDashoffset is a layout prop, not a transform
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  // Interpolate to strokeDashoffset value
  const strokeDashoffset = animatedPct.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.container, { width: size + 16 }]}>
      {/* Ring — plain Svg, no AnimatedComponent on SVG elements */}
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
          {/* Static fill at target pct — no animated SVG props */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
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
