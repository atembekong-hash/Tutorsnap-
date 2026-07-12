/**
 * UpsellNudgeBanner
 *
 * Shown on the Solve screen after the user has used at least one free solve.
 * Displays remaining uses as a progress-style pill and taps to open the paywall.
 *
 * Behaviour:
 *  - Hidden when user is premium or in dev mode
 *  - Hidden when 0 solves have been used (no nudge on first open)
 *  - Amber when 1 solve used (1 of 2 remaining)
 *  - Red + urgent copy when 0 solves remaining (limit already hit — paywall handles the block)
 *  - Dismissible per session (reappears on next app launch)
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import * as H from "@/lib/haptics";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { FREE_LIMITS } from "@/lib/subscription";

interface UpsellNudgeBannerProps {
  solvesUsed: number;
  isPremium: boolean;
  isDevMode: boolean;
}

export function UpsellNudgeBanner({ solvesUsed, isPremium, isDevMode }: UpsellNudgeBannerProps) {
  const colors = useColors();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  // Don't show for premium users, dev mode, or if no solves used yet
  if (isPremium || isDevMode || solvesUsed === 0 || dismissed) return null;

  const remaining = Math.max(0, FREE_LIMITS.solvesPerDay - solvesUsed);
  const isUrgent = remaining === 0;
  const isWarning = remaining === 1;

  const accentColor = isUrgent ? colors.error : isWarning ? colors.warning : colors.primary;
  const bgColor = isUrgent
    ? `${colors.error}15`
    : isWarning
    ? `${colors.warning}15`
    : `${colors.primary}10`;
  const borderColor = isUrgent
    ? `${colors.error}40`
    : isWarning
    ? `${colors.warning}40`
    : `${colors.primary}25`;

  const headline = isUrgent
    ? "Daily limit reached"
    : `${remaining} free solve${remaining !== 1 ? "s" : ""} left today`;

  const subtext = isUrgent
    ? "Upgrade for unlimited solves"
    : `${solvesUsed} of ${FREE_LIMITS.solvesPerDay} used · Upgrade for unlimited`;

  const handlePress = () => {
    H.impactLight()
    router.push("/paywall" as any);
  };

  const handleDismiss = () => {
    H.impactLight()
    setDismissed(true);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityLabel="Upgrade to premium for unlimited solves"
      accessibilityRole="button"
      style={[
        styles.banner,
        {
          backgroundColor: bgColor,
          borderColor,
          marginHorizontal: 16,
          marginTop: 16,
          marginBottom: 0,
        },
      ]}
    >
      {/* Left: icon + text */}
      <View style={styles.left}>
        {/* Usage pip dots */}
        <View style={styles.pipRow}>
          {Array.from({ length: FREE_LIMITS.solvesPerDay }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.pip,
                {
                  backgroundColor: i < solvesUsed ? accentColor : `${accentColor}30`,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.headline, { color: accentColor }]}>{headline}</Text>
        <Text style={[styles.subtext, { color: colors.muted }]}>{subtext}</Text>
      </View>

      {/* Right: upgrade chip + dismiss */}
      <View style={styles.right}>
        <View style={[styles.upgradeChip, { backgroundColor: accentColor }]}>
          <Text style={styles.upgradeChipText}>Upgrade</Text>
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Dismiss banner"
          style={styles.dismissBtn}
        >
          <Text style={[styles.dismissText, { color: colors.muted }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  left: {
    flex: 1,
    gap: 3,
  },
  pipRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 2,
  },
  pip: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headline: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  subtext: {
    fontSize: 11,
    lineHeight: 15,
  },
  right: {
    alignItems: "center",
    gap: 6,
  },
  upgradeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  upgradeChipText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  dismissBtn: {
    padding: 2,
  },
  dismissText: {
    fontSize: 12,
  },
});
