import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  ScrollView,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Swipeable from "react-native-gesture-handler/Swipeable";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getBookmarks, removeBookmark } from "@/lib/bookmarks";
import type { HistoryItem } from "@/shared/types";
import { getSubjectColor, getSubjectLabel, getSubjectEmoji, ALL_SUBJECTS } from "@/lib/subjects";

// Sort options
type SortKey = "newest" | "oldest" | "subject" | "steps";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "subject", label: "Subject" },
  { key: "steps", label: "Most Steps" },
];

export default function BookmarksScreen() {
  const colors = useColors();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const loadBookmarks = async () => {
    try {
      const bm = await getBookmarks();
      setBookmarks(bm);
    } catch {
      // getBookmarks swallows errors internally; this is a safety net
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

  // Derive unique subjects present in bookmarks
  const presentSubjects = useMemo(() => {
    const seen = new Set<string>();
    bookmarks.forEach((b) => { if (b.subject) seen.add(b.subject); });
    return Array.from(seen);
  }, [bookmarks]);

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = bookmarks.filter((item) => {
      const matchesSubject = activeSubject === "all" || item.subject === activeSubject;
      if (!q) return matchesSubject;
      const matchesSearch =
        item.problem.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        getSubjectLabel(item.subject).toLowerCase().includes(q);
      return matchesSubject && matchesSearch;
    });

    switch (sortKey) {
      case "oldest":
        result = [...result].sort((a, b) => (a.solvedAt ?? 0) - (b.solvedAt ?? 0));
        break;
      case "subject":
        result = [...result].sort((a, b) => getSubjectLabel(a.subject).localeCompare(getSubjectLabel(b.subject)));
        break;
      case "steps":
        result = [...result].sort((a, b) => (b.steps?.length ?? 0) - (a.steps?.length ?? 0));
        break;
      default: // newest
        result = [...result].sort((a, b) => (b.solvedAt ?? 0) - (a.solvedAt ?? 0));
    }
    return result;
  }, [bookmarks, search, activeSubject, sortKey]);

  const handleDelete = (id: string) => {
    Alert.alert("Remove Bookmark", "Remove this problem from bookmarks?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          H.impactMedium();
          try {
            await removeBookmark(id);
            await loadBookmarks();
          } catch {
            Alert.alert("Error", "Could not remove bookmark. Please try again.");
          }
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

  const handleSubjectFilter = (subject: string) => {
    H.impactLight()
    setActiveSubject(subject);
  };

  const handleSortSelect = (key: SortKey) => {
    H.impactLight()
    setSortKey(key);
    setShowSortMenu(false);
  };

  const renderRightActions = (item: HistoryItem) => (
    <TouchableOpacity
      accessibilityLabel="Delete"
      onPress={() => handleDelete(item.id)}
      style={styles.swipeDeleteBtn}
      activeOpacity={0.85}
    >
      <IconSymbol size={22} name="trash.fill" color="#FFFFFF" />
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const subjectColor = getSubjectColor(item.subject);
    const subjectLabel = getSubjectLabel(item.subject);
    const subjectEmoji = getSubjectEmoji(item.subject);
    const date = item.solvedAt
      ? new Date(item.solvedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "";

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        rightThreshold={60}
        overshootRight={false}
        friction={2}
      >
      <TouchableOpacity
        onPress={() => handleViewSolution(item)}
        style={[styles.bookmarkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.75}
      >
        <View style={[styles.bookmarkAccent, { backgroundColor: subjectColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}20` }]}>
              <Text style={styles.subjectEmoji}>{subjectEmoji}</Text>
              <Text style={[styles.subjectBadgeText, { color: subjectColor }]}>{subjectLabel}</Text>
            </View>
            <View style={styles.cardTopRight}>
              {date ? <Text style={[styles.dateText, { color: colors.muted }]}>{date}</Text> : null}
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.removeBtn}
                accessibilityLabel="Delete">
                <IconSymbol size={16} name="bookmark.fill" color={colors.warning} />
              </TouchableOpacity>
            </View>
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
          <View style={styles.cardFooter}>
            <Text style={[styles.stepsCount, { color: colors.muted }]}>
              {item.steps?.length || 0} steps
            </Text>
            <TouchableOpacity
              accessibilityLabel="Go to practice"
              onPress={(e) => {
                e.stopPropagation();
                router.push({ pathname: "/(tabs)/practice", params: { subject: item.subject } } as any);
              }}
              style={[styles.practiceSimilarBtn, { backgroundColor: `${subjectColor}15`, borderColor: `${subjectColor}40` }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.practiceSimilarText, { color: subjectColor }]}>Practice Similar</Text>
            </TouchableOpacity>
            <IconSymbol size={14} name="chevron.right" color={colors.muted} />
          </View>
        </View>
      </TouchableOpacity>
      </Swipeable>
    );
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Sort";

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={24} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Bookmarks</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {bookmarks.length} saved solution{bookmarks.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="View flashcards"
          onPress={() => router.push("/flashcards" as any)}
          style={[styles.flashcardBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16 }}>🃏</Text>
        </TouchableOpacity>
      </View>

      {bookmarks.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.warning}15` }]}>
            <Text style={{ fontSize: 40 }}>🔖</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Bookmarks Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Bookmark solutions you want to review later. Tap the bookmark icon on any solution screen.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.startBtnText}>Solve a Problem</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Search Bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol size={17} name="magnifyingglass" color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search bookmarks..."
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.foreground }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && Platform.OS !== "ios" && (
              <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}
                accessibilityLabel="Clear search">
                <IconSymbol size={17} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Subject Filter Chips + Sort */}
          <View style={styles.filterRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}
            >
              <TouchableOpacity
                onPress={() => handleSubjectFilter("all")}
                activeOpacity={0.7}
                style={[
                  styles.chip,
                  {
                    backgroundColor: activeSubject === "all" ? colors.primary : colors.surface,
                    borderColor: activeSubject === "all" ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: activeSubject === "all" ? "#FFFFFF" : colors.foreground }]}>
                  All
                </Text>
              </TouchableOpacity>
              {presentSubjects.map((subj) => {
                const color = getSubjectColor(subj);
                const label = getSubjectLabel(subj);
                const emoji = getSubjectEmoji(subj);
                const isActive = activeSubject === subj;
                return (
                  <TouchableOpacity
                    key={subj}
                    onPress={() => handleSubjectFilter(subj)}
                    activeOpacity={0.7}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isActive ? color : colors.surface,
                        borderColor: isActive ? color : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.chipEmoji}>{emoji}</Text>
                    <Text style={[styles.chipText, { color: isActive ? "#FFFFFF" : colors.foreground }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Sort Button */}
            <TouchableOpacity
              accessibilityLabel="Toggle show sort menu"
              onPress={() => setShowSortMenu(!showSortMenu)}
              style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <IconSymbol size={15} name="list.bullet" color={colors.muted} />
              <Text style={[styles.sortBtnText, { color: colors.muted }]}>{currentSortLabel}</Text>
            </TouchableOpacity>
          </View>

          {/* Sort Dropdown */}
          {showSortMenu && (
            <View style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  accessibilityLabel="Sort"
                  key={opt.key}
                  onPress={() => handleSortSelect(opt.key)}
                  style={[styles.sortMenuItem, sortKey === opt.key && { backgroundColor: `${colors.primary}10` }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sortMenuItemText, { color: sortKey === opt.key ? colors.primary : colors.foreground }]}>
                    {opt.label}
                  </Text>
                  {sortKey === opt.key && (
                    <IconSymbol size={15} name="checkmark.circle.fill" color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Result count */}
          {(search || activeSubject !== "all") && (
            <Text style={[styles.resultCount, { color: colors.muted }]}>
              {filtered.length} of {bookmarks.length} bookmarks
            </Text>
          )}

          {/* Empty search result */}
          {filtered.length === 0 ? (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchEmoji}>🔍</Text>
              <Text style={[styles.emptySearchTitle, { color: colors.foreground }]}>No results</Text>
              <Text style={[styles.emptySearchDesc, { color: colors.muted }]}>
                Try a different keyword or subject filter.
              </Text>
              <TouchableOpacity
                accessibilityLabel="Toggle search"
                onPress={() => { setSearch(""); setActiveSubject("all"); }}
                style={[styles.clearBtn, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.clearBtnText, { color: colors.foreground }]}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  flashcardBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingRight: 12,
  },
  chipScroll: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipEmoji: { fontSize: 13 },
  chipText: { fontSize: 12, fontWeight: "600" },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  sortBtnText: { fontSize: 12, fontWeight: "600" },
  sortMenu: {
    position: "absolute",
    right: 12,
    top: 140,
    zIndex: 100,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    minWidth: 140,
  },
  sortMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  sortMenuItemText: { fontSize: 14, fontWeight: "600" },
  resultCount: {
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 2,
  },
  bookmarkCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  bookmarkAccent: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 8 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTopRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectEmoji: { fontSize: 12 },
  subjectBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  dateText: { fontSize: 11 },
  removeBtn: { padding: 4 },
  problemText: { fontSize: 15, fontWeight: "500", lineHeight: 22 },
  answerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  answerText: { fontSize: 13, fontWeight: "600", flex: 1 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stepsCount: { fontSize: 12 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptySubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  startBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  startBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  emptySearch: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptySearchEmoji: { fontSize: 40, marginBottom: 8 },
  emptySearchTitle: { fontSize: 18, fontWeight: "700" },
  emptySearchDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  clearBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearBtnText: { fontSize: 14, fontWeight: "600" },
  swipeDeleteBtn: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 16,
    marginLeft: 8,
    gap: 4,
  },
  swipeDeleteText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  practiceSimilarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  practiceSimilarText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
