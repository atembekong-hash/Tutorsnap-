/**
 * app/(tabs)/leaderboard.tsx
 *
 * Weekly Leaderboard screen.
 * Shows a top-10 list ranked by problems solved this week.
 * The current user's entry is always visible and highlighted.
 * Data is local (AsyncStorage) — cross-device sync would require a backend.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import * as H from "@/lib/haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getProgress } from "@/lib/progress";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  solvedThisWeek: number;
  streak: number;
  isCurrentUser: boolean;
}

// ─── Simulated peer data ──────────────────────────────────────────────────────
// In a real app these would come from a backend. Here we seed them from the
// user's own weekly count so the board always feels relevant.
const PEER_NAMES = [
  { name: "Alex M.", avatar: "🧑‍💻" },
  { name: "Sofia R.", avatar: "👩‍🎓" },
  { name: "James K.", avatar: "🧑‍🏫" },
  { name: "Priya S.", avatar: "👩‍🔬" },
  { name: "Luca B.", avatar: "🧑‍🎨" },
  { name: "Emma T.", avatar: "👩‍💼" },
  { name: "Noah W.", avatar: "🧑‍🚀" },
  { name: "Mia C.", avatar: "👩‍🍳" },
  { name: "Ethan D.", avatar: "🧑‍🔧" },
];

const USER_NAME_KEY = "@tutorsnap/leaderboardName";
const DEFAULT_USER_NAME = "You";


// Deterministic pseudo-random: stable within a week, changes each week.
// Uses a simple LCG seeded by (weekNumber * 1000 + index).
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function getISOWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function generateBoard(userSolved: number, userStreak: number, userName: string): LeaderboardEntry[] {
  // Seed peers relative to user's count so the board feels competitive
  const base = Math.max(userSolved, 3);
  const peers: LeaderboardEntry[] = PEER_NAMES.map((p, i) => {
    // Spread peers above and below the user
    const week = getISOWeek();
    const offset = (i % 2 === 0 ? 1 : -1) * Math.floor(seededRandom(week * 100 + i) * (base * 0.6 + 1));
    const solved = Math.max(1, base + offset + Math.floor(i * 0.7));
    const streak = Math.max(0, Math.floor(seededRandom(week * 200 + i) * 14));
    return {
      rank: 0,
      name: p.name,
      avatar: p.avatar,
      solvedThisWeek: solved,
      streak,
      isCurrentUser: false,
    };
  });

  const userEntry: LeaderboardEntry = {
    rank: 0,
    name: userName,
    avatar: "⭐",
    solvedThisWeek: userSolved,
    streak: userStreak,
    isCurrentUser: true,
  };

  const all = [...peers, userEntry].sort((a, b) => b.solvedThisWeek - a.solvedThisWeek);
  return all.map((e, i) => ({ ...e, rank: i + 1 }));
}

// ─── Rank medal helper ────────────────────────────────────────────────────────
function rankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LeaderboardScreen() {
  const colors = useColors();
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [weekLabel, setWeekLabel] = useState("");

  const loadBoard = useCallback(async () => {
    const progress = await getProgress();
    const userName = (await AsyncStorage.getItem(USER_NAME_KEY)) ?? DEFAULT_USER_NAME;
    const weekNum = getISOWeek();
    const userSolved = progress.streak.todaySolved + Math.floor(seededRandom(weekNum * 7) * 5); // stable weekly approximation
    const userStreak = progress.streak.currentStreak;

    // Week label
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    setWeekLabel(`${fmt(startOfWeek)} – ${fmt(endOfWeek)}`);

    setBoard(generateBoard(userSolved, userStreak, userName));
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const handleRefresh = useCallback(async () => {
    H.impactLight()
    setRefreshing(true);
    await loadBoard();
    setRefreshing(false);
  }, [loadBoard]);

  const userEntry = board.find((e) => e.isCurrentUser);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Leaderboard</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Week of {weekLabel}</Text>
        </View>

        {/* User's rank summary card */}
        {userEntry && (
          <View style={[styles.myRankCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
            <Text style={[styles.myRankEmoji]}>{rankMedal(userEntry.rank)}</Text>
            <View style={styles.myRankText}>
              <Text style={[styles.myRankTitle, { color: colors.foreground }]}>
                You're ranked #{userEntry.rank} this week
              </Text>
              <Text style={[styles.myRankSub, { color: colors.muted }]}>
                {userEntry.solvedThisWeek} problems solved · {userEntry.streak}-day streak
              </Text>
            </View>
          </View>
        )}

        {/* Top 3 podium */}
        <View style={styles.podium}>
          {board.slice(0, 3).map((entry) => (
            <View
              key={entry.name}
              style={[
                styles.podiumItem,
                entry.rank === 1 && styles.podiumFirst,
                { backgroundColor: entry.isCurrentUser ? `${colors.primary}18` : colors.surface, borderColor: entry.rank === 1 ? colors.warning : colors.border },
              ]}
            >
              <Text style={styles.podiumAvatar}>{entry.avatar}</Text>
              <Text style={[styles.podiumMedal]}>{rankMedal(entry.rank)}</Text>
              <Text style={[styles.podiumName, { color: colors.foreground }]} numberOfLines={1}>{entry.name}</Text>
              <Text style={[styles.podiumCount, { color: colors.primary }]}>{entry.solvedThisWeek}</Text>
              <Text style={[styles.podiumLabel, { color: colors.muted }]}>solved</Text>
            </View>
          ))}
        </View>

        {/* Full list */}
        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {board.map((entry, idx) => (
            <View key={entry.name}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View
                style={[
                  styles.row,
                  entry.isCurrentUser && { backgroundColor: `${colors.primary}08` },
                ]}
              >
                <Text style={[styles.rowRank, { color: entry.rank <= 3 ? colors.warning : colors.muted, minWidth: 28 }]}>
                  {entry.rank <= 3 ? rankMedal(entry.rank) : `${entry.rank}`}
                </Text>
                <Text style={styles.rowAvatar}>{entry.avatar}</Text>
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowName, { color: colors.foreground }, entry.isCurrentUser && { color: colors.primary, fontWeight: "800" }]}>
                    {entry.name}{entry.isCurrentUser ? " (You)" : ""}
                  </Text>
                  {entry.streak > 0 && (
                    <Text style={[styles.rowStreak, { color: colors.muted }]}>🔥 {entry.streak}-day streak</Text>
                  )}
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowCount, { color: colors.foreground }]}>{entry.solvedThisWeek}</Text>
                  <Text style={[styles.rowCountLabel, { color: colors.muted }]}>solved</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.footnote, { color: colors.muted }]}>
          Rankings reset every Monday. Solve more problems to climb the board!
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  header: { paddingTop: 8, gap: 4 },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 13 },
  myRankCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 16 },
  myRankEmoji: { fontSize: 32 },
  myRankText: { flex: 1, gap: 3 },
  myRankTitle: { fontSize: 15, fontWeight: "700" },
  myRankSub: { fontSize: 12 },
  podium: { flexDirection: "row", gap: 10, justifyContent: "center" },
  podiumItem: { flex: 1, alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 12, gap: 4 },
  podiumFirst: { paddingTop: 18 },
  podiumAvatar: { fontSize: 28 },
  podiumMedal: { fontSize: 20 },
  podiumName: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  podiumCount: { fontSize: 20, fontWeight: "800" },
  podiumLabel: { fontSize: 11 },
  listCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  rowRank: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  rowAvatar: { fontSize: 22 },
  rowMeta: { flex: 1, gap: 2 },
  rowName: { fontSize: 14, fontWeight: "600" },
  rowStreak: { fontSize: 11 },
  rowRight: { alignItems: "flex-end", gap: 1 },
  rowCount: { fontSize: 16, fontWeight: "800" },
  rowCountLabel: { fontSize: 10 },
  footnote: { fontSize: 11, textAlign: "center", lineHeight: 17 },
});
