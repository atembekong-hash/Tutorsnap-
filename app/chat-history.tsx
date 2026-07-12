import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as H from "@/lib/haptics";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useFontSize } from "@/lib/font-size-provider";
import { getSubjectLabel } from "@/lib/subjects";
import {
  listSessionSummaries,
  deleteSession,
  clearAllSessions,
  loadSession,
  renameSession,
  togglePin,
  updateSessionTags,
  getAllTags,
  MAX_PINNED,
  type ChatSessionSummary,
} from "@/lib/chat-sessions";

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  colors,
  fs,
  onResume,
  onDelete,
  onShare,
  onRename,
  onTogglePin,
  onEditTags,
  pinLimitReached,
}: {
  session: ChatSessionSummary;
  colors: any;
  fs: (n: number) => number;
  onResume: () => void;
  onDelete: () => void;
  onShare: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onEditTags: () => void;
  pinLimitReached: boolean;
}) {
  const subjectLabel = session.subject ? getSubjectLabel(session.subject as any) : null;
  const canPin = session.pinned || !pinLimitReached;

  return (
    <TouchableOpacity
      onPress={onResume}
      onLongPress={onRename}
      delayLongPress={500}
      accessibilityLabel={`Resume chat: ${session.title}. Long press to rename.`}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: session.pinned ? colors.primary : colors.border,
          borderWidth: session.pinned ? 1.5 : 1,
        },
      ]}
      activeOpacity={0.75}
    >
      {/* Top row: title + time + pin */}
      <View style={styles.cardTop}>
        <View style={styles.cardTitleRow}>
          {/* Pin indicator / icon */}
          <View
            style={[
              styles.chatIcon,
              { backgroundColor: session.pinned ? `${colors.primary}22` : `${colors.primary}12` },
            ]}
          >
            {session.pinned ? (
              <Text style={{ fontSize: 16 }}>📌</Text>
            ) : (
              <Text style={{ fontSize: 16 }}>💬</Text>
            )}
          </View>
          <View style={styles.cardTitleBlock}>
            <Text
              style={[styles.cardTitle, { color: colors.foreground, fontSize: fs(15) }]}
              numberOfLines={1}
            >
              {session.title}
            </Text>
            <View style={styles.cardMeta}>
              {subjectLabel && (
                <View style={[styles.subjectBadge, { backgroundColor: `${colors.primary}18` }]}>
                  <Text style={[styles.subjectBadgeText, { color: colors.primary, fontSize: fs(11) }]}>
                    {subjectLabel}
                  </Text>
                </View>
              )}
              {session.gradeLevel && (
                <View style={[styles.subjectBadge, { backgroundColor: `${colors.success}15`, marginLeft: 4 }]}>
                  <Text style={[styles.subjectBadgeText, { color: colors.success, fontSize: fs(11) }]}>
                    {session.gradeLevel}
                  </Text>
                </View>
              )}
              <Text style={[styles.cardTime, { color: colors.muted, fontSize: fs(12) }]}>
                {formatRelativeTime(session.updatedAt)}
              </Text>
              <Text style={[styles.cardCount, { color: colors.muted, fontSize: fs(12) }]}>
                · {session.messageCount} msg{session.messageCount !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {/* Pin button */}
          <TouchableOpacity
            onPress={onTogglePin}
            accessibilityLabel={session.pinned ? "Unpin this chat" : canPin ? "Pin this chat" : `Pin limit reached (max ${MAX_PINNED})`}
            style={[
              styles.pinBtn,
              {
                backgroundColor: session.pinned ? `${colors.primary}18` : "transparent",
                opacity: canPin ? 1 : 0.35,
              },
            ]}
            activeOpacity={0.7}
            disabled={!canPin}
          >
            <Text style={{ fontSize: 14 }}>{session.pinned ? "📌" : "🔖"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tags */}
      {session.tags.length > 0 && (
        <View style={styles.tagRow}>
          {session.tags.map((tag) => (
            <View key={tag} style={[styles.tagChip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
              <Text style={[styles.tagChipText, { color: colors.primary, fontSize: fs(11) }]}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Preview */}
      <Text
        style={[styles.cardPreview, { color: colors.muted, fontSize: fs(13) }]}
        numberOfLines={2}
      >
        {session.preview}
      </Text>

      {/* Actions */}
      <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={onResume}
          accessibilityLabel="Continue this chat"
          style={[styles.actionBtn, { backgroundColor: `${colors.primary}15` }]}
          activeOpacity={0.75}
        >
          <IconSymbol size={14} name="bubble.left.fill" color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary, fontSize: fs(13) }]}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRename}
          accessibilityLabel="Rename this chat"
          style={[styles.actionBtn, { backgroundColor: `${colors.surface}` }]}
          activeOpacity={0.75}
        >
          <IconSymbol size={14} name="square.and.pencil" color={colors.muted} />
          <Text style={[styles.actionBtnText, { color: colors.muted, fontSize: fs(13) }]}>Rename</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onShare}
          accessibilityLabel="Share this chat"
          style={[styles.actionBtn, { backgroundColor: `${colors.surface}` }]}
          activeOpacity={0.75}
        >
          <IconSymbol size={14} name="square.and.arrow.up.fill" color={colors.muted} />
          <Text style={[styles.actionBtnText, { color: colors.muted, fontSize: fs(13) }]}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onEditTags}
          accessibilityLabel="Edit tags for this chat"
          style={[styles.actionBtn, { backgroundColor: `${colors.surface}` }]}
          activeOpacity={0.75}
        >
          <IconSymbol size={14} name="tag.fill" color={colors.muted} />
          <Text style={[styles.actionBtnText, { color: colors.muted, fontSize: fs(13) }]}>Tags</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDelete}
          accessibilityLabel="Delete this chat"
          style={[styles.actionBtn, { backgroundColor: `${colors.error}10` }]}
          activeOpacity={0.75}
        >
          <IconSymbol size={14} name="trash.fill" color={colors.error} />
          <Text style={[styles.actionBtnText, { color: colors.error, fontSize: fs(13) }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Rename Modal ─────────────────────────────────────────────────────────────

function RenameModal({
  visible,
  initialTitle,
  colors,
  fs,
  onSave,
  onCancel,
}: {
  visible: boolean;
  initialTitle: string;
  colors: any;
  fs: (n: number) => number;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialTitle);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setValue(initialTitle);
      // Auto-focus after modal animation
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [visible, initialTitle]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={StyleSheet.absoluteFillObject}
      >
        <TouchableOpacity
          style={[styles.modalBackdrop]}
          activeOpacity={1}
          onPress={onCancel}
        />
        <View style={[styles.renameSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.renameTitle, { color: colors.foreground, fontSize: fs(17) }]}>
            Rename Chat
          </Text>
          <TextInput
            ref={inputRef}
            style={[
              styles.renameInput,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
                fontSize: fs(15),
              },
            ]}
            value={value}
            onChangeText={setValue}
            placeholder="Enter a name for this chat"
            placeholderTextColor={colors.muted}
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={() => value.trim() && onSave(value.trim())}
            selectTextOnFocus
          />
          <Text style={[styles.renameHint, { color: colors.muted, fontSize: fs(12) }]}>
            {value.length}/60 characters
          </Text>
          <View style={styles.renameActions}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.renameBtn, { backgroundColor: `${colors.muted}18` }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.renameBtnText, { color: colors.muted, fontSize: fs(15) }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => value.trim() && onSave(value.trim())}
              style={[
                styles.renameBtn,
                { backgroundColor: value.trim() ? colors.primary : `${colors.primary}40` },
              ]}
              activeOpacity={0.8}
              disabled={!value.trim()}
            >
              <Text style={[styles.renameBtnText, { color: "#fff", fontSize: fs(15) }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Tag Edit Modal ──────────────────────────────────────────────────────────

const SUGGESTED_TAGS = ["Exam Prep", "Homework", "Review", "Practice", "Notes", "Project"];

function TagEditModal({
  session,
  allTags,
  colors,
  fs,
  onSave,
  onCancel,
}: {
  session: ChatSessionSummary;
  allTags: string[];
  colors: any;
  fs: (n: number) => number;
  onSave: (sessionId: string, tags: string[]) => void;
  onCancel: () => void;
}) {
  const [tags, setTags] = useState<string[]>(session.tags);
  const [input, setInput] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const addTag = (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!clean || tags.includes(clean) || tags.length >= 5) return;
    setTags((prev) => [...prev, clean]);
    setInput("");
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const suggestions = [...new Set([...SUGGESTED_TAGS.map(t => t.toLowerCase().replace(/\s+/g, "-")), ...allTags])]
    .filter((t) => !tags.includes(t))
    .slice(0, 8);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={StyleSheet.absoluteFillObject}
      >
        <TouchableOpacity
          style={[styles.modalBackdrop]}
          activeOpacity={1}
          onPress={onCancel}
        />
        <View style={[styles.tagSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.tagSheetTitle, { color: colors.foreground, fontSize: fs(17) }]}>
            Edit Tags
          </Text>

          {/* Current tags */}
          {tags.length > 0 && (
            <View style={styles.tagSheetCurrentRow}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => removeTag(tag)}
                  accessibilityLabel={`Remove tag ${tag}`}
                  style={[styles.tagSheetChip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tagSheetChipText, { color: colors.primary, fontSize: fs(12) }]}>#{tag}</Text>
                  <Text style={{ color: colors.primary, fontSize: fs(12) }}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Input */}
          <TextInput
            ref={inputRef}
            style={[
              styles.tagSheetInput,
              { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, fontSize: fs(14) },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder={tags.length >= 5 ? "Max 5 tags" : "Add a tag…"}
            placeholderTextColor={colors.muted}
            maxLength={24}
            returnKeyType="done"
            editable={tags.length < 5}
            onSubmitEditing={() => addTag(input)}
          />
          <Text style={[styles.tagSheetHint, { color: colors.muted, fontSize: fs(11) }]}>
            {tags.length}/5 tags
          </Text>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.tagSheetSuggestions}>
              {suggestions.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => addTag(tag)}
                  accessibilityLabel={`Add tag ${tag}`}
                  style={[styles.tagSuggestionChip, { backgroundColor: `${colors.muted}15`, borderColor: `${colors.muted}30` }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tagSuggestionText, { color: colors.muted, fontSize: fs(12) }]}>+{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.tagSheetActions}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.tagSheetBtn, { backgroundColor: `${colors.muted}18` }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tagSheetBtnText, { color: colors.muted, fontSize: fs(15) }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(session.id, tags)}
              style={[styles.tagSheetBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tagSheetBtnText, { color: "#fff", fontSize: fs(15) }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatHistoryScreen() {
  const colors = useColors();
  const { fs } = useFontSize();
  const router = useRouter();

  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState<ChatSessionSummary | null>(null);

  // Tag state
  const [tagTarget, setTagTarget] = useState<ChatSessionSummary | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  const pinnedCount = sessions.filter((s) => s.pinned).length;

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listSessionSummaries();
      setSessions(list);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load all tags for the filter bar
  useEffect(() => {
    getAllTags().then(setAllTags).catch(() => setAllTags([]));
  }, [sessions]);

  // Filter by search and active tag
  const filtered = sessions.filter((s) => {
    const matchesSearch = !search.trim() ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.preview.toLowerCase().includes(search.toLowerCase()) ||
      (s.subject && getSubjectLabel(s.subject as any).toLowerCase().includes(search.toLowerCase()));
    const matchesTag = !activeTagFilter || s.tags.includes(activeTagFilter);
    return matchesSearch && matchesTag;
  });

  const handleEditTags = (session: ChatSessionSummary) => {
    H.impactLight()
    setTagTarget(session);
  };

  const handleTagSave = async (sessionId: string, tags: string[]) => {
    await updateSessionTags(sessionId, tags);
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, tags } : s))
    );
    setTagTarget(null);
    H.notificationSuccess()
  };

  const handleResume = (sessionId: string) => {
    H.impactLight()
    router.push({ pathname: "/(tabs)/chat", params: { sessionId } });
  };

  const handleDelete = (session: ChatSessionSummary) => {
    Alert.alert(
      "Delete Chat",
      `Delete "${session.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSession(session.id);
            setSessions((prev) => prev.filter((s) => s.id !== session.id));
          },
        },
      ]
    );
  };

  const handleShare = async (session: ChatSessionSummary) => {
    H.impactLight()

    const full = await loadSession(session.id);
    if (!full) return;

    const subjectLabel = session.subject ? getSubjectLabel(session.subject as any) : "General";
    const dateStr = new Date(session.createdAt).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const lines: string[] = [
      `📚 TutorSnap Chat — ${session.title}`,
      `Subject: ${subjectLabel} · ${dateStr}`,
      `Messages: ${session.messageCount}`,
      "",
    ];

    for (const msg of full.messages) {
      if (msg.id === "welcome" || msg.id.startsWith("welcome-")) continue;
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
    const shareText = lines.join("\n");

    if (Platform.OS === "web") {
      try {
        await Clipboard.setStringAsync(shareText);
        setCopiedId(session.id);
        setTimeout(() => setCopiedId(null), 2500);
      } catch { /* ignore */ }
      return;
    }

    try {
      await Share.share({ message: shareText });
    } catch { /* user cancelled */ }
  };

  const handleRename = (session: ChatSessionSummary) => {
    H.impactLight()
    setRenameTarget(session);
  };

  const handleRenameSave = async (newTitle: string) => {
    if (!renameTarget) return;
    await renameSession(renameTarget.id, newTitle);
    setSessions((prev) =>
      prev.map((s) => (s.id === renameTarget.id ? { ...s, title: newTitle } : s))
    );
    setRenameTarget(null);
    H.notificationSuccess()
  };

  const handleTogglePin = async (session: ChatSessionSummary) => {
    H.impactMedium()
    const result = await togglePin(session.id);
    if (result === null) {
      Alert.alert(
        "Pin Limit Reached",
        `You can pin up to ${MAX_PINNED} chats. Unpin one to pin this chat.`,
        [{ text: "OK" }]
      );
      return;
    }
    // Reload to get correct sort order (pinned first)
    await loadSessions();
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Chats",
      "Delete all chat history? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await clearAllSessions();
            setSessions([]);
          },
        },
      ]
    );
  };

  const handleNewChat = () => {
    H.impactLight()
    router.push({ pathname: "/(tabs)/chat", params: { newSession: "1" } });
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <IconSymbol size={22} name="chevron.left" color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontSize: fs(18) }]}>
          Chat History
        </Text>
        <View style={styles.headerActions}>
          {sessions.length > 0 && (
            <TouchableOpacity
              onPress={handleClearAll}
              accessibilityLabel="Clear all chats"
              style={styles.headerBtn}
              activeOpacity={0.7}
            >
              <IconSymbol size={18} name="trash.fill" color={colors.error} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNewChat}
            accessibilityLabel="Start a new chat"
            style={[styles.newChatBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <IconSymbol size={16} name="plus" color="#fff" />
            <Text style={[styles.newChatBtnText, { fontSize: fs(14) }]}>New Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <IconSymbol size={16} name="magnifyingglass" color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, fontSize: fs(14) }]}
          placeholder="Search chats…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} accessibilityLabel="Clear search">
            <IconSymbol size={16} name="xmark.circle.fill" color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tagFilterBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}
          contentContainerStyle={{ gap: 8, paddingRight: 12 }}
        >
          <TouchableOpacity
            onPress={() => setActiveTagFilter(null)}
            accessibilityLabel="Show all chats"
            style={[
              styles.tagFilterChip,
              {
                backgroundColor: !activeTagFilter ? colors.primary : `${colors.primary}12`,
                borderColor: colors.primary,
              },
            ]}
            activeOpacity={0.75}
          >
            <Text style={[styles.tagFilterChipText, { color: !activeTagFilter ? "#fff" : colors.primary, fontSize: fs(12) }]}>
              All
            </Text>
          </TouchableOpacity>
          {allTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
              accessibilityLabel={`Filter by tag: ${tag}`}
              style={[
                styles.tagFilterChip,
                {
                  backgroundColor: activeTagFilter === tag ? colors.primary : `${colors.primary}12`,
                  borderColor: colors.primary,
                },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[styles.tagFilterChipText, { color: activeTagFilter === tag ? "#fff" : colors.primary, fontSize: fs(12) }]}>
                #{tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Pin hint */}
      {pinnedCount > 0 && !search && (
        <View style={[styles.pinHint, { backgroundColor: `${colors.primary}10`, borderBottomColor: colors.border }]}>
          <Text style={{ fontSize: 12 }}>📌</Text>
          <Text style={[styles.pinHintText, { color: colors.primary, fontSize: fs(12) }]}>
            {pinnedCount} pinned · {MAX_PINNED - pinnedCount} slot{MAX_PINNED - pinnedCount !== 1 ? "s" : ""} remaining
          </Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>💬</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontSize: fs(18) }]}>
            {search ? "No matching chats" : "No chats yet"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted, fontSize: fs(14) }]}>
            {search
              ? "Try a different search term"
              : "Start a conversation with your AI Tutor and it will appear here"}
          </Text>
          {!search && (
            <TouchableOpacity
              onPress={handleNewChat}
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.startBtnText, { fontSize: fs(15) }]}>Start a Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            // Section header for "Pinned" and "All Chats"
            const prevItem = index > 0 ? filtered[index - 1] : null;
            const showPinnedHeader = item.pinned && !prevItem?.pinned && !search;
            const showAllHeader = !item.pinned && prevItem?.pinned && !search;
            return (
              <>
                {showPinnedHeader && (
                  <Text style={[styles.sectionLabel, { color: colors.muted, fontSize: fs(11) }]}>
                    PINNED
                  </Text>
                )}
                {showAllHeader && (
                  <Text style={[styles.sectionLabel, { color: colors.muted, fontSize: fs(11) }]}>
                    ALL CHATS
                  </Text>
                )}
                {!item.pinned && !prevItem && !search && (
                  <Text style={[styles.sectionLabel, { color: colors.muted, fontSize: fs(11) }]}>
                    ALL CHATS
                  </Text>
                )}
                <SessionCard
                  session={item}
                  colors={colors}
                  fs={fs}
                  onResume={() => handleResume(item.id)}
                  onDelete={() => handleDelete(item)}
                  onShare={() => handleShare(item)}
                  onRename={() => handleRename(item)}
                  onTogglePin={() => handleTogglePin(item)}
                  onEditTags={() => handleEditTags(item)}
                  pinLimitReached={pinnedCount >= MAX_PINNED}
                />
              </>
            );
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={
            <Text style={[styles.countLabel, { color: colors.muted, fontSize: fs(12) }]}>
              {filtered.length} conversation{filtered.length !== 1 ? "s" : ""}
              {search ? ` matching "${search}"` : ""}
            </Text>
          }
        />
      )}

      {/* Web copy feedback toast */}
      {copiedId && (
        <View style={[styles.toast, { backgroundColor: colors.success }]}>
          <IconSymbol size={14} name="checkmark.circle.fill" color="#fff" />
          <Text style={[styles.toastText, { fontSize: fs(13) }]}>Chat copied to clipboard</Text>
        </View>
      )}

      {/* Rename Modal */}
      <RenameModal
        visible={!!renameTarget}
        initialTitle={renameTarget?.title ?? ""}
        colors={colors}
        fs={fs}
        onSave={handleRenameSave}
        onCancel={() => setRenameTarget(null)}
      />

      {/* Tag Edit Modal */}
      {tagTarget && (
        <TagEditModal
          session={tagTarget}
          allTags={allTags}
          colors={colors}
          fs={fs}
          onSave={handleTagSave}
          onCancel={() => setTagTarget(null)}
        />
      )}
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBtn: { padding: 8 },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newChatBtnText: { color: "#fff", fontWeight: "600" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  searchInput: { flex: 1 },
  pinHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  pinHintText: { fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle: { fontWeight: "700", marginBottom: 8, textAlign: "center" },
  emptySubtitle: { textAlign: "center", lineHeight: 22 },
  startBtn: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
  },
  startBtnText: { color: "#fff", fontWeight: "700" },
  countLabel: {
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sectionLabel: {
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cardTop: { padding: 14, paddingBottom: 8 },
  cardTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitleBlock: { flex: 1 },
  cardTitle: { fontWeight: "700", marginBottom: 4 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  subjectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  subjectBadgeText: { fontWeight: "600" },
  cardTime: {},
  cardCount: {},
  pinBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardPreview: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    padding: 10,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: { fontWeight: "600" },
  toast: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  toastText: { color: "#fff", fontWeight: "600" },
  // Rename modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  renameSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  renameTitle: { fontWeight: "700", textAlign: "center" },
  renameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    lineHeight: 22,
  },
  renameHint: { textAlign: "right", marginTop: -8 },
  renameActions: { flexDirection: "row", gap: 12 },
  renameBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  renameBtnText: { fontWeight: "700" },
  // Tag chips
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagChipText: { fontWeight: "600" },
  // Tag filter bar
  tagFilterBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 0.5,
  },
  tagFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagFilterChipText: { fontWeight: "600" },
  // Tag edit modal
  tagSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  tagSheetTitle: { fontWeight: "700", textAlign: "center" },
  tagSheetInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tagSheetHint: { textAlign: "right", marginTop: -8 },
  tagSheetCurrentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagSheetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagSheetChipText: { fontWeight: "600" },
  tagSheetSuggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagSuggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagSuggestionText: { fontWeight: "500" },
  tagSheetActions: { flexDirection: "row", gap: 12 },
  tagSheetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  tagSheetBtnText: { fontWeight: "700" },
});
