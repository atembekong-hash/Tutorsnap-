/**
 * Glossary Tab — displays all pinned definitions from AI Tutor sessions.
 *
 * Users can:
 *  - Browse pinned definitions in a searchable list
 *  - Expand / collapse each entry
 *  - Copy the definition text
 *  - Unpin (delete) entries
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import Animated from "react-native-reanimated";
import { useAnimatedList } from "@/hooks/use-animated-list";
import {
  clearGlossary,
  GlossaryEntry,
  readGlossary,
  unpinDefinition,
} from "@/lib/glossary";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .trim();
}

// ─── Entry Card ──────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  colors,
  onUnpin,
}: {
  entry: GlossaryEntry;
  colors: ReturnType<typeof useColors>;
  onUnpin: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(entry.definition);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* ignore */ }
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const plain = stripMarkdown(entry.definition);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: `${colors.primary}25` }]}>
      {/* Header */}
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
        style={styles.cardHeader}
      >
        <View style={[styles.iconPill, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={{ fontSize: 14 }}>📖</Text>
        </View>
        <Text
          style={[styles.term, { color: colors.foreground }]}
          numberOfLines={expanded ? undefined : 1}
        >
          {entry.term}
        </Text>
        <Text style={[styles.chevron, { color: colors.muted }]}>
          {expanded ? "▲" : "▼"}
        </Text>
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View style={[styles.cardBody, { borderTopColor: `${colors.primary}20` }]}>
          <Text style={[styles.definitionText, { color: colors.foreground }]}>
            {plain}
          </Text>
          <View style={styles.cardFooter}>
            {entry.subject && (
              <View style={[styles.subjectChip, { backgroundColor: `${colors.primary}12` }]}>
                <Text style={[styles.subjectChipText, { color: colors.primary }]}>
                  {entry.subject}
                </Text>
              </View>
            )}
            <Text style={[styles.dateText, { color: colors.muted }]}>
              {new Date(entry.pinnedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={handleCopy}
                style={[styles.actionBtn, { backgroundColor: `${colors.primary}12` }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                  {copied ? "✓ Copied" : "Copy"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onUnpin}
                style={[styles.actionBtn, { backgroundColor: `${colors.error}12` }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: colors.error }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function GlossaryScreen() {
  const colors = useColors();
  const { getEntering } = useAnimatedList({ staggerMs: 40, durationMs: 260 });
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await readGlossary();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnpin = useCallback(async (id: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await unpinDefinition(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      "Clear Glossary",
      "Remove all pinned definitions? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await clearGlossary();
            setEntries([]);
          },
        },
      ],
    );
  }, []);

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          e.term.toLowerCase().includes(search.toLowerCase()) ||
          e.definition.toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={{ fontSize: 22 }}>📖</Text>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Glossary</Text>
            <Text style={[styles.headerSub, { color: colors.muted }]}>
              {entries.length} pinned definition{entries.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        {entries.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7} style={styles.clearBtn}>
            <Text style={[styles.clearBtnText, { color: colors.error }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search bar */}
      {entries.length > 0 && (
        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: 14, color: colors.muted, marginRight: 6 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search definitions…"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      )}

      {/* List */}
      {!loading && entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📚</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No definitions yet</Text>
          <Text style={[styles.emptySub, { color: colors.muted }]}>
            Long-press any AI response in the Tutor and tap{"\n"}
            <Text style={{ fontWeight: "700" }}>📌 Pin Definition</Text> to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <Animated.View entering={getEntering(index)}>
              <EntryCard
                entry={item}
                colors={colors}
                onUnpin={() => handleUnpin(item.id)}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptySub, { color: colors.muted }]}>No results for "{search}"</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  list: {
    padding: 14,
    gap: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  term: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  chevron: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardBody: {
    borderTopWidth: 0.5,
    padding: 12,
    gap: 10,
  },
  definitionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  subjectChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 11,
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
