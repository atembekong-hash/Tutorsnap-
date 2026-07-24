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
  Modal,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import { SchemeColors } from "@/constants/theme";
import { getBookmarks } from "@/lib/bookmarks";
import type { HistoryItem } from "@/shared/types";
import { getSubjectDef, getSubjectLabel } from "@/lib/subjects";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { DotsLoader } from "@/components/skeleton";

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
    H.impactLight()
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

// ─── PDF HTML Builder ─────────────────────────────────────────────────────────

function buildDeckHtml(bookmarks: HistoryItem[]): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const cardsHtml = bookmarks
    .map((item, idx) => {
      const subjectDef = getSubjectDef(item.subject as any);
      const subjectLabel = getSubjectLabel(item.subject);
      const emoji = subjectDef?.emoji ?? "📚";
      const color = subjectDef?.color ?? SchemeColors.light.primary;

      const stepsHtml =
        item.steps && item.steps.length > 0
          ? `<div class="steps-section">
              <div class="steps-label">Solution Steps</div>
              ${(item.steps as any[])
                .map((s, si) => {
                  const title = typeof s === "string" ? "" : s.title ?? "";
                  const explanation =
                    typeof s === "string" ? s : s.explanation ?? JSON.stringify(s);
                  const expression = typeof s === "string" ? "" : s.expression ?? "";
                  return `<div class="step">
                    <span class="step-num">Step ${si + 1}</span>
                    ${title ? `<strong class="step-title">${title}</strong>` : ""}
                    ${expression ? `<div class="step-expr">${expression}</div>` : ""}
                    <p class="step-text">${explanation}</p>
                  </div>`;
                })
                .join("")}
            </div>`
          : "";

      return `
        <div class="card" style="border-left: 4px solid ${color}">
          <div class="card-header">
            <span class="card-num">#${idx + 1}</span>
            <span class="subject-badge" style="background:${color}18;color:${color}">${emoji} ${subjectLabel}</span>
          </div>
          <div class="question-section">
            <div class="section-label">QUESTION</div>
            <p class="question-text">${item.problem}</p>
          </div>
          <div class="answer-section">
            <div class="section-label answer-label">ANSWER</div>
            <p class="answer-text">${item.answer}</p>
          </div>
          ${stepsHtml}
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: #fff;
      color: #1a1a1a;
      padding: 0;
    }
    .cover {
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      color: #fff;
      padding: 40px 32px 32px;
      margin-bottom: 32px;
    }
    .cover-app { font-size: 11px; font-weight: 800; letter-spacing: 3px; opacity: 0.75; margin-bottom: 8px; }
    .cover-title { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
    .cover-meta { font-size: 14px; opacity: 0.8; }
    .cover-count {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      margin-top: 14px;
    }
    .cards-container { padding: 0 24px 40px; }
    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .card-num { font-size: 12px; font-weight: 700; color: #9ca3af; }
    .subject-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 8px;
    }
    .section-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #6b7280;
      margin-bottom: 6px;
    }
    .answer-label { color: #16a34a; }
    .question-section { margin-bottom: 14px; }
    .question-text {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.55;
      color: #111827;
    }
    .answer-section {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
    }
    .answer-text {
      font-size: 16px;
      font-weight: 700;
      line-height: 1.5;
      color: #111827;
    }
    .steps-section { margin-top: 12px; }
    .steps-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .step {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    .step-num {
      display: inline-block;
      background: #4F46E520;
      color: #4F46E5;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 5px;
      margin-bottom: 4px;
    }
    .step-title {
      display: block;
      font-size: 13px;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    .step-expr {
      background: #4F46E510;
      border: 1px solid #4F46E530;
      border-radius: 6px;
      padding: 6px 10px;
      font-family: monospace;
      font-size: 14px;
      font-weight: 700;
      color: #4F46E5;
      text-align: center;
      margin-bottom: 6px;
    }
    .step-text { font-size: 13px; color: #374151; line-height: 1.5; }
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 11px;
      padding: 16px 24px 32px;
      border-top: 1px solid #f3f4f6;
    }
    @page { margin: 20px; }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-app">TUTORSNAP</div>
    <div class="cover-title">Flashcard Deck</div>
    <div class="cover-meta">Exported on ${date}</div>
    <div class="cover-count">${bookmarks.length} card${bookmarks.length !== 1 ? "s" : ""}</div>
  </div>
  <div class="cards-container">
    ${cardsHtml}
  </div>
  <div class="footer">Generated by TutorSnap · tutorsnapai.tech</div>
</body>
</html>`;
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
  const [shareMenuVisible, setShareMenuVisible] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });

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
    H.notificationSuccess()
    setKnownCount((c) => c + 1);
    advance();
  };

  const handleReview = () => {
    H.impactMedium()
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

  const handleSharePdf = async () => {
    setShareMenuVisible(false);
    if (bookmarks.length === 0) return;
    H.impactLight()

    if (Platform.OS === "web") {
      // Web: open print dialog directly
      const html = buildDeckHtml(bookmarks);
      try {
        await Print.printAsync({ html });
      } catch {
        // User cancelled
      }
      return;
    }

    setPdfLoading(true);
    try {
      const html = buildDeckHtml(bookmarks);
      const { uri } = await Print.printToFileAsync({ html });
      const destUri = (FileSystem.documentDirectory ?? "") + "tutorsnap_flashcards.pdf";
      await FileSystem.moveAsync({ from: uri, to: destUri });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(destUri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Flashcard Deck",
          UTI: "com.adobe.pdf",
        });
      }
    } catch {
      // User cancelled or error
    } finally {
      setPdfLoading(false);
    }
  };

  const handleShareText = async () => {
    setShareMenuVisible(false);
    if (bookmarks.length === 0) return;
    H.impactLight()

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
        (item.steps as unknown as any[]).forEach((step, si) => {
          const stepText =
            typeof step === "string" ? step : step.explanation ?? step.text ?? JSON.stringify(step);
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
        await FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/plain",
            dialogTitle: "Share Flashcard Deck",
          });
        }
      }
    } catch {
      // ignore
    }
  };

  return (
    <ScreenContainer>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      {/* Header */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
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
          accessibilityLabel="Export deck"
          onPress={() => {
            if (bookmarks.length === 0) return;
            H.impactLight()
            setShareMenuVisible(true);
          }}
          style={[styles.shareBtn, { backgroundColor: `${colors.primary}15` }]}
          disabled={bookmarks.length === 0 || pdfLoading}
          activeOpacity={0.7}
        >
          {pdfLoading ? (
            <DotsLoader color={colors.primary} />
          ) : (
            <IconSymbol
              size={18}
              name="square.and.arrow.up.fill"
              color={bookmarks.length === 0 ? colors.muted : colors.primary}
            />
          )}
        </TouchableOpacity>
      </View>

      {bookmarks.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔖</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Bookmarks Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Solve a problem, then bookmark the solution to review it here as a flashcard.
          </Text>

          {/* Onboarding tip card */}
          <View style={[styles.tipCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
            <Text style={[styles.tipHeading, { color: colors.primary }]}>💡 How to build your deck</Text>
            <View style={styles.tipStep}>
              <View style={[styles.tipNum, { backgroundColor: colors.primary }]}>
                <Text style={styles.tipNumText}>1</Text>
              </View>
              <Text style={[styles.tipText, { color: colors.foreground }]}>
                Snap or type any problem on the{" "}
                <Text style={{ fontWeight: "700" }}>Scan</Text> or{" "}
                <Text style={{ fontWeight: "700" }}>Chat</Text> tab.
              </Text>
            </View>
            <View style={styles.tipStep}>
              <View style={[styles.tipNum, { backgroundColor: colors.primary }]}>
                <Text style={styles.tipNumText}>2</Text>
              </View>
              <Text style={[styles.tipText, { color: colors.foreground }]}>
                On the solution screen, tap the{" "}
                <Text style={{ fontWeight: "700" }}>🔖 bookmark icon</Text>{" "}
                in the top-right corner.
              </Text>
            </View>
            <View style={styles.tipStep}>
              <View style={[styles.tipNum, { backgroundColor: colors.primary }]}>
                <Text style={styles.tipNumText}>3</Text>
              </View>
              <Text style={[styles.tipText, { color: colors.foreground }]}>
                Come back here to flip through your saved cards and track what you know.
              </Text>
            </View>
          </View>

          <TouchableOpacity accessibilityLabel="Go back" accessibilityRole="button"
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
            <View
              style={[
                styles.doneStat,
                { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` },
              ]}
            >
              <Text style={[styles.doneStatValue, { color: colors.success }]}>{knownCount}</Text>
              <Text style={[styles.doneStatLabel, { color: colors.muted }]}>Got it</Text>
            </View>
            <View
              style={[
                styles.doneStat,
                { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}30` },
              ]}
            >
              <Text style={[styles.doneStatValue, { color: colors.warning }]}>{reviewCount}</Text>
              <Text style={[styles.doneStatLabel, { color: colors.muted }]}>Review again</Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityLabel="Study again"
            onPress={restart}
            style={[styles.restartBtn, { backgroundColor: colors.primary }]}
          >
            <IconSymbol size={18} name="arrow.counterclockwise" color="#FFFFFF" />
            <Text style={styles.restartBtnText}>Study Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Export deck as PDF"
            onPress={() => {
              H.impactLight()
              setShareMenuVisible(true);
            }}
            style={[styles.printBtn, { borderColor: colors.border }]}
            activeOpacity={0.75}
          >
            {pdfLoading ? (
              <DotsLoader color={colors.primary} />
            ) : (
              <IconSymbol size={16} name="doc.fill" color={colors.primary} />
            )}
            <Text style={[styles.printBtnText, { color: colors.primary }]}>Export Deck</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={{ marginTop: 4 }}>
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
              accessibilityLabel="Review again"
              onPress={handleReview}
              style={[
                styles.actionBtn,
                { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40` },
              ]}
              activeOpacity={0.8}
            >
              <IconSymbol size={20} name="arrow.counterclockwise" color={colors.warning} />
              <Text style={[styles.actionBtnText, { color: colors.warning }]}>Review Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Got it"
              onPress={handleKnow}
              style={[
                styles.actionBtn,
                { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}40` },
              ]}
              activeOpacity={0.8}
            >
              <IconSymbol size={20} name="checkmark.circle.fill" color={colors.success} />
              <Text style={[styles.actionBtnText, { color: colors.success }]}>Got It!</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.flipHint, { color: colors.muted }]}>Tap the card to flip it</Text>
        </View>
      )}

      {/* Share / Export Menu */}
      <Modal
        visible={shareMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShareMenuVisible(false)}
        >
          <View
            style={[
              styles.menuSheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.menuTitle, { color: colors.foreground }]}>Export Deck</Text>
            <Text style={[styles.menuSubtitle, { color: colors.muted }]}>
              {bookmarks.length} card{bookmarks.length !== 1 ? "s" : ""}
            </Text>

            <TouchableOpacity
              accessibilityLabel="Share as PDF"
              onPress={handleSharePdf}
              style={[styles.menuItem, { borderColor: colors.border }]}
              activeOpacity={0.75}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol size={20} name="doc.fill" color={colors.primary} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: colors.foreground }]}>
                  Share as PDF
                </Text>
                <Text style={[styles.menuItemDesc, { color: colors.muted }]}>
                  Styled printable deck with all cards and steps
                </Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Share as text"
              onPress={handleShareText}
              style={[styles.menuItem, { borderColor: colors.border }]}
              activeOpacity={0.75}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: `${colors.success}15` }]}>
                <IconSymbol size={20} name="text.bubble" color={colors.success} />
              </View>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: colors.foreground }]}>
                  Share as Text
                </Text>
                <Text style={[styles.menuItemDesc, { color: colors.muted }]}>
                  Plain text format for messages and notes
                </Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Cancel"
              onPress={() => setShareMenuVisible(false)}
              style={[styles.menuCancel, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuCancelText, { color: colors.muted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      </Animated.View>
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
  cardHint: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
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
  // Share menu
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0.5,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  menuTitle: { fontSize: 17, fontWeight: "800", textAlign: "center", marginBottom: 2 },
  menuSubtitle: { fontSize: 13, textAlign: "center", marginBottom: 20 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: { flex: 1 },
  menuItemTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  menuItemDesc: { fontSize: 12, lineHeight: 16 },
  menuCancel: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 0.5,
    alignItems: "center",
  },
  menuCancelText: { fontSize: 15, fontWeight: "600" },
  // Onboarding tip card on empty state
  tipCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  tipHeading: { fontSize: 14, fontWeight: "800", letterSpacing: 0.3, marginBottom: 4 },
  tipStep: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  tipNumText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
  // Print / Export button on Session Complete screen
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  printBtnText: { fontSize: 15, fontWeight: "700" },
});
