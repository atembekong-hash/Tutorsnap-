import React, { useState, useRef } from "react";
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
} from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type { ChatMessage } from "@/shared/types";
import { SubjectPicker } from "@/components/subject-picker";
import { type SubjectId, getSubjectLabel } from "@/lib/subjects";

const QUICK_PROMPTS = [
  "Explain the quadratic formula",
  "What is photosynthesis?",
  "Summarize Romeo and Juliet",
  "What caused World War I?",
  "Explain Newton's laws of motion",
  "What is supply and demand?",
];

function MessageBubble({ message, colors }: { message: ChatMessage; colors: any }) {
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
        <Text
          style={[
            styles.messageText,
            { color: isUser ? "#FFFFFF" : colors.foreground },
          ]}
        >
          {message.content}
        </Text>
        <Text
          style={[
            styles.messageTime,
            { color: isUser ? "rgba(255,255,255,0.6)" : colors.muted },
          ]}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm StudyGenius AI, your personal academic tutor. Ask me anything — Math, Science, English, History, and more. I'll explain concepts, help with homework, and guide you step by step! 📚",
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const chatMutation = trpc.academic.chat.useMutation({
    onSuccess: (data) => {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  const handleSend = (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText) return;

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
    setInputText("");

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Send to AI (exclude welcome message for context)
    const contextMessages = updatedMessages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    chatMutation.mutate({ messages: contextMessages, subject: selectedSubject ?? undefined });
  };

  const handleClearChat = () => {
    const subjectName = selectedSubject ? getSubjectLabel(selectedSubject) : "any subject";
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "assistant",
        content: `Chat cleared! I'm ready to help with ${subjectName}. What would you like to explore? 📚`,
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.aiIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={{ fontSize: 20 }}>🧮</Text>
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Tutor</Text>
              <View style={styles.onlineRow}>
                <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.onlineText, { color: colors.success }]}>Online</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={handleClearChat} style={styles.clearBtn}>
            <IconSymbol size={20} name="trash.fill" color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Subject Context Row */}
        <View style={[styles.subjectRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <Text style={[styles.subjectRowLabel, { color: colors.muted }]}>Focus:</Text>
          <SubjectPicker
            value={selectedSubject}
            onChange={(id) => {
              setSelectedSubject(id);
              if (id && messages.length <= 1) {
                setMessages([
                  {
                    id: "welcome-" + Date.now(),
                    role: "assistant",
                    content: `I'm ready to help with ${getSubjectLabel(id)}! Ask me anything — I'll explain concepts, help with problems, and guide you step by step. 📚`,
                    timestamp: Date.now(),
                  },
                ]);
              }
            }}
            showAll
          />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} colors={colors} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={
            chatMutation.isPending ? (
              <View style={[styles.typingIndicator, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.typingText, { color: colors.muted }]}>StudyGenius is thinking...</Text>
              </View>
            ) : null
          }
        />

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <View style={styles.quickPromptsContainer}>
            <Text style={[styles.quickPromptsLabel, { color: colors.muted }]}>Try asking:</Text>
            <View style={styles.quickPrompts}>
              {QUICK_PROMPTS.map((prompt, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleSend(prompt)}
                  style={[styles.quickPromptChip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                >
                  <Text style={[styles.quickPromptText, { color: colors.primary }]} numberOfLines={1}>
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
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Ask about any subject..."
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
            onPress={() => handleSend()}
            disabled={!inputText.trim() || chatMutation.isPending}
            style={[
              styles.sendBtn,
              { backgroundColor: colors.primary },
              (!inputText.trim() || chatMutation.isPending) && { opacity: 0.5 },
            ]}
          >
            <IconSymbol size={20} name="paperplane.fill" color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

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
    fontSize: 12,
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontSize: 12, fontWeight: "600" },
  clearBtn: { padding: 8 },
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
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTime: { fontSize: 11, marginTop: 4, textAlign: "right" },
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
  typingText: { fontSize: 13 },
  quickPromptsContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  quickPromptsLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8, letterSpacing: 0.5 },
  quickPrompts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickPromptChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: "48%",
  },
  quickPromptText: { fontSize: 13, fontWeight: "500" },
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
  input: { fontSize: 15, lineHeight: 22 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
