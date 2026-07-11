/**
 * My Notes Screen
 *
 * Displays all AI responses saved via the long-press "Save to Notes" action in the AI Tutor.
 * Features:
 *  - Live search across note content
 *  - Date-grouped sections (Today, Yesterday, This Week, Older)
 *  - Swipe-to-delete with undo toast
 *  - Long-press to copy or share a note
 *  - Empty state with a helpful prompt
 *  - Maximum vertical scroll area (clean, uncluttered layout)
 */
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  Animated,
  Share,
} from "react-native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SavedNote {
  id: string;
  content: string;
  savedAt: number;
}

interface NoteGroup {
  title: string;
  data: SavedNote[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SAVED_NOTES_KEY = "tutor_saved_notes";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGroupTitle(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const day = 86400000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return "This Week";
  if (diff < 30 * day) return "This Month";
  return "Older";
}

function groupNotes(notes: SavedNote[]): NoteGroup[] {
  const map = new Map<string, SavedNote[]>();
  const order = ["Today", "Yesterday", "This Week", "This Month", "Older"];
  for (const n of notes) {
    const title = getGroupTitle(n.savedAt);
    if (!map.has(title)) map.set(title, []);
    map.get(title)!.push(n);
  }
  return order.filter((t) => map.has(t)).map((t) => ({ title: t, data: map.get(t)! }));
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

// ─── Note Card ────────────────────────────────────────────────────────────────
function NoteCard({
  note,
  onDelete,
  colors,
}: {
  note: SavedNote;
  onDelete: (id: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handleLongPress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert("Note options", undefined, [
      {
        text: "Copy text",
        onPress: async () => {
          try {
            if (Platform.OS === "web") {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText(note.content);
              }
            } else {
              const Clip = await import("expo-clipboard");
              await Clip.setStringAsync(note.content);
            }
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          } catch { /* ignore */ }
        },
      },
      {
        text: "Share",
        onPress: async () => {
          try {
            await Share.share({ message: note.content });
          } catch { /* cancelled */ }
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDelete(),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [note.content]);

  const handleDelete = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -80, duration: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDelete(note.id));
  }, [note.id, onDelete]);

  return (
    <Animated.View
      style={[
        styles.noteCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onLongPress={handleLongPress}
        style={styles.noteCardInner}
      >
        <Text
          style={[styles.noteContent, { color: colors.foreground }]}
          numberOfLines={4}
        >
          {note.content}
        </Text>
        <View style={styles.noteFooter}>
          <Text style={[styles.noteDate, { color: colors.muted }]}>
            {formatDate(note.savedAt)}
          </Text>
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <IconSymbol name="trash.fill" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotesScreen() {
  const colors = useColors();
  const router = useRouter();
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_NOTES_KEY);
      setNotes(raw ? JSON.parse(raw) : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleDelete = useCallback(async (id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      AsyncStorage.setItem(SAVED_NOTES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const [exporting, setExporting] = useState(false);
  const handleExportPDF = useCallback(async () => {
    if (notes.length === 0) return;
    setExporting(true);
    try {
      const dateStr = new Date().toLocaleDateString(undefined, {
        month: "long", day: "numeric", year: "numeric",
      });
      const noteItems = notes
        .map((n, i) => {
          const date = formatDate(n.savedAt);
          const text = n.content
            .replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/\n/g, "<br/>");
          return `<div class="note"><div class="note-meta">#${i + 1} &middot; ${date}</div><div class="note-body">${text}</div></div>`;
        })
        .join("");
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;margin:0;padding:32px;background:#fff;color:#1a1a1a}.header{border-bottom:2px solid #7C3AED;padding-bottom:16px;margin-bottom:24px}.header h1{margin:0 0 4px;font-size:22px;color:#7C3AED}.header p{margin:0;font-size:13px;color:#666}.note{margin-bottom:20px;padding:16px;background:#f9f9f9;border-radius:10px;border-left:4px solid #7C3AED}.note-meta{font-size:11px;color:#888;margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}.note-body{font-size:14px;line-height:1.7;color:#1a1a1a}.footer{margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center}</style></head><body><div class="header"><h1>My Notes</h1><p>${notes.length} saved note${notes.length === 1 ? "" : "s"} &middot; Exported ${dateStr}</p></div>${noteItems}<div class="footer">Exported from TutorSnap &middot; tutorsnapai.tech</div></body></html>`;
      const Print = await import("expo-print");
      const Sharing = await import("expo-sharing");
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Save Notes PDF" });
      } else {
        Alert.alert("PDF Saved", "Your notes have been saved as a PDF.");
      }
    } catch {
      Alert.alert("Error", "Could not generate PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [notes]);
  const handleClearAll = useCallback(() => {
    Alert.alert(
      "Clear all notes?",
      "This will permanently delete all your saved notes.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem(SAVED_NOTES_KEY);
            setNotes([]);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          },
        },
      ]
    );
  }, []);

  // Filter + group
  const filtered = query.trim()
    ? notes.filter((n) => n.content.toLowerCase().includes(query.toLowerCase()))
    : notes;
  const groups = groupNotes(filtered);

  // Flatten for FlatList with section headers
  type ListItem =
    | { type: "header"; title: string; key: string }
    | { type: "note"; note: SavedNote; key: string };

  const listData: ListItem[] = groups.flatMap((g) => [
    { type: "header", title: g.title, key: `header-${g.title}` },
    ...g.data.map((n) => ({ type: "note" as const, note: n, key: n.id })),
  ]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === "header") {
        return (
          <Text style={[styles.sectionHeader, { color: colors.muted }]}>
            {item.title}
          </Text>
        );
      }
      return (
        <NoteCard note={item.note} onDelete={handleDelete} colors={colors} />
      );
    },
    [colors, handleDelete]
  );

  return (
    <ScreenContainer containerClassName="flex-1">
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backBtn}
          >
            <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            My Notes
          </Text>
        </View>
        {notes.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              onPress={handleExportPDF}
              disabled={exporting}
              style={[styles.clearBtn, { borderColor: colors.primary, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }]}
            >
              <Text style={[styles.clearBtnText, { color: colors.primary }]}>
                {exporting ? "Exporting…" : "Export PDF"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
              <Text style={[styles.clearBtnText, { color: colors.error }]}>
                Clear all
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Search bar ── */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search notes…"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Count ── */}
      {!loading && filtered.length > 0 && (
        <Text style={[styles.countLabel, { color: colors.muted }]}>
          {filtered.length} {filtered.length === 1 ? "note" : "notes"}
          {query ? ` matching "${truncate(query, 20)}"` : ""}
        </Text>
      )}

      {/* ── List / Empty state ── */}
      {loading ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Loading…</Text>
        </View>
      ) : listData.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
            <IconSymbol name="bookmark.fill" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {query ? "No matching notes" : "No saved notes yet"}
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {query
              ? "Try a different search term."
              : 'Long-press any AI response in the tutor\nand tap "Save to Notes" to save it here.'}
          </Text>
          {!query && (
            <TouchableOpacity
              style={[styles.goToTutorBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(tabs)/chat")}
            >
              <Text style={styles.goToTutorText}>Open AI Tutor</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  clearBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  countLabel: {
    fontSize: 12,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 2,
  },
  noteCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    overflow: "hidden",
  },
  noteCardInner: {
    padding: 14,
    gap: 8,
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 21,
  },
  noteFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noteDate: {
    fontSize: 11,
  },
  deleteBtn: {
    padding: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  goToTutorBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  goToTutorText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
