import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const STORAGE_KEY = "@tutorsnap/notificationPrefs";

interface NotificationPrefs {
  dailyReminder: boolean;
  streakAlerts: boolean;
  badgeNotifications: boolean;
  studyReminders: boolean;
  weeklyReport: boolean;
  practiceNudge: boolean;
  achievementAlerts: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  dailyReminder: true,
  streakAlerts: true,
  badgeNotifications: true,
  studyReminders: true,
  weeklyReport: false,
  practiceNudge: false,
  achievementAlerts: true,
};

const NOTIFICATION_ITEMS: {
  key: keyof NotificationPrefs;
  icon: any;
  label: string;
  subtitle: string;
}[] = [
  {
    key: "dailyReminder",
    icon: "bell.fill",
    label: "Daily Reminder",
    subtitle: "Get a nudge to hit your daily study goal",
  },
  {
    key: "streakAlerts",
    icon: "flame.fill",
    label: "Streak Alerts",
    subtitle: "Be warned before your streak is at risk",
  },
  {
    key: "badgeNotifications",
    icon: "medal.fill",
    label: "Badge Unlocks",
    subtitle: "Celebrate when you earn a new achievement",
  },
  {
    key: "studyReminders",
    icon: "calendar",
    label: "Study Planner Reminders",
    subtitle: "Alerts for your scheduled study sessions",
  },
  {
    key: "weeklyReport",
    icon: "chart.bar.fill",
    label: "Weekly Progress Report",
    subtitle: "A summary of your week every Sunday",
  },
  {
    key: "practiceNudge",
    icon: "sparkles",
    label: "Practice Nudges",
    subtitle: "Suggestions to practice weak subjects",
  },
  {
    key: "achievementAlerts",
    icon: "crown.fill",
    label: "Achievement Milestones",
    subtitle: "Celebrate 10, 50, 100+ problems solved",
  },
];

export default function NotificationCenterScreen() {
  const colors = useColors();
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [permissionStatus, setPermissionStatus] = useState<string>("undetermined");

  useEffect(() => {
    loadPrefs();
    checkPermission();
    // Clear the app badge and the dashboard bell badge when the screen opens
    if (Platform.OS !== "web") {
      Notifications.setBadgeCountAsync(0).catch(() => {});
    }
  }, []);

  const loadPrefs = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<NotificationPrefs>;
        setPrefs({ ...DEFAULT_PREFS, ...saved });
      }
    } catch { /* ignore */ }
  };

  const checkPermission = async () => {
    if (Platform.OS === "web") {
      setPermissionStatus("web");
      return;
    }
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };

  const requestPermission = async () => {
    if (Platform.OS === "web") return;
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);
    if (status !== "granted") {
      Alert.alert(
        "Notifications Disabled",
        "To receive notifications, please enable them in your device Settings > TutorSnap.",
        [{ text: "OK" }]
      );
    }
  };

  const handleToggle = async (key: keyof NotificationPrefs, value: boolean) => {
    H.impactMedium()

    // If enabling any notification and permission not granted, request it
    if (value && permissionStatus !== "granted" && Platform.OS !== "web") {
      await requestPermission();
    }

    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleEnableAll = async () => {
    H.impactMedium()
    if (permissionStatus !== "granted" && Platform.OS !== "web") {
      await requestPermission();
    }
    const all: NotificationPrefs = {
      dailyReminder: true,
      streakAlerts: true,
      badgeNotifications: true,
      studyReminders: true,
      weeklyReport: true,
      practiceNudge: true,
      achievementAlerts: true,
    };
    setPrefs(all);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  };

  const handleDisableAll = async () => {
    H.impactMedium()
    const none: NotificationPrefs = {
      dailyReminder: false,
      streakAlerts: false,
      badgeNotifications: false,
      studyReminders: false,
      weeklyReport: false,
      practiceNudge: false,
      achievementAlerts: false,
    };
    setPrefs(none);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(none));
  };

  const enabledCount = Object.values(prefs).filter(Boolean).length;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Notification Center</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Permission Banner */}
        {permissionStatus !== "granted" && Platform.OS !== "web" && (
          <TouchableOpacity
            onPress={requestPermission}
            style={[styles.permissionBanner, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40` }]}
            activeOpacity={0.8}
          >
            <IconSymbol size={20} name="bell.badge.fill" color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.permissionTitle, { color: colors.foreground }]}>Enable Notifications</Text>
              <Text style={[styles.permissionDesc, { color: colors.muted }]}>
                Tap to grant permission so TutorSnap can send you reminders and alerts.
              </Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.muted} />
          </TouchableOpacity>
        )}

        {/* Status Summary */}
        <View style={[styles.summaryCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIconWrap, { backgroundColor: `${colors.primary}20` }]}>
              <IconSymbol size={22} name="bell.fill" color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
                {enabledCount} of {NOTIFICATION_ITEMS.length} notifications active
              </Text>
              <Text style={[styles.summaryDesc, { color: colors.muted }]}>
                Manage which alerts TutorSnap sends you
              </Text>
            </View>
          </View>
          <View style={styles.summaryActions}>
            <TouchableOpacity
              onPress={handleEnableAll}
              style={[styles.summaryBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.summaryBtnText, { color: "#FFFFFF" }]}>Enable All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDisableAll}
              style={[styles.summaryBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.summaryBtnText, { color: colors.foreground }]}>Disable All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Toggles */}
        <Text style={[styles.sectionHeader, { color: colors.muted }]}>NOTIFICATION TYPES</Text>
        {NOTIFICATION_ITEMS.map((item, idx) => (
          <View
            key={item.key}
            style={[
              styles.row,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                marginBottom: idx === NOTIFICATION_ITEMS.length - 1 ? 0 : 2,
              },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol size={18} name={item.icon} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.rowSubtitle, { color: colors.muted }]}>{item.subtitle}</Text>
            </View>
            <Switch
              value={prefs[item.key]}
              onValueChange={(val) => handleToggle(item.key, val)}
              trackColor={{ false: colors.border, true: `${colors.primary}60` }}
              thumbColor={prefs[item.key] ? colors.primary : colors.muted}
            />
          </View>
        ))}

        {/* Info note */}
        <View style={[styles.infoNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol size={16} name="info.circle" color={colors.muted} />
          <Text style={[styles.infoText, { color: colors.muted }]}>
            Daily Reminder timing is controlled in Settings → Notifications. Study Planner reminders are scheduled individually in the Study Planner screen.
          </Text>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "700" },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  permissionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  permissionDesc: { fontSize: 12, lineHeight: 17 },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  summaryDesc: { fontSize: 13 },
  summaryActions: { flexDirection: "row", gap: 10 },
  summaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  summaryBtnText: { fontSize: 14, fontWeight: "700" },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600" },
  rowSubtitle: { fontSize: 12, marginTop: 1 },
  infoNote: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
