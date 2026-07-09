import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProgress, getStreakEmoji, getDailyGoalPercent, type ProgressData } from "@/lib/progress";
import type { HistoryItem, MathSubject } from "@/shared/types";
import { SubjectPicker } from "@/components/subject-picker";
import { type SubjectId, getSubjectDef } from "@/lib/subjects";

// Subject examples per category — shown dynamically based on selected subject
const SUBJECT_EXAMPLES: Record<string, string[]> = {
  // Math
  algebra:                ["Solve: 2x² + 5x - 3 = 0", "Factor: x² - 9", "Simplify: (3x + 2)(x - 4)", "Solve: |2x - 1| = 7"],
  calculus:               ["Find the derivative of f(x) = x³ + 2x²", "Evaluate ∫sin(x)dx", "Find the limit as x→0 of sin(x)/x", "Use the chain rule on f(x) = (x²+1)⁵"],
  geometry:               ["Find the area of a triangle with base 8 and height 6", "Calculate the circumference of a circle with radius 5", "Find the hypotenuse of a right triangle with legs 3 and 4", "What is the sum of interior angles of a hexagon?"],
  trigonometry:           ["Solve: sin(x) = 0.5 for 0 ≤ x ≤ 2π", "Simplify: sin²(x) + cos²(x)", "Find cos(75°) using sum formula", "Solve: 2cos(x) - 1 = 0"],
  statistics:             ["Find the mean, median, and mode of: 4, 7, 7, 9, 11", "What is the standard deviation of: 2, 4, 4, 4, 5, 5, 7, 9?", "A coin is flipped 3 times. What is P(exactly 2 heads)?", "Calculate the z-score for x=75, μ=70, σ=5"],
  arithmetic:             ["Simplify: 3 + 4 × 2 - 1", "What is 15% of 240?", "Convert 3/4 to a decimal", "Find the GCF of 48 and 72"],
  // English
  american_literature:    ["Analyze the symbolism of the green light in The Great Gatsby", "Compare Hester Prynne and Huck Finn as outsiders", "What is the theme of self-reliance in Emerson's essays?", "Analyze the use of irony in The Catcher in the Rye"],
  british_literature:     ["Analyze Hamlet's 'To be or not to be' soliloquy", "What is the significance of the moors in Wuthering Heights?", "Discuss the social critique in Pride and Prejudice", "Analyze the symbolism in 1984 by George Orwell"],
  world_literature:       ["Analyze the theme of alienation in Kafka's The Metamorphosis", "What is magical realism in One Hundred Years of Solitude?", "Discuss the role of fate in Oedipus Rex", "Analyze the theme of honor in Don Quixote"],
  composition:            ["Write a thesis statement for an essay on climate change", "How do I write a strong introduction paragraph?", "What is the difference between a claim and evidence?", "How do I improve the flow of my essay?"],
  creative_writing:       ["How do I write a compelling opening line for a short story?", "What is 'show, don't tell' and how do I use it?", "How do I develop a believable antagonist?", "Write a metaphor for loneliness"],
  debate:                 ["What are the strongest arguments for renewable energy?", "How do I rebut the argument that social media is harmful?", "What is the Toulmin model of argumentation?", "Build an argument for universal basic income"],
  journalism:             ["Write a lead sentence for a story about a school fire", "What is the inverted pyramid structure?", "How do I write an objective news report?", "What questions should I ask in an interview?"],
  grammar:                ["When do I use 'who' vs 'whom'?", "What is a dangling modifier? Give an example", "Explain the difference between active and passive voice", "When should I use a semicolon?"],
  poetry:                 ["Analyze the meter of Shakespeare's Sonnet 18", "What is the effect of enjambment in a poem?", "Identify the literary devices in 'The Road Not Taken'", "What is the difference between a simile and a metaphor?"],
  // Science
  biology:                ["Explain the process of mitosis", "What is the difference between DNA and RNA?", "How does natural selection work?", "Explain the role of ATP in cellular respiration"],
  chemistry:              ["Balance: Fe + O₂ → Fe₂O₃", "What is the pH of a 0.01 M HCl solution?", "Explain covalent vs ionic bonding", "Calculate the molar mass of H₂SO₄"],
  physics:                ["A car accelerates from 0 to 60 m/s in 10 seconds. Find the acceleration.", "Calculate the force needed to accelerate a 5 kg object at 3 m/s²", "What is the kinetic energy of a 2 kg object moving at 4 m/s?", "Explain Newton's Third Law with an example"],
  earth_science:          ["Explain the rock cycle", "What causes earthquakes?", "Describe the layers of the Earth", "How do tectonic plates move?"],
  space_science:          ["Why do planets orbit the sun?", "What is the difference between a star and a planet?", "Explain the life cycle of a star", "What causes lunar phases?"],
  environmental_science:  ["Explain the greenhouse effect", "What is the difference between weather and climate?", "How does deforestation affect biodiversity?", "Explain the nitrogen cycle"],
  anatomy:                ["Describe the function of the mitral valve", "What is the role of the hypothalamus?", "Explain how the immune system responds to infection", "Describe the structure of a neuron"],
  forensics:              ["How is DNA evidence collected and analyzed?", "What is the chain of custody in forensic science?", "Explain how fingerprint analysis works", "What is the difference between primary and secondary crime scenes?"],
  general_science:        ["What is the scientific method?", "Explain the difference between a hypothesis and a theory", "What is the difference between physical and chemical changes?", "Explain the law of conservation of energy"],
  // Social Studies
  us_history:             ["What caused the Civil War?", "Explain the significance of the New Deal", "What were the main causes of the American Revolution?", "How did the Civil Rights Movement change American law?"],
  world_history:          ["What caused World War I?", "Explain the significance of the French Revolution", "How did the Industrial Revolution change society?", "What were the causes and effects of the Cold War?"],
  government:             ["Explain the system of checks and balances", "What is the difference between a democracy and a republic?", "How does a bill become a law?", "What are the three branches of the U.S. government?"],
  economics:              ["Explain supply and demand with an example", "What is the difference between GDP and GNP?", "What causes inflation?", "Explain the concept of opportunity cost"],
  geography:              ["What is the difference between latitude and longitude?", "Explain how mountains affect climate", "What is the Ring of Fire?", "How do river deltas form?"],
  psychology:             ["Explain Maslow's hierarchy of needs", "What is cognitive dissonance?", "Describe the stages of Piaget's cognitive development theory", "What is the difference between classical and operant conditioning?"],
  sociology:              ["What is social stratification?", "Explain Durkheim's concept of anomie", "What is the difference between a primary and secondary group?", "How does socialization shape identity?"],
  civics:                 ["What rights are protected by the First Amendment?", "Explain the Electoral College", "What is the role of the Supreme Court?", "What is the difference between civil and criminal law?"],
  other:                  ["Explain this concept to me", "Help me understand this topic", "What are the key ideas here?", "Give me an overview of this subject"],
};
const DEFAULT_EXAMPLES = [
  "Solve: 2x² + 5x - 3 = 0",
  "Find the derivative of f(x) = x³ + 2x²",
  "Analyze the symbolism in The Great Gatsby",
  "Explain the process of mitosis",
  "What caused World War I?",
  "Balance: Fe + O₂ → Fe₂O₃",
];


export default function SolveScreen() {
  const colors = useColors();
  const router = useRouter();
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
        subject: data.subject as MathSubject,
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
      // Record solve in progress
      const { recordSolve } = await import("@/lib/progress");
      await recordSolve(data.subject as MathSubject || "other");
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
    const fullProblem = problem.trim();
    solveMutation.mutate({ problem: fullProblem, subject: selectedSubject ?? "other" });
  };

  const handleExample = (example: string) => {
    setProblem(example);
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
  const dailyGoalPct = streak
    ? getDailyGoalPercent(streak.todaySolved, streak.dailyGoal)
    : 0;
  const streakEmoji = streak ? getStreakEmoji(streak.currentStreak) : "🌱";

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={showMathKeyboard ? 0 : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.muted }]}>StudyGenius AI</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Solve Any{" "}
                <Text style={{ color: colors.primary }}>Problem</Text>
              </Text>
            </View>
            {streak && streak.currentStreak > 0 && (
              <TouchableOpacity
                onPress={() => router.push("/progress" as any)}
                style={[styles.streakBadge, { backgroundColor: `${colors.warning}18`, borderColor: `${colors.warning}35` }]}
              >
                <Text style={styles.streakEmoji}>{streakEmoji}</Text>
                <View>
                  <Text style={[styles.streakNumber, { color: colors.warning }]}>
                    {streak.currentStreak}
                  </Text>
                  <Text style={[styles.streakLabel, { color: colors.muted }]}>day streak</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Daily Goal Progress */}
          {streak && streak.dailyGoal > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/progress" as any)}
              style={[styles.goalBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <View style={styles.goalBarLeft}>
                <Text style={[styles.goalBarLabel, { color: colors.foreground }]}>
                  Daily Goal
                </Text>
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
                        width: `${dailyGoalPct}%`,
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

          {/* Subject Picker */}
          <View style={styles.subjectRow}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>SUBJECT</Text>
            <View style={{ marginTop: 10 }}>
              <SubjectPicker
                value={selectedSubject}
                onChange={(id) => setSelectedSubject(id)}
                showAll
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
                placeholder="Type your question or problem here..."
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
                  {/* Math Keyboard Toggle */}
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
                  {problem.length > 0 && (
                    <TouchableOpacity onPress={() => setProblem("")} style={styles.clearBtn}>
                      <IconSymbol size={18} name="xmark.circle.fill" color={colors.muted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>

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
                  <IconSymbol size={20} name="wand.and.stars" color="#FFFFFF" />
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
              style={[styles.featureCard, { backgroundColor: `${colors.secondary}12`, borderColor: `${colors.secondary}25` }]}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
                <IconSymbol size={20} name="pencil.and.list.clipboard" color="#FFFFFF" />
              </View>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>Practice</Text>
              <Text style={[styles.featureDesc, { color: colors.muted }]}>Generated problems</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/progress" as any)}
              style={[styles.featureCard, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}25` }]}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIcon, { backgroundColor: colors.success }]}>
                <IconSymbol size={20} name="chart.bar.fill" color="#FFFFFF" />
              </View>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>Progress</Text>
              <Text style={[styles.featureDesc, { color: colors.muted }]}>Stats & streaks</Text>
            </TouchableOpacity>
          </View>

          {/* Example Problems */}
          <View style={styles.examplesSection}>
            <View style={styles.sectionHeader}>
              <IconSymbol size={16} name="lightbulb.fill" color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Try an Example</Text>
            </View>
            {(selectedSubject && SUBJECT_EXAMPLES[selectedSubject] ? SUBJECT_EXAMPLES[selectedSubject] : DEFAULT_EXAMPLES).map((example, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleExample(example)}
                style={[
                  styles.exampleCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: `${colors.primary}20`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={[styles.exampleText, { color: colors.foreground }]}>
                  {example}
                </Text>
                <IconSymbol size={16} name="chevron.right" color={colors.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Math Keyboard */}
        {showMathKeyboard && (
          <MathKeyboard
            onInsert={handleInsertSymbol}
            onBackspace={handleKeyboardBackspace}
            onClear={handleKeyboardClear}
          />
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    gap: 6,
  },
  streakEmoji: { fontSize: 20 },
  streakNumber: { fontSize: 20, fontWeight: "800", lineHeight: 24 },
  streakLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },
  goalBar: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  goalBarLeft: { flex: 1 },
  goalBarLabel: { fontSize: 13, fontWeight: "700" },
  goalBarCount: { fontSize: 12, marginTop: 2 },
  goalBarRight: { alignItems: "flex-end", gap: 4 },
  goalBarTrack: {
    width: 80,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  goalBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  goalBarPct: { fontSize: 11, fontWeight: "700" },
  subjectRow: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    gap: 5,
  },
  subjectChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  inputCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  input: {
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
    lineHeight: 24,
  },
  inputActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 0.5,
  },
  charCount: { fontSize: 12 },
  inputActionBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  keyboardToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  keyboardToggleText: { fontSize: 13, fontWeight: "700" },
  clearBtn: { padding: 2 },
  solveBtn: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    overflow: "hidden",
  },
  solveBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    gap: 10,
  },
  solveBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  featureRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 10,
  },
  featureCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
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
  featureDesc: { fontSize: 11, textAlign: "center", lineHeight: 15 },
  examplesSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  exampleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  exampleText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
