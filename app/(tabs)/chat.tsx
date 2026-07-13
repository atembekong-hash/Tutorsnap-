/**
 * AI Tutor Chat Screen
 *
 * Improvements in this version:
 *  1. Gradient avatar in the slim header (same purple→blue badge, 28px)
 *  2. Long-press context menu on AI bubbles: Copy text + Save to Notes
 *  3. Subject-aware welcome card: subject-specific greeting + subject-relevant prompt chips
 *
 * All previous improvements preserved:
 *  - Borderless iMessage-style bubbles
 *  - Avatar only on first AI bubble in a consecutive run
 *  - Gradient AI avatar badge (purple→blue ✦)
 *  - Floating pill input bar with shadow
 *  - Animated three-dot typing indicator
 *  - Session persistence, subject picker, share chat (text + PDF)
 *  - Chat history navigation, free-tier limit + paywall modal
 *  - Seed message auto-send, clear conversation, offline detection
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Share,
  Alert,
  Modal,
  Animated,
  Easing,
} from "react-native";
// expo-linear-gradient is NOT imported at top level (crashes old APKs without the native view compiled in)
import * as H from "@/lib/haptics";
// expo-clipboard, expo-print, expo-sharing are loaded lazily inside handlers
// to avoid native module crashes on Android when the tab is first mounted.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { SchemeColors } from "@/constants/theme";
import { trpc } from "@/lib/trpc";
import type { ChatMessage } from "@/shared/types";
import { SubjectPicker } from "@/components/subject-picker";
import {
  type SubjectId,
  getSubjectLabel,
  getSubjectEmoji,
  getSubjectDef,
} from "@/lib/subjects";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { Swipeable } from "react-native-gesture-handler";
import { useFontSize } from "@/lib/font-size-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  AIResponseRenderer,
  AIResponseErrorBoundary,
} from "@/components/ai-response-renderer";
import {
  createSession,
  loadSession,
  saveSession,
  generateSessionTitle,
  migrateOldChatHistory,
  type ChatSession,
} from "@/lib/chat-sessions";
import { usePremium } from "@/hooks/use-premium";
import { FREE_LIMITS } from "@/lib/subscription";
import { APP_URL, APP_NAME } from "@/constants/app";
import {
  useAppearance,
  type TypingSpeed,
} from "@/lib/appearance-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

function getAppearanceSubjectKey(subjectId: string | null): string {
  if (!subjectId) return "Mathematics";
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

// ─── Saved Notes storage key ──────────────────────────────────────────────────

const SAVED_NOTES_KEY = "tutor_saved_notes";

async function saveNote(content: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_NOTES_KEY);
    const notes: { id: string; content: string; savedAt: number }[] = raw
      ? JSON.parse(raw)
      : [];
    notes.unshift({ id: `note-${Date.now()}`, content, savedAt: Date.now() });
    // Keep last 200 notes
    await AsyncStorage.setItem(SAVED_NOTES_KEY, JSON.stringify(notes.slice(0, 200)));
  } catch { /* ignore */ }
}

// ─── Subject-specific quick prompts ──────────────────────────────────────────

const GENERIC_PROMPTS = [
  { label: "Quadratic formula", text: "Explain the quadratic formula" },
  { label: "Photosynthesis", text: "What is photosynthesis?" },
  { label: "Romeo & Juliet", text: "Summarize Romeo and Juliet" },
  { label: "World War I", text: "What caused World War I?" },
  { label: "Newton's laws", text: "Explain Newton's laws of motion" },
  { label: "Supply & demand", text: "What is supply and demand?" },
];

const SUBJECT_PROMPTS: Partial<Record<string, { label: string; text: string }[]>> = {
  algebra:        [{ label: "Solve a quadratic", text: "Solve: 2x² + 5x - 3 = 0" }, { label: "Factor a polynomial", text: "Factor x² - 5x + 6" }, { label: "Systems of equations", text: "Solve the system: 2x + y = 7, x - y = 2" }, { label: "Inequalities", text: "Solve and graph: 3x - 4 > 8" }, { label: "Exponent rules", text: "Explain the rules of exponents with examples" }, { label: "Slope-intercept form", text: "Explain slope-intercept form y = mx + b" }],
  calculus:       [{ label: "Differentiate f(x)", text: "Find the derivative of f(x) = x³ + 2x²" }, { label: "Integrate f(x)", text: "Evaluate ∫(3x² + 2x) dx" }, { label: "Chain rule", text: "Explain the chain rule with an example" }, { label: "Limits", text: "Find the limit as x→2 of (x²-4)/(x-2)" }, { label: "Related rates", text: "Explain related rates problems" }, { label: "Fundamental theorem", text: "Explain the fundamental theorem of calculus" }],
  geometry:       [{ label: "Triangle area", text: "Find the area of a triangle with base 8 and height 5" }, { label: "Pythagorean theorem", text: "Explain the Pythagorean theorem with examples" }, { label: "Circle formulas", text: "What are the area and circumference formulas for a circle?" }, { label: "Similar triangles", text: "Explain similar triangles and how to use them" }, { label: "Volume formulas", text: "What are the volume formulas for common 3D shapes?" }, { label: "Proof techniques", text: "How do I write a geometric proof?" }],
  trigonometry:   [{ label: "SOH-CAH-TOA", text: "Explain SOH-CAH-TOA with a right triangle example" }, { label: "Unit circle", text: "Explain the unit circle and key angles" }, { label: "Trig identities", text: "What are the main trigonometric identities?" }, { label: "Law of sines", text: "Explain the law of sines with an example" }, { label: "Solve sin(x)=0.5", text: "Solve: sin(x) = 0.5 for 0 ≤ x ≤ 2π" }, { label: "Graphing trig", text: "How do I graph y = 2sin(3x - π/4)?" }],
  biology:        [{ label: "Photosynthesis", text: "Explain the process of photosynthesis step by step" }, { label: "Cell division", text: "Explain the difference between mitosis and meiosis" }, { label: "DNA & RNA", text: "How does DNA replication work?" }, { label: "Natural selection", text: "Explain Darwin's theory of natural selection" }, { label: "Ecosystems", text: "What is a food web and how does energy flow through it?" }, { label: "Cell organelles", text: "What are the main organelles in a eukaryotic cell?" }],
  chemistry:      [{ label: "Balance equations", text: "Balance: Fe + O₂ → Fe₂O₃" }, { label: "Periodic table", text: "Explain periodic trends in the periodic table" }, { label: "Mole concept", text: "Explain the mole concept and Avogadro's number" }, { label: "Acid-base", text: "What is the difference between acids and bases?" }, { label: "Electron config", text: "Write the electron configuration for iron (Fe)" }, { label: "Stoichiometry", text: "Explain stoichiometry with a worked example" }],
  physics:        [{ label: "Newton's laws", text: "Explain Newton's three laws of motion with examples" }, { label: "Kinematics", text: "A car accelerates from 0 to 60 m/s in 10s. Find acceleration." }, { label: "Energy & work", text: "Explain the work-energy theorem" }, { label: "Waves", text: "What is the difference between transverse and longitudinal waves?" }, { label: "Electricity", text: "Explain Ohm's law and how to use it" }, { label: "Gravity", text: "Explain gravitational potential energy" }],
  us_history:     [{ label: "Civil War causes", text: "What were the main causes of the American Civil War?" }, { label: "Constitution", text: "Explain the system of checks and balances in the US Constitution" }, { label: "Great Depression", text: "What caused the Great Depression and how did it end?" }, { label: "Civil Rights", text: "Summarize the key events of the Civil Rights Movement" }, { label: "Revolutionary War", text: "What were the main causes of the American Revolution?" }, { label: "Cold War", text: "Explain the main events of the Cold War" }],
  world_history:  [{ label: "World War I", text: "What caused World War I?" }, { label: "World War II", text: "What were the main causes and outcomes of World War II?" }, { label: "French Revolution", text: "Explain the causes and outcomes of the French Revolution" }, { label: "Industrial Revolution", text: "How did the Industrial Revolution change society?" }, { label: "Ancient Rome", text: "Why did the Roman Empire fall?" }, { label: "Cold War", text: "Explain the origins of the Cold War" }],
  economics:      [{ label: "Supply & demand", text: "Explain supply and demand with a real-world example" }, { label: "GDP", text: "What is GDP and how is it calculated?" }, { label: "Inflation", text: "What causes inflation and how is it measured?" }, { label: "Market structures", text: "Compare monopoly, oligopoly, and perfect competition" }, { label: "Fiscal policy", text: "Explain fiscal policy and how governments use it" }, { label: "Opportunity cost", text: "Explain opportunity cost with an example" }],
  english:        [{ label: "Essay structure", text: "How do I structure a 5-paragraph essay?" }, { label: "Thesis statement", text: "Help me write a strong thesis statement" }, { label: "Literary devices", text: "Explain metaphor, simile, and personification with examples" }, { label: "Grammar help", text: "When do I use a comma before 'and'?" }, { label: "Cite sources", text: "How do I cite sources in MLA format?" }, { label: "Analyze a poem", text: "How do I analyze a poem for a literature class?" }],
  grammar:        [{ label: "Comma rules", text: "When do I use a comma before 'and'?" }, { label: "Who vs. whom", text: "When do I use 'who' vs 'whom'?" }, { label: "Active vs passive", text: "Explain active and passive voice with examples" }, { label: "Apostrophes", text: "When do I use an apostrophe?" }, { label: "Subject-verb agreement", text: "Explain subject-verb agreement rules" }, { label: "Semicolons", text: "When should I use a semicolon?" }],
  psychology:     [{ label: "Maslow's hierarchy", text: "Explain Maslow's hierarchy of needs" }, { label: "Classical conditioning", text: "Explain Pavlov's classical conditioning" }, { label: "Cognitive biases", text: "What are the most common cognitive biases?" }, { label: "Memory types", text: "Explain the different types of memory" }, { label: "Freud's theories", text: "Summarize Freud's main theories" }, { label: "Nature vs nurture", text: "Explain the nature vs nurture debate in psychology" }],
};

function getPromptsForSubject(subject: SubjectId | null) {
  if (!subject) return GENERIC_PROMPTS;
  return SUBJECT_PROMPTS[subject] ?? GENERIC_PROMPTS;
}

// ─── Animated three-dot typing indicator ─────────────────────────────────────

function TypingDots({ color }: { color: string }) {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay((2 - i) * 140),
        ])
      )
    );
    const parallel = Animated.parallel(animations);
    parallel.start();
    return () => parallel.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={typingStyles.row}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            typingStyles.dot,
            { backgroundColor: color },
            {
              transform: [
                {
                  translateY: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -5],
                  }),
                },
              ],
              opacity: dot.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

// ─── AI Avatar (pure RN — no expo-linear-gradient, safe on all APKs) ────────

function AIAvatar({ size = 30 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: SchemeColors.light.secondary,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Text style={{ fontSize: size * 0.42, lineHeight: size * 0.55, color: SchemeColors.light.background }}>✦</Text>
    </View>
  );
}

// ─── Blinking Cursor ─────────────────────────────────────────────────────────

function BlinkingCursor({ color, fontSize }: { color: string; fontSize: number }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.linear }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.Text style={{ opacity, color, fontSize, lineHeight: fontSize * 1.4, fontWeight: "300" }}>
      {"|"}  
    </Animated.Text>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isFirstInRun,
  colors,
  fs,
  onLongPressAI,
  streaming = false,
}: {
  message: ChatMessage;
  isFirstInRun: boolean;
  colors: ReturnType<typeof useColors>;
  fs: (n: number) => number;
  onLongPressAI: (content: string) => void;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";
  const { settings } = useAppearance();
  const bubbleRadius = settings.chatBubbleStyle === "rounded" ? 20 : settings.chatBubbleStyle === "flat" ? 8 : 4;
  const bubblePadH = settings.messageDensity === "compact" ? 10 : settings.messageDensity === "comfortable" ? 16 : 22;
  const bubblePadV = settings.messageDensity === "compact" ? 6 : settings.messageDensity === "comfortable" ? 10 : 16;
  const rowMarginB = settings.messageDensity === "compact" ? 2 : settings.messageDensity === "comfortable" ? 4 : 10;

  if (isUser) {
    // Parse optional leading quote block: lines starting with "> "
    const lines = message.content.split("\n");
    const quoteLines: string[] = [];
    const bodyLines: string[] = [];
    let inQuote = true;
    for (const line of lines) {
      if (inQuote && line.startsWith("> ")) {
        quoteLines.push(line.slice(2));
      } else {
        inQuote = false;
        bodyLines.push(line);
      }
    }
    const quoteText = quoteLines.join("\n").trim();
    const bodyText = bodyLines.join("\n").trim();

    return (
      <View style={[bubbleStyles.userRow, { marginBottom: rowMarginB }]}>
        <View style={[bubbleStyles.userBubble, { backgroundColor: colors.primary, borderRadius: bubbleRadius, borderBottomRightRadius: settings.chatBubbleStyle === "minimal" ? bubbleRadius : 6, paddingHorizontal: bubblePadH, paddingVertical: bubblePadV }]}>
          {quoteText.length > 0 && (
            <View style={[
              bubbleStyles.quoteBlock,
              { backgroundColor: "rgba(255,255,255,0.15)", borderLeftColor: "rgba(255,255,255,0.6)" },
            ]}>
              <Text
                style={[bubbleStyles.quoteText, { color: "rgba(255,255,255,0.85)", fontSize: fs(12) }]}
                numberOfLines={3}
              >
                {quoteText}
              </Text>
            </View>
          )}
          <Text
            style={[
              bubbleStyles.userText,
              { color: SchemeColors.light.background, fontSize: fs(15), lineHeight: fs(15) * 1.5 },
            ]}
          >
            {bodyText || message.content}
          </Text>
          <Text
            style={[
              bubbleStyles.timeText,
              { color: "rgba(255,255,255,0.55)", fontSize: fs(10) },
            ]}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  }

  // AI bubble — full width, no card, long-pressable
  return (
    <TouchableOpacity
      onLongPress={() => onLongPressAI(message.content)}
      delayLongPress={450}
      activeOpacity={1}
      accessibilityLabel="Long press for options"
    >
      <View style={[bubbleStyles.aiRow, { marginBottom: rowMarginB }]}>
        <View style={bubbleStyles.avatarCol}>
          {isFirstInRun ? <AIAvatar size={30} /> : null}
        </View>
        <View style={bubbleStyles.aiContent}>
          <AIResponseErrorBoundary
            fallbackText={message.content}
            fontSize={fs(15)}
            color={colors.foreground}
          >
            <AIResponseRenderer
              markdown={message.content}
              fontSize={fs(15)}
              color={colors.foreground}
              codeBackground={colors.surface}
              flavor="github"
              streaming={streaming}
              stripPreamble={!streaming}
            />
            {streaming && message.content.length > 0 && (
              <BlinkingCursor color={colors.muted} fontSize={fs(15)} />
            )}
          </AIResponseErrorBoundary>
          <Text
            style={[
              bubbleStyles.timeText,
              { color: colors.muted, fontSize: fs(10), marginTop: 4 },
            ]}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const bubbleStyles = StyleSheet.create({
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  userBubble: {
    maxWidth: "78%",
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userText: { fontWeight: "400" },
  aiRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginBottom: 4,
    alignItems: "flex-start",
  },
  avatarCol: {
    width: 38,
    alignItems: "center",
    paddingTop: 2,
    flexShrink: 0,
  },
  aiContent: { flex: 1, paddingRight: 8 },
  timeText: { textAlign: "right" },
  quoteBlock: {
    borderLeftWidth: 3,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  quoteText: {
    fontStyle: "italic",
    lineHeight: 17,
  },
});

// ─── Welcome empty-state card (subject-aware) ─────────────────────────────────

function WelcomeCard({
  colors,
  fs,
  subject,
  onPrompt,
}: {
  colors: ReturnType<typeof useColors>;
  fs: (n: number) => number;
  subject: SubjectId | null;
  onPrompt: (text: string) => void;
}) {
  const prompts = getPromptsForSubject(subject);
  const subjectDef = subject ? getSubjectDef(subject) : null;

  const greeting = subjectDef
    ? `Ready to help with ${subjectDef.label} ${subjectDef.emoji}`
    : "TutorSnap AI";

  const subtitle = subjectDef
    ? `Ask me anything about ${subjectDef.label} — I'll explain concepts, work through problems, and guide you step by step.`
    : "Ask me anything — Math, Science, English, History, and more. I'll explain concepts, help with homework, and guide you step by step.";

  return (
    <View style={welcomeStyles.container}>
      <AIAvatar size={64} />
      <Text style={[welcomeStyles.title, { color: colors.foreground, fontSize: fs(22) }]}>
        {greeting}
      </Text>
      <Text style={[welcomeStyles.subtitle, { color: colors.muted, fontSize: fs(14) }]}>
        {subtitle}
      </Text>
      <View style={welcomeStyles.grid}>
        {prompts.map((p, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onPrompt(p.text)}
            accessibilityLabel={`Ask: ${p.text}`}
            style={[
              welcomeStyles.chip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                welcomeStyles.chipText,
                { color: colors.foreground, fontSize: fs(13) },
              ]}
              numberOfLines={1}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const welcomeStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 12,
  },
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center", lineHeight: 22, maxWidth: 300 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginTop: 8,
    width: "100%",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    maxWidth: "47%",
    minWidth: "40%",
  },
  chipText: { fontWeight: "500", textAlign: "center" },
});

// ─── Welcome message factory ──────────────────────────────────────────────────

function makeWelcomeMessage(subject: SubjectId | null): ChatMessage {
  const subjectDef = subject ? getSubjectDef(subject) : null;
  return {
    id: "welcome-" + Date.now(),
    role: "assistant",
    content: subjectDef
      ? `I'm ready to help with ${subjectDef.label} ${subjectDef.emoji}! Ask me anything — I'll explain concepts, work through problems, and guide you step by step. 📚`
      : "Hi! I'm TutorSnap, your personal academic tutor. Ask me anything — Math, Science, English, History, and more. I'll explain concepts, help with homework, and guide you step by step! 📚",
    timestamp: Date.now(),
  };
}

// ─── AI Bubble Context Menu (cross-platform, no ActionSheetIOS) ──────────────
// Uses Alert on all platforms — ActionSheetIOS is iOS-only and crashes Android.
function showAIBubbleMenu(
  _content: string,
  _colors: ReturnType<typeof useColors>,
  onCopy: () => void,
  onSave: () => void
) {
  Alert.alert("Message options", undefined, [
    { text: "Copy text", onPress: onCopy },
    { text: "Save to Notes", onPress: onSave },
    { text: "Cancel", style: "cancel" },
  ]);
}

// ─── Animated follow-up chip with staggered fade-in ─────────────────────────

function AnimatedChip({
  chip,
  index,
  onPress,
  colors,
  fs,
}: {
  chip: string;
  index: number;
  onPress: (chip: string) => void;
  colors: ReturnType<typeof useColors>;
  fs: (n: number) => number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const delay = index * 80; // 80ms stagger between chips
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [chip]); // re-animate when chips change

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity
        onPress={() => onPress(chip)}
        style={[
          chatStyles.followUpChip,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        activeOpacity={0.7}
      >
        <Text style={[chatStyles.followUpChipText, { color: colors.foreground, fontSize: fs(12) }]}>
          {chip}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Grade level constants ───────────────────────────────────────────────────

const GRADE_LABELS: Record<string, string> = {
  grade6: "Gr 6",
  grade7: "Gr 7",
  grade8: "Gr 8",
  grade9: "Gr 9",
  grade10: "Gr 10",
  gcse: "GCSE",
  alevel: "A-Level",
  university: "Uni",
};

const GRADE_OPTIONS = [
  { id: "grade6", label: "Grade 6", sub: "Age 11-12" },
  { id: "grade7", label: "Grade 7", sub: "Age 12-13" },
  { id: "grade8", label: "Grade 8", sub: "Age 13-14" },
  { id: "grade9", label: "Grade 9", sub: "Age 14-15" },
  { id: "grade10", label: "Grade 10", sub: "Age 15-16" },
  { id: "gcse", label: "GCSE", sub: "UK Grade 10-11" },
  { id: "alevel", label: "A-Level", sub: "UK Grade 12-13" },
  { id: "university", label: "University", sub: "Degree level" },
];

// ─── Chat Screen Content ──────────────────────────────────────────────────────

function ChatScreenContent() {
  const colors = useColors();
  const { fs } = useFontSize();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    sessionId?: string;
    newSession?: string;
    seedMessage?: string;
  }>();
  const seedSentRef = useRef(false);

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [inputText, setInputText] = useState("");
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [sessionMessageCount, setSessionMessageCount] = useState(0);
  const { isPremium, isDevMode, incrementUsage: incUsage } = usePremium();
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [contextualChips, setContextualChips] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const sendBtnScaleAnim = useRef(new Animated.Value(1)).current;

  const flatListRef = useRef<FlatList>(null);
  const shareCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isOnline } = useNetworkStatus();
  const colorScheme = useColorScheme();
  const { getSubjectAccent, settings: appearanceSettings } = useAppearance();
  const subjectAccent = selectedSubject
    ? getSubjectAccent(getAppearanceSubjectKey(selectedSubject), colorScheme)
    : colors.primary;

  // Animate send/stop button scale on state change
  useEffect(() => {
    Animated.sequence([
      Animated.timing(sendBtnScaleAnim, { toValue: 0.7, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(sendBtnScaleAnim, { toValue: 1, duration: 140, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
    ]).start();
  }, [isStreaming, sendBtnScaleAnim]);

  // Typing speed → ms per character
  const TYPING_SPEED_MS: Record<TypingSpeed, number> = { slow: 30, normal: 15, fast: 5 };
  const typingDelayMs = TYPING_SPEED_MS[appearanceSettings.typingSpeed ?? "slow"];

  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const TAB_BAR_HEIGHT = 60 + bottomPadding;

  // ── Session init ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await migrateOldChatHistory();

      if (params.newSession === "1" || !params.sessionId) {
        const newSession = await createSession(null);
        if (!cancelled) {
          setSession(newSession);
          setMessages([]);
          setSessionLoaded(true);
        }
      } else {
        const existing = await loadSession(params.sessionId);
        if (!cancelled) {
          if (existing) {
            setSession(existing);
            setMessages(
              existing.messages.filter((m) => !m.id.startsWith("welcome"))
            );
            setSelectedSubject((existing.subject as SubjectId | null) ?? null);
            // Load per-session grade level, fall back to global preference
            if (existing.gradeLevel) {
              setGradeLevel(existing.gradeLevel);
            } else {
              const globalGrade = await AsyncStorage.getItem("chat_grade_level");
              if (globalGrade) setGradeLevel(globalGrade);
            }
          } else {
            const newSession = await createSession(null);
            setSession(newSession);
            setMessages([]);
          }
          setSessionLoaded(true);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      streamAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-send seed message ──────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionLoaded || !session || !isOnline || seedSentRef.current) return;
    const seed = params.seedMessage;
    if (!seed || !seed.trim()) return;
    seedSentRef.current = true;
    const timer = setTimeout(() => handleSend(seed), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoaded, session, isOnline]);

  // ── Persist helper ──────────────────────────────────────────────────────────

  const persistMessages = useCallback(
    async (msgs: ChatMessage[], currentSession: ChatSession) => {
      const updated: ChatSession = {
        ...currentSession,
        messages: msgs,
        messageCount: msgs.length,
        updatedAt: Date.now(),
      };
      if (updated.title === "New Chat") {
        const firstUser = msgs.find((m) => m.role === "user");
        if (firstUser) updated.title = generateSessionTitle(firstUser.content);
      }
      setSession(updated);
      await saveSession(updated);
    },
    []
  );

  // ── Chat mutation ───────────────────────────────────────────────────────────

  const suggestFollowUpsMutation = trpc.academic.suggestFollowUps.useMutation({
    onSuccess: (data) => {
      if (data.chips && data.chips.length > 0) {
        setContextualChips(data.chips);
      }
    },
  });

  // Streaming chat send — replaces the old tRPC chatMutation
  const sendStreamingChat = useCallback(
    async (
      contextMessages: Array<{ role: "user" | "assistant"; content: string }>,
      subject: string | undefined,
      gradeLevel: string | undefined,
      currentSession: ChatSession,
    ) => {
      // Abort any in-flight stream
      streamAbortRef.current?.abort();
      const controller = new AbortController();
      streamAbortRef.current = controller;

      const msgId = `ai-stream-${Date.now()}`;
      streamingMsgIdRef.current = msgId;

      // Insert a transient (empty) assistant bubble immediately
      const placeholder: ChatMessage = {
        id: msgId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, placeholder]);
      setIsStreaming(true);
      setContextualChips([]);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (Platform.OS !== "web") {
          const token = await Auth.getSessionToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }
        const baseUrl = getApiBaseUrl();
        const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        const url = `${cleanBase}/api/chat/stream`;

        const response = await fetch(url, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ messages: contextMessages, subject, gradeLevel }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Stream error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        // Character queue — split every token into individual characters for a
        // true letter-by-letter typewriter effect at ~30ms per character
        const charQueue: string[] = [];
        let renderLoopRunning = false;

        const drainQueue = () => {
          if (charQueue.length === 0) {
            renderLoopRunning = false;
            return;
          }
          renderLoopRunning = true;
          // One character at a time, 30ms between each
          const ch = charQueue.shift()!;
          accumulated += ch;
          const snap = accumulated;
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, content: snap } : m))
          );
          flatListRef.current?.scrollToEnd({ animated: false });
          setTimeout(drainQueue, typingDelayMs);
        };

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const raw = trimmed.slice(5).trim();
            if (raw === "[DONE]") break;
            try {
              const parsed = JSON.parse(raw) as { token?: string };
              if (parsed.token) {
                // Split token into individual characters for letter-by-letter effect
                for (const ch of parsed.token) {
                  charQueue.push(ch);
                }
                if (!renderLoopRunning) drainQueue();
              }
            } catch {
              // skip malformed chunk
            }
          }
        }

        // Wait for the character queue to fully drain before finalizing
        await new Promise<void>((resolve) => {
          const wait = () => {
            if (charQueue.length === 0 && !renderLoopRunning) {
              resolve();
            } else {
              setTimeout(wait, typingDelayMs);
            }
          };
          wait();
        });

        // Streaming complete — finalize and persist
        const finalMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: accumulated,
          timestamp: Date.now(),
        };
        setMessages((prev) => {
          const next = prev.map((m) => (m.id === msgId ? finalMsg : m));
          persistMessages(next, currentSession);
          return next;
        });
        streamingMsgIdRef.current = null;
        setIsStreaming(false);

        // Trigger follow-up chip suggestions
        suggestFollowUpsMutation.mutate({
          aiResponse: accumulated,
          subject: undefined,
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === "AbortError";
        if (!isAbort) {
          console.error("[chat stream] error:", err);
          // Remove the placeholder bubble on error
          setMessages((prev) => prev.filter((m) => m.id !== msgId));
        }
        streamingMsgIdRef.current = null;
        setIsStreaming(false);
      }
    },
    [persistMessages, suggestFollowUpsMutation, typingDelayMs]
  );

  // ── Send ────────────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text?: string) => {
      const baseText = (text || inputText).trim();
      if (!baseText || !isOnline || !session) return;

      // Prepend reply-to quote if active
      const messageText = replyTo
        ? `> ${replyTo.slice(0, 120).replace(/\n/g, " ")}\n\n${baseText}`
        : baseText;

      if (!isPremium && !isDevMode) {
        if (sessionMessageCount >= FREE_LIMITS.chatMessagesPerSession) {
          setShowPaywallModal(true);
          return;
        }
        setSessionMessageCount((c) => c + 1);
        await incUsage("chat");
      }

      Keyboard.dismiss();
      H.impactLight();

      setReplyTo(null);
      setContextualChips([]);

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: messageText,
        timestamp: Date.now(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      persistMessages(updatedMessages, session);
      setInputText("");

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      const contextMessages = updatedMessages
        .filter((m) => !m.id.startsWith("welcome"))
        .map((m) => ({ role: m.role, content: m.content }));

      sendStreamingChat(
        contextMessages,
        selectedSubject ?? undefined,
        gradeLevel ?? undefined,
        session,
      );
    },
    [inputText, isOnline, session, messages, persistMessages, selectedSubject, gradeLevel, replyTo, sendStreamingChat]
  );

  // ── Long-press AI bubble handler ────────────────────────────────────────────

  const handleLongPressAI = useCallback(
    (content: string) => {
      H.impactMedium();

      const plainText = content
        .replace(/\$\$[\s\S]*?\$\$/g, "[equation]")
        .replace(/\$[^$\n]+\$/g, "[math]")
        .replace(/#{1,6}\s/g, "")
        .replace(/\*\*|__/g, "")
        .replace(/\*|_/g, "")
        .replace(/`{1,3}/g, "")
        .trim();

      const doCopy = async () => {
        try {
          if (Platform.OS === "web") {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              await navigator.clipboard.writeText(plainText);
            }
          } else {
            // Lazy import — avoids top-level native module crash
            const Clip = await import("expo-clipboard");
            await Clip.setStringAsync(plainText);
          }
          H.notificationSuccess();
          Alert.alert("Copied", "Response copied to clipboard.");
        } catch {
          Alert.alert("Error", "Could not copy text.");
        }
      };

      const doSave = async () => {
        await saveNote(plainText);
        H.notificationSuccess();
        Alert.alert("Saved", "Response saved to your Notes.");
      };

      showAIBubbleMenu(plainText, colors, doCopy, doSave);
    },
    [colors]
  );

  // ── New Chat ────────────────────────────────────────────────────────────────

  const handleNewChat = useCallback(async () => {
    streamAbortRef.current?.abort();
    streamingMsgIdRef.current = null;
    setIsStreaming(false);
    H.impactMedium();
    const newSession = await createSession(null);
    setSession(newSession);
    setMessages([]);
    setSelectedSubject(null);
    setInputText("");
    setSessionMessageCount(0);
    await saveSession(newSession);
  }, []);

  // ── Build share text ────────────────────────────────────────────────────────

  const buildShareText = useCallback(() => {
    if (!session) return "";
    const subjectLabel = selectedSubject ? getSubjectLabel(selectedSubject) : "General";
    const dateStr = new Date(session.createdAt).toLocaleDateString(undefined, {
      month: "long", day: "numeric", year: "numeric",
    });
    const lines: string[] = [
      `📚 TutorSnap Chat — ${session.title}`,
      `Subject: ${subjectLabel} · ${dateStr}`,
      "",
    ];
    for (const msg of messages) {
      if (msg.id.startsWith("welcome")) continue;
      const role = msg.role === "user" ? "You" : "TutorSnap";
      const time = new Date(msg.timestamp).toLocaleTimeString([], {
        hour: "2-digit", minute: "2-digit",
      });
      const text = msg.content
        .replace(/\$\$[\s\S]*?\$\$/g, "[equation]")
        .replace(/\$[^$\n]+\$/g, "[math]")
        .replace(/#{1,6}\s/g, "")
        .replace(/\*\*|__/g, "")
        .replace(/\*|_/g, "")
        .replace(/`{1,3}/g, "")
        .trim();
      lines.push(`[${time}] ${role}: ${text}`);
    }
    lines.push("", `Shared from ${APP_NAME} · ${APP_URL.replace("https://", "")}`);
    return lines.join("\n");
  }, [session, messages, selectedSubject]);

  // ── Share as PDF ────────────────────────────────────────────────────────────

  const handleSharePDF = useCallback(async () => {
    if (!session) return;
    setShowShareMenu(false);
    setPdfLoading(true);
    try {
      const subjectLabel = selectedSubject ? getSubjectLabel(selectedSubject) : "General";
      const dateStr = new Date(session.createdAt).toLocaleDateString(undefined, {
        month: "long", day: "numeric", year: "numeric",
      });
      const bubbles = messages
        .filter((m) => !m.id.startsWith("welcome"))
        .map((m) => {
          const isUser = m.role === "user";
          const time = new Date(m.timestamp).toLocaleTimeString([], {
            hour: "2-digit", minute: "2-digit",
          });
          const text = m.content
            .replace(/\$\$[\s\S]*?\$\$/g, "[equation]")
            .replace(/\$[^$\n]+\$/g, "[math]")
            .replace(/#{1,6}\s/g, "")
            .replace(/\*\*|__/g, "")
            .replace(/\*|_/g, "")
            .replace(/`{1,3}/g, "")
            .replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .trim();
          return `<div class="bubble ${isUser ? "user" : "ai"}"><div class="role">${
            isUser ? "You" : "TutorSnap AI"
          } <span class="time">${time}</span></div><div class="text">${text.replace(/\n/g, "<br/>")}</div></div>`;
        })
        .join("");

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;margin:0;padding:32px;background:#fff;color:#1a1a1a}.header{border-bottom:2px solid #7C3AED;padding-bottom:16px;margin-bottom:24px}.header h1{margin:0 0 4px;font-size:20px;color:#7C3AED}.header p{margin:0;font-size:13px;color:#666}.bubble{margin-bottom:16px;max-width:80%}.bubble.user{margin-left:auto}.role{font-size:11px;font-weight:700;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}.bubble.user .role{text-align:right}.time{font-weight:400;margin-left:6px}.text{background:#f5f5f5;border-radius:12px;padding:12px 16px;font-size:14px;line-height:1.6}.bubble.user .text{background:#7C3AED;color:#fff}.footer{margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center}</style></head><body><div class="header"><h1>${session.title.replace(/</g, "&lt;")}</h1><p>Subject: ${subjectLabel} &middot; ${dateStr} &middot; ${messages.filter(m => !m.id.startsWith("welcome")).length} messages</p></div>${bubbles || '<p style="color:#aaa">No messages yet.</p>'}<div class="footer">Exported from TutorSnap &middot; ${APP_URL.replace("https://", "")}</div></body></html>`;

      // Lazy imports — avoids top-level native module crash on Android
      const Print = await import("expo-print");
      const Sharing = await import("expo-sharing");
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Save Chat PDF" });
      } else {
        Alert.alert("PDF Saved", "Your chat has been saved as a PDF.");
      }
    } catch {
      Alert.alert("Error", "Could not generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }, [session, messages, selectedSubject]);

  // ── Share as text ───────────────────────────────────────────────────────────

  const handleShareText = useCallback(async () => {
    setShowShareMenu(false);
    const shareText = buildShareText();
    if (Platform.OS === "web") {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
        }
        setShareCopied(true);
        if (shareCopiedTimerRef.current) clearTimeout(shareCopiedTimerRef.current);
        shareCopiedTimerRef.current = setTimeout(() => setShareCopied(false), 2500);
      } catch { /* ignore */ }
      return;
    }
    try {
      await Share.share({ message: shareText });
    } catch { /* user cancelled */ }
  }, [buildShareText]);

  // ── Subject change ──────────────────────────────────────────────────────────

  const handleSubjectChange = useCallback(
    async (id: SubjectId | null) => {
      setSelectedSubject(id);
      setShowSubjectPicker(false);
      if (!session) return;
      const updated: ChatSession = { ...session, subject: id };
      setSession(updated);
      await saveSession(updated);
      // No welcome message injection needed — WelcomeCard handles empty state
    },
    [session, messages]
  );

  // ── Clear chat ──────────────────────────────────────────────────────────────

  const handleClearChat = useCallback(() => {
    Alert.alert("Clear Chat", "Clear all messages in this conversation?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          streamAbortRef.current?.abort();
          streamingMsgIdRef.current = null;
          setIsStreaming(false);
          setMessages([]);
          setSessionMessageCount(0);
          if (session) {
            await saveSession({ ...session, messages: [], messageCount: 0 });
          }
        },
      },
    ]);
  }, [session, selectedSubject]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const isAtLimit =
    !isPremium && !isDevMode && sessionMessageCount >= FREE_LIMITS.chatMessagesPerSession;
  const messagesLeft = Math.max(0, FREE_LIMITS.chatMessagesPerSession - sessionMessageCount);
  const showWelcome = sessionLoaded && userMessageCount === 0;

  const isFirstInRun = useCallback(
    (index: number): boolean => {
      if (messages[index].role !== "assistant") return false;
      if (index === 0) return true;
      return messages[index - 1].role !== "assistant";
    },
    [messages]
  );

  // Follow-up chips — shown inline after the last AI message
  // Uses LLM-generated contextual chips; falls back to generic ones while loading
  const FALLBACK_CHIPS = ["Give me an example", "Explain differently", "Quiz me on this"];
  const displayChips = contextualChips.length > 0 ? contextualChips : FALLBACK_CHIPS;

  const isLastAIMessage = useCallback(
    (index: number): boolean => {
      if (messages[index].role !== "assistant") return false;
      // Must be the last message overall and not a welcome message
      if (index !== messages.length - 1) return false;
      return !messages[index].id.startsWith("welcome");
    },
    [messages]
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={TAB_BAR_HEIGHT}
      >
        {/* ── Slim header with gradient avatar ── */}
        <View
          style={[
            chatStyles.header,
            { borderBottomColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <View style={chatStyles.headerLeft}>
            {/* Avatar in header — 28px solid purple circle */}
            <AIAvatar size={28} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[chatStyles.headerTitle, { color: colors.foreground, fontSize: fs(16) }]}
                numberOfLines={1}
              >
                AI Tutor
              </Text>
              <View style={chatStyles.statusRow}>
                <View
                  style={[
                    chatStyles.statusDot,
                    { backgroundColor: isOnline ? colors.success : colors.error },
                  ]}
                />
                <Text
                  style={[
                    chatStyles.statusText,
                    { color: isOnline ? colors.success : colors.error, fontSize: fs(11) },
                  ]}
                >
                  {isOnline ? "Online" : "Offline"}
                </Text>
                {selectedSubject && (
                  <>
                    <Text style={[chatStyles.statusSep, { color: colors.border }]}>·</Text>
                    <Text
                      style={[chatStyles.statusText, { color: colors.muted, fontSize: fs(11) }]}
                      numberOfLines={1}
                    >
                      {getSubjectEmoji(selectedSubject)} {getSubjectLabel(selectedSubject)}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <View style={chatStyles.headerActions}>
            {/* Grade level pill */}
            <TouchableOpacity
              onPress={() => setShowGradePicker(true)}
              accessibilityLabel="Set grade level"
              style={[
                chatStyles.gradePill,
                {
                  backgroundColor: gradeLevel ? `${colors.primary}18` : colors.surface,
                  borderColor: gradeLevel ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[chatStyles.gradePillText, { color: gradeLevel ? colors.primary : colors.muted, fontSize: fs(14) }]}>
                {gradeLevel ? GRADE_LABELS[gradeLevel] ?? gradeLevel : "Level"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/chat-history")}
              accessibilityLabel="Chat history"
              style={chatStyles.headerBtn}
              activeOpacity={0.7}
            >
              <IconSymbol size={24} name="clock.fill" color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowShareMenu(true)}
              accessibilityLabel="Share chat"
              style={chatStyles.headerBtn}
              activeOpacity={0.7}
            >
              <IconSymbol
                size={24}
                name={shareCopied ? "checkmark.circle.fill" : "square.and.arrow.up.fill"}
                color={shareCopied ? colors.success : colors.muted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNewChat}
              accessibilityLabel="New chat"
              style={[
                chatStyles.headerBtn,
                chatStyles.newChatBtn,
                { backgroundColor: `${colors.primary}18` },
              ]}
              activeOpacity={0.7}
            >
              <IconSymbol size={22} name="plus" color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Message area ── */}
        {!sessionLoaded ? (
          <View style={chatStyles.loadingCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : showWelcome ? (
          <WelcomeCard
            colors={colors}
            fs={fs}
            subject={selectedSubject}
            onPrompt={(t) => handleSend(t)}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View>
                {item.role === "assistant" && !item.id.startsWith("welcome") ? (
                  <Swipeable
                    renderRightActions={() => (
                      <View style={[chatStyles.swipeReplyHint, { backgroundColor: `${colors.primary}18` }]}>
                        <IconSymbol size={18} name="arrowshape.turn.up.left.fill" color={colors.primary} />
                        <Text style={[chatStyles.swipeReplyLabel, { color: colors.primary, fontSize: fs(11) }]}>Reply</Text>
                      </View>
                    )}
                    rightThreshold={60}
                    overshootRight={false}
                    friction={2}
                    onSwipeableOpen={() => {
                      const plainText = item.content
                        .replace(/#{1,6}\s/g, "")
                        .replace(/\*\*|__/g, "")
                        .replace(/\*|_/g, "")
                        .replace(/`{1,3}/g, "")
                        .trim()
                        .slice(0, 120);
                      setReplyTo(plainText);
                      H.impactLight()
                    }}
                  >
                    <MessageBubble
                      message={item}
                      isFirstInRun={isFirstInRun(index)}
                      colors={colors}
                      fs={fs}
                      onLongPressAI={handleLongPressAI}
                      streaming={item.id === streamingMsgIdRef.current && isStreaming}
                    />
                  </Swipeable>
                ) : (
                  <MessageBubble
                    message={item}
                    isFirstInRun={isFirstInRun(index)}
                    colors={colors}
                    fs={fs}
                    onLongPressAI={handleLongPressAI}
                    streaming={item.id === streamingMsgIdRef.current && isStreaming}
                  />
                )}
                {/* Follow-up chips — only after the last AI response */}
                {/* Stopped badge + regenerate button */}
                {item.role === "assistant" && item.stopped && !isStreaming && (
                  <View style={chatStyles.stoppedRow}>
                    <Text style={[chatStyles.stoppedBadge, { color: colors.muted }]}>⏹ Response stopped</Text>
                    <TouchableOpacity
                      style={[chatStyles.regenerateBtn, { borderColor: colors.primary }]}
                      onPress={() => {
                        // Remove the stopped message and re-send the last user message
                        const lastUser = [...messages].reverse().find((m) => m.role === "user");
                        if (!lastUser || !session) return;
                        setMessages((prev) => prev.filter((m) => m.id !== item.id));
                        H.impactLight();
                        const contextMessages = messages
                          .filter((m) => m.id !== item.id && !m.id.startsWith("welcome"))
                          .map((m) => ({ role: m.role, content: m.content }));
                        sendStreamingChat(contextMessages, selectedSubject ?? undefined, gradeLevel ?? undefined, session);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[chatStyles.regenerateBtnText, { color: colors.primary }]}>↺ Regenerate</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {isLastAIMessage(index) && !isStreaming && !item.stopped && (
                  <View style={chatStyles.followUpRow}>
                    {suggestFollowUpsMutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.muted} style={{ marginLeft: 8 }} />
                    ) : (
                      displayChips.map((chip: string, i: number) => (
                        <AnimatedChip
                          key={chip}
                          chip={chip}
                          index={i}
                          onPress={handleSend}
                          colors={colors}
                          fs={fs}
                        />
                      ))
                    )}
                  </View>
                )}
              </View>
            )}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListFooterComponent={
              isStreaming && (messages.length === 0 || messages[messages.length - 1]?.content === "") ? (
                <View style={chatStyles.typingRow}>
                  <View style={chatStyles.typingAvatarCol}>
                    <AIAvatar size={30} />
                  </View>
                  <View style={[chatStyles.typingBubble, { backgroundColor: colors.surface }]}>
                    <TypingDots color={colors.primary} />
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {/* ── Floating input bar ── */}
        <View
          style={[
            chatStyles.floatingBarWrapper,
            { paddingBottom: Platform.OS === "ios" ? 8 : 6 },
          ]}
        >
          {/* Limit nudge strip */}
          {!isPremium && !isDevMode && sessionMessageCount > 0 && (
            <TouchableOpacity
              onPress={() => setShowPaywallModal(true)}
              activeOpacity={0.8}
              style={[
                chatStyles.limitStrip,
                {
                  backgroundColor: isAtLimit ? `${colors.error}15` : `${colors.warning}12`,
                  borderColor: isAtLimit ? `${colors.error}35` : `${colors.warning}28`,
                },
              ]}
            >
              <Text
                style={[
                  chatStyles.limitText,
                  { color: isAtLimit ? colors.error : colors.warning, fontSize: fs(12) },
                ]}
              >
                {isAtLimit
                  ? "Message limit reached — Upgrade for unlimited chat"
                  : `${messagesLeft} message${messagesLeft === 1 ? "" : "s"} left · Upgrade`}
              </Text>
              <IconSymbol
                size={12}
                name="chevron.right"
                color={isAtLimit ? colors.error : colors.warning}
              />
            </TouchableOpacity>
          )}

          {/* Reply-to preview */}
          {replyTo && (
            <View style={[chatStyles.replyPreview, { backgroundColor: `${colors.primary}12`, borderLeftColor: colors.primary }]}>
              <View style={chatStyles.replyBar}>
                <Text
                  style={[chatStyles.replyText, { color: colors.foreground, fontSize: fs(12) }]}
                  numberOfLines={2}
                >
                  {replyTo}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyTo(null)}
                style={chatStyles.replyClose}
                activeOpacity={0.7}
              >
                <IconSymbol size={16} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Pill input card */}
          <View
            style={[
              chatStyles.inputCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: "#000",
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setShowSubjectPicker(true)}
              style={[
                chatStyles.subjectPill,
                {
                  backgroundColor: selectedSubject
                    ? `${subjectAccent}18`
                    : colors.background,
                  borderColor: selectedSubject ? subjectAccent : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <IconSymbol
                size={15}
                name="book.fill"
                color={selectedSubject ? subjectAccent : colors.muted}
              />
            </TouchableOpacity>

            <TextInput
              style={[
                chatStyles.input,
                { color: colors.foreground, fontSize: fs(15), lineHeight: fs(15) * 1.45 },
              ]}
              placeholder={isAtLimit ? "Upgrade to keep chatting…" : "Ask anything…"}
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
              editable={!isAtLimit}
            />

            <Animated.View style={{ transform: [{ scale: sendBtnScaleAnim }] }}>
              {isStreaming ? (
                <TouchableOpacity
                  accessibilityLabel="Stop generating"
                  onPress={() => {
                    const stoppedId = streamingMsgIdRef.current;
                    streamAbortRef.current?.abort();
                    streamingMsgIdRef.current = null;
                    setIsStreaming(false);
                    H.impactMedium();
                    if (stoppedId) {
                      setMessages((prev) =>
                        prev.map((m) => (m.id === stoppedId ? { ...m, stopped: true } : m))
                      );
                    }
                  }}
                  style={[
                    chatStyles.sendBtn,
                    { backgroundColor: colors.error },
                  ]}
                  activeOpacity={0.8}
                >
                  <IconSymbol size={16} name="stop.fill" color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  accessibilityLabel="Send message"
                  onPress={() => handleSend()}
                  disabled={!inputText.trim() || !isOnline || isAtLimit}
                  style={[
                    chatStyles.sendBtn,
                    {
                      backgroundColor:
                        isOnline && !isAtLimit && inputText.trim()
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <IconSymbol
                    size={17}
                    name={isOnline ? "paperplane.fill" : "wifi.slash"}
                    color={
                      isOnline && !isAtLimit && inputText.trim() ? "#FFFFFF" : colors.muted
                    }
                  />
                </TouchableOpacity>
              )}
            </Animated.View>
          </View>

          {userMessageCount > 0 && (
            <TouchableOpacity
              onPress={handleClearChat}
              style={chatStyles.clearRow}
              activeOpacity={0.6}
            >
              <Text style={[chatStyles.clearText, { color: colors.muted, fontSize: fs(11) }]}>
                Clear conversation
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ── Subject picker sheet ── */}
      {showSubjectPicker && (
        <View style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity
            style={[chatStyles.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            activeOpacity={1}
            onPress={() => setShowSubjectPicker(false)}
          />
          <View
            style={[
              chatStyles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[chatStyles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[chatStyles.sheetTitle, { color: colors.foreground, fontSize: fs(16) }]}>
              Focus Subject
            </Text>
            <SubjectPicker value={selectedSubject} onChange={handleSubjectChange} showAll />
            <TouchableOpacity
              style={[chatStyles.sheetCancel, { borderColor: colors.border }]}
              onPress={() => setShowSubjectPicker(false)}
              activeOpacity={0.7}
            >
              <Text style={[chatStyles.sheetCancelText, { color: colors.muted, fontSize: fs(15) }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Grade level picker sheet ── */}
      {showGradePicker && (
        <View style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity
            style={[chatStyles.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            activeOpacity={1}
            onPress={() => setShowGradePicker(false)}
          />
          <View
            style={[
              chatStyles.gradePickerSheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[chatStyles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[chatStyles.sheetTitle, { color: colors.foreground, fontSize: fs(16) }]}>
              Explain at my level
            </Text>
            <Text style={[{ color: colors.muted, fontSize: fs(13), marginBottom: 4 }]}>
              AI responses will be tailored to your level.
            </Text>
            <View style={chatStyles.gradeGrid}>
              {GRADE_OPTIONS.map((opt) => {
                const isActive = gradeLevel === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      chatStyles.gradeCell,
                      {
                        backgroundColor: isActive ? `${colors.primary}18` : colors.background,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      const next = isActive ? null : opt.id;
                      setGradeLevel(next);
                      // Persist globally as default for new sessions
                      if (next) AsyncStorage.setItem("chat_grade_level", next);
                      else AsyncStorage.removeItem("chat_grade_level");
                      // Persist per-session so this chat remembers its level
                      if (session) {
                        const updated = { ...session, gradeLevel: next };
                        setSession(updated);
                        saveSession(updated);
                      }
                      H.impactLight()
                      setShowGradePicker(false);
                    }}
                  >
                    <Text style={[chatStyles.gradeCellLabel, { color: isActive ? colors.primary : colors.foreground, fontSize: fs(14) }]}>
                      {opt.label}
                    </Text>
                    <Text style={[chatStyles.gradeCellSub, { color: colors.muted, fontSize: fs(11) }]}>
                      {opt.sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* ── Share menu sheet ── */}
      {showShareMenu && (
        <View style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity
            style={[chatStyles.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            activeOpacity={1}
            onPress={() => setShowShareMenu(false)}
          />
          <View
            style={[
              chatStyles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[chatStyles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[chatStyles.sheetTitle, { color: colors.foreground, fontSize: fs(16) }]}>
              Share Chat
            </Text>
            {Platform.OS !== "web" && (
              <TouchableOpacity
                style={[chatStyles.sheetOption, { borderColor: colors.border }]}
                onPress={handleSharePDF}
                activeOpacity={0.7}
              >
                <IconSymbol size={22} name="doc.fill" color={colors.error} />
                <View style={chatStyles.sheetOptionText}>
                  <Text style={[chatStyles.sheetOptionTitle, { color: colors.foreground, fontSize: fs(15) }]}>
                    Save as PDF
                  </Text>
                  <Text style={[chatStyles.sheetOptionSub, { color: colors.muted, fontSize: fs(12) }]}>
                    Export a formatted PDF of this conversation
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[chatStyles.sheetOption, { borderColor: colors.border }]}
              onPress={handleShareText}
              activeOpacity={0.7}
            >
              <IconSymbol size={22} name="square.and.arrow.up.fill" color={colors.primary} />
              <View style={chatStyles.sheetOptionText}>
                <Text style={[chatStyles.sheetOptionTitle, { color: colors.foreground, fontSize: fs(15) }]}>
                  {Platform.OS === "web" ? "Copy as Text" : "Share as Text"}
                </Text>
                <Text style={[chatStyles.sheetOptionSub, { color: colors.muted, fontSize: fs(12) }]}>
                  {Platform.OS === "web"
                    ? "Copy conversation to clipboard"
                    : "Share via messages, email, or notes"}
                </Text>
              </View>
              {shareCopied && (
                <IconSymbol size={18} name="checkmark.circle.fill" color={colors.success} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[chatStyles.sheetCancel, { borderColor: colors.border }]}
              onPress={() => setShowShareMenu(false)}
              activeOpacity={0.7}
            >
              <Text style={[chatStyles.sheetCancelText, { color: colors.muted, fontSize: fs(15) }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── PDF loading overlay ── */}
      {pdfLoading && (
        <View style={[StyleSheet.absoluteFillObject, chatStyles.pdfOverlay]}>
          <View style={[chatStyles.pdfCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[chatStyles.pdfCardText, { color: colors.foreground, fontSize: fs(15) }]}>
              Generating PDF…
            </Text>
          </View>
        </View>
      )}

      {/* ── Paywall modal ── */}
      {showPaywallModal && (
        <Modal
          visible={showPaywallModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPaywallModal(false)}
        >
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={() => setShowPaywallModal(false)}
              style={{ position: "absolute", top: 16, right: 20, zIndex: 10, padding: 8 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 16, color: "#9BA1A6" }}>✕</Text>
            </TouchableOpacity>
            {React.createElement(require("../paywall").default)}
          </View>
        </Modal>
      )}
    </ScreenContainer>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  return (
    <ErrorBoundary label="Chat">
      <ChatScreenContent />
    </ErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const chatStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerTitle: { fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontWeight: "500" },
  statusSep: { fontSize: 10, marginHorizontal: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerBtn: { padding: 9 },
  newChatBtn: { borderRadius: 10, padding: 8 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  typingRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginBottom: 8,
    alignItems: "flex-end",
  },
  typingAvatarCol: {
    width: 38,
    alignItems: "center",
    paddingBottom: 4,
    flexShrink: 0,
  },
  typingBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  floatingBarWrapper: {
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 6,
  },
  limitStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  limitText: { fontWeight: "600", flex: 1 },
  inputCard: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  subjectPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingTop: Platform.OS === "ios" ? 6 : 4,
    paddingBottom: Platform.OS === "ios" ? 6 : 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  clearRow: { alignItems: "center", paddingBottom: 2 },
  clearText: { textDecorationLine: "underline" },
  stoppedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 50,
    paddingTop: 4,
    paddingBottom: 10,
  },
  stoppedBadge: {
    fontSize: 12,
    fontWeight: "500",
  },
  regenerateBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  regenerateBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontWeight: "700", marginBottom: 16 },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  sheetOptionText: { flex: 1 },
  sheetOptionTitle: { fontWeight: "600", marginBottom: 2 },
  sheetOptionSub: {},
  sheetCancel: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 0.5,
  },
  sheetCancelText: { fontWeight: "500" },
  pdfOverlay: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pdfCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 14,
    minWidth: 180,
  },
  pdfCardText: { fontWeight: "600" },
  followUpRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 50,
    paddingTop: 6,
    paddingBottom: 10,
  },
  followUpChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  followUpChipText: { fontWeight: "500" },
  swipeReplyHint: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 12,
    marginRight: 8,
    marginVertical: 4,
  },
  swipeReplyLabel: { fontWeight: "600" },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 4,
    borderRadius: 10,
    borderLeftWidth: 3,
    gap: 8,
  },
  replyBar: { flex: 1 },
  replyText: { fontWeight: "500", flex: 1 },
  replyClose: { padding: 4 },
  gradePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  gradePillText: { fontWeight: "700" },
  gradePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gradePickerSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  gradeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  gradeCell: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: "45%",
    flex: 1,
    alignItems: "center",
  },
  gradeCellLabel: { fontWeight: "600", textAlign: "center" },
  gradeCellSub: { textAlign: "center", marginTop: 2 },
});
