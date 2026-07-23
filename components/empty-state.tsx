import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Easing } from "react-native";
import Svg, { Circle, Path, Rect, Line } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

// ─── SVG Illustrations ───────────────────────────────────────────────────────

function OpenBookIllustration({ color, muted }: { color: string; muted: string }) {
  return (
    <Svg width={96} height={80} viewBox="0 0 96 80">
      <Rect x={44} y={12} width={8} height={56} rx={2} fill={muted} opacity={0.4} />
      <Path d="M44 16 C30 14 14 18 10 22 L10 64 C14 60 30 56 44 58 Z" fill={color} opacity={0.15} />
      <Path d="M44 16 C30 14 14 18 10 22 L10 64 C14 60 30 56 44 58 Z" stroke={color} strokeWidth={1.5} fill="none" opacity={0.5} />
      <Line x1={18} y1={30} x2={38} y2={28} stroke={muted} strokeWidth={1.5} opacity={0.5} />
      <Line x1={18} y1={37} x2={38} y2={35} stroke={muted} strokeWidth={1.5} opacity={0.5} />
      <Line x1={18} y1={44} x2={38} y2={42} stroke={muted} strokeWidth={1.5} opacity={0.5} />
      <Line x1={18} y1={51} x2={32} y2={49} stroke={muted} strokeWidth={1.5} opacity={0.5} />
      <Path d="M52 16 C66 14 82 18 86 22 L86 64 C82 60 66 56 52 58 Z" fill={color} opacity={0.15} />
      <Path d="M52 16 C66 14 82 18 86 22 L86 64 C82 60 66 56 52 58 Z" stroke={color} strokeWidth={1.5} fill="none" opacity={0.5} />
      <Line x1={58} y1={28} x2={78} y2={30} stroke={muted} strokeWidth={1.5} opacity={0.5} />
      <Line x1={58} y1={35} x2={78} y2={37} stroke={muted} strokeWidth={1.5} opacity={0.5} />
      <Line x1={58} y1={42} x2={78} y2={44} stroke={muted} strokeWidth={1.5} opacity={0.5} />
      <Line x1={58} y1={49} x2={72} y2={51} stroke={muted} strokeWidth={1.5} opacity={0.5} />
      <Path d="M70 10 L70 26 L76 22 L82 26 L82 10 Z" fill={color} opacity={0.7} />
    </Svg>
  );
}

function MagnifyingGlassIllustration({ color, muted }: { color: string; muted: string }) {
  return (
    <Svg width={96} height={96} viewBox="0 0 96 96">
      <Circle cx={40} cy={40} r={26} stroke={color} strokeWidth={4} fill={color} fillOpacity={0.1} />
      <Line x1={30} y1={30} x2={50} y2={50} stroke={muted} strokeWidth={1.5} opacity={0.4} />
      <Line x1={50} y1={30} x2={30} y2={50} stroke={muted} strokeWidth={1.5} opacity={0.4} />
      <Line x1={60} y1={60} x2={80} y2={80} stroke={color} strokeWidth={5} strokeLinecap="round" opacity={0.7} />
      <Path d="M36 34 C36 30 44 28 44 34 C44 38 40 38 40 42" stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.8} />
      <Circle cx={40} cy={47} r={1.5} fill={color} opacity={0.8} />
    </Svg>
  );
}

function TrophyIllustration({ color, muted }: { color: string; muted: string }) {
  return (
    <Svg width={96} height={96} viewBox="0 0 96 96">
      <Path d="M28 16 L68 16 L64 48 C64 58 56 64 48 64 C40 64 32 58 32 48 Z" fill={color} fillOpacity={0.15} stroke={color} strokeWidth={2} opacity={0.7} />
      <Path d="M28 20 C18 20 16 32 24 36 L32 38" stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.6} />
      <Path d="M68 20 C78 20 80 32 72 36 L64 38" stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.6} />
      <Rect x={44} y={64} width={8} height={12} fill={muted} opacity={0.5} />
      <Rect x={32} y={76} width={32} height={6} rx={3} fill={color} opacity={0.5} />
      <Path d="M48 28 L50 34 L56 34 L51 38 L53 44 L48 40 L43 44 L45 38 L40 34 L46 34 Z" fill={color} opacity={0.8} />
    </Svg>
  );
}

// ─── EmptyState Component ─────────────────────────────────────────────────────

type EmptyStateVariant = "bookmarks" | "history" | "quiz-history";

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onAction?: () => void;
}

const CONFIGS: Record<EmptyStateVariant, {
  title: string;
  subtitle: string;
  actionLabel: string;
}> = {
  bookmarks: {
    title: "No bookmarks yet",
    subtitle: "Save solutions you want to revisit by tapping the bookmark icon on any solution.",
    actionLabel: "Solve a problem",
  },
  history: {
    title: "No solve history",
    subtitle: "Your solved problems will appear here. Start solving to build your history.",
    actionLabel: "Go to Solve",
  },
  "quiz-history": {
    title: "No quizzes taken yet",
    subtitle: "Complete a quiz to see your results and track your progress over time.",
    actionLabel: "Take a quiz",
  },
};

export function EmptyState({ variant, onAction }: EmptyStateProps) {
  const colors = useColors();
  const config = CONFIGS[variant];

  // Scale-in + fade-in entrance animation
  const scale = useRef(new Animated.Value(0.82)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 350,
        delay: 80,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Illustration = () => {
    if (variant === "bookmarks") return <OpenBookIllustration color={colors.primary} muted={colors.muted} />;
    if (variant === "history") return <MagnifyingGlassIllustration color={colors.primary} muted={colors.muted} />;
    return <TrophyIllustration color={colors.primary} muted={colors.muted} />;
  };

  return (
    <Animated.View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        paddingVertical: 48,
        opacity,
        transform: [{ scale }],
      }}
    >
      <View style={{ marginBottom: 24, opacity: 0.9 }}>
        <Illustration />
      </View>
      <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground, textAlign: "center", marginBottom: 10 }}>
        {config.title}
      </Text>
      <Text style={{ fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22, marginBottom: 28 }}>
        {config.subtitle}
      </Text>
      {onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 28,
            paddingVertical: 13,
            borderRadius: 24,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            {config.actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}
