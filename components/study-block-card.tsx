/**
 * StudyBlockCard
 * Renders a single Study View block with a distinct visual identity per type.
 * Each card has a unique accent colour, icon, header, copy button, and animated entrance.
 */
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  AIResponseRenderer,
  AIResponseErrorBoundary,
} from "@/components/ai-response-renderer";
import type { StudyBlock, StudyBlockType } from "@/shared/types";

type BlockConfig = {
  icon: string;
  accent: string;
  label: string;
};

const BLOCK_CONFIG: Record<StudyBlockType, BlockConfig> = {
  core_answer:    { icon: "checkmark.seal.fill",                    accent: "#4F46E5", label: "CORE ANSWER" },
  key_concept:    { icon: "lightbulb.fill",                         accent: "#0891B2", label: "KEY CONCEPT" },
  worked_example: { icon: "pencil.and.list.clipboard",              accent: "#7C3AED", label: "WORKED EXAMPLE" },
  formula:        { icon: "function",                               accent: "#DC2626", label: "FORMULA" },
  definition:     { icon: "text.quote",                             accent: "#059669", label: "DEFINITION" },
  tip:            { icon: "bolt.fill",                              accent: "#D97706", label: "TIP" },
  analogy:        { icon: "brain.head.profile",                     accent: "#7C3AED", label: "ANALOGY" },
  code:           { icon: "chevron.left.forwardslash.chevron.right", accent: "#0F766E", label: "CODE" },
  summary:        { icon: "list.bullet",                            accent: "#2563EB", label: "SUMMARY" },
  step_breakdown: { icon: "list.number",                            accent: "#9333EA", label: "STEP BY STEP" },
  visual_note:    { icon: "eye.fill",                               accent: "#0369A1", label: "VISUAL NOTE" },
};

function hapticLight() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
function hapticSuccess() {
  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

interface StudyBlockCardProps {
  block: StudyBlock;
  index: number;
  fs?: (n: number) => number;
}

export function StudyBlockCard({ block, index, fs: fsProp }: StudyBlockCardProps) {
  const colors = useColors();
  const fs = fsProp ?? ((n: number) => n);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const delay = index * 80;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay, useNativeDriver: true }),
    ]).start();
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); };
  }, []);

  const cfg = BLOCK_CONFIG[block.type] ?? BLOCK_CONFIG.key_concept;
  const ACCENT = cfg.accent;
  const ACCENT_BG = `${ACCENT}0D`;
  const ACCENT_BORDER = `${ACCENT}30`;
  const ACCENT_ICON_BG = `${ACCENT}18`;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(block.content);
      setCopied(true);
      hapticSuccess();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: ACCENT_BORDER, backgroundColor: ACCENT_BG, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: ACCENT }]} />
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconWrap, { backgroundColor: ACCENT_ICON_BG }]}>
              <IconSymbol size={14} name={cfg.icon as any} color={ACCENT} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.typeLabel, { color: ACCENT, fontSize: fs(10) }]} numberOfLines={1}>
                {cfg.label}
              </Text>
              <Text style={[styles.title, { color: colors.foreground, fontSize: fs(14) }]} numberOfLines={2}>
                {block.title}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => { hapticLight(); handleCopy(); }}
            style={[
              styles.copyBtn,
              { backgroundColor: copied ? `${ACCENT}18` : "transparent", borderColor: copied ? `${ACCENT}50` : ACCENT_BORDER },
            ]}
          >
            <IconSymbol size={12} name={copied ? "checkmark.circle.fill" : "doc.on.doc"} color={ACCENT} />
            <Text style={[styles.copyText, { color: ACCENT, fontSize: fs(11) }]}>
              {copied ? "Copied!" : "Copy"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.divider, { backgroundColor: ACCENT_BORDER }]} />
        <View>
          <AIResponseErrorBoundary fallbackText={block.content} fontSize={fs(14)} color={colors.foreground}>
            <AIResponseRenderer
              markdown={block.content}
              fontSize={fs(14)}
              color={colors.foreground}
              codeBackground={colors.surface}
              flavor="github"
              stripPreamble={false}
            />
          </AIResponseErrorBoundary>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, marginBottom: 12, flexDirection: "row", overflow: "hidden" },
  stripe: { width: 3, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  inner: { flex: 1, paddingTop: 12, paddingBottom: 14, paddingRight: 14, paddingLeft: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  headerLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  typeLabel: { fontWeight: "700", letterSpacing: 0.8, marginBottom: 2 },
  title: { fontWeight: "700", lineHeight: 19 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1, flexShrink: 0 },
  copyText: { fontWeight: "600" },
  divider: { height: 1, marginBottom: 10 },
});
