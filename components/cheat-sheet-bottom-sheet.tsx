/**
 * CheatSheetBottomSheet — slides up from the bottom to show subject formulas.
 * Uses Animated.Value for a smooth slide-in/out without any extra libraries.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Modal,
} from "react-native";
import * as Haptics from "expo-haptics";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getCheatSheet } from "@/lib/cheat-sheets";
import { getSubjectDef } from "@/lib/subjects";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

interface CheatSheetBottomSheetProps {
  visible: boolean;
  subjectId: string;
  onClose: () => void;
}

export function CheatSheetBottomSheet({
  visible,
  subjectId,
  onClose,
}: CheatSheetBottomSheetProps) {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  const sheet = getCheatSheet(subjectId);
  const subjectDef = getSubjectDef(subjectId as any);
  const subjectColor = subjectDef?.color ?? colors.primary;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, translateY, backdropOpacity]);

  const handleClose = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} activeOpacity={1} accessibilityLabel="Close" />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            height: SHEET_HEIGHT,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
            <View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                {sheet?.title ?? "Formula Sheet"}
              </Text>
              <Text style={[styles.headerSub, { color: colors.muted }]}>
                {subjectDef?.label ?? subjectId} · Quick Reference
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}
            accessibilityLabel="Close">
            <IconSymbol size={20} name="xmark.circle.fill" color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* No sheet fallback */}
        {!sheet ? (
          <View style={styles.noSheet}>
            <Text style={styles.noSheetEmoji}>📚</Text>
            <Text style={[styles.noSheetText, { color: colors.muted }]}>
              No formula sheet available for this subject yet.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {sheet.sections.map((section, si) => (
              <View key={si} style={styles.section}>
                <Text style={[styles.sectionHeading, { color: subjectColor }]}>
                  {section.heading}
                </Text>
                {section.items.map((item, ii) => (
                  <View
                    key={ii}
                    style={[
                      styles.formulaRow,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.formulaLabel, { color: colors.muted }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.formulaValue, { color: colors.foreground }]}>
                      {item.formula}
                    </Text>
                    {item.note && (
                      <Text style={[styles.formulaNote, { color: colors.muted }]}>
                        {item.note}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 0.5,
    elevation: 16,
    ...Platform.select({
      native: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      web: { boxShadow: "0 -4px 16px rgba(0,0,0,0.12)" },
    }),
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  subjectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  formulaRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  formulaLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  formulaValue: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    lineHeight: 22,
  },
  formulaNote: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  noSheet: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  noSheetEmoji: { fontSize: 48 },
  noSheetText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
