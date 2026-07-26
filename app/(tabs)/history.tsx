import React, { useState, useCallback } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { EmptyState } from "@/components/empty-state";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toggleBookmark, getBookmarks } from "@/lib/bookmarks";
import type { HistoryItem, MathSubject } from "@/shared/types";
import { getSubjectColor, getSubjectLabel } from "@/lib/subjects";
import { Share } from "react-native";
import { GRADE_LABELS } from "@/lib/grade-levels";
import { cleanMathText } from "@/lib/clean-math-text";
import { HistorySkeletonList } from "@/components/skeleton";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import { useAnimatedList } from "@/hooks/use-animated-list";

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ─── HistoryCard at module level so hooks are called at component scope ───────
interface HistoryCardProps {
  item: HistoryItem;
  index: number;
  subjectColor: string;
  subjectLabel: string;
  bookmarkedIds: Set<string>;
  shareCounts: Record<string, number>;
  colors: ReturnType<typeof useColors>;
  getEntering: (i: number) => FadeInDown | undefined;
  onPress: () => void;
  onLongPress: () => void;
  onBookmark: () => void;
  onShareDirect: (item: HistoryItem) => Promise<void>;
}

function HistoryCard({
  item,
  index,
  subjectColor,
  subjectLabel,
  bookmarkedIds,
  shareCounts,
  colors,
  getEntering,
  onPress,
  onLongPress,
  onBookmark,
  onShareDirect,
}: HistoryCardProps) {
  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const entering = getEntering(index);
  return (
    <Animated.View entering={entering} style={cardStyle}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 80 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardLeft}>
          <View style={styles.cardBadgeRow}>
            <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}20` }]}>
              <Text style={[styles.subjectBadgeText, { color: subjectColor }]}>{subjectLabel}</Text>
            </View>
            {(item as any).gradeLevel && (() => {
              const label = GRADE_LABELS[(item as any).gradeLevel] ?? (item as any).gradeLevel;
              return (
                <View style={[styles.gradeBadge, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
                  <Text style={{ fontSize: 10 }}>📚</Text>
                  <Text style={[styles.gradeBadgeText, { color: colors.primary }]}>{label}</Text>
                </View>
              );
            })()}
          </View>
          <Text style={[styles.problemText, { color: colors.foreground }]} numberOfLines={2}>
            {cleanMathText(item.problem)}
          </Text>
          <View style={styles.answerRow}>
            <IconSymbol size={12} name="checkmark.circle.fill" color={colors.success} />
            <Text style={[styles.answerText, { color: colors.success }]} numberOfLines={1}>
              {cleanMathText(item.answer)}
            </Text>
          </View>
          <Text style={[styles.timeText, { color: colors.muted }]}>
            {formatTime(item.solvedAt)}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <TouchableOpacity
            onPress={onBookmark}
            style={{ padding: 6, marginBottom: 4 }}
          >
            <IconSymbol
              size={18}
              name={bookmarkedIds.has(item.problem) ? "bookmark.fill" : "bookmark"}
              color={bookmarkedIds.has(item.problem) ? colors.warning : colors.muted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onShareDirect(item)}
            style={{ padding: 6, marginTop: 4 }}
          >
            <IconSymbol size={18} name="paperplane.fill" color={shareCounts[item.id] ? colors.primary : colors.muted} />
            {shareCounts[item.id] ? (
              <Text style={{ fontSize: 9, color: colors.primary, fontWeight: "600", marginTop: 1 }}>
                {shareCounts[item.id]}
              </Text>
            ) : null}
          </TouchableOpacity>
          <IconSymbol size={18} name="chevron.right" color={colors.muted} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function HistoryScreenContent() {
  const colors = useColors();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState<MathSubject | "all">("all");
  const [filterGrade, setFilterGrade] = useState<string | "all">("all");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shareCounts, setShareCounts] = useState<Record<string, number>>({});

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem("math_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
      const bm = await getBookmarks();
      setBookmarkedIds(new Set(bm.map((b) => b.problem)));
      const sc = await AsyncStorage.getItem("history_share_counts");
      if (sc) setShareCounts(JSON.parse(sc));
    } catch (_) {
      // ignore
    } finally {
      setHistoryLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    H.impactLight();
    setRefreshing(true);
    loadHistory();
  };

  const handleQuickBookmark = async (item: HistoryItem) => {
    H.impactLight();
    await toggleBookmark(item);
    const bm = await getBookmarks();
    setBookmarkedIds(new Set(bm.map((b) => b.problem)));
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const handleDelete = (id: string) => {
    Alert.alert("Delete", "Remove this problem from history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          H.impactMedium();
          const updated = history.filter((item) => item.id !== id);
          setHistory(updated);
          await AsyncStorage.setItem("math_history", JSON.stringify(updated));
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert("Clear History", "Delete all solved problems?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          setHistory([]);
          await AsyncStorage.removeItem("math_history");
        },
      },
    ]);
  };

  const handleViewSolution = (item: HistoryItem) => {
    router.push({
      pathname: "/solution",
      params: {
        data: JSON.stringify({
          problem: item.problem,
          subject: item.subject,
          answer: item.answer,
          steps: item.steps,
          conceptExplained: item.conceptExplained,
          tips: item.tips,
        }),
      },
    });
  };

  const handleShareDirect = async (item: HistoryItem) => {
    H.impactLight();
    try {
      const result = await Share.share({
        message: `I solved this on TutorSnap!\n\n${item.problem}\n\nAnswer: ${item.answer}\n\nDownload TutorSnap to solve problems instantly.`,
        title: "TutorSnap Solution",
      });
      if (result.action === Share.sharedAction) {
        H.notificationSuccess();
        const updated = { ...shareCounts, [item.id]: (shareCounts[item.id] || 0) + 1 };
        setShareCounts(updated);
        await AsyncStorage.setItem("history_share_counts", JSON.stringify(updated));
      }
    } catch {}
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === "all" || item.subject === filterSubject;
    const matchesGrade = filterGrade === "all" || (item as any).gradeLevel === filterGrade;
    return matchesSearch && matchesSubject && matchesGrade;
  });

  const uniqueSubjects = Array.from(new Set(history.map((h) => h.subject)));
  const uniqueGrades = Array.from(
    new Set(
      history
        .map((h) => (h as any).gradeLevel as string | null | undefined)
        .filter((g): g is string => !!g)
    )
  );

  const { getEntering } = useAnimatedList({ staggerMs: 45, durationMs: 280 });

  const renderItem = ({ item, index }: { item: HistoryItem; index: number }) => {
    const subjectColor = getSubjectColor(item.subject);
    const subjectLabel = getSubjectLabel(item.subject);

    return (
      <HistoryCard
        item={item}
        index={index}
        subjectColor={subjectColor}
        subjectLabel={subjectLabel}
        bookmarkedIds={bookmarkedIds}
        shareCounts={shareCounts}
        colors={colors}
        getEntering={getEntering}
        onPress={() => handleViewSolution(item)}
        onLongPress={() => handleDelete(item.id)}
        onBookmark={() => handleQuickBookmark(item)}
        onShareDirect={handleShareDirect}
      />
    );
  };

  const ListHeader = (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => {
            H.impactLight();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/(tabs)/index" as any);
            }
          }} style={styles.backBtn}
            accessibilityLabel="Go back" accessibilityHint="Returns to the previous screen">
            <IconSymbol size={24} name="chevron.left" color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
          {history.length > 0 && (
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <TouchableOpacity onPress={() => router.push("/bookmarks" as any)} style={styles.clearAllBtn}
                accessibilityLabel="View bookmarks">
                <IconSymbol size={20} name="bookmark.fill" color={colors.warning} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}
                accessibilityLabel="Clear" accessibilityHint="Removes the current input">
                <Text style={[styles.clearAllText, { color: colors.error }]}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {history.length} problem{history.length !== 1 ? "s" : ""} solved
        </Text>
      </View>

      {history.length > 0 && (
        <>
          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol size={18} name="magnifyingglass" color={colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search problems..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}
                accessibilityLabel="Toggle search query">
                <IconSymbol size={16} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Grade Level Filter */}
          {uniqueGrades.length > 0 && (
            <View style={styles.filterRow}>
              <TouchableOpacity
                accessibilityLabel="Show all grade levels"
                onPress={() => setFilterGrade("all")}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterGrade === "all" ? colors.primary : colors.surface,
                    borderColor: filterGrade === "all" ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.filterChipText, { color: filterGrade === "all" ? "#FFFFFF" : colors.foreground }]}>
                  All Levels
                </Text>
              </TouchableOpacity>
              {uniqueGrades.map((grade) => {
                const isSelected = filterGrade === grade;
                const label = GRADE_LABELS[grade] ?? grade;
                return (
                  <TouchableOpacity
                    key={grade}
                    accessibilityLabel={`Filter by ${label}`}
                    onPress={() => setFilterGrade(isSelected ? "all" : grade)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? `${colors.primary}20` : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.filterChipText, { color: isSelected ? colors.primary : colors.foreground }]}>
                      📚 {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Subject Filter */}
          {uniqueSubjects.length > 1 && (
            <View style={styles.filterRow}>
              <TouchableOpacity
                accessibilityLabel="Toggle filter subject"
                onPress={() => setFilterSubject("all")}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterSubject === "all" ? colors.primary : colors.surface,
                    borderColor: filterSubject === "all" ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: filterSubject === "all" ? "#FFFFFF" : colors.foreground },
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {uniqueSubjects.map((subject) => {
                const isSelected = filterSubject === subject;
                const color = getSubjectColor(subject);
                return (
                  <TouchableOpacity
                    accessibilityLabel="Toggle filter subject"
                    key={subject}
                    onPress={() => setFilterSubject(isSelected ? "all" : subject)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? `${color}20` : colors.surface,
                        borderColor: isSelected ? color : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isSelected ? color : colors.foreground },
                      ]}
                    >
                      {getSubjectLabel(subject)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );

  if (historyLoading) {
    return (
      <ScreenContainer>
        <HistorySkeletonList rows={7} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {filteredHistory.length === 0 ? (
        <FlatList
          data={[]}
          keyExtractor={(item) => item}
          renderItem={null}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            history.length === 0
              ? <EmptyState variant="history" onAction={() => router.push("/")} />
              : <View style={{ padding: 32, alignItems: "center" }}><Text style={{ color: colors.muted, fontSize: 15 }}>No results found. Try a different search or filter.</Text></View>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
    </ScreenContainer>
  );
}

export default function HistoryScreen() {
  return (
    <ErrorBoundary label="History">
      <HistoryScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, flex: 1 },
  backBtn: { padding: 8, marginLeft: -8 },
  clearAllBtn: { padding: 4 },
  clearAllText: { fontSize: 14, fontWeight: "600" },
  subtitle: { fontSize: 14, marginTop: 4 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardLeft: { flex: 1, gap: 6 },
  cardRight: { paddingLeft: 8 },
  subjectBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  problemText: { fontSize: 15, fontWeight: "500", lineHeight: 22 },
  answerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  answerText: { fontSize: 13, fontWeight: "600", flex: 1 },
  timeText: { fontSize: 12 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  cardBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 },
  gradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  gradeBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
});
