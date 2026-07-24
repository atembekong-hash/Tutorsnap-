/**
 * SubjectRing
 *
 * An animated circular progress ring for a single subject.
 *
 * IMPORTANT: We intentionally do NOT use Animated.createAnimatedComponent(Circle)
 * from react-native-svg because that pattern causes native crashes with Reanimated 4.
 * Instead we animate a plain React Native Animated value and compute strokeDashoffset
 * in JS state, updating via useEffect. This is safe on all platforms.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated as RNAnimated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

interface SubjectRingProps {
  label: string;
  emoji: string;
  color: string;
  /** 0-100 percentage toward the next tier (or 100 if gold) */
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

  // Use a plain RN Animated.Value to drive the dashoffset in JS
  const animValue = useRef(new RNAnimated.Value(0)).current;
  const [dashOffset, setDashOffset] = useState(circumference);

  useEffect(() => {
    // Listen to the animated value and update state so SVG re-renders
    const listener = animValue.addListener(({ value }) => {
      setDashOffset(circumference * (1 - value));
    });

    // Animate from 0 to pct/100
    RNAnimated.timing(animValue, {
      toValue: Math.min(1, Math.max(0, pct / 100)),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // must be false for JS-driven SVG updates
    }).start();

    return () => {
      animValue.removeListener(listener);
    };
  }, [pct, circumference]);

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
          {/* Animated fill - driven by JS state, no createAnimatedComponent */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
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
