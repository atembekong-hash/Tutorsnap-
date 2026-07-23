/**
 * StudyViewRenderer
 * Renders a full Study View document from an array of StudyBlocks.
 * Handles loading (skeleton), error, and empty states.
 */
import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { StudyBlockCard } from "@/components/study-block-card";
import type { StudyBlock } from "@/shared/types";

interface StudyViewRendererProps {
  blocks: StudyBlock[];
  loading?: boolean;
  error?: string | null;
  fs?: (n: number) => number;
}

function LoadingSkeleton({ colors, fs }: { colors: ReturnType<typeof useColors>; fs: (n: number) => number }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={sk.container}>
      <View style={[sk.headerRow, { marginBottom: 20 }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[sk.label, { color: colors.muted, fontSize: fs(13) }]}>
          Building your study document...
        </Text>
      </View>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[sk.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pulse }]}
        >
          <View style={[sk.stripe, { backgroundColor: colors.border }]} />
          <View style={sk.inner}>
            <View style={sk.iconRow}>
              <View style={[sk.icon, { backgroundColor: colors.border }]} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={[sk.line, { backgroundColor: colors.border, width: "40%" }]} />
                <View style={[sk.line, { backgroundColor: colors.border, width: "70%" }]} />
              </View>
            </View>
            <View style={[sk.line, { backgroundColor: colors.border, width: "100%", marginTop: 10 }]} />
            <View style={[sk.line, { backgroundColor: colors.border, width: "85%", marginTop: 6 }]} />
            <View style={[sk.line, { backgroundColor: colors.border, width: "60%", marginTop: 6 }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

export function StudyViewRenderer({ blocks, loading, error, fs: fsProp }: StudyViewRendererProps) {
  const colors = useColors();
  const fs = fsProp ?? ((n: number) => n);

  if (loading) return <LoadingSkeleton colors={colors} fs={fs} />;

  if (error) {
    return (
      <View style={[styles.errorBox, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}30` }]}>
        <Text style={[styles.errorText, { color: colors.error, fontSize: fs(13) }]}>
          Could not generate study view. Please try again.
        </Text>
      </View>
    );
  }

  if (!blocks || blocks.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={[styles.emptyText, { color: colors.muted, fontSize: fs(13) }]}>
          No study blocks yet. Send a message to generate a study view.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {blocks.map((block, i) => (
        <StudyBlockCard key={`${block.type}-${i}`} block={block} index={i} fs={fs} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  errorBox: { margin: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  errorText: { lineHeight: 20, textAlign: "center" },
  emptyBox: { padding: 32, alignItems: "center", justifyContent: "center" },
  emptyText: { textAlign: "center", lineHeight: 20 },
});

const sk = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center" },
  label: { fontStyle: "italic" },
  card: { borderWidth: 1, borderRadius: 16, marginBottom: 12, flexDirection: "row", overflow: "hidden", height: 110 },
  stripe: { width: 3, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  inner: { flex: 1, padding: 12 },
  iconRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  icon: { width: 28, height: 28, borderRadius: 8 },
  line: { height: 10, borderRadius: 5 },
});
