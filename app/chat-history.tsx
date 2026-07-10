import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
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
}: {
  session: ChatSessionSummary;
  colors: any;
  fs: (n: number) => number;
  onResume: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const subjectLabel = session.subject ? getSubjectLabel(session.subject as any) : null;

  return (
    <TouchableOpacity
      onPress={onResume}
      accessibilityLabel={`Resume chat: ${session.title}`}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.75}
    >
      {/* Top row: title + time */}
      <View style={styles.cardTop}>
        <View style={styles.cardTitleRow}>
          <View style={[styles.chatIcon, { backgroundColor: `${colors.primary}18` }]}>
            <Text style={{ fontSize: 16 }}>💬</Text>
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
              <Text style={[styles.cardTime, { color: colors.muted, fontSize: fs(12) }]}>
                {formatRelativeTime(session.updatedAt)}
              </Text>
              <Text style={[styles.cardCount, { color: colors.muted, fontSize: fs(12) }]}>
                · {session.messageCount} msg{session.messageCount !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </View>
      </View>

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
          onPress={onShare}
          accessibilityLabel="Share this chat"
          style={[styles.actionBtn, { backgroundColor: `${colors.surface}` }]}
          activeOpacity={0.75}
        >
          <IconSymbol size={14} name="square.and.arrow.up.fill" color={colors.muted} />
          <Text style={[styles.actionBtnText, { color: colors.muted, fontSize: fs(13) }]}>Share</Text>
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatHistoryScreen() {
  const colors = useColors();
  const { fs } = useFontSize();
  const router = useRouter();

  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Filter by search
  const filtered = search.trim()
    ? sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.preview.toLowerCase().includes(search.toLowerCase()) ||
          (s.subject && getSubjectLabel(s.subject as any).toLowerCase().includes(search.toLowerCase()))
      )
    : sessions;

  const handleResume = (sessionId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Load full session to get all messages
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
      // Strip Markdown/LaTeX for plain-text share
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
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              colors={colors}
              fs={fs}
              onResume={() => handleResume(item.id)}
              onDelete={() => handleDelete(item)}
              onShare={() => handleShare(item)}
            />
          )}
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
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
  cardPreview: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    padding: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
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
});
