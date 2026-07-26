/**
 * useTabFocusTransition
 *
 * Fires a brief fade + slide-up animation every time the screen gains tab focus.
 * Uses react-native-reanimated for native-thread performance.
 *
 * Usage:
 *   const { transitionStyle } = useTabFocusTransition();
 *   return (
 *     <ReAnimated.View style={[{ flex: 1 }, transitionStyle]}>
 *       ...screen content...
 *     </ReAnimated.View>
 *   );
 */
import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface TabFocusTransitionOptions {
  duration?: number;
  offsetY?: number;
  reduceMotion?: boolean;
}

export function useTabFocusTransition(options: TabFocusTransitionOptions = {}) {
  const { duration = 220, offsetY = 10, reduceMotion = false } = options;

  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  const transitionStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        opacity.value = 1;
        translateY.value = 0;
        return;
      }
      opacity.value = 0;
      translateY.value = offsetY;
      opacity.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reduceMotion, duration, offsetY])
  );

  return { transitionStyle };
}
