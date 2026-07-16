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
  AppState,
  type AppStateStatus,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
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
  getSubjectDef,
  isMathSubject,
  isScienceSubject,
} from "@/lib/subjects";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { Swipeable } from "react-native-gesture-handler";
import { useFontSize } from "@/lib/font-size-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { VoiceButton } from "@/components/voice-button";
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
  clearAllSessions,
  type ChatSession,
} from "@/lib/chat-sessions";
import {
  TutorSettingsModal,
  useTutorSettings,
} from "@/components/tutor-settings-modal";
import { usePremium } from "@/hooks/use-premium";
import { FREE_LIMITS } from "@/lib/subscription";
import { APP_URL, APP_NAME } from "@/constants/app";
import {
  useAppearance,
  type TypingSpeed,
  type ChatBubbleStyle,
  type FontSizeScale,
  type MessageDensity as AppMessageDensity,
} from "@/lib/appearance-context";
import {
  GRADE_OPTIONS,
  GRADE_LABELS as GRADE_LABELS_LIB,
} from "@/lib/grade-levels";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
// expo/fetch provides WinterCG-compliant streaming fetch on Android/iOS.
// React Native's built-in fetch does NOT support response.body.getReader() on native.
import { fetch as expoFetch } from "expo/fetch";
import { scheduleDailyReminder, cancelDailyReminder, scheduleSessionSummaryNotification } from "@/lib/notifications";

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

  const dotColors = ["#6366F1", "#7C3AED", "#4F46E5"];

  return (
    <View style={typingStyles.row}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            typingStyles.dot,
            { backgroundColor: dotColors[i] },
            {
              transform: [
                {
                  translateY: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -7],
                  }),
                },
                {
                  scale: dot.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.2, 1],
                  }),
                },
              ],
              opacity: dot.interpolate({
                inputRange: [0, 1],
                outputRange: [0.35, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 4 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
});

// ─── AI Avatar — animated gradient orb ─────────────────────────────────────

function AIAvatar({ size = 30, pulsing = false }: { size?: number; pulsing?: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    if (pulsing) {
      pulse.start();
      glow.start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.6);
    }
    return () => { pulse.stop(); glow.stop(); };
  }, [pulsing, pulseAnim, glowAnim]);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {/* Outer glow ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: size + 8,
          height: size + 8,
          borderRadius: (size + 8) / 2,
          backgroundColor: "#7C3AED",
          opacity: glowAnim.interpolate({ inputRange: [0.6, 1], outputRange: [0, 0.25] }),
        }}
      />
      <LinearGradient
        colors={["#6366F1", "#7C3AED", "#4F46E5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: size * 0.42, lineHeight: size * 0.55, color: "#FFFFFF" }}>✦</Text>
      </LinearGradient>
    </Animated.View>
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
        <LinearGradient
          colors={["#6366F1", "#7C3AED"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[bubbleStyles.userBubble, { borderRadius: bubbleRadius, borderBottomRightRadius: settings.chatBubbleStyle === "minimal" ? bubbleRadius : 6, paddingHorizontal: bubblePadH, paddingVertical: bubblePadV }]}
        >
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
        </LinearGradient>
      </View>
    );
  }

  // Error state — empty bubble with no content (the error row is rendered in FlatList)
  if (message.error) {
    return (
      <View style={[bubbleStyles.aiRow, { marginBottom: rowMarginB }]}>
        <View style={bubbleStyles.avatarCol}>
          {isFirstInRun ? <AIAvatar size={30} /> : null}
        </View>
        <View style={bubbleStyles.aiContent} />
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
  nickname,
  onPrompt,
  onEditNickname,
}: {
  colors: ReturnType<typeof useColors>;
  fs: (n: number) => number;
  subject: SubjectId | null;
  nickname?: string;
  onPrompt: (text: string) => void;
  onEditNickname?: () => void;
}) {
  const prompts = getPromptsForSubject(subject);
  const subjectDef = subject ? getSubjectDef(subject) : null;
  const nameGreeting = nickname ? `, ${nickname}` : "";
  const greeting = subjectDef
    ? `Hi${nameGreeting}! Ready for ${subjectDef.label} ${subjectDef.emoji}`
    : `How can I help you today${nameGreeting}?`;
  const subtitle = subjectDef
    ? `Ask me anything about ${subjectDef.label}. I'll explain concepts, work through problems, and guide you step by step.`
    : "Ask me anything about Math, Science, English, History, and more. I'll guide you step by step.";

  // Staggered entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View style={[welcomeStyles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Large animated pulsing orb */}
      <AIAvatar size={80} pulsing />
      <View style={{ gap: 6, alignItems: "center", marginTop: 8 }}>
        <Text style={[welcomeStyles.title, { color: colors.foreground, fontSize: fs(24) }]}>
          {greeting}
        </Text>
        <Text style={[welcomeStyles.subtitle, { color: colors.muted, fontSize: fs(14) }]}>
          {subtitle}
        </Text>
        {onEditNickname && (
          <TouchableOpacity
            onPress={onEditNickname}
            accessibilityLabel="Edit your nickname in Tutor Settings"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Text style={[welcomeStyles.editLink, { color: colors.primary, fontSize: fs(12) }]}>
              {nickname ? "Edit name" : "Set your name"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Glass suggestion chips */}
      <View style={welcomeStyles.grid}>
        {prompts.map((p, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onPrompt(p.text)}
            accessibilityLabel={`Ask: ${p.text}`}
            style={[
              welcomeStyles.chip,
              {
                backgroundColor: `${colors.primary}18`,
                borderColor: `${colors.primary}45`,
              },
            ]}
            activeOpacity={0.65}
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
    </Animated.View>
  );
}

const welcomeStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  title: { fontWeight: "800", textAlign: "center", letterSpacing: -0.8 },
  subtitle: { textAlign: "center", lineHeight: 22, maxWidth: 300, opacity: 0.75 },
  editLink: { fontWeight: "500", textDecorationLine: "underline", opacity: 0.85 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginTop: 4,
    width: "100%",
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    borderWidth: 1.5,
    maxWidth: "47%",
    minWidth: "40%",
  },
  chipText: { fontWeight: "600", textAlign: "center", letterSpacing: 0.1 },
});

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

// Grade level constants imported from @/lib/grade-levels (GRADE_OPTIONS, GRADE_LABELS_LIB)

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
    subject?: string;
  }>();
  const seedSentRef = useRef(false);

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [inputText, setInputText] = useState("");
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  // Round 44: top-bar ⋯ dropdown and tutor settings popup
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTutorSettings, setShowTutorSettings] = useState(false);
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
  // True from the moment the user sends until the first AI token arrives
  const [isWaitingForFirstToken, setIsWaitingForFirstToken] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  // Round 42: "↓ Generating…" pill — visible when user scrolls up during streaming
  const [generatingPillVisible, setGeneratingPillVisible] = useState(false);
  const generatingPillAnim = useRef(new Animated.Value(0)).current; // 0=hidden, 1=shown
  const sendBtnScaleAnim = useRef(new Animated.Value(1)).current;
  const scrollTopOpacity = useRef(new Animated.Value(0)).current;
  const scrollBottomOpacity = useRef(new Animated.Value(0)).current;
  const [bookmarked, setBookmarked] = useState(false);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);
  const copyLinkFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [transcriptToast, setTranscriptToast] = useState<string | null>(null);
  const transcriptToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [subjectClearedToast] = useState(false);
  const subjectClearedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTopScaleAnim = useRef(new Animated.Value(1)).current;
  const scrollBottomScaleAnim = useRef(new Animated.Value(1)).current;
  // Connectivity banner states
  const [bannerState, setBannerState] = useState<"offline" | "reconnecting" | "back-online" | "hidden">("hidden");
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Offline message queue — holds messages typed while offline
  const offlineQueueRef = useRef<string[]>([]);
  // Reactive copy of offlineQueue for rendering pending bubbles
  const [offlineQueue, setOfflineQueue] = useState<string[]>([]);
  // Connection quality: null = unknown, 'fast' = <600ms, 'slow' = >=600ms
  const [connectionQuality, setConnectionQuality] = useState<"fast" | "slow" | null>(null);
  const lastPingTimeRef = useRef<number | null>(null);
  const [slowTooltipState, setSlowTooltipState] = useState<"slow" | "fast-restored" | null>(null);
  const slowTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevConnectionQualityRef = useRef<"fast" | "slow" | null>(null);
  // Keep backward compat alias
  const showSlowTooltip = slowTooltipState !== null;

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<import("react-native").TextInput>(null);
  const isUserScrolledUpRef = useRef(false);
  const shareCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Throttle streaming scroll — fire at most every 120ms with animated:true for smooth glide
  const lastScrollTimeRef = useRef<number>(0);
  const scrollPendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Scroll velocity detector — pause auto-scroll during fast manual flicks
  const lastScrollYRef = useRef<number>(0);
  const lastScrollEventTimeRef = useRef<number>(0);
  const highVelocityPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHighVelocityScrollRef = useRef(false);
  // Round 43: auto-resume timer — fires 3s after the user's last scroll event
  // during streaming to scroll back to the bottom and re-engage auto-scroll.
  const scrollInactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isOnline, wasJustReconnected, wasJustDisconnected } = useNetworkStatus();
  const colorScheme = useColorScheme();
  const { getSubjectAccent, settings: appearanceSettings, updateSetting } = useAppearance();
  const { settings: tutorSettings, update: updateTutorSetting, reset: resetTutorSettings } = useTutorSettings();
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

  // Round 42: animate the generating pill in/out
  useEffect(() => {
    Animated.timing(generatingPillAnim, {
      toValue: generatingPillVisible ? 1 : 0,
      duration: generatingPillVisible ? 200 : 150,
      useNativeDriver: true,
      easing: generatingPillVisible ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
    }).start();
  }, [generatingPillVisible, generatingPillAnim]);

  // Animate scroll FAB fade in/out
  useEffect(() => {
    Animated.timing(scrollTopOpacity, {
      toValue: showScrollTop ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, [showScrollTop, scrollTopOpacity]);

  useEffect(() => {
    Animated.timing(scrollBottomOpacity, {
      toValue: showScrollBottom ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, [showScrollBottom, scrollBottomOpacity]);

  // Connectivity banner + haptic + offline queue
  useEffect(() => {
    if (wasJustDisconnected) {
      // Went offline
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      setBannerState("offline");
      if (Platform.OS !== "web") H.notificationError();
    }
  }, [wasJustDisconnected]);

  useEffect(() => {
    if (wasJustReconnected) {
      // Went back online
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      setBannerState("reconnecting");
      if (Platform.OS !== "web") H.notificationSuccess();
      // After 1s show "Back online" then hide
      bannerTimerRef.current = setTimeout(() => {
        setBannerState("back-online");
        bannerTimerRef.current = setTimeout(() => setBannerState("hidden"), 1500);
      }, 1000);
      // Drain the offline queue
      const queued = [...offlineQueueRef.current];
      offlineQueueRef.current = [];
      setOfflineQueue([]); // clear pending bubbles
      if (queued.length > 0) {
        // Send each queued message sequentially with a small delay
        queued.forEach((text, i) => {
          setTimeout(() => handleSend(text), i * 600);
        });
      }
    }
  }, [wasJustReconnected]);

  // Typing speed → ms per character
  // Base delays per preset (ms/char)
  const TYPING_SPEED_MS: Record<TypingSpeed, number> = { slow: 40, normal: 20, fast: 8, very_fast: 2 };
  // Global multiplier step delays: 1=60ms, 2=40ms, 3=20ms, 4=10ms, 5=3ms
  const MULTIPLIER_DELAYS = [60, 40, 20, 10, 3];
  const multiplierMs = MULTIPLIER_DELAYS[(appearanceSettings.typingSpeedMultiplier ?? 3) - 1];
  // Blend: average of preset base and global multiplier
  const baseDelayMs = Math.round((TYPING_SPEED_MS[appearanceSettings.typingSpeed ?? "slow"] + multiplierMs) / 2);
  // Subject-aware: check per-subject override first, then TutorSettings STEM override, then Math/Science auto-slow
  const getTypingDelayMs = (subject: string | undefined): number => {
    // Per-subject override from Appearance Settings: highest priority
    const subjectKey = getAppearanceSubjectKey(subject ?? null);
    const overrideStep = appearanceSettings.subjectSpeedOverrides?.[subjectKey];
    if (overrideStep && overrideStep >= 1 && overrideStep <= 5) {
      return MULTIPLIER_DELAYS[overrideStep - 1];
    }
    // TutorSettings STEM speed override: applies to Math & Science subjects
    const isComplex = isMathSubject(subject ?? null) || isScienceSubject(subject ?? null);
    if (isComplex && tutorSettings.stemTypingSpeed && tutorSettings.stemTypingSpeed !== "same") {
      return TYPING_SPEED_MS[tutorSettings.stemTypingSpeed as TypingSpeed] ?? baseDelayMs;
    }
    // Auto-slow for Math & Science (complex symbols) if no override
    return isComplex ? baseDelayMs + 15 : baseDelayMs;
  };

  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const TAB_BAR_HEIGHT = 60 + bottomPadding;

  // ── Session init ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await migrateOldChatHistory();

      if (params.newSession === "1" || !params.sessionId) {
        // Subject pre-fill: use param from home screen banner, else fall back to last-used subject
        const subjectToUse = params.subject ||
          (await AsyncStorage.getItem("chat_last_subject"));
        const newSession = await createSession(null);
        if (!cancelled) {
          setSession(newSession);
          setMessages([]);
          if (subjectToUse) setSelectedSubject(subjectToUse as SubjectId);
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

  // ── Global unmount cleanup — clear all timer refs ────────────────────────
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      if (copyLinkFeedbackTimerRef.current) clearTimeout(copyLinkFeedbackTimerRef.current);
      if (transcriptToastTimerRef.current) clearTimeout(transcriptToastTimerRef.current);
      if (subjectClearedTimerRef.current) clearTimeout(subjectClearedTimerRef.current);
      if (slowTooltipTimerRef.current) clearTimeout(slowTooltipTimerRef.current);
      if (highVelocityPauseTimerRef.current) clearTimeout(highVelocityPauseTimerRef.current);
      if (scrollPendingRef.current) clearTimeout(scrollPendingRef.current);
      if (shareCopiedTimerRef.current) clearTimeout(shareCopiedTimerRef.current);
      if (scrollInactivityTimerRef.current) clearTimeout(scrollInactivityTimerRef.current);
    };
  }, []);

  // ── Bridge tutorSettings → appearance context ────────────────────────────
  // When the user changes visual/accessibility settings in TutorSettingsModal,
  // sync them to the global appearance context so they take effect immediately.
  useEffect(() => {
    // Bubble style: tutor uses "sharp" for what appearance calls "flat"
    const mappedBubble: ChatBubbleStyle =
      tutorSettings.bubbleStyle === "sharp" ? "flat" : (tutorSettings.bubbleStyle as ChatBubbleStyle);
    updateSetting("chatBubbleStyle", mappedBubble);
  }, [tutorSettings.bubbleStyle, updateSetting]);

  useEffect(() => {
    // Font size: tutor uses "small" | "medium" | "large"; appearance adds "xlarge"
    const mappedSize: FontSizeScale = tutorSettings.chatFontSize as FontSizeScale;
    updateSetting("fontSize", mappedSize);
  }, [tutorSettings.chatFontSize, updateSetting]);

  useEffect(() => {
    updateSetting("messageDensity", tutorSettings.messageDensity as AppMessageDensity);
  }, [tutorSettings.messageDensity, updateSetting]);

  useEffect(() => {
    updateSetting("typingSpeed", tutorSettings.typingSpeed as TypingSpeed);
  }, [tutorSettings.typingSpeed, updateSetting]);

  useEffect(() => {
    updateSetting("reduceMotion", tutorSettings.reduceMotion);
  }, [tutorSettings.reduceMotion, updateSetting]);

  useEffect(() => {
    updateSetting("highContrast", tutorSettings.highContrast);
  }, [tutorSettings.highContrast, updateSetting]);

  // ── Study reminders bridge: sync TutorSettings → daily notification ─────────
  useEffect(() => {
    if (!tutorSettings.studyReminders) {
      cancelDailyReminder().catch(() => {});
      return;
    }
    // Parse "HH:MM" time string
    const parts = tutorSettings.studyReminderTime.split(":");
    const hour = parseInt(parts[0] ?? "18", 10);
    const minute = parseInt(parts[1] ?? "0", 10);
    if (!isNaN(hour) && !isNaN(minute)) {
      scheduleDailyReminder(hour, minute).catch(() => {});
    }
  }, [tutorSettings.studyReminders, tutorSettings.studyReminderTime]);

  // ── Background streaming: keep generation alive when app is backgrounded ──
  // React Native pauses JS timers when the app goes to background. We use
  // AppState to detect the transition and re-kick the drain loop if it was
  // mid-stream, so the response continues accumulating in the charQueue even
  // while the user is in another app. The UI catches up the moment they return.
  const isStreamingRef = useRef(false);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      // When coming back to foreground while streaming, force a scroll to bottom
      // so the user sees the latest generated content immediately.
      if (nextState === "active" && isStreamingRef.current) {
        setTimeout(() => {
          if (!isUserScrolledUpRef.current) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }, 200);
      }
    };
    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, []);

  // ── Clear all chat history ────────────────────────────────────────────────
  const handleClearAllHistory = useCallback(() => {
    Alert.alert(
      "Clear All History",
      "All saved chat sessions will be permanently deleted. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllSessions();
            } catch { /* ignore */ }
            // Reset the current chat to a fresh session
            streamAbortRef.current?.abort();
            streamingMsgIdRef.current = null;
            setIsStreaming(false);
            setMessages([]);
            setSessionMessageCount(0);
            // Create a new session without calling handleNewChat (declared later)
            const lastSubject = await AsyncStorage.getItem("chat_last_subject");
            const newSession = await createSession(null);
            setSession(newSession);
            setSelectedSubject(lastSubject ? (lastSubject as SubjectId) : null);
            setInputText("");
            await saveSession(newSession);
          },
        },
      ]
    );
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
      // Fix 5: auto-title from first user message (respects autoTitle setting)
      if (tutorSettings.autoTitle && updated.title === "New Chat") {
        const firstUser = msgs.find((m) => m.role === "user");
        if (firstUser) updated.title = generateSessionTitle(firstUser.content);
      }
      setSession(updated);
      // Fix 5: skip storage when saveHistory is disabled
      if (!tutorSettings.saveHistory) return;
      await saveSession(updated, tutorSettings.maxSessions);
    },
    [tutorSettings.maxSessions, tutorSettings.saveHistory, tutorSettings.autoTitle]
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
      contextMessages: { role: "user" | "assistant"; content: string }[],
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
      setIsWaitingForFirstToken(true); // show dots until first token
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

        // Measure time-to-first-byte for connection quality indicator
        const pingStart = Date.now();
        lastPingTimeRef.current = pingStart;

        // On native (Android/iOS), React Native's built-in fetch does NOT support
        // response.body.getReader() — use expo/fetch which provides a WinterCG-compliant
        // streaming fetch backed by native HTTP (not XMLHttpRequest).
        // On web, the global fetch works fine with ReadableStream.
        // Use expo/fetch on native for proper ReadableStream support; global fetch on web
        let response: Response;
        // Build tutor profile payload from current settings
        const tutorProfile = {
          nickname: tutorSettings.nickname || undefined,
          tone: (
            tutorSettings.tone === "friendly" ? "encouraging" :
            tutorSettings.tone === "academic" ? "formal" :
            tutorSettings.tone === "neutral" ? "formal" :
            tutorSettings.tone
          ) as "encouraging" | "formal" | "casual" | "socratic",
          responseLength: (
            tutorSettings.responseLength === "short" ? "brief" :
            tutorSettings.responseLength === "balanced" ? "standard" :
            tutorSettings.responseLength
          ) as "brief" | "standard" | "detailed",
          learningStyle: tutorSettings.learningStyle,
          language: tutorSettings.language !== "English" ? tutorSettings.language : undefined,
          showWorking: tutorSettings.showWorking,
          useEmojis: tutorSettings.useEmojis,
        };

        if (Platform.OS === "web") {
          response = await fetch(url, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify({ messages: contextMessages, subject, gradeLevel, tutorProfile }),
            signal: controller.signal,
          });
        } else {
          // expoFetch: WinterCG-compliant, supports response.body.getReader() on Android/iOS
          const expoResponse = await expoFetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({ messages: contextMessages, subject, gradeLevel, tutorProfile }),
          });
          response = expoResponse as unknown as Response;
        }

        if (!response.ok || !response.body) {
          const errText = await response.text().catch(() => "");
          console.error(`[chat stream] HTTP ${response.status}:`, errText);
          throw new Error(`Stream error: ${response.status}`);
        }

        // Measure time-to-first-byte and update connection quality
        const ttfb = Date.now() - pingStart;
        const newQuality = ttfb < 600 ? "fast" : "slow";
        setConnectionQuality(newQuality);
        // Show tooltip when quality transitions
        if (slowTooltipTimerRef.current) clearTimeout(slowTooltipTimerRef.current);
        if (newQuality === "slow" && prevConnectionQualityRef.current !== "slow") {
          // Slow transition: show slow tooltip for 3s
          setSlowTooltipState("slow");
          slowTooltipTimerRef.current = setTimeout(() => setSlowTooltipState(null), 3000);
        } else if (newQuality === "fast" && prevConnectionQualityRef.current === "slow") {
          // Fast restored: show "Fast connection restored" for 2s
          setSlowTooltipState("fast-restored");
          slowTooltipTimerRef.current = setTimeout(() => setSlowTooltipState(null), 2000);
        }
        prevConnectionQualityRef.current = newQuality;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        // Character queue — split every token into individual characters for a
        // true letter-by-letter typewriter effect at ~30ms per character
        const charQueue: string[] = [];
        let renderLoopRunning = false;
        // Subject-aware delay for this request (Math/Science get +15ms)
        const reqDelayMs = getTypingDelayMs(subject);

        // Throttled smooth scroll — glide to bottom at most every 120ms
        const SCROLL_THROTTLE_MS = 120;
        const smoothScrollToEnd = () => {
          if (!tutorSettings.autoScroll) return; // Fix 4: respect autoScroll setting
          if (isUserScrolledUpRef.current) return;
          // Pause during high-velocity manual flick to avoid fighting the user's scroll
          if (isHighVelocityScrollRef.current) return;
          const now = Date.now();
          const elapsed = now - lastScrollTimeRef.current;
          if (scrollPendingRef.current) {
            clearTimeout(scrollPendingRef.current);
            scrollPendingRef.current = null;
          }
          if (elapsed >= SCROLL_THROTTLE_MS) {
            lastScrollTimeRef.current = now;
            flatListRef.current?.scrollToEnd({ animated: true });
          } else {
            // Schedule a trailing scroll so the last characters always land at bottom
            scrollPendingRef.current = setTimeout(() => {
              lastScrollTimeRef.current = Date.now();
              flatListRef.current?.scrollToEnd({ animated: true });
              scrollPendingRef.current = null;
            }, SCROLL_THROTTLE_MS - elapsed);
          }
        };

        const drainQueue = () => {
          if (charQueue.length === 0) {
            renderLoopRunning = false;
            // Final scroll to ensure we land exactly at the bottom
            if (!isUserScrolledUpRef.current) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
            return;
          }
          renderLoopRunning = true;
          // One character at a time
          const ch = charQueue.shift()!;
          accumulated += ch;
          const snap = accumulated;
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, content: snap } : m))
          );
          smoothScrollToEnd();
          // Free-scroll mode: always drain at normal speed regardless of scroll position.
          // The user can scroll freely without resistance while the AI is generating.
          setTimeout(drainQueue, reqDelayMs);
        };

        while (true) { // loop exits on stream done or abort
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
                // First token arrived - hide the waiting dots
                setIsWaitingForFirstToken(false);
                // Strip em-dash and en-dash from every incoming token
                const cleanToken = parsed.token.replace(/[\u2013\u2014]/g, '-');
                if (!tutorSettings.typingAnimation) {
                  // Typing animation disabled: append the full token at once
                  accumulated += cleanToken;
                  const snap = accumulated;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === msgId ? { ...m, content: snap } : m))
                  );
                  smoothScrollToEnd();
                } else {
                  // Split token into individual characters for letter-by-letter effect
                  for (const ch of cleanToken) {
                    charQueue.push(ch);
                  }
                  if (!renderLoopRunning) drainQueue();
                }
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
              setTimeout(wait, reqDelayMs);
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
        setIsWaitingForFirstToken(false);
        // Round 42: hide the generating pill when streaming ends
        setGeneratingPillVisible(false);
        // Round 43: clear the inactivity timer when streaming ends so it doesn't
        // fire after the response is already complete.
        if (scrollInactivityTimerRef.current) {
          clearTimeout(scrollInactivityTimerRef.current);
          scrollInactivityTimerRef.current = null;
        }
        // Streaming done: if the user never scrolled away, glide to the bottom.
        // If they did scroll up to read, respect their position and don't force-jump.
        if (!isUserScrolledUpRef.current) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
        // Do NOT auto-focus here — doing so re-opens the keyboard which pushes the
        // input bar back up. The user taps the input when they are ready to type.

        // Trigger follow-up chip suggestions
        suggestFollowUpsMutation.mutate({
          aiResponse: accumulated,
          subject: undefined,
        });
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === "AbortError";
        if (!isAbort) {
          console.error("[chat stream] error:", err);
          // Replace placeholder with an error bubble that has a retry button
          const errorMsg: ChatMessage = {
            id: msgId,
            role: "assistant",
            content: "",
            timestamp: Date.now(),
            error: true,
            retryPayload: contextMessages,
          };
          setMessages((prev) => prev.map((m) => (m.id === msgId ? errorMsg : m)));
        } else {
          // Aborted by user — remove the placeholder
          setMessages((prev) => prev.filter((m) => m.id !== msgId));
        }
        streamingMsgIdRef.current = null;
        setIsStreaming(false);
      }
    },
    [persistMessages, suggestFollowUpsMutation, getTypingDelayMs]
  );

  // ── Send ────────────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text?: string) => {
      const baseText = (text || inputText).trim();
      if (!baseText || !session) return;

      // If offline, queue the message and show feedback
      if (!isOnline) {
        offlineQueueRef.current.push(baseText);
        setOfflineQueue([...offlineQueueRef.current]); // sync reactive state for pending bubbles
        setInputText("");
        Keyboard.dismiss();
        setBannerState("offline");
        H.impactLight();
        return;
      }

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
      inputRef.current?.blur();
      H.impactLight(); // dismiss haptic — confirms bar returning to bottom

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

      // Sending a new message is an explicit intent to be at the bottom,
      // so reset both scroll locks so the incoming AI response auto-scrolls.
      isUserScrolledUpRef.current = false;
      isHighVelocityScrollRef.current = false;
      if (highVelocityPauseTimerRef.current) clearTimeout(highVelocityPauseTimerRef.current);
      if (scrollPendingRef.current) { clearTimeout(scrollPendingRef.current); scrollPendingRef.current = null; }
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
    // Fire session summary notification if enabled and session has messages
    if (tutorSettings.sessionSummary && session && messages.length > 0) {
      const userMsgCount = messages.filter((m) => m.role === "user").length;
      scheduleSessionSummaryNotification(
        session.title,
        userMsgCount,
        session.id,
      ).catch(() => {});
    }
    // Restore last-used subject for new chats
    const lastSubject = await AsyncStorage.getItem("chat_last_subject");
    const newSession = await createSession(null);
    setSession(newSession);
    setMessages([]);
    setSelectedSubject(lastSubject ? (lastSubject as SubjectId) : null);
    setInputText("");
    setSessionMessageCount(0);
    await saveSession(newSession, tutorSettings.maxSessions);
  }, [tutorSettings.maxSessions, tutorSettings.sessionSummary, session, messages]);

  // ── Build share text ────────────────────────────────────────────────────────

  const buildShareText = useCallback(() => {
    if (!session) return "";
    const subjectLabel = selectedSubject ? getSubjectLabel(selectedSubject) : "General";
    const dateStr = new Date(session.createdAt).toLocaleDateString(undefined, {
      month: "long", day: "numeric", year: "numeric",
    });
    const lines: string[] = [
      `📚 TutorSnap Chat - ${session.title}`,
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

  // ── Copy Link ───────────────────────────────────────────────────────────────

  const handleCopyLink = useCallback(async () => {
    setShowShareMenu(false);
    if (!session) return;
    const encoded = encodeURIComponent(session.title || "chat");
    const subject = selectedSubject ?? "general";
    const link = `https://stutorsnapai.tech/chat?q=${encoded}&subject=${subject}`;
    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(link);
      setCopyLinkFeedback(true);
      if (copyLinkFeedbackTimerRef.current) clearTimeout(copyLinkFeedbackTimerRef.current);
      copyLinkFeedbackTimerRef.current = setTimeout(() => setCopyLinkFeedback(false), 2000);
    } catch { /* ignore */ }
  }, [session, selectedSubject]);

  // ── Practice This Topic ─────────────────────────────────────────────────────

  const handlePracticeThisTopic = useCallback(() => {
    setShowShareMenu(false);
    if (Platform.OS !== "web") {
      const Haptics = require("expo-haptics");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({ pathname: "/(tabs)/practice", params: selectedSubject ? { subject: selectedSubject } : {} } as any);
  }, [selectedSubject, router]);

  // ── Share to Classroom ──────────────────────────────────────────────────────

  const handleShareToClassroom = useCallback(async () => {
    setShowShareMenu(false);
    try {
      const { getMyClassroom, getJoinedClassroom, shareToClassroom } = await import("@/lib/classroom");
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
      // Build a summary of the last user question and AI answer
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const lastAI = [...messages].reverse().find((m) => m.role === "assistant");
      if (!lastUser) {
        Alert.alert("Nothing to share", "Send a message first before sharing to classroom.");
        return;
      }
      if (Platform.OS !== "web") {
        const Haptics = require("expo-haptics");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await shareToClassroom(classroom.code, {
        problem: lastUser.content,
        answer: lastAI?.content ?? "",
        subject: selectedSubject ?? "general",
        steps: [],
        sharedBy: "You",
      });
      Alert.alert("Shared!", `Added to "${classroom.name}" feed.`);
    } catch {
      Alert.alert("Error", "Could not share to classroom. Please try again.");
    }
  }, [messages, selectedSubject]);

  // ── Bookmark ────────────────────────────────────────────────────────────────

  const handleBookmark = useCallback(async () => {
    setShowShareMenu(false);
    try {
      const { toggleBookmark } = await import("@/lib/bookmarks");
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const lastAI = [...messages].reverse().find((m) => m.role === "assistant");
      if (!lastUser) {
        Alert.alert("Nothing to bookmark", "Send a message first before bookmarking.");
        return;
      }
      const item = {
        id: `chat-bm-${Date.now()}`,
        problem: lastUser.content,
        answer: lastAI?.content ?? "",
        subject: (selectedSubject ?? "general") as any,
        steps: [],
        solvedAt: Date.now(),
      };
      const added = await toggleBookmark(item);
      setBookmarked(added);
      if (Platform.OS !== "web") {
        const Haptics = require("expo-haptics");
        if (added) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      Alert.alert("Error", "Could not save bookmark. Please try again.");
    }
  }, [messages, selectedSubject]);

  // ── Invite a Friend ─────────────────────────────────────────────────────────

  const handleInviteFriend = useCallback(async () => {
    setShowShareMenu(false);
    try {
      const { getOrCreateReferralCode } = await import("@/lib/affiliate");
      const code = await getOrCreateReferralCode();
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const question = lastUser?.content ?? "a tough question";
      const msg = `TutorSnap just answered this for me in seconds 🤯\n\n"${question.length > 80 ? question.slice(0, 80) + "…" : question}"\n\nTry it free with my code: ${code}\nhttps://stutorsnapai.tech`;
      if (Platform.OS !== "web") {
        const Share = await import("react-native");
        await Share.Share.share({ message: msg });
      } else {
        const Clipboard = await import("expo-clipboard");
        await Clipboard.setStringAsync(msg);
        Alert.alert("Copied!", "Invite message copied to clipboard.");
      }
    } catch { /* user cancelled */ }
  }, [messages]);

  // ── Subject change ──────────────────────────────────────────────────────────

  const handleSubjectChange = useCallback(
    async (id: SubjectId | null) => {
      setSelectedSubject(id);
      setShowSubjectPicker(false);
      // Persist last-used subject globally so new sessions start with it
      if (id) AsyncStorage.setItem("chat_last_subject", id);
      else AsyncStorage.removeItem("chat_last_subject");
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
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="">
      {/* Ambient gradient background */}
      <LinearGradient
        colors={colorScheme === "dark"
          ? ["#0D0D1A", "#0F0F1F", "#0D0D1A"]
          : ["#F8F7FF", "#FAFAFA", "#F5F4FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* ── Glassmorphism header ── */}
        <BlurView
          intensity={Platform.OS === "ios" ? 60 : 0}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={[
            chatStyles.header,
            Platform.OS !== "ios" && { backgroundColor: `${colors.background}F0` },
            { borderBottomColor: `${colors.border}80` },
          ]}
        >
          <View style={chatStyles.headerLeft}>
            {/* Gradient orb avatar in header */}
            <AIAvatar size={28} pulsing={isStreaming || isWaitingForFirstToken} />
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
                {isOnline && connectionQuality !== null && (
                  <>
                    <Text style={[chatStyles.statusSep, { color: colors.border }]}>·</Text>
                    <Text
                      style={[chatStyles.statusText, { color: connectionQuality === "fast" ? colors.success : colors.warning, fontSize: fs(11) }]}
                    >
                      {connectionQuality === "fast" ? "Fast" : "Slow"}
                    </Text>
                  </>
                )}
                {/* Round 44: subject moved to color dot on the input bar */}
              </View>
            </View>
          </View>

          <View style={chatStyles.headerActions}>
            {/* Round 44: ⋯ dropdown — history + share */}
            <TouchableOpacity
              onPress={() => { setShowMoreMenu(true); H.impactLight(); }}
              accessibilityLabel="More options"
              style={chatStyles.headerBtn}
              activeOpacity={0.7}
            >
              <IconSymbol size={22} name="ellipsis" color={colors.muted} />
            </TouchableOpacity>

            {/* Round 44: Tutor settings gear */}
            <TouchableOpacity
              onPress={() => { setShowTutorSettings(true); H.impactLight(); }}
              accessibilityLabel="Tutor settings"
              style={chatStyles.headerBtn}
              activeOpacity={0.7}
            >
              <IconSymbol size={22} name="gearshape.fill" color={colors.muted} />
            </TouchableOpacity>

            {/* New chat */}
            <TouchableOpacity
              onPress={() => { H.impactLight(); handleNewChat(); }}
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
        </BlurView>

        {/* ── Connectivity banner (offline / reconnecting / back-online) ── */}
        {(bannerState !== "hidden" || !isOnline) && (() => {
          const effectiveState = !isOnline && bannerState === "hidden" ? "offline" : bannerState;
          if (effectiveState === "hidden") return null;
          const isOffline = effectiveState === "offline";
          const isReconnecting = effectiveState === "reconnecting";
          const isBackOnline = effectiveState === "back-online";
          const bgColor = isOffline
            ? `${colors.error}18`
            : isReconnecting
            ? `${colors.warning}18`
            : `${colors.success}18`;
          const borderColor = isOffline
            ? `${colors.error}30`
            : isReconnecting
            ? `${colors.warning}30`
            : `${colors.success}30`;
          const textColor = isOffline ? colors.error : isReconnecting ? colors.warning : colors.success;
          const iconName = isOffline ? "wifi.slash" : isBackOnline ? "checkmark.circle.fill" : "arrow.clockwise";
          const queueCount = offlineQueue.length;
          const label = isOffline
            ? queueCount > 0
              ? `Offline - ${queueCount} message${queueCount === 1 ? "" : "s"} queued`
              : "You are offline - check your connection"
            : isReconnecting
            ? "Reconnecting…"
            : "Back online!";
          return (
            <View style={[chatStyles.offlineBanner, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
              {isReconnecting ? (
                <ActivityIndicator size={14} color={textColor} />
              ) : (
                <IconSymbol size={14} name={iconName} color={textColor} />
              )}
              <Text style={[chatStyles.offlineBannerText, { color: textColor, fontSize: fs(12), flex: 1 }]}>
                {label}
              </Text>
              {isOffline && queueCount > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    offlineQueueRef.current = [];
                    setOfflineQueue([]);
                    H.impactMedium();
                  }}
                  style={[chatStyles.cancelQueueBtn, { borderColor: textColor }]}
                  activeOpacity={0.7}
                >
                  <Text style={[chatStyles.cancelQueueText, { color: textColor, fontSize: fs(11) }]}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

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
            nickname={tutorSettings.nickname || undefined}
            onPrompt={(t) => handleSend(t)}
            onEditNickname={() => { setShowTutorSettings(true); H.impactLight(); }}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <View>
                {item.role === "assistant" && !item.id.startsWith("welcome") && Platform.OS !== "web" ? (
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
                {/* Error bubble — shown when stream fails */}
                {item.role === "assistant" && item.error && !isStreaming && (
                  <View style={chatStyles.stoppedRow}>
                    <Text style={[chatStyles.stoppedBadge, { color: colors.error }]}>⚠ Could not reach server</Text>
                    <TouchableOpacity
                      style={[chatStyles.regenerateBtn, { borderColor: colors.primary }]}
                      onPress={() => {
                        if (!session) return;
                        H.impactLight();
                        // Remove the error bubble and retry with the saved context
                        setMessages((prev) => prev.filter((m) => m.id !== item.id));
                        const ctx = item.retryPayload ?? messages
                          .filter((m) => m.id !== item.id && !m.id.startsWith("welcome"))
                          .map((m) => ({ role: m.role, content: m.content }));
                        sendStreamingChat(ctx, selectedSubject ?? undefined, gradeLevel ?? undefined, session);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[chatStyles.regenerateBtnText, { color: colors.primary }]}>↺ Retry</Text>
                    </TouchableOpacity>
                  </View>
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
                {isLastAIMessage(index) && !isStreaming && !item.stopped && tutorSettings.followUpChips && (
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
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              // User started dragging — lock auto-scroll immediately.
              // During streaming this lock stays until the user taps the
              // scroll-to-bottom FAB or streaming ends and they are near bottom.
              isUserScrolledUpRef.current = true;
              // Also cancel any pending throttled scroll so it doesn't fire
              // and fight the user mid-drag.
              if (scrollPendingRef.current) {
                clearTimeout(scrollPendingRef.current);
                scrollPendingRef.current = null;
              }
              // Round 42: show the generating pill if we're currently streaming
              if (isStreaming) setGeneratingPillVisible(true);
            }}
            onMomentumScrollBegin={() => {
              // Keep auto-scroll locked during the deceleration phase too.
              isHighVelocityScrollRef.current = true;
              if (highVelocityPauseTimerRef.current) clearTimeout(highVelocityPauseTimerRef.current);
            }}
            onMomentumScrollEnd={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
              // Only re-enable auto-scroll if the user has landed near the bottom
              // AND we are NOT actively streaming (during streaming the user must
              // explicitly tap the FAB to re-engage).
              if (distanceFromBottom < 80 && !isStreaming) {
                isUserScrolledUpRef.current = false;
                isHighVelocityScrollRef.current = false;
              } else if (distanceFromBottom < 80 && isStreaming) {
                // Near bottom while streaming — re-engage so new tokens scroll into view
                isUserScrolledUpRef.current = false;
                isHighVelocityScrollRef.current = false;
              } else {
                // Still scrolled up — release velocity lock but keep user-scroll lock
                highVelocityPauseTimerRef.current = setTimeout(() => {
                  isHighVelocityScrollRef.current = false;
                }, 300);
              }
            }}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
              // Re-enable auto-scroll only when the user has scrolled back to
              // within 80px of the bottom (generous threshold so it's easy to
              // re-engage without pixel-perfect precision).
              if (distanceFromBottom < 80) {
                isUserScrolledUpRef.current = false;
                isHighVelocityScrollRef.current = false;
                // Round 42: hide the generating pill once back near the bottom
                if (generatingPillVisible) setGeneratingPillVisible(false);
              }
              // Velocity detection: pause auto-scroll during fast manual flicks.
              // During streaming we skip the timer-based re-enable so the lock
              // isn't prematurely released while the user is still reading.
              const now = Date.now();
              const dt = now - lastScrollEventTimeRef.current;
              const dy = Math.abs(contentOffset.y - lastScrollYRef.current);
              if (dt > 0 && dt < 100) {
                const velocity = dy / dt; // px/ms
                if (velocity > 2.5) {
                  isHighVelocityScrollRef.current = true;
                  if (highVelocityPauseTimerRef.current) clearTimeout(highVelocityPauseTimerRef.current);
                  if (!isStreaming) {
                    // Outside streaming: release lock after 800ms as before
                    highVelocityPauseTimerRef.current = setTimeout(() => {
                      isHighVelocityScrollRef.current = false;
                    }, 800);
                  }
                  // During streaming: no timer — lock stays until near-bottom or FAB tap
                }
              }
              lastScrollYRef.current = contentOffset.y;
              lastScrollEventTimeRef.current = now;
              // Round 43: auto-resume on inactivity — while streaming and scrolled up,
              // reset a 3s timer on every scroll event. When the timer fires (user
              // hasn't scrolled for 3s) automatically scroll back to the bottom and
              // re-engage auto-scroll so they don't miss the end of the response.
              if (isStreaming && isUserScrolledUpRef.current && tutorSettings.autoResumeDelay > 0) {
                if (scrollInactivityTimerRef.current) clearTimeout(scrollInactivityTimerRef.current);
                scrollInactivityTimerRef.current = setTimeout(() => {
                  // Only auto-resume if still streaming and still scrolled up
                  if (isUserScrolledUpRef.current) {
                    isUserScrolledUpRef.current = false;
                    isHighVelocityScrollRef.current = false;
                    setGeneratingPillVisible(false);
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }
                  scrollInactivityTimerRef.current = null;
                }, tutorSettings.autoResumeDelay * 1000);
              } else if (!isStreaming || !isUserScrolledUpRef.current || tutorSettings.autoResumeDelay === 0) {
                // Clear the timer if streaming ended or user is already at the bottom
                if (scrollInactivityTimerRef.current) {
                  clearTimeout(scrollInactivityTimerRef.current);
                  scrollInactivityTimerRef.current = null;
                }
              }
              // Show/hide scroll buttons based on position
              setShowScrollTop(contentOffset.y > 120);
              setShowScrollBottom(distanceFromBottom > 120);
            }}
            onContentSizeChange={() => {
              // Only auto-scroll on content size change when NOT streaming
              // (during streaming, smoothScrollToEnd handles it with throttled animated scroll)
              if (!isUserScrolledUpRef.current && !isStreaming) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            ListFooterComponent={
              isWaitingForFirstToken ? (
                // Three-dot typing indicator: shown from send until first AI token arrives
                <View style={chatStyles.typingRow}>
                  <View style={chatStyles.typingAvatarCol}>
                    <AIAvatar size={30} />
                  </View>
                  <View style={[chatStyles.typingBubble, { backgroundColor: "transparent" }]}>
                    <TypingDots color={colors.primary} />
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {/* ── Pending queued message bubbles (shown while offline) ── */}
        {offlineQueue.length > 0 && (
          <View style={[chatStyles.pendingQueueContainer, { borderTopColor: colors.border }]}>
            {offlineQueue.map((text, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                delayLongPress={400}
                onLongPress={() => {
                  const next = [...offlineQueueRef.current];
                  next.splice(i, 1);
                  offlineQueueRef.current = next;
                  setOfflineQueue([...next]);
                  H.impactMedium();
                }}
                style={[chatStyles.pendingBubble, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}30` }]}
              >
                <IconSymbol size={12} name="clock.fill" color={colors.muted} />
                <Text style={[chatStyles.pendingBubbleText, { color: colors.muted, fontSize: fs(13) }]} numberOfLines={2}>
                  {text}
                </Text>
                <Text style={{ color: colors.muted, fontSize: fs(10), opacity: 0.6 }}>Hold to remove</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Floating input bar ── */}
        <View
          style={[
            chatStyles.floatingBarWrapper,
            { paddingBottom: Math.max(insets.bottom, 8) },
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
                  ? "Message limit reached - Upgrade for unlimited chat"
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

          {/* Pill input card — glassmorphism */}
          <BlurView
            intensity={Platform.OS === "ios" ? 50 : 0}
            tint={colorScheme === "dark" ? "dark" : "light"}
            style={[
              chatStyles.inputCard,
              {
                borderColor: `${colors.primary}30`,
                shadowColor: colors.primary,
                shadowOpacity: 0.12,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
                overflow: "hidden",
              },
              Platform.OS !== "ios" && { backgroundColor: `${colors.surface}F5` },
            ]}
          >
            <TextInput
              ref={inputRef}
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
              returnKeyType={tutorSettings.sendOnEnter ? "send" : "default"}
              onSubmitEditing={() => { if (tutorSettings.sendOnEnter) handleSend(); }}
              blurOnSubmit={false}
              editable={!isAtLimit}
            />

            {/* Character counter — shown when within 200 chars of the 2000-char limit */}
            {inputText.length >= 1800 && (
              <Text
                style={[
                  chatStyles.charCounter,
                  { color: inputText.length >= 1950 ? colors.error : colors.warning },
                ]}
              >
                {2000 - inputText.length}
              </Text>
            )}

            {/* Voice input button — only shown when not streaming, input is empty, and voice input is enabled */}
            {!isStreaming && !inputText.trim() && tutorSettings.voiceInput && (
              <VoiceButton
                size={38}
                onTranscript={(text) => {
                  // Show transcript confidence toast for ~2.5 seconds before inserting
                  if (transcriptToastTimerRef.current) clearTimeout(transcriptToastTimerRef.current);
                  setTranscriptToast(text);
                  transcriptToastTimerRef.current = setTimeout(() => setTranscriptToast(null), 2500);
                  setInputText((prev) => (prev ? `${prev} ${text}` : text));
                }}
              />
            )}

            {/* Connection quality tooltip */}
            {showSlowTooltip && (
              <View style={[
                chatStyles.slowTooltip,
                { backgroundColor: slowTooltipState === "fast-restored" ? colors.success : colors.warning },
              ]}>
                <Text style={[chatStyles.slowTooltipText, { color: "#fff" }]}>
                  {slowTooltipState === "fast-restored"
                    ? "⚡ Fast connection restored"
                    : "🚢 Slow connection - responses may take longer"}
                </Text>
              </View>
            )}

            <Animated.View style={[
              { transform: [{ scale: sendBtnScaleAnim }] },
              // Amber ring when connection is slow
              connectionQuality === "slow" && isOnline && !isStreaming
                ? { borderRadius: 24, borderWidth: 2, borderColor: colors.warning, padding: 1 }
                : null,
            ]}>
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
                  activeOpacity={0.8}
                  style={chatStyles.sendBtn}
                >
                  {isOnline && !isAtLimit && inputText.trim() ? (
                    <LinearGradient
                      colors={["#6366F1", "#7C3AED"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={chatStyles.sendBtnGradient}
                    >
                      <IconSymbol size={17} name="paperplane.fill" color="#FFFFFF" />
                    </LinearGradient>
                  ) : (
                    <View style={[chatStyles.sendBtnGradient, { backgroundColor: colors.border }]}>
                      <IconSymbol size={17} name={isOnline ? "paperplane.fill" : "wifi.slash"} color={colors.muted} />
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </Animated.View>
          </BlurView>

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

      {/* ── Floating scroll buttons (always rendered, opacity-animated + scale press) ── */}
      <Animated.View
        pointerEvents={showScrollTop ? "auto" : "none"}
        style={[
          chatStyles.scrollFab,
          chatStyles.scrollFabLeft,
          { backgroundColor: colors.surface, borderColor: colors.border, bottom: 90, opacity: scrollTopOpacity, transform: [{ scale: scrollTopScaleAnim }] },
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="Scroll to top"
          onPressIn={() => {
            Animated.timing(scrollTopScaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
          }}
          onPressOut={() => {
            Animated.timing(scrollTopScaleAnim, { toValue: 1, duration: 140, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }).start();
          }}
          onPress={() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            H.impactLight();
          }}
          style={chatStyles.scrollFabInner}
          activeOpacity={1}
        >
          <IconSymbol size={18} name="chevron.up" color={colors.foreground} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        pointerEvents={showScrollBottom ? "auto" : "none"}
        style={[
          chatStyles.scrollFab,
          chatStyles.scrollFabRight,
          { backgroundColor: colors.surface, borderColor: colors.border, bottom: 90, opacity: scrollBottomOpacity, transform: [{ scale: scrollBottomScaleAnim }] },
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="Scroll to bottom"
          onPressIn={() => {
            Animated.timing(scrollBottomScaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
          }}
          onPressOut={() => {
            Animated.timing(scrollBottomScaleAnim, { toValue: 1, duration: 140, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }).start();
          }}
          onPress={() => {
            // Tapping the FAB is an explicit intent to go back to the bottom,
            // so release both scroll locks regardless of streaming state.
            isUserScrolledUpRef.current = false;
            isHighVelocityScrollRef.current = false;
            if (highVelocityPauseTimerRef.current) clearTimeout(highVelocityPauseTimerRef.current);
            if (scrollPendingRef.current) {
              clearTimeout(scrollPendingRef.current);
              scrollPendingRef.current = null;
            }
            // Round 42: hide the generating pill on FAB tap
            setGeneratingPillVisible(false);
            flatListRef.current?.scrollToEnd({ animated: true });
            H.impactLight();
          }}
          style={chatStyles.scrollFabInner}
          activeOpacity={1}
        >
          <IconSymbol size={18} name="chevron.down" color={colors.foreground} />
        </TouchableOpacity>
      </Animated.View>

      {/* Round 42: "↓ Generating…" pill — appears when user scrolls up during streaming */}
      <Animated.View
        pointerEvents={generatingPillVisible ? "auto" : "none"}
        style={[
          chatStyles.generatingPill,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            bottom: 14,
            opacity: generatingPillAnim,
            transform: [{
              translateY: generatingPillAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            }],
          },
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="Scroll to latest AI response"
          onPress={() => {
            isUserScrolledUpRef.current = false;
            isHighVelocityScrollRef.current = false;
            if (highVelocityPauseTimerRef.current) clearTimeout(highVelocityPauseTimerRef.current);
            if (scrollPendingRef.current) { clearTimeout(scrollPendingRef.current); scrollPendingRef.current = null; }
            setGeneratingPillVisible(false);
            flatListRef.current?.scrollToEnd({ animated: true });
            H.impactLight();
          }}
          style={chatStyles.generatingPillInner}
          activeOpacity={0.85}
        >
          <IconSymbol size={13} name="chevron.down" color={colors.primary} />
          <Text style={[chatStyles.generatingPillText, { color: colors.primary }]}>Generating…</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Voice transcript toast (tap to dismiss) ── */}
      {transcriptToast !== null && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            if (transcriptToastTimerRef.current) clearTimeout(transcriptToastTimerRef.current);
            setTranscriptToast(null);
          }}
          style={[
            chatStyles.transcriptToast,
            { backgroundColor: colors.foreground, bottom: 130 },
          ]}
        >
          <IconSymbol size={14} name="mic.fill" color={colors.background} />
          <Text
            style={[chatStyles.transcriptToastText, { color: colors.background }]}
            numberOfLines={2}
          >
            {transcriptToast}
          </Text>
          <IconSymbol size={12} name="xmark" color={colors.background} />
        </TouchableOpacity>
      )}

      {/* ── Subject picker sheet ── controlled directly via SubjectPicker */}
      <SubjectPicker
        value={selectedSubject}
        onChange={handleSubjectChange}
        showAll
        open={showSubjectPicker}
        onClose={() => setShowSubjectPicker(false)}
      />

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
                        saveSession(updated, tutorSettings.maxSessions);
                      }
                      // Fix 3: sync grade picker selection back to TutorSettings
                      if (next) updateTutorSetting({ gradeLevel: next });
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
        <TouchableOpacity
          style={[StyleSheet.absoluteFillObject, chatStyles.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          activeOpacity={1}
          onPress={() => setShowShareMenu(false)}
        >
          <View style={{ flex: 1 }} />
          <TouchableOpacity activeOpacity={1}>
            <View style={[chatStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[chatStyles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[chatStyles.sheetTitle, { color: colors.foreground, fontSize: fs(16) }]}>Share Chat</Text>

              {/* Share as Text */}
              <TouchableOpacity style={[chatStyles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]} onPress={handleShareText} activeOpacity={0.7}>
                <View style={[chatStyles.shareMenuIcon, { backgroundColor: `${colors.primary}18` }]}>
                  <IconSymbol size={18} name="square.and.arrow.up.fill" color={colors.primary} />
                </View>
                <View style={chatStyles.shareMenuInfo}>
                  <Text style={[chatStyles.shareMenuLabel, { color: colors.foreground, fontSize: fs(14) }]}>{Platform.OS === "web" ? (shareCopied ? "Copied!" : "Copy as Text") : "Share as Text"}</Text>
                  <Text style={[chatStyles.shareMenuDesc, { color: colors.muted, fontSize: fs(12) }]}>Send to WhatsApp, iMessage, etc.</Text>
                </View>
                <IconSymbol size={14} name="chevron.right" color={colors.muted} />
              </TouchableOpacity>

              {/* Share as PDF */}
              {Platform.OS !== "web" && (
                <TouchableOpacity style={[chatStyles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]} onPress={handleSharePDF} activeOpacity={0.7} disabled={pdfLoading}>
                  <View style={[chatStyles.shareMenuIcon, { backgroundColor: `${colors.error}18` }]}>
                    {pdfLoading ? <ActivityIndicator size="small" color={colors.error} /> : <IconSymbol size={18} name="doc.fill" color={colors.error} />}
                  </View>
                  <View style={chatStyles.shareMenuInfo}>
                    <Text style={[chatStyles.shareMenuLabel, { color: colors.foreground, fontSize: fs(14) }]}>Share as PDF</Text>
                    <Text style={[chatStyles.shareMenuDesc, { color: colors.muted, fontSize: fs(12) }]}>Formatted document with all steps</Text>
                  </View>
                  <IconSymbol size={14} name="chevron.right" color={colors.muted} />
                </TouchableOpacity>
              )}

              {/* Copy Link */}
              <TouchableOpacity style={[chatStyles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]} onPress={handleCopyLink} activeOpacity={0.7}>
                <View style={[chatStyles.shareMenuIcon, { backgroundColor: `${colors.success}18` }]}>
                  <IconSymbol size={18} name="link" color={colors.success} />
                </View>
                <View style={chatStyles.shareMenuInfo}>
                  <Text style={[chatStyles.shareMenuLabel, { color: colors.foreground, fontSize: fs(14) }]}>Copy Link</Text>
                  <Text style={[chatStyles.shareMenuDesc, { color: colors.muted, fontSize: fs(12) }]}>Copy stutorsnapai.tech solve link to clipboard</Text>
                </View>
                <IconSymbol size={14} name={copyLinkFeedback ? "checkmark.circle.fill" : "chevron.right"} color={copyLinkFeedback ? colors.success : colors.muted} />
              </TouchableOpacity>

              {/* Practice This Topic */}
              <TouchableOpacity style={[chatStyles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]} onPress={handlePracticeThisTopic} activeOpacity={0.7}>
                <View style={[chatStyles.shareMenuIcon, { backgroundColor: `${colors.warning}18` }]}>
                  <IconSymbol size={18} name="pencil.and.list.clipboard" color={colors.warning} />
                </View>
                <View style={chatStyles.shareMenuInfo}>
                  <Text style={[chatStyles.shareMenuLabel, { color: colors.foreground, fontSize: fs(14) }]}>Practice This Topic</Text>
                  <Text style={[chatStyles.shareMenuDesc, { color: colors.muted, fontSize: fs(12) }]}>Go to Practice mode for this subject</Text>
                </View>
                <IconSymbol size={14} name="chevron.right" color={colors.muted} />
              </TouchableOpacity>

              {/* Share to Classroom */}
              <TouchableOpacity style={[chatStyles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]} onPress={handleShareToClassroom} activeOpacity={0.7}>
                <View style={[chatStyles.shareMenuIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <IconSymbol size={18} name="person.2.fill" color={colors.primary} />
                </View>
                <View style={chatStyles.shareMenuInfo}>
                  <Text style={[chatStyles.shareMenuLabel, { color: colors.foreground, fontSize: fs(14) }]}>Share to Classroom</Text>
                  <Text style={[chatStyles.shareMenuDesc, { color: colors.muted, fontSize: fs(12) }]}>Add to your class problem feed</Text>
                </View>
                <IconSymbol size={14} name="chevron.right" color={colors.muted} />
              </TouchableOpacity>

              {/* Bookmark */}
              <TouchableOpacity style={[chatStyles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]} onPress={handleBookmark} activeOpacity={0.7}>
                <View style={[chatStyles.shareMenuIcon, { backgroundColor: `${colors.warning}18` }]}>
                  <IconSymbol size={18} name={bookmarked ? "bookmark.fill" : "bookmark"} color={colors.warning} />
                </View>
                <View style={chatStyles.shareMenuInfo}>
                  <Text style={[chatStyles.shareMenuLabel, { color: colors.foreground, fontSize: fs(14) }]}>{bookmarked ? "Remove Bookmark" : "Bookmark"}</Text>
                  <Text style={[chatStyles.shareMenuDesc, { color: colors.muted, fontSize: fs(12) }]}>{bookmarked ? "Remove from your saved solutions" : "Save to your bookmarks"}</Text>
                </View>
                <IconSymbol size={14} name="chevron.right" color={colors.muted} />
              </TouchableOpacity>

              {/* Invite a Friend */}
              <TouchableOpacity style={chatStyles.shareMenuItem} onPress={handleInviteFriend} activeOpacity={0.7}>
                <View style={[chatStyles.shareMenuIcon, { backgroundColor: `${colors.success}18` }]}>
                  <IconSymbol size={18} name="person.badge.plus" color={colors.success} />
                </View>
                <View style={chatStyles.shareMenuInfo}>
                  <Text style={[chatStyles.shareMenuLabel, { color: colors.foreground, fontSize: fs(14) }]}>Invite a Friend</Text>
                  <Text style={[chatStyles.shareMenuDesc, { color: colors.muted, fontSize: fs(12) }]}>Share your result + referral code</Text>
                </View>
                <IconSymbol size={14} name="chevron.right" color={colors.muted} />
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity style={[chatStyles.sheetCancel, { borderColor: colors.border, marginTop: 8 }]} onPress={() => setShowShareMenu(false)} activeOpacity={0.7}>
                <Text style={[chatStyles.sheetCancelText, { color: colors.muted, fontSize: fs(15) }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Round 44: ⋯ More menu dropdown (History + Share) */}
      {showMoreMenu && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFillObject, { zIndex: 200 }]}
          activeOpacity={1}
          onPress={() => setShowMoreMenu(false)}
        >
          <View
            style={[
              chatStyles.moreMenuDropdown,
              { backgroundColor: colors.surface, borderColor: colors.border, top: 56 + insets.top },
            ]}
          >
            {/* Subject */}
            <TouchableOpacity
              style={[chatStyles.moreMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => {
                setShowMoreMenu(false);
                setTimeout(() => setShowSubjectPicker(true), 150);
                H.impactLight();
              }}
            >
              <View style={[chatStyles.moreMenuIcon, { backgroundColor: selectedSubject ? `${subjectAccent}22` : `${colors.muted}18` }]}>
                {selectedSubject ? (
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: subjectAccent }} />
                ) : (
                  <IconSymbol size={16} name="book.fill" color={colors.muted} />
                )}
              </View>
              <Text style={[chatStyles.moreMenuLabel, { color: selectedSubject ? subjectAccent : colors.foreground, fontSize: fs(14) }]}>
                {selectedSubject ? getSubjectLabel(selectedSubject) : "Set Subject"}
              </Text>
              <IconSymbol size={13} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>

            {/* Grade Level */}
            <TouchableOpacity
              style={[chatStyles.moreMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => {
                setShowMoreMenu(false);
                setTimeout(() => setShowGradePicker(true), 150);
                H.impactLight();
              }}
            >
              <View style={[chatStyles.moreMenuIcon, { backgroundColor: gradeLevel ? `${colors.primary}18` : `${colors.muted}18` }]}>
                <IconSymbol size={16} name="graduationcap.fill" color={gradeLevel ? colors.primary : colors.muted} />
              </View>
              <Text style={[chatStyles.moreMenuLabel, { color: gradeLevel ? colors.primary : colors.foreground, fontSize: fs(14) }]}>
                {gradeLevel ? (GRADE_LABELS_LIB[gradeLevel] ?? gradeLevel) : "Set Level"}
              </Text>
              <IconSymbol size={13} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>

            {/* History */}
            <TouchableOpacity
              style={[chatStyles.moreMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => {
                setShowMoreMenu(false);
                router.push("/chat-history");
                H.impactLight();
              }}
            >
              <View style={[chatStyles.moreMenuIcon, { backgroundColor: `${colors.primary}18` }]}>
                <IconSymbol size={16} name="clock.fill" color={colors.primary} />
              </View>
              <Text style={[chatStyles.moreMenuLabel, { color: colors.foreground, fontSize: fs(14) }]}>Chat History</Text>
              <IconSymbol size={13} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              style={chatStyles.moreMenuItem}
              activeOpacity={0.7}
              onPress={() => {
                setShowMoreMenu(false);
                setTimeout(() => setShowShareMenu(true), 150);
                H.impactLight();
              }}
            >
              <View style={[chatStyles.moreMenuIcon, { backgroundColor: `${colors.success}18` }]}>
                <IconSymbol size={16} name="square.and.arrow.up.fill" color={colors.success} />
              </View>
              <Text style={[chatStyles.moreMenuLabel, { color: colors.foreground, fontSize: fs(14) }]}>Share Chat</Text>
              <IconSymbol size={13} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>

            {/* Delete — separator + red row */}
            <View style={{ height: 0.5, backgroundColor: colors.border, marginHorizontal: 12, marginTop: 4 }} />
            <TouchableOpacity
              style={[chatStyles.moreMenuItem, { marginTop: 2 }]}
              activeOpacity={0.7}
              onPress={() => {
                setShowMoreMenu(false);
                H.impactMedium();
                setTimeout(() => {
                  Alert.alert(
                    "Delete Chat",
                    "This will permanently delete the current chat and open a new one.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          streamAbortRef.current?.abort();
                          streamingMsgIdRef.current = null;
                          setIsStreaming(false);
                          setMessages([]);
                          setSessionMessageCount(0);
                          handleNewChat();
                        },
                      },
                    ]
                  );
                }, 150);
              }}
            >
              <View style={[chatStyles.moreMenuIcon, { backgroundColor: `${colors.error}18` }]}>
                <IconSymbol size={16} name="trash.fill" color={colors.error} />
              </View>
              <Text style={[chatStyles.moreMenuLabel, { color: colors.error, fontSize: fs(14), fontWeight: "600" }]}>Delete Chat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Tutor Settings — full-screen page sheet */}
      <TutorSettingsModal
        visible={showTutorSettings}
        onClose={() => setShowTutorSettings(false)}
        settings={tutorSettings}
        onUpdate={updateTutorSetting}
        onReset={resetTutorSettings}
        onClearHistory={handleClearAllHistory}
        onExportChat={() => {
          setShowTutorSettings(false);
          if (tutorSettings.exportFormat === "pdf" && Platform.OS !== "web") {
            // Trigger PDF export directly
            setTimeout(() => handleSharePDF(), 250);
          } else {
            // Default: open share menu for text/copy
            setTimeout(() => setShowShareMenu(true), 250);
          }
        }}
        modelName="TutorSnap AI (gpt-4o-mini)"
        systemPromptPreview={[
          "You are TutorSnap, a friendly and expert academic tutor.",
          selectedSubject ? `Subject: ${selectedSubject}` : null,
          gradeLevel ? `Grade: ${gradeLevel}` : null,
          tutorSettings.nickname ? `Student nickname: ${tutorSettings.nickname}` : null,
          `Tone: ${tutorSettings.tone} | Length: ${tutorSettings.responseLength} | Style: ${tutorSettings.learningStyle}`,
          tutorSettings.language !== "English" ? `Language: ${tutorSettings.language}` : null,
          tutorSettings.showWorking ? "Show all working steps." : "Give direct answers.",
          tutorSettings.useEmojis ? "Emojis: enabled" : "Emojis: disabled",
        ].filter(Boolean).join("\n")}
      />

      {/* ── Copy Link toast ── */}
      {copyLinkFeedback && (
        <View style={[chatStyles.linkToast, { backgroundColor: colors.success }]}>
          <IconSymbol size={14} name="checkmark.circle.fill" color="#fff" />
          <Text style={chatStyles.linkToastText}>Link copied!</Text>
        </View>
      )}

      {/* ── Subject cleared toast ── */}
      {subjectClearedToast && (
        <View style={[chatStyles.linkToast, { backgroundColor: colors.muted }]}>
          <IconSymbol size={14} name="xmark.circle.fill" color="#fff" />
          <Text style={chatStyles.linkToastText}>Subject cleared</Text>
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
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    zIndex: 10,
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
    paddingBottom: 8,
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
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    elevation: 8,
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
  charCounter: {
    fontSize: 11,
    fontWeight: "600",
    alignSelf: "flex-end",
    paddingBottom: 4,
    paddingHorizontal: 4,
    minWidth: 28,
    textAlign: "center",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
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
  shareMenuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  shareMenuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  shareMenuInfo: { flex: 1 },
  shareMenuLabel: { fontWeight: "600", marginBottom: 1 },
  shareMenuDesc: { lineHeight: 16 },
  linkToast: { position: "absolute", bottom: 100, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  offlineBannerText: { fontWeight: "600" },
  cancelQueueBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  cancelQueueText: { fontWeight: "600" },
  pendingQueueContainer: { borderTopWidth: 0.5, paddingHorizontal: 12, paddingVertical: 6, gap: 4 },
  pendingBubble: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  pendingBubbleText: { flex: 1, fontStyle: "italic" },
  slowTooltip: { position: "absolute", bottom: 52, right: 8, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 220, zIndex: 20 },
  slowTooltipText: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  linkToastText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  speedBadge: { position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  speedBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  scrollFab: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollFabLeft: { left: 14 },
  scrollFabRight: { right: 14 },
  scrollFabInner: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  transcriptToast: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  transcriptToastText: { fontSize: 13, fontWeight: "600", flex: 1, lineHeight: 18 },
  // Round 42: generating pill
  generatingPill: {
    position: "absolute",
    alignSelf: "center",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  generatingPillInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  generatingPillText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  // Round 44: subject color dot on input bar
  inputSubjectDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  inputSubjectDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  // Round 44: ⋯ more menu dropdown
  moreMenuDropdown: {
    position: "absolute",
    right: 12,
    width: 200,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 201,
  },
  moreMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  moreMenuIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  moreMenuLabel: {
    flex: 1,
    fontWeight: "500",
  },
  // Round 44: tutor settings popup
  tutorSettingsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  tutorSettingsSheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 16,
  },
  tutorSettingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  tutorSettingsTitle: {
    fontWeight: "700",
  },
  tutorSettingsClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorSettingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  tutorSettingsRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorSettingsRowLabel: {
    fontWeight: "600",
    marginBottom: 1,
  },
  tutorSettingsRowSub: {
    lineHeight: 16,
  },
});
