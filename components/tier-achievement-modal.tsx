/**
 * Tier Achievement Modal - Celebrates when user unlocks a new tier
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import * as H from "@/lib/haptics";
import { ConfettiAnimation } from "./confetti-animation";
import { useColors } from "@/hooks/use-colors";
import type { RewardTier } from "@/lib/rewards";

interface TierAchievementModalProps {
  visible: boolean;
  tier: RewardTier | undefined;
  onDismiss: () => void;
}

export function TierAchievementModal({
  visible,
  tier,
  onDismiss,
}: TierAchievementModalProps) {
  const colors = useColors();
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible && tier) {
      H.notificationAsync("success");
      
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 12,
            bounciness: 8,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, tier]);

  if (!tier) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <ConfettiAnimation duration={2500} />
        
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* Emoji */}
            <Text style={styles.tierEmoji}>{tier.emoji}</Text>

            {/* Title */}
            <Text style={[styles.title, { color: colors.foreground }]}>
              Tier Unlocked!
            </Text>

            {/* Tier Name */}
            <Text style={[styles.tierName, { color: colors.primary }]}>
              {tier.name}
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.muted }]}>
              {tier.description}
            </Text>

            {/* Reward */}
            <View
              style={[
                styles.rewardBox,
                {
                  backgroundColor: `${colors.primary}15`,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.rewardLabel, { color: colors.muted }]}>
                Reward
              </Text>
              <Text style={[styles.rewardValue, { color: colors.primary }]}>
                +{tier.freeDaysReward} Free Days
              </Text>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={onDismiss}
              style={[styles.button, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.buttonText}>Awesome!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "80%",
    maxWidth: 320,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  tierEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  tierName: {
    fontSize: 20,
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
    textAlign: "center",
  },
  rewardBox: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  rewardLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  button: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
