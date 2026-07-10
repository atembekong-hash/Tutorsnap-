import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { AIResponseRenderer, AIResponseErrorBoundary } from "@/components/ai-response-renderer";
import {
  createSession,
  loadSession,
  saveSession,
  generateSessionTitle,
  migrateOldChatHistory,
  type ChatSession,
} from "@/lib/chat-sessions";

// ─── Quick Prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "Explain the quadratic formula",
  "What is photosynthesis?",
  "Summarize Romeo and Juliet",
  "What caused World War I?",
  "Explain Newton's laws of motion",
  "What is supply and demand?",
];

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  colors,
  fs,
}: {
  message: ChatMessage;
  colors: any;
  fs: (n: number) => number;
}) {
  const isUser = message.role === "user";
  return (
    <View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.aiBubble,
        {
          backgroundColor: isUser ? colors.primary : colors.surface,
          borderColor: isUser ? colors.primary : colors.border,
        },
      ]}
    >
      {!isUser && (
        <View style={[styles.aiAvatar, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={{ fontSize: 12 }}>🧮</Text>
        </View>
      )}
      <View style={styles.bubbleContent}>
        {isUser ? (
          <Text
            style={[
              styles.messageText,
              { color: "#FFFFFF", fontSize: fs(15), lineHeight: fs(15) * 1.47 },
            ]}
          >
            {message.content}
          </Text>
        ) : (
          <AIResponseErrorBoundary
            fallbackText={message.content}
            fontSize={fs(15)}
            color={colors.foreground}
          >
            <AIResponseRenderer
              markdown={message.content}
              fontSize={fs(15)}
              color={colors.foreground}
              codeBackground={colors.background}
              flavor="github"
              stripPreamble
            />
          </AIResponseErrorBoundary>
        )}
        <Text
          style={[
            styles.messageTime,
            { color: isUser ? "rgba(255,255,255,0.6)" : colors.muted, fontSize: fs(11) },
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
  const params = useLocalSearchParams<{ sessionId?: string; newSession?: string }>();

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [inputText, setInputText] = useState("");
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const { isOnline } = useNetworkStatus();

  // ── Session init ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Run migration once (no-op if already done)
      await migrateOldChatHistory();

      if (params.newSession === "1" || !params.sessionId) {
        // Start a brand-new session
        const newSession = await createSession(null);
        const welcome = makeWelcomeMessage(null);
        const withWelcome: ChatSession = { ...newSession, messages: [welcome] };
        if (!cancelled) {
          setSession(withWelcome);
          setMessages([welcome]);
          setSessionLoaded(true);
        }
      } else {
        // Resume an existing session
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
            // Session not found — create new
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

  // ── Persist helper ──────────────────────────────────────────────────────────

  const persistMessages = useCallback(
    async (msgs: ChatMessage[], currentSession: ChatSession) => {
      const updated: ChatSession = {
        ...currentSession,
        messages: msgs,
        messageCount: msgs.length,
        updatedAt: Date.now(),
      };
      // Auto-title from first user message
      if (updated.title === "New Chat") {
        const firstUser = msgs.find((m) => m.role === "user");
        if (firstUser) {
          updated.title = generateSessionTitle(firstUser.content);
        }
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
    (text?: string) => {
      const messageText = (text || inputText).trim();
      if (!messageText || !isOnline || !session) return;

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
    await saveSession(withWelcome);
  }, []);

  // ── Share chat ──────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    if (!session) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
    const shareText = lines.join("\n");

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
  }, [session, messages, selectedSubject]);

  // ── Subject change ──────────────────────────────────────────────────────────

  const handleSubjectChange = useCallback(
    async (id: SubjectId | null) => {
      setSelectedSubject(id);
      if (!session) return;
      const updated: ChatSession = { ...session, subject: id };
      setSession(updated);
      await saveSession(updated);
      // If chat is empty, update the welcome message
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
          if (session) {
            await saveSession({ ...session, messages: [welcome], messageCount: 1 });
          }
        },
      },
    ]);
  }, [session, selectedSubject]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const userMessageCount = messages.filter((m) => m.role === "user").length;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.aiIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={{ fontSize: 20 }}>🧮</Text>
            </View>
            <View>
              <Text
                style={[styles.headerTitle, { color: colors.foreground, fontSize: fs(17) }]}
                numberOfLines={1}
              >
                {session?.title && session.title !== "New Chat"
                  ? session.title
                  : "AI Tutor"}
              </Text>
              <View style={styles.onlineRow}>
                <View
                  style={[
                    styles.onlineDot,
                    { backgroundColor: isOnline ? colors.success : colors.error },
                  ]}
                />
                <Text
                  style={[
                    styles.onlineText,
                    {
                      color: isOnline ? colors.success : colors.error,
                      fontSize: fs(12),
                    },
                  ]}
                >
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </View>
          </View>

          {/* Header action buttons */}
          <View style={styles.headerActions}>
            {/* Share */}
            <TouchableOpacity
              onPress={handleShare}
              accessibilityLabel={Platform.OS === "web" ? "Copy chat to clipboard" : "Share chat"}
              style={styles.headerBtn}
              activeOpacity={0.7}
            >
              <IconSymbol
                size={20}
                name={shareCopied ? "checkmark.circle.fill" : "square.and.arrow.up.fill"}
                color={shareCopied ? colors.success : colors.muted}
              />
            </TouchableOpacity>

            {/* History */}
            <TouchableOpacity
              onPress={() => router.push("/chat-history")}
              accessibilityLabel="View chat history"
              style={styles.headerBtn}
              activeOpacity={0.7}
            >
              <IconSymbol size={20} name="clock.fill" color={colors.muted} />
            </TouchableOpacity>

            {/* New chat */}
            <TouchableOpacity
              onPress={handleNewChat}
              accessibilityLabel="Start new chat"
              style={styles.headerBtn}
              activeOpacity={0.7}
            >
              <IconSymbol size={20} name="plus" color={colors.primary} />
            </TouchableOpacity>

            {/* Clear */}
            {userMessageCount > 0 && (
              <TouchableOpacity
                onPress={handleClearChat}
                accessibilityLabel="Clear chat"
                style={styles.headerBtn}
                activeOpacity={0.7}
              >
                <IconSymbol size={20} name="trash.fill" color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Subject Context Row */}
        <View
          style={[
            styles.subjectRow,
            { borderBottomColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <Text style={[styles.subjectRowLabel, { color: colors.muted, fontSize: fs(12) }]}>
            Focus:
          </Text>
          <SubjectPicker
            value={selectedSubject}
            onChange={handleSubjectChange}
            showAll
          />
        </View>

        {/* Messages */}
        {!sessionLoaded ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} colors={colors} fs={fs} />
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListFooterComponent={
              chatMutation.isPending ? (
                <View
                  style={[
                    styles.typingIndicator,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text
                    style={[styles.typingText, { color: colors.muted, fontSize: fs(13) }]}
                  >
                    TutorSnap is thinking…
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {/* Quick Prompts */}
        {sessionLoaded && userMessageCount === 0 && (
          <View style={styles.quickPromptsContainer}>
            <Text
              style={[styles.quickPromptsLabel, { color: colors.muted, fontSize: fs(12) }]}
            >
              Try asking:
            </Text>
            <View style={styles.quickPrompts}>
              {QUICK_PROMPTS.map((prompt, i) => (
                <TouchableOpacity
                  accessibilityLabel={`Ask: ${prompt}`}
                  key={i}
                  onPress={() => handleSend(prompt)}
                  style={[
                    styles.quickPromptChip,
                    {
                      backgroundColor: `${colors.primary}15`,
                      borderColor: `${colors.primary}30`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickPromptText,
                      { color: colors.primary, fontSize: fs(13) },
                    ]}
                    numberOfLines={1}
                  >
                    {prompt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                { color: colors.foreground, fontSize: fs(15), lineHeight: fs(15) * 1.47 },
              ]}
              placeholder="Ask about any subject…"
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
            />
          </View>
          <TouchableOpacity
            accessibilityLabel="Send message"
            onPress={() => handleSend()}
            disabled={!inputText.trim() || chatMutation.isPending || !isOnline}
            style={[
              styles.sendBtn,
              { backgroundColor: isOnline ? colors.primary : colors.muted },
              (!inputText.trim() || chatMutation.isPending || !isOnline) && { opacity: 0.5 },
            ]}
          >
            <IconSymbol
              size={20}
              name={isOnline ? "paperplane.fill" : "wifi.slash"}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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

const styles = StyleSheet.create({
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 0.5,
  },
  subjectRowLabel: {
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    minWidth: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: { fontWeight: "700" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontWeight: "600" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  headerBtn: { padding: 8 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  messageBubble: {
    flexDirection: "row",
    marginBottom: 12,
    maxWidth: "85%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  userBubble: { alignSelf: "flex-end", borderRadius: 18 },
  aiBubble: { alignSelf: "flex-start" },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubbleContent: { flex: 1 },
  messageText: {},
  messageTime: { marginTop: 4, textAlign: "right" },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  typingText: {},
  quickPromptsContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  quickPromptsLabel: {
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  quickPrompts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickPromptChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: "48%",
  },
  quickPromptText: { fontWeight: "500" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 0.5,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
  },
  input: {},
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
