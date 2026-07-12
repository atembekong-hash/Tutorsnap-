import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import * as H from "@/lib/haptics";
import { useColors } from "@/hooks/use-colors";
import type { WeeklyData } from "@/lib/weekly-goals";
import { setWeeklyQuizGoal } from "@/lib/weekly-goals";

// ─── Progress Ring ─────────────────────────────────────────────────────────────
const RING_SIZE = 72;
const STROKE = 7;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ProgressRing({
  pct,
  color,
  bg,
  children,
}: {
  pct: number;
  color: string;
  bg: string;
  children?: React.ReactNode;
}) {
  const progress = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" }}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: "absolute" }}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={bg}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

// ─── Goal Picker Modal ─────────────────────────────────────────────────────────
const GOAL_OPTIONS = [1, 2, 3, 5, 7, 10, 14];

function GoalPickerModal({
  visible,
  current,
  onSelect,
  onClose,
  colors,
}: {
  visible: boolean;
  current: number;
  onSelect: (n: number) => void;
  onClose: () => void;
  colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Weekly Quiz Goal</Text>
          <Text style={[styles.modalSub, { color: colors.muted }]}>How many quizzes do you want to complete per week?</Text>
          <View style={styles.goalGrid}>
            {GOAL_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => onSelect(n)}
                style={[
                  styles.goalChip,
                  {
                    backgroundColor: current === n ? colors.primary : colors.border,
                    borderColor: current === n ? colors.primary : "transparent",
                  },
                ]}
                activeOpacity={0.75}
              >
                <Text style={[styles.goalChipText, { color: current === n ? "#fff" : colors.foreground }]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.modalDone, { backgroundColor: colors.primary }]}>
            <Text style={styles.modalDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Activity Cell ─────────────────────────────────────────────────────────────
function ActivityCell({
  quizzes,
  solves,
  label,
  isToday,
  colors,
}: {
  quizzes: number;
  solves: number;
  label: string;
  isToday: boolean;
  colors: any;
}) {
  const activity = quizzes + Math.floor(solves / 2);
  const intensity = activity === 0 ? 0 : activity <= 1 ? 1 : activity <= 3 ? 2 : 3;
  const bgColors = [
    colors.border,
    `${colors.primary}40`,
    `${colors.primary}70`,
    colors.primary,
  ];
  return (
    <View style={styles.cellWrapper}>
      <View
        style={[
          styles.cell,
          {
            backgroundColor: bgColors[intensity],
            borderColor: isToday ? colors.primary : "transparent",
            borderWidth: isToday ? 2 : 0,
          },
        ]}
      />
      <Text style={[styles.cellLabel, { color: isToday ? colors.primary : colors.muted }]}>
        {label}
      </Text>
    </View>
  );
}

// ─── Main Card ─────────────────────────────────────────────────────────────────
export function WeeklyGoalsCard({
  data,
  onGoalChanged,
}: {
  data: WeeklyData;
  onGoalChanged: (newGoal: number) => void;
}) {
  const colors = useColors();
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleSelectGoal = async (n: number) => {
    H.impactLight()
    await setWeeklyQuizGoal(n);
    onGoalChanged(n);
    setPickerVisible(false);
  };

  const ringColor = data.goalPct >= 100 ? colors.success : data.goalPct >= 50 ? colors.primary : colors.warning;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>📅 This Week</Text>
        <TouchableOpacity
          accessibilityLabel="Toggle picker visible"
          onPress={() => setPickerVisible(true)}
          style={[styles.goalBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
          activeOpacity={0.75}
        >
          <Text style={[styles.goalBtnText, { color: colors.primary }]}>
            Goal: {data.weeklyGoal} quiz{data.weeklyGoal !== 1 ? "zes" : ""}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Progress Ring */}
        <ProgressRing pct={data.goalPct} color={ringColor} bg={colors.border}>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.ringCount, { color: ringColor }]}>{data.quizzesThisWeek}</Text>
            <Text style={[styles.ringLabel, { color: colors.muted }]}>/ {data.weeklyGoal}</Text>
          </View>
        </ProgressRing>

        {/* Activity Grid */}
        <View style={styles.grid}>
          {data.days.map((day) => (
            <ActivityCell
              key={day.date}
              quizzes={day.quizzes}
              solves={day.solves}
              label={day.label}
              isToday={day.isToday}
              colors={colors}
            />
          ))}
        </View>
      </View>

      {/* Status line */}
      <Text style={[styles.statusLine, { color: colors.muted }]}>
        {data.goalPct >= 100
          ? "🎉 Weekly goal reached! Great work."
          : `${data.weeklyGoal - data.quizzesThisWeek} more quiz${data.weeklyGoal - data.quizzesThisWeek !== 1 ? "zes" : ""} to hit your goal`}
      </Text>

      <GoalPickerModal
        visible={pickerVisible}
        current={data.weeklyGoal}
        onSelect={handleSelectGoal}
        onClose={() => setPickerVisible(false)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: { fontSize: 15, fontWeight: "700" },
  goalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  goalBtnText: { fontSize: 12, fontWeight: "600" },
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  grid: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cellWrapper: { alignItems: "center", gap: 4 },
  cell: { width: 28, height: 28, borderRadius: 7 },
  cellLabel: { fontSize: 10, fontWeight: "600" },
  ringCount: { fontSize: 18, fontWeight: "800", lineHeight: 22 },
  ringLabel: { fontSize: 11, fontWeight: "600" },
  statusLine: { fontSize: 12, marginTop: 12, textAlign: "center" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  modalSub: { fontSize: 13, marginBottom: 20 },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  goalChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  goalChipText: { fontSize: 15, fontWeight: "700" },
  modalDone: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalDoneText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
