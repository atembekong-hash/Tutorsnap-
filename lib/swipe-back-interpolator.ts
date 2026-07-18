/**
 * Custom card style interpolator for iOS-style swipe-back gesture with visual feedback.
 * Shows fading shadow and opacity changes as user swipes to dismiss.
 */

import { Animated } from "react-native";
import type { CardStyleInterpolatorProps } from "@react-navigation/stack";

export function swipeBackInterpolator({
  current,
  next,
  inverted,
  layouts,
  insets,
}: CardStyleInterpolatorProps) {
  const progress = Animated.add(current.progress, next ? next.progress : 0);

  // Invert progress for swipe-back (0 = fully swiped, 1 = not swiped)
  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  // Shadow intensity increases as user swipes back
  const shadowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0],
  });

  // Slight scale down as user swipes
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  return {
    cardStyle: {
      opacity,
      transform: [{ scale }],
      shadowColor: "#000",
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: shadowOpacity,
      shadowRadius: 8,
      elevation: 5,
    },
  };
}
