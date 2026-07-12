import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import * as H from "@/lib/haptics";
import { useColors } from "@/hooks/use-colors";
import { getShieldCount, earnShield } from "@/lib/progress";

interface Props {
  /** Current streak count — shields are earnable every 7-day milestone */
  currentStreak: number;
  /** Called after a shield is earned so parent can refresh */
  onShieldEarned?: (newCount: number) => void;
}

const MAX_SHIELDS = 3;

/**
 * Displays the streak shield status and lets users earn shields.
 * Shields are earned at every 7-day streak milestone (7, 14, 21, …).
 * Max 3 shields can be held at once.
 */
export function StreakShieldCard({ currentStreak, onShieldEarned }: Props) {
  const colors = useColors();
  const [shields, setShields] = useState(0);
  const [earning, setEarning] = useState(false);
  const [justEarned, setJustEarned] = useState(false);
  const justEarnedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const count = await getShieldCount();
    setShields(count);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Can earn a shield if streak is a multiple of 7 and shields < max
  const canEarn = currentStreak > 0 && currentStreak % 7 === 0 && shields < MAX_SHIELDS;

  const handleEarn = async () => {
    if (!canEarn || earning) return;
    setEarning(true);
    H.notificationSuccess();
    const newCount = await earnShield();
    setShields(newCount);
    setJustEarned(true);
    setEarning(false);
    onShieldEarned?.(newCount);
    if (justEarnedTimerRef.current) clearTimeout(justEarnedTimerRef.current);
    justEarnedTimerRef.current = setTimeout(() => setJustEarned(false), 3000);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.icon}>🛡️</Text>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Streak Shield</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {shields === 0
                ? "No shields — earn one at a 7-day streak"
                : `${shields}/${MAX_SHIELDS} shield${shields > 1 ? "s" : ""} active`}
            </Text>
          </View>
        </View>
        {/* Shield pips */}
        <View style={styles.pips}>
          {Array.from({ length: MAX_SHIELDS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.pip,
                {
                  backgroundColor: i < shields ? colors.primary : colors.border,
                  borderColor: i < shields ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={styles.pipText}>{i < shields ? "🛡️" : "○"}</Text>
            </View>
          ))}
        </View>
      </View>

      {justEarned && (
        <View style={[styles.earnedBanner, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}40` }]}>
          <Text style={[styles.earnedText, { color: colors.primary }]}>
            🎉 Shield earned! Your streak is protected for 1 missed day.
          </Text>
        </View>
      )}

      {canEarn && !justEarned && (
        <TouchableOpacity
          onPress={handleEarn}
          style={[styles.earnBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Text style={styles.earnBtnText}>
            🛡️ Claim Shield — {currentStreak}-day streak!
          </Text>
        </TouchableOpacity>
      )}

      {!canEarn && !justEarned && shields < MAX_SHIELDS && currentStreak > 0 && (
        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: `${colors.primary}20` }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${((currentStreak % 7) / 7) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: colors.muted }]}>
            {7 - (currentStreak % 7)} more days to next shield
          </Text>
        </View>
      )}

      {shields >= MAX_SHIELDS && (
        <Text style={[styles.maxText, { color: colors.muted }]}>
          Max shields held — use one by missing a day (it auto-activates).
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginHorizontal: 16, marginTop: 20, marginBottom: 0 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  icon: { fontSize: 28 },
  title: { fontSize: 15, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  pips: { flexDirection: "row", gap: 6 },
  pip: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  pipText: { fontSize: 13 },
  earnedBanner: { borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 4 },
  earnedText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  earnBtn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center", marginTop: 4 },
  earnBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  progressRow: { gap: 6, marginTop: 4 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 12, textAlign: "right" },
  maxText: { fontSize: 12, textAlign: "center", marginTop: 4 },
});
