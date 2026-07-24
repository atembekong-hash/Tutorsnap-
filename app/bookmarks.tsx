import React, { useState, useCallback, useMemo } from "react";
import { EmptyState } from "@/components/empty-state";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  ScrollView,
  RefreshControl,
  Share,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Swipeable from "react-native-gesture-handler/Swipeable";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import { Animated } from "react-native";
import { getBookmarks, removeBookmark } from "@/lib/bookmarks";
import {
  getFolders,
  createFolder,
  deleteFolder,
  renameFolder,
  addToFolder,
  removeFromFolder,
  getFolderItems,
  type BookmarkFolder,
} from "@/lib/bookmark-folders";
import type { HistoryItem, SolutionStep } from "@/shared/types";
import { getSubjectColor, getSubjectLabel, getSubjectEmoji } from "@/lib/subjects";
import { GRADE_LABELS } from "@/lib/grade-levels";
import { DotsLoader } from "@/components/skeleton";

// Sort options
type SortKey = "newest" | "oldest" | "subject" | "steps";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "subject", label: "Subject" },
  { key: "steps", label: "Most Steps" },
];

export default function BookmarksScreen() {
  const colors = useColors();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  // Folder state
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folderItems, setFolderItems] = useState<string[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showAddToFolderMenu, setShowAddToFolderMenu] = useState<string | null>(null); // bookmarkId
  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });
  const [refreshing, setRefreshing] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadBookmarks = async (isRefresh = false) => {
    try {
      const bm = await getBookmarks();
      setBookmarks(bm);
    } catch {
      // getBookmarks swallows errors internally; this is a safety net
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    H.impactLight();
    setRefreshing(true);
    loadBookmarks(true);
    loadFolders();
  };

  const toggleSelect = (id: string) => {
    H.impactLight();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkShare = async () => {
    const selected = bookmarks.filter((b) => selectedIds.has(b.id));
    if (selected.length === 0) return;
    H.impactMedium();
    const message = selected.map((item, i) =>
      `${i + 1}. ${item.problem}\nAnswer: ${item.answer}`
    ).join("\n\n");
    try {
      const result = await Share.share({
        message: `My TutorSnap Bookmarks (${selected.length}):\n\n${message}\n\nDownload TutorSnap to solve problems instantly.`,
        title: "TutorSnap Bookmarks",
      });
      if (result.action === Share.sharedAction) {
        H.notificationSuccess();
        setSelectMode(false);
        setSelectedIds(new Set());
      }
    } catch {}
  };

  const loadFolders = async () => {
    try {
      const f = await getFolders();
      setFolders(f);
    } catch {
      // Non-critical — folder load failure shows empty folder list
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName("");
    setShowFolderModal(false);
    await loadFolders();
    H.notificationSuccess();
  };

  const handleDeleteFolder = (folder: BookmarkFolder) => {
    Alert.alert("Delete Folder", `Delete "${folder.name}"? Bookmarks inside will not be deleted.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteFolder(folder.id);
        if (activeFolderId === folder.id) { setActiveFolderId(null); setFolderItems([]); }
        await loadFolders();
      }},
    ]);
  };

  const handleAddToFolder = async (folderId: string, bookmarkId: string) => {
    await addToFolder(folderId, bookmarkId);
    setShowAddToFolderMenu(null);
    await loadFolders();
    H.notificationSuccess();
  };

  const handleRemoveFromFolder = async (bookmarkId: string) => {
    if (!activeFolderId) return;
    await removeFromFolder(activeFolderId, bookmarkId);
    const items = await getFolderItems(activeFolderId);
    setFolderItems(items);
    await loadFolders();
  };

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
      loadFolders();
    }, [])
  );

  // Derive unique subjects present in bookmarks
  const presentSubjects = useMemo(() => {
    const seen = new Set<string>();
    bookmarks.forEach((b) => { if (b.subject) seen.add(b.subject); });
    return Array.from(seen);
  }, [bookmarks]);

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = bookmarks.filter((item) => {
      const matchesSubject = activeSubject === "all" || item.subject === activeSubject;
      const matchesFolder = !activeFolderId || folderItems.includes(item.id);
      if (!q) return matchesSubject && matchesFolder;
      const matchesSearch =
        item.problem.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        getSubjectLabel(item.subject).toLowerCase().includes(q);
      return matchesSubject && matchesFolder && matchesSearch;
    });

    switch (sortKey) {
      case "oldest":
        result = [...result].sort((a, b) => (a.solvedAt ?? 0) - (b.solvedAt ?? 0));
        break;
      case "subject":
        result = [...result].sort((a, b) => getSubjectLabel(a.subject).localeCompare(getSubjectLabel(b.subject)));
        break;
      case "steps":
        result = [...result].sort((a, b) => (b.steps?.length ?? 0) - (a.steps?.length ?? 0));
        break;
      default: // newest
        result = [...result].sort((a, b) => (b.solvedAt ?? 0) - (a.solvedAt ?? 0));
    }
    return result;
  }, [bookmarks, search, activeSubject, sortKey, activeFolderId, folderItems]);

  const handleDelete = (id: string) => {
    Alert.alert("Remove Bookmark", "Remove this problem from bookmarks?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          H.impactMedium();
          try {
            await removeBookmark(id);
            await loadBookmarks();
          } catch {
            Alert.alert("Error", "Could not remove bookmark. Please try again.");
          }
        },
      },
    ]);
  };

  const handleViewSolution = (item: HistoryItem) => {
    router.push({
      pathname: "/solution",
      params: {
        data: JSON.stringify({
          problem: item.problem,
          subject: item.subject,
          answer: item.answer,
          steps: item.steps,
          conceptExplained: item.conceptExplained,
          tips: item.tips,
        }),
      },
    });
  };

  const handleSubjectFilter = (subject: string) => {
    H.impactLight()
    setActiveSubject(subject);
  };

  const handleSortSelect = (key: SortKey) => {
    H.impactLight()
    setSortKey(key);
    setShowSortMenu(false);
  };

  const renderRightActions = (item: HistoryItem) => (
    <TouchableOpacity
      accessibilityLabel="Delete" accessibilityHint="Permanently removes this item"
      onPress={() => handleDelete(item.id)}
      style={styles.swipeDeleteBtn}
      activeOpacity={0.85}
    >
      <IconSymbol size={22} name="trash.fill" color="#FFFFFF" />
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const subjectColor = getSubjectColor(item.subject);
    const subjectLabel = getSubjectLabel(item.subject);
    const subjectEmoji = getSubjectEmoji(item.subject);
    const date = item.solvedAt
      ? new Date(item.solvedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "";
    const isSelected = selectedIds.has(item.id);

    return (
      <Swipeable
        renderRightActions={selectMode ? undefined : () => renderRightActions(item)}
        rightThreshold={60}
        overshootRight={false}
        friction={2}
        enabled={!selectMode}
      >
      <TouchableOpacity
        onPress={() => selectMode ? toggleSelect(item.id) : handleViewSolution(item)}
        onLongPress={() => { if (!selectMode) { setSelectMode(true); toggleSelect(item.id); } }}
        style={[styles.bookmarkCard, { backgroundColor: isSelected ? `${colors.primary}18` : colors.surface, borderColor: isSelected ? colors.primary : colors.border }]}
        activeOpacity={0.75}
      >
        <View style={[styles.bookmarkAccent, { backgroundColor: subjectColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={styles.badgeRow}>
              <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}20` }]}>
                <Text style={styles.subjectEmoji}>{subjectEmoji}</Text>
                <Text style={[styles.subjectBadgeText, { color: subjectColor }]}>{subjectLabel}</Text>
              </View>
              {item.gradeLevel && (
                <View style={[styles.gradeBadge, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
                  <Text style={{ fontSize: 10 }}>📚</Text>
                  <Text style={[styles.gradeBadgeText, { color: colors.primary }]}>{GRADE_LABELS[item.gradeLevel] ?? item.gradeLevel}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardTopRight}>
              {date ? <Text style={[styles.dateText, { color: colors.muted }]}>{date}</Text> : null}
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.removeBtn}
                accessibilityLabel="Delete" accessibilityHint="Permanently removes this item">
                <IconSymbol size={16} name="bookmark.fill" color={colors.warning} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.problemText, { color: colors.foreground }]} numberOfLines={2}>
            {item.problem}
          </Text>
          <View style={styles.answerRow}>
            <IconSymbol size={12} name="checkmark.circle.fill" color={colors.success} />
            <Text style={[styles.answerText, { color: colors.success }]} numberOfLines={1}>
              {item.answer}
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <Text style={[styles.stepsCount, { color: colors.muted }]}>
              {item.steps?.length || 0} steps
            </Text>
            <TouchableOpacity
              accessibilityLabel="Go to practice"
              onPress={(e) => {
                e.stopPropagation();
                router.push({ pathname: "/(tabs)/practice", params: { subject: item.subject } } as any);
              }}
              style={[styles.practiceSimilarBtn, { backgroundColor: `${subjectColor}15`, borderColor: `${subjectColor}40` }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.practiceSimilarText, { color: subjectColor }]}>Practice Similar</Text>
            </TouchableOpacity>
            {activeFolderId ? (
              <TouchableOpacity
                accessibilityLabel="Remove from folder"
                onPress={(e) => { e.stopPropagation(); handleRemoveFromFolder(item.id); }}
                style={[styles.practiceSimilarBtn, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}
                activeOpacity={0.75}
              >
                <Text style={[styles.practiceSimilarText, { color: "#EF4444" }]}>Remove</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                accessibilityLabel="Add to folder"
                onPress={(e) => { e.stopPropagation(); H.impactLight(); setShowAddToFolderMenu(item.id); }}
                style={[styles.practiceSimilarBtn, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}
                activeOpacity={0.75}
              >
                <IconSymbol size={12} name="folder.badge.plus" color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityLabel="Share" accessibilityHint="Opens the share sheet"
              onPress={async (e) => {
                e.stopPropagation();
                H.impactLight();
                try {
                  const result = await Share.share({
                    message: `I saved this on TutorSnap!\n\n${item.problem}\n\nAnswer: ${item.answer}\n\nDownload TutorSnap to solve problems instantly.`,
                    title: "TutorSnap Bookmark",
                  });
                  if (result.action === Share.sharedAction) H.notificationSuccess();
                } catch {}
              }}
              style={{ padding: 4 }}
              activeOpacity={0.7}
            >
              <IconSymbol size={14} name="paperplane.fill" color={colors.muted} />
            </TouchableOpacity>
            <IconSymbol size={14} name="chevron.right" color={colors.muted} />
          </View>
        </View>
      </TouchableOpacity>
      {/* Add to Folder menu */}
      {showAddToFolderMenu === item.id && (
        <TouchableOpacity
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 300 }}
          activeOpacity={1}
          onPress={() => setShowAddToFolderMenu(null)}
        >
          <View style={{ position: "absolute", bottom: 8, right: 8, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, minWidth: 180, overflow: "hidden", elevation: 8, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted, padding: 10, paddingBottom: 4 }}>ADD TO FOLDER</Text>
            {folders.length === 0 ? (
              <TouchableOpacity onPress={() => { setShowAddToFolderMenu(null); setShowFolderModal(true); }} style={{ padding: 12 }} activeOpacity={0.7}>
                <Text style={{ fontSize: 14, color: colors.primary }}>+ Create a folder first</Text>
              </TouchableOpacity>
            ) : folders.map((folder) => {
              const fc = folder.color ?? colors.primary;
              return (
                <TouchableOpacity key={folder.id} onPress={() => handleAddToFolder(folder.id, item.id)} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderTopWidth: 0.5, borderTopColor: colors.border }} activeOpacity={0.7}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: fc }} />
                  <Text style={{ fontSize: 14 }}>{folder.emoji}</Text>
                  <Text style={{ fontSize: 14, color: colors.foreground }}>{folder.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      )}
      </Swipeable>
    );
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Sort";

  const buildBulkMarkdown = (items: HistoryItem[]) => {
    return items.map((item, idx) => {
      const stepsText = item.steps?.map((s: SolutionStep, i: number) => `### Step ${i + 1}: ${s.title}\n${s.expression ? `\`${s.expression}\`\n` : ""}${s.explanation}`).join("\n\n") ?? "";
      return [
        `## ${idx + 1}. ${item.problem}`,
        `**Answer:** ${item.answer}`,
        stepsText ? `### Steps\n\n${stepsText}` : "",
        item.conceptExplained ? `### Key Concept\n\n${item.conceptExplained}` : "",
        item.tips && item.tips.length > 0 ? `### Pro Tips\n\n${item.tips.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}` : "",
      ].filter(Boolean).join("\n\n");
    }).join("\n\n---\n\n");
  };

  const buildBulkHtml = (items: HistoryItem[]) => {
    const solutionsHtml = items.map((item, idx) => {
      const stepsHtml = item.steps?.map((s: SolutionStep) => `<div style="background:#f8f9fa;border-radius:10px;padding:12px;margin-bottom:8px;border-left:3px solid #4F46E5"><strong style="color:#4F46E5">Step ${s.stepNumber}: ${s.title}</strong>${s.expression ? `<div style="font-family:monospace;background:#4F46E510;padding:8px;border-radius:6px;margin:6px 0;color:#4F46E5">${s.expression}</div>` : ""}<p style="color:#333;margin:4px 0 0">${s.explanation}</p></div>`).join("") ?? "";
      return `<div style="border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:20px"><div style="font-size:11px;color:#888;margin-bottom:4px">#${idx + 1} - ${getSubjectLabel(item.subject as any)}</div><h3 style="margin:0 0 10px;color:#1a1a1a;font-size:15px">${item.problem}</h3><div style="background:#4F46E510;border-radius:8px;padding:10px;margin-bottom:12px"><strong style="color:#4F46E5">Answer: </strong><span style="color:#1a1a1a">${item.answer}</span></div>${stepsHtml}</div>`;
    }).join("");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:24px;color:#1a1a1a;background:#fff}h1{color:#4F46E5;font-size:22px;margin-bottom:4px}p.sub{color:#888;font-size:13px;margin:0 0 24px}</style></head><body><h1>My Bookmarked Solutions</h1><p class="sub">${items.length} solution${items.length !== 1 ? "s" : ""} exported from TutorSnap</p>${solutionsHtml}</body></html>`;
  };

  const handleExportMarkdown = async () => {
    setShowExportMenu(false);
    const exportList = filtered.length > 0 ? filtered : bookmarks;
    if (exportList.length === 0) { Alert.alert("No bookmarks", "Save some solutions first."); return; }
    const isFiltered = filtered.length !== bookmarks.length;
    const activeFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : null;
    const folderSlug = activeFolder ? activeFolder.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() : null;
    const fileName = folderSlug ? `TutorSnap-${folderSlug}.md` : "TutorSnap-Bookmarks.md";
    const dialogTitle = activeFolder ? `Export "${activeFolder.name}" folder (${exportList.length} solutions)` : isFiltered ? `Export ${exportList.length} filtered bookmarks` : "Export Bookmarks as Markdown";
    setExportLoading(true);
    H.impactLight();
    try {
      const title = activeFolder ? `My "${activeFolder.name}" Bookmarks (${exportList.length} solutions)` : isFiltered ? `My Bookmarks (${getSubjectLabel(activeSubject as any)} - ${exportList.length} solutions)` : `My Bookmarked Solutions (${exportList.length} solutions)`;
      const md = `# ${title}\nExported from TutorSnap\n\n---\n\n${buildBulkMarkdown(exportList)}`;
      if (Platform.OS !== "web") {
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, md, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) { await Sharing.shareAsync(fileUri, { mimeType: "text/markdown", dialogTitle }); }
        else { Alert.alert("Not available", "Sharing is not available on this device."); }
      } else {
        await Clipboard.setStringAsync(md);
        Alert.alert("Copied!", `${exportList.length} bookmark${exportList.length !== 1 ? "s" : ""} copied as Markdown.`);
      }
    } catch { Alert.alert("Error", "Could not export bookmarks."); }
    finally { setExportLoading(false); }
  };

  const handleExportPdf = async () => {
    setShowExportMenu(false);
    const exportList = filtered.length > 0 ? filtered : bookmarks;
    if (exportList.length === 0) { Alert.alert("No bookmarks", "Save some solutions first."); return; }
    const isFiltered = filtered.length !== bookmarks.length;
    const activeFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : null;
    const folderSlug = activeFolder ? activeFolder.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() : null;
    const fileName = folderSlug ? `TutorSnap-${folderSlug}.pdf` : "TutorSnap-Bookmarks.pdf";
    const dialogTitle = activeFolder ? `Export "${activeFolder.name}" folder (${exportList.length} solutions)` : isFiltered ? `Export ${exportList.length} filtered bookmarks` : "Export Bookmarks as PDF";
    setExportLoading(true);
    H.impactLight();
    try {
      const html = buildBulkHtml(exportList);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const destUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: destUri });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) { await Sharing.shareAsync(destUri, { mimeType: "application/pdf", dialogTitle }); }
      else { Alert.alert("Not available", "Sharing is not available on this device."); }
    } catch { Alert.alert("Error", "Could not generate PDF."); }
    finally { setExportLoading(false); }
  };

  return (
    <ScreenContainer>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity accessibilityLabel="Go back" accessibilityHint="Returns to the previous screen" accessibilityRole="button" onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={24} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Bookmarks</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {bookmarks.length} saved solution{bookmarks.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {selectMode ? (
            <TouchableOpacity
              onPress={() => { setSelectMode(false); setSelectedIds(new Set()); H.impactLight(); }}
              style={[styles.flashcardBtn, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.error }}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                accessibilityLabel="Export bookmarks"
                onPress={() => { H.impactLight(); setShowExportMenu(true); }}
                style={[styles.flashcardBtn, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` }]}
                activeOpacity={0.7}
                disabled={exportLoading}
              >
                {exportLoading
                  ? <DotsLoader color={colors.success} />
                  : <IconSymbol size={18} name="square.and.arrow.up" color={colors.success} />}
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="View flashcards"
                onPress={() => router.push("/flashcards" as any)}
                style={[styles.flashcardBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16 }}>🃏</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Select bookmarks"
                onPress={() => { H.impactLight(); setSelectMode(true); }}
                style={[styles.flashcardBtn, { backgroundColor: `${colors.muted}15`, borderColor: `${colors.muted}30` }]}
                activeOpacity={0.7}
              >
                <IconSymbol size={18} name="checkmark.circle" color={colors.muted} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      {/* Bulk share bar */}
      {selectMode && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 14, color: colors.muted }}>
            {selectedIds.size === 0 ? "Long-press or tap to select" : `${selectedIds.size} selected`}
          </Text>
          <TouchableOpacity accessibilityLabel="Share" accessibilityHint="Opens the share sheet" accessibilityRole="button"
            onPress={handleBulkShare}
            disabled={selectedIds.size === 0}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: selectedIds.size > 0 ? colors.primary : `${colors.muted}30` }}
            activeOpacity={0.75}
          >
            <IconSymbol size={15} name="paperplane.fill" color={selectedIds.size > 0 ? "#fff" : colors.muted} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: selectedIds.size > 0 ? "#fff" : colors.muted }}>Share Selected</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Export Menu Modal */}
      {showExportMenu && (
        <TouchableOpacity
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
          activeOpacity={1}
          onPress={() => setShowExportMenu(false)}
        >
          <View style={[{ position: "absolute", top: 72, right: 16, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8, minWidth: 220, zIndex: 100, overflow: "hidden" }]}>
            <TouchableOpacity
              onPress={handleExportMarkdown}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border }}
              activeOpacity={0.7}
            >
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.primary}15`, alignItems: "center", justifyContent: "center" }}>
                <IconSymbol size={16} name="doc.text" color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>Export as Markdown</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>For Notion, Obsidian, Google Docs</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleExportPdf}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
              activeOpacity={0.7}
            >
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.error}15`, alignItems: "center", justifyContent: "center" }}>
                <IconSymbol size={16} name="doc.richtext" color={colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>Export as PDF</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>Save to Files app or Google Drive</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {bookmarks.length === 0 ? (
        <EmptyState variant="bookmarks" onAction={() => router.push("/(tabs)/" as any)} />
      ) : (
        <>
          {/* Search Bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol size={17} name="magnifyingglass" color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search bookmarks..."
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.foreground }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            
          maxLength={100}
        />
            {search.length > 0 && Platform.OS !== "ios" && (
              <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}
                accessibilityLabel="Clear search">
                <IconSymbol size={17} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Folders Row */}
          {folders.length > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
              <ScrollView keyboardDismissMode="on-drag" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                <TouchableOpacity
                  onPress={() => { setActiveFolderId(null); setFolderItems([]); H.impactLight(); }}
                  style={[{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: activeFolderId === null ? colors.primary : colors.border, backgroundColor: activeFolderId === null ? `${colors.primary}15` : colors.surface }]}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: activeFolderId === null ? colors.primary : colors.foreground }}>All</Text>
                </TouchableOpacity>
                {folders.map((folder) => {
                  const isActive = activeFolderId === folder.id;
                  const folderColor = folder.color ?? colors.primary;
                  return (
                    <TouchableOpacity
                      key={folder.id}
                      onPress={async () => {
                        H.impactLight();
                        if (isActive) { setActiveFolderId(null); setFolderItems([]); }
                        else { setActiveFolderId(folder.id); const items = await getFolderItems(folder.id); setFolderItems(items); }
                      }}
                      onLongPress={() => handleDeleteFolder(folder)}
                      style={[{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: isActive ? folderColor : colors.border, backgroundColor: isActive ? `${folderColor}20` : colors.surface }]}
                      activeOpacity={0.7}
                    >
                      {/* Colour dot */}
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: folderColor }} />
                      <Text style={{ fontSize: 13 }}>{folder.emoji}</Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: isActive ? folderColor : colors.foreground }}>{folder.name}</Text>
                      <Text style={{ fontSize: 11, color: isActive ? folderColor : colors.muted }}>({folder.itemCount ?? 0})</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity accessibilityLabel="Add" accessibilityHint="Opens the add form" accessibilityRole="button"
                  onPress={() => setShowFolderModal(true)}
                  style={[{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                >
                  <IconSymbol size={13} name="plus" color={colors.muted} />
                  <Text style={{ fontSize: 13, color: colors.muted }}>New Folder</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
          {folders.length === 0 && (
            <TouchableOpacity accessibilityLabel="Add" accessibilityHint="Opens the add form" accessibilityRole="button"
              onPress={() => setShowFolderModal(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingBottom: 4 }}
              activeOpacity={0.7}
            >
              <IconSymbol size={14} name="folder.badge.plus" color={colors.muted} />
              <Text style={{ fontSize: 13, color: colors.muted }}>Create a folder to organise bookmarks</Text>
            </TouchableOpacity>
          )}
          {/* Create Folder Modal */}
          {showFolderModal && (
            <TouchableOpacity
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" }}
              activeOpacity={1}
              onPress={() => setShowFolderModal(false)}
            >
              <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 24, width: "90%", maxWidth: 360, gap: 16 }}>
                <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>New Folder</Text>
                <TextInput
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  placeholder="Folder name (e.g. Exam Prep)"
                  placeholderTextColor={colors.muted}
                  style={{ backgroundColor: colors.background, borderRadius: 10, padding: 12, fontSize: 15, color: colors.foreground, borderWidth: 1, borderColor: colors.border }}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreateFolder}
                
          maxLength={100}
        />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity onPress={() => setShowFolderModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }} activeOpacity={0.7}>
                    <Text style={{ fontSize: 15, color: colors.muted }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCreateFolder} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center" }} activeOpacity={0.7}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>Create</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          {/* Subject Filter Chips + Sort */}
          <View style={styles.filterRow}>
            <ScrollView keyboardDismissMode="on-drag"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}
            >
              <TouchableOpacity
                onPress={() => handleSubjectFilter("all")}
                activeOpacity={0.7}
                style={[
                  styles.chip,
                  {
                    backgroundColor: activeSubject === "all" ? colors.primary : colors.surface,
                    borderColor: activeSubject === "all" ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: activeSubject === "all" ? "#FFFFFF" : colors.foreground }]}>
                  All
                </Text>
              </TouchableOpacity>
              {presentSubjects.map((subj) => {
                const color = getSubjectColor(subj);
                const label = getSubjectLabel(subj);
                const emoji = getSubjectEmoji(subj);
                const isActive = activeSubject === subj;
                return (
                  <TouchableOpacity
                    key={subj}
                    onPress={() => handleSubjectFilter(subj)}
                    activeOpacity={0.7}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isActive ? color : colors.surface,
                        borderColor: isActive ? color : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.chipEmoji}>{emoji}</Text>
                    <Text style={[styles.chipText, { color: isActive ? "#FFFFFF" : colors.foreground }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Sort Button */}
            <TouchableOpacity
              accessibilityLabel="Toggle show sort menu"
              onPress={() => setShowSortMenu(!showSortMenu)}
              style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <IconSymbol size={15} name="list.bullet" color={colors.muted} />
              <Text style={[styles.sortBtnText, { color: colors.muted }]}>{currentSortLabel}</Text>
            </TouchableOpacity>
          </View>

          {/* Sort Dropdown */}
          {showSortMenu && (
            <View style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  accessibilityLabel="Sort"
                  key={opt.key}
                  onPress={() => handleSortSelect(opt.key)}
                  style={[styles.sortMenuItem, sortKey === opt.key && { backgroundColor: `${colors.primary}10` }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sortMenuItemText, { color: sortKey === opt.key ? colors.primary : colors.foreground }]}>
                    {opt.label}
                  </Text>
                  {sortKey === opt.key && (
                    <IconSymbol size={15} name="checkmark.circle.fill" color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Result count */}
          {(search || activeSubject !== "all") && (
            <Text style={[styles.resultCount, { color: colors.muted }]}>
              {filtered.length} of {bookmarks.length} bookmarks
            </Text>
          )}

          {/* Empty search result */}
          {filtered.length === 0 ? (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchEmoji}>🔍</Text>
              <Text style={[styles.emptySearchTitle, { color: colors.foreground }]}>No results</Text>
              <Text style={[styles.emptySearchDesc, { color: colors.muted }]}>
                Try a different keyword or subject filter.
              </Text>
              <TouchableOpacity
                accessibilityLabel="Toggle search"
                onPress={() => { setSearch(""); setActiveSubject("all"); }}
                style={[styles.clearBtn, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.clearBtnText, { color: colors.foreground }]}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
            />
          )}
        </>
      )}
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  flashcardBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingRight: 12,
  },
  chipScroll: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipEmoji: { fontSize: 13 },
  chipText: { fontSize: 12, fontWeight: "600" },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  sortBtnText: { fontSize: 12, fontWeight: "600" },
  sortMenu: {
    position: "absolute",
    right: 12,
    top: 100,
    zIndex: 100,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  sortMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  sortMenuItemText: { fontSize: 14, fontWeight: "600" },
  resultCount: {
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 2,
  },
  bookmarkCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  bookmarkAccent: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 8 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTopRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectEmoji: { fontSize: 12 },
  subjectBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  dateText: { fontSize: 11 },
  removeBtn: { padding: 4 },
  problemText: { fontSize: 15, fontWeight: "500", lineHeight: 22 },
  answerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  answerText: { fontSize: 13, fontWeight: "600", flex: 1 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stepsCount: { fontSize: 12 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptySubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  startBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  startBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  emptySearch: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptySearchEmoji: { fontSize: 40, marginBottom: 8 },
  emptySearchTitle: { fontSize: 18, fontWeight: "700" },
  emptySearchDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  clearBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearBtnText: { fontSize: 14, fontWeight: "600" },
  swipeDeleteBtn: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 16,
    marginLeft: 8,
    gap: 4,
  },
  swipeDeleteText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  practiceSimilarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  practiceSimilarText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  gradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  gradeBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
});
