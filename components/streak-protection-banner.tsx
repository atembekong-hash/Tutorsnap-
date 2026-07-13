/**
 * StreakProtectionBanner
 *
 * Shown on the home screen in the evening (after 18:00) when:
 *  - The user has an active streak (> 0)
 *  - They have NOT yet solved anything today
 *  - They are NOT premium (free tier only — premium users have unlimited solves)
 *
 * Tapping the banner scrolls the user to the solve input (via onSolveNow callback)
 * or, if they are at their daily limit, opens the paywall.
 *
 * Dismissible per session.
 */

import React, { useState, useEffect, useRef } from "react";
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
import { useColors } from "@/hooks/use-colors";


interface StreakProtectionBannerProps {
  /** Current streak length. Banner only shows when > 0. */
  currentStreak: number;
  /** How many problems solved today. Banner only shows when 0. */
  solvedToday: number;
  /** Whether the user is premium (banner hidden for premium users). */
  isPremium: boolean;
  /** Whether the user has hit their daily free solve limit. */
  atSolveLimit: boolean;
  /** Called when the user taps "Solve Now" (not at limit). */
  onSolveNow: () => void;
}

export function StreakProtectionBanner({
  currentStreak,
  solvedToday,
  isPremium,
  atSolveLimit,
  onSolveNow,
}: StreakProtectionBannerProps) {
  const colors = useColors();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [isEvening, setIsEvening] = useState(false);
  const slideAnim = useRef(new Animated.Value(-80)).current;

  // Determine if it's evening (18:00–23:59)
  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      setIsEvening(hour >= 18);
    };
    check();
    const interval = setInterval(check, 60 * 1000); // re-check every minute
    return () => clearInterval(interval);
  }, []);

  const shouldShow =
    !dismissed &&
    !isPremium &&
    isEvening &&
    currentStreak > 0 &&
    solvedToday === 0;

  useEffect(() => {
    if (shouldShow) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [shouldShow]);

  if (!shouldShow) return null;

  const handlePress = () => {
    H.impactMedium()
    if (atSolveLimit) {
      router.push("/paywall" as any);
    } else {
      onSolveNow();
    }
  };

  const handleDismiss = () => {
    H.impactLight()
    setDismissed(true);
  };

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.88}
        accessibilityLabel={atSolveLimit ? "Upgrade to protect your streak" : "Solve now to protect your streak"}
        accessibilityRole="button"
        style={[
          styles.banner,
          {
            backgroundColor: `${colors.warning}14`,
            borderColor: `${colors.warning}45`,
            marginHorizontal: 16,
            marginTop: 20,
            marginBottom: 0,
          },
        ]}
      >
        {/* Flame + text */}
        <View style={styles.left}>
          <View style={styles.titleRow}>
            <Text style={styles.flame}>🔥</Text>
            <Text style={[styles.headline, { color: colors.warning }]}>
              {currentStreak}-day streak at risk!
            </Text>
          </View>
          <Text style={[styles.subtext, { color: colors.muted }]}>
            {atSolveLimit
              ? "You've used all free solves today. Upgrade to keep your streak alive."
              : "You haven't solved anything yet today. Solve one problem to protect your streak."}
          </Text>
        </View>

        {/* CTA chip + dismiss */}
        <View style={styles.right}>
          <View style={[styles.ctaChip, { backgroundColor: colors.warning }]}>
            <Text style={styles.ctaChipText}>
              {atSolveLimit ? "Upgrade" : "Solve Now"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Dismiss streak banner"
            style={styles.dismissBtn}
          >
            <Text style={[styles.dismissText, { color: colors.muted }]}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 10,
  },
  left: { flex: 1, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  flame: { fontSize: 18 },
  headline: { fontSize: 13, fontWeight: "800", lineHeight: 18, flex: 1 },
  subtext: { fontSize: 11, lineHeight: 16 },
  right: { alignItems: "center", gap: 6 },
  ctaChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  ctaChipText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  dismissBtn: { padding: 2 },
  dismissText: { fontSize: 12 },
});
