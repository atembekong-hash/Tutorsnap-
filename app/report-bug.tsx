import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const BUG_CATEGORIES = [
  { id: "crash", label: "App Crash", emoji: "💥" },
  { id: "ui", label: "Display / UI Issue", emoji: "🖼️" },
  { id: "scan", label: "Camera / Scan", emoji: "📸" },
  { id: "solve", label: "Wrong Answer", emoji: "❌" },
  { id: "notification", label: "Notifications", emoji: "🔔" },
  { id: "performance", label: "Slow / Freezing", emoji: "🐌" },
  { id: "data", label: "Data / Sync", emoji: "💾" },
  { id: "other", label: "Other", emoji: "🐛" },
];

const SEVERITY_OPTIONS = [
  { id: "low", label: "Minor", desc: "Cosmetic issue, doesn't affect use", color: "#22C55E" },
  { id: "medium", label: "Moderate", desc: "Annoying but I can work around it", color: "#F59E0B" },
  { id: "high", label: "Severe", desc: "Core feature is broken", color: "#EF4444" },
  { id: "critical", label: "Critical", desc: "App crashes or data is lost", color: "#7C3AED" },
];

export default function ReportBugScreen() {
  const colors = useColors();
  const router = useRouter();
  const [category, setCategory] = useState("crash");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const version = Constants.expoConfig?.version ?? "1.1.0";
  const sdkVersion = Constants.expoConfig?.sdkVersion ?? "54";
  const deviceInfo = `Platform: ${Platform.OS}\nApp Version: ${version}\nExpo SDK: ${sdkVersion}`;

  const handleSubmit = async () => {
    if (description.trim().length < 15) {
      Alert.alert("More Detail Needed", "Please describe the bug in at least 15 characters.");
      return;
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const catLabel = BUG_CATEGORIES.find(c => c.id === category)?.label ?? category;
    const sevLabel = SEVERITY_OPTIONS.find(s => s.id === severity)?.label ?? severity;
    const subject = encodeURIComponent(`Bug Report — ${catLabel} [${sevLabel}] — TutorSnap v${version}`);
    const body = encodeURIComponent(
      `BUG REPORT\n${"─".repeat(40)}\nCategory: ${catLabel}\nSeverity: ${sevLabel}\n${deviceInfo}\n\nDescription:\n${description.trim()}\n\nSteps to Reproduce:\n${steps.trim() || "Not provided"}`
    );
    try {
      await Linking.openURL(`mailto:bugs@tutorsnapai.tech?subject=${subject}&body=${body}`);
    } catch { /* ignore */ }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <ScreenContainer>
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Report a Bug</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>🐛✅</Text>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Bug Reported!</Text>
          <Text style={[styles.successDesc, { color: colors.muted }]}>
            Thank you for helping improve TutorSnap. Our team will investigate and fix the issue as soon as possible.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.doneBtnText, { color: "#FFFFFF" }]}>Back to Settings</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Report a Bug</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

          {/* Device Info Card */}
          <View style={[styles.deviceCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
            <IconSymbol size={18} name="info.circle" color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.deviceTitle, { color: colors.foreground }]}>Device Info (auto-included)</Text>
              <Text style={[styles.deviceInfo, { color: colors.muted }]}>{deviceInfo}</Text>
            </View>
          </View>

          {/* Bug Category */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>BUG CATEGORY</Text>
          <View style={[styles.categoryGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {BUG_CATEGORIES.map((cat) => (
              <TouchableOpacity
                accessibilityLabel="Toggle category"
                key={cat.id}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCategory(cat.id);
                }}
                activeOpacity={0.7}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: category === cat.id ? `${colors.primary}15` : colors.background,
                    borderColor: category === cat.id ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryLabel, { color: category === cat.id ? colors.primary : colors.foreground }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Severity */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>SEVERITY</Text>
          {SEVERITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              accessibilityLabel="Toggle severity"
              key={opt.id}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSeverity(opt.id);
              }}
              activeOpacity={0.7}
              style={[
                styles.severityRow,
                {
                  backgroundColor: severity === opt.id ? `${opt.color}12` : colors.surface,
                  borderColor: severity === opt.id ? opt.color : colors.border,
                  marginBottom: 6,
                },
              ]}
            >
              <View style={[styles.severityDot, { backgroundColor: opt.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.severityLabel, { color: severity === opt.id ? opt.color : colors.foreground }]}>
                  {opt.label}
                </Text>
                <Text style={[styles.severityDesc, { color: colors.muted }]}>{opt.desc}</Text>
              </View>
              {severity === opt.id && (
                <IconSymbol size={18} name="checkmark.circle.fill" color={opt.color} />
              )}
            </TouchableOpacity>
          ))}

          {/* Description */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>DESCRIBE THE BUG</Text>
          <View style={[styles.textAreaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What happened? What did you expect to happen instead?"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={5}
              style={[styles.textArea, { color: colors.foreground }]}
              textAlignVertical="top"
              returnKeyType="default"
            />
          </View>

          {/* Steps to Reproduce */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>STEPS TO REPRODUCE (OPTIONAL)</Text>
          <View style={[styles.textAreaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              value={steps}
              onChangeText={setSteps}
              placeholder={"1. Open the Scan tab\n2. Point at a problem\n3. Tap the shutter button\n4. ..."}
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              style={[styles.textArea, { color: colors.foreground }]}
              textAlignVertical="top"
              returnKeyType="default"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            accessibilityLabel="Submit"
            onPress={handleSubmit}
            style={[styles.submitBtn, { backgroundColor: colors.error }]}
            activeOpacity={0.85}
          >
            <IconSymbol size={18} name="ladybug.fill" color="#FFFFFF" />
            <Text style={styles.submitBtnText}>Submit Bug Report</Text>
          </TouchableOpacity>

          <Text style={[styles.footerNote, { color: colors.muted }]}>
            Reports are sent to bugs@tutorsnapai.tech. We review every report and aim to fix critical bugs within 48 hours.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
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
  deviceCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  deviceTitle: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  deviceInfo: { fontSize: 12, lineHeight: 18, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  categoryGrid: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontSize: 13, fontWeight: "600" },
  severityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  severityLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  severityDesc: { fontSize: 12 },
  textAreaCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  textArea: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  footerNote: { fontSize: 12, textAlign: "center", marginHorizontal: 24, marginTop: 12, lineHeight: 18 },
  // Success state
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: "800", marginBottom: 12 },
  successDesc: { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 32 },
  doneBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 },
  doneBtnText: { fontSize: 16, fontWeight: "700" },
});
