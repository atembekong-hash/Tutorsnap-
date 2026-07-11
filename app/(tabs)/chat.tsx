/**
 * AI Tutor Chat Screen
 *
 * Visual improvements applied:
 *  1. iMessage-style borderless bubbles — user: solid primary fill, AI: transparent/no card
 *  2. Avatar only on the first AI bubble in a consecutive run (like WhatsApp/iMessage)
 *  3. Gradient AI avatar badge (purple→blue sparkle) instead of emoji-in-box
 *  4. Floating pill input bar with shadow, floating above the tab bar
 *  5. Centred welcome empty-state card (ChatGPT-style) with 2-col prompt grid
 *  6. Animated three-dot typing indicator instead of spinner
 *
 * All existing features preserved:
 *  - Session persistence (create / load / save)
 *  - Subject picker (bottom sheet)
 *  - Share chat (text + PDF)
 *  - Chat history navigation
 *  - Free-tier message limit + paywall modal
 *  - Seed message auto-send (from Discuss with Tutor)
 *  - Clear conversation
 *  - Offline detection
 *  - Font-size scaling
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useReducer,
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
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type { ChatMessage } from "@/shared/types";
import { SubjectPicker } from "@/components/subject-picker";
import { type SubjectId, getSubjectLabel } from "@/lib/subjects";
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

// ─── Quick Prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: "Quadratic formula", text: "Explain the quadratic formula" },
  { label: "Photosynthesis", text: "What is photosynthesis?" },
  { label: "Romeo & Juliet", text: "Summarize Romeo and Juliet" },
  { label: "World War I", text: "What caused World War I?" },
  { label: "Newton's laws", text: "Explain Newton's laws of motion" },
  { label: "Supply & demand", text: "What is supply and demand?" },
];

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

// ─── Gradient AI Avatar ───────────────────────────────────────────────────────

function AIAvatar({ size = 30 }: { size?: number }) {
  return (
    <LinearGradient
      colors={["#7C3AED", "#2563EB"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Text style={{ fontSize: size * 0.45, lineHeight: size * 0.55 }}>✦</Text>
    </LinearGradient>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isFirstInRun,
  colors,
  fs,
}: {
  message: ChatMessage;
  isFirstInRun: boolean;
  colors: ReturnType<typeof useColors>;
  fs: (n: number) => number;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View style={[bubbleStyles.userRow]}>
        <View
          style={[
            bubbleStyles.userBubble,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              bubbleStyles.userText,
              { color: "#FFFFFF", fontSize: fs(15), lineHeight: fs(15) * 1.5 },
            ]}
          >
            {message.content}
          </Text>
          <Text style={[bubbleStyles.timeText, { color: "rgba(255,255,255,0.55)", fontSize: fs(10) }]}>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  }

  // AI bubble — full width, no card background, avatar only on first in run
  return (
    <View style={bubbleStyles.aiRow}>
      {/* Avatar column — always reserve space so text aligns */}
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
  );
}

const bubbleStyles = StyleSheet.create({
  // User
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
  // AI
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
  aiContent: {
    flex: 1,
    paddingRight: 8,
  },
  timeText: { textAlign: "right" },
});

// ─── Welcome empty-state card ─────────────────────────────────────────────────

function WelcomeCard({
  colors,
  fs,
  onPrompt,
}: {
  colors: ReturnType<typeof useColors>;
  fs: (n: number) => number;
  onPrompt: (text: string) => void;
}) {
  return (
    <View style={welcomeStyles.container}>
      <AIAvatar size={64} />
      <Text style={[welcomeStyles.title, { color: colors.foreground, fontSize: fs(22) }]}>
        TutorSnap AI
      </Text>
      <Text style={[welcomeStyles.subtitle, { color: colors.muted, fontSize: fs(14) }]}>
        Ask me anything — Math, Science, English, History, and more.
      </Text>
      <View style={welcomeStyles.grid}>
        {QUICK_PROMPTS.map((p, i) => (
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
              style={[welcomeStyles.chipText, { color: colors.foreground, fontSize: fs(13) }]}
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
  subtitle: { textAlign: "center", lineHeight: 22, maxWidth: 280 },
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
  const subjectName = subject ? getSubjectLabel(subject) : null;
  return {
    id: "welcome-" + Date.now(),
    role: "assistant",
    content: subjectName
      ? `I'm ready to help with ${subjectName}! Ask me anything — I'll explain concepts, help with problems, and guide you step by step. 📚`
      : "Hi! I'm TutorSnap, your personal academic tutor. Ask me anything — Math, Science, English, History, and more. I'll explain concepts, help with homework, and guide you step by step! 📚",
    timestamp: Date.now(),
  };
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

  // Tab bar height for floating input offset
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const TAB_BAR_HEIGHT = 60 + bottomPadding;

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
    return () => {
      cancelled = true;
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
      month: "long",
      day: "numeric",
      year: "numeric",
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
        hour: "2-digit",
        minute: "2-digit",
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
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const bubbles = messages
        .filter((m) => !m.id.startsWith("welcome"))
        .map((m) => {
          const isUser = m.role === "user";
          const time = new Date(m.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const text = m.content
            .replace(/\$\$[\s\S]*?\$\$/g, "[equation]")
            .replace(/\$[^$\n]+\$/g, "[math]")
            .replace(/#{1,6}\s/g, "")
            .replace(/\*\*|__/g, "")
            .replace(/\*|_/g, "")
            .replace(/`{1,3}/g, "")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .trim();
          return `<div class="bubble ${isUser ? "user" : "ai"}"><div class="role">${
            isUser ? "You" : "TutorSnap AI"
          } <span class="time">${time}</span></div><div class="text">${text.replace(
            /\n/g,
            "<br/>"
          )}</div></div>`;
        })
        .join("");

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;margin:0;padding:32px;background:#fff;color:#1a1a1a}.header{border-bottom:2px solid #7C3AED;padding-bottom:16px;margin-bottom:24px}.header h1{margin:0 0 4px;font-size:20px;color:#7C3AED}.header p{margin:0;font-size:13px;color:#666}.bubble{margin-bottom:16px;max-width:80%}.bubble.user{margin-left:auto}.role{font-size:11px;font-weight:700;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}.bubble.user .role{text-align:right}.time{font-weight:400;margin-left:6px}.text{background:#f5f5f5;border-radius:12px;padding:12px 16px;font-size:14px;line-height:1.6}.bubble.user .text{background:#7C3AED;color:#fff}.footer{margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center}</style></head><body><div class="header"><h1>${session.title.replace(
        /</g,
        "&lt;"
      )}</h1><p>Subject: ${subjectLabel} &middot; ${dateStr} &middot; ${
        messages.filter((m) => !m.id.startsWith("welcome")).length
      } messages</p></div>${
        bubbles || '<p style="color:#aaa">No messages yet.</p>'
      }<div class="footer">Exported from TutorSnap &middot; tutorsnapai.tech</div></body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save Chat PDF",
        });
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
        await Clipboard.setStringAsync(shareText);
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

  // ── Derived ─────────────────────────────────────────────────────────────────

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const isAtLimit =
    !isPremium && !isDevMode && sessionMessageCount >= FREE_LIMITS.chatMessagesPerSession;
  const messagesLeft = Math.max(0, FREE_LIMITS.chatMessagesPerSession - sessionMessageCount);
  const showWelcome = sessionLoaded && userMessageCount === 0;

  // ── Render helpers ──────────────────────────────────────────────────────────

  // Determine if a message is the first in a consecutive AI run
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={TAB_BAR_HEIGHT}
      >
        {/* ── Slim header ── */}
        <View
          style={[
            chatStyles.header,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={chatStyles.headerLeft}>
            <AIAvatar size={34} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[
                  chatStyles.headerTitle,
                  { color: colors.foreground, fontSize: fs(16) },
                ]}
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
                    {
                      color: isOnline ? colors.success : colors.error,
                      fontSize: fs(11),
                    },
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
                      {getSubjectLabel(selectedSubject)}
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
                name={
                  shareCopied
                    ? "checkmark.circle.fill"
                    : "square.and.arrow.up.fill"
                }
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
          // Empty state — centred welcome card
          <WelcomeCard colors={colors} fs={fs} onPrompt={(t) => handleSend(t)} />
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
              />
            )}
            contentContainerStyle={{
              paddingTop: 12,
              paddingBottom: 16,
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListFooterComponent={
              chatMutation.isPending ? (
                <View style={chatStyles.typingRow}>
                  <View style={chatStyles.typingAvatarCol}>
                    <AIAvatar size={30} />
                  </View>
                  <View
                    style={[
                      chatStyles.typingBubble,
                      { backgroundColor: colors.surface },
                    ]}
                  >
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
                  backgroundColor: isAtLimit
                    ? `${colors.error}15`
                    : `${colors.warning}12`,
                  borderColor: isAtLimit
                    ? `${colors.error}35`
                    : `${colors.warning}28`,
                },
              ]}
            >
              <Text
                style={[
                  chatStyles.limitText,
                  {
                    color: isAtLimit ? colors.error : colors.warning,
                    fontSize: fs(12),
                  },
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
            {/* Subject pill button */}
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

            {/* Text input */}
            <TextInput
              style={[
                chatStyles.input,
                {
                  color: colors.foreground,
                  fontSize: fs(15),
                  lineHeight: fs(15) * 1.45,
                },
              ]}
              placeholder={
                isAtLimit ? "Upgrade to keep chatting…" : "Ask anything…"
              }
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
              editable={!isAtLimit}
            />

            {/* Send button */}
            <TouchableOpacity
              accessibilityLabel="Send message"
              onPress={() => handleSend()}
              disabled={
                !inputText.trim() ||
                chatMutation.isPending ||
                !isOnline ||
                isAtLimit
              }
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
                  isOnline && !isAtLimit && inputText.trim()
                    ? "#FFFFFF"
                    : colors.muted
                }
              />
            </TouchableOpacity>
          </View>

          {/* Clear link — only when there are messages */}
          {userMessageCount > 0 && (
            <TouchableOpacity
              onPress={handleClearChat}
              style={chatStyles.clearRow}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  chatStyles.clearText,
                  { color: colors.muted, fontSize: fs(11) },
                ]}
              >
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
            <Text
              style={[
                chatStyles.sheetTitle,
                { color: colors.foreground, fontSize: fs(16) },
              ]}
            >
              Focus Subject
            </Text>
            <SubjectPicker
              value={selectedSubject}
              onChange={handleSubjectChange}
              showAll
            />
            <TouchableOpacity
              style={[chatStyles.sheetCancel, { borderColor: colors.border }]}
              onPress={() => setShowSubjectPicker(false)}
              activeOpacity={0.7}
            >
              <Text
                style={[chatStyles.sheetCancelText, { color: colors.muted, fontSize: fs(15) }]}
              >
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
            <Text
              style={[
                chatStyles.sheetTitle,
                { color: colors.foreground, fontSize: fs(16) },
              ]}
            >
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
                  <Text
                    style={[
                      chatStyles.sheetOptionTitle,
                      { color: colors.foreground, fontSize: fs(15) },
                    ]}
                  >
                    Save as PDF
                  </Text>
                  <Text
                    style={[
                      chatStyles.sheetOptionSub,
                      { color: colors.muted, fontSize: fs(12) },
                    ]}
                  >
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
              <IconSymbol
                size={22}
                name="square.and.arrow.up.fill"
                color={colors.primary}
              />
              <View style={chatStyles.sheetOptionText}>
                <Text
                  style={[
                    chatStyles.sheetOptionTitle,
                    { color: colors.foreground, fontSize: fs(15) },
                  ]}
                >
                  {Platform.OS === "web" ? "Copy as Text" : "Share as Text"}
                </Text>
                <Text
                  style={[
                    chatStyles.sheetOptionSub,
                    { color: colors.muted, fontSize: fs(12) },
                  ]}
                >
                  {Platform.OS === "web"
                    ? "Copy conversation to clipboard"
                    : "Share via messages, email, or notes"}
                </Text>
              </View>
              {shareCopied && (
                <IconSymbol
                  size={18}
                  name="checkmark.circle.fill"
                  color={colors.success}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[chatStyles.sheetCancel, { borderColor: colors.border }]}
              onPress={() => setShowShareMenu(false)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  chatStyles.sheetCancelText,
                  { color: colors.muted, fontSize: fs(15) },
                ]}
              >
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
            <Text
              style={[
                chatStyles.pdfCardText,
                { color: colors.foreground, fontSize: fs(15) },
              ]}
            >
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
              style={{
                position: "absolute",
                top: 16,
                right: 20,
                zIndex: 10,
                padding: 8,
              }}
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
  // Header
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

  // Messages
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Typing indicator
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

  // Floating input bar
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
    // Shadow
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

  // Sheets
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

  // PDF overlay
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
});
