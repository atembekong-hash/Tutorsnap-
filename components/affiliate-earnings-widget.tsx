/**
 * AffiliateEarningsWidget
 * A compact home-screen card that shows pending affiliate days and taps to /refer.
 * Only renders when the user has > 0 pending days.
 */
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { getAffiliateStats, TIER_META, getTier, type AffiliateStats } from "@/lib/affiliate";

export function AffiliateEarningsWidget() {
  const colors = useColors();
  const router = useRouter();
  const [stats, setStats] = useState<AffiliateStats | null>(null);

  useEffect(() => {
    getAffiliateStats().then(setStats).catch(() => {});
  }, []);

  if (!stats || stats.pendingDays <= 0) return null;

  const tier = getTier(stats.totalReferrals);
  const meta = TIER_META[tier];

  return (
    <Pressable
      onPress={() => router.push("/refer" as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.left}>
        <Text style={styles.emoji}>🎁</Text>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {stats.pendingDays} days pending
          </Text>
          <Text style={[styles.sub, { color: colors.muted }]}>
            {meta.emoji} {meta.label} · Tap to redeem
          </Text>
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: "#F59E0B22" }]}>
        <Text style={styles.badgeText}>Redeem</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  emoji: {
    fontSize: 26,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  sub: {
    fontSize: 12,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F59E0B",
  },
});
