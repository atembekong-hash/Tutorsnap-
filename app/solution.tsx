import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { toggleBookmark, isBookmarked } from "@/lib/bookmarks";
import type { MathSolution, SolutionStep, HistoryItem, MathSubject } from "@/shared/types";
import { getSubjectColor, getSubjectLabel } from "@/lib/subjects";
import { useFontSize } from "@/lib/font-size-provider";
import { trpc } from "@/lib/trpc";
import { getMyClassroom, getJoinedClassroom, shareToClassroom } from "@/lib/classroom";

function StepCard({ step, colors, fs }: { step: SolutionStep; colors: any; fs: (n: number) => number }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <TouchableOpacity
      accessibilityLabel="Toggle expanded"
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
      style={[styles.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.stepHeader}>
        <View style={[styles.stepNumber, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={[styles.stepNumberText, { color: colors.primary, fontSize: fs(13) }]}>{step.stepNumber}</Text>
        </View>
        <Text style={[styles.stepTitle, { color: colors.foreground, fontSize: fs(14) }]} numberOfLines={expanded ? undefined : 1}>
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
              <Text style={[styles.expressionText, { color: colors.primary, fontSize: fs(16) }]}>{step.expression}</Text>
            </View>
          )}
          <Text style={[styles.stepExplanation, { color: colors.foreground, fontSize: fs(14), lineHeight: fs(14) * 1.57 }]}>{step.explanation}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SolutionScreen() {
  const colors = useColors();
  const { fs } = useFontSize();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [bookmarked, setBookmarked] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarProblems, setSimilarProblems] = useState<{ id: string; problem: string; hint: string }[]>([]);
  const [expandedHint, setExpandedHint] = useState<string | null>(null);
  const generateSimilarMutation = trpc.math.generateSimilar.useMutation();

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
          <Text style={{ color: colors.foreground, fontSize: fs(16) }}>No solution data found</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.primary, fontSize: fs(16) }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const subjectColor = getSubjectColor(solution.subject);
  const subjectLabel = getSubjectLabel(solution.subject);

  const buildShareHtml = () => {
    const subjectLbl = getSubjectLabel(solution!.subject);
    const stepsHtml = (solution!.steps || []).map((s) => `
      <div style="background:#f8f9fa;border-radius:12px;padding:14px;margin-bottom:10px;border-left:4px solid #4F46E5">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="background:#4F46E520;color:#4F46E5;font-weight:700;font-size:13px;padding:4px 10px;border-radius:6px">Step ${s.stepNumber}</span>
          <strong style="color:#1a1a1a;font-size:14px">${s.title}</strong>
        </div>
        ${s.expression ? `<div style="background:#4F46E510;border:1px solid #4F46E530;border-radius:8px;padding:10px;text-align:center;font-family:monospace;font-size:16px;font-weight:700;color:#4F46E5;margin-bottom:8px">${s.expression}</div>` : ""}
        <p style="color:#333;font-size:14px;line-height:1.6;margin:0">${s.explanation}</p>
      </div>
    `).join("");
    const tipsHtml = (solution!.tips || []).map((t) => `<li style="color:#555;font-size:14px;line-height:1.6;margin-bottom:6px">${t}</li>`).join("");
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; color: #1a1a1a; background: #fff; }
          .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #fff; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; }
          .app-name { font-size: 12px; font-weight: 700; letter-spacing: 2px; opacity: 0.8; margin-bottom: 4px; }
          .subject { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 12px; }
          .problem { font-size: 18px; font-weight: 700; line-height: 1.5; }
          .answer-box { background: #F0FDF4; border: 2px solid #22C55E; border-radius: 14px; padding: 16px 20px; margin-bottom: 20px; }
          .answer-label { color: #16A34A; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px; }
          .answer { font-size: 22px; font-weight: 800; color: #1a1a1a; }
          .section-title { font-size: 16px; font-weight: 700; color: #1a1a1a; margin: 0 0 12px; }
          .tips { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 14px 18px; margin-top: 16px; }
          .footer { margin-top: 24px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="app-name">TUTORSNAP</div>
          <div class="subject">${subjectLbl}</div>
          <div class="problem">${solution!.problem}</div>
        </div>
        <div class="answer-box">
          <div class="answer-label">ANSWER</div>
          <div class="answer">${solution!.answer}</div>
        </div>
        <h3 class="section-title">Step-by-Step Solution</h3>
        ${stepsHtml}
        ${tipsHtml ? `<div class="tips"><h4 style="margin:0 0 10px;color:#92400E;font-size:14px">💡 Pro Tips</h4><ul style="margin:0;padding-left:18px">${tipsHtml}</ul></div>` : ""}
        <div class="footer">Solved with TutorSnap · ${new Date().toLocaleDateString()}</div>
      </body>
      </html>
    `;
  };

  const handleSharePdf = async () => {
    if (Platform.OS === "web") {
      // Fallback: native text share on web
      const text = `Question: ${solution!.problem}\n\nAnswer: ${solution!.answer}\n\nSolved with TutorSnap`;
      try { await Share.share({ message: text }); } catch { /* ignore */ }
      return;
    }
    setShareLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const html = buildShareHtml();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Solution",
        UTI: "com.adobe.pdf",
      });
    } catch (e) {
      // User cancelled or error — ignore
    } finally {
      setShareLoading(false);
    }
  };

  const handleShareText = async () => {
    setShowShareMenu(false);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const stepsText = (solution!.steps || [])
      .map((s) => `Step ${s.stepNumber}: ${s.title}\n${s.expression ? `  ${s.expression}\n` : ""}  ${s.explanation}`)
      .join("\n\n");
    const tipsText = (solution!.tips || []).length > 0
      ? `\n\n💡 Tips:\n${solution!.tips!.map((t) => `• ${t}`).join("\n")}`
      : "";
    const message = `📚 ${getSubjectLabel(solution!.subject)} — TutorSnap\n\n❓ ${solution!.problem}\n\n✅ Answer: ${solution!.answer}\n\n${stepsText}${tipsText}\n\nSolved with TutorSnap · tutorsnapai.tech`;
    try {
      await Share.share({ message });
    } catch {
      // user cancelled
    }
  };

  const handleSharePdfFromMenu = async () => {
    setShowShareMenu(false);
    await handleSharePdf();
  };

  const handleCopyLink = async () => {
    setShowShareMenu(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const encoded = encodeURIComponent(solution!.problem);
    const link = `https://tutorsnapai.tech/solve?q=${encoded}&subject=${solution!.subject}`;
    try {
      await Clipboard.setStringAsync(link);
      setCopyLinkFeedback(true);
      setTimeout(() => setCopyLinkFeedback(false), 2000);
    } catch {
      // ignore
    }
  };

  const handlePracticeFromMenu = () => {
    setShowShareMenu(false);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/(tabs)/practice", params: { subject: solution!.subject } } as any);
  };

  const handleShareToClassroom = async () => {
    setShowShareMenu(false);
    const mine = await getMyClassroom();
    const joined = await getJoinedClassroom();
    const classroom = mine || joined;
    if (!classroom) {
      Alert.alert(
        "No Classroom",
        "You haven't joined or created a classroom yet. Go to Settings → Classroom to get started.",
        [{ text: "OK" }]
      );
      return;
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await shareToClassroom(classroom.code, {
      problem: solution!.problem,
      answer: solution!.answer,
      subject: solution!.subject,
      steps: (solution!.steps || []).map((s) => `Step ${s.stepNumber}: ${s.title} — ${s.explanation}`),
      sharedBy: "You",
    });
    Alert.alert("Shared!", `Problem added to "${classroom.name}" feed.`);
  };

  const handleShare = () => setShowShareMenu(true);

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
      {/* Share Menu Overlay */}
      {showShareMenu && (
        <TouchableOpacity
          accessibilityLabel="Toggle show share menu"
          style={styles.shareOverlay}
          activeOpacity={1}
          onPress={() => setShowShareMenu(false)}
        >
          <View style={[styles.shareMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.shareMenuTitle, { color: colors.muted }]}>Share Solution</Text>
            <TouchableOpacity
              accessibilityLabel="Share"
              onPress={handleShareText}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol size={18} name="text.bubble" color={colors.primary} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Share as Text</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Send to WhatsApp, iMessage, etc.</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Share"
              onPress={handleSharePdfFromMenu}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
              disabled={shareLoading}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.error}15` }]}>
                {shareLoading
                  ? <ActivityIndicator size="small" color={colors.error} />
                  : <IconSymbol size={18} name="doc.fill" color={colors.error} />}
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Share as PDF</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Formatted document with all steps</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Copy"
              onPress={handleCopyLink}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.success}15` }]}>
                <IconSymbol size={18} name="link" color={colors.success} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Copy Link</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Copy tutorsnapai.tech solve link to clipboard</Text>
              </View>
              <IconSymbol size={16} name={copyLinkFeedback ? "checkmark.circle.fill" : "chevron.right"} color={copyLinkFeedback ? colors.success : colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Practice this topic"
              onPress={handlePracticeFromMenu}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.warning}15` }]}>
                <IconSymbol size={18} name="pencil.and.list.clipboard" color={colors.warning} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Practice This Topic</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Go to Practice mode for this subject</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Share"
              onPress={handleShareToClassroom}
              style={styles.shareMenuItem}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.primary}20` }]}>
                <IconSymbol size={18} name="person.2.fill" color={colors.primary} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Share to Classroom</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Add to your class problem feed</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
      {/* Copy Link feedback toast */}
      {copyLinkFeedback && (
        <View style={[styles.linkToast, { backgroundColor: colors.success }]}>
          <IconSymbol size={15} name="checkmark.circle.fill" color="#FFFFFF" />
          <Text style={styles.linkToastText}>Link copied to clipboard!</Text>
        </View>
      )}
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
          {/* Share as PDF Button */}
          <TouchableOpacity onPress={handleShare} style={styles.navActionBtn} disabled={shareLoading}
            accessibilityLabel="Share">
            {shareLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <IconSymbol size={22} name="square.and.arrow.up" color={colors.primary} />
            )}
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
          <Text style={[styles.problemText, { color: colors.foreground, fontSize: fs(16), lineHeight: fs(16) * 1.5 }]}>{solution.problem}</Text>
        </View>

        {/* Answer */}
        <View style={[styles.answerCard, { backgroundColor: `${subjectColor}15`, borderColor: `${subjectColor}40` }]}>
          <View style={styles.answerHeader}>
            <View style={styles.answerLabelRow}>
              <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
              <Text style={[styles.answerLabel, { color: colors.success }]}>ANSWER</Text>
            </View>
            <TouchableOpacity onPress={handleCopyAnswer} style={[styles.copyBtn, { backgroundColor: copyFeedback ? `${colors.success}20` : "transparent" }]}
              accessibilityLabel="Copy">
              <IconSymbol size={16} name="doc.on.doc" color={copyFeedback ? colors.success : colors.muted} />
              <Text style={[styles.copyText, { color: copyFeedback ? colors.success : colors.muted }]}>
                {copyFeedback ? "Copied!" : "Copy"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.answerText, { color: colors.foreground, fontSize: fs(22) }]}>{solution.answer}</Text>
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
            <StepCard key={index} step={step} colors={colors} fs={fs} />
          ))}
        </View>

        {/* Concept Explanation */}
        {solution.conceptExplained && (
          <View style={[styles.conceptCard, { backgroundColor: `${colors.secondary}10`, borderColor: `${colors.secondary}30` }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol size={16} name="brain.head.profile" color={colors.secondary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Key Concept</Text>
            </View>
            <Text style={[styles.conceptText, { color: colors.foreground, fontSize: fs(14), lineHeight: fs(14) * 1.57 }]}>{solution.conceptExplained}</Text>
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
                <Text style={[styles.tipText, { color: colors.foreground, fontSize: fs(14), lineHeight: fs(14) * 1.57 }]}>{tip}</Text>
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
                  <Text style={[styles.relatedChipText, { color: colors.foreground, fontSize: fs(13) }]}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* AI Similar Problems */}
        <View style={[styles.similarSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            accessibilityLabel="Toggle show similar"
            onPress={async () => {
              if (showSimilar) { setShowSimilar(false); return; }
              if (similarProblems.length > 0) { setShowSimilar(true); return; }
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              try {
                const result = await generateSimilarMutation.mutateAsync({
                  problem: solution!.problem,
                  subject: solution!.subject,
                  difficulty: "medium",
                  count: 3,
                });
                setSimilarProblems(result.problems ?? []);
                setShowSimilar(true);
                if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch { /* ignore */ }
            }}
            style={styles.similarHeader}
            activeOpacity={0.8}
          >
            <View style={[styles.similarIconWrap, { backgroundColor: `${colors.primary}15` }]}>
              {generateSimilarMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <IconSymbol size={18} name="wand.and.stars" color={colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.similarTitle, { color: colors.foreground }]}>Generate Similar Problems</Text>
              <Text style={[styles.similarSub, { color: colors.muted }]}>
                {generateSimilarMutation.isPending ? "Generating 3 practice problems…" : similarProblems.length > 0 ? `${similarProblems.length} problems ready` : "AI-generated practice problems"}
              </Text>
            </View>
            <IconSymbol size={16} name={showSimilar ? "chevron.up" : "chevron.down"} color={colors.muted} />
          </TouchableOpacity>

          {showSimilar && similarProblems.length > 0 && (
            <View style={styles.similarList}>
              {similarProblems.map((p, i) => (
                <View key={p.id} style={[styles.similarItem, { borderColor: colors.border }]}>
                  <View style={styles.similarItemHeader}>
                    <View style={[styles.similarNum, { backgroundColor: `${colors.primary}20` }]}>
                      <Text style={[styles.similarNumText, { color: colors.primary }]}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.similarProblem, { color: colors.foreground, fontSize: fs(14) }]}>{p.problem}</Text>
                  </View>
                  <TouchableOpacity
                    accessibilityLabel="Toggle expanded hint"
                    onPress={() => setExpandedHint(expandedHint === p.id ? null : p.id)}
                    style={styles.hintToggle}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={14} name="lightbulb.fill" color={colors.warning} />
                    <Text style={[styles.hintToggleText, { color: colors.warning }]}>
                      {expandedHint === p.id ? "Hide hint" : "Show hint"}
                    </Text>
                  </TouchableOpacity>
                  {expandedHint === p.id && (
                    <Text style={[styles.hintText, { color: colors.muted, fontSize: fs(13) }]}>{p.hint}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

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
            accessibilityLabel="Share"
            onPress={handleShare}
            disabled={shareLoading}
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}
            activeOpacity={0.8}
          >
            {shareLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <IconSymbol size={18} name="square.and.arrow.up" color={colors.primary} />
            )}
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Share PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Go to practice"
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
  similarSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  similarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  similarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  similarTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  similarSub: { fontSize: 12 },
  similarList: { paddingHorizontal: 16, paddingBottom: 12 },
  similarItem: {
    borderTopWidth: 1,
    paddingVertical: 12,
    gap: 8,
  },
  similarItemHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  similarNum: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  similarNumText: { fontSize: 12, fontWeight: "800" },
  similarProblem: { flex: 1, fontWeight: "500", lineHeight: 20 },
  hintToggle: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 34 },
  hintToggleText: { fontSize: 12, fontWeight: "600" },
  hintText: { marginLeft: 34, lineHeight: 18 },
  shareOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 200,
    justifyContent: "flex-end",
  },
  shareMenu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingBottom: 32,
    overflow: "hidden",
  },
  shareMenuTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    paddingVertical: 14,
  },
  shareMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  shareMenuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  shareMenuInfo: { flex: 1 },
  shareMenuLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  shareMenuDesc: { fontSize: 12, lineHeight: 17 },
  linkToast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 300,
  },
  linkToastText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
