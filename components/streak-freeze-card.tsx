/**
 * StreakFreezeCard — lets users activate a proactive streak freeze.
 *
 * - Earned at every 7-day streak milestone (once per week)
 * - Max 1 freeze held at a time
 * - When activated, covers today as "solved" so the streak is preserved
 *   even if no problems are solved that day
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import {
  getStreakFreezeState,
  activateStreakFreeze,
  tryEarnStreakFreeze,
  type StreakFreezeState,
} from "@/lib/progress";

interface Props {
  currentStreak: number;
  onFreezeActivated?: () => void;
  onFreezeEarned?: () => void;
}

export function StreakFreezeCard({ currentStreak, onFreezeActivated, onFreezeEarned }: Props) {
  const colors = useColors();
  const [state, setState] = useState<StreakFreezeState>({ available: 0, activeUntil: null, lastEarnedWeek: null });
  const [activating, setActivating] = useState(false);
  const [justActivated, setJustActivated] = useState(false);
  const [justEarned, setJustEarned] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const isActiveToday = state.activeUntil === today;

  const load = useCallback(async () => {
    const s = await getStreakFreezeState();
    setState(s);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Try to earn a freeze when streak hits a milestone
  useEffect(() => {
    if (currentStreak > 0 && currentStreak % 7 === 0) {
      tryEarnStreakFreeze(currentStreak).then(({ earned, newAvailable }) => {
        if (earned) {
          setState((prev) => ({ ...prev, available: newAvailable }));
          setJustEarned(true);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          onFreezeEarned?.();
          setTimeout(() => setJustEarned(false), 4000);
        }
      });
    }
  }, [currentStreak, onFreezeEarned]);

  const handleActivate = async () => {
    if (activating || state.available <= 0 || isActiveToday) return;
    setActivating(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const { activated } = await activateStreakFreeze();
    if (activated) {
      setState((prev) => ({ ...prev, available: 0, activeUntil: today }));
      setJustActivated(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onFreezeActivated?.();
      setTimeout(() => setJustActivated(false), 4000);
    }
    setActivating(false);
  };

  // Don't render if streak is 0 and no freeze available
  if (currentStreak === 0 && state.available === 0 && !isActiveToday) return null;

  const statusColor = isActiveToday ? "#06B6D4" : state.available > 0 ? "#3B82F6" : colors.muted;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{isActiveToday ? "🧊" : state.available > 0 ? "❄️" : "💧"}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Streak Freeze
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {isActiveToday
              ? "Active today — your streak is protected"
              : state.available > 0
              ? "1 freeze ready — activate to protect today's streak"
              : "Earn a freeze by reaching a 7-day streak milestone"}
          </Text>
          {justEarned && (
            <Text style={[styles.badge, { color: "#3B82F6" }]}>🎉 Freeze earned!</Text>
          )}
          {justActivated && (
            <Text style={[styles.badge, { color: "#06B6D4" }]}>🧊 Streak frozen for today!</Text>
          )}
        </View>
        {state.available > 0 && !isActiveToday && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: statusColor + "18", borderColor: statusColor }]}
            onPress={handleActivate}
            activeOpacity={0.75}
            disabled={activating}
          >
            <Text style={[styles.btnText, { color: statusColor }]}>
              {activating ? "…" : "Freeze"}
            </Text>
          </TouchableOpacity>
        )}
        {isActiveToday && (
          <View style={[styles.activeChip, { backgroundColor: "#06B6D4" + "18", borderColor: "#06B6D4" }]}>
            <Text style={[styles.activeChipText, { color: "#06B6D4" }]}>Active</Text>
          </View>
        )}
      </View>
      {/* Freeze slots */}
      <View style={styles.slots}>
        <View style={[styles.slot, { backgroundColor: (state.available > 0 || isActiveToday) ? statusColor + "22" : colors.border + "55", borderColor: (state.available > 0 || isActiveToday) ? statusColor : colors.border }]}>
          <Text style={{ fontSize: 14 }}>{state.available > 0 || isActiveToday ? "❄️" : "○"}</Text>
        </View>
        <Text style={[styles.slotLabel, { color: colors.muted }]}>
          {state.available > 0
            ? "1 freeze available"
            : isActiveToday
            ? "In use today"
            : "No freeze — earn at 7-day streak"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  icon: { fontSize: 22 },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "700" },
  subtitle: { fontSize: 12, lineHeight: 17 },
  badge: { fontSize: 12, fontWeight: "700", marginTop: 4 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 13, fontWeight: "700" },
  activeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  activeChipText: { fontSize: 12, fontWeight: "700" },
  slots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  slot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  slotLabel: { fontSize: 12, fontWeight: "500" },
});
