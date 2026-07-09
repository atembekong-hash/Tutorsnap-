import React, { useState, useRef, useEffect } from "react";
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
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HistoryItem, MathSubject } from "@/shared/types";

const SUBJECTS = [
  { id: "algebra", label: "Algebra", icon: "function" as const },
  { id: "calculus", label: "Calculus", icon: "chart.line.uptrend.xyaxis" as const },
  { id: "geometry", label: "Geometry", icon: "triangle" as const },
  { id: "trigonometry", label: "Trig", icon: "x.squareroot" as const },
  { id: "statistics", label: "Statistics", icon: "chart.bar.fill" as const },
  { id: "arithmetic", label: "Arithmetic", icon: "sum" as const },
] as const;

const EXAMPLE_PROBLEMS = [
  "Solve: 2x² + 5x - 3 = 0",
  "Find the derivative of f(x) = x³ + 2x² - 5x + 1",
  "Calculate the area of a triangle with base 8 and height 6",
  "Simplify: (3x + 2)(x - 4)",
  "Find the integral of sin(x)dx",
  "Solve the system: 2x + y = 7, x - y = 2",
];

export default function SolveScreen() {
  const colors = useColors();
  const router = useRouter();
  const [problem, setProblem] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem("math_history").then((stored) => {
      if (stored) {
        const history = JSON.parse(stored);
        setSolvedCount(history.length);
      }
    });
  }, []);

  const solveMutation = trpc.math.solve.useMutation({
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
        setSolvedCount(history.length);
      } catch (e) {
        // ignore
      }
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
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const fullProblem = selectedSubject
      ? `[${selectedSubject}] ${problem.trim()}`
      : problem.trim();
    solveMutation.mutate({ problem: fullProblem });
  };

  const handleExample = (example: string) => {
    setProblem(example);
    inputRef.current?.focus();
  };

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
            <View>
              <Text style={[styles.greeting, { color: colors.muted }]}>MathGenius AI</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Solve Any{" "}
                <Text style={{ color: colors.primary }}>Math Problem</Text>
              </Text>
            </View>
            {solvedCount > 0 && (
              <View style={[styles.statsBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
                <Text style={[styles.statsNumber, { color: colors.primary }]}>{solvedCount}</Text>
                <Text style={[styles.statsLabel, { color: colors.muted }]}>solved</Text>
              </View>
            )}
          </View>

          {/* Subject Filter */}
          <View style={styles.subjectRow}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>SUBJECT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {SUBJECTS.map((subject) => {
                const isSelected = selectedSubject === subject.id;
                return (
                  <TouchableOpacity
                    key={subject.id}
                    onPress={() => {
                      setSelectedSubject(isSelected ? null : subject.id);
                      if (Platform.OS !== "web") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    style={[
                      styles.subjectChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <IconSymbol
                      size={14}
                      name={subject.icon}
                      color={isSelected ? "#FFFFFF" : colors.muted}
                    />
                    <Text
                      style={[
                        styles.subjectChipText,
                        { color: isSelected ? "#FFFFFF" : colors.foreground },
                      ]}
                    >
                      {subject.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
                placeholder="Type your math problem here..."
                placeholderTextColor={colors.muted}
                multiline
                value={problem}
                onChangeText={setProblem}
                returnKeyType="done"
                onSubmitEditing={handleSolve}
              />
              <View
                style={[
                  styles.inputActions,
                  { borderTopColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <Text style={[styles.charCount, { color: colors.muted }]}>{problem.length} / 5000</Text>
                {problem.length > 0 && (
                  <TouchableOpacity onPress={() => setProblem("")} style={styles.clearBtn}>
                    <IconSymbol size={18} name="xmark.circle.fill" color={colors.muted} />
                  </TouchableOpacity>
                )}
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
              onPress={() => router.push("/scan" as any)}
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
              onPress={() => router.push("/practice" as any)}
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
              onPress={() => router.push("/chat" as any)}
              style={[styles.featureCard, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}25` }]}
              activeOpacity={0.8}
            >
              <View style={[styles.featureIcon, { backgroundColor: colors.success }]}>
                <IconSymbol size={20} name="bubble.left.fill" color="#FFFFFF" />
              </View>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>AI Tutor</Text>
              <Text style={[styles.featureDesc, { color: colors.muted }]}>Ask anything</Text>
            </TouchableOpacity>
          </View>

          {/* Example Problems */}
          <View style={styles.examplesSection}>
            <View style={styles.sectionHeader}>
              <IconSymbol size={16} name="lightbulb.fill" color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Try an Example</Text>
            </View>
            {EXAMPLE_PROBLEMS.map((example, index) => (
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
  statsBadge: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  statsNumber: { fontSize: 22, fontWeight: "800" },
  statsLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
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
    minHeight: 120,
    textAlignVertical: "top",
    lineHeight: 24,
  },
  inputActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  charCount: { fontSize: 12 },
  clearBtn: { padding: 4 },
  solveBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  solveBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  solveBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  featureRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 10,
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
    width: 40,
    height: 40,
    borderRadius: 12,
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
    marginBottom: 12,
    gap: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  exampleCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exampleText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
