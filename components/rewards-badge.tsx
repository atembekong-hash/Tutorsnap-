/**
 * Rewards Badge Component - Shows unclaimed rewards count on settings tab
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { getUserRewards } from "@/lib/rewards";
import { useColors } from "@/hooks/use-colors";

export function RewardsBadge() {
  const colors = useColors();
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    loadUnclaimedRewards();
    
    // Refresh every 5 seconds
    const interval = setInterval(loadUnclaimedRewards, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadUnclaimedRewards = async () => {
    try {
      const rewards = await getUserRewards();
      if (rewards.unclaimedRewards > 0 && rewards.unclaimedRewards !== unclaimedCount) {
        setUnclaimedCount(rewards.unclaimedRewards);
        
        // Pulse animation on update
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (rewards.unclaimedRewards === 0) {
        setUnclaimedCount(0);
      }
    } catch (error) {
      console.warn("Failed to load unclaimed rewards:", error);
    }
  };

  if (unclaimedCount === 0) return null;

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: colors.primary,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={styles.badgeText}>
        {unclaimedCount > 9 ? "9+" : unclaimedCount}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
});
