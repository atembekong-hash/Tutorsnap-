/**
 * AlmostThereBanner
 *
 * Shows a motivational nudge when the user is within 5 solves of the next badge tier.
 * Displays the closest subject, remaining count, and target tier.
 * Dismissible per session (not persisted — reappears next launch).
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as H from "@/lib/haptics";
import { useColors } from "@/hooks/use-colors";
import { BADGE_COLORS, BADGE_EMOJI, type BadgeTier } from "@/lib/mastery-badges";

interface AlmostThereBannerProps {
  subject: string;
  subjectLabel: string;
  remaining: number;
  nextTier: BadgeTier;
  onDismiss: () => void;
  onGoSolve: () => void;
}

export function AlmostThereBanner({
  subjectLabel,
  remaining,
  nextTier,
  onDismiss,
  onGoSolve,
}: AlmostThereBannerProps) {
  const colors = useColors();
  const tierColor = BADGE_COLORS[nextTier];
  const tierEmoji = BADGE_EMOJI[nextTier];

  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const [dismissed, setDismissed] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleDismiss = () => {
    opacity.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(-12, { duration: 250 }, () => {
      runOnJS(setDismissed)(true);
      runOnJS(onDismiss)();
    });
  };

  const handleGoSolve = () => {
    H.impactMedium();
    onGoSolve();
  };

  if (dismissed) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: `${tierColor}12`,
          borderColor: `${tierColor}35`,
        },
        animatedStyle,
      ]}
    >
      {/* Left: icon + text */}
      <View style={styles.left}>
        <Text style={styles.tierEmoji}>{tierEmoji}</Text>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Almost there!
          </Text>
          <Text style={[styles.sub, { color: colors.muted }]}>
            <Text style={{ fontWeight: "700", color: tierColor }}>{remaining} more solve{remaining !== 1 ? "s" : ""}</Text>
            {" "}to {tierEmoji} {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} in{" "}
            <Text style={{ fontWeight: "600", color: colors.foreground }}>{subjectLabel}</Text>
          </Text>
        </View>
      </View>

      {/* Right: actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleGoSolve}
          style={[styles.solveBtn, { backgroundColor: tierColor }]}
        >
          <Text style={styles.solveBtnText}>Solve</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn}>
          <Text style={[styles.dismissText, { color: colors.muted }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 0,
  },
  left: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tierEmoji: { fontSize: 24, marginTop: 1 },
  textBlock: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  sub: { fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: "row", alignItems: "center", gap: 6 },
  solveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  solveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  dismissBtn: { padding: 4 },
  dismissText: { fontSize: 14, fontWeight: "600" },
});
