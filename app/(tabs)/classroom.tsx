/**
 * Classroom Tab Screen
 *
 * Tabs: Feed | Leaderboard | Analytics (teacher only) | Manage
 * Features:
 *  - Create/join classroom with 6-char code
 *  - Share problems to feed from Solution screen
 *  - Assign problems as homework with due date
 *  - Challenge a classmate (timed challenge flow)
 *  - Leaderboard ranked by correct answers + fastest time
 *  - Teacher analytics (subject breakdown, activity)
 *  - Classroom notification preferences
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  FlatList,
  Share,
  Platform,
  Modal,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getMyClassroom,
  getJoinedClassroom,
  createClassroom,
  deleteMyClassroom,
  joinClassroom,
  leaveClassroom,
  getClassroomFeed,
  removeFromClassroomFeed,
  assignAsHomework,
  unassignHomework,
  getLeaderboard,
  resetLeaderboard,
  getClassroomNotifPrefs,
  saveClassroomNotifPrefs,
  getClassroomDisplayName,
  saveClassroomDisplayName,
  type ClassroomInfo,
  type ClassroomProblem,
  type LeaderboardEntry,
  type ClassroomNotifPrefs,
} from "@/lib/classroom";
import { getSubjectColor, getSubjectLabel, getSubjectEmoji } from "@/lib/subjects";
import * as Clipboard from "expo-clipboard";
import {
  scheduleHomeworkReminders,
  cancelHomeworkReminders,
  cancelAllHomeworkReminders,
} from "@/lib/homework-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProblemCommentSheet } from "@/components/problem-comment-sheet";
import { getCommentCount } from "@/lib/problem-comments";
import { toggleBookmark, isBookmarked } from "@/lib/bookmarks";
import { APP_URL } from "@/constants/app";

const HW_DONE_KEY = "@tutorsnap/hw_done";

type Tab = "feed" | "leaderboard" | "analytics" | "manage";

// Due-date helpers
function formatDueDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff} days`;
}

function dueDateColor(iso: string, colors: ReturnType<typeof useColors>): string {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return colors.error;
  if (diff <= 1) return colors.warning;
  return colors.success;
}

// Generate a list of upcoming date options for the due date picker
function getDateOptions(): { label: string; iso: string }[] {
  const opts: { label: string; iso: string }[] = [];
  const labels = ["Today", "Tomorrow", "In 3 days", "In 1 week", "In 2 weeks"];
  const offsets = [0, 1, 3, 7, 14];
  offsets.forEach((offset, i) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(23, 59, 0, 0);
    opts.push({ label: labels[i], iso: d.toISOString() });
  });
  return opts;
}

export default function ClassroomTabScreen() {
  const colors = useColors();
  const router = useRouter();

  const [myClassroom, setMyClassroom] = useState<ClassroomInfo | null>(null);
  const [joinedClassroom, setJoinedClassroom] = useState<ClassroomInfo | null>(null);
  const [feed, setFeed] = useState<ClassroomProblem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<ClassroomNotifPrefs>({ enabled: true, newProblem: true, newHomework: true });
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [_loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [classroomName, setClassroomName] = useState("");
  const [creating, setCreating] = useState(false);

  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState("");
  const [classroomNameInput, setClassroomNameInput] = useState("");

  const [copiedCode, setCopiedCode] = useState(false);
  const copiedCodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Homework modal state
  const [homeworkModalItem, setHomeworkModalItem] = useState<ClassroomProblem | null>(null);
  const [selectedDueDate, setSelectedDueDate] = useState<string>("");
  const [homeworkTitle, setHomeworkTitle] = useState("");

  // Edit display-name modal
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  // Feed search
  const [feedQuery, setFeedQuery] = useState("");

  // Feed sort and subject filter
  type FeedSort = "newest" | "oldest" | "homework_first";
  const [feedSort, setFeedSort] = useState<FeedSort>("newest");
  const [feedSubjectFilter, setFeedSubjectFilter] = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Homework completion — persisted to AsyncStorage
  const [completedHomework, setCompletedHomework] = useState<Set<string>>(new Set());
  const [hwDoneLoaded, setHwDoneLoaded] = useState(false);

  // Comment sheet
  const [commentProblem, setCommentProblem] = useState<ClassroomProblem | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  // Bookmarked problem IDs (local set for instant UI feedback)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Expanded card ID for full problem text preview
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const dateOptions = useMemo(() => getDateOptions(), []);

  // Load persisted homework completion state on mount
  useEffect(() => {
    AsyncStorage.getItem(HW_DONE_KEY)
      .then((raw) => {
        if (raw) {
          let ids: string[] = [];
          try { ids = JSON.parse(raw); } catch { /* corrupted data */ }
          setCompletedHomework(new Set(ids));
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setHwDoneLoaded(true));
  }, []);

  // Persist completedHomework whenever it changes (after initial load)
  useEffect(() => {
    if (!hwDoneLoaded) return;
    AsyncStorage.setItem(HW_DONE_KEY, JSON.stringify(Array.from(completedHomework))).catch(() => { /* ignore */ });
  }, [completedHomework, hwDoneLoaded]);

  // Refresh comment counts whenever the feed changes
  const refreshCommentCounts = useCallback(async (feed: ClassroomProblem[]) => {
    const entries = await Promise.all(
      feed.map(async (item) => [item.id, await getCommentCount(item.id)] as [string, number])
    );
    setCommentCounts(Object.fromEntries(entries));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [mine, joined, prefs, savedName] = await Promise.all([
      getMyClassroom(),
      getJoinedClassroom(),
      getClassroomNotifPrefs(),
      getClassroomDisplayName(),
    ]);
    if (savedName) setDisplayName(savedName);
    setMyClassroom(mine);
    setJoinedClassroom(joined);
    setNotifPrefs(prefs);
    const activeClassroom = mine || joined;
    if (activeClassroom) {
      const [f, lb] = await Promise.all([
        getClassroomFeed(activeClassroom.code),
        getLeaderboard(activeClassroom.code),
      ]);
      setFeed(f);
      setLeaderboard(lb);
      refreshCommentCounts(f);
      // Load bookmark state for each feed item
      const bookmarkChecks = await Promise.all(
        f.map(async (item) => [item.id, await isBookmarked(item.problem)] as [string, boolean])
      );
      const bookmarkedSet = new Set(bookmarkChecks.filter(([, v]) => v).map(([id]) => id));
      setBookmarkedIds(bookmarkedSet);
    } else {
      setFeed([]);
      setLeaderboard([]);
    }
    setLoading(false);
  }, [refreshCommentCounts]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const activeClassroom = myClassroom || joinedClassroom;

  const handleCreateClassroom = async () => {
    if (!classroomName.trim()) return;
    setCreating(true);
    H.impactMedium()
    const info = await createClassroom(classroomName);
    setMyClassroom(info);
    setShowCreate(false);
    setClassroomName("");
    setCreating(false);
    setActiveTab("manage");
  };

  const handleJoinClassroom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert("Invalid Code", "Please enter a valid classroom code.");
      return;
    }
    // Show display name prompt before joining
    setPendingJoinCode(code);
    setShowJoin(false);
    setJoinCode("");
    setShowNamePrompt(true);
  };

  const handleConfirmJoin = async () => {
    const name = displayName.trim() || "Student";
    await saveClassroomDisplayName(name);
    setDisplayName(name);
    setJoining(true);
    H.impactMedium()
    // Use the classroom name the student entered (or a sensible fallback)
    const classroomLabel = classroomNameInput.trim() || `Class ${pendingJoinCode}`;
    const info = await joinClassroom(pendingJoinCode, classroomLabel);
    setJoinedClassroom(info);
    setShowNamePrompt(false);
    setPendingJoinCode("");
    setClassroomNameInput("");
    setJoining(false);
    setActiveTab("feed");
    await loadData();
  };

  const handleDeleteClassroom = () => {
    Alert.alert(
      "Delete Classroom",
      "This will remove your classroom and all shared problems.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteMyClassroom();
            setMyClassroom(null);
            setFeed([]);
            setLeaderboard([]);
          },
        },
      ]
    );
  };

  const handleLeaveClassroom = () => {
    Alert.alert(
      "Leave Classroom",
      "You will no longer see shared problems from this classroom.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            await leaveClassroom();
            setJoinedClassroom(null);
            setFeed([]);
            setLeaderboard([]);
            cancelAllHomeworkReminders().catch(() => {/* ignore */});
          },
        },
      ]
    );
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(true);
    H.impactLight();
    if (copiedCodeTimerRef.current) clearTimeout(copiedCodeTimerRef.current);
    copiedCodeTimerRef.current = setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareCode = async (code: string, name: string) => {
    try {
      await Share.share({
        message: `Join my TutorSnap classroom "${name}"!\n\nUse code: ${code}\n\nDownload TutorSnap at ${APP_URL.replace("https://", "")}`,
        title: "Join my TutorSnap Classroom",
      });
    } catch { /* ignore */ }
  };

  const handleRemoveProblem = (id: string) => {
    if (!activeClassroom) return;
    Alert.alert("Remove Problem", "Remove this problem from the classroom feed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeFromClassroomFeed(activeClassroom.code, id);
          setFeed((prev) => prev.filter((p) => p.id !== id));
        },
      },
    ]);
  };

  const handleChallenge = (item: ClassroomProblem) => {
    router.push({
      pathname: "/challenge",
      params: {
        problem: item.problem,
        answer: item.answer,
        subject: item.subject,
        steps: JSON.stringify(item.steps),
        classCode: item.classCode,
      },
    } as any);
  };

  const handleOpenHomeworkModal = (item: ClassroomProblem) => {
    setHomeworkModalItem(item);
    setSelectedDueDate(item.dueDate || dateOptions[1].iso);
    setHomeworkTitle(item.homeworkTitle || item.problem.slice(0, 40));
  };

  const handleAssignHomework = async () => {
    if (!activeClassroom || !homeworkModalItem || !selectedDueDate) return;
    await assignAsHomework(activeClassroom.code, homeworkModalItem.id, selectedDueDate, homeworkTitle);
    setFeed((prev) =>
      prev.map((p) =>
        p.id === homeworkModalItem.id
          ? { ...p, isHomework: true, dueDate: selectedDueDate, homeworkTitle }
          : p
      )
    );
    // Schedule due-date reminder notifications for students
    const title = homeworkTitle || homeworkModalItem.problem.slice(0, 60);
    scheduleHomeworkReminders(homeworkModalItem.id, title, selectedDueDate).catch(() => {/* ignore */});
    setHomeworkModalItem(null);
    H.notificationSuccess()
  };

  const handleUnassignHomework = async (item: ClassroomProblem) => {
    if (!activeClassroom) return;
    await unassignHomework(activeClassroom.code, item.id);
    setFeed((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, isHomework: false, dueDate: undefined, homeworkTitle: undefined } : p
      )
    );
    // Cancel any scheduled reminders
    cancelHomeworkReminders(item.id).catch(() => {/* ignore */});
  };

  const handleToggleNotifPref = async (key: keyof ClassroomNotifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    await saveClassroomNotifPrefs(updated);
    H.impactLight()
  };

  const handleResetLeaderboard = () => {
    if (!activeClassroom) return;
    Alert.alert(
      "Reset Leaderboard",
      "This will clear all scores and rankings for this classroom. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetLeaderboard(activeClassroom.code);
            setLeaderboard([]);
            H.notificationSuccess()
            Alert.alert("Leaderboard Reset", "All scores have been cleared.");
          },
        },
      ]
    );
  };

  const handleEditDisplayName = () => {
    setEditNameValue(displayName);
    setShowEditNameModal(true);
  };

  const handleSaveDisplayName = async () => {
    const name = editNameValue.trim();
    if (!name) return;
    await saveClassroomDisplayName(name);
    setDisplayName(name);
    setShowEditNameModal(false);
    H.notificationSuccess()
  };

  // Unique subjects in the feed for the filter chip bar
  const feedSubjects = useMemo(() => {
    const seen = new Set<string>();
    feed.forEach((p) => seen.add(p.subject));
    return Array.from(seen).sort();
  }, [feed]);

  // Filtered + sorted feed
  const filteredFeed = useMemo(() => {
    const q = feedQuery.trim().toLowerCase();
    let result = feed;

    // Text search
    if (q) {
      result = result.filter(
        (p) =>
          p.problem.toLowerCase().includes(q) ||
          p.subject.toLowerCase().includes(q) ||
          (p.sharedBy || "").toLowerCase().includes(q) ||
          (p.homeworkTitle || "").toLowerCase().includes(q)
      );
    }

    // Subject filter
    if (feedSubjectFilter) {
      result = result.filter((p) => p.subject === feedSubjectFilter);
    }

    // Sort
    const sorted = [...result];
    if (feedSort === "newest") {
      sorted.sort((a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime());
    } else if (feedSort === "oldest") {
      sorted.sort((a, b) => new Date(a.sharedAt).getTime() - new Date(b.sharedAt).getTime());
    } else if (feedSort === "homework_first") {
      sorted.sort((a, b) => {
        if (a.isHomework && !b.isHomework) return -1;
        if (!a.isHomework && b.isHomework) return 1;
        return new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime();
      });
    }
    return sorted;
  }, [feed, feedQuery, feedSubjectFilter, feedSort]);

  // Mark a homework item as done (local toggle)
  const handleMarkHomeworkDone = (id: string) => {
    H.notificationSuccess()
    setCompletedHomework((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Homework un-done: re-schedule reminders if due date still in future
        const item = feed.find((p) => p.id === id);
        if (item?.dueDate && new Date(item.dueDate).getTime() > Date.now()) {
          const title = item.homeworkTitle || item.problem.slice(0, 60);
          scheduleHomeworkReminders(id, title, item.dueDate).catch(() => {/* ignore */});
        }
      } else {
        next.add(id);
        // Homework done: cancel pending reminders
        cancelHomeworkReminders(id).catch(() => {/* ignore */});
      }
      return next;
    });
  };

  // Bookmark toggle for feed cards
  const handleBookmarkToggle = useCallback(async (item: ClassroomProblem) => {
    H.impactLight()
    const historyItem = {
      id: `classroom-${item.id}`,
      problem: item.problem,
      answer: item.answer || "",
      subject: item.subject as import("@/shared/types").MathSubject,
      steps: (item.steps || []) as unknown as import("@/shared/types").SolutionStep[],
      solvedAt: new Date(item.sharedAt).getTime(),
    };
    const nowBookmarked = await toggleBookmark(historyItem);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (nowBookmarked) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
    if (nowBookmarked) H.notificationSuccess(); else H.notificationWarning();
  }, []);

  // Analytics: compute subject breakdown from feed
  const subjectBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    feed.forEach((p) => {
      counts[p.subject] = (counts[p.subject] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([subject, count]) => ({ subject, count }));
  }, [feed]);

  const homeworkItems = useMemo(() => feed.filter((p) => p.isHomework), [feed]);

  const renderProblemCard = ({ item }: { item: ClassroomProblem }) => {
    const subjectColor = getSubjectColor(item.subject);
    const subjectLabel = getSubjectLabel(item.subject);
    const subjectEmoji = getSubjectEmoji(item.subject);
    const date = new Date(item.sharedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const isDone = completedHomework.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.problemCard, { backgroundColor: colors.surface, borderColor: isDone ? `${colors.success}50` : colors.border, opacity: isDone ? 0.75 : 1 }]}
        onPress={() => {
          // Build a MathSolution-shaped object; if answer/steps are missing
          // the solution screen will auto-trigger the solver.
          // Steps may be JSON-stringified SolutionStep objects — parse them back.
          const parsedSteps = (item.steps || []).map((s) => {
            if (typeof s === "string") {
              try { return JSON.parse(s); } catch { return null; }
            }
            return s;
          }).filter(Boolean);
          const solutionData = {
            problem: item.problem,
            subject: item.subject,
            answer: item.answer || "",
            steps: parsedSteps,
            explanation: "",
            tips: [],
          };
          router.push({
            pathname: "/solution",
            params: { data: JSON.stringify(solutionData) },
          } as any);
        }}
        activeOpacity={0.75}
      >
        <View style={[styles.problemAccent, { backgroundColor: isDone ? colors.success : (item.isHomework ? colors.warning : subjectColor) }]} />
        <View style={styles.problemContent}>
          <View style={styles.problemTop}>
            <View style={styles.problemTopLeft}>
              <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}20` }]}>
                <Text style={styles.subjectEmoji}>{subjectEmoji}</Text>
                <Text style={[styles.subjectBadgeText, { color: subjectColor }]}>{subjectLabel}</Text>
              </View>
              {isDone && (
                <View style={[styles.hwBadge, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}40` }]}>
                  <IconSymbol size={10} name="checkmark.circle.fill" color={colors.success} />
                  <Text style={[styles.hwBadgeText, { color: colors.success }]}>Done</Text>
                </View>
              )}
              {!isDone && item.isHomework && item.dueDate && (
                <View style={[styles.hwBadge, { backgroundColor: `${dueDateColor(item.dueDate, colors)}18`, borderColor: `${dueDateColor(item.dueDate, colors)}40` }]}>
                  <IconSymbol size={10} name="calendar" color={dueDateColor(item.dueDate, colors)} />
                  <Text style={[styles.hwBadgeText, { color: dueDateColor(item.dueDate, colors) }]}>
                    {formatDueDate(item.dueDate)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.problemTopRight}>
              <Text style={[styles.dateText, { color: colors.muted }]}>{date}</Text>
              {/* Bookmark button */}
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); handleBookmarkToggle(item); }}
                accessibilityLabel={bookmarkedIds.has(item.id) ? "Remove bookmark" : "Bookmark"}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol
                  size={16}
                  name={bookmarkedIds.has(item.id) ? "bookmark.fill" : "bookmark"}
                  color={bookmarkedIds.has(item.id) ? colors.primary : colors.muted}
                />
              </TouchableOpacity>
              {myClassroom && (
                <TouchableOpacity onPress={() => handleRemoveProblem(item.id)} style={styles.removeBtn}
                  accessibilityLabel="Remove">
                  <IconSymbol size={14} name="xmark.circle.fill" color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          {/* Expandable problem preview */}
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); setExpandedCardId((prev) => prev === item.id ? null : item.id); }}
            activeOpacity={0.85}
            accessibilityLabel={expandedCardId === item.id ? "Collapse problem" : "Expand problem"}
          >
            <Text
              style={[styles.problemText, { color: colors.foreground }]}
              numberOfLines={expandedCardId === item.id ? undefined : 2}
            >
              {item.problem}
            </Text>
            {item.problem.length > 80 && (
              <Text style={[styles.expandHint, { color: colors.primary }]}>
                {expandedCardId === item.id ? "Show less ▲" : "Show more ▼"}
              </Text>
            )}
          </TouchableOpacity>
          <View style={styles.problemFooter}>
            <Text style={[styles.sharedBy, { color: colors.muted }]}>
              Shared by {item.sharedBy}
            </Text>
            <View style={styles.problemActions}>
              {/* Done button for homework items (student only) */}
              {item.isHomework && !myClassroom && (
                <TouchableOpacity
                  accessibilityLabel={isDone ? "Mark as not done" : "Mark as done"}
                  style={[styles.hwBtn, {
                    backgroundColor: isDone ? `${colors.success}15` : `${colors.surface}`,
                    borderColor: isDone ? colors.success : colors.border,
                  }]}
                  onPress={() => handleMarkHomeworkDone(item.id)}
                  activeOpacity={0.75}
                >
                  <IconSymbol size={11} name={isDone ? "checkmark.circle.fill" : "circle"} color={isDone ? colors.success : colors.muted} />
                  <Text style={[styles.hwBtnText, { color: isDone ? colors.success : colors.muted }]}>
                    {isDone ? "Done" : "Mark Done"}
                  </Text>
                </TouchableOpacity>
              )}
              {myClassroom && (
                <TouchableOpacity
                  accessibilityLabel="Open"
                  style={[styles.hwBtn, {
                    backgroundColor: item.isHomework ? `${colors.warning}15` : `${colors.surface}`,
                    borderColor: item.isHomework ? colors.warning : colors.border,
                  }]}
                  onPress={() => item.isHomework ? handleUnassignHomework(item) : handleOpenHomeworkModal(item)}
                  activeOpacity={0.75}
                >
                  <IconSymbol size={11} name="calendar" color={item.isHomework ? colors.warning : colors.muted} />
                  <Text style={[styles.hwBtnText, { color: item.isHomework ? colors.warning : colors.muted }]}>
                    {item.isHomework ? "HW" : "Assign"}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                accessibilityLabel="Challenge classmate"
                style={[styles.challengeBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}
                onPress={() => handleChallenge(item)}
                activeOpacity={0.75}
              >
                <IconSymbol size={12} name="timer" color={colors.primary} />
                <Text style={[styles.challengeBtnText, { color: colors.primary }]}>Challenge</Text>
              </TouchableOpacity>
              {/* Comment button */}
              <TouchableOpacity
                accessibilityLabel="View comments"
                style={[styles.challengeBtn, {
                  backgroundColor: `${colors.muted}12`,
                  borderColor: `${colors.muted}30`,
                }]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  setCommentProblem(item);
                }}
                activeOpacity={0.75}
              >
                <IconSymbol size={12} name="bubble.left.fill" color={colors.muted} />
                <Text style={[styles.challengeBtnText, { color: colors.muted }]}>
                  {(commentCounts[item.id] ?? 0) > 0 ? String(commentCounts[item.id]) : "Notes"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLeaderboardEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const medals = ["🥇", "🥈", "🥉"];
    const medal = index < 3 ? medals[index] : null;
    const accuracy = item.challengesCompleted > 0
      ? Math.round((item.challengesCorrect / item.challengesCompleted) * 100)
      : 0;

    return (
      <View style={[styles.lbRow, { backgroundColor: colors.surface, borderColor: index === 0 ? `${colors.warning}60` : colors.border }]}>
        <View style={styles.lbRank}>
          {medal ? (
            <Text style={styles.lbMedal}>{medal}</Text>
          ) : (
            <Text style={[styles.lbRankNum, { color: colors.muted }]}>#{index + 1}</Text>
          )}
        </View>
        <View style={styles.lbInfo}>
          <Text style={[styles.lbName, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.lbMeta, { color: colors.muted }]}>
            {item.challengesCompleted} challenge{item.challengesCompleted !== 1 ? "s" : ""}
            {item.bestTimeSeconds !== null ? ` · Best: ${item.bestTimeSeconds}s` : ""}
          </Text>
        </View>
        <View style={styles.lbStats}>
          <Text style={[styles.lbCorrect, { color: colors.success }]}>{item.challengesCorrect}</Text>
          <Text style={[styles.lbAccuracy, { color: colors.muted }]}>{accuracy}%</Text>
        </View>
      </View>
    );
  };

  const tabs: { key: Tab; label: string }[] = myClassroom
    ? [
        { key: "feed", label: "📋 Feed" },
        { key: "leaderboard", label: "🏆 Ranks" },
        { key: "analytics", label: "📊 Stats" },
        { key: "manage", label: "⚙️ Manage" },
      ]
    : [
        { key: "feed", label: "📋 Feed" },
        { key: "leaderboard", label: "🏆 Ranks" },
        { key: "manage", label: "⚙️ Manage" },
      ];

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Classroom</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {activeClassroom ? activeClassroom.name : "Share problems with your class"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {activeClassroom && (
            <View style={[styles.codePill, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
              <Text style={[styles.codePillText, { color: colors.primary }]}>{activeClassroom.code}</Text>
            </View>
          )}
          <TouchableOpacity
            accessibilityLabel="View global rankings"
            onPress={() => router.push("/(tabs)/leaderboard" as any)}
            style={[styles.rankingsBtn, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}35` }]}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 14 }}>🏆</Text>
            <Text style={[styles.rankingsBtnText, { color: colors.warning }]}>Rankings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* No classroom */}
      {!activeClassroom && !showCreate && !showJoin && (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏫</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Classroom Yet</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Create a classroom to share problems with your students, or join one with a code from your teacher.
          </Text>
          <TouchableOpacity
            accessibilityLabel="Toggle show create"
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.85}
          >
            <IconSymbol size={18} name="plus" color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Create Classroom</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Toggle show join"
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setShowJoin(true)}
            activeOpacity={0.85}
          >
            <IconSymbol size={18} name="person.2.fill" color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Join with Code</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Create form */}
      {showCreate && (
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>Create Classroom</Text>
          <Text style={[styles.formLabel, { color: colors.muted }]}>Classroom Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            placeholder="e.g. Mr. Smith's Algebra Class"
            placeholderTextColor={colors.muted}
            value={classroomName}
            onChangeText={setClassroomName}
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={handleCreateClassroom}
          />
          <TouchableOpacity
            accessibilityLabel="Create"
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: creating || !classroomName.trim() ? 0.6 : 1 }]}
            onPress={handleCreateClassroom}
            disabled={creating || !classroomName.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{creating ? "Creating…" : "Create Classroom"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Toggle show create"
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setShowCreate(false)}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Join form */}
      {showJoin && (
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>Join Classroom</Text>
          <Text style={[styles.formLabel, { color: colors.muted }]}>Enter Class Code</Text>
          <TextInput
            style={[styles.codeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            placeholder="XXXXXX"
            placeholderTextColor={colors.muted}
            value={joinCode}
            onChangeText={(t) => setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            maxLength={6}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleJoinClassroom}
          />
          <TouchableOpacity
            accessibilityLabel="Join"
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: joining || joinCode.length < 4 ? 0.6 : 1 }]}
            onPress={handleJoinClassroom}
            disabled={joining || joinCode.length < 4}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{joining ? "Joining…" : "Join Classroom"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Toggle show join"
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setShowJoin(false)}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Active classroom */}
      {activeClassroom && !showCreate && !showJoin && (
        <>
          {/* Tab bar — static, evenly distributed pills */}
          <View style={[styles.tabsContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <View style={styles.tabsRow}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    accessibilityLabel={`${tab.label} tab`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    key={tab.key}
                    style={[
                      styles.tabPill,
                      isActive
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.tabPillLabel,
                        { color: isActive ? "#FFFFFF" : colors.muted },
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Feed tab */}
          {activeTab === "feed" && (
            <FlatList
              data={filteredFeed}
              keyExtractor={(item) => item.id}
              renderItem={renderProblemCard}
              contentContainerStyle={styles.feedList}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <>
                  {/* Search bar + sort button row */}
                  <View style={styles.searchSortRow}>
                    <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
                      <IconSymbol size={16} name="magnifyingglass" color={colors.muted} />
                      <TextInput
                        style={[styles.searchInput, { color: colors.foreground }]}
                        value={feedQuery}
                        onChangeText={setFeedQuery}
                        placeholder="Search problems…"
                        placeholderTextColor={colors.muted}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                      />
                      {feedQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setFeedQuery("")} accessibilityLabel="Clear search">
                          <IconSymbol size={16} name="xmark.circle.fill" color={colors.muted} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity
                      accessibilityLabel="Sort feed"
                      style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: feedSort !== "newest" ? colors.primary : colors.border }]}
                      onPress={() => setShowSortMenu(true)}
                      activeOpacity={0.75}
                    >
                      <IconSymbol size={16} name="arrow.left.and.right" color={feedSort !== "newest" ? colors.primary : colors.muted} />
                    </TouchableOpacity>
                  </View>

                  {/* Subject filter chips — evenly distributed, wrapping */}
                  {feedSubjects.length > 1 && (
                    <View style={styles.subjectChipsWrap}>
                      <TouchableOpacity
                        accessibilityLabel="All subjects"
                        style={[styles.subjectChip, {
                          backgroundColor: feedSubjectFilter === null ? colors.primary : colors.surface,
                          borderColor: feedSubjectFilter === null ? colors.primary : colors.border,
                        }]}
                        onPress={() => setFeedSubjectFilter(null)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.subjectChipText, { color: feedSubjectFilter === null ? "#FFFFFF" : colors.muted }]}>All</Text>
                      </TouchableOpacity>
                      {feedSubjects.map((subj) => {
                        const subjectColor = getSubjectColor(subj as any);
                        const emoji = getSubjectEmoji(subj as any);
                        const active = feedSubjectFilter === subj;
                        return (
                          <TouchableOpacity
                            key={subj}
                            accessibilityLabel={`Filter by ${subj}`}
                            style={[styles.subjectChip, {
                              backgroundColor: active ? subjectColor : colors.surface,
                              borderColor: active ? subjectColor : colors.border,
                            }]}
                            onPress={() => setFeedSubjectFilter(active ? null : subj)}
                            activeOpacity={0.75}
                          >
                            <Text style={styles.subjectChipEmoji}>{emoji}</Text>
                            <Text style={[styles.subjectChipText, { color: active ? "#FFFFFF" : colors.muted }]}>
                              {getSubjectLabel(subj as any)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Homework summary banner */}
                  {homeworkItems.length > 0 && (
                    <View style={[styles.hwBanner, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}30` }]}>
                      <IconSymbol size={14} name="calendar" color={colors.warning} />
                      <Text style={[styles.hwBannerText, { color: colors.warning }]}>
                        {homeworkItems.filter((p) => !completedHomework.has(p.id)).length} of {homeworkItems.length} homework assignment{homeworkItems.length !== 1 ? "s" : ""} remaining
                      </Text>
                    </View>
                  )}
                </>
              }
              ListEmptyComponent={
                <View style={styles.feedEmpty}>
                  <Text style={styles.feedEmptyIcon}>{feedQuery ? "🔍" : "📭"}</Text>
                  <Text style={[styles.feedEmptyTitle, { color: colors.foreground }]}>
                    {feedQuery ? "No results found" : "No problems shared yet"}
                  </Text>
                  <Text style={[styles.feedEmptyText, { color: colors.muted }]}>
                    {feedQuery
                      ? `No problems match "${feedQuery}". Try a different keyword.`
                      : myClassroom
                      ? "Share a problem from the Solution screen to populate the feed."
                      : "Your teacher hasn't shared any problems yet."}
                  </Text>
                  {feedQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setFeedQuery("")}
                      style={[styles.clearSearchBtn, { borderColor: colors.border }]}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.clearSearchBtnText, { color: colors.primary }]}>Clear Search</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          )}

          {/* Leaderboard tab */}
          {activeTab === "leaderboard" && (
            <FlatList
              data={leaderboard}
              keyExtractor={(item) => item.name}
              renderItem={renderLeaderboardEntry}
              contentContainerStyle={styles.lbList}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={[styles.lbHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={styles.lbTrophyIcon}>🏆</Text>
                  <Text style={[styles.lbHeaderTitle, { color: colors.foreground }]}>Class Leaderboard</Text>
                  <Text style={[styles.lbHeaderSub, { color: colors.muted }]}>
                    Ranked by correct answers · Ties broken by fastest time
                  </Text>
                  <View style={styles.lbColHeaders}>
                    <Text style={[styles.lbColLabel, { color: colors.muted, flex: 1 }]}>Player</Text>
                    <Text style={[styles.lbColLabel, { color: colors.muted }]}>✓ Correct</Text>
                  </View>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.feedEmpty}>
                  <Text style={styles.feedEmptyIcon}>🎯</Text>
                  <Text style={[styles.feedEmptyTitle, { color: colors.foreground }]}>No challenges yet</Text>
                  <Text style={[styles.feedEmptyText, { color: colors.muted }]}>
                    Complete challenges from the Feed to appear on the leaderboard.
                  </Text>
                </View>
              }
            />
          )}

          {/* Analytics tab (teacher only) */}
          {activeTab === "analytics" && myClassroom && (
            <ScrollView contentContainerStyle={styles.analyticsContainer}>
              <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{feed.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Problems Shared</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{subjectBreakdown.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Subjects Covered</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.warning }]}>{homeworkItems.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Active HW</Text>
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Subject Breakdown</Text>
              {subjectBreakdown.length === 0 ? (
                <View style={[styles.emptyAnalytics, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.emptyAnalyticsText, { color: colors.muted }]}>
                    Share some problems to see analytics
                  </Text>
                </View>
              ) : (
                subjectBreakdown.map(({ subject, count }) => {
                  const color = getSubjectColor(subject);
                  const label = getSubjectLabel(subject);
                  const emoji = getSubjectEmoji(subject);
                  const pct = feed.length > 0 ? (count / feed.length) * 100 : 0;
                  return (
                    <View key={subject} style={[styles.analyticsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.analyticsLeft}>
                        <Text style={styles.analyticsEmoji}>{emoji}</Text>
                        <View style={styles.analyticsInfo}>
                          <Text style={[styles.analyticsLabel, { color: colors.foreground }]}>{label}</Text>
                          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                            <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                          </View>
                        </View>
                      </View>
                      <View style={[styles.countBadge, { backgroundColor: `${color}20` }]}>
                        <Text style={[styles.countBadgeText, { color }]}>{count}</Text>
                      </View>
                    </View>
                  );
                })
              )}

              {feed.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
                  {feed.slice(0, 5).map((item) => (
                    <View key={item.id} style={[styles.activityRow, { borderBottomColor: colors.border }]}>
                      <Text style={styles.activityEmoji}>{getSubjectEmoji(item.subject)}</Text>
                      <View style={styles.activityInfo}>
                        <Text style={[styles.activityProblem, { color: colors.foreground }]} numberOfLines={1}>
                          {item.problem}
                        </Text>
                        <Text style={[styles.activityMeta, { color: colors.muted }]}>
                          {getSubjectLabel(item.subject)} · {new Date(item.sharedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          {item.isHomework ? " · 📚 HW" : ""}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}

          {/* Manage tab */}
          {activeTab === "manage" && (
            <ScrollView contentContainerStyle={styles.manageContainer}>
              {/* Code card */}
              <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.codeCardLabel, { color: colors.muted }]}>
                  {myClassroom ? "Your Class Code" : "Joined Class Code"}
                </Text>
                <Text style={[styles.codeDisplay, { color: colors.primary }]}>
                  {activeClassroom.code}
                </Text>
                <Text style={[styles.codeCardSub, { color: colors.muted }]}>
                  {myClassroom
                    ? "Share this code with students so they can join"
                    : `Joined: ${new Date(activeClassroom.createdAt).toLocaleDateString()}`}
                </Text>
                {myClassroom && (
                  <View style={styles.codeActions}>
                    <TouchableOpacity
                      accessibilityLabel="Copy"
                      style={[styles.codeActionBtn, { backgroundColor: copiedCode ? colors.success + "18" : colors.primary + "15", borderColor: copiedCode ? colors.success : colors.primary }]}
                      onPress={() => handleCopyCode(activeClassroom.code)}
                      activeOpacity={0.75}
                    >
                      <IconSymbol size={15} name={copiedCode ? "checkmark.circle.fill" : "doc.on.doc.fill"} color={copiedCode ? colors.success : colors.primary} />
                      <Text style={[styles.codeActionText, { color: copiedCode ? colors.success : colors.primary }]}>
                        {copiedCode ? "Copied!" : "Copy Code"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityLabel="Share"
                      style={[styles.codeActionBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}
                      onPress={() => handleShareCode(activeClassroom.code, activeClassroom.name)}
                      activeOpacity={0.75}
                    >
                      <IconSymbol size={15} name="paperplane.fill" color={colors.primary} />
                      <Text style={[styles.codeActionText, { color: colors.primary }]}>Share Invite</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Notification preferences */}
              <View style={[styles.notifCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.notifCardTitle, { color: colors.foreground }]}>🔔 Notifications</Text>
                {[
                  { key: "enabled" as const, label: "Classroom Notifications", sub: "Master toggle for all classroom alerts" },
                  { key: "newProblem" as const, label: "New Problem Shared", sub: "When a problem is added to the feed" },
                  { key: "newHomework" as const, label: "New Homework Assigned", sub: "When a problem is assigned as homework" },
                ].map(({ key, label, sub }) => (
                  <TouchableOpacity
                    accessibilityLabel="Toggle"
                    key={key}
                    style={[styles.notifRow, { borderTopColor: colors.border }]}
                    onPress={() => handleToggleNotifPref(key)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.notifRowInfo}>
                      <Text style={[styles.notifRowLabel, { color: colors.foreground }]}>{label}</Text>
                      <Text style={[styles.notifRowSub, { color: colors.muted }]}>{sub}</Text>
                    </View>
                    <View style={[
                      styles.toggle,
                      { backgroundColor: notifPrefs[key] ? colors.primary : colors.border }
                    ]}>
                      <View style={[
                        styles.toggleThumb,
                        { transform: [{ translateX: notifPrefs[key] ? 18 : 2 }] }
                      ]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Display name (student only) */}
              {joinedClassroom && (
                <View style={[styles.notifCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.notifCardTitle, { color: colors.foreground }]}>👤 Your Display Name</Text>
                  <TouchableOpacity
                    accessibilityLabel="Edit"
                    style={[styles.notifRow, { borderTopColor: colors.border }]}
                    onPress={handleEditDisplayName}
                    activeOpacity={0.75}
                  >
                    <View style={styles.notifRowInfo}>
                      <Text style={[styles.notifRowLabel, { color: colors.foreground }]}>
                        {displayName || "Set your name"}
                      </Text>
                      <Text style={[styles.notifRowSub, { color: colors.muted }]}>
                        Shown on the classroom leaderboard
                      </Text>
                    </View>
                    <IconSymbol size={16} name="chevron.right" color={colors.muted} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Reset leaderboard (teacher only) */}
              {myClassroom && (
                <View style={[styles.notifCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.notifCardTitle, { color: colors.foreground }]}>🏆 Leaderboard</Text>
                  <TouchableOpacity
                    accessibilityLabel="Reset"
                    style={[styles.notifRow, { borderTopColor: colors.border }]}
                    onPress={handleResetLeaderboard}
                    activeOpacity={0.75}
                  >
                    <View style={styles.notifRowInfo}>
                      <Text style={[styles.notifRowLabel, { color: colors.error }]}>Reset Leaderboard</Text>
                      <Text style={[styles.notifRowSub, { color: colors.muted }]}>
                        Clear all scores and rankings for a new term
                      </Text>
                    </View>
                    <IconSymbol size={16} name="trash.fill" color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}

              {/* How to share */}
              <View style={[styles.howToCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.howToTitle, { color: colors.foreground }]}>How to Share Problems</Text>
                <Text style={[styles.howToStep, { color: colors.muted }]}>1. Solve any problem using TutorSnap</Text>
                <Text style={[styles.howToStep, { color: colors.muted }]}>2. On the Solution screen, tap the share icon</Text>
                <Text style={[styles.howToStep, { color: colors.muted }]}>3. Choose "Share to Classroom" from the menu</Text>
                <Text style={[styles.howToStep, { color: colors.muted }]}>4. The problem appears in the class feed instantly</Text>
              </View>

              {/* Danger zone */}
              <View style={[styles.dangerCard, { borderColor: colors.error + "40" }]}>
                <TouchableOpacity
                  accessibilityLabel="Delete"
                  style={[styles.dangerBtn, { borderColor: colors.error + "40" }]}
                  onPress={myClassroom ? handleDeleteClassroom : handleLeaveClassroom}
                  activeOpacity={0.75}
                >
                  <IconSymbol size={16} name="trash.fill" color={colors.error} />
                  <Text style={[styles.dangerBtnText, { color: colors.error }]}>
                    {myClassroom ? "Delete Classroom" : "Leave Classroom"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </>
      )}

      {/* Homework Assignment Modal */}
      <Modal
        visible={!!homeworkModalItem}
        transparent
        animationType="slide"
        onRequestClose={() => setHomeworkModalItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Assign as Homework</Text>
            {homeworkModalItem && (
              <Text style={[styles.modalProblemPreview, { color: colors.muted }]} numberOfLines={2}>
                {homeworkModalItem.problem}
              </Text>
            )}

            <Text style={[styles.modalLabel, { color: colors.foreground }]}>Homework Title (optional)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={homeworkTitle}
              onChangeText={setHomeworkTitle}
              placeholder="e.g. Chapter 3 Practice"
              placeholderTextColor={colors.muted}
              maxLength={60}
              returnKeyType="done"
            />

            <Text style={[styles.modalLabel, { color: colors.foreground }]}>Due Date</Text>
            <View style={styles.dateOptionsRow}>
              {dateOptions.map((opt) => (
                <TouchableOpacity
                  accessibilityLabel="Toggle selected due date"
                  key={opt.iso}
                  style={[
                    styles.dateOptionBtn,
                    {
                      backgroundColor: selectedDueDate === opt.iso ? colors.primary : colors.surface,
                      borderColor: selectedDueDate === opt.iso ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedDueDate(opt.iso)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dateOptionText, { color: selectedDueDate === opt.iso ? "#FFFFFF" : colors.foreground }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityLabel="Toggle homework modal item"
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setHomeworkModalItem(null)}
                activeOpacity={0.75}
              >
                <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalAssignBtn, { backgroundColor: colors.primary }]}
                onPress={handleAssignHomework}
                activeOpacity={0.85}
              >
                <IconSymbol size={16} name="calendar" color="#FFFFFF" />
                <Text style={styles.modalAssignText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Problem comment sheet */}
      {commentProblem && (
        <ProblemCommentSheet
          visible={!!commentProblem}
          onClose={() => {
            // Refresh count for this problem after sheet closes
            if (commentProblem) {
              getCommentCount(commentProblem.id).then((count) =>
                setCommentCounts((prev) => ({ ...prev, [commentProblem.id]: count }))
              );
            }
            setCommentProblem(null);
          }}
          problemId={commentProblem.id}
          problemText={commentProblem.problem}
          displayName={displayName || "Student"}
        />
      )}

      {/* Sort menu modal */}
      <Modal
        visible={showSortMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortMenu(false)}
      >
        <TouchableOpacity
          style={styles.sortMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowSortMenu(false)}
        >
          <View style={[styles.sortMenuSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.sortMenuTitle, { color: colors.foreground }]}>Sort Feed</Text>
            {([
              { key: "newest", label: "Newest first" },
              { key: "oldest", label: "Oldest first" },
              { key: "homework_first", label: "Homework first" },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortOption, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setFeedSort(opt.key);
                  setShowSortMenu(false);
                  H.impactLight()
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.sortOptionText, { color: colors.foreground }]}>{opt.label}</Text>
                {feedSort === opt.key && (
                  <IconSymbol size={18} name="checkmark.circle.fill" color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit display-name modal (cross-platform, replaces Alert.prompt) */}
      <Modal
        visible={showEditNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Your Display Name</Text>
            <Text style={[styles.modalLabel, { color: colors.muted }]}>
              This name appears on the classroom leaderboard.
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={editNameValue}
              onChangeText={setEditNameValue}
              placeholder="Your display name"
              placeholderTextColor={colors.muted}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleSaveDisplayName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityLabel="Cancel edit name"
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowEditNameModal(false)}
                activeOpacity={0.75}
              >
                <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Save display name"
                style={[styles.modalAssignBtn, { backgroundColor: colors.primary, opacity: !editNameValue.trim() ? 0.5 : 1 }]}
                onPress={handleSaveDisplayName}
                disabled={!editNameValue.trim()}
                activeOpacity={0.85}
              >
                <IconSymbol size={16} name="checkmark.circle.fill" color="#FFFFFF" />
                <Text style={styles.modalAssignText}>Save Name</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Display Name Prompt Modal (shown before joining) */}
      <Modal
        visible={showNamePrompt}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNamePrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Join Classroom</Text>
            <Text style={[styles.modalLabel, { color: colors.muted }]}>
              Enter your display name and the classroom name (optional).
            </Text>
            <Text style={[styles.modalLabel, { color: colors.foreground, fontWeight: "700", marginTop: 8 }]}>Your Display Name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Alex Smith"
              placeholderTextColor={colors.muted}
              maxLength={30}
              returnKeyType="next"
              autoFocus
            />
            <Text style={[styles.modalLabel, { color: colors.foreground, fontWeight: "700", marginTop: 8 }]}>Classroom Name (optional)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={classroomNameInput}
              onChangeText={setClassroomNameInput}
              placeholder="e.g. Mr. Smith's Algebra Class"
              placeholderTextColor={colors.muted}
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={handleConfirmJoin}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                accessibilityLabel="Toggle show name prompt"
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => { setShowNamePrompt(false); setPendingJoinCode(""); setClassroomNameInput(""); }}
                activeOpacity={0.75}
              >
                <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Confirm"
                style={[styles.modalAssignBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmJoin}
                activeOpacity={0.85}
                disabled={joining}
              >
                <IconSymbol size={16} name="checkmark.circle.fill" color="#FFFFFF" />
                <Text style={styles.modalAssignText}>{joining ? "Joining..." : "Join Classroom"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 1 },
  codePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  codePillText: { fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  tabsContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 8,
    alignItems: "center",
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  tabPillLabel: { fontSize: 14, fontWeight: "800", textAlign: "center" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyIcon: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 8 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: "100%",
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    width: "100%",
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
  formContainer: { padding: 24, gap: 12 },
  formTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  formLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 8,
  },
  codeInput: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 8,
    textAlign: "center",
    marginBottom: 8,
  },
  feedList: { padding: 16, gap: 12, paddingBottom: 32 },
  hwBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  hwBannerText: { fontSize: 12, fontWeight: "600" },
  feedEmpty: { alignItems: "center", paddingTop: 60, gap: 10 },
  feedEmptyIcon: { fontSize: 48 },
  feedEmptyTitle: { fontSize: 17, fontWeight: "700" },
  feedEmptyText: { fontSize: 13, textAlign: "center", lineHeight: 19, maxWidth: 260 },
  problemCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  problemAccent: { width: 4 },
  problemContent: { flex: 1, padding: 14, gap: 6 },
  problemTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  problemTopLeft: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 4, alignItems: "center" },
  problemTopRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  subjectBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  subjectEmoji: { fontSize: 12 },
  subjectBadgeText: { fontSize: 11, fontWeight: "700" },
  hwBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  hwBadgeText: { fontSize: 10, fontWeight: "700" },
  dateText: { fontSize: 11 },
  removeBtn: { padding: 2 },
  problemText: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  problemFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sharedBy: { fontSize: 11 },
  problemActions: { flexDirection: "row", gap: 6, alignItems: "center" },
  hwBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  hwBtnText: { fontSize: 10, fontWeight: "700" },
  challengeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  challengeBtnText: { fontSize: 11, fontWeight: "700" },
  // Leaderboard
  lbList: { padding: 16, gap: 10, paddingBottom: 32 },
  lbHeader: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  lbTrophyIcon: { fontSize: 36, marginBottom: 4 },
  lbHeaderTitle: { fontSize: 18, fontWeight: "800" },
  lbHeaderSub: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  lbColHeaders: { flexDirection: "row", width: "100%", marginTop: 8, paddingHorizontal: 4 },
  lbColLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  lbRank: { width: 32, alignItems: "center" },
  lbMedal: { fontSize: 22 },
  lbRankNum: { fontSize: 15, fontWeight: "800" },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 15, fontWeight: "700" },
  lbMeta: { fontSize: 11, marginTop: 2 },
  lbStats: { alignItems: "flex-end", gap: 2 },
  lbCorrect: { fontSize: 18, fontWeight: "800" },
  lbAccuracy: { fontSize: 11 },
  // Analytics
  analyticsContainer: { padding: 16, gap: 14, paddingBottom: 40 },
  statsRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },
  statDivider: { width: 1, height: 32, marginHorizontal: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  emptyAnalytics: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: "center" },
  emptyAnalyticsText: { fontSize: 13 },
  analyticsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  analyticsLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  analyticsEmoji: { fontSize: 22 },
  analyticsInfo: { flex: 1, gap: 6 },
  analyticsLabel: { fontSize: 13, fontWeight: "600" },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  countBadgeText: { fontSize: 13, fontWeight: "800" },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityEmoji: { fontSize: 20 },
  activityInfo: { flex: 1 },
  activityProblem: { fontSize: 13, fontWeight: "600" },
  activityMeta: { fontSize: 11, marginTop: 2 },
  // Manage
  manageContainer: { padding: 16, gap: 14, paddingBottom: 40 },
  codeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  codeCardLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  codeDisplay: { fontSize: 36, fontWeight: "900", letterSpacing: 6, marginVertical: 4 },
  codeCardSub: { fontSize: 12, textAlign: "center" },
  codeActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  codeActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  codeActionText: { fontSize: 13, fontWeight: "700" },
  // Notification prefs
  notifCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 0 },
  notifCardTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  notifRowInfo: { flex: 1 },
  notifRowLabel: { fontSize: 13, fontWeight: "600" },
  notifRowSub: { fontSize: 11, marginTop: 1 },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  howToCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  howToTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  howToStep: { fontSize: 13, lineHeight: 19 },
  dangerCard: { borderRadius: 14, borderWidth: 1, padding: 4 },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 10,
    justifyContent: "center",
  },
  dangerBtnText: { fontSize: 14, fontWeight: "700" },
  // Homework modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 80,
    gap: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalProblemPreview: { fontSize: 13, lineHeight: 19 },
  modalLabel: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  dateOptionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dateOptionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  dateOptionText: { fontSize: 13, fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 14, fontWeight: "600" },
  modalAssignBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  modalAssignText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  // Feed search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  clearSearchBtnText: { fontSize: 14, fontWeight: "600" },
  // Homework completion
  circle: {},
  // Feed sort + subject filter
  searchSortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sortBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    gap: 8,
    marginBottom: 8,
  },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  subjectChipEmoji: {
    fontSize: 14,
  },
  subjectChipText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  // Sort menu modal
  sortMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sortMenuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 80,
  },
  sortMenuTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  sortOptionText: {
    fontSize: 15,
  },
  expandHint: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    letterSpacing: 0.2,
  },
  rankingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  rankingsBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
