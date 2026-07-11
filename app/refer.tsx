/**
 * app/refer.tsx
 *
 * Refer a Friend screen.
 * Generates a unique referral code from the device install ID,
 * lets the user share a pre-filled invite message via the native
 * share sheet, and shows the "Give 7 days free, get 7 days free" incentive.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
  ScrollView,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const REFERRAL_CODE_KEY = "@tutorsnap/referralCode";
const APP_URL = "https://tutorsnapai.tech";

/** Generate a stable 8-char alphanumeric code from a random seed, persisted in AsyncStorage. */
async function getOrCreateReferralCode(): Promise<string> {
  const existing = await AsyncStorage.getItem(REFERRAL_CODE_KEY);
  if (existing) return existing;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  await AsyncStorage.setItem(REFERRAL_CODE_KEY, code);
  return code;
}

export default function ReferScreen() {
  const colors = useColors();
  const router = useRouter();
  const [code, setCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    getOrCreateReferralCode().then(setCode);
  }, []);

  const shareMessage = `Hey! I've been using TutorSnap to ace my homework and quizzes 📚\n\nUse my invite code ${code} to get 7 extra free days when you start your trial.\n\nDownload here: ${APP_URL}`;

  const handleCopyCode = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [code]);

  const handleShare = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === "web") {
      await Clipboard.setStringAsync(shareMessage);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
      return;
    }
    try {
      await Share.share({ message: shareMessage });
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    } catch {
      // cancelled
    }
  }, [shareMessage]);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Nav bar */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <IconSymbol size={22} name="chevron.left.forwardslash.chevron.right" color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Refer a Friend</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroBlock}>
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={[styles.heroHeadline, { color: colors.foreground }]}>
            Give 7 days free.{"\n"}Get 7 days free.
          </Text>
          <Text style={[styles.heroSubtext, { color: colors.muted }]}>
            Share TutorSnap with a friend. When they start their trial with your code, you both get an extra week of Premium — on us.
          </Text>
        </View>

        {/* How it works */}
        <View style={[styles.stepsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.stepsTitle, { color: colors.foreground }]}>How it works</Text>
          {[
            { n: "1", text: "Share your unique invite code with a friend" },
            { n: "2", text: "They download TutorSnap and enter your code at sign-up" },
            { n: "3", text: "They get 7 bonus days on their trial — you get 7 too!" },
          ].map((step) => (
            <View key={step.n} style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: `${colors.primary}18` }]}>
                <Text style={[styles.stepNum, { color: colors.primary }]}>{step.n}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.foreground }]}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Referral code block */}
        <View style={[styles.codeCard, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}30` }]}>
          <Text style={[styles.codeLabel, { color: colors.muted }]}>Your invite code</Text>
          <View style={styles.codeRow}>
            <Text style={[styles.codeText, { color: colors.primary }]}>{code || "Loading…"}</Text>
            <TouchableOpacity
              onPress={handleCopyCode}
              style={[styles.copyBtn, { backgroundColor: copied ? `${colors.success}18` : `${colors.primary}18`, borderColor: copied ? colors.success : colors.primary }]}
              accessibilityLabel={copied ? "Code copied" : "Copy invite code"}
              accessibilityRole="button"
            >
              <IconSymbol
                size={16}
                name={copied ? "checkmark.circle.fill" : "square.and.arrow.up.fill"}
                color={copied ? colors.success : colors.primary}
              />
              <Text style={[styles.copyBtnText, { color: copied ? colors.success : colors.primary }]}>
                {copied ? "Copied!" : "Copy"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Share CTA */}
        <TouchableOpacity
          onPress={handleShare}
          activeOpacity={0.85}
          style={[styles.shareBtn, { backgroundColor: colors.primary }]}
          accessibilityLabel={Platform.OS === "web" ? "Copy invite message" : "Share invite"}
          accessibilityRole="button"
        >
          <IconSymbol
            size={18}
            name={shared ? "checkmark.circle.fill" : "square.and.arrow.up.fill"}
            color="#FFFFFF"
          />
          <Text style={styles.shareBtnText}>
            {Platform.OS === "web"
              ? shared ? "Message Copied!" : "Copy Invite Message"
              : shared ? "Invite Sent! 🎉" : "Invite a Friend"}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.legalNote, { color: colors.muted }]}>
          Bonus days are added automatically when your friend starts their trial with your code. Limit: 10 referrals per account.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 36, alignItems: "flex-start" },
  navTitle: { fontSize: 17, fontWeight: "700" },
  content: { padding: 20, paddingBottom: 48, gap: 20 },
  heroBlock: { alignItems: "center", gap: 12, paddingVertical: 8 },
  heroEmoji: { fontSize: 56 },
  heroHeadline: { fontSize: 28, fontWeight: "800", textAlign: "center", lineHeight: 36, letterSpacing: -0.5 },
  heroSubtext: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  stepsCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  stepsTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 13, fontWeight: "800" },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  codeCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  codeLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  codeText: { fontSize: 28, fontWeight: "800", letterSpacing: 4 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  copyBtnText: { fontSize: 13, fontWeight: "700" },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 17, borderRadius: 18 },
  shareBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  legalNote: { fontSize: 11, textAlign: "center", lineHeight: 17 },
});
