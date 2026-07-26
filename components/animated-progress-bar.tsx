/**
 * AnimatedProgressBar
 *
 * A reusable progress bar that animates its fill width from 0% to the target
 * value on mount (and re-animates when the value changes).
 *
 * Usage:
 *   <AnimatedProgressBar value={75} color={colors.primary} trackColor={`${colors.primary}20`} height={8} />
 */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View, StyleSheet } from "react-native";
import { useAppearance } from "@/lib/appearance-context";

interface AnimatedProgressBarProps {
  /** 0–100 */
  value: number;
  color: string;
  trackColor?: string;
  height?: number;
  borderRadius?: number;
  delay?: number;
  duration?: number;
  style?: object;
}

export function AnimatedProgressBar({
  value,
  color,
  trackColor = "rgba(0,0,0,0.08)",
  height = 8,
  borderRadius,
  delay = 0,
  duration = 600,
  style,
}: AnimatedProgressBarProps) {
  const { settings } = useAppearance();
  const widthAnim = useRef(new Animated.Value(0)).current;
  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = borderRadius ?? height / 2;

  useEffect(() => {
    if (settings.reduceMotion) {
      widthAnim.setValue(clampedValue);
      return;
    }
    widthAnim.setValue(0);
    Animated.timing(widthAnim, {
      toValue: clampedValue,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width % cannot use native driver
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedValue, settings.reduceMotion]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: radius, backgroundColor: trackColor },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius: radius,
            backgroundColor: color,
            width: animatedWidth,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
