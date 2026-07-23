import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as H from "@/lib/haptics";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import type { StudyBlock, StudyBlockType } from "@/shared/types";

// ─── Block type metadata ──────────────────────────────────────────────────────
type BlockMeta = {
  icon: string;
  label: string;
  accentKey: "primary" | "success" | "warning" | "error";
};

const BLOCK_META: Record<StudyBlockType, BlockMeta> = {
  core_answer:   { icon: "checkmark.circle.fill", label: "Answer",        accentKey: "success" },
  key_concept:   { icon: "lightbulb.fill",        label: "Key Concept",   accentKey: "primary" },
  worked_example:{ icon: "list.bullet",           label: "Worked Example",accentKey: "primary" },
  formula:       { icon: "function",              label: "Formula",       accentKey: "warning" },
  definition:    { icon: "text.book.closed.fill", label: "Definition",    accentKey: "primary" },
  tip:           { icon: "star.fill",             label: "Tip",           accentKey: "warning" },
  analogy:       { icon: "arrow.left.arrow.right",label: "Analogy",       accentKey: "primary" },
  code:          { icon: "chevron.left.forwardslash.chevron.right", label: "Code", accentKey: "error" },
  summary:       { icon: "doc.text.fill",         label: "Summary",       accentKey: "success" },
  step_breakdown:{ icon: "list.number",           label: "Steps",         accentKey: "primary" },
  visual_note:   { icon: "eye.fill",              label: "Visual Note",   accentKey: "primary" },
};

// ─── StudyBlockCard ───────────────────────────────────────────────────────────
export function StudyBlockCard({
  block,
  index,
  onSaveToNotes,
}: {
  block: StudyBlock;
  index: number;
  onSaveToNotes?: (block: StudyBlock) => void;
}) {
  const colors = useColors();
  const meta = BLOCK_META[block.type] ?? BLOCK_META.key_concept;
  const accent = colors[meta.accentKey];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 60, useNativeDriver: true }),
    ]).start();
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(`${block.title}\n\n${block.content}`);
      setCopied(true);
      H.impactLight();
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const handleSave = () => {
    if (!onSaveToNotes) return;
    onSaveToNotes(block);
    setSaved(true);
    H.notificationSuccess();
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: `${accent}30`, borderLeftColor: accent, borderLeftWidth: 4 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}15` }]}>
            <IconSymbol size={15} name={meta.icon as any} color={accent} />
          </View>
          <Text style={[styles.label, { color: accent }]}>{meta.label.toUpperCase()}</Text>
          <View style={styles.headerActions}>
            {onSaveToNotes && (
              <TouchableOpacity
                accessibilityLabel="Save block to notes"
                onPress={handleSave}
                style={[styles.actionBtn, { backgroundColor: saved ? `${colors.success}20` : `${colors.success}10` }]}
              >
                <IconSymbol size={13} name={saved ? "checkmark.circle.fill" : "note.text"} color={saved ? colors.success : colors.muted} />
                <Text style={[styles.actionBtnText, { color: saved ? colors.success : colors.muted }]}>
                  {saved ? "Saved!" : "Save"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityLabel="Copy block content"
              onPress={handleCopy}
              style={[styles.actionBtn, { backgroundColor: copied ? `${colors.success}20` : "transparent" }]}
            >
              <IconSymbol size={13} name={copied ? "checkmark.circle.fill" : "doc.on.doc"} color={copied ? colors.success : colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]}>{block.title}</Text>

        {/* Content */}
        <Text style={[styles.content, { color: colors.foreground }]}>{block.content}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
export function StudyBlockSkeleton({ count = 4 }: { count?: number }) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.skeletonCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pulseAnim,
            },
          ]}
        >
          <View style={[styles.skeletonLabel, { backgroundColor: `${colors.primary}20`, width: 80 }]} />
          <View style={[styles.skeletonLine, { backgroundColor: `${colors.primary}15`, width: "60%", marginTop: 10 }]} />
          <View style={[styles.skeletonLine, { backgroundColor: `${colors.primary}10`, width: "100%", marginTop: 8 }]} />
          <View style={[styles.skeletonLine, { backgroundColor: `${colors.primary}10`, width: "85%", marginTop: 6 }]} />
          <View style={[styles.skeletonLine, { backgroundColor: `${colors.primary}10`, width: "70%", marginTop: 6 }]} />
        </Animated.View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    lineHeight: 20,
  },
  content: {
    fontSize: 14,
    lineHeight: 21,
  },
  skeletonCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  skeletonLabel: {
    height: 10,
    borderRadius: 5,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
});
