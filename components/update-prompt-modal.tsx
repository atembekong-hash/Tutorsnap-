import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  BackHandler,
} from "react-native";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import type { UpdateInfo } from "@/lib/use-update-check";

interface Props {
  visible: boolean;
  updateInfo: UpdateInfo | null;
  forceUpdate: boolean;
  onDismiss: () => void;
}

export function UpdatePromptModal({ visible, updateInfo, forceUpdate, onDismiss }: Props) {
  const colors = useColors();

  if (!updateInfo) return null;

  const handleUpdate = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const url =
      Platform.OS === "ios"
        ? updateInfo.iosStoreUrl
        : updateInfo.androidStoreUrl;
    Linking.openURL(url);
  };

  const handleDismiss = () => {
    if (forceUpdate) return; // Cannot dismiss a forced update
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={forceUpdate ? undefined : handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={styles.iconEmoji}>🎉</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            {forceUpdate ? "Update Required" : "Update Available"}
          </Text>
          <Text style={[styles.versionBadge, { color: colors.primary }]}>
            Version {updateInfo.latestVersion}
          </Text>

          {/* Description */}
          <Text style={[styles.desc, { color: colors.muted }]}>
            {forceUpdate
              ? "A critical update is required to continue using TutorSnap. Please update now to get the latest features and security improvements."
              : "A new version of TutorSnap is available with improvements and bug fixes."}
          </Text>

          {/* Release Notes */}
          {updateInfo.releaseNotes.length > 0 && (
            <View style={[styles.notesBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.notesTitle, { color: colors.foreground }]}>
                What's new
              </Text>
              <ScrollView
                style={{ maxHeight: 140 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {updateInfo.releaseNotes.map((note, i) => (
                  <View key={i} style={styles.noteRow}>
                    <IconSymbol size={14} name="checkmark.circle.fill" color={colors.success} />
                    <Text style={[styles.noteText, { color: colors.muted }]}>{note}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Buttons */}
          <TouchableOpacity
            onPress={handleUpdate}
            style={[styles.updateBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <IconSymbol size={18} name="arrow.counterclockwise" color="#FFFFFF" />
            <Text style={styles.updateBtnText}>Update Now</Text>
          </TouchableOpacity>

          {!forceUpdate && (
            <TouchableOpacity
              onPress={handleDismiss}
              style={[styles.laterBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.laterBtnText, { color: colors.muted }]}>Maybe Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconEmoji: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 4, textAlign: "center" },
  versionBadge: { fontSize: 14, fontWeight: "700", marginBottom: 12 },
  desc: { fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 16 },
  notesBox: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  notesTitle: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19 },
  updateBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  updateBtnText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  laterBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  laterBtnText: { fontSize: 15, fontWeight: "600" },
});
