/**
 * Rewards Dashboard Screen
 * Shows earned free days, referral tier progress, and rewards
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getUserRewards,
  getRewardTiers,
  getNextTierProgress,
  claimRewards,
  getRewardSummary,
} from "@/lib/rewards";

const { width } = Dimensions.get("window");

interface RewardSummary {
  totalEarned: number;
  unclaimed: number;
  currentTierName: string;
  currentTierEmoji: string;
  nextTierName: string | null;
  nextTierEmoji: string | null;
  progressPercent: number;
}

export default function RewardsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const progressAnim = new Animated.Value(0);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      const data = await getRewardSummary();
      setSummary(data);
      
      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: data.progressPercent,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } catch (error) {
      console.warn("Failed to load rewards:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    H.impactLight();
    try {
      await claimRewards();
      await loadRewards();
    } catch (error) {
      console.warn("Failed to claim rewards:", error);
    }
  };

  const handleShareReferral = () => {
    H.impactLight();
    router.push("/refer" as any);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  if (loading || !summary) {
    return (
      <ScreenContainer className="p-6">
        <Text style={{ color: colors.foreground }}>Loading rewards...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
              <IconSymbol size={24} name="chevron.left" color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.foreground }]}>Rewards</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Earn free days by sharing and referring friends
          </Text>
        </View>

        {/* Free Days Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: `${colors.primary}15`,
              borderColor: colors.primary,
            },
          ]}
        >
          <View style={{ alignItems: "center", gap: 12 }}>
            <Text style={[styles.freeDaysLabel, { color: colors.muted }]}>Total Free Days Earned</Text>
            <Text style={[styles.freeDaysValue, { color: colors.primary }]}>
              {summary.totalEarned} days
            </Text>
            {summary.unclaimed > 0 && (
              <TouchableOpacity
                onPress={handleClaimRewards}
                style={[styles.claimBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}>
                  Claim {summary.unclaimed} Free Days
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Current Tier */}
        <View style={{ marginTop: 24, gap: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Tier</Text>
          <View
            style={[
              styles.tierCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.tierEmoji, { fontSize: 48 }]}>{summary.currentTierEmoji}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.tierName, { color: colors.foreground }]}>
                {summary.currentTierName}
              </Text>
              <Text style={[styles.tierDesc, { color: colors.muted }]}>
                {summary.nextTierName
                  ? `Next: ${summary.nextTierName}`
                  : "Maximum tier reached!"}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        {summary.nextTierName && (
          <View style={{ marginTop: 20, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={[styles.progressLabel, { color: colors.foreground }]}>
                Progress to {summary.nextTierEmoji} {summary.nextTierName}
              </Text>
              <Text style={[styles.progressPercent, { color: colors.primary }]}>
                {Math.round(summary.progressPercent)}%
              </Text>
            </View>
            <View
              style={[
                styles.progressBarContainer,
                {
                  backgroundColor: `${colors.primary}20`,
                  borderColor: colors.border,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: colors.primary,
                    width: progressWidth,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Share Button */}
        <TouchableOpacity
          onPress={handleShareReferral}
          style={[styles.shareBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
        >
          <IconSymbol size={20} name="paperplane.fill" color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: 8 }}>
            Share Referral Link
          </Text>
        </TouchableOpacity>

        {/* Tier List */}
        <View style={{ marginTop: 32, gap: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All Tiers</Text>
          {getRewardTiers().map((tier) => (
            <View
              key={tier.tier}
              style={[
                styles.tierListItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: summary.progressPercent >= tier.requiredReferrals ? 1 : 0.5,
                },
              ]}
            >
              <Text style={{ fontSize: 28 }}>{tier.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tierListName, { color: colors.foreground }]}>
                  {tier.name}
                </Text>
                <Text style={[styles.tierListDesc, { color: colors.muted }]}>
                  {tier.description} • {tier.freeDaysReward} free days
                </Text>
              </View>
              {summary.progressPercent >= tier.requiredReferrals && (
                <Text style={{ fontSize: 20 }}>✓</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginTop: 16,
  },
  freeDaysLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  freeDaysValue: {
    fontSize: 48,
    fontWeight: "800",
  },
  claimBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  tierEmoji: {
    fontSize: 40,
  },
  tierName: {
    fontSize: 16,
    fontWeight: "700",
  },
  tierDesc: {
    fontSize: 12,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: "700",
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
  },
  tierListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  tierListName: {
    fontSize: 14,
    fontWeight: "700",
  },
  tierListDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
