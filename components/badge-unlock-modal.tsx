/**
 * BadgeUnlockModal
 *
 * Shown the first time a user earns a new mastery badge tier.
 * Uses Reanimated for a scale-in pop + confetti particle burst.
 */
import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as H from "@/lib/haptics";
import { useColors } from "@/hooks/use-colors";
import { BADGE_COLORS, BADGE_EMOJI, type BadgeTier } from "@/lib/mastery-badges";

interface BadgeUnlockModalProps {
  visible: boolean;
  tier: BadgeTier;
  subjectLabel: string;
  onClose: () => void;
}

// Simple confetti particle
function Particle({ color, delay, startX }: { color: string; delay: number; startX: number }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const dx = (Math.random() - 0.5) * 160;
    translateX.value = withDelay(delay, withTiming(dx, { duration: 900, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(delay, withTiming(220, { duration: 900, easing: Easing.in(Easing.quad) }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(500, withTiming(0, { duration: 300 }))
    ));
    rotate.value = withDelay(delay, withTiming((Math.random() - 0.5) * 720, { duration: 900 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value + startX },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
    position: "absolute",
    top: 0,
    left: 0,
  }));

  return (
    <Animated.View style={style}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
    </Animated.View>
  );
}

const CONFETTI_COLORS = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"];

export function BadgeUnlockModal({ visible, tier, subjectLabel, onClose }: BadgeUnlockModalProps) {
  const colors = useColors();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const badgeScale = useSharedValue(0);

  const triggerHaptic = () => {
    H.notificationSuccess();
  };

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
      badgeScale.value = withDelay(150, withSpring(1, { damping: 10, stiffness: 180 }));
      runOnJS(triggerHaptic)();
    } else {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
      badgeScale.value = 0;
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const badgeColor = BADGE_COLORS[tier];
  const badgeEmoji = BADGE_EMOJI[tier];
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  // Generate confetti particles
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: i * 30,
    startX: (i - 9) * 8,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Animated.View style={[styles.card, { backgroundColor: colors.surface }, cardStyle]}>
          {/* Confetti burst */}
          <View style={styles.confettiContainer} pointerEvents="none">
            {particles.map((p) => (
              <Particle key={p.id} color={p.color} delay={p.delay} startX={p.startX} />
            ))}
          </View>

          {/* Badge icon */}
          <Animated.View style={[styles.badgeCircle, { backgroundColor: `${badgeColor}20`, borderColor: badgeColor }, badgeStyle]}>
            <Text style={styles.badgeEmoji}>{badgeEmoji}</Text>
          </Animated.View>

          {/* Text */}
          <Text style={[styles.unlockLabel, { color: colors.muted }]}>Badge Unlocked!</Text>
          <Text style={[styles.tierText, { color: badgeColor }]}>{tierLabel} {subjectLabel}</Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            {tier === "bronze"
              ? "You've solved 10 problems in this subject. Keep going!"
              : tier === "silver"
              ? "25 problems solved! You're building real mastery."
              : "50 problems solved! You're a gold-level expert!"}
          </Text>

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: badgeColor }]}
            activeOpacity={0.85}
          >
            <Text style={styles.closeBtnText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    elevation: 10,
    ...Platform.select({
      native: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      web: { boxShadow: "0 8px 20px rgba(0,0,0,0.2)" },
    }),
    overflow: "hidden",
  },
  confettiContainer: {
    position: "absolute",
    top: 60,
    left: "50%",
    width: 0,
    height: 0,
  },
  badgeCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  badgeEmoji: { fontSize: 44 },
  unlockLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  tierText: { fontSize: 22, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  description: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  closeBtn: { paddingHorizontal: 36, paddingVertical: 13, borderRadius: 24 },
  closeBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
