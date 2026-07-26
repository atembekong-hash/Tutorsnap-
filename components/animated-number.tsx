/**
 * AnimatedNumber
 *
 * Counts up from 0 (or a custom `from` value) to `value` on mount,
 * and re-animates whenever `value` changes.
 *
 * Uses React Native's built-in Animated API with a JS-side listener
 * to update displayed text. This avoids Reanimated's animatedProps
 * Text limitation while still producing smooth 60fps animations.
 *
 * Automatically skips the animation when reduceMotion is enabled.
 *
 * Usage:
 * ```tsx
 * <AnimatedNumber value={42} style={{ fontSize: 32, fontWeight: "700" }} />
 * <AnimatedNumber value={streak} suffix=" days" duration={600} />
 * <AnimatedNumber value={score} prefix="Score: " decimals={1} />
 * ```
 */
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, StyleProp, TextStyle } from "react-native";
import { useAppearance } from "@/lib/appearance-context";

interface AnimatedNumberProps {
  /** The target number to count up to */
  value: number;
  /** Starting value. Default 0. */
  from?: number;
  /** Animation duration in ms. Default 700. */
  duration?: number;
  /** Number of decimal places to display. Default 0. */
  decimals?: number;
  /** Text to prepend before the number */
  prefix?: string;
  /** Text to append after the number */
  suffix?: string;
  /** Text style */
  style?: StyleProp<TextStyle>;
  /** Delay before animation starts in ms. Default 0. */
  delay?: number;
}

export function AnimatedNumber({
  value,
  from = 0,
  duration = 700,
  decimals = 0,
  prefix = "",
  suffix = "",
  style,
  delay = 0,
}: AnimatedNumberProps) {
  const { settings } = useAppearance();
  const reduceMotion = settings.reduceMotion;

  const [displayValue, setDisplayValue] = useState(
    reduceMotion ? value : from
  );
  const animRef = useRef(new Animated.Value(reduceMotion ? value : from));

  useEffect(() => {
    if (reduceMotion) {
      setDisplayValue(value);
      return;
    }

    // Reset to `from` then animate to `value`
    animRef.current.setValue(from);
    setDisplayValue(from);

    const listener = animRef.current.addListener(({ value: v }) => {
      setDisplayValue(v);
    });

    Animated.timing(animRef.current, {
      toValue: value,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // must be false for JS-side listener
    }).start(() => {
      animRef.current.removeListener(listener);
      setDisplayValue(value);
    });

    return () => {
      animRef.current.removeListener(listener);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion]);

  const formatted = displayValue.toFixed(decimals);

  return (
    <Text style={style}>
      {prefix}{formatted}{suffix}
    </Text>
  );
}
