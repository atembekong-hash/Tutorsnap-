/**
 * PerfectScoreModal
 *
 * Full-screen confetti burst + celebration overlay shown when the user
 * scores 100% on a quiz.
 *
 * Usage:
 *   const [showPerfect, setShowPerfect] = useState(false);
 *   // after quiz finishes with pct === 100:
 *   setShowPerfect(true);
 *   // in JSX:
 *   <PerfectScoreModal visible={showPerfect} onDismiss={() => setShowPerfect(false)} />
 */
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as H from "@/lib/haptics";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_WIDTH, height: SCREEN_H } = Dimensions.get("window");

// ─── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  "#F59E0B", "#6366F1", "#10B981", "#EF4444",
  "#3B82F6", "#EC4899", "#14B8A6", "#F97316",
  "#8B5CF6", "#22D3EE", "#A3E635", "#FB7185",
];
const CONFETTI_SHAPES = ["square", "rect", "circle"] as const;

function ConfettiParticle({ index }: { index: number }) {
  const x = useRef(
    new Animated.Value(Math.random() * SCREEN_WIDTH * 1.2 - SCREEN_WIDTH * 0.1)
  ).current;
  const y = useRef(new Animated.Value(-30 - Math.random() * 60)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.4 + Math.random() * 0.8)).current;

  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 7 + Math.random() * 10;
  const shape = CONFETTI_SHAPES[index % CONFETTI_SHAPES.length];
  const duration = 1600 + Math.random() * 1400;
  const delay = Math.random() * 600;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, {
        toValue: SCREEN_H + 40,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 720 * (Math.random() > 0.5 ? 1 : -1),
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.3 + Math.random() * 0.5,
        duration: duration * 0.6,
        delay,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(delay + duration * 0.65),
        Animated.timing(opacity, {
          toValue: 0,
          duration: duration * 0.35,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotateStr = rotate.interpolate({
    inputRange: [-720, 720],
    outputRange: ["-720deg", "720deg"],
  });

  const particleStyle =
    shape === "circle"
      ? { width: size, height: size, borderRadius: size / 2, backgroundColor: color }
      : shape === "rect"
      ? { width: size * 0.6, height: size * 1.4, borderRadius: 2, backgroundColor: color }
      : { width: size, height: size, borderRadius: 2, backgroundColor: color };

  return (
    <Animated.View
      style={[
        particleStyle,
        {
          position: "absolute",
          top: 0,
          left: 0,
          opacity,
          transform: [
            { translateX: x },
            { translateY: y },
            { rotate: rotateStr },
            { scale },
          ],
        },
      ]}
    />
  );
}

// ─── Animated card ────────────────────────────────────────────────────────────
function AnimatedCard({ onDismiss }: { onDismiss: () => void }) {
  const handleShare = async () => {
    try {
      H.impactLight();
      await Share.share({
        message:
          "I just scored 100% on a TutorSnap quiz! Perfect score! " +
          "Challenge yourself at tutorsnapai.tech",
        title: "Perfect Score on TutorSnap!",
      });
    } catch {
      /* share cancelled or unavailable */
    }
  };
  const colors = useColors();
  const cardScale = useRef(new Animated.Value(0.7)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== "web") {
      H.notificationSuccess();
    }
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: cardOpacity,
          transform: [{ scale: cardScale }],
        },
      ]}
    >
      <Text style={styles.cardEmoji}>🎯</Text>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
        Perfect Score!
      </Text>
      <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
        You got every question right. Outstanding work!
      </Text>
      <View style={styles.btnRow}>
        <TouchableOpacity
          onPress={handleShare}
          activeOpacity={0.85}
          style={[styles.shareBtn, { borderColor: colors.primary }]}
          accessibilityLabel="Share perfect score"
          accessibilityRole="button"
        >
          <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDismiss}
          activeOpacity={0.85}
          style={[styles.dismissBtn, { backgroundColor: colors.primary }]}
          accessibilityLabel="Continue"
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function PerfectScoreModal({ visible, onDismiss }: Props) {
  if (!visible) return null;

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
        accessibilityLabel="Dismiss"
      >
        {/* Confetti layer */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: 60 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </View>

        {/* Card */}
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <AnimatedCard onDismiss={onDismiss} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: SCREEN_WIDTH * 0.82,
    borderRadius: 28,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  cardEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  dismissBtn: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 24,
    minWidth: 160,
    alignItems: "center",
  },
  dismissText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 2,
    minWidth: 100,
    alignItems: "center",
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
