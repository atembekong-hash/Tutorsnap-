/**
 * Classroom Screen
 *
 * Teachers: create a classroom → get a 6-char code → share with students
 * Students: enter a code → join → see shared problems in the feed
 * Both: can share problems from the Solution screen to the classroom feed
 */
import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
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
  type ClassroomInfo,
  type ClassroomProblem,
} from "@/lib/classroom";
import { getSubjectColor, getSubjectLabel, getSubjectEmoji } from "@/lib/subjects";
import * as Clipboard from "expo-clipboard";

type Tab = "feed" | "manage";

export default function ClassroomScreen() {
  const colors = useColors();
  const router = useRouter();

  const [myClassroom, setMyClassroom] = useState<ClassroomInfo | null>(null);
  const [joinedClassroom, setJoinedClassroom] = useState<ClassroomInfo | null>(null);
  const [feed, setFeed] = useState<ClassroomProblem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [loading, setLoading] = useState(true);

  // Create classroom form
  const [showCreate, setShowCreate] = useState(false);
  const [classroomName, setClassroomName] = useState("");
  const [creating, setCreating] = useState(false);

  // Join classroom form
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [copiedCode, setCopiedCode] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [mine, joined] = await Promise.all([getMyClassroom(), getJoinedClassroom()]);
    setMyClassroom(mine);
    setJoinedClassroom(joined);
    const activeClassroom = mine || joined;
    if (activeClassroom) {
      const f = await getClassroomFeed(activeClassroom.code);
      setFeed(f);
    } else {
      setFeed([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const activeClassroom = myClassroom || joinedClassroom;

  const handleCreateClassroom = async () => {
    if (!classroomName.trim()) return;
    setCreating(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    setJoining(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const info = await joinClassroom(code);
    setJoinedClassroom(info);
    setShowJoin(false);
    setJoinCode("");
    setJoining(false);
    setActiveTab("feed");
    await loadData();
  };

  const handleDeleteClassroom = () => {
    Alert.alert(
      "Delete Classroom",
      "This will remove your classroom and all shared problems. Students will no longer be able to access the feed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteMyClassroom();
            setMyClassroom(null);
            setFeed([]);
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
          },
        },
      ]
    );
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareCode = async (code: string, name: string) => {
    try {
      await Share.share({
        message: `Join my TutorSnap classroom "${name}"!\n\nUse code: ${code}\n\nDownload TutorSnap at tutorsnapai.tech`,
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

  const renderProblemCard = ({ item }: { item: ClassroomProblem }) => {
    const subjectColor = getSubjectColor(item.subject);
    const subjectLabel = getSubjectLabel(item.subject);
    const subjectEmoji = getSubjectEmoji(item.subject);
    const date = new Date(item.sharedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

    return (
      <TouchableOpacity
        style={[styles.problemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() =>
          router.push({
            pathname: "/solution",
            params: {
              problem: item.problem,
              subject: item.subject,
              answer: item.answer,
              steps: JSON.stringify(item.steps),
            },
          } as any)
        }
        activeOpacity={0.75}
      >
        <View style={[styles.problemAccent, { backgroundColor: subjectColor }]} />
        <View style={styles.problemContent}>
          <View style={styles.problemTop}>
            <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}20` }]}>
              <Text style={styles.subjectEmoji}>{subjectEmoji}</Text>
              <Text style={[styles.subjectBadgeText, { color: subjectColor }]}>{subjectLabel}</Text>
            </View>
            <View style={styles.problemTopRight}>
              <Text style={[styles.dateText, { color: colors.muted }]}>{date}</Text>
              {myClassroom && (
                <TouchableOpacity onPress={() => handleRemoveProblem(item.id)} style={styles.removeBtn}>
                  <IconSymbol size={14} name="xmark.circle.fill" color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={[styles.problemText, { color: colors.foreground }]} numberOfLines={2}>
            {item.problem}
          </Text>
          <View style={styles.problemFooter}>
            <Text style={[styles.sharedBy, { color: colors.muted }]}>
              Shared by {item.sharedBy}
            </Text>
            <Text style={[styles.stepsCount, { color: colors.muted }]}>
              {item.steps?.length || 0} steps
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={24} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Classroom</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {activeClassroom ? activeClassroom.name : "Share problems with your class"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* No classroom yet */}
      {!activeClassroom && !showCreate && !showJoin && (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏫</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Classroom Yet</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Create a classroom to share problems with your students, or join one with a code from your teacher.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.85}
          >
            <IconSymbol size={18} name="plus" color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Create Classroom</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setShowJoin(true)}
            activeOpacity={0.85}
          >
            <IconSymbol size={18} name="person.2.fill" color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Join with Code</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Create classroom form */}
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
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: creating || !classroomName.trim() ? 0.6 : 1 }]}
            onPress={handleCreateClassroom}
            disabled={creating || !classroomName.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{creating ? "Creating…" : "Create Classroom"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setShowCreate(false)}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Join classroom form */}
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
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: joining || joinCode.length < 4 ? 0.6 : 1 }]}
            onPress={handleJoinClassroom}
            disabled={joining || joinCode.length < 4}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{joining ? "Joining…" : "Join Classroom"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
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
          {/* Tabs */}
          <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
            {(["feed", "manage"] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, { color: activeTab === tab ? colors.primary : colors.muted }]}>
                  {tab === "feed" ? "📋 Problem Feed" : "⚙️ Manage"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === "feed" && (
            <FlatList
              data={feed}
              keyExtractor={(item) => item.id}
              renderItem={renderProblemCard}
              contentContainerStyle={styles.feedList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.feedEmpty}>
                  <Text style={styles.feedEmptyIcon}>📭</Text>
                  <Text style={[styles.feedEmptyTitle, { color: colors.foreground }]}>No problems shared yet</Text>
                  <Text style={[styles.feedEmptyText, { color: colors.muted }]}>
                    {myClassroom
                      ? "Share a problem from the Solution screen to populate the feed."
                      : "Your teacher hasn't shared any problems yet."}
                  </Text>
                </View>
              }
            />
          )}

          {activeTab === "manage" && (
            <ScrollView contentContainerStyle={styles.manageContainer}>
              {/* Class code card */}
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

              {/* Stats */}
              <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{feed.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Problems Shared</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {myClassroom ? "Teacher" : "Student"}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Your Role</Text>
                </View>
              </View>

              {/* How to share */}
              <View style={[styles.howToCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.howToTitle, { color: colors.foreground }]}>How to Share Problems</Text>
                <Text style={[styles.howToStep, { color: colors.muted }]}>
                  1. Solve any problem using TutorSnap
                </Text>
                <Text style={[styles.howToStep, { color: colors.muted }]}>
                  2. On the Solution screen, tap the share icon
                </Text>
                <Text style={[styles.howToStep, { color: colors.muted }]}>
                  3. Choose "Share to Classroom" from the menu
                </Text>
                <Text style={[styles.howToStep, { color: colors.muted }]}>
                  4. The problem appears in the class feed instantly
                </Text>
              </View>

              {/* Danger zone */}
              <View style={[styles.dangerCard, { borderColor: colors.error + "40" }]}>
                <TouchableOpacity
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
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 1 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 13, fontWeight: "600" },
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
  feedEmpty: { alignItems: "center", paddingTop: 60, gap: 10 },
  feedEmptyIcon: { fontSize: 48 },
  feedEmptyTitle: { fontSize: 17, fontWeight: "700" },
  feedEmptyText: { fontSize: 13, textAlign: "center", lineHeight: 19, maxWidth: 260 },
  problemCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  problemAccent: { width: 4 },
  problemContent: { flex: 1, padding: 14, gap: 6 },
  problemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  problemTopRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  subjectBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  subjectEmoji: { fontSize: 12 },
  subjectBadgeText: { fontSize: 11, fontWeight: "700" },
  dateText: { fontSize: 11 },
  removeBtn: { padding: 2 },
  problemText: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  problemFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sharedBy: { fontSize: 11 },
  stepsCount: { fontSize: 11 },
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
  statsRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600" },
  statDivider: { width: 1, height: 36, marginHorizontal: 8 },
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
});
