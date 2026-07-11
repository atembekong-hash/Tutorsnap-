/**
 * ChatNudgeBanner
 *
 * Shown above the chat input bar after the user has sent at least one message.
 * Displays remaining free messages as pip dots and prompts upgrade.
 *
 * Behaviour:
 *  - Hidden when user is premium or in dev mode
 *  - Hidden when 0 messages sent this session
 *  - Amber when messages remain (e.g. "2 of 3 used")
 *  - Red + urgent copy when limit reached
 *  - Dismissible per session
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { FREE_LIMITS } from "@/lib/subscription";

interface ChatNudgeBannerProps {
  messagesUsed: number;
  isPremium: boolean;
  isDevMode: boolean;
}

export function ChatNudgeBanner({ messagesUsed, isPremium, isDevMode }: ChatNudgeBannerProps) {
  const colors = useColors();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (isPremium || isDevMode || messagesUsed === 0 || dismissed) return null;

  const limit = FREE_LIMITS.chatMessagesPerSession;
  const remaining = Math.max(0, limit - messagesUsed);
  const isUrgent = remaining === 0;
  const isWarning = remaining === 1;

  const accentColor = isUrgent ? colors.error : isWarning ? colors.warning : colors.primary;
  const bgColor = isUrgent
    ? `${colors.error}12`
    : isWarning
    ? `${colors.warning}12`
    : `${colors.primary}08`;
  const borderColor = isUrgent
    ? `${colors.error}35`
    : isWarning
    ? `${colors.warning}35`
    : `${colors.primary}20`;

  const headline = isUrgent
    ? "Message limit reached"
    : `${remaining} free message${remaining !== 1 ? "s" : ""} left`;

  const subtext = isUrgent
    ? "Upgrade for unlimited AI chat"
    : `${messagesUsed} of ${limit} used this session · Upgrade for unlimited`;

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/paywall" as any);
  };

  const handleDismiss = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissed(true);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityLabel="Upgrade to premium for unlimited chat messages"
      accessibilityRole="button"
      style={[styles.banner, { backgroundColor: bgColor, borderColor, borderTopWidth: 1 }]}
    >
      <View style={styles.left}>
        {/* Pip dots */}
        <View style={styles.pipRow}>
          {Array.from({ length: limit }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.pip,
                { backgroundColor: i < messagesUsed ? accentColor : `${accentColor}28` },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.headline, { color: accentColor }]}>{headline}</Text>
        <Text style={[styles.subtext, { color: colors.muted }]}>{subtext}</Text>
      </View>

      <View style={styles.right}>
        <View style={[styles.upgradeChip, { backgroundColor: accentColor }]}>
          <Text style={styles.upgradeChipText}>Upgrade</Text>
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Dismiss banner"
          style={styles.dismissBtn}
        >
          <Text style={[styles.dismissText, { color: colors.muted }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 10,
  },
  left: { flex: 1, gap: 2 },
  pipRow: { flexDirection: "row", gap: 4, marginBottom: 2 },
  pip: { width: 7, height: 7, borderRadius: 4 },
  headline: { fontSize: 12, fontWeight: "700", lineHeight: 17 },
  subtext: { fontSize: 11, lineHeight: 15 },
  right: { alignItems: "center", gap: 5 },
  upgradeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  upgradeChipText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  dismissBtn: { padding: 2 },
  dismissText: { fontSize: 12 },
});
