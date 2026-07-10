import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { loadQuizHistory, type QuizResult } from "@/lib/quiz-history";

function gradeLabel(pct: number): { letter: string; color: string } {
  if (pct >= 90) return { letter: "A", color: "#22C55E" };
  if (pct >= 80) return { letter: "B", color: "#4ADE80" };
  if (pct >= 70) return { letter: "C", color: "#F59E0B" };
  if (pct >= 60) return { letter: "D", color: "#F97316" };
  return { letter: "F", color: "#EF4444" };
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function QuizResultCard({ item, colors }: { item: QuizResult; colors: ReturnType<typeof useColors> }) {
  const grade = gradeLabel(item.pct);
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={[styles.cardSubject, { color: colors.foreground }]}>
            {item.subject.charAt(0).toUpperCase() + item.subject.slice(1)}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.muted }]}>
            {formatDate(item.completedAt)} · {formatTime(item.completedAt)}
          </Text>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: `${grade.color}20`, borderColor: grade.color }]}>
          <Text style={[styles.gradeText, { color: grade.color }]}>{grade.letter}</Text>
        </View>
      </View>
      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <IconSymbol size={14} name="checkmark.circle.fill" color={colors.success} />
          <Text style={[styles.statText, { color: colors.foreground }]}>
            {item.score}/{item.total} correct
          </Text>
        </View>
        <View style={styles.statItem}>
          <IconSymbol size={14} name="chart.bar.fill" color={colors.primary} />
          <Text style={[styles.statText, { color: colors.foreground }]}>{item.pct}%</Text>
        </View>
        <View style={styles.statItem}>
          <IconSymbol size={14} name="clock.fill" color={colors.muted} />
          <Text style={[styles.statText, { color: colors.muted }]}>{formatDuration(item.timeTaken)}</Text>
        </View>
        <View style={[styles.diffBadge, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.diffText, { color: colors.primary }]}>{item.difficulty}</Text>
        </View>
      </View>
      {/* Score bar */}
      <View style={[styles.barBg, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.barFill,
            { width: `${item.pct}%` as any, backgroundColor: grade.color },
          ]}
        />
      </View>
    </View>
  );
}

export default function QuizHistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setLoadError(false);
      loadQuizHistory()
        .then((data) => {
          setHistory(data);
          setLoading(false);
        })
        .catch(() => {
          setLoadError(true);
          setLoading(false);
        });
    }, [])
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={24} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Quiz History</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {history.length} quiz{history.length !== 1 ? "zes" : ""} completed
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Could Not Load History</Text>
          <Text style={[styles.emptySub, { color: colors.muted }]}>Something went wrong. Please try again.</Text>
          <TouchableOpacity
            accessibilityLabel="Toggle loading"
            onPress={() => {
              setLoading(true);
              setLoadError(false);
              loadQuizHistory().then((data) => { setHistory(data); setLoading(false); }).catch(() => { setLoadError(true); setLoading(false); });
            }}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.startBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Quizzes Yet</Text>
          <Text style={[styles.emptySub, { color: colors.muted }]}>
            Complete a quiz in the Practice tab to see your results here.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.startBtnText}>Go to Practice</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <QuizResultCard item={item} colors={colors} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  headerSub: { fontSize: 12, marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  startBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  startBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  cardLeft: { flex: 1 },
  cardSubject: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  cardMeta: { fontSize: 12 },
  gradeBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeText: { fontSize: 16, fontWeight: "700" },
  cardStats: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 13 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  diffText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  barBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
});
