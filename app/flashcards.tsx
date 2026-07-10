import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
  Animated,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getBookmarks } from "@/lib/bookmarks";
import type { HistoryItem } from "@/shared/types";
import { getSubjectDef } from "@/lib/subjects";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = 320;

// ─── Flip Card ────────────────────────────────────────────────────────────────

function FlipCard({
  item,
  colors,
}: {
  item: HistoryItem;
  colors: ReturnType<typeof useColors>;
}) {
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const subjectDef = getSubjectDef(item.subject as any);
  const subjectColor = subjectDef?.color ?? colors.primary;

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const handleFlip = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = flipped ? 0 : 180;
    Animated.spring(flipAnim, {
      toValue,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  return (
    <TouchableOpacity onPress={handleFlip} activeOpacity={0.95} style={styles.cardWrapper}>
      {/* Front: Question */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: `${subjectColor}40`,
            backfaceVisibility: "hidden",
            transform: [{ rotateY: frontInterpolate }],
          },
        ]}
      >
        <View style={[styles.cardBadge, { backgroundColor: `${subjectColor}15` }]}>
          <Text style={[styles.cardBadgeText, { color: subjectColor }]}>
            {subjectDef?.emoji ?? "📚"} {subjectDef?.label ?? item.subject}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardHint, { color: colors.muted }]}>QUESTION</Text>
          <Text style={[styles.cardQuestion, { color: colors.foreground }]} numberOfLines={8}>
            {item.problem}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={[styles.tapHint, { color: colors.muted }]}>Tap to reveal answer</Text>
          <IconSymbol size={16} name="arrow.left.and.right" color={colors.muted} />
        </View>
      </Animated.View>

      {/* Back: Answer */}
      <Animated.View
        style={[
          styles.card,
          styles.cardBack,
          {
            backgroundColor: `${subjectColor}08`,
            borderColor: `${subjectColor}40`,
            backfaceVisibility: "hidden",
            transform: [{ rotateY: backInterpolate }],
          },
        ]}
      >
        <View style={[styles.cardBadge, { backgroundColor: `${subjectColor}15` }]}>
          <Text style={[styles.cardBadgeText, { color: subjectColor }]}>ANSWER</Text>
        </View>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.cardAnswer, { color: colors.foreground }]}>
            {item.answer}
          </Text>
          {item.steps && item.steps.length > 0 && (
            <View style={styles.stepsPreview}>
              <Text style={[styles.stepsLabel, { color: colors.muted }]}>
                {item.steps.length} step{item.steps.length !== 1 ? "s" : ""} in solution
              </Text>
            </View>
          )}
        </ScrollView>
        <View style={styles.cardFooter}>
          <Text style={[styles.tapHint, { color: colors.muted }]}>Tap to see question</Text>
          <IconSymbol size={16} name="arrow.left.and.right" color={colors.muted} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FlashcardsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<HistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getBookmarks().then((bm) => {
        setBookmarks(bm);
        setCurrentIndex(0);
        setSessionDone(false);
        setKnownCount(0);
        setReviewCount(0);
      });
    }, [])
  );

  const handleKnow = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setKnownCount((c) => c + 1);
    advance();
  };

  const handleReview = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReviewCount((c) => c + 1);
    advance();
  };

  const advance = () => {
    if (currentIndex + 1 >= bookmarks.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const restart = () => {
    setCurrentIndex(0);
    setSessionDone(false);
    setKnownCount(0);
    setReviewCount(0);
  };

  const current = bookmarks[currentIndex];
  const progress = bookmarks.length > 0 ? (currentIndex / bookmarks.length) * 100 : 0;

  const handleShareDeck = async () => {
    if (bookmarks.length === 0) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lines: string[] = [
      "TutorSnap Flashcard Deck",
      `Exported: ${new Date().toLocaleDateString()}`,
      `Total cards: ${bookmarks.length}`,
      "",
      "─".repeat(40),
    ];
    bookmarks.forEach((item, idx) => {
      lines.push("");
      lines.push(`Card ${idx + 1} — ${item.subject ?? "General"}`);
      lines.push(`Q: ${item.problem}`);
      lines.push(`A: ${item.answer}`);
      if (item.steps && item.steps.length > 0) {
        lines.push("Steps:");
        (item.steps as unknown as string[]).forEach((step, si) => {
          const stepText = typeof step === "string" ? step : (step as any).text ?? JSON.stringify(step);
          lines.push(`  ${si + 1}. ${stepText}`);
        });
      }
      lines.push("─".repeat(40));
    });
    const content = lines.join("\n");
    try {
      if (Platform.OS === "web") {
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tutorsnap_flashcards.txt";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const fileUri = (FileSystem.documentDirectory ?? "") + "tutorsnap_flashcards.txt";
        await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, { mimeType: "text/plain", dialogTitle: "Share Flashcard Deck" });
        }
      }
    } catch { /* ignore */ }
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Flashcards</Text>
          {!sessionDone && bookmarks.length > 0 && (
            <Text style={[styles.navSubtitle, { color: colors.muted }]}>
              {currentIndex + 1} / {bookmarks.length}
            </Text>
          )}
        </View>
        <TouchableOpacity
          accessibilityLabel="Share"
          onPress={handleShareDeck}
          style={[styles.shareBtn, { backgroundColor: `${colors.primary}15` }]}
          disabled={bookmarks.length === 0}
          activeOpacity={0.7}
        >
          <IconSymbol size={18} name="square.and.arrow.up.fill" color={bookmarks.length === 0 ? colors.muted : colors.primary} />
        </TouchableOpacity>
      </View>

      {bookmarks.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔖</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Bookmarks Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Bookmark solutions from the solution screen to review them here as flashcards.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.emptyBtnText}>Go Solve Something</Text>
          </TouchableOpacity>
        </View>
      ) : sessionDone ? (
        /* Session complete */
        <View style={styles.doneState}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>Session Complete!</Text>
          <Text style={[styles.doneSubtitle, { color: colors.muted }]}>
            You reviewed all {bookmarks.length} flashcard{bookmarks.length !== 1 ? "s" : ""}.
          </Text>
          <View style={styles.doneStats}>
            <View style={[styles.doneStat, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` }]}>
              <Text style={[styles.doneStatValue, { color: colors.success }]}>{knownCount}</Text>
              <Text style={[styles.doneStatLabel, { color: colors.muted }]}>Got it</Text>
            </View>
            <View style={[styles.doneStat, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}30` }]}>
              <Text style={[styles.doneStatValue, { color: colors.warning }]}>{reviewCount}</Text>
              <Text style={[styles.doneStatLabel, { color: colors.muted }]}>Review again</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={restart}
            style={[styles.restartBtn, { backgroundColor: colors.primary }]}
          >
            <IconSymbol size={18} name="arrow.counterclockwise" color="#FFFFFF" />
            <Text style={styles.restartBtnText}>Study Again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={[styles.doneBack, { color: colors.muted }]}>Back to Bookmarks</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Active session */
        <View style={{ flex: 1 }}>
          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: `${colors.primary}20` }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${progress}%` },
              ]}
            />
          </View>

          {/* Card */}
          <View style={styles.cardContainer}>
            {current && <FlipCard key={current.id} item={current} colors={colors} />}
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleReview}
              style={[styles.actionBtn, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40` }]}
              activeOpacity={0.8}
            >
              <IconSymbol size={20} name="arrow.counterclockwise" color={colors.warning} />
              <Text style={[styles.actionBtnText, { color: colors.warning }]}>Review Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleKnow}
              style={[styles.actionBtn, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}40` }]}
              activeOpacity={0.8}
            >
              <IconSymbol size={20} name="checkmark.circle.fill" color={colors.success} />
              <Text style={[styles.actionBtnText, { color: colors.success }]}>Got It!</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.flipHint, { color: colors.muted }]}>
            Tap the card to flip it
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "700" },
  navSubtitle: { fontSize: 12, marginTop: 1 },
  progressTrack: {
    height: 4,
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2 },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    elevation: 4,
    ...Platform.select({
      native: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      web: { boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
    }),
  },
  cardBack: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  cardBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 16,
  },
  cardBadgeText: { fontSize: 12, fontWeight: "700" },
  cardBody: { flex: 1 },
  cardHint: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 10 },
  cardQuestion: { fontSize: 18, fontWeight: "600", lineHeight: 26 },
  cardAnswer: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
  stepsPreview: { marginTop: 12 },
  stepsLabel: { fontSize: 12 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  tapHint: { fontSize: 12 },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 15, fontWeight: "700" },
  flipHint: { textAlign: "center", fontSize: 12, marginBottom: 16 },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  emptySubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  // Done state
  doneState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  doneEmoji: { fontSize: 64, marginBottom: 8 },
  doneTitle: { fontSize: 26, fontWeight: "800" },
  doneSubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  doneStats: { flexDirection: "row", gap: 16, marginTop: 8 },
  doneStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 4,
  },
  doneStatValue: { fontSize: 32, fontWeight: "800" },
  doneStatLabel: { fontSize: 13, fontWeight: "600" },
  restartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  restartBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  doneBack: { fontSize: 14 },
  shareBtn: { padding: 8, borderRadius: 20 },
});
