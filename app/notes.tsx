import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const SAVED_NOTES_KEY = "tutor_saved_notes";

type SavedNote = {
  id: string;
  content: string;
  savedAt: number;
  type?: string;
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getPreviewTitle(content: string): string {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "Untitled Note";
  const firstLine = lines[0].replace(/^[\p{Emoji}\s]+/u, "").trim();
  return firstLine.length > 0 ? firstLine : (lines[1] ?? "Untitled Note");
}

function getPreviewBody(content: string): string {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const body = lines.slice(1).join(" ");
  return body.length > 120 ? body.slice(0, 120) + "..." : body;
}

function getTypeLabel(type?: string): string {
  if (type === "explanation") return "Alt Explanation";
  if (type === "chat") return "Chat";
  return "Note";
}

function getTypeColor(type: string | undefined, colors: any): string {
  if (type === "explanation") return colors.success;
  if (type === "chat") return colors.primary;
  return colors.muted;
}

export default function NotesScreen() {
  const colors = useColors();
  const router = useRouter();
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_NOTES_KEY);
      if (raw) {
        setNotes(JSON.parse(raw));
      } else {
        setNotes([]);
      }
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
      return () => {
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      };
    }, [loadNotes])
  );

  const handleDelete = (id: string) => {
    Alert.alert("Delete Note", "Remove this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          H.impactMedium();
          const updated = notes.filter((n) => n.id !== id);
          setNotes(updated);
          await AsyncStorage.setItem(SAVED_NOTES_KEY, JSON.stringify(updated));
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert("Clear All Notes", "Delete all saved notes? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          H.notificationWarning();
          setNotes([]);
          await AsyncStorage.removeItem(SAVED_NOTES_KEY);
        },
      },
    ]);
  };

  const handleCopy = async (note: SavedNote) => {
    try {
      await Clipboard.setStringAsync(note.content);
      setCopiedId(note.id);
      H.impactLight();
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const filtered = notes.filter((n) =>
    search.trim() === "" ? true : n.content.toLowerCase().includes(search.trim().toLowerCase())
  );

  const renderItem = ({ item }: { item: SavedNote }) => {
    const typeColor = getTypeColor(item.type, colors);
    const isCopied = copiedId === item.id;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: `${typeColor}15` }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>{getTypeLabel(item.type)}</Text>
          </View>
          <Text style={[styles.timestamp, { color: colors.muted }]}>{formatRelativeTime(item.savedAt)}</Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
          {getPreviewTitle(item.content)}
        </Text>
        <Text style={[styles.cardBody, { color: colors.muted }]} numberOfLines={3}>
          {getPreviewBody(item.content)}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            accessibilityLabel="Copy note"
            onPress={() => handleCopy(item)}
            style={[styles.actionBtn, { backgroundColor: isCopied ? `${colors.success}20` : `${colors.primary}10`, borderColor: isCopied ? `${colors.success}40` : `${colors.primary}20` }]}
          >
            <IconSymbol size={14} name={isCopied ? "checkmark.circle.fill" : "doc.on.doc"} color={isCopied ? colors.success : colors.primary} />
            <Text style={[styles.actionBtnText, { color: isCopied ? colors.success : colors.primary }]}>{isCopied ? "Copied!" : "Copy"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Delete note"
            onPress={() => handleDelete(item.id)}
            style={[styles.actionBtn, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}20` }]}
          >
            <IconSymbol size={14} name="trash.fill" color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Saved Notes</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            {notes.length} {notes.length === 1 ? "note" : "notes"} saved
          </Text>
        </View>
        {notes.length > 0 && (
          <TouchableOpacity
            accessibilityLabel="Clear all notes"
            onPress={handleClearAll}
            style={[styles.clearBtn, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}20` }]}
          >
            <IconSymbol size={16} name="trash.fill" color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {notes.length > 0 && (
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol size={16} name="magnifyingglass" color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search notes..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <IconSymbol size={16} name="xmark.circle.fill" color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📝</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Notes Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Save alternative explanations from the solution screen to review them here.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.emptyBtnText, { color: colors.background }]}>Solve a Problem</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Results</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>No notes match your search.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

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
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  clearBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  timestamp: {
    fontSize: 11,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  cardBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
