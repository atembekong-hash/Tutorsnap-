/**
 * components/skeleton.tsx
 *
 * Reusable animated loading primitives for TutorSnap.
 */
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── 1. SkeletonBar (opacity shimmer) ────────────────────────────────────────
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
    opacity: interpolate(progress.value, [0, 1], [0.3, 0.7]),
  }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: colors.border }, animStyle, style]}
    />
  );
}

// ─── 2. ShimmerBox (translateX sweep) ────────────────────────────────────────
export function ShimmerBox({
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
  const translateX = useSharedValue(-SCREEN_W);
  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(SCREEN_W, { duration: 1400, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  return (
    <View style={[{ width, height, borderRadius, backgroundColor: colors.border, overflow: "hidden" }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          shimmerStyle,
          { width: "40%", backgroundColor: "rgba(255,255,255,0.12)" },
        ]}
      />
    </View>
  );
}

// ─── 3. PulseBox (scale + opacity) ───────────────────────────────────────────
export function PulseBox({
  size = 48,
  borderRadius = 24,
  style,
}: {
  size?: number;
  borderRadius?: number;
  style?: object;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.8, { duration: 700 }), withTiming(0.4, { duration: 700 })),
      -1,
      false,
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius, backgroundColor: colors.border }, animStyle, style]}
    />
  );
}

// ─── 4. DotsLoader (three bouncing dots) ─────────────────────────────────────
function Dot({ delay, color }: { delay: number; color: string }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 280, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 200 }),
        ),
        -1,
        false,
      ),
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginHorizontal: 3 }, animStyle]}
    />
  );
}

export function DotsLoader({ color, size: _size = 8 }: { color?: string; size?: number }) {
  const colors = useColors();
  const dotColor = color ?? colors.primary;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 24 }}>
      <Dot delay={0} color={dotColor} />
      <Dot delay={160} color={dotColor} />
      <Dot delay={320} color={dotColor} />
    </View>
  );
}

// ─── 5. SpinnerOverlay ────────────────────────────────────────────────────────
export function SpinnerOverlay({ message = "Loading…", visible = true }: { message?: string; visible?: boolean }) {
  const colors = useColors();
  if (!visible) return null;
  return (
    <View style={[overlayStyles.backdrop, { backgroundColor: `${colors.background}CC` }]}>
      <View style={[overlayStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <DotsLoader />
        <Text style={[overlayStyles.msg, { color: colors.muted }]}>{message}</Text>
      </View>
    </View>
  );
}

// ─── 6. SolvingOverlay ────────────────────────────────────────────────────────
export function SolvingOverlay({ problem }: { problem?: string }) {
  const colors = useColors();
  const opacity = useSharedValue(0);
  useEffect(() => { opacity.value = withTiming(1, { duration: 220 }); }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[overlayStyles.solvingWrap, animStyle]}>
      <View style={[overlayStyles.solvingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🧠</Text>
        <DotsLoader />
        <Text style={[overlayStyles.solvingTitle, { color: colors.foreground }]}>Solving problem…</Text>
        {!!problem && (
          <Text style={[overlayStyles.solvingProblem, { color: colors.muted }]} numberOfLines={3}>
            {problem}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

// ─── 7. HomeSkeletonScreen ────────────────────────────────────────────────────
export function HomeSkeletonScreen() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <View style={{ gap: 6 }}>
          <SkeletonBar width={120} height={14} />
          <SkeletonBar width={180} height={22} />
        </View>
        <PulseBox size={44} borderRadius={22} />
      </View>
      {/* Goal bar */}
      <ShimmerBox width="100%" height={52} borderRadius={14} style={{ marginBottom: 16 }} />
      {/* Widget strip */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        {[90, 100, 80].map((w, i) => (
          <ShimmerBox key={i} width={w} height={80} borderRadius={16} />
        ))}
      </View>
      {/* Input box */}
      <ShimmerBox width="100%" height={56} borderRadius={18} style={{ marginBottom: 14 }} />
      {/* Subject chips */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
        {[70, 90, 60, 80].map((w, i) => (
          <SkeletonBar key={i} width={w} height={34} borderRadius={17} />
        ))}
      </View>
      {/* Recent solves */}
      <SkeletonBar width={140} height={14} style={{ marginBottom: 10 }} />
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
          <PulseBox size={36} borderRadius={10} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBar width="80%" height={14} />
            <SkeletonBar width="50%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── 8. ProgressSkeletonScreen ────────────────────────────────────────────────
export function ProgressSkeletonScreen() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      <ShimmerBox width="100%" height={110} borderRadius={20} style={{ marginBottom: 14 }} />
      <ShimmerBox width="100%" height={90} borderRadius={16} style={{ marginBottom: 14 }} />
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <PulseBox size={40} borderRadius={12} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBar width="60%" height={14} />
            <SkeletonBar width="100%" height={8} borderRadius={4} />
          </View>
          <SkeletonBar width={40} height={20} borderRadius={8} />
        </View>
      ))}
    </View>
  );
}

// ─── 9. PracticeSkeletonCard ──────────────────────────────────────────────────
export function PracticeSkeletonCard() {
  const colors = useColors();
  return (
    <View style={[skStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={skStyles.badgeRow}>
        <SkeletonBar width={64} height={22} borderRadius={10} />
        <SkeletonBar width={80} height={22} borderRadius={10} />
      </View>
      <SkeletonBar width="100%" height={18} style={{ marginTop: 14 }} />
      <SkeletonBar width="88%" height={18} style={{ marginTop: 8 }} />
      <SkeletonBar width="72%" height={18} style={{ marginTop: 8 }} />
      <View style={skStyles.btnRow}>
        <SkeletonBar width={90} height={40} borderRadius={12} />
        <SkeletonBar width={110} height={40} borderRadius={12} />
        <SkeletonBar width="40%" height={40} borderRadius={12} />
      </View>
    </View>
  );
}

// ─── 10. QuizSkeletonCard ─────────────────────────────────────────────────────
export function QuizSkeletonCard() {
  const colors = useColors();
  return (
    <View style={[skStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <SkeletonBar width="100%" height={18} />
      <SkeletonBar width="80%" height={18} style={{ marginTop: 8 }} />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[skStyles.optionRow, { borderColor: colors.border }]}>
          <SkeletonBar width={28} height={28} borderRadius={14} />
          <SkeletonBar width="75%" height={16} borderRadius={8} />
        </View>
      ))}
    </View>
  );
}

// ─── 11. QuizLoadingScreen ────────────────────────────────────────────────────
export function QuizLoadingScreen({ colors: _colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={skStyles.quizLoadWrap}>
      <ShimmerBox width="100%" height={4} borderRadius={0} style={{ marginBottom: 20 }} />
      <QuizSkeletonCard />
    </View>
  );
}

// ─── 12. HistorySkeletonList ──────────────────────────────────────────────────
export function HistorySkeletonList({ rows = 6 }: { rows?: number }) {
  const colors = useColors();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
          <PulseBox size={42} borderRadius={12} />
          <View style={{ flex: 1, gap: 7 }}>
            <SkeletonBar width="85%" height={14} />
            <SkeletonBar width="55%" height={11} />
          </View>
          <SkeletonBar width={48} height={22} borderRadius={10} />
        </View>
      ))}
    </View>
  );
}

// ─── 13. AnalyticsSkeletonScreen ────────────────────────────────────────────
export function AnalyticsSkeletonScreen() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      {/* Header */}
      <SkeletonBar width={200} height={22} style={{ marginBottom: 8 }} />
      <SkeletonBar width={140} height={14} style={{ marginBottom: 20 }} />
      {/* Stat cards */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        {[1, 2].map((i) => (
          <ShimmerBox key={i} width="48%" height={90} borderRadius={16} />
        ))}
      </View>
      {/* Bar chart area */}
      <ShimmerBox width="100%" height={180} borderRadius={16} style={{ marginBottom: 16 }} />
      {/* Row stats */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <PulseBox size={36} borderRadius={10} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBar width="60%" height={13} />
            <SkeletonBar width="100%" height={8} borderRadius={4} />
          </View>
          <SkeletonBar width={44} height={18} borderRadius={8} />
        </View>
      ))}
    </View>
  );
}

// ─── 14. RewardsSkeletonScreen ────────────────────────────────────────────────
export function RewardsSkeletonScreen() {
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      {/* Tier banner */}
      <ShimmerBox width="100%" height={110} borderRadius={20} style={{ marginBottom: 16 }} />
      {/* Progress bar */}
      <ShimmerBox width="100%" height={52} borderRadius={14} style={{ marginBottom: 20 }} />
      {/* Badge grid */}
      <SkeletonBar width={120} height={14} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={{ alignItems: "center", gap: 6 }}>
            <PulseBox size={64} borderRadius={18} />
            <SkeletonBar width={60} height={10} borderRadius={5} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── 15. LeaderboardSkeletonScreen ───────────────────────────────────────────
export function LeaderboardSkeletonScreen() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      {/* Podium */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 12, marginBottom: 24 }}>
        <View style={{ alignItems: "center", gap: 6 }}>
          <PulseBox size={48} borderRadius={24} />
          <ShimmerBox width={70} height={60} borderRadius={12} />
        </View>
        <View style={{ alignItems: "center", gap: 6 }}>
          <PulseBox size={56} borderRadius={28} />
          <ShimmerBox width={80} height={80} borderRadius={12} />
        </View>
        <View style={{ alignItems: "center", gap: 6 }}>
          <PulseBox size={44} borderRadius={22} />
          <ShimmerBox width={70} height={50} borderRadius={12} />
        </View>
      </View>
      {/* List rows */}
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <SkeletonBar width={24} height={16} borderRadius={6} />
          <PulseBox size={36} borderRadius={18} />
          <View style={{ flex: 1, gap: 5 }}>
            <SkeletonBar width="55%" height={13} />
            <SkeletonBar width="35%" height={10} />
          </View>
          <SkeletonBar width={50} height={18} borderRadius={8} />
        </View>
      ))}
    </View>
  );
}

// ─── 16. GlossarySkeletonScreen ──────────────────────────────────────────────
export function GlossarySkeletonScreen() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
      {/* Search bar */}
      <ShimmerBox width="100%" height={44} borderRadius={14} style={{ marginBottom: 16 }} />
      {/* Category chips */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {[80, 90, 70, 85].map((w, i) => (
          <SkeletonBar key={i} width={w} height={32} borderRadius={16} />
        ))}
      </View>
      {/* Term rows */}
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <View key={i} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6 }}>
          <SkeletonBar width="50%" height={15} />
          <SkeletonBar width="85%" height={11} />
        </View>
      ))}
    </View>
  );
}

// ─── 17. SolutionSkeletonScreen ─────────────────────────────────────────────
/**
 * Content-shaped skeleton shown while the AI is solving a problem.
 * Mirrors the real solution layout: header bar, answer card, 3 step cards.
 * Replaces the opaque SolvingOverlay so the transition to real content is smooth.
 */
export function SolutionSkeletonScreen({ problem }: { problem?: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 12,
        }}
      >
        <PulseBox size={32} borderRadius={10} />
        <View style={{ flex: 1, gap: 6 }}>
          {problem ? (
            <>
              <SkeletonBar width="90%" height={14} />
              <SkeletonBar width="65%" height={11} />
            </>
          ) : (
            <>
              <SkeletonBar width={160} height={14} />
              <SkeletonBar width={100} height={11} />
            </>
          )}
        </View>
        <SkeletonBar width={28} height={28} borderRadius={8} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        {/* Answer card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <SkeletonBar width={80} height={12} borderRadius={6} style={{ marginBottom: 10 }} />
          <ShimmerBox width="70%" height={36} borderRadius={10} style={{ marginBottom: 8 }} />
          <SkeletonBar width="50%" height={11} />
        </View>

        {/* Step cards */}
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              marginBottom: 12,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <PulseBox size={28} borderRadius={8} />
              <SkeletonBar width={`${55 + i * 8}%`} height={13} />
            </View>
            <SkeletonBar width="100%" height={11} />
            <SkeletonBar width={`${70 - i * 5}%`} height={11} />
          </View>
        ))}

        {/* Solving label */}
        <View style={{ alignItems: "center", paddingTop: 8, gap: 8 }}>
          <DotsLoader />
          <Text style={{ color: colors.muted, fontSize: 13 }}>Solving problem...</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const skStyles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 16, padding: 20, borderRadius: 20, borderWidth: 1 },
  badgeRow: { flexDirection: "row", gap: 8 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 20, flexWrap: "wrap" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, paddingVertical: 4 },
  quizLoadWrap: { flex: 1, paddingTop: 8 },
});

const overlayStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 100 },
  card: { paddingHorizontal: 32, paddingVertical: 24, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 10, minWidth: 180 },
  msg: { fontSize: 14, marginTop: 4 },
  solvingWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 100, backgroundColor: "rgba(0,0,0,0.45)" },
  solvingCard: { width: SCREEN_W * 0.78, paddingVertical: 32, paddingHorizontal: 24, borderRadius: 24, borderWidth: 1, alignItems: "center", gap: 8 },
  solvingTitle: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  solvingProblem: { fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 4 },
});
