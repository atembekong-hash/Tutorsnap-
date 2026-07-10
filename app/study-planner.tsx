import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  StyleSheet,
  Platform,
  Alert,
  FlatList,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  loadStudySlots,
  upsertStudySlot,
  deleteStudySlot,
  syncPlannerNotifications,
  formatTime,
  generateSlotId,
  WEEKDAY_LABELS,
  WEEKDAY_FULL,
  type StudySlot,
  type Weekday,
} from "@/lib/study-planner";
import { requestNotificationPermission } from "@/lib/notifications";
import { ALL_SUBJECTS, getSubjectColor, getSubjectLabel, type SubjectId } from "@/lib/subjects";

const DURATIONS = [15, 30, 45, 60, 90, 120];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

const SUBJECT_OPTIONS = ALL_SUBJECTS.slice(0, 20); // top 20 subjects for picker

export default function StudyPlannerScreen() {
  const colors = useColors();
  const router = useRouter();
  const [slots, setSlots] = useState<StudySlot[]>([]);
  const [selectedDay, setSelectedDay] = useState<Weekday>(
    (new Date().getDay() as Weekday)
  );
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<StudySlot | null>(null);

  // Form state
  const [formHour, setFormHour] = useState(16);
  const [formMinute, setFormMinute] = useState(0);
  const [formDuration, setFormDuration] = useState(30);
  const [formSubject, setFormSubject] = useState<SubjectId>("algebra");
  const [formLabel, setFormLabel] = useState("");
  const [formNotify, setFormNotify] = useState(true);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStudySlots()
        .then(setSlots)
        .catch(() => { /* load failure degrades gracefully to empty list */ });
    }, [])
  );

  const slotsForDay = slots
    .filter((s) => s.weekday === selectedDay)
    .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

  const openAddModal = () => {
    setEditingSlot(null);
    setFormHour(16);
    setFormMinute(0);
    setFormDuration(30);
    setFormSubject("algebra");
    setFormLabel("");
    setFormNotify(true);
    setShowModal(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openEditModal = (slot: StudySlot) => {
    setEditingSlot(slot);
    setFormHour(slot.hour);
    setFormMinute(slot.minute);
    setFormDuration(slot.durationMinutes);
    setFormSubject(slot.subject);
    setFormLabel(slot.label);
    setFormNotify(slot.notifyEnabled);
    setShowModal(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (formNotify && Platform.OS !== "web") {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Notifications Blocked",
          "Enable notifications in your device settings to receive study reminders.",
          [{ text: "OK" }]
        );
      }
    }
    const slot: StudySlot = {
      id: editingSlot?.id ?? generateSlotId(),
      weekday: selectedDay,
      hour: formHour,
      minute: formMinute,
      durationMinutes: formDuration,
      subject: formSubject,
      label: formLabel.trim() || getSubjectLabel(formSubject),
      notifyEnabled: formNotify,
    };
    try {
      const updated = await upsertStudySlot(slot);
      setSlots(updated);
      await syncPlannerNotifications(updated).catch(() => {});
      setShowModal(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not save study session. Please try again.");
    }
  };

  const handleDelete = (slot: StudySlot) => {
    Alert.alert(
      "Delete Session",
      `Remove "${slot.label}" from ${WEEKDAY_FULL[slot.weekday]}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updated = await deleteStudySlot(slot.id);
              setSlots(updated);
              await syncPlannerNotifications(updated).catch(() => {});
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {
              Alert.alert("Error", "Could not delete session. Please try again.");
            }
          },
        },
      ]
    );
  };

  const totalWeekMinutes = slots.reduce((sum, s) => sum + s.durationMinutes, 0);
  const todaySlots = slots.filter((s) => s.weekday === (new Date().getDay() as Weekday));

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Study Planner</Text>
        <TouchableOpacity onPress={openAddModal} style={[styles.addBtn, { backgroundColor: `${colors.primary}18` }]}>
          <IconSymbol size={20} name="plus.circle.fill" color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Weekly Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{slots.length}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Sessions</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {totalWeekMinutes >= 60
                  ? `${Math.floor(totalWeekMinutes / 60)}h ${totalWeekMinutes % 60}m`
                  : `${totalWeekMinutes}m`}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Weekly</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>{todaySlots.length}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Today</Text>
            </View>
          </View>
        </View>

        {/* Day Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStrip}
        >
          {WEEKDAY_LABELS.map((label, idx) => {
            const day = idx as Weekday;
            const isToday = day === (new Date().getDay() as Weekday);
            const isSelected = day === selectedDay;
            const count = slots.filter((s) => s.weekday === day).length;
            return (
              <TouchableOpacity
                accessibilityLabel="Toggle selected day"
                key={day}
                onPress={() => {
                  setSelectedDay(day);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : isToday ? colors.primary : colors.border,
                    borderWidth: isToday && !isSelected ? 1.5 : 1,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayChipLabel, { color: isSelected ? "#fff" : isToday ? colors.primary : colors.muted }]}>
                  {label}
                </Text>
                {count > 0 && (
                  <View style={[styles.dayBadge, { backgroundColor: isSelected ? "rgba(255,255,255,0.3)" : `${colors.primary}20` }]}>
                    <Text style={[styles.dayBadgeText, { color: isSelected ? "#fff" : colors.primary }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Day Header */}
        <View style={styles.dayHeader}>
          <Text style={[styles.dayTitle, { color: colors.foreground }]}>
            {WEEKDAY_FULL[selectedDay]}
            {selectedDay === (new Date().getDay() as Weekday) && (
              <Text style={{ color: colors.primary }}> · Today</Text>
            )}
          </Text>
          <TouchableOpacity
            onPress={openAddModal}
            style={[styles.addSessionBtn, { borderColor: colors.primary }]}
            activeOpacity={0.75}
          >
            <IconSymbol size={14} name="plus.circle.fill" color={colors.primary} />
            <Text style={[styles.addSessionText, { color: colors.primary }]}>Add Session</Text>
          </TouchableOpacity>
        </View>

        {/* Slots for selected day */}
        {slotsForDay.length === 0 ? (
          <View style={[styles.emptyDay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📅</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No sessions yet</Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>
              Tap "Add Session" to schedule a study block for {WEEKDAY_FULL[selectedDay]}.
            </Text>
          </View>
        ) : (
          <View style={styles.slotsList}>
            {slotsForDay.map((slot) => {
              const subjectColor = getSubjectColor(slot.subject);
              return (
                <TouchableOpacity
                  key={slot.id}
                  onPress={() => openEditModal(slot)}
                  activeOpacity={0.8}
                  style={[styles.slotCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.slotColorBar, { backgroundColor: subjectColor }]} />
                  <View style={styles.slotContent}>
                    <View style={styles.slotTop}>
                      <Text style={[styles.slotTime, { color: colors.foreground }]}>
                        {formatTime(slot.hour, slot.minute)}
                      </Text>
                      <View style={[styles.slotDurationBadge, { backgroundColor: `${subjectColor}18` }]}>
                        <Text style={[styles.slotDurationText, { color: subjectColor }]}>{slot.durationMinutes} min</Text>
                      </View>
                      {slot.notifyEnabled && (
                        <IconSymbol size={14} name="bell.fill" color={colors.primary} />
                      )}
                    </View>
                    <Text style={[styles.slotLabel, { color: colors.foreground }]}>{slot.label}</Text>
                    <Text style={[styles.slotSubject, { color: subjectColor }]}>
                      {getSubjectLabel(slot.subject)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityLabel="Delete"
                    onPress={() => handleDelete(slot)}
                    style={styles.slotDeleteBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <IconSymbol size={18} name="trash.fill" color={colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowModal(false)} accessibilityLabel="Close modal" />
        <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingSlot ? "Edit Session" : `Add Session · ${WEEKDAY_FULL[selectedDay]}`}
            </Text>
            <TouchableOpacity onPress={() => setShowModal(false)}
              accessibilityLabel="Toggle show modal">
              <Text style={[styles.modalClose, { color: colors.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Label */}
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>SESSION LABEL</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={formLabel}
              onChangeText={setFormLabel}
              placeholder={getSubjectLabel(formSubject)}
              placeholderTextColor={colors.muted}
              returnKeyType="done"
            />

            {/* Subject */}
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>SUBJECT</Text>
            <TouchableOpacity
              accessibilityLabel="Toggle show subject picker"
              onPress={() => setShowSubjectPicker(true)}
              style={[styles.subjectTrigger, { backgroundColor: colors.surface, borderColor: getSubjectColor(formSubject) }]}
              activeOpacity={0.75}
            >
              <View style={[styles.subjectDot, { backgroundColor: getSubjectColor(formSubject) }]} />
              <Text style={[styles.subjectTriggerText, { color: getSubjectColor(formSubject) }]}>
                {getSubjectLabel(formSubject)}
              </Text>
              <Text style={{ color: colors.muted }}>{"▾"}</Text>
            </TouchableOpacity>

            {/* Time */}
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>START TIME</Text>
            <View style={styles.timeRow}>
              <View style={styles.timePickerGroup}>
                <Text style={[styles.timePickerLabel, { color: colors.muted }]}>Hour</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timeScrollContent}
                >
                  {HOURS.map((h) => (
                    <TouchableOpacity
                      accessibilityLabel="Toggle form hour"
                      key={h}
                      onPress={() => setFormHour(h)}
                      style={[
                        styles.timeChip,
                        { backgroundColor: formHour === h ? colors.primary : colors.surface, borderColor: formHour === h ? colors.primary : colors.border },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timeChipText, { color: formHour === h ? "#fff" : colors.foreground }]}>
                        {h === 0 ? "12" : h > 12 ? String(h - 12) : String(h)}
                        {h < 12 ? "a" : "p"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.timePickerGroup}>
                <Text style={[styles.timePickerLabel, { color: colors.muted }]}>Minute</Text>
                <View style={styles.minuteRow}>
                  {MINUTES.map((m) => (
                    <TouchableOpacity
                      accessibilityLabel="Toggle form minute"
                      key={m}
                      onPress={() => setFormMinute(m)}
                      style={[
                        styles.minuteChip,
                        { backgroundColor: formMinute === m ? colors.primary : colors.surface, borderColor: formMinute === m ? colors.primary : colors.border },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timeChipText, { color: formMinute === m ? "#fff" : colors.foreground }]}>
                        :{m.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Duration */}
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>DURATION</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((d) => (
                <TouchableOpacity
                  accessibilityLabel="Toggle form duration"
                  key={d}
                  onPress={() => setFormDuration(d)}
                  style={[
                    styles.durationChip,
                    { backgroundColor: formDuration === d ? colors.primary : colors.surface, borderColor: formDuration === d ? colors.primary : colors.border },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.durationChipText, { color: formDuration === d ? "#fff" : colors.foreground }]}>
                    {d < 60 ? `${d}m` : `${d / 60}h`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notify Toggle */}
            <View style={[styles.notifyRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.notifyLeft}>
                <IconSymbol size={18} name="bell.fill" color={formNotify ? colors.primary : colors.muted} />
                <View>
                  <Text style={[styles.notifyTitle, { color: colors.foreground }]}>Remind me</Text>
                  <Text style={[styles.notifySub, { color: colors.muted }]}>Weekly notification at session time</Text>
                </View>
              </View>
              <Switch
                value={formNotify}
                onValueChange={setFormNotify}
                trackColor={{ false: colors.border, true: `${colors.primary}60` }}
                thumbColor={formNotify ? colors.primary : colors.muted}
              />
            </View>

            {/* Preview */}
            <View style={[styles.previewCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
              <Text style={[styles.previewText, { color: colors.primary }]}>
                📅 {WEEKDAY_FULL[selectedDay]} at {formatTime(formHour, formMinute)} · {formDuration < 60 ? `${formDuration} min` : `${formDuration / 60}h`}
              </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              accessibilityLabel="Save"
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <IconSymbol size={18} name={editingSlot ? "pencil.line" : "plus.circle.fill"} color="#fff" />
              <Text style={styles.saveBtnText}>{editingSlot ? "Update Session" : "Add Session"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Subject Picker Sub-Modal */}
        <Modal
          visible={showSubjectPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSubjectPicker(false)}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSubjectPicker(false)} accessibilityLabel="Close subject picker" />
          <View style={[styles.subjectSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choose Subject</Text>
              <TouchableOpacity onPress={() => setShowSubjectPicker(false)}
                accessibilityLabel="Toggle show subject picker">
                <Text style={[styles.modalClose, { color: colors.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={SUBJECT_OPTIONS}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  accessibilityLabel="Toggle form subject"
                  onPress={() => {
                    setFormSubject(item.id);
                    setShowSubjectPicker(false);
                  }}
                  style={[
                    styles.subjectCell,
                    {
                      backgroundColor: formSubject === item.id ? `${item.color}22` : colors.surface,
                      borderColor: formSubject === item.id ? item.color : colors.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                  <Text style={[styles.subjectCellLabel, { color: formSubject === item.id ? item.color : colors.foreground }]} numberOfLines={2}>
                    {item.label}
                  </Text>
                  {formSubject === item.id && <Text style={[{ color: item.color, fontSize: 12, fontWeight: "700" }]}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "700" },
  addBtn: { padding: 8, borderRadius: 20 },
  summaryCard: { marginHorizontal: 16, marginTop: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1, padding: 16 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 22, fontWeight: "800" },
  summaryLabel: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  summaryDivider: { width: 1, height: 36 },
  dayStrip: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignItems: "center", gap: 4 },
  dayChipLabel: { fontSize: 13, fontWeight: "700" },
  dayBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, minWidth: 18, alignItems: "center" },
  dayBadgeText: { fontSize: 10, fontWeight: "700" },
  dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  dayTitle: { fontSize: 18, fontWeight: "700" },
  addSessionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  addSessionText: { fontSize: 13, fontWeight: "600" },
  emptyDay: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  slotsList: { paddingHorizontal: 16, gap: 10 },
  slotCard: { flexDirection: "row", borderRadius: 14, borderWidth: 1, overflow: "hidden", alignItems: "center" },
  slotColorBar: { width: 5, alignSelf: "stretch" },
  slotContent: { flex: 1, padding: 14, gap: 3 },
  slotTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  slotTime: { fontSize: 16, fontWeight: "800" },
  slotDurationBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  slotDurationText: { fontSize: 11, fontWeight: "700" },
  slotLabel: { fontSize: 14, fontWeight: "600" },
  slotSubject: { fontSize: 12, fontWeight: "500" },
  slotDeleteBtn: { padding: 16 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalClose: { fontSize: 18, padding: 4 },
  modalBody: { padding: 20, gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  textInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  subjectTrigger: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12 },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  subjectTriggerText: { flex: 1, fontSize: 15, fontWeight: "600" },
  timeRow: { gap: 12 },
  timePickerGroup: { gap: 6 },
  timePickerLabel: { fontSize: 12, fontWeight: "600" },
  timeScrollContent: { gap: 6, paddingVertical: 2 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, minWidth: 44, alignItems: "center" },
  timeChipText: { fontSize: 13, fontWeight: "700" },
  minuteRow: { flexDirection: "row", gap: 8 },
  minuteChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durationChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  durationChipText: { fontSize: 14, fontWeight: "700" },
  notifyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, marginTop: 8 },
  notifyLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  notifyTitle: { fontSize: 15, fontWeight: "600" },
  notifySub: { fontSize: 12, marginTop: 1 },
  previewCard: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8 },
  previewText: { fontSize: 14, fontWeight: "600" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 16, marginTop: 16 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  subjectSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, maxHeight: "60%" },
  subjectCell: { flex: 1, margin: 4, padding: 12, borderRadius: 12, borderWidth: 1.5, alignItems: "center", minHeight: 72, justifyContent: "center", gap: 4 },
  subjectCellLabel: { fontSize: 12, fontWeight: "600", textAlign: "center", lineHeight: 16 },
});
