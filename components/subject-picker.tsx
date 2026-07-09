import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
  Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { SUBJECT_CATEGORIES, type SubjectId, type SubjectDef, type CategoryDef } from "@/lib/subjects";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface SubjectPickerProps {
  selectedSubject: SubjectId | null;
  onSelect: (subject: SubjectId | null) => void;
}

export function SubjectPicker({ selectedSubject, onSelect }: SubjectPickerProps) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("math");

  const selectedDef = selectedSubject
    ? SUBJECT_CATEGORIES.flatMap((c) => c.subjects).find((s) => s.id === selectedSubject)
    : null;

  const handleSelect = (subject: SubjectDef) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(subject.id);
    setVisible(false);
  };

  const handleClear = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(null);
    setVisible(false);
  };

  const activecat = SUBJECT_CATEGORIES.find((c) => c.id === activeCategory) ?? SUBJECT_CATEGORIES[0];

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: selectedDef ? `${selectedDef.color}18` : colors.surface,
            borderColor: selectedDef ? selectedDef.color : colors.border,
          },
        ]}
        activeOpacity={0.75}
      >
        {selectedDef ? (
          <>
            <View style={[styles.triggerDot, { backgroundColor: selectedDef.color }]} />
            <Text style={[styles.triggerText, { color: selectedDef.color }]} numberOfLines={1}>
              {selectedDef.shortLabel}
            </Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              style={styles.clearDot}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={14} color={selectedDef.color} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <MaterialIcons name="school" size={16} color={colors.muted} />
            <Text style={[styles.triggerPlaceholder, { color: colors.muted }]}>
              All Subjects
            </Text>
            <MaterialIcons name="expand-more" size={18} color={colors.muted} />
          </>
        )}
      </TouchableOpacity>

      {/* Modal Picker */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Choose Subject</Text>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Category Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.catTabs, { borderBottomColor: colors.border }]}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
              {SUBJECT_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setActiveCategory(cat.id)}
                    style={[
                      styles.catTab,
                      {
                        backgroundColor: isActive ? `${cat.color}20` : "transparent",
                        borderColor: isActive ? cat.color : "transparent",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={cat.icon as any}
                      size={16}
                      color={isActive ? cat.color : colors.muted}
                    />
                    <Text
                      style={[
                        styles.catTabText,
                        { color: isActive ? cat.color : colors.muted },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Subject Grid */}
            <ScrollView
              style={styles.subjectScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.subjectGrid}
            >
              {/* All option */}
              <TouchableOpacity
                onPress={handleClear}
                style={[
                  styles.subjectCard,
                  {
                    backgroundColor: !selectedSubject ? `${colors.primary}15` : colors.surface,
                    borderColor: !selectedSubject ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={[styles.subjectIconBox, { backgroundColor: `${colors.primary}20` }]}>
                  <MaterialIcons name="apps" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.subjectCardLabel, { color: colors.foreground }]}>All</Text>
                <Text style={[styles.subjectCardDesc, { color: colors.muted }]}>Any subject</Text>
              </TouchableOpacity>

              {activecat.subjects.map((subject) => {
                const isSelected = selectedSubject === subject.id;
                return (
                  <TouchableOpacity
                    key={subject.id}
                    onPress={() => handleSelect(subject)}
                    style={[
                      styles.subjectCard,
                      {
                        backgroundColor: isSelected ? `${subject.color}15` : colors.surface,
                        borderColor: isSelected ? subject.color : colors.border,
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.subjectIconBox, { backgroundColor: `${subject.color}20` }]}>
                      <MaterialIcons name={subject.icon as any} size={20} color={subject.color} />
                    </View>
                    <Text
                      style={[styles.subjectCardLabel, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {subject.shortLabel}
                    </Text>
                    <Text
                      style={[styles.subjectCardDesc, { color: colors.muted }]}
                      numberOfLines={2}
                    >
                      {subject.description}
                    </Text>
                    {isSelected && (
                      <View style={[styles.selectedCheck, { backgroundColor: subject.color }]}>
                        <MaterialIcons name="check" size={10} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
    maxWidth: 200,
  },
  triggerDot: { width: 8, height: 8, borderRadius: 4 },
  triggerText: { fontSize: 14, fontWeight: "600", flex: 1 },
  triggerPlaceholder: { fontSize: 14, fontWeight: "500", flex: 1 },
  clearDot: { padding: 2 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800" },
  closeBtn: { padding: 4 },
  catTabs: {
    borderBottomWidth: 0.5,
    paddingVertical: 10,
  },
  catTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  catTabText: { fontSize: 13, fontWeight: "700" },
  subjectScroll: { flex: 1 },
  subjectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 10,
  },
  subjectCard: {
    width: "47%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
    position: "relative",
  },
  subjectIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectCardLabel: { fontSize: 13, fontWeight: "700" },
  subjectCardDesc: { fontSize: 11, lineHeight: 15 },
  selectedCheck: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
