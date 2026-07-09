import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { toggleBookmark, isBookmarked } from "@/lib/bookmarks";
import type { MathSolution, SolutionStep, HistoryItem, MathSubject } from "@/shared/types";
import { getSubjectColor, getSubjectLabel } from "@/lib/subjects";

function StepCard({ step, colors }: { step: SolutionStep; colors: any }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
      style={[styles.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.stepHeader}>
        <View style={[styles.stepNumber, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={[styles.stepNumberText, { color: colors.primary }]}>{step.stepNumber}</Text>
        </View>
        <Text style={[styles.stepTitle, { color: colors.foreground }]} numberOfLines={expanded ? undefined : 1}>
          {step.title}
        </Text>
        <IconSymbol
          size={18}
          name={expanded ? "chevron.up" : "chevron.down"}
          color={colors.muted}
        />
      </View>
      {expanded && (
        <View style={styles.stepBody}>
          {step.expression && (
            <View style={[styles.expressionBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
              <Text style={[styles.expressionText, { color: colors.primary }]}>{step.expression}</Text>
            </View>
          )}
          <Text style={[styles.stepExplanation, { color: colors.foreground }]}>{step.explanation}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SolutionScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [bookmarked, setBookmarked] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  let solution: MathSolution | null = null;
  try {
    solution = JSON.parse(params.data as string);
  } catch {
    solution = null;
  }

  useEffect(() => {
    if (solution?.problem) {
      isBookmarked(solution.problem).then(setBookmarked);
    }
  }, [solution?.problem]);

  if (!solution) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.foreground, fontSize: 16 }}>No solution data found</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const subjectColor = getSubjectColor(solution.subject);
  const subjectLabel = getSubjectLabel(solution.subject);

  const handleShare = async () => {
    const text = `Question: ${solution!.problem}\n\nAnswer: ${solution!.answer}\n\nSolved with TutorSnap`;
    try {
      await Share.share({ message: text });
    } catch (e) {
      // ignore
    }
  };

  const handleCopyAnswer = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    try {
      await Clipboard.setStringAsync(solution!.answer);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    } catch (e) {
      // ignore
    }
  };

  const handleBookmark = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const historyItem: HistoryItem = {
      id: `bm-${Date.now()}`,
      problem: solution!.problem,
      answer: solution!.answer,
      subject: solution!.subject as MathSubject,
      steps: solution!.steps || [],
      conceptExplained: solution!.conceptExplained,
      tips: solution!.tips,
      solvedAt: Date.now(),
    };
    const added = await toggleBookmark(historyItem);
    setBookmarked(added);
    if (added && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Solution</Text>
        <View style={styles.navActions}>
          {/* Bookmark Button */}
          <TouchableOpacity onPress={handleBookmark} style={styles.navActionBtn}>
            <IconSymbol
              size={22}
              name={bookmarked ? "bookmark.fill" : "bookmark"}
              color={bookmarked ? colors.warning : colors.muted}
            />
          </TouchableOpacity>
          {/* Share Button */}
          <TouchableOpacity onPress={handleShare} style={styles.navActionBtn}>
            <IconSymbol size={22} name="square.and.arrow.up" color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Subject Badge + Bookmark indicator */}
        <View style={styles.badgeRow}>
          <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}20` }]}>
            <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
            <Text style={[styles.subjectBadgeText, { color: subjectColor }]}>{subjectLabel}</Text>
          </View>
          {bookmarked && (
            <View style={[styles.bookmarkedBadge, { backgroundColor: `${colors.warning}20`, borderColor: `${colors.warning}40` }]}>
              <Text style={{ fontSize: 12 }}>🔖</Text>
              <Text style={[styles.bookmarkedText, { color: colors.warning }]}>Bookmarked</Text>
            </View>
          )}
        </View>

        {/* Problem */}
        <View style={[styles.problemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.problemLabel, { color: colors.muted }]}>PROBLEM</Text>
          <Text style={[styles.problemText, { color: colors.foreground }]}>{solution.problem}</Text>
        </View>

        {/* Answer */}
        <View style={[styles.answerCard, { backgroundColor: `${subjectColor}15`, borderColor: `${subjectColor}40` }]}>
          <View style={styles.answerHeader}>
            <View style={styles.answerLabelRow}>
              <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
              <Text style={[styles.answerLabel, { color: colors.success }]}>ANSWER</Text>
            </View>
            <TouchableOpacity onPress={handleCopyAnswer} style={[styles.copyBtn, { backgroundColor: copyFeedback ? `${colors.success}20` : "transparent" }]}>
              <IconSymbol size={16} name="doc.on.doc" color={copyFeedback ? colors.success : colors.muted} />
              <Text style={[styles.copyText, { color: copyFeedback ? colors.success : colors.muted }]}>
                {copyFeedback ? "Copied!" : "Copy"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.answerText, { color: colors.foreground }]}>{solution.answer}</Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsSection}>
          <View style={styles.sectionHeader}>
            <IconSymbol size={16} name="list.bullet" color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Step-by-Step Solution
            </Text>
          </View>
          {solution.steps?.map((step, index) => (
            <StepCard key={index} step={step} colors={colors} />
          ))}
        </View>

        {/* Concept Explanation */}
        {solution.conceptExplained && (
          <View style={[styles.conceptCard, { backgroundColor: `${colors.secondary}10`, borderColor: `${colors.secondary}30` }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol size={16} name="brain.head.profile" color={colors.secondary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Key Concept</Text>
            </View>
            <Text style={[styles.conceptText, { color: colors.foreground }]}>{solution.conceptExplained}</Text>
          </View>
        )}

        {/* Tips */}
        {solution.tips && solution.tips.length > 0 && (
          <View style={[styles.tipsCard, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}30` }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol size={16} name="lightbulb.fill" color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pro Tips</Text>
            </View>
            {solution.tips.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: colors.warning }]} />
                <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Related Topics */}
        {solution.relatedTopics && solution.relatedTopics.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={[styles.relatedLabel, { color: colors.muted }]}>Related Topics</Text>
            <View style={styles.relatedChips}>
              {solution.relatedTopics.map((topic, index) => (
                <View
                  key={index}
                  style={[styles.relatedChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.relatedChipText, { color: colors.foreground }]}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={handleBookmark}
            style={[
              styles.actionBtn,
              {
                backgroundColor: bookmarked ? `${colors.warning}20` : colors.surface,
                borderColor: bookmarked ? colors.warning : colors.border,
                flex: 1,
              },
            ]}
            activeOpacity={0.8}
          >
            <IconSymbol size={18} name={bookmarked ? "bookmark.fill" : "bookmark"} color={bookmarked ? colors.warning : colors.muted} />
            <Text style={[styles.actionBtnText, { color: bookmarked ? colors.warning : colors.muted }]}>
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/practice" as any)}
            style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary, flex: 2 }]}
            activeOpacity={0.85}
          >
            <IconSymbol size={18} name="pencil.and.list.clipboard" color="#FFFFFF" />
            <Text style={[styles.actionBtnText, { color: "#FFFFFF" }]}>Practice Similar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  navActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  navActionBtn: { padding: 4 },
  badgeRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  subjectDot: { width: 8, height: 8, borderRadius: 4 },
  subjectBadgeText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  bookmarkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  bookmarkedText: { fontSize: 12, fontWeight: "600" },
  problemCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  problemLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  problemText: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
  answerCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  answerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  answerLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  answerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  copyText: { fontSize: 13, fontWeight: "600" },
  answerText: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  stepsSection: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  stepCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { fontSize: 13, fontWeight: "800" },
  stepTitle: { flex: 1, fontSize: 14, fontWeight: "600" },
  stepBody: { paddingHorizontal: 14, paddingBottom: 14 },
  expressionBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: "center",
  },
  expressionText: { fontSize: 16, fontWeight: "700", fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace" },
  stepExplanation: { fontSize: 14, lineHeight: 22 },
  conceptCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  conceptText: { fontSize: 14, lineHeight: 22 },
  tipsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 22 },
  relatedSection: { paddingHorizontal: 16, marginBottom: 20 },
  relatedLabel: { fontSize: 13, fontWeight: "600", marginBottom: 10, letterSpacing: 0.5 },
  relatedChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relatedChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  relatedChipText: { fontSize: 13, fontWeight: "500" },
  actionRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  actionBtnText: { fontSize: 14, fontWeight: "700" },
});
