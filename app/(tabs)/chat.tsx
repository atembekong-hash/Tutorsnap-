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
  useMemo,
} from "react";
import { useFocusEffect } from "expo-router";
import { useAudioRecorder, RecordingPresets, AudioModule } from "expo-audio";
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
import * as Haptics from "expo-haptics";
// expo-linear-gradient removed — uses requireNativeViewManager which needs a native rebuild.
// Gradient avatar is implemented with pure React Native Views instead.
// expo-clipboard, expo-print, expo-sharing are loaded lazily inside handlers
// to avoid native module crashes on Android when the tab is first mounted.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
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

// ─── Saved Notes storage key ──────────────────────────────────────────────────

const SAVED_NOTES_KEY = "tutor_saved_notes";
const NOTES_LAST_SEEN_KEY = "tutor_notes_last_seen";
async function saveNote(content: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_NOTES_KEY);
    const notes: Array<{ id: string; content: string; savedAt: number }> = raw
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

const SUBJECT_PROMPTS: Partial<Record<string, Array<{ label: string; text: string }>>> = {
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

// ─── AI Avatar (pure RN, no native gradient) ─────────────────────────────────
// Uses a solid purple circle with a ✦ symbol — no expo-linear-gradient needed.
function AIAvatar({ size = 30 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#7C3AED",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Text style={{ fontSize: size * 0.42, lineHeight: size * 0.55, color: "#fff" }}>✦</Text>
    </View>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isFirstInRun,
  colors,
  fs,
  onLongPressAI,
}: {
  message: ChatMessage;
  isFirstInRun: boolean;
  colors: ReturnType<typeof useColors>;
  fs: (n: number) => number;
  onLongPressAI: (content: string) => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View style={bubbleStyles.userRow}>
        <View style={[bubbleStyles.userBubble, { backgroundColor: colors.primary }]}>
          <Text
            style={[
              bubbleStyles.userText,
              { color: "#FFFFFF", fontSize: fs(15), lineHeight: fs(15) * 1.5 },
            ]}
          >
            {message.content}
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
      <View style={bubbleStyles.aiRow}>
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
              stripPreamble
            />
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
  const flatListRef = useRef<FlatList>(null);
  const { isOnline } = useNetworkStatus();
  const [unseenNotesCount, setUnseenNotesCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // Load unseen notes count whenever the screen is focused
  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadUnseen() {
        try {
          const [rawNotes, rawSeen] = await Promise.all([
            AsyncStorage.getItem(SAVED_NOTES_KEY),
            AsyncStorage.getItem(NOTES_LAST_SEEN_KEY),
          ]);
          const notes: Array<{ savedAt: number }> = rawNotes ? JSON.parse(rawNotes) : [];
          const lastSeen: number = rawSeen ? JSON.parse(rawSeen) : 0;
          const unseen = notes.filter((n) => n.savedAt > lastSeen).length;
          if (active) setUnseenNotesCount(unseen);
        } catch { /* ignore */ }
      }
      loadUnseen();
      return () => { active = false; };
    }, [])
  );

  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  // Tab bar is 60px tall + bottom safe area padding.
  // keyboardVerticalOffset must equal the distance from the bottom of the
  // KeyboardAvoidingView to the bottom of the screen (i.e. the tab bar height).
  const TAB_BAR_HEIGHT = 56 + bottomPadding;

  // ── Session init ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await migrateOldChatHistory();

      if (params.newSession === "1" || !params.sessionId) {
        const newSession = await createSession(null);
        const welcome = makeWelcomeMessage(null);
        const withWelcome: ChatSession = { ...newSession, messages: [welcome] };
        if (!cancelled) {
          setSession(withWelcome);
          setMessages([welcome]);
          setSessionLoaded(true);
        }
      } else {
        const existing = await loadSession(params.sessionId);
        if (!cancelled) {
          if (existing) {
            setSession(existing);
            setMessages(
              existing.messages.length > 0
                ? existing.messages
                : [makeWelcomeMessage(existing.subject as SubjectId | null)]
            );
            setSelectedSubject((existing.subject as SubjectId | null) ?? null);
          } else {
            const newSession = await createSession(null);
            const welcome = makeWelcomeMessage(null);
            setSession({ ...newSession, messages: [welcome] });
            setMessages([welcome]);
          }
          setSessionLoaded(true);
        }
      }
    }

    init();
    return () => { cancelled = true; };
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

  const transcribeMutation = trpc.voice.transcribe.useMutation();
  const chatMutation = trpc.academic.chat.useMutation({
    onSuccess: (data) => {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, aiMessage];
        if (session) persistMessages(next, session);
        return next;
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  // ── Send ────────────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = (text || inputText).trim();
      if (!messageText || !isOnline || !session) return;

      if (!isPremium && !isDevMode) {
        if (sessionMessageCount >= FREE_LIMITS.chatMessagesPerSession) {
          setShowPaywallModal(true);
          return;
        }
        setSessionMessageCount((c) => c + 1);
        await incUsage("chat");
      }

      Keyboard.dismiss();
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

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

      chatMutation.mutate({
        messages: contextMessages,
        subject: selectedSubject ?? undefined,
      });
    },
    [inputText, isOnline, session, messages, persistMessages, selectedSubject, chatMutation]
  );

  // ── Long-press AI bubble handler ────────────────────────────────────────────

  const handleLongPressAI = useCallback(
    (content: string) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

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
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          Alert.alert("Copied", "Response copied to clipboard.");
        } catch {
          Alert.alert("Error", "Could not copy text.");
        }
      };

      const doSave = async () => {
        await saveNote(plainText);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Saved", "Response saved to your Notes.");
      };

      showAIBubbleMenu(plainText, colors, doCopy, doSave);
    },
    [colors]
  );

  // ── New Chat ────────────────────────────────────────────────────────────────

  const handleNewChat = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newSession = await createSession(null);
    const welcome = makeWelcomeMessage(null);
    const withWelcome: ChatSession = { ...newSession, messages: [welcome] };
    setSession(withWelcome);
    setMessages([welcome]);
    setSelectedSubject(null);
    setInputText("");
    setSessionMessageCount(0);
    await saveSession(withWelcome);
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
    lines.push("", "Shared from TutorSnap · tutorsnapai.tech");
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

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;margin:0;padding:32px;background:#fff;color:#1a1a1a}.header{border-bottom:2px solid #7C3AED;padding-bottom:16px;margin-bottom:24px}.header h1{margin:0 0 4px;font-size:20px;color:#7C3AED}.header p{margin:0;font-size:13px;color:#666}.bubble{margin-bottom:16px;max-width:80%}.bubble.user{margin-left:auto}.role{font-size:11px;font-weight:700;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}.bubble.user .role{text-align:right}.time{font-weight:400;margin-left:6px}.text{background:#f5f5f5;border-radius:12px;padding:12px 16px;font-size:14px;line-height:1.6}.bubble.user .text{background:#7C3AED;color:#fff}.footer{margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center}</style></head><body><div class="header"><h1>${session.title.replace(/</g, "&lt;")}</h1><p>Subject: ${subjectLabel} &middot; ${dateStr} &middot; ${messages.filter(m => !m.id.startsWith("welcome")).length} messages</p></div>${bubbles || '<p style="color:#aaa">No messages yet.</p>'}<div class="footer">Exported from TutorSnap &middot; tutorsnapai.tech</div></body></html>`;

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
        setTimeout(() => setShareCopied(false), 2500);
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
      if (messages.filter((m) => !m.id.startsWith("welcome")).length === 0) {
        const welcome = makeWelcomeMessage(id);
        setMessages([welcome]);
        await saveSession({ ...updated, messages: [welcome] });
      }
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
          const welcome = makeWelcomeMessage(selectedSubject);
          setMessages([welcome]);
          setSessionMessageCount(0);
          if (session) {
            await saveSession({ ...session, messages: [welcome], messageCount: 1 });
          }
        },
      },
    ]);
  }, [session, selectedSubject]);

  // ── Voice input ────────────────────────────────────────────────────────────
  const handleVoiceInput = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Voice Input", "Voice input is not available on web.");
      return;
    }
    if (isRecording) {
      // Stop recording and transcribe
      try {
        audioRecorder.stop();
        setIsRecording(false);
        setIsTranscribing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Get the recording URI
        const uri = audioRecorder.uri;
        if (!uri) { setIsTranscribing(false); return; }
        // Read as base64
        const FSModule = await import("expo-file-system/legacy");
        const base64 = await FSModule.readAsStringAsync(uri, { encoding: FSModule.EncodingType.Base64 });
        // Upload to server
        const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3000";
        const uploadResp = await fetch(`${API_BASE}/api/voice/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mimeType: "audio/m4a" }),
        });
        if (!uploadResp.ok) throw new Error("Upload failed");
        const { url: audioUrl } = await uploadResp.json();
        // Transcribe via tRPC
        const result = await transcribeMutation.mutateAsync({ audioUrl });
        if (result.text) {
          setInputText((prev) => (prev ? prev + " " + result.text : result.text));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (err) {
        Alert.alert("Transcription failed", "Could not transcribe audio. Please try again.");
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Start recording
      try {
        await AudioModule.requestRecordingPermissionsAsync();
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setIsRecording(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (err) {
        Alert.alert("Microphone", "Could not access microphone. Please check permissions.");
      }
    }
  }, [isRecording, audioRecorder]);

    // ── Follow-up chips ────────────────────────────────────────────────────────
  // Show 3 contextual follow-up chips after the last AI response
  const GENERIC_FOLLOWUPS = [
    { label: "Give me an example", text: "Can you give me a concrete example of that?" },
    { label: "Quiz me on this", text: "Quiz me on what we just covered." },
    { label: "Explain differently", text: "Can you explain that in a different way?" },
    { label: "Step by step", text: "Can you walk me through that step by step?" },
    { label: "Why does this work?", text: "Why does this work? What's the underlying reason?" },
    { label: "Common mistakes?", text: "What are the most common mistakes students make with this?" },
  ];
  const followUpChips = useMemo(() => {
    if (chatMutation.isPending) return [];
    const lastMsg = [...messages].reverse().find((m) => m.role === "assistant" && !m.id.startsWith("welcome"));
    if (!lastMsg) return [];
    // Rotate chips based on message count so they feel fresh each time
    const offset = messages.length % GENERIC_FOLLOWUPS.length;
    return [
      GENERIC_FOLLOWUPS[offset % GENERIC_FOLLOWUPS.length],
      GENERIC_FOLLOWUPS[(offset + 1) % GENERIC_FOLLOWUPS.length],
      GENERIC_FOLLOWUPS[(offset + 2) % GENERIC_FOLLOWUPS.length],
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, chatMutation.isPending]);
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
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
            {/* Gradient avatar in header — 28px */}
            <AIAvatar size={28} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[chatStyles.headerTitle, { color: colors.foreground, fontSize: fs(16) }]}
                numberOfLines={1}
              >
                {session?.title && session.title !== "New Chat"
                  ? session.title
                  : "AI Tutor"}
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
            <TouchableOpacity
              onPress={() => setShowSubjectPicker(true)}
              accessibilityLabel="Change subject"
              style={chatStyles.headerBtn}
              activeOpacity={0.7}
            >
              <IconSymbol
                size={19}
                name="book.fill"
                color={selectedSubject ? colors.primary : colors.muted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                // Mark all notes as seen
                await AsyncStorage.setItem(NOTES_LAST_SEEN_KEY, JSON.stringify(Date.now()));
                setUnseenNotesCount(0);
                router.push("/(tabs)/notes");
              }}
              accessibilityLabel="My saved notes"
              style={chatStyles.headerBtn}
              activeOpacity={0.7}
            >
              <View style={{ position: "relative" }}>
                <IconSymbol
                  size={19}
                  name="bookmark.fill"
                  color={unseenNotesCount > 0 ? colors.primary : colors.muted}
                />
                {unseenNotesCount > 0 && (
                  <View
                    style={[
                      chatStyles.noteBadge,
                      { backgroundColor: colors.error },
                    ]}
                  >
                    <Text style={chatStyles.noteBadgeText}>
                      {unseenNotesCount > 9 ? "9+" : String(unseenNotesCount)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/chat-history")}
              accessibilityLabel="Chat history"
              style={chatStyles.headerBtn}
              activeOpacity={0.7}
            >
              <IconSymbol size={19} name="clock.fill" color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowShareMenu(true)}
              accessibilityLabel="Share chat"
              style={chatStyles.headerBtn}
              activeOpacity={0.7}
            >
              <IconSymbol
                size={19}
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
              <IconSymbol size={17} name="plus" color={colors.primary} />
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
              <MessageBubble
                message={item}
                isFirstInRun={isFirstInRun(index)}
                colors={colors}
                fs={fs}
                onLongPressAI={handleLongPressAI}
              />
            )}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              const distFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
              setShowScrollBtn(distFromBottom > 120);
            }}
            scrollEventThrottle={100}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListFooterComponent={
              chatMutation.isPending ? (
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

        {/* ── Scroll-to-bottom button ── */}
        {showScrollBtn && (
          <TouchableOpacity
            onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
            style={[chatStyles.scrollBtn, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: "#000" }]}
            activeOpacity={0.8}
          >
            <IconSymbol size={18} name="chevron.down" color={colors.primary} />
          </TouchableOpacity>
        )}
        {/* ── Follow-up chips ── */}
        {followUpChips.length > 0 && (
          <View style={chatStyles.followUpRow}>
            {followUpChips.map((chip) => (
              <TouchableOpacity
                key={chip.label}
                onPress={() => handleSend(chip.text)}
                style={[
                  chatStyles.followUpChip,
                  { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}30` },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[chatStyles.followUpChipText, { color: colors.primary, fontSize: fs(12) }]}
                  numberOfLines={1}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {/* ── Floating input bar ── */}
        <View
          style={[
            chatStyles.floatingBarWrapper,
            { paddingBottom: Platform.OS === "ios" ? 10 : 8 },
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
                    ? `${colors.primary}18`
                    : colors.background,
                  borderColor: selectedSubject ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <IconSymbol
                size={15}
                name="book.fill"
                color={selectedSubject ? colors.primary : colors.muted}
              />
            </TouchableOpacity>
            <TextInput
              style={[
                chatStyles.input,
                { color: colors.foreground, fontSize: fs(14), lineHeight: fs(14) * 1.4 },
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
            {/* Mic button — hidden when text is typed */}
            {!inputText.trim() && (
              <TouchableOpacity
                accessibilityLabel={isRecording ? "Stop recording" : "Voice input"}
                onPress={handleVoiceInput}
                disabled={isTranscribing}
                style={[
                  chatStyles.micBtn,
                  {
                    backgroundColor: isRecording
                      ? `${colors.error}20`
                      : `${colors.primary}14`,
                  },
                ]}
                activeOpacity={0.75}
              >
                {isTranscribing ? (
                  <ActivityIndicator size={14} color={colors.primary} />
                ) : (
                  <IconSymbol
                    size={15}
                    name={isRecording ? "mic.slash.fill" : "mic.fill"}
                    color={isRecording ? colors.error : colors.primary}
                  />
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityLabel="Send message"
              onPress={() => handleSend()}
              disabled={!inputText.trim() || chatMutation.isPending || !isOnline || isAtLimit}
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  headerBtn: { padding: 8 },
  newChatBtn: { borderRadius: 10, padding: 7 },
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
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  subjectPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    maxHeight: 60,
    paddingTop: Platform.OS === "ios" ? 3 : 2,
    paddingBottom: Platform.OS === "ios" ? 3 : 2,
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  clearRow: { alignItems: "center", paddingBottom: 2 },
  clearText: { textDecorationLine: "underline" },
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
  noteBadge: {
    position: "absolute",
    top: -5,
    right: -6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  noteBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 14,
  },
  followUpRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  followUpChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  followUpChipText: {
    fontWeight: "600",
  },
  scrollBtn: {
    position: "absolute",
    right: 16,
    bottom: 80,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  micBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
