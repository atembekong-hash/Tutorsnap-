/**
 * Rewards Dashboard Screen
 * Shows earned free days, referral tier progress, and rewards
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import { EmptyState } from "@/components/empty-state";
import {
  getUserRewards,
  getRewardTiers,
  getNextTierProgress,
  claimRewards,
  getRewardSummary,
  getTierPerks,
} from "@/lib/rewards";
import { RewardsSkeletonScreen } from "@/components/skeleton";

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
  const [perks, setPerks] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const progressAnim = new Animated.Value(0);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      const data = await getRewardSummary();
      const tierPerks = await getTierPerks();
      setSummary(data);
      setPerks(tierPerks);
      
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

  const onRefresh = useCallback(async () => {
    H.impactLight();
    setRefreshing(true);
    await loadRewards();
    setRefreshing(false);
  }, []);

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
      <ScreenContainer>
        <RewardsSkeletonScreen />
      </ScreenContainer>
    );
  }

  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });
  return (
    <ScreenContainer className="p-6">
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <TouchableOpacity accessibilityLabel="Go back" accessibilityHint="Returns to the previous screen" accessibilityRole="button" onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
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

        {/* Buttons Row */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
          <TouchableOpacity accessibilityLabel="Share" accessibilityHint="Opens the share sheet" accessibilityRole="button"
            onPress={handleShareReferral}
            style={[styles.shareBtn, { backgroundColor: colors.primary, flex: 1 }]}
          >
            <IconSymbol size={20} name="paperplane.fill" color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: 8 }}>
              Share
            </Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Confirm" accessibilityRole="button"
            onPress={() => router.push("/redeem-code" as any)}
            style={[styles.shareBtn, { backgroundColor: `${colors.primary}40`, flex: 1 }]}
          >
            <IconSymbol size={20} name="checkmark.circle.fill" color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: "600", marginLeft: 8 }}>
              Redeem
            </Text>
          </TouchableOpacity>
        </View>

        {/* Zero-referral empty state */}
        {summary.totalEarned === 0 && summary.unclaimed === 0 && summary.progressPercent === 0 && (
          <View style={{ marginTop: 8 }}>
            <EmptyState
              variant="rewards"
              onAction={handleShareReferral}
            />
          </View>
        )}

        {/* Tier Perks */}
        {perks && (
          <View style={{ marginTop: 32, gap: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Your Perks
            </Text>
            {[
              { key: "adFree", label: "Ad-Free Experience", icon: "checkmark.circle.fill" },
              { key: "unlimitedDailySolves", label: "Unlimited Daily Solves", icon: "checkmark.circle.fill" },
              { key: "customThemes", label: "Custom Themes", icon: "checkmark.circle.fill" },
              { key: "prioritySupport", label: "Priority Support", icon: "checkmark.circle.fill" },
              { key: "advancedAnalytics", label: "Advanced Analytics", icon: "checkmark.circle.fill" },
            ].map((perk) => (
              <View
                key={perk.key}
                style={[
                  styles.perkItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: perks[perk.key] ? 1 : 0.4,
                  },
                ]}
              >
                <IconSymbol
                  size={20}
                  name={perk.icon as any}
                  color={perks[perk.key] ? colors.success : colors.muted}
                />
                <Text
                  style={[
                    styles.perkLabel,
                    {
                      color: perks[perk.key] ? colors.foreground : colors.muted,
                    },
                  ]}
                >
                  {perk.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Referral CTA Banner */}
        <TouchableOpacity
          onPress={handleShareReferral}
          activeOpacity={0.85}
          style={[
            styles.referralBanner,
            { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` },
          ]}
          accessibilityLabel="Share your referral link to earn free days" accessibilityHint="Opens the referral share screen"
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.referralBannerTitle, { color: colors.foreground }]}>
              Invite friends, earn free days
            </Text>
            <Text style={[styles.referralBannerDesc, { color: colors.muted }]}>
              Share your unique link and earn 1 free day for every friend who joins.
            </Text>
          </View>
          <View style={[styles.referralBannerBtn, { backgroundColor: colors.primary }]}>
            <IconSymbol size={18} name="paperplane.fill" color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13, marginLeft: 6 }}>Share</Text>
          </View>
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
    
      </Animated.View></ScreenContainer>
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
    paddingVertical: 12,
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
  perkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  perkLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  referralBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 28,
  },
  referralBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  referralBannerDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  referralBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
});
