import React, { useState, useCallback } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toggleBookmark, getBookmarks } from "@/lib/bookmarks";
import type { HistoryItem, MathSubject } from "@/shared/types";
import { getSubjectColor, getSubjectLabel } from "@/lib/subjects";

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

function HistoryScreenContent() {
  const colors = useColors();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState<MathSubject | "all">("all");

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem("math_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
      const bm = await getBookmarks();
      setBookmarkedIds(new Set(bm.map((b) => b.problem)));
    } catch (e) {
      // ignore
    }
  };

  const handleQuickBookmark = async (item: HistoryItem) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
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

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === "all" || item.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const uniqueSubjects = Array.from(new Set(history.map((h) => h.subject)));

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const subjectColor = getSubjectColor(item.subject);
    const subjectLabel = getSubjectLabel(item.subject);

    return (
      <TouchableOpacity
        onPress={() => handleViewSolution(item)}
        onLongPress={() => handleDelete(item.id)}
        style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.75}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}20` }]}>
            <Text style={[styles.subjectBadgeText, { color: subjectColor }]}>{subjectLabel}</Text>
          </View>
          <Text style={[styles.problemText, { color: colors.foreground }]} numberOfLines={2}>
            {item.problem}
          </Text>
          <View style={styles.answerRow}>
            <IconSymbol size={12} name="checkmark.circle.fill" color={colors.success} />
            <Text style={[styles.answerText, { color: colors.success }]} numberOfLines={1}>
              {item.answer}
            </Text>
          </View>
          <Text style={[styles.timeText, { color: colors.muted }]}>
            {formatTime(item.solvedAt)}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <TouchableOpacity
            onPress={() => handleQuickBookmark(item)}
            style={{ padding: 6, marginBottom: 4 }}
          >
            <IconSymbol
              size={18}
              name={bookmarkedIds.has(item.problem) ? "bookmark.fill" : "bookmark"}
              color={bookmarkedIds.has(item.problem) ? colors.warning : colors.muted}
            />
          </TouchableOpacity>
          <IconSymbol size={18} name="chevron.right" color={colors.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
          {history.length > 0 && (
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <TouchableOpacity onPress={() => router.push("/bookmarks" as any)} style={styles.clearAllBtn}>
                <IconSymbol size={20} name="bookmark.fill" color={colors.warning} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}>
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
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <IconSymbol size={16} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Subject Filter */}
          {uniqueSubjects.length > 1 && (
            <View style={styles.filterRow}>
              <TouchableOpacity
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

      {filteredHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
            <IconSymbol size={40} name="clock.fill" color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {history.length === 0 ? "No History Yet" : "No Results Found"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            {history.length === 0
              ? "Solve your first problem to see it here"
              : "Try a different search or filter"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
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
});
