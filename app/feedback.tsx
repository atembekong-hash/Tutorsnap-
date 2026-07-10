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

const CATEGORIES = [
  { id: "general", label: "General Feedback", emoji: "💬" },
  { id: "feature", label: "Feature Request", emoji: "✨" },
  { id: "ui", label: "Design / UI", emoji: "🎨" },
  { id: "performance", label: "Performance", emoji: "⚡" },
  { id: "content", label: "Content / Accuracy", emoji: "📚" },
  { id: "other", label: "Other", emoji: "📝" },
];

export default function FeedbackScreen() {
  const colors = useColors();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating before submitting.");
      return;
    }
    if (message.trim().length < 10) {
      Alert.alert("More Detail Needed", "Please write at least 10 characters of feedback.");
      return;
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const version = Constants.expoConfig?.version ?? "1.1.0";
    const subject = encodeURIComponent(`TutorSnap Feedback — ${rating}★ — ${CATEGORIES.find(c => c.id === category)?.label}`);
    const body = encodeURIComponent(
      `Rating: ${rating}/5 stars\nCategory: ${CATEGORIES.find(c => c.id === category)?.label}\nApp Version: ${version}\nPlatform: ${Platform.OS}\n\nFeedback:\n${message.trim()}`
    );
    try {
      await Linking.openURL(`mailto:feedback@tutorsnapai.tech?subject=${subject}&body=${body}`);
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
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Feedback</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Thank You!</Text>
          <Text style={[styles.successDesc, { color: colors.muted }]}>
            Your feedback has been sent to the TutorSnap team. We read every message and use it to make the app better.
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
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Send Feedback</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

          {/* Intro */}
          <View style={[styles.introCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
            <Text style={styles.introEmoji}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.introTitle, { color: colors.foreground }]}>We'd love your feedback</Text>
              <Text style={[styles.introDesc, { color: colors.muted }]}>
                Help us improve TutorSnap. Your message goes directly to our team.
              </Text>
            </View>
          </View>

          {/* Star Rating */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>HOW WOULD YOU RATE TUTORSNAP?</Text>
          <View style={[styles.starsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRating(star);
                  }}
                  activeOpacity={0.7}
                  style={styles.starBtn}
                >
                  <Text style={[styles.starIcon, { opacity: star <= rating ? 1 : 0.25 }]}>⭐</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.ratingLabel, { color: colors.muted }]}>
              {rating === 0 ? "Tap to rate" : rating === 1 ? "Poor" : rating === 2 ? "Fair" : rating === 3 ? "Good" : rating === 4 ? "Great" : "Excellent!"}
            </Text>
          </View>

          {/* Category */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>FEEDBACK CATEGORY</Text>
          <View style={[styles.categoryGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
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

          {/* Message */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>YOUR MESSAGE</Text>
          <View style={[styles.textAreaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us what you think, what you'd like to see, or what could be better..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={6}
              style={[styles.textArea, { color: colors.foreground }]}
              textAlignVertical="top"
              returnKeyType="default"
            />
            <Text style={[styles.charCount, { color: colors.muted }]}>{message.length} characters</Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <IconSymbol size={18} name="paperplane.fill" color="#FFFFFF" />
            <Text style={styles.submitBtnText}>Send Feedback</Text>
          </TouchableOpacity>

          <Text style={[styles.footerNote, { color: colors.muted }]}>
            Feedback is sent to feedback@tutorsnapai.tech. We typically respond within 2–3 business days.
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
  introCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  introEmoji: { fontSize: 32 },
  introTitle: { fontSize: 16, fontWeight: "700", marginBottom: 3 },
  introDesc: { fontSize: 13, lineHeight: 18 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  starsCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  starsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  starBtn: { padding: 4 },
  starIcon: { fontSize: 36 },
  ratingLabel: { fontSize: 14, fontWeight: "600" },
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
  textAreaCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  textArea: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
  },
  charCount: { fontSize: 11, textAlign: "right", marginTop: 8 },
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
