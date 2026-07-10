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
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
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
  const params = useLocalSearchParams<{ sessionId?: string; newSession?: string; seedMessage?: string }>();
  const seedSentRef = useRef(false);

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [inputText, setInputText] = useState("");
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  // ── Auto-send seed message (from Discuss with Tutor) ────────────────────────

  useEffect(() => {
    if (!sessionLoaded || !session || !isOnline || seedSentRef.current) return;
    const seed = params.seedMessage;
    if (!seed || !seed.trim()) return;
    seedSentRef.current = true;
    // Small delay so the UI settles before sending
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

  // ── Build share text helper ───────────────────────────────────────────────

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
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  // ── Share as PDF ──────────────────────────────────────────────────────────

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
          const time = new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const text = m.content
            .replace(/\$\$[\s\S]*?\$\$/g, "[equation]")
            .replace(/\$[^$\n]+\$/g, "[math]")
            .replace(/#{1,6}\s/g, "")
            .replace(/\*\*|__/g, "")
            .replace(/\*|_/g, "")
            .replace(/`{1,3}/g, "")
            .replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .trim();
          return `<div class="bubble ${isUser ? "user" : "ai"}"><div class="role">${isUser ? "You" : "TutorSnap AI"} <span class="time">${time}</span></div><div class="text">${text.replace(/\n/g, "<br/>")}</div></div>`;
        })
        .join("");

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;margin:0;padding:32px;background:#fff;color:#1a1a1a}.header{border-bottom:2px solid #6366f1;padding-bottom:16px;margin-bottom:24px}.header h1{margin:0 0 4px;font-size:20px;color:#6366f1}.header p{margin:0;font-size:13px;color:#666}.bubble{margin-bottom:16px;max-width:80%}.bubble.user{margin-left:auto}.role{font-size:11px;font-weight:700;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}.bubble.user .role{text-align:right}.time{font-weight:400;margin-left:6px}.text{background:#f5f5f5;border-radius:12px;padding:12px 16px;font-size:14px;line-height:1.6}.bubble.user .text{background:#6366f1;color:#fff}.footer{margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center}</style></head><body><div class="header"><h1>${session.title.replace(/</g, "&lt;")}</h1><p>Subject: ${subjectLabel} &middot; ${dateStr} &middot; ${messages.filter(m => !m.id.startsWith("welcome")).length} messages</p></div>${bubbles || "<p style=\"color:#aaa\">No messages yet.</p>"}<div class="footer">Exported from TutorSnap &middot; tutorsnapai.tech</div></body></html>`;

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

  // ── Share as text ──────────────────────────────────────────────────────────

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

  // ── Share chat (opens menu) ───────────────────────────────────────────────

  const handleShare = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowShareMenu(true);
  }, []);

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

      {/* PDF loading overlay */}
      {pdfLoading && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-only"
          // @ts-ignore — pointerEvents on View is valid RN
        >
          <View style={[styles.pdfOverlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
            <View style={[styles.pdfCard, { backgroundColor: colors.surface }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.pdfCardText, { color: colors.foreground, fontSize: fs(15) }]}>
                Generating PDF…
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Share menu bottom sheet */}
      {showShareMenu && (
        <View style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity
            style={[styles.shareBackdrop, { backgroundColor: "rgba(0,0,0,0.45)" }]}
            activeOpacity={1}
            onPress={() => setShowShareMenu(false)}
          />
          <View style={[styles.shareSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.shareHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.shareTitle, { color: colors.foreground, fontSize: fs(16) }]}>
              Share Chat
            </Text>
            {Platform.OS !== "web" && (
              <TouchableOpacity
                style={[styles.shareOption, { borderColor: colors.border }]}
                onPress={handleSharePDF}
                activeOpacity={0.7}
              >
                <IconSymbol size={22} name="doc.fill" color={colors.error} />
                <View style={styles.shareOptionText}>
                  <Text style={[styles.shareOptionTitle, { color: colors.foreground, fontSize: fs(15) }]}>
                    Save as PDF
                  </Text>
                  <Text style={[styles.shareOptionSub, { color: colors.muted, fontSize: fs(12) }]}>
                    Export a formatted PDF of this conversation
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.shareOption, { borderColor: colors.border }]}
              onPress={handleShareText}
              activeOpacity={0.7}
            >
              <IconSymbol size={22} name="square.and.arrow.up.fill" color={colors.primary} />
              <View style={styles.shareOptionText}>
                <Text style={[styles.shareOptionTitle, { color: colors.foreground, fontSize: fs(15) }]}>
                  {Platform.OS === "web" ? "Copy as Text" : "Share as Text"}
                </Text>
                <Text style={[styles.shareOptionSub, { color: colors.muted, fontSize: fs(12) }]}>
                  {Platform.OS === "web" ? "Copy conversation to clipboard" : "Share via messages, email, or notes"}
                </Text>
              </View>
              {shareCopied && (
                <IconSymbol size={18} name="checkmark.circle.fill" color={colors.success} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareCancelBtn, { borderColor: colors.border }]}
              onPress={() => setShowShareMenu(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.shareCancelText, { color: colors.muted, fontSize: fs(15) }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  // Share menu
  shareBackdrop: { ...StyleSheet.absoluteFillObject },
  shareSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  shareHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  shareTitle: { fontWeight: "700", marginBottom: 16 },
  shareOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  shareOptionText: { flex: 1 },
  shareOptionTitle: { fontWeight: "600", marginBottom: 2 },
  shareOptionSub: {},
  shareCancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 0.5,
  },
  shareCancelText: { fontWeight: "500" },
  // PDF overlay
  pdfOverlay: {
    ...StyleSheet.absoluteFillObject as object,
    alignItems: "center",
    justifyContent: "center",
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
