import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";

/** A single animated shimmer bar */
export function SkeletonBar({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: object;
}) {
  const colors = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.35, 0.75]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.border,
        },
        animStyle,
        style,
      ]}
    />
  );
}

/** Skeleton that mimics the practice problem card */
export function PracticeSkeletonCard() {
  const colors = useColors();
  return (
    <View style={[skStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* badge row */}
      <View style={skStyles.badgeRow}>
        <SkeletonBar width={64} height={22} borderRadius={10} />
        <SkeletonBar width={80} height={22} borderRadius={10} />
      </View>
      {/* question text lines */}
      <SkeletonBar width="100%" height={18} style={{ marginTop: 14 }} />
      <SkeletonBar width="88%" height={18} style={{ marginTop: 8 }} />
      <SkeletonBar width="72%" height={18} style={{ marginTop: 8 }} />
      {/* action buttons */}
      <View style={skStyles.btnRow}>
        <SkeletonBar width={90} height={40} borderRadius={12} />
        <SkeletonBar width={110} height={40} borderRadius={12} />
        <SkeletonBar width="40%" height={40} borderRadius={12} />
      </View>
    </View>
  );
}

/** Skeleton that mimics a quiz question card */
export function QuizSkeletonCard() {
  const colors = useColors();
  return (
    <View style={[skStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* question */}
      <SkeletonBar width="100%" height={18} />
      <SkeletonBar width="80%" height={18} style={{ marginTop: 8 }} />
      {/* 4 option rows */}
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[skStyles.optionRow, { borderColor: colors.border }]}>
          <SkeletonBar width={28} height={28} borderRadius={14} />
          <SkeletonBar width="75%" height={16} borderRadius={8} />
        </View>
      ))}
    </View>
  );
}

/** Full quiz loading screen: nav bar + 1 skeleton card */
export function QuizLoadingScreen({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={skStyles.quizLoadWrap}>
      {/* shimmer progress bar */}
      <SkeletonBar width="100%" height={4} borderRadius={0} style={{ marginBottom: 20 }} />
      <QuizSkeletonCard />
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: 0,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 0,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
    flexWrap: "wrap",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    paddingVertical: 4,
    borderBottomWidth: 0,
  },
  quizLoadWrap: {
    flex: 1,
    paddingTop: 8,
  },
});
