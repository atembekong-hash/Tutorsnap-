import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as H from "@/lib/haptics";

export type AssistantSource =
  | "general"
  | "solve"
  | "practice"
  | "scan"
  | "classroom";

export interface AssistantContextEnvelope {
  source: AssistantSource;
  title: string;
  subject?: string | null;
  gradeLevel?: string | null;
  problem?: string | null;
  detail?: string | null;
}

interface ContextualAssistantValue {
  context: AssistantContextEnvelope;
  setContext: (next: AssistantContextEnvelope) => void;
  resetContext: () => void;
  openTutor: () => void;
}

const DEFAULT_CONTEXT: AssistantContextEnvelope = {
  source: "general",
  title: "Ask AI Tutor",
};

const ContextualAssistantContext = createContext<ContextualAssistantValue | null>(
  null,
);

function buildSeedMessage(context: AssistantContextEnvelope): string {
  const grade = context.gradeLevel
    ? ` Adapt the explanation to my level (${context.gradeLevel}).`
    : "";
  const subject = context.subject ? ` Subject: ${context.subject}.` : "";

  if (context.problem?.trim()) {
    if (context.source === "practice") {
      return `I am working on this practice problem: ${context.problem.trim()}${subject}${grade} Please coach me with one useful hint at a time before revealing the final answer.`;
    }
    if (context.source === "solve") {
      return `Help me understand and solve this problem: ${context.problem.trim()}${subject}${grade} Explain the reasoning step by step and check my understanding.`;
    }
    return `Help me with this problem: ${context.problem.trim()}${subject}${grade}`;
  }

  if (context.source === "scan") {
    return `I am using TutorSnap's Scan tool for a problem image.${subject}${grade} ${
      context.detail ??
      "Help me decide what information to capture and how to work through the problem once it is recognized."
    }`;
  }

  if (context.source === "classroom") {
    return `I need help planning or understanding class work.${subject}${grade} ${
      context.detail ?? "Help me turn the task into clear, manageable steps."
    }`;
  }

  const detail = context.detail?.trim();
  return detail
    ? `${detail}${subject}${grade}`
    : `I need help with my current study task.${subject}${grade}`;
}

function ContextualAssistantButton({
  context,
  onPress,
}: {
  context: AssistantContextEnvelope;
  onPress: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const segmentList = segments as readonly string[];
  const isLearnerTab = segmentList[0] === "(tabs)";
  const isChatTab = segmentList[1] === "chat";

  if (!isLearnerTab || isChatTab) return null;

  const hasProblem = Boolean(context.problem?.trim());
  const label = hasProblem ? "Ask about this" : "Ask AI Tutor";

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.anchor,
        {
          top: Math.max(insets.top, 8) + 8,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${context.title}`}
        accessibilityHint="Opens a new AI Tutor conversation with context from this screen"
        style={[
          styles.button,
          {
            borderColor: colors.border,
            shadowColor: colors.foreground,
          },
        ]}
      >
        <View style={styles.iconWrap}>
          <IconSymbol name="sparkles" size={18} color={colors.primary} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function ContextualAssistantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [context, setContextState] =
    useState<AssistantContextEnvelope>(DEFAULT_CONTEXT);

  const setContext = useCallback((next: AssistantContextEnvelope) => {
    setContextState(next);
  }, []);

  const resetContext = useCallback(() => {
    setContextState(DEFAULT_CONTEXT);
  }, []);

  const openTutor = useCallback(() => {
    H.impactMedium();
    router.push({
      pathname: "/(tabs)/chat",
      params: {
        newSession: "1",
        seedMessage: buildSeedMessage(context),
        ...(context.subject ? { subject: context.subject } : {}),
        assistantSource: context.source,
        assistantTitle: context.title,
      },
    } as any);
  }, [context, router]);

  const value = useMemo(
    () => ({ context, setContext, resetContext, openTutor }),
    [context, openTutor, resetContext, setContext],
  );

  return (
    <ContextualAssistantContext.Provider value={value}>
      <View style={styles.provider}>
        {children}
        <ContextualAssistantButton context={context} onPress={openTutor} />
      </View>
    </ContextualAssistantContext.Provider>
  );
}

export function useAssistantContext(): ContextualAssistantValue {
  const value = useContext(ContextualAssistantContext);
  if (!value) {
    throw new Error(
      "useAssistantContext must be used inside ContextualAssistantProvider",
    );
  }
  return value;
}

const styles = StyleSheet.create({
  provider: {
    flex: 1,
  },
  anchor: {
    position: "absolute",
    right: 16,
    zIndex: 1000,
  },
  button: {
    width: 38,
    height: 38,
    paddingHorizontal: 0,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: Platform.OS === "web" ? 0.08 : 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.1,
    flexShrink: 1,
  },
});
