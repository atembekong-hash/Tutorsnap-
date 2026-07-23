/**
 * useScreenTransition
 *
 * Returns an Animated.Value-based style that fades in and slides up
 * the screen content on mount. Works with React Native's built-in
 * Animated API (no Reanimated required) so it is safe on all platforms.
 *
 * Usage:
 *   const { fadeStyle } = useScreenTransition();
 *   return <Animated.View style={[{ flex: 1 }, fadeStyle]}>...</Animated.View>;
 */
import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

interface ScreenTransitionOptions {
  /** Duration of the fade-in in ms. Default 280. */
  duration?: number;
  /** Vertical offset to slide from (positive = slide up). Default 18. */
  translateY?: number;
  /** Delay before animation starts in ms. Default 0. */
  delay?: number;
}

export function useScreenTransition(options: ScreenTransitionOptions = {}) {
  const { duration = 280, translateY: translateYOffset = 18, delay = 0 } = options;

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(translateYOffset)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fadeStyle = {
    opacity,
    transform: [{ translateY }],
  };

  return { fadeStyle, opacity, translateY };
}
