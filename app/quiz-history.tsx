import React, { useState, useCallback } from "react";
import { EmptyState } from "@/components/empty-state";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppearance } from "@/lib/appearance-context";
import { loadQuizHistory, type QuizResult } from "@/lib/quiz-history";
import { HistorySkeletonList } from "@/components/skeleton";
import { getSubjectDef, getSubjectLabel } from "@/lib/subjects";

function getAppearanceSubjectKey(subjectId: string): string {
  const def = getSubjectDef(subjectId);
  switch (def.label) {
    case "Physics":
    case "Chemistry":
    case "Biology":
    case "Statistics":
    case "Economics":
    case "Geometry":
    case "Computer Science":
      return def.label;
    default:
      return def.category === "math" ? "Mathematics" : def.label;
  }
}

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

function QuizResultCard({
  item,
  colors,
  subjectAccent,
  onPress,
}: {
  item: QuizResult;
  colors: ReturnType<typeof useColors>;
  subjectAccent: string;
  onPress: () => void;
}) {
  const grade = gradeLabel(item.pct);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`View details for ${getSubjectLabel(item.subject)} quiz, score ${item.pct}%`}
      accessibilityRole="button"
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={[styles.cardSubject, { color: colors.foreground }]}>
            {getSubjectLabel(item.subject)}
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
          <IconSymbol size={14} name="chart.bar.fill" color={subjectAccent} />
          <Text style={[styles.statText, { color: colors.foreground }]}>{item.pct}%</Text>
        </View>
        <View style={styles.statItem}>
          <IconSymbol size={14} name="clock.fill" color={colors.muted} />
          <Text style={[styles.statText, { color: colors.muted }]}>{formatDuration(item.timeTaken)}</Text>
        </View>
        <View style={[styles.diffBadge, { backgroundColor: `${subjectAccent}15` }]}>
          <Text style={[styles.diffText, { color: subjectAccent }]}>{item.difficulty}</Text>
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
      {/* Tap hint */}
      <View style={styles.tapHintRow}>
        <Text style={[styles.tapHintText, { color: colors.muted }]}>Tap to review questions</Text>
        <IconSymbol size={12} name="chevron.right" color={colors.muted} />
      </View>
    </TouchableOpacity>
  );
}

export default function QuizHistoryScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { getSubjectAccent } = useAppearance();
  const router = useRouter();
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const doLoad = (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setLoadError(false);
    loadQuizHistory()
      .then((data) => { setHistory(data); })
      .catch(() => { setLoadError(true); })
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    doLoad(true);
  };

  useFocusEffect(
    useCallback(() => {
      doLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Derive unique subjects from history (preserving order of first appearance)
  const subjects = React.useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const h of history) {
      if (!seen.has(h.subject)) {
        seen.add(h.subject);
        result.push(h.subject);
      }
    }
    return result;
  }, [history]);

  // Filtered list
  const filtered = React.useMemo(
    () => (activeSubject ? history.filter((h) => h.subject === activeSubject) : history),
    [history, activeSubject]
  );

  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });
  return (
    <ScreenContainer>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back" accessibilityHint="Returns to the previous screen"
          accessibilityRole="button"
        >
          <IconSymbol size={24} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Quiz History</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {filtered.length} quiz{filtered.length !== 1 ? "zes" : ""}
            {activeSubject ? ` · ${getSubjectLabel(activeSubject)}` : ` · ${history.length} total`}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <HistorySkeletonList rows={7} />
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Could Not Load History</Text>
          <Text style={[styles.emptySub, { color: colors.muted }]}>Something went wrong. Please try again.</Text>
          <TouchableOpacity
            accessibilityLabel="Retry loading quiz history"
            accessibilityRole="button"
            onPress={() => {
              setLoading(true);
              setLoadError(false);
              loadQuizHistory()
                .then((data) => { setHistory(data); setLoading(false); })
                .catch(() => { setLoadError(true); setLoading(false); });
            }}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.startBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : history.length === 0 ? (
        <EmptyState variant="quiz-history" onAction={() => router.push("/(tabs)/practice" as any)} />
      ) : (
        <>
          {/* Subject filter chips */}
          {subjects.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterBar}
              style={[styles.filterBarWrapper, { borderBottomColor: colors.border }]}
            >
              {/* "All" chip */}
              <TouchableOpacity
                onPress={() => setActiveSubject(null)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: activeSubject === null ? colors.primary : colors.surface,
                    borderColor: activeSubject === null ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.75}
                accessibilityLabel="Show all subjects"
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: activeSubject === null ? "#fff" : colors.foreground },
                  ]}
                >
                  All
                </Text>
                <View
                  style={[
                    styles.filterChipCount,
                    {
                      backgroundColor:
                        activeSubject === null ? "rgba(255,255,255,0.25)" : `${colors.primary}20`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipCountText,
                      { color: activeSubject === null ? "#fff" : colors.primary },
                    ]}
                  >
                    {history.length}
                  </Text>
                </View>
              </TouchableOpacity>

              {subjects.map((subj) => {
                const count = history.filter((h) => h.subject === subj).length;
                const isActive = activeSubject === subj;
                const chipAccent = getSubjectAccent(getAppearanceSubjectKey(subj), colorScheme);
                return (
                  <TouchableOpacity
                    key={subj}
                    onPress={() => setActiveSubject(isActive ? null : subj)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isActive ? chipAccent : colors.surface,
                        borderColor: isActive ? chipAccent : colors.border,
                      },
                    ]}
                    activeOpacity={0.75}
                    accessibilityLabel={`Filter by ${getSubjectLabel(subj)}`}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isActive ? "#fff" : colors.foreground },
                      ]}
                    >
                      {getSubjectLabel(subj)}
                    </Text>
                    <View
                      style={[
                        styles.filterChipCount,
                        {
                          backgroundColor: isActive
                            ? "rgba(255,255,255,0.25)"
                            : `${chipAccent}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipCountText,
                          { color: isActive ? "#fff" : chipAccent },
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {filtered.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Results</Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                No quizzes found for {activeSubject ? getSubjectLabel(activeSubject) : "this filter"}.
              </Text>
              <TouchableOpacity
                onPress={() => setActiveSubject(null)}
                accessibilityLabel="Clear subject filter"
                accessibilityRole="button"
                style={[styles.startBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.startBtnText}>Clear Filter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <QuizResultCard
                  item={item}
                  colors={colors}
                  subjectAccent={getSubjectAccent(getAppearanceSubjectKey(item.subject), colorScheme)}
                  onPress={() =>
                    router.push({
                      pathname: "/quiz-history-detail",
                      params: { id: item.id },
                    } as any)
                  }
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
            />
          )}
        </>
      )}
    
      </Animated.View></ScreenContainer>
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

  // Filter bar
  filterBarWrapper: { borderBottomWidth: 0.5 },
  filterBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  filterChipCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  filterChipCountText: { fontSize: 11, fontWeight: "700" },

  // List
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
  cardStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 13 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  diffText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  barBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  tapHintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    marginTop: 8,
  },
  tapHintText: { fontSize: 11 },
});
