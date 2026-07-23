/**
 * FinalSolutionCard
 *
 * Displays the submission-ready final answer in a visually distinct card.
 * This is a completely self-contained deliverable — no explanation, no commentary.
 * A student can copy this directly into homework, classwork, or an exam.
 */

import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AIResponseRenderer, AIResponseErrorBoundary } from "@/components/ai-response-renderer";

function H() {}
H.impactLight = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};
H.notificationSuccess = () => {
  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

interface FinalSolutionCardProps {
  content: string;
  /** Font size scaler, defaults to identity */
  fs?: (n: number) => number;
}

export function FinalSolutionCard({ content, fs: fsProp }: FinalSolutionCardProps) {
  const colors = useColors();
  const fs = fsProp ?? ((n: number) => n);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!content || content.trim().length === 0) return null;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(content);
      setCopied(true);
      H.notificationSuccess();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.card, { borderColor: "#7C3AED", backgroundColor: "#7C3AED12" }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={[styles.iconWrap, { backgroundColor: "#7C3AED20" }]}>
            <IconSymbol size={16} name="checkmark.seal.fill" color="#7C3AED" />
          </View>
          <View>
            <Text style={[styles.label, { color: "#7C3AED", fontSize: fs(11) }]}>FINAL SOLUTION</Text>
            <Text style={[styles.sublabel, { color: colors.muted, fontSize: fs(10) }]}>
              Submission-ready. Copy directly into your work.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleCopy}
          accessibilityLabel="Copy final solution"
          style={[styles.copyBtn, { backgroundColor: copied ? "#7C3AED20" : "transparent", borderColor: copied ? "#7C3AED50" : "#7C3AED30" }]}
        >
          <IconSymbol
            size={14}
            name={copied ? "checkmark.circle.fill" : "doc.on.doc"}
            color={copied ? "#7C3AED" : "#7C3AED"}
          />
          <Text style={[styles.copyText, { color: "#7C3AED", fontSize: fs(12) }]}>
            {copied ? "Copied!" : "Copy"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: "#7C3AED30" }]} />

      {/* Content */}
      <View style={styles.content}>
        <AIResponseErrorBoundary
          fallbackText={content}
          fontSize={fs(14)}
          color={colors.foreground}
        >
          <AIResponseRenderer
            markdown={content}
            fontSize={fs(14)}
            color={colors.foreground}
            codeBackground={colors.surface}
            flavor="github"
            stripPreamble={false}
          />
        </AIResponseErrorBoundary>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 16,
    marginTop: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  sublabel: {
    marginTop: 1,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  copyText: {
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
});
