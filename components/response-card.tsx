/**
 * ResponseCard — Unified card renderer for all 24 educational card types.
 *
 * Handles:
 *  - Visual design per card type (accent, background, icon, typography)
 *  - Expand/collapse animation
 *  - Step-by-step progress display
 *  - Math expression rendering (via MathRenderer)
 *  - Card action bar (Copy, Bookmark, Share, Read Aloud, Explain Simpler/Detail, Practice Similar)
 *  - Full light and dark mode support
 */

import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Markdown from "react-native-markdown-display";

import { useColors } from "@/hooks/use-colors";
import { MathRenderer } from "@/components/math-renderer";
import { CARD_META, type ResponseCard, type CardType } from "@/lib/response-cards";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ResponseCardProps {
  card: ResponseCard;
  /** Called when user taps "Explain Simpler" */
  onExplainSimpler?: (card: ResponseCard) => void;
  /** Called when user taps "Explain in More Detail" */
  onExplainDetail?: (card: ResponseCard) => void;
  /** Called when user taps "Practice Similar Question" */
  onPracticeSimilar?: (card: ResponseCard) => void;
  /** Called when user taps "Generate Another Example" */
  onGenerateExample?: (card: ResponseCard) => void;
  /** Index in the list — used for staggered entrance animation */
  index?: number;
  /** Whether this card is still streaming (shows shimmer) */
  streaming?: boolean;
}

// ─── Icon map (SF Symbol → Material Icon fallback handled in IconSymbol) ──────

const ICON_MAP: Record<CardType, string> = {
  definition: "📖",
  key_concept: "💡",
  formula: "∑",
  theorem: "🔷",
  rule: "📏",
  important_note: "❗",
  tip: "⭐",
  warning: "⚠️",
  worked_example: "✏️",
  step_by_step: "🔢",
  calculation: "🧮",
  proof: "✅",
  real_world: "🌍",
  common_mistakes: "❌",
  memory_trick: "🧠",
  practice_question: "❓",
  challenge_question: "🔥",
  summary: "📄",
  final_answer: "✅",
  next_steps: "➡️",
  related_concepts: "🔗",
  vocabulary: "📚",
  faq: "💬",
  text: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useEntrance(index: number = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay: Math.min(index * 60, 400),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        delay: Math.min(index * 60, 400),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { opacity, translateY };
}

// ─── Step Row ─────────────────────────────────────────────────────────────────

function StepRow({
  step,
  accent,
  colors,
  isLast,
}: {
  step: { number: number; title: string; content: string; expression?: string };
  accent: string;
  colors: ReturnType<typeof useColors>;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.stepRow}>
      {/* Connector line */}
      {!isLast && <View style={[styles.stepLine, { backgroundColor: accent + "40" }]} />}
      {/* Circle badge */}
      <View style={[styles.stepBadge, { backgroundColor: accent }]}>
        <Text style={styles.stepBadgeText}>{step.number}</Text>
      </View>
      {/* Content */}
      <View style={styles.stepContent}>
        <Pressable
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpanded((v) => !v);
          }}
          style={styles.stepHeader}
        >
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
          <Text style={[styles.stepChevron, { color: accent }]}>{expanded ? "▲" : "▼"}</Text>
        </Pressable>
        {expanded && (
          <View>
            <Text style={[styles.stepBody, { color: colors.muted }]}>{step.content}</Text>
            {step.expression ? (
              <View style={styles.stepExpr}>
                <MathRenderer latex={step.expression!} display={false} />
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── FAQ Row ──────────────────────────────────────────────────────────────────

function FaqRow({
  faq,
  accent,
  colors,
}: {
  faq: { question: string; answer: string };
  accent: string;
  colors: ReturnType<typeof useColors>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.faqRow, { borderColor: accent + "30" }]}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((v) => !v);
        }}
        style={styles.faqQuestion}
      >
        <Text style={[styles.faqQ, { color: colors.foreground }]}>{faq.question}</Text>
        <Text style={[styles.faqChevron, { color: accent }]}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open && <Text style={[styles.faqA, { color: colors.muted }]}>{faq.answer}</Text>}
    </View>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionBtn({
  label,
  emoji,
  accent,
  onPress,
}: {
  label: string;
  emoji: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.actionBtn, { borderColor: accent + "50" }]}
    >
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={[styles.actionLabel, { color: accent }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Practice Answer Reveal ───────────────────────────────────────────────────

function PracticeReveal({
  answer,
  hint,
  accent,
  colors,
}: {
  answer?: string;
  hint?: string;
  accent: string;
  colors: ReturnType<typeof useColors>;
}) {
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <View style={styles.practiceReveal}>
      {hint && !showHint && (
        <TouchableOpacity
          onPress={() => setShowHint(true)}
          style={[styles.revealBtn, { borderColor: accent + "60" }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.revealBtnText, { color: accent }]}>💡 Show Hint</Text>
        </TouchableOpacity>
      )}
      {showHint && hint && (
        <View style={[styles.hintBox, { backgroundColor: accent + "15", borderColor: accent + "30" }]}>
          <Text style={[styles.hintText, { color: colors.foreground }]}>💡 {hint}</Text>
        </View>
      )}
      {answer && !showAnswer && (
        <TouchableOpacity
          onPress={() => setShowAnswer(true)}
          style={[styles.revealBtn, { borderColor: accent + "60", marginTop: 8 }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.revealBtnText, { color: accent }]}>👁 Reveal Answer</Text>
        </TouchableOpacity>
      )}
      {showAnswer && answer && (
        <View style={[styles.answerBox, { backgroundColor: accent + "20", borderColor: accent + "40" }]}>
          <Text style={[styles.answerLabel, { color: accent }]}>Answer</Text>
          <Text style={[styles.answerText, { color: colors.foreground }]}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResponseCardView({
  card,
  onExplainSimpler,
  onExplainDetail,
  onPracticeSimilar,
  onGenerateExample,
  index = 0,
  streaming = false,
}: ResponseCardProps) {
  const colors = useColors();
  const meta = CARD_META[card.type];
  const isDark = colors.background === "#151718" || colors.background.startsWith("#0") || colors.background.startsWith("#1");

  const accent = isDark ? meta.accentDark : meta.accentLight;
  const bg = isDark ? meta.bgDark : meta.bgLight;
  const isTransparent = bg === "transparent";

  const [collapsed, setCollapsed] = useState(meta.defaultCollapsed);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const { opacity, translateY } = useEntrance(index);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    const text = [card.title, card.content, card.expression].filter(Boolean).join("\n\n");
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [card]);

  const handleBookmark = useCallback(async () => {
    const text = [card.title, card.content, card.expression].filter(Boolean).join("\n\n");
    // Save to a dedicated card-bookmarks key in AsyncStorage
    const key = "card_bookmarks";
    const existing = await AsyncStorage.getItem(key);
    const arr: object[] = existing ? JSON.parse(existing) : [];
    arr.unshift({ id: card.id, type: card.type, label: meta.label, title: card.title, text, savedAt: Date.now() });
    await AsyncStorage.setItem(key, JSON.stringify(arr.slice(0, 200)));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBookmarked(true);
  }, [card, meta]);

  const handleShare = useCallback(async () => {
    const text = [card.title, card.content, card.expression, card.items?.join("\n")].filter(Boolean).join("\n\n");
    await Share.share({ message: text });
  }, [card]);

  // ── Render text content ───────────────────────────────────────────────────

  const renderContent = () => {
    if (card.type === "text") {
      return (
        <Markdown
          style={{
            body: { color: colors.foreground, fontSize: 15, lineHeight: 23 },
            strong: { fontWeight: "700", color: colors.foreground },
            em: { fontStyle: "italic", color: colors.muted },
          }}
        >
          {card.content}
        </Markdown>
      );
    }

    return (
      <View>
        {/* Main content */}
        {card.content ? (
          <Text style={[styles.cardContent, { color: colors.foreground }]}>{card.content}</Text>
        ) : null}

        {/* Math expression */}
        {card.expression ? (
          <View style={[styles.exprBox, { backgroundColor: accent + "12", borderColor: accent + "30" }]}>
            <MathRenderer latex={card.expression!} display />
          </View>
        ) : null}

        {/* Steps */}
        {card.steps && card.steps.length > 0 ? (
          <View style={styles.stepsContainer}>
            {card.steps.map((step, i) => (
              <StepRow
                key={i}
                step={step}
                accent={accent}
                colors={colors}
                isLast={i === card.steps!.length - 1}
              />
            ))}
          </View>
        ) : null}

        {/* Items list (next_steps, related_concepts, common_mistakes, vocabulary) */}
        {card.items && card.items.length > 0 ? (
          <View style={styles.itemsList}>
            {card.items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={[styles.itemDot, { backgroundColor: accent }]} />
                <Text style={[styles.itemText, { color: colors.foreground }]}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* FAQs */}
        {card.faqs && card.faqs.length > 0 ? (
          <View style={styles.faqList}>
            {card.faqs.map((faq, i) => (
              <FaqRow key={i} faq={faq} accent={accent} colors={colors} />
            ))}
          </View>
        ) : null}

        {/* Practice / Challenge reveal */}
        {(card.type === "practice_question" || card.type === "challenge_question") && (
          <PracticeReveal answer={card.answer} hint={card.hint} accent={accent} colors={colors} />
        )}
      </View>
    );
  };

  // ── Text card (minimal, no chrome) ────────────────────────────────────────

  if (card.type === "text") {
    return (
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <View style={styles.textCard}>{renderContent()}</View>
      </Animated.View>
    );
  }

  // ── Full card ─────────────────────────────────────────────────────────────

  return (
    <Animated.View style={[styles.cardWrapper, { opacity, transform: [{ translateY }] }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isTransparent ? colors.surface : bg,
            borderColor: accent + "35",
          },
        ]}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accent }]} />

        <View style={styles.cardInner}>
          {/* Header */}
          <Pressable
            onPress={
              meta.collapsible
                ? () => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setCollapsed((v) => !v);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                : undefined
            }
            style={styles.cardHeader}
          >
            <View style={[styles.iconBadge, { backgroundColor: accent + "20" }]}>
              <Text style={styles.iconEmoji}>{ICON_MAP[card.type]}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.cardTypeLabel, { color: accent }]}>{meta.label.toUpperCase()}</Text>
              {card.title ? (
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{card.title}</Text>
              ) : null}
            </View>
            {meta.collapsible && (
              <Text style={[styles.collapseChevron, { color: accent }]}>{collapsed ? "▼" : "▲"}</Text>
            )}
          </Pressable>

          {/* Body */}
          {!collapsed && (
            <View style={styles.cardBody}>
              {renderContent()}

              {/* Action bar */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.actionBar}
                contentContainerStyle={styles.actionBarContent}
              >
                <ActionBtn
                  label={copied ? "Copied!" : "Copy"}
                  emoji={copied ? "✅" : "📋"}
                  accent={accent}
                  onPress={handleCopy}
                />
                <ActionBtn
                  label={bookmarked ? "Saved" : "Bookmark"}
                  emoji={bookmarked ? "🔖" : "🏷️"}
                  accent={accent}
                  onPress={handleBookmark}
                />
                <ActionBtn label="Share" emoji="↗️" accent={accent} onPress={handleShare} />
                {onExplainSimpler && (
                  <ActionBtn
                    label="Simpler"
                    emoji="🔽"
                    accent={accent}
                    onPress={() => onExplainSimpler(card)}
                  />
                )}
                {onExplainDetail && (
                  <ActionBtn
                    label="More Detail"
                    emoji="🔍"
                    accent={accent}
                    onPress={() => onExplainDetail(card)}
                  />
                )}
                {(card.type === "worked_example" || card.type === "step_by_step") && onGenerateExample && (
                  <ActionBtn
                    label="Another Example"
                    emoji="🔄"
                    accent={accent}
                    onPress={() => onGenerateExample(card)}
                  />
                )}
                {(card.type === "practice_question" || card.type === "challenge_question" || card.type === "formula" || card.type === "theorem") && onPracticeSimilar && (
                  <ActionBtn
                    label="Practice"
                    emoji="✏️"
                    accent={accent}
                    onPress={() => onPracticeSimilar(card)}
                  />
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  cardInner: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: {
    fontSize: 18,
  },
  headerText: {
    flex: 1,
  },
  cardTypeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  collapseChevron: {
    fontSize: 11,
    marginTop: 4,
  },
  cardBody: {
    marginTop: 12,
  },
  cardContent: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 4,
  },
  exprBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginTop: 10,
    alignItems: "center",
  },
  stepsContainer: {
    marginTop: 12,
    gap: 4,
  },
  stepRow: {
    flexDirection: "row",
    gap: 10,
    position: "relative",
  },
  stepLine: {
    position: "absolute",
    left: 15,
    top: 32,
    width: 2,
    bottom: -4,
    zIndex: 0,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    flexShrink: 0,
  },
  stepBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  stepContent: {
    flex: 1,
    paddingBottom: 12,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  stepChevron: {
    fontSize: 10,
    marginLeft: 6,
  },
  stepBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  stepExpr: {
    marginTop: 6,
  },
  itemsList: {
    marginTop: 8,
    gap: 6,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  faqList: {
    marginTop: 8,
    gap: 6,
  },
  faqRow: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 8,
  },
  faqQ: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  faqChevron: {
    fontSize: 10,
  },
  faqA: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  practiceReveal: {
    marginTop: 12,
    gap: 4,
  },
  revealBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  revealBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  hintBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 20,
  },
  answerBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  answerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
  },
  actionBar: {
    marginTop: 14,
    marginHorizontal: -2,
  },
  actionBarContent: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  actionEmoji: {
    fontSize: 12,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  textCard: {
    marginBottom: 6,
    paddingHorizontal: 2,
  },
});
