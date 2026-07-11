/**
 * app/premium-welcome.tsx
 *
 * Post-purchase celebration screen.
 * Shown after a successful RevenueCat purchase or trial start.
 * Displays animated confetti, a crown, and a "Welcome to Premium" message.
 * Tapping "Start Learning" dismisses the modal and returns to the home tab.
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";

const { width: W, height: H } = Dimensions.get("window");

// ─── Confetti particle ────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#F59E0B", "#6366F1", "#10B981", "#EF4444",
  "#3B82F6", "#EC4899", "#14B8A6", "#F97316",
];

function ConfettiParticle({ index }: { index: number }) {
  const x = useRef(new Animated.Value(Math.random() * W)).current;
  const y = useRef(new Animated.Value(-20)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 8 + Math.random() * 8;
  const duration = 1800 + Math.random() * 1200;
  const delay = Math.random() * 800;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, {
        toValue: H + 20,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 360 * (Math.random() > 0.5 ? 1 : -1),
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(delay + duration * 0.7),
        Animated.timing(opacity, {
          toValue: 0,
          duration: duration * 0.3,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          width: size,
          height: size * 0.5,
          backgroundColor: color,
          borderRadius: 2,
          transform: [{ translateX: x }, { translateY: y }, { rotate: spin }],
          opacity,
        },
      ]}
    />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PremiumWelcomeScreen() {
  const colors = useColors();
  const router = useRouter();

  // Entrance animations
  const crownScale = useRef(new Animated.Value(0)).current;
  const crownOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Animated.sequence([
      // Crown bounces in
      Animated.parallel([
        Animated.spring(crownScale, {
          toValue: 1,
          tension: 60,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(crownOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Text fades in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 350,
        delay: 100,
        useNativeDriver: true,
      }),
      // Button fades in
      Animated.timing(btnOpacity, {
        toValue: 1,
        duration: 300,
        delay: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContinue = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={["top", "bottom", "left", "right"]}
    >
      {/* Confetti layer */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {Array.from({ length: 40 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Crown */}
        <Animated.View
          style={[
            styles.crownCircle,
            { backgroundColor: "#F59E0B18" },
            { transform: [{ scale: crownScale }], opacity: crownOpacity },
          ]}
        >
          <Text style={styles.crownEmoji}>👑</Text>
        </Animated.View>

        {/* Text block */}
        <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            Welcome to Premium!
          </Text>
          <Text style={[styles.subheadline, { color: "#F59E0B" }]}>
            🎉 Your 14-day free trial has started
          </Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            You now have unlimited solves, quizzes, and AI chat. Keep your streak alive and make every study session count.
          </Text>

          {/* Feature pills */}
          <View style={styles.pillRow}>
            {["∞ Solves", "∞ Quizzes", "∞ AI Chat"].map((label) => (
              <View key={label} style={[styles.pill, { backgroundColor: "#F59E0B18", borderColor: "#F59E0B40" }]}>
                <Text style={[styles.pillText, { color: "#F59E0B" }]}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* CTA */}
        <Animated.View style={[styles.btnWrapper, { opacity: btnOpacity }]}>
          <TouchableOpacity
            onPress={handleContinue}
            activeOpacity={0.85}
            style={[styles.ctaBtn, { backgroundColor: "#F59E0B" }]}
            accessibilityLabel="Start learning"
            accessibilityRole="button"
          >
            <Text style={styles.ctaBtnText}>Start Learning 🚀</Text>
          </TouchableOpacity>
          <Text style={[styles.legalNote, { color: colors.muted }]}>
            Cancel anytime in Settings · No charge during trial
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  confettiPiece: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 28,
  },
  crownCircle: {
    width: 140,
    height: 140,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  crownEmoji: { fontSize: 72 },
  textBlock: { alignItems: "center", gap: 12 },
  headline: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
    marginTop: 4,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontWeight: "700" },
  btnWrapper: { width: "100%", alignItems: "center", gap: 12 },
  ctaBtn: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  ctaBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  legalNote: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
