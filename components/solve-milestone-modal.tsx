/**
 * SolveMilestoneModal
 *
 * A celebration overlay shown when the user hits a solve milestone
 * (10, 25, 50, 100 problems solved). Displays for ~2.5 seconds with:
 *  - Full-screen confetti burst
 *  - Scale-in card animation (spring pop)
 *  - Pulsing star/trophy icon
 *  - Haptic feedback on entry
 *
 * After auto-dismiss, the caller triggers the native review prompt.
 */
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as H from "@/lib/haptics";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Milestone metadata ───────────────────────────────────────────────────────
const MILESTONE_META: Record<number, { emoji: string; title: string; subtitle: string; color: string }> = {
  10:  { emoji: "🌟", title: "10 Problems Solved!",  subtitle: "You are just getting started. Keep it up!",       color: "#F59E0B" },
  25:  { emoji: "🚀", title: "25 Problems Solved!",  subtitle: "A quarter-century of solutions. Impressive!",      color: "#6366F1" },
  50:  { emoji: "💎", title: "50 Problems Solved!",  subtitle: "Halfway to 100. You are on a roll!",               color: "#10B981" },
  100: { emoji: "🏆", title: "100 Problems Solved!", subtitle: "A century of solutions. You are a TutorSnap legend!", color: "#EF4444" },
};

// ─── Confetti particle ────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  "#F59E0B", "#6366F1", "#10B981", "#EF4444",
  "#3B82F6", "#EC4899", "#14B8A6", "#F97316",
  "#8B5CF6", "#22D3EE", "#A3E635", "#FB7185",
];
const SHAPES = ["square", "rect", "circle"] as const;

function ConfettiParticle({ index }: { index: number }) {
  const x     = useRef(new Animated.Value(Math.random() * SCREEN_W * 1.2 - SCREEN_W * 0.1)).current;
  const y     = useRef(new Animated.Value(-30 - Math.random() * 60)).current;
  const rot   = useRef(new Animated.Value(0)).current;
  const op    = useRef(new Animated.Value(1)).current;
  const sc    = useRef(new Animated.Value(0.4 + Math.random() * 0.8)).current;

  const color    = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size     = 7 + Math.random() * 10;
  const shape    = SHAPES[index % SHAPES.length];
  const duration = 1500 + Math.random() * 1200;
  const delay    = Math.random() * 500;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(y,   { toValue: SCREEN_H + 40, duration, delay, useNativeDriver: true }),
      Animated.timing(rot, { toValue: 720 * (Math.random() > 0.5 ? 1 : -1), duration, delay, useNativeDriver: true }),
      Animated.timing(sc,  { toValue: 0.3 + Math.random() * 0.5, duration: duration * 0.6, delay, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(delay + duration * 0.65),
        Animated.timing(op, { toValue: 0, duration: duration * 0.35, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const spin = rot.interpolate({ inputRange: [0, 720], outputRange: ["0deg", "720deg"] });

  return (
    <Animated.View
      style={{
        position: "absolute",
        width:  shape === "rect" ? size * 2 : size,
        height: shape === "rect" ? size * 0.45 : size,
        borderRadius: shape === "circle" ? size / 2 : 2,
        backgroundColor: color,
        transform: [{ translateX: x }, { translateY: y }, { rotate: spin }, { scale: sc }],
        opacity: op,
      }}
    />
  );
}

// ─── Pulsing icon ─────────────────────────────────────────────────────────────
function PulsingEmoji({ emoji, color }: { emoji: string; color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1.18, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 1,    duration: 420, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1,    duration: 420, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 0,    duration: 420, useNativeDriver: false }),
        ]),
      ])
    ).start();
  }, []);

  const shadowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] });

  return (
    <Animated.View
      style={{
        transform: [{ scale: pulse }],
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 20,
        shadowOpacity,
        elevation: 8,
      }}
    >
      <Text style={styles.emojiText}>{emoji}</Text>
    </Animated.View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  solveCount: number;
  onDismiss: () => void;
}

function AnimatedCard({ solveCount, onDismiss }: CardProps) {
  const colors = useColors();
  const meta   = MILESTONE_META[solveCount] ?? MILESTONE_META[10];

  const cardScale   = useRef(new Animated.Value(0.55)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const shimmer     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 90,
        friction: 7,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    // Shimmer loop on the accent bar
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();

    // Auto-dismiss after 2.8 s so the review prompt can fire
    const timer = setTimeout(onDismiss, 2800);
    return () => clearTimeout(timer);
  }, []);

  const accentOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          transform: [{ scale: cardScale }],
          opacity: cardOpacity,
        },
      ]}
    >
      {/* Accent shimmer bar */}
      <Animated.View
        style={[styles.accentBar, { backgroundColor: meta.color, opacity: accentOpacity }]}
      />

      {/* Pulsing emoji */}
      <View style={styles.emojiRow}>
        <PulsingEmoji emoji={meta.emoji} color={meta.color} />
      </View>

      {/* Copy */}
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{meta.title}</Text>
      <Text style={[styles.cardSubtitle, { color: colors.muted }]}>{meta.subtitle}</Text>

      {/* Solve count badge */}
      <View style={[styles.badge, { backgroundColor: `${meta.color}20`, borderColor: `${meta.color}50` }]}>
        <Text style={[styles.badgeText, { color: meta.color }]}>
          {solveCount} problems solved
        </Text>
      </View>

      {/* Dismiss button */}
      <TouchableOpacity
        onPress={onDismiss}
        activeOpacity={0.8}
        style={[styles.dismissBtn, { backgroundColor: meta.color }]}
        accessibilityLabel="Continue solving"
        accessibilityRole="button"
        accessibilityHint="Closes this celebration and returns to the app"
      >
        <Text style={styles.dismissText}>Keep Solving!</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface Props {
  /** The solve count that triggered this milestone (10, 25, 50, 100). Null = hidden. */
  solveCount: number | null;
  /** Called when the modal dismisses (auto or manual). Caller should then trigger review prompt. */
  onDismiss: () => void;
}

export function SolveMilestoneModal({ solveCount, onDismiss }: Props) {
  useEffect(() => {
    if (solveCount !== null) {
      H.notificationSuccess();
    }
  }, [solveCount]);

  if (solveCount === null) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
        accessibilityLabel="Dismiss celebration"
      >
        {/* Confetti layer */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: 55 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </View>

        {/* Card — stop propagation so tapping card doesn't dismiss */}
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <AnimatedCard solveCount={solveCount} onDismiss={onDismiss} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: Math.min(SCREEN_W - 48, 340),
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 24,
    ...Platform.select({
      native: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 16,
      },
      web: { boxShadow: "0 8px 32px rgba(0,0,0,0.3)" },
    }),
  },
  accentBar: {
    width: "100%",
    height: 5,
    marginBottom: 20,
  },
  emojiRow: {
    marginBottom: 12,
  },
  emojiText: {
    fontSize: 64,
    lineHeight: 76,
    textAlign: "center",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  cardSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  dismissBtn: {
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 14,
    marginHorizontal: 24,
    alignSelf: "stretch",
    alignItems: "center",
  },
  dismissText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
