import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getBookmarks, removeBookmark } from "@/lib/bookmarks";
import type { HistoryItem } from "@/shared/types";

const SUBJECT_COLORS: Record<string, string> = {
  algebra: "#6C3CE1",
  calculus: "#3B82F6",
  geometry: "#10B981",
  trigonometry: "#F97316",
  statistics: "#EC4899",
  arithmetic: "#8B5CF6",
  linear_algebra: "#06B6D4",
  differential_equations: "#EF4444",
  number_theory: "#F59E0B",
  other: "#6B7280",
};

const SUBJECT_LABELS: Record<string, string> = {
  algebra: "Algebra",
  calculus: "Calculus",
  geometry: "Geometry",
  trigonometry: "Trig",
  statistics: "Stats",
  arithmetic: "Arithmetic",
  linear_algebra: "Lin. Algebra",
  differential_equations: "Diff. Eq.",
  number_theory: "Number Theory",
  other: "Math",
};

export default function BookmarksScreen() {
  const colors = useColors();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<HistoryItem[]>([]);

  const loadBookmarks = async () => {
    const bm = await getBookmarks();
    setBookmarks(bm);
  };

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

  const handleDelete = (id: string) => {
    Alert.alert("Remove Bookmark", "Remove this problem from bookmarks?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          await removeBookmark(id);
          await loadBookmarks();
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

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const subjectColor = SUBJECT_COLORS[item.subject] || SUBJECT_COLORS.other;
    const subjectLabel = SUBJECT_LABELS[item.subject] || "Math";

    return (
      <TouchableOpacity
        onPress={() => handleViewSolution(item)}
        onLongPress={() => handleDelete(item.id)}
        style={[styles.bookmarkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.75}
      >
        <View style={[styles.bookmarkAccent, { backgroundColor: subjectColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}20` }]}>
              <Text style={[styles.subjectBadgeText, { color: subjectColor }]}>{subjectLabel}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.removeBtn}
            >
              <IconSymbol size={16} name="bookmark.fill" color={colors.warning} />
            </TouchableOpacity>
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
            <IconSymbol size={14} name="chevron.right" color={colors.muted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
        <View style={{ width: 40 }} />
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
        <FlatList
          data={bookmarks}
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
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2 },
  bookmarkCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  bookmarkAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subjectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
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
});
