/**
 * TutorSnap — Streak Leaderboard Screen
 *
 * Shows a ranked list of the user + friends by streak.
 * Friends are added manually or via a shareable progress card.
 */
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getProgress } from "@/lib/progress";
import {
  loadFriends,
  addFriend,
  removeFriend,
  getMyInviteCode,
  buildShareText,
  rankEntries,
  AVATAR_OPTIONS,
  type FriendEntry,
} from "@/lib/leaderboard";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MY_NAME_KEY = "@tutorsnap/studentName";

export default function LeaderboardScreen() {
  const colors = useColors();
  const router = useRouter();

  const [myName, setMyName] = useState("You");
  const [myStreak, setMyStreak] = useState(0);
  const [myTotal, setMyTotal] = useState(0);
  const [inviteCode, setInviteCode] = useState("");
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Add friend form state
  const [friendName, setFriendName] = useState("");
  const [friendStreak, setFriendStreak] = useState("");
  const [friendTotal, setFriendTotal] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[1]);

  const load = useCallback(async () => {
    const [progress, storedName, code, storedFriends] = await Promise.all([
      getProgress(),
      AsyncStorage.getItem(MY_NAME_KEY),
      getMyInviteCode(),
      loadFriends(),
    ]);
    setMyStreak(progress.streak.currentStreak);
    setMyTotal(progress.streak.totalSolved);
    setMyName(storedName ?? "You");
    setInviteCode(code);
    setFriends(storedFriends);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const ranked = rankEntries(
    { name: myName, streak: myStreak, totalSolved: myTotal },
    friends
  );

  const myRank = ranked.find((r) => r.isMe)?.rank ?? 1;

  const handleShare = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const text = buildShareText(myName, myStreak, myTotal, inviteCode);
    if (await Sharing.isAvailableAsync()) {
      // Write to a temp file so we can share as text
      await Sharing.shareAsync("data:text/plain," + encodeURIComponent(text), {
        mimeType: "text/plain",
        dialogTitle: "Share your TutorSnap streak",
      }).catch(() => {
        // Fallback: copy to clipboard
        Clipboard.setStringAsync(text);
        Alert.alert("Copied!", "Your progress card has been copied to the clipboard.");
      });
    } else {
      await Clipboard.setStringAsync(text);
      Alert.alert("Copied!", "Your progress card has been copied to the clipboard.");
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = async () => {
    const name = friendName.trim();
    const streak = parseInt(friendStreak) || 0;
    const total = parseInt(friendTotal) || 0;
    if (!name) {
      Alert.alert("Name required", "Please enter your friend's name.");
      return;
    }
    await addFriend(name, streak, total, selectedAvatar);
    setShowAddModal(false);
    setFriendName("");
    setFriendStreak("");
    setFriendTotal("");
    setSelectedAvatar(AVATAR_OPTIONS[1]);
    void load();
  };

  const handleRemoveFriend = (id: string, name: string) => {
    Alert.alert("Remove Friend", `Remove ${name} from your leaderboard?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeFriend(id);
          void load();
        },
      },
    ]);
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={24} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Streak Leaderboard</Text>
        <TouchableOpacity
          accessibilityLabel="Toggle show add modal"
          onPress={() => setShowAddModal(true)}
          style={[styles.addBtn, { backgroundColor: `${colors.primary}15` }]}
          activeOpacity={0.7}
        >
          <IconSymbol size={18} name="plus" color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={ranked}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <View style={styles.topSection}>
            {/* My rank card */}
            <View style={[styles.myRankCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
              <View style={styles.myRankLeft}>
                <Text style={styles.myRankMedal}>{getRankMedal(myRank)}</Text>
                <View>
                  <Text style={[styles.myRankName, { color: colors.foreground }]}>
                    {myName} (You)
                  </Text>
                  <Text style={[styles.myRankSub, { color: colors.muted }]}>
                    🔥 {myStreak}-day streak · {myTotal} solved
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                accessibilityLabel="Share"
                onPress={handleShare}
                style={[styles.shareBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <IconSymbol size={16} name="square.and.arrow.up" color="#FFF" />
                <Text style={styles.shareBtnText}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Invite code */}
            <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.codeLeft}>
                <IconSymbol size={18} name="link" color={colors.primary} />
                <View>
                  <Text style={[styles.codeLabel, { color: colors.muted }]}>Your invite code</Text>
                  <Text style={[styles.codeValue, { color: colors.foreground }]}>{inviteCode}</Text>
                </View>
              </View>
              <TouchableOpacity
                accessibilityLabel="Copy"
                onPress={handleCopyCode}
                style={[styles.copyBtn, { backgroundColor: copied ? `${colors.success}20` : `${colors.primary}15` }]}
                activeOpacity={0.7}
              >
                <IconSymbol size={14} name={copied ? "checkmark.circle.fill" : "doc.on.doc"} color={copied ? colors.success : colors.primary} />
                <Text style={[styles.copyText, { color: copied ? colors.success : colors.primary }]}>
                  {copied ? "Copied!" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>

            {ranked.length > 1 && (
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>RANKINGS</Text>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => !item.isMe && handleRemoveFriend(item.id, item.name)}
            activeOpacity={item.isMe ? 1 : 0.7}
            style={[
              styles.rankRow,
              {
                backgroundColor: item.isMe ? `${colors.primary}10` : colors.surface,
                borderColor: item.isMe ? `${colors.primary}30` : colors.border,
              },
            ]}
          >
            <Text style={styles.rankMedal}>{getRankMedal(item.rank)}</Text>
            <Text style={styles.avatar}>{item.avatar}</Text>
            <View style={styles.rankInfo}>
              <Text style={[styles.rankName, { color: colors.foreground }]}>
                {item.name}{item.isMe ? " (You)" : ""}
              </Text>
              <Text style={[styles.rankSub, { color: colors.muted }]}>
                {item.totalSolved} problems solved
              </Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={[styles.streakNum, { color: colors.foreground }]}>{item.streak}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => null}
        ListFooterComponent={() =>
          ranked.length <= 1 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No friends yet</Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                Share your invite code with classmates, then tap + to add their streak.
              </Text>
              <TouchableOpacity
                accessibilityLabel="Toggle show add modal"
                onPress={() => setShowAddModal(true)}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyBtnText}>Add a Friend</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.longPressHint, { color: colors.muted }]}>
              Long-press a friend to remove them
            </Text>
          )
        }
      />

      {/* Add Friend Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}
              accessibilityLabel="Toggle show add modal">
              <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Friend</Text>
            <TouchableOpacity onPress={handleAddFriend}
              accessibilityLabel="Add">
              <Text style={[styles.modalDone, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>FRIEND'S NAME</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
              placeholder="e.g. Alex"
              placeholderTextColor={colors.muted}
              value={friendName}
              onChangeText={setFriendName}
              returnKeyType="next"
              autoFocus
            />

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>THEIR CURRENT STREAK</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
              placeholder="e.g. 12"
              placeholderTextColor={colors.muted}
              value={friendStreak}
              onChangeText={setFriendStreak}
              keyboardType="number-pad"
              returnKeyType="next"
            />

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>TOTAL PROBLEMS SOLVED</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
              placeholder="e.g. 45"
              placeholderTextColor={colors.muted}
              value={friendTotal}
              onChangeText={setFriendTotal}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={handleAddFriend}
            />

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>CHOOSE AVATAR</Text>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((emoji) => (
                <TouchableOpacity
                  accessibilityLabel="Toggle selected avatar"
                  key={emoji}
                  onPress={() => setSelectedAvatar(emoji)}
                  style={[
                    styles.avatarOption,
                    {
                      backgroundColor: selectedAvatar === emoji ? `${colors.primary}20` : colors.surface,
                      borderColor: selectedAvatar === emoji ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.avatarEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.tipBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }]}>
              <Text style={[styles.tipText, { color: colors.muted }]}>
                💡 Ask your friend to share their progress card from the leaderboard screen to get their exact streak and total.
              </Text>
            </View>
          </ScrollView>
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
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  addBtn: { padding: 8, borderRadius: 10 },
  list: { padding: 16, gap: 10 },
  topSection: { gap: 12, marginBottom: 4 },
  myRankCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  myRankLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  myRankMedal: { fontSize: 32 },
  myRankName: { fontSize: 16, fontWeight: "700" },
  myRankSub: { fontSize: 13, marginTop: 2 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  codeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  codeLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  codeLabel: { fontSize: 11, marginBottom: 2 },
  codeValue: { fontSize: 18, fontWeight: "800", letterSpacing: 2 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  copyText: { fontSize: 13, fontWeight: "600" },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 4 },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rankMedal: { fontSize: 22, width: 32, textAlign: "center" },
  avatar: { fontSize: 26 },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 15, fontWeight: "700" },
  rankSub: { fontSize: 12, marginTop: 2 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
  streakFire: { fontSize: 18 },
  streakNum: { fontSize: 18, fontWeight: "800" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 24 },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  longPressHint: { textAlign: "center", fontSize: 12, paddingVertical: 12 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 0.5,
  },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalDone: { fontSize: 16, fontWeight: "700" },
  modalBody: { padding: 20, gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginTop: 6,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  avatarOption: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 26 },
  tipBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipText: { fontSize: 13, lineHeight: 19 },
});
