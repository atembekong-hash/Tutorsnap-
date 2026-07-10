import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { loadStudySlots, formatTime, type StudySlot } from "@/lib/study-planner";
import { getSubjectDef } from "@/lib/subjects";
import { useFocusEffect } from "expo-router";

/**
 * Compact card shown on the home screen displaying today's scheduled study sessions.
 * Tapping "View All" navigates to the Study Planner screen.
 */
export function TodayStudyWidget() {
  const colors = useColors();
  const router = useRouter();
  const [todaySlots, setTodaySlots] = useState<StudySlot[]>([]);

  const load = useCallback(async () => {
    const all = await loadStudySlots();
    const todayWeekday = new Date().getDay() as StudySlot["weekday"];
    const today = all
      .filter((s) => s.weekday === todayWeekday)
      .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
    setTodaySlots(today);
  }, []);

  // Reload whenever the screen comes into focus (e.g., after editing planner)
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Also load on mount
  useEffect(() => { void load(); }, [load]);

  // Don't render if no sessions today
  if (todaySlots.length === 0) return null;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>📅</Text>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Today's Study Plan</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {todaySlots.length} session{todaySlots.length !== 1 ? "s" : ""} scheduled
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/study-planner" as any)}
          style={[styles.viewAllBtn, { backgroundColor: `${colors.primary}15` }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>Edit</Text>
          <IconSymbol size={12} name="chevron.right" color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Session list (max 3 shown) */}
      <View style={styles.slots}>
        {todaySlots.slice(0, 3).map((slot) => {
          const slotMinutes = slot.hour * 60 + slot.minute;
          const endMinutes = slotMinutes + slot.durationMinutes;
          const isNow = nowMinutes >= slotMinutes && nowMinutes < endMinutes;
          const isPast = nowMinutes >= endMinutes;
          const subjectDef = getSubjectDef(slot.subject);
          const subjectColor = subjectDef?.color ?? colors.primary;

          return (
            <View
              key={slot.id}
              style={[
                styles.slotRow,
                {
                  backgroundColor: isNow ? `${subjectColor}12` : "transparent",
                  borderColor: isNow ? `${subjectColor}30` : colors.border,
                  opacity: isPast ? 0.5 : 1,
                },
              ]}
            >
              {/* Time column */}
              <View style={styles.timeCol}>
                <Text style={[styles.slotTime, { color: isNow ? subjectColor : colors.foreground }]}>
                  {formatTime(slot.hour, slot.minute)}
                </Text>
                <Text style={[styles.slotDuration, { color: colors.muted }]}>
                  {slot.durationMinutes}m
                </Text>
              </View>

              {/* Subject badge */}
              <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}18` }]}>
                <Text style={styles.subjectEmoji}>{subjectDef?.emoji ?? "📚"}</Text>
                <Text style={[styles.subjectLabel, { color: subjectColor }]} numberOfLines={1}>
                  {slot.label}
                </Text>
              </View>

              {/* Status / Timer button */}
              <View style={styles.statusCol}>
                {isNow ? (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/pomodoro" as any,
                        params: {
                          duration: String(slot.durationMinutes),
                          subject: slot.subject,
                          label: slot.label,
                        },
                      })
                    }
                    style={[styles.timerBtn, { backgroundColor: subjectColor }]}
                    activeOpacity={0.8}
                  >
                    <IconSymbol size={12} name="play.fill" color="#FFF" />
                    <Text style={styles.timerBtnText}>Start</Text>
                  </TouchableOpacity>
                ) : isPast ? (
                  <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
                ) : slot.notifyEnabled ? (
                  <IconSymbol size={14} name="bell.fill" color={colors.muted} />
                ) : null}
              </View>
            </View>
          );
        })}
        {todaySlots.length > 3 && (
          <TouchableOpacity
            onPress={() => router.push("/study-planner" as any)}
            style={styles.moreRow}
            activeOpacity={0.7}
          >
            <Text style={[styles.moreText, { color: colors.primary }]}>
              +{todaySlots.length - 3} more sessions — tap to view all
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIcon: { fontSize: 22 },
  title: { fontSize: 15, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 1 },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  viewAllText: { fontSize: 13, fontWeight: "600" },
  slots: { gap: 8 },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeCol: { width: 68 },
  slotTime: { fontSize: 13, fontWeight: "700" },
  slotDuration: { fontSize: 11, marginTop: 1 },
  subjectBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectEmoji: { fontSize: 14 },
  subjectLabel: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
  statusCol: { width: 36, alignItems: "flex-end" },
  nowBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nowText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  moreRow: { paddingVertical: 4, alignItems: "center" },
  moreText: { fontSize: 13, fontWeight: "600" },
  timerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});
