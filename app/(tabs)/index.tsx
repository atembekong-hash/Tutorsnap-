import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { MathKeyboard } from "@/components/math-keyboard";
import { SubjectPicker } from "@/components/subject-picker";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProgress, getStreakEmoji, getDailyGoalPercent, type ProgressData } from "@/lib/progress";
import { getSubjectColor, type SubjectId } from "@/lib/subjects";
import type { HistoryItem } from "@/shared/types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const EXAMPLE_PROBLEMS = [
  { text: "Solve: 2x² + 5x - 3 = 0", subject: "algebra" },
  { text: "Find the derivative of f(x) = x³ + 2x² - 5x + 1", subject: "calculus" },
  { text: "Analyze the symbolism in The Great Gatsby", subject: "american_literature" },
  { text: "Explain Newton's Second Law of Motion with an example", subject: "physics" },
  { text: "What were the main causes of World War I?", subject: "world_history" },
  { text: "What is the difference between mitosis and meiosis?", subject: "biology" },
  { text: "Write a thesis statement for an essay about climate change", subject: "composition" },
  { text: "Explain supply and demand with a real-world example", subject: "economics" },
];

export default function SolveScreen() {
  const colors = useColors();
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useThemeContext();
  const [problem, setProblem] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [showMathKeyboard, setShowMathKeyboard] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const inputRef = useRef<TextInput>(null);
  const cursorPosRef = useRef<number>(0);

  const loadProgress = async () => {
    const p = await getProgress();
    setProgress(p);
  };

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  const solveMutation = trpc.academic.solve.useMutation({
    onSuccess: async (data) => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      const historyItem: HistoryItem = {
        id: `history-${Date.now()}`,
        problem: data.problem || problem,
        answer: data.answer,
        subject: (data.subject || selectedSubject || "other") as any,
        steps: data.steps || [],
        conceptExplained: data.conceptExplained,
        tips: data.tips,
        solvedAt: Date.now(),
      };
      try {
        const existing = await AsyncStorage.getItem("math_history");
        const history: HistoryItem[] = existing ? JSON.parse(existing) : [];
        history.unshift(historyItem);
        await AsyncStorage.setItem("math_history", JSON.stringify(history.slice(0, 100)));
      } catch (e) {
        // ignore
      }
      const { recordSolve } = await import("@/lib/progress");
      await recordSolve((data.subject || selectedSubject || "other") as any);
      await loadProgress();

      router.push({
        pathname: "/solution",
        params: { data: JSON.stringify(data) },
      });
    },
    onError: () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
  });

  const handleSolve = () => {
    if (!problem.trim()) return;
    Keyboard.dismiss();
    setShowMathKeyboard(false);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    solveMutation.mutate({ problem: problem.trim(), subject: selectedSubject });
  };

  const handleExample = (example: typeof EXAMPLE_PROBLEMS[0]) => {
    setProblem(example.text);
    setSelectedSubject(example.subject as SubjectId);
    inputRef.current?.focus();
  };

  const handleInsertSymbol = (symbol: string) => {
    const pos = cursorPosRef.current;
    const newText = problem.slice(0, pos) + symbol + problem.slice(pos);
    setProblem(newText);
    cursorPosRef.current = pos + symbol.length;
  };

  const handleKeyboardBackspace = () => {
    const pos = cursorPosRef.current;
    if (pos > 0) {
      const newText = problem.slice(0, pos - 1) + problem.slice(pos);
      setProblem(newText);
      cursorPosRef.current = pos - 1;
    }
  };

  const handleKeyboardClear = () => {
    setProblem("");
    cursorPosRef.current = 0;
  };

  const streak = progress?.streak;
  const dailyGoalPct = streak ? getDailyGoalPercent(streak.todaySolved, streak.dailyGoal) : 0;
  const streakEmoji = streak ? getStreakEmoji(streak.currentStreak) : "🌱";
  const isDark = colorScheme === "dark";

  // Determine if math keyboard should be shown (only for math subjects)
  const mathSubjects = ["algebra","calculus","geometry","trigonometry","statistics","arithmetic","precalculus","linear_algebra","differential_equations","number_theory"];
  const isMathSubject = !selectedSubject || mathSubjects.includes(selectedSubject);

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: colors.muted }]}>StudyGenius AI</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Ask Any{" "}
                <Text style={{ color: colors.primary }}>Question</Text>
              </Text>
            </View>
            <View style={styles.headerActions}>
              {streak && streak.currentStreak > 0 && (
                <TouchableOpacity
                  onPress={() => router.push("/progress" as any)}
                  style={[styles.streakBadge, { backgroundColor: `${colors.warning}18`, borderColor: `${colors.warning}35` }]}
                >
                  <Text style={styles.streakEmoji}>{streakEmoji}</Text>
                  <Text style={[styles.streakNumber, { color: colors.warning }]}>
                    {streak.currentStreak}
                  </Text>
                </TouchableOpacity>
              )}
              {/* Dark mode toggle */}
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleColorScheme();
                }}
                style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <MaterialIcons
                  name={isDark ? "light-mode" : "dark-mode"}
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>
              {/* Settings */}
              <TouchableOpacity
                onPress={() => router.push("/settings" as any)}
                style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <MaterialIcons name="settings" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Goal Progress */}
          {streak && streak.dailyGoal > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/progress" as any)}
              style={[styles.goalBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <View style={styles.goalBarLeft}>
                <Text style={[styles.goalBarLabel, { color: colors.foreground }]}>Daily Goal</Text>
                <Text style={[styles.goalBarCount, { color: colors.muted }]}>
                  {streak.todaySolved} / {streak.dailyGoal} solved today
                </Text>
              </View>
              <View style={styles.goalBarRight}>
                <View style={[styles.goalBarTrack, { backgroundColor: `${colors.primary}20` }]}>
                  <View
                    style={[
                      styles.goalBarFill,
                      {
                        backgroundColor: dailyGoalPct >= 100 ? colors.success : colors.primary,
                        width: `${Math.min(dailyGoalPct, 100)}%` as any,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.goalBarPct, { color: dailyGoalPct >= 100 ? colors.success : colors.primary }]}>
                  {dailyGoalPct}%
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Subject Picker Row */}
          <View style={styles.subjectRow}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>SUBJECT</Text>
            <View style={{ marginTop: 10 }}>
              <SubjectPicker
                selectedSubject={selectedSubject}
                onSelect={setSelectedSubject}
              />
            </View>
          </View>

          {/* Input */}
          <View style={styles.inputSection}>
            <View
              style={[
                styles.inputCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: solveMutation.isPending ? colors.primary : colors.border,
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.foreground }]}
                placeholder={
                  selectedSubject
                    ? `Type your ${selectedSubject.replace(/_/g, " ")} question here...`
                    : "Type any question or problem here..."
                }
                placeholderTextColor={colors.muted}
                multiline
                value={problem}
                onChangeText={setProblem}
                returnKeyType="done"
                onSubmitEditing={handleSolve}
                onSelectionChange={(e) => {
                  cursorPosRef.current = e.nativeEvent.selection.end;
                }}
                onFocus={() => setShowMathKeyboard(false)}
              />
              <View
                style={[
                  styles.inputActions,
                  { borderTopColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <Text style={[styles.charCount, { color: colors.muted }]}>{problem.length} / 5000</Text>
                <View style={styles.inputActionBtns}>
                  {/* Math Keyboard Toggle — only for math */}
                  {isMathSubject && (
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowMathKeyboard((v) => !v);
                        if (Platform.OS !== "web") {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      style={[
                        styles.keyboardToggleBtn,
                        {
                          backgroundColor: showMathKeyboard ? `${colors.primary}20` : "transparent",
                          borderColor: showMathKeyboard ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.keyboardToggleText, { color: showMathKeyboard ? colors.primary : colors.muted }]}>
                        ∑ Math
                      </Text>
                    </TouchableOpacity>
                  )}
                  {problem.length > 0 && (
                    <TouchableOpacity onPress={() => setProblem("")} style={styles.clearBtn}>
                      <IconSymbol size={18} name="xmark.circle.fill" color={colors.muted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Math Keyboard */}
          {showMathKeyboard && isMathSubject && (
            <MathKeyboard
              onInsert={handleInsertSymbol}
              onBackspace={handleKeyboardBackspace}
              onClear={handleKeyboardClear}
            />
          )}

          {/* Solve Button */}
          <TouchableOpacity
            onPress={handleSolve}
            disabled={!problem.trim() || solveMutation.isPending}
            style={[
              styles.solveBtn,
              { opacity: !problem.trim() || solveMutation.isPending ? 0.6 : 1 },
            ]}
            activeOpacity={0.85}
          >
            <View style={[styles.solveBtnInner, { backgroundColor: colors.primary }]}>
              {solveMutation.isPending ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.solveBtnText}>Solving...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
                  <Text style={styles.solveBtnText}>Solve with AI</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {solveMutation.isError && (
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                backgroundColor: `${colors.error}20`,
                borderWidth: 1,
                borderColor: `${colors.error}40`,
              }}
            >
              <Text style={{ color: colors.error, fontSize: 14, textAlign: "center" }}>
                Failed to solve. Please check your connection and try again.
              </Text>
            </View>
          )}

          {/* Feature Cards Row */}
          <View style={styles.featureRow}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/scan" as any)}
              style={[styles.featureCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIcon, { backgroundColor: colors.primary }]}>
                <IconSymbol size={20} name="camera.fill" color="#FFFFFF" />
              </View>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>Scan</Text>
              <Text style={[styles.featureDesc, { color: colors.muted }]}>Photo to solution</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/practice" as any)}
              style={[styles.featureCard, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}25` }]}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIcon, { backgroundColor: colors.success }]}>
                <IconSymbol size={20} name="pencil.and.list.clipboard" color="#FFFFFF" />
              </View>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>Practice</Text>
              <Text style={[styles.featureDesc, { color: colors.muted }]}>Generated problems</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/progress" as any)}
              style={[styles.featureCard, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}25` }]}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIcon, { backgroundColor: colors.warning }]}>
                <MaterialIcons size={20} name="emoji-events" color="#FFFFFF" />
              </View>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>Progress</Text>
              <Text style={[styles.featureDesc, { color: colors.muted }]}>Stats & streaks</Text>
            </TouchableOpacity>
          </View>

          {/* Example Questions */}
          <View style={styles.examplesSection}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>
              💡 TRY AN EXAMPLE
            </Text>
            {EXAMPLE_PROBLEMS.map((ex, i) => {
              const subjectColor = getSubjectColor(ex.subject);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleExample(ex)}
                  style={[styles.exampleItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  activeOpacity={0.75}
                >
                  <View style={[styles.exampleNum, { backgroundColor: `${subjectColor}20` }]}>
                    <Text style={[styles.exampleNumText, { color: subjectColor }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.exampleText, { color: colors.foreground }]} numberOfLines={2}>
                    {ex.text}
                  </Text>
                  <MaterialIcons name="chevron-right" size={18} color={colors.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  greeting: { fontSize: 13, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginTop: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  streakEmoji: { fontSize: 16 },
  streakNumber: { fontSize: 14, fontWeight: "800" },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  goalBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  goalBarLeft: { flex: 1 },
  goalBarLabel: { fontSize: 13, fontWeight: "700" },
  goalBarCount: { fontSize: 12, marginTop: 2 },
  goalBarRight: { alignItems: "flex-end", gap: 4, minWidth: 80 },
  goalBarTrack: { width: 80, height: 6, borderRadius: 3, overflow: "hidden" },
  goalBarFill: { height: 6, borderRadius: 3 },
  goalBarPct: { fontSize: 12, fontWeight: "700" },
  subjectRow: { paddingHorizontal: 16, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8 },
  inputSection: { paddingHorizontal: 16, marginBottom: 12 },
  inputCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: "top",
  },
  inputActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 0.5,
  },
  charCount: { fontSize: 12 },
  inputActionBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  keyboardToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  keyboardToggleText: { fontSize: 13, fontWeight: "700" },
  clearBtn: { padding: 2 },
  solveBtn: { marginHorizontal: 16, marginBottom: 16 },
  solveBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 18,
    gap: 10,
  },
  solveBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  featureRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  featureCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: { fontSize: 13, fontWeight: "700" },
  featureDesc: { fontSize: 11, textAlign: "center" },
  examplesSection: { paddingHorizontal: 16, gap: 8 },
  exampleItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  exampleNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  exampleNumText: { fontSize: 13, fontWeight: "800" },
  exampleText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
