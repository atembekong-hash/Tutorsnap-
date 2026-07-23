/**
 * SubmissionReadyCard
 *
 * Displays the independently generated submission-ready answer.
 * This is NOT a summary of the explanation above — it is a brand-new,
 * complete output generated specifically for direct submission.
 *
 * A student can skip the entire explanation and use only this card
 * to submit a correct, complete, polished answer.
 */

import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AIResponseRenderer, AIResponseErrorBoundary } from "@/components/ai-response-renderer";

function hapticLight() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
function hapticSuccess() {
  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

interface SubmissionReadyCardProps {
  content: string;
  fs?: (n: number) => number;
}

export function SubmissionReadyCard({ content, fs: fsProp }: SubmissionReadyCardProps) {
  const colors = useColors();
  const fs = fsProp ?? ((n: number) => n);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!content || content.trim().length === 0) return null;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(content);
      setCopied(true);
      hapticSuccess();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Accent colour: deep indigo — distinct from the primary purple used elsewhere
  const ACCENT = "#4F46E5";
  const ACCENT_BG = `${ACCENT}10`;
  const ACCENT_BORDER = `${ACCENT}35`;
  const ACCENT_ICON_BG = `${ACCENT}18`;

  return (
    <View
      style={[
        styles.card,
        { borderColor: ACCENT_BORDER, backgroundColor: ACCENT_BG },
      ]}
      accessibilityLabel="Submission Ready answer"
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={[styles.iconWrap, { backgroundColor: ACCENT_ICON_BG }]}>
            <IconSymbol size={15} name="checkmark.seal.fill" color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: ACCENT, fontSize: fs(11) }]}>
              SUBMISSION READY
            </Text>
            <Text style={[styles.sublabel, { color: colors.muted, fontSize: fs(10) }]}>
              Independent answer. Copy directly into your work.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleCopy}
          accessibilityLabel="Copy submission ready answer"
          style={[
            styles.copyBtn,
            {
              backgroundColor: copied ? `${ACCENT}18` : "transparent",
              borderColor: copied ? `${ACCENT}50` : ACCENT_BORDER,
            },
          ]}
        >
          <IconSymbol
            size={13}
            name={copied ? "checkmark.circle.fill" : "doc.on.doc"}
            color={ACCENT}
          />
          <Text style={[styles.copyText, { color: ACCENT, fontSize: fs(12) }]}>
            {copied ? "Copied!" : "Copy"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: ACCENT_BORDER }]} />

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
    marginTop: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontWeight: "700",
    letterSpacing: 0.9,
  },
  sublabel: {
    marginTop: 1,
    lineHeight: 14,
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
    paddingTop: 12,
    paddingBottom: 16,
  },
});
