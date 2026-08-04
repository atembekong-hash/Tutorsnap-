import React, { useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { ErrorBoundary } from "@/components/error-boundary";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAssistantContext } from "@/components/contextual-assistant";
import { useColors } from "@/hooks/use-colors";
import * as H from "@/lib/haptics";

type PreviewItem = {
  icon: "pencil.and.list.clipboard" | "bubble.left.and.text.bubble.right.fill" | "chart.line.uptrend.xyaxis";
  title: string;
  description: string;
};

const PREVIEW_ITEMS: PreviewItem[] = [
  {
    icon: "pencil.and.list.clipboard",
    title: "Shared assignments",
    description: "Teachers will be able to post work while learners submit and review progress.",
  },
  {
    icon: "bubble.left.and.text.bubble.right.fill",
    title: "Guided discussion",
    description: "Class conversations will keep academic help organized and focused.",
  },
  {
    icon: "chart.line.uptrend.xyaxis",
    title: "Class progress",
    description: "Simple insights will highlight topics that need more practice.",
  },
];

function ClassroomScreenContent() {
  const colors = useColors();
  const router = useRouter();
  const {
    setContext: setAssistantContext,
    resetContext: resetAssistantContext,
    openTutor,
  } = useAssistantContext();

  useFocusEffect(
    useCallback(() => {
      setAssistantContext({
        source: "classroom",
        title: "Plan class work with AI Tutor",
        detail:
          "Classroom collaboration is not yet available. Help me organize an assignment, study independently, or turn class work into a practice plan.",
      });
      return resetAssistantContext;
    }, [resetAssistantContext, setAssistantContext]),
  );

  const navigate = (pathname: "/(tabs)" | "/(tabs)/practice") => {
    H.impactLight();
    router.push(pathname as any);
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.heroIcon,
            { backgroundColor: `${colors.primary}14` },
          ]}
        >
          <IconSymbol name="person.3.fill" size={42} color={colors.primary} />
        </View>

        <Text style={[styles.eyebrow, { color: colors.primary }]}>COMING SOON</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Classroom collaboration</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>TutorSnap is preparing a focused space for teachers and learners to share assignments, discuss solutions, and track class progress. These collaboration tools are not active yet, so no classroom data will be created or shared from this screen.</Text>

        <View
          style={[
            styles.previewCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.previewTitle, { color: colors.foreground }]}>What is being prepared</Text>
          {PREVIEW_ITEMS.map((item) => (
            <View key={item.title} style={styles.previewRow}>
              <View
                style={[
                  styles.previewIcon,
                  { backgroundColor: `${colors.primary}12` },
                ]}
              >
                <IconSymbol name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.rowText, { color: colors.muted }]}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.alternativeTitle, { color: colors.foreground }]}>Keep learning now</Text>

        <TouchableOpacity
          onPress={openTutor}
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel="Plan class work with AI Tutor"
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          <IconSymbol name="sparkles" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Plan with AI Tutor</Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={() => navigate("/(tabs)")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open Solve"
            style={[
              styles.secondaryButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <IconSymbol name="wand.and.stars" size={18} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Solve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigate("/(tabs)/practice")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open Practice"
            style={[
              styles.secondaryButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <IconSymbol name="pencil.and.list.clipboard" size={18} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Practice</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

export default function ClassroomScreen() {
  return (
    <ErrorBoundary label="Classroom">
      <ClassroomScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 120,
    alignItems: "center",
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.7,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    maxWidth: 580,
  },
  previewCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginTop: 28,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  previewIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  rowText: {
    fontSize: 13,
    lineHeight: 19,
  },
  alternativeTitle: {
    alignSelf: "flex-start",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 26,
    marginBottom: 12,
  },
  primaryButton: {
    width: "100%",
    minHeight: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  buttonRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
