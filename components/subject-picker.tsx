/**
 * SubjectPicker — a clean, grouped subject selector modal.
 *
 * Design goals:
 * - Never clutters the host screen (shown as a bottom sheet modal)
 * - 4 category tabs at the top; subjects listed below
 * - One tap selects and closes
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
import * as Haptics from "expo-haptics";
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
}

const CATEGORIES: SubjectCategory[] = ["math", "english", "science", "social"];

export function SubjectPicker({ value, onChange, showAll = true, preferredCategories = [] }: SubjectPickerProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  // Default to first preferred category if set, otherwise "math"
  const defaultCategory: SubjectCategory = (preferredCategories.length > 0 ? preferredCategories[0] : "math") as SubjectCategory;
  const [activeCategory, setActiveCategory] = useState<SubjectCategory>(defaultCategory);

  const grouped = getSubjectsByCategory();
  const selectedDef = value ? ALL_SUBJECTS.find((s) => s.id === value) : null;

  const handleSelect = useCallback(
    (id: SubjectId | null) => {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(id);
      setOpen(false);
    },
    [onChange],
  );

  const buttonLabel = selectedDef ? `${selectedDef.emoji}  ${selectedDef.label}` : "📚  All Subjects";
  const buttonColor = selectedDef ? selectedDef.color : colors.primary;

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: buttonColor, backgroundColor: buttonColor + "18" }]}
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setOpen(true);
        }}
        activeOpacity={0.75}
      >
        <Text style={[styles.triggerText, { color: buttonColor }]} numberOfLines={1}>
          {buttonLabel}
        </Text>
        <Text style={[styles.chevron, { color: buttonColor }]}>{"▾"}</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Choose Subject</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: colors.muted }]}>{"✕"}</Text>
            </TouchableOpacity>
          </View>

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
              <Text style={[styles.allLabel, { color: !value ? colors.primary : colors.foreground }]}>
                All Subjects
              </Text>
              {!value && <Text style={[styles.check, { color: colors.primary }]}>{"✓"}</Text>}
            </TouchableOpacity>
          )}

          {preferredCategories.length > 0 && (
            <View style={[styles.preferredBanner, { backgroundColor: `${colors.primary}12`, borderBottomColor: colors.border }]}>
              <Text style={[styles.preferredBannerText, { color: colors.primary }]}>
                ⭐ Preferred: {preferredCategories.map(c => SUBJECT_CATEGORIES[c as SubjectCategory]?.label.split(" /")[0] ?? c).join(" · ")}
              </Text>
            </View>
          )}
          <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
            {CATEGORIES.map((cat) => {
              const meta = SUBJECT_CATEGORIES[cat];
              const isActive = activeCategory === cat;
              const isPreferred = preferredCategories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.tab,
                    isActive && { borderBottomColor: meta.color, borderBottomWidth: 2.5 },
                  ]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tabEmoji}>{meta.emoji}{isPreferred ? "⭐" : ""}</Text>
                  <Text
                    style={[styles.tabLabel, { color: isActive ? meta.color : colors.muted }]}
                    numberOfLines={1}
                  >
                    {meta.label.split(" /")[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FlatList
            data={grouped[activeCategory]}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.grid}
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
        style={[styles.cellLabel, { color: selected ? item.color : colors.foreground }]}
        numberOfLines={2}
      >
        {item.label}
      </Text>
      {selected && <Text style={[styles.cellCheck, { color: item.color }]}>{"✓"}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: "72%",
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  grid: {
    padding: 12,
    gap: 8,
  },
  cell: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    minHeight: 72,
    justifyContent: "center",
    gap: 4,
  },
  cellEmoji: {
    fontSize: 22,
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
});
