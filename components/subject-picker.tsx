/**
 * SubjectPicker — a clean, grouped subject selector bottom sheet.
 *
 * Design goals:
 * - Identical appearance on iOS, Android, and web
 * - 4 category tabs at the top; subjects listed below in a 2-column grid
 * - One tap selects and closes
 *
 * Architecture note:
 * The Modal uses absolute positioning for both the backdrop and the sheet.
 * This is required because on native, a flex-column Modal root gives flex:1
 * to the backdrop which pushes the sheet off-screen. Absolute positioning
 * anchors the sheet to the bottom of the screen on all platforms.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import * as H from "@/lib/haptics";
import { useColors } from "@/hooks/use-colors";
import {
  ALL_SUBJECTS,
  SUBJECT_CATEGORIES,
  getSubjectsByCategory,
  type SubjectCategory,
  type SubjectDef,
  type SubjectId,
} from "@/lib/subjects";

interface SubjectPickerProps {
  value: SubjectId | null;
  onChange: (id: SubjectId | null) => void;
  showAll?: boolean;
  /** Categories to highlight as preferred (from Settings). First preferred category becomes the default active tab. */
  preferredCategories?: SubjectCategory[];
  /** Controlled open state — when provided, the internal trigger pill is hidden and the modal is opened externally */
  open?: boolean;
  /** Called when the modal requests to close (backdrop tap, back button) */
  onClose?: () => void;
  /** Optional style override for the trigger pill (e.g. to force flex:1 in a row) */
  triggerStyle?: object;
}

const CATEGORIES: SubjectCategory[] = ["math", "english", "science", "social"];

export function SubjectPicker({
  value,
  onChange,
  showAll = true,
  preferredCategories = [],
  triggerStyle,
  open: controlledOpen,
  onClose,
}: SubjectPickerProps) {
  const colors = useColors();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const triggerStyleProp = (triggerStyle as any) ?? {};

  // Default to first preferred category if set, otherwise "math"
  const defaultCategory: SubjectCategory = (
    preferredCategories.length > 0 ? preferredCategories[0] : "math"
  ) as SubjectCategory;
  const [activeCategory, setActiveCategory] = useState<SubjectCategory>(defaultCategory);

  const grouped = getSubjectsByCategory();
  const selectedDef = value ? ALL_SUBJECTS.find((s) => s.id === value) : null;

  const handleClose = useCallback(() => {
    if (isControlled) {
      onClose?.();
    } else {
      setInternalOpen(false);
    }
  }, [isControlled, onClose]);

  const handleSelect = useCallback(
    (id: SubjectId | null) => {
      H.impactLight()
      onChange(id);
      handleClose();
    },
    [onChange, handleClose],
  );

  const buttonLabel = selectedDef ? `${selectedDef.emoji}  ${selectedDef.label}` : "📚  All Subjects";
  const buttonColor = selectedDef ? selectedDef.color : colors.primary;

  return (
    <>
      {/* Trigger pill — only shown when not controlled externally */}
      {!isControlled && (
        <TouchableOpacity
          accessibilityLabel="Open subject picker"
          style={[
            styles.trigger,
            { borderColor: buttonColor, backgroundColor: buttonColor + "18" },
            triggerStyleProp,
          ]}
          onPress={() => {
            H.impactLight()
            setInternalOpen(true);
          }}
          activeOpacity={0.75}
        >
          <Text style={[styles.triggerText, { color: buttonColor }]} numberOfLines={1}>
            {buttonLabel}
          </Text>
          <Text style={[styles.chevron, { color: buttonColor }]}>{"▾"}</Text>
        </TouchableOpacity>
      )}

      {/* Bottom sheet modal */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        {/*
         * Backdrop: uses absoluteFillObject so it covers the entire screen
         * on both native and web without consuming flex space.
         */}
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityLabel="Close subject picker"
        />

        {/*
         * Sheet: absolutely positioned at the bottom of the screen.
         * This ensures it is always visible regardless of the Modal's
         * internal flex layout on native.
         */}
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              Choose Subject
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              accessibilityLabel="Close subject picker"
            >
              <Text style={[styles.closeBtnText, { color: colors.muted }]}>{"✕"}</Text>
            </TouchableOpacity>
          </View>

          {/* "All Subjects" row */}
          {showAll && (
            <TouchableOpacity
              style={[
                styles.allRow,
                { borderBottomColor: colors.border },
                !value && { backgroundColor: colors.primary + "15" },
              ]}
              onPress={() => handleSelect(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.allEmoji}>{"📚"}</Text>
              <Text
                style={[
                  styles.allLabel,
                  { color: !value ? colors.primary : colors.foreground },
                ]}
              >
                All Subjects
              </Text>
              {!value && (
                <Text style={[styles.check, { color: colors.primary }]}>{"✓"}</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Preferred categories banner */}
          {preferredCategories.length > 0 && (
            <View
              style={[
                styles.preferredBanner,
                {
                  backgroundColor: `${colors.primary}12`,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.preferredBannerText, { color: colors.primary }]}>
                ⭐ Preferred:{" "}
                {preferredCategories
                  .map(
                    (c) =>
                      SUBJECT_CATEGORIES[c as SubjectCategory]?.label.split(" /")[0] ?? c,
                  )
                  .join(" · ")}
              </Text>
            </View>
          )}

          {/* Category tabs */}
          <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
            {CATEGORIES.map((cat) => {
              const meta = SUBJECT_CATEGORIES[cat];
              const isActive = activeCategory === cat;
              const isPreferred = preferredCategories.includes(cat);
              return (
                <TouchableOpacity
                  accessibilityLabel={`${meta.label} category`}
                  key={cat}
                  style={[
                    styles.tab,
                    isActive && {
                      borderBottomColor: meta.color,
                      borderBottomWidth: 2.5,
                    },
                  ]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tabEmoji}>
                    {meta.emoji}
                    {isPreferred ? "⭐" : ""}
                  </Text>
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isActive ? meta.color : colors.muted },
                    ]}
                    numberOfLines={1}
                  >
                    {meta.label.split(" /")[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Subject grid */}
          <FlatList
            data={grouped[activeCategory]}
            keyExtractor={(item) => item.id}
            numColumns={2}
            style={styles.list}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={true}
            bounces={true}
            renderItem={({ item }) => (
              <SubjectCell
                item={item}
                selected={value === item.id}
                onSelect={handleSelect}
                colors={colors}
              />
            )}
          />
        </View>
      </Modal>
    </>
  );
}

function SubjectCell({
  item,
  selected,
  onSelect,
  colors,
}: {
  item: SubjectDef;
  selected: boolean;
  onSelect: (id: SubjectId) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.cell,
        {
          backgroundColor: selected ? item.color + "22" : colors.surface,
          borderColor: selected ? item.color : colors.border,
        },
      ]}
      onPress={() => onSelect(item.id)}
      activeOpacity={0.75}
    >
      <Text style={styles.cellEmoji}>{item.emoji}</Text>
      <Text
        style={[
          styles.cellLabel,
          { color: selected ? item.color : colors.foreground },
        ]}
        numberOfLines={2}
      >
        {item.label}
      </Text>
      {selected && (
        <Text style={[styles.cellCheck, { color: item.color }]}>{"✓"}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── Trigger pill ─────────────────────────────────────────────────────────
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
    alignSelf: "flex-start",
  },
  triggerText: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 200,
  },
  chevron: {
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Modal overlay ─────────────────────────────────────────────────────────
  backdrop: {
    // absoluteFillObject covers the entire screen without consuming flex space.
    // This is the key fix: the old pattern used flex:1 which pushed the sheet
    // off-screen on native.
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  // ── Bottom sheet ──────────────────────────────────────────────────────────
  sheet: {
    // Absolute positioning anchors the sheet to the bottom of the screen
    // on both native and web, regardless of the Modal's internal flex layout.
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "78%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    // Shadow for depth on native
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
      web: {
        // @ts-ignore — boxShadow is valid on web
        boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
      },
    }),
  },

  // ── Drag handle ───────────────────────────────────────────────────────────
  handleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },

  // ── Sheet header ──────────────────────────────────────────────────────────
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
  },

  // ── "All Subjects" row ────────────────────────────────────────────────────
  allRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  allEmoji: {
    fontSize: 20,
  },
  allLabel: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  check: {
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Preferred banner ──────────────────────────────────────────────────────
  preferredBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  preferredBannerText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // ── Category tabs ─────────────────────────────────────────────────────────
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },

  // ── Subject grid ──────────────────────────────────────────────────────────
  list: {
    flex: 1,
  },
  grid: {
    padding: 12,
    gap: 8,
    paddingBottom: 32,
  },
  cell: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    minHeight: 80,
    justifyContent: "center",
    gap: 4,
  },
  cellEmoji: {
    fontSize: 24,
  },
  cellLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
  },
  cellCheck: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
});
