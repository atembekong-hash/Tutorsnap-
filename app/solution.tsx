import React, { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AIResponseRenderer, AIResponseErrorBoundary } from "@/components/ai-response-renderer";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Image,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { toggleBookmark, isBookmarked } from "@/lib/bookmarks";
import type { MathSolution, SolutionStep, HistoryItem, MathSubject, StudyBlock } from "@/shared/types";
import { getSubjectColor, getSubjectLabel } from "@/lib/subjects";
import { useFontSize } from "@/lib/font-size-provider";
import { trpc } from "@/lib/trpc";
import { getMyClassroom, getJoinedClassroom, shareToClassroom } from "@/lib/classroom";
import { createSession, renameSession } from "@/lib/chat-sessions";
import { APP_URL } from "@/constants/app";
import { loadGlobalGrade, GRADE_LABELS } from "@/lib/grade-levels";
import { getProgress, getStreakEmoji, type ProgressData } from "@/lib/progress";
import { cleanMathText } from "@/lib/clean-math-text";
import { SubmissionReadyCard } from "@/components/submission-ready-card";
import { StudyBlockCard, StudyBlockSkeleton } from "@/components/study-block-card";
import { SolvingOverlay } from "@/components/skeleton";
import { useScreenTransition } from "@/hooks/use-screen-transition";

function StepCard({ step, colors, fs, delay = 0 }: { step: SolutionStep; colors: any; fs: (n: number) => number; delay?: number }) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copiedExpr, setCopiedExpr] = useState(false);
  const copiedExprTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay, useNativeDriver: true }),
    ]).start();
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (copiedExprTimerRef.current) clearTimeout(copiedExprTimerRef.current);
    };
  }, []);

  const handleCopyStep = async (e: any) => {
    e.stopPropagation?.();
    try {
      const text = `Step ${step.stepNumber}: ${step.title}\n${step.expression ? step.expression + "\n" : ""}${step.explanation}`;
      await Clipboard.setStringAsync(text);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
    <TouchableOpacity
      accessibilityLabel="Toggle expanded"
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
      style={[styles.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.stepHeader}>
        <View style={[styles.stepNumber, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={[styles.stepNumberText, { color: colors.primary, fontSize: fs(13) }]}>{step.stepNumber}</Text>
        </View>
        <Text style={[styles.stepTitle, { color: colors.foreground, fontSize: fs(14) }]} numberOfLines={expanded ? undefined : 1}>
          {step.title}
        </Text>
        <TouchableOpacity
          accessibilityLabel={`Copy step ${step.stepNumber}`}
          onPress={handleCopyStep}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.copyBtn, { backgroundColor: copied ? `${colors.success}20` : "transparent", marginRight: 2 }]}
        >
          <IconSymbol size={13} name={copied ? "checkmark.circle.fill" : "doc.on.doc"} color={copied ? colors.success : colors.muted} />
        </TouchableOpacity>
        <IconSymbol
          size={18}
          name={expanded ? "chevron.up" : "chevron.down"}
          color={colors.muted}
        />
      </View>
      {expanded && (
        <View style={styles.stepBody}>
          {step.expression && (
            // Expression box: render LaTeX/math expressions via pipeline
            <View style={[styles.expressionBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
              <View style={{ flex: 1 }}>
                <AIResponseErrorBoundary
                  fallbackText={step.expression}
                  fontSize={fs(16)}
                  color={colors.primary}
                >
                  <AIResponseRenderer
                    markdown={step.expression}
                    fontSize={fs(16)}
                    color={colors.primary}
                    codeBackground={`${colors.primary}10`}
                    flavor="github"
                    stripPreamble={false}
                  />
                </AIResponseErrorBoundary>
              </View>
              <TouchableOpacity
                accessibilityLabel="Copy expression"
                onPress={async (e) => {
                  e.stopPropagation?.();
                  try {
                    await Clipboard.setStringAsync(step.expression!);
                    H.impactLight();
                    setCopiedExpr(true);
                    if (copiedExprTimerRef.current) clearTimeout(copiedExprTimerRef.current);
                    copiedExprTimerRef.current = setTimeout(() => setCopiedExpr(false), 1800);
                  } catch { /* ignore */ }
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[styles.copyBtn, { backgroundColor: copiedExpr ? `${colors.success}20` : `${colors.primary}15`, alignSelf: "flex-start", marginLeft: 8, flexDirection: "row", alignItems: "center", gap: 3 }]}
              >
                <IconSymbol size={13} name={copiedExpr ? "checkmark.circle.fill" : "doc.on.doc"} color={copiedExpr ? colors.success : colors.primary} />
                {copiedExpr && <Text style={{ fontSize: 10, fontWeight: "700", color: colors.success }}>Copied!</Text>}
              </TouchableOpacity>
            </View>
          )}
          {/* Step explanation: full Markdown + LaTeX rendering */}
          <AIResponseErrorBoundary
            fallbackText={step.explanation}
            fontSize={fs(14)}
            color={colors.foreground}
          >
            <AIResponseRenderer
              markdown={step.explanation}
              fontSize={fs(14)}
              color={colors.foreground}
              codeBackground={colors.surface}
              flavor="github"
              stripPreamble={false}
            />
          </AIResponseErrorBoundary>
        </View>
      )}
    </TouchableOpacity>
    </Animated.View>
  );
}

function WorkedExampleCopyButton({
  problem,
  solution: workedSolution,
  title,
  colors,
  fs,
}: {
  problem: string;
  solution?: string;
  title?: string;
  colors: ReturnType<typeof useColors>;
  fs: (n: number) => number;
}) {
  const [copiedProblem, setCopiedProblem] = useState(false);
  const [copiedSolution, setCopiedSolution] = useState(false);
  const problemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const solutionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      <TouchableOpacity
        accessibilityLabel="Copy example problem to clipboard"
        accessibilityRole="button"
        onPress={async () => {
          try {
            await Clipboard.setStringAsync(problem);
            setCopiedProblem(true);
            H.impactLight();
            if (problemTimerRef.current) clearTimeout(problemTimerRef.current);
            problemTimerRef.current = setTimeout(() => setCopiedProblem(false), 2000);
          } catch { /* ignore */ }
        }}
        style={[
          styles.copyBtn,
          { backgroundColor: copiedProblem ? `${colors.success}20` : `${colors.success}15` },
        ]}
        activeOpacity={0.75}
      >
        <IconSymbol
          size={14}
          name={copiedProblem ? "checkmark.circle.fill" : "doc.on.doc"}
          color={colors.success}
        />
        <Text style={[styles.copyText, { color: colors.success, fontSize: fs(12) }]}>
          {copiedProblem ? "Copied!" : "Problem"}
        </Text>
      </TouchableOpacity>
      {workedSolution && (
        <TouchableOpacity
          accessibilityLabel="Copy full worked solution to clipboard"
          accessibilityRole="button"
          onPress={async () => {
            try {
              const fullText = `${title ? title + "\n" : ""}PROBLEM:\n${problem}\n\nSOLUTION:\n${workedSolution}`;
              await Clipboard.setStringAsync(fullText);
              setCopiedSolution(true);
              H.impactLight();
              if (solutionTimerRef.current) clearTimeout(solutionTimerRef.current);
              solutionTimerRef.current = setTimeout(() => setCopiedSolution(false), 2000);
            } catch { /* ignore */ }
          }}
          style={[
            styles.copyBtn,
            { backgroundColor: copiedSolution ? `${colors.success}20` : `${colors.success}15` },
          ]}
          activeOpacity={0.75}
        >
          <IconSymbol
            size={14}
            name={copiedSolution ? "checkmark.circle.fill" : "doc.on.doc"}
            color={colors.success}
          />
          <Text style={[styles.copyText, { color: colors.success, fontSize: fs(12) }]}>
            {copiedSolution ? "Copied!" : "Solution"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SolutionScreen() {
  const colors = useColors();
  const { fs } = useFontSize();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [bookmarked, setBookmarked] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyProblemFeedback, setCopyProblemFeedback] = useState(false);
  const copyProblemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyStepsFeedback, setCopyStepsFeedback] = useState(false);
  const copyStepsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyConceptFeedback, setCopyConceptFeedback] = useState(false);
  const copyConceptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyTipsFeedback, setCopyTipsFeedback] = useState(false);
  const copyTipsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyAltFeedback, setCopyAltFeedback] = useState(false);
  const copyAltTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);
  const copyLinkFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarProblems, setSimilarProblems] = useState<{ id: string; problem: string; hint: string }[]>([]);
  const [expandedHint, setExpandedHint] = useState<string | null>(null);
  const [copiedProblemId, setCopiedProblemId] = useState<string | null>(null);
  const copiedProblemIdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copiedHintId, setCopiedHintId] = useState<string | null>(null);
  const copiedHintIdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [markdownPreviewText, setMarkdownPreviewText] = useState<string | null>(null);
  const markdownPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [headerTooltip, setHeaderTooltip] = useState<string | null>(null);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [headerIconsSeenRef] = useState(() => ({ seen: false }));
  const showHeaderTooltip = useCallback((label: string) => {
    if (headerIconsSeenRef.seen) return;
    headerIconsSeenRef.seen = true;
    AsyncStorage.setItem("@tutorsnap/headerIconsSeen", "1").catch(() => {});
    setHeaderTooltip(label);
    tooltipOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(tooltipOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(tooltipOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setHeaderTooltip(null));
  }, [headerIconsSeenRef, tooltipOpacity]);
  useEffect(() => {
    AsyncStorage.getItem("@tutorsnap/headerIconsSeen").then((v) => {
      if (v === "1") headerIconsSeenRef.seen = true;
    });
  }, [headerIconsSeenRef]);
  // Cleanup all feedback timers on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
      if (copyLinkFeedbackTimerRef.current) clearTimeout(copyLinkFeedbackTimerRef.current);
      if (copiedProblemIdTimerRef.current) clearTimeout(copiedProblemIdTimerRef.current);
      if (copyProblemTimerRef.current) clearTimeout(copyProblemTimerRef.current);
      if (copyStepsTimerRef.current) clearTimeout(copyStepsTimerRef.current);
      if (copyConceptTimerRef.current) clearTimeout(copyConceptTimerRef.current);
      if (copyTipsTimerRef.current) clearTimeout(copyTipsTimerRef.current);
      if (copyAltTimerRef.current) clearTimeout(copyAltTimerRef.current);
      if (copiedHintIdTimerRef.current) clearTimeout(copiedHintIdTimerRef.current);
      if (markdownPreviewTimerRef.current) clearTimeout(markdownPreviewTimerRef.current);
      if (saveNoteTimerRef.current) clearTimeout(saveNoteTimerRef.current);
      if (studyBlockSavedTimerRef.current) clearTimeout(studyBlockSavedTimerRef.current);
    };
  }, []);
  const scrollRef = useRef<InstanceType<typeof ScrollView>>(null);
  const submissionReadyYRef = useRef(0);
  const similarYRef = useRef(0);
  const [saveNoteFeedback, setSaveNoteFeedback] = useState(false);
  const saveNoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [studyBlockSavedToast, setStudyBlockSavedToast] = useState<string | null>(null);
  const studyBlockSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleJumpToSubmission = () => {
    H.impactLight();
    scrollRef.current?.scrollTo({ y: submissionReadyYRef.current - 16, animated: true });
  };

  const generateSimilarMutation = trpc.math.generateSimilar.useMutation({
    onSuccess: (data) => {
      if (data.problems?.length > 0) {
        setSimilarProblems(data.problems);
      }
    },
  });
  const [discussLoading, setDiscussLoading] = useState(false);
  const [explainDiffLoading, setExplainDiffLoading] = useState(false);
  const [altExplanation, setAltExplanation] = useState<string | null>(null);
  // Study View state
  const [viewMode, setViewMode] = useState<"steps" | "study">("steps");
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([]);
  const [studyBlocksLoading, setStudyBlocksLoading] = useState(false);
  const [studyBlocksError, setStudyBlocksError] = useState<string | null>(null);
  const generateStudyBlocksMutation = trpc.academic.generateStudyBlocks.useMutation({
    onSuccess: (data) => {
      setStudyBlocks(data.blocks as StudyBlock[]);
      setStudyBlocksLoading(false);
      setStudyBlocksError(null);
    },
    onError: () => {
      setStudyBlocksLoading(false);
      setStudyBlocksError("Could not generate study blocks. Please try again.");
    },
  });
  const [showAltExplanation, setShowAltExplanation] = useState(false);
  const [altExplanationCached, setAltExplanationCached] = useState(false); // true = loaded from cache
  const [explainStyle, setExplainStyle] = useState<"analogy" | "step-by-step" | "visual">("analogy");
  const [explainCount, setExplainCount] = useState(0); // how many times regenerated
  const [activeCardStyle, setActiveCardStyle] = useState<"analogy" | "step-by-step" | "visual">("analogy"); // style that produced the current card
  const [altRating, setAltRating] = useState<"up" | "down" | null>(null); // thumbs rating for current explanation
  const [seenStyles, setSeenStyles] = useState<Set<string>>(new Set()); // tracks which styles have been used
  const explainDiffMutation = trpc.math.explainDifferently.useMutation();

  // Auto-solve state: triggered when a feed card has no cached solution
  const solveMutation = trpc.math.solve.useMutation();
  const [autoSolving, setAutoSolving] = useState(false);
  const [autoSolveError, setAutoSolveError] = useState<string | null>(null);
  const [liveSolution, setLiveSolution] = useState<MathSolution | null>(null);
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Load global grade, progress, and avatar on mount
  useEffect(() => {
    loadGlobalGrade().then((g: string | null) => { if (g) setGradeLevel(g); });
    getProgress().then(setProgressData);
    AsyncStorage.getItem("@tutorsnap/avatarUri").then((uri) => setAvatarUri(uri || null));
  }, []);

  // Restore persisted explain style preference
  useEffect(() => {
    AsyncStorage.getItem("@tutorsnap/explainStyle").then((saved) => {
      if (saved === "analogy" || saved === "step-by-step" || saved === "visual") {
        setExplainStyle(saved);
      }
    }).catch(() => {});
  }, []);

  let parsedSolution: MathSolution | null = null;
  try {
    parsedSolution = JSON.parse(params.data as string);
  } catch {
    parsedSolution = null;
  }

  // Determine if we need to auto-solve (problem present but no answer/steps)
  const needsAutoSolve =
    parsedSolution !== null &&
    !!parsedSolution.problem &&
    (!parsedSolution.answer || !parsedSolution.steps || parsedSolution.steps.length === 0);

  // Use live solution if available, otherwise fall back to parsed
  const solution: MathSolution | null = liveSolution ?? (needsAutoSolve ? null : parsedSolution);

  // Load cached alt explanation for this problem on mount; also purge stale entries (>7 days)
  useEffect(() => {
    if (!parsedSolution?.problem) return;
    const cacheKey = `alt_explain:${parsedSolution.problem.trim().toLowerCase().slice(0, 200)}`;
    const tsKey = `${cacheKey}:ts`;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    AsyncStorage.multiGet([cacheKey, tsKey]).then((pairs) => {
      const cached = pairs[0][1];
      const ts = pairs[1][1];
      if (cached && ts) {
        const age = Date.now() - parseInt(ts, 10);
        if (age > SEVEN_DAYS_MS) {
          // Stale: remove silently
          AsyncStorage.multiRemove([cacheKey, tsKey]).catch(() => {});
        } else {
          setAltExplanation(cached);
          setAltExplanationCached(true);
        }
      }
    }).catch(() => {});
  }, [parsedSolution?.problem]);

  const runExplainDifferently = useCallback(async (_forceRefresh = false) => {
    if (!solution) return;
    H.impactLight();
    setExplainDiffLoading(true);
    try {
      const result = await explainDiffMutation.mutateAsync({
        problem: solution.problem,
        answer: solution.answer,
        subject: solution.subject as any,
        gradeLevel: gradeLevel ?? undefined,
        style: explainStyle,
      });
      const alt = result?.explanation || "No alternative explanation available.";
      setAltExplanation(alt);
      setAltExplanationCached(false);
      setShowAltExplanation(true);
      setExplainCount((c) => c + 1);
      setActiveCardStyle(explainStyle); // record which style produced this card
      setAltRating(null); // reset rating for new explanation
      setSeenStyles((prev) => new Set([...prev, explainStyle])); // track this style as seen
      H.notificationSuccess();
      // Cache the result keyed by problem text + style
      const cacheKey = `alt_explain:${solution.problem.trim().toLowerCase().slice(0, 200)}`;
      const tsKey = `${cacheKey}:ts`;
      AsyncStorage.multiSet([[cacheKey, alt], [tsKey, String(Date.now())]]).catch(() => {});
    } catch {
      H.notificationError();
    } finally {
      setExplainDiffLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solution?.problem, solution?.answer, solution?.subject, gradeLevel, explainStyle]);

  useEffect(() => {
    if (parsedSolution?.problem) {
      isBookmarked(parsedSolution.problem).then(setBookmarked);
    }
  }, [parsedSolution?.problem]);

  // Auto-solve effect: fires once when the screen mounts with an unsolved problem
  useEffect(() => {
    if (!needsAutoSolve || autoSolving || liveSolution) return;
    setAutoSolving(true);
    setAutoSolveError(null);
    solveMutation.mutate(
      { problem: parsedSolution!.problem, subject: parsedSolution!.subject as any, gradeLevel: gradeLevel ?? undefined },
      {
        onSuccess: (data) => {
          const sol = data as unknown as MathSolution;
          setLiveSolution(sol);
          setAutoSolving(false);
          // Background pre-generate similar problems so they are ready instantly
          if (sol?.problem && similarProblems.length === 0) {
            generateSimilarMutation.mutate({
              problem: sol.problem,
              subject: (sol.subject ?? parsedSolution?.subject ?? "other") as any,
              difficulty: "medium",
              count: 3,
              gradeLevel: gradeLevel ?? undefined,
            });
          }
        },
        onError: (err) => {
          setAutoSolveError(err.message || "Failed to solve. Please try again.");
          setAutoSolving(false);
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAutoSolve]);

  const handleSwitchToStudy = useCallback(() => {
    setViewMode("study");
    H.impactLight();
    if (studyBlocks.length > 0 || studyBlocksLoading) return;
    if (!solution) return;
    setStudyBlocksLoading(true);
    setStudyBlocksError(null);
    generateStudyBlocksMutation.mutate({
      problem: solution.problem,
      answer: solution.answer,
      steps: solution.steps,
      conceptExplained: solution.conceptExplained,
      tips: solution.tips,
      subject: solution.subject,
      gradeLevel: gradeLevel ?? undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solution, studyBlocks.length, studyBlocksLoading, gradeLevel]);

  const handleSaveStudyBlockToNotes = useCallback(async (block: StudyBlock) => {
    try {
      const noteContent = `[Study Block: ${block.title}]\n\n${block.content}\n\n(from: ${solution?.problem ?? ""})`.trim();
      const SAVED_NOTES_KEY = "tutor_saved_notes";
      const raw = await AsyncStorage.getItem(SAVED_NOTES_KEY);
      const notes: { id: string; content: string; savedAt: number; type?: string }[] = raw ? JSON.parse(raw) : [];
      notes.unshift({ id: `note-${Date.now()}`, content: noteContent, savedAt: Date.now(), type: "study_block" });
      await AsyncStorage.setItem(SAVED_NOTES_KEY, JSON.stringify(notes.slice(0, 200)));
      // Show floating save confirmation toast
      setStudyBlockSavedToast(block.title);
      if (studyBlockSavedTimerRef.current) clearTimeout(studyBlockSavedTimerRef.current);
      studyBlockSavedTimerRef.current = setTimeout(() => setStudyBlockSavedToast(null), 2000);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solution?.problem]);

  // Show auto-solving spinner
  if (autoSolving) {
    return (
      <ScreenContainer>
        <SolvingOverlay problem={parsedSolution?.problem} />
      </ScreenContainer>
    );
  }

  // Show auto-solve error
  if (autoSolveError) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
          <IconSymbol size={40} name="exclamationmark.triangle.fill" color={colors.error} />
          <Text style={{ color: colors.foreground, fontSize: fs(16), fontWeight: "700", textAlign: "center" }}>
            Could not solve this problem
          </Text>
          <Text style={{ color: colors.muted, fontSize: fs(13), textAlign: "center" }}>{autoSolveError}</Text>
          <TouchableOpacity
            onPress={() => {
              setAutoSolveError(null);
              setAutoSolving(false);
              // Retry
              if (parsedSolution?.problem) {
                setAutoSolving(true);
                solveMutation.mutate(
                  { problem: parsedSolution.problem, subject: parsedSolution.subject as any },
                  {
                    onSuccess: (data) => { setLiveSolution(data as unknown as MathSolution); setAutoSolving(false); },
                    onError: (err) => { setAutoSolveError(err.message || "Failed to solve."); setAutoSolving(false); },
                  }
                );
              }
            }}
            style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            activeOpacity={0.8}
          >
            <Text style={{ color: "#FFFFFF", fontSize: fs(14), fontWeight: "700" }}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.75}>
            <Text style={{ color: colors.muted, fontSize: fs(14) }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  if (!solution) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.foreground, fontSize: fs(16) }}>No solution data found</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.primary, fontSize: fs(16) }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const subjectColor = getSubjectColor(solution.subject);
  const subjectLabel = getSubjectLabel(solution.subject);
  const { fadeStyle } = useScreenTransition({ duration: 300, translateY: 20 });

  const buildShareHtml = () => {
    const subjectLbl = getSubjectLabel(solution!.subject);
    const stepsHtml = (solution!.steps || []).map((s) => `
      <div style="background:#f8f9fa;border-radius:12px;padding:14px;margin-bottom:10px;border-left:4px solid #4F46E5">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="background:#4F46E520;color:#4F46E5;font-weight:700;font-size:13px;padding:4px 10px;border-radius:6px">Step ${s.stepNumber}</span>
          <strong style="color:#1a1a1a;font-size:14px">${s.title}</strong>
        </div>
        ${s.expression ? `<div style="background:#4F46E510;border:1px solid #4F46E530;border-radius:8px;padding:10px;text-align:center;font-family:monospace;font-size:16px;font-weight:700;color:#4F46E5;margin-bottom:8px">${s.expression}</div>` : ""}
        <p style="color:#333;font-size:14px;line-height:1.6;margin:0">${s.explanation}</p>
      </div>
    `).join("");
    const tipsHtml = (solution!.tips || []).map((t) => `<li style="color:#555;font-size:14px;line-height:1.6;margin-bottom:6px">${t}</li>`).join("");
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; color: #1a1a1a; background: #fff; }
          .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #fff; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; }
          .app-name { font-size: 12px; font-weight: 700; letter-spacing: 2px; opacity: 0.8; margin-bottom: 4px; }
          .subject { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 12px; }
          .problem { font-size: 18px; font-weight: 700; line-height: 1.5; }
          .answer-box { background: #F0FDF4; border: 2px solid #22C55E; border-radius: 14px; padding: 16px 20px; margin-bottom: 20px; }
          .answer-label { color: #16A34A; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px; }
          .answer { font-size: 22px; font-weight: 800; color: #1a1a1a; }
          .section-title { font-size: 16px; font-weight: 700; color: #1a1a1a; margin: 0 0 12px; }
          .tips { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 14px 18px; margin-top: 16px; }
          .footer { margin-top: 24px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="app-name">TUTORSNAP</div>
          <div class="subject">${subjectLbl}</div>
          <div class="problem">${solution!.problem}</div>
        </div>
        <div class="answer-box">
          <div class="answer-label">ANSWER</div>
          <div class="answer">${solution!.answer}</div>
        </div>
        <h3 class="section-title">Step-by-Step Solution</h3>
        ${stepsHtml}
        ${tipsHtml ? `<div class="tips"><h4 style="margin:0 0 10px;color:#92400E;font-size:14px">💡 Pro Tips</h4><ul style="margin:0;padding-left:18px">${tipsHtml}</ul></div>` : ""}
        <div class="footer">Solved with TutorSnap · ${new Date().toLocaleDateString()}</div>
      </body>
      </html>
    `;
  };

  const handleSharePdf = async () => {
    if (Platform.OS === "web") {
      // Fallback: native text share on web
      const text = `Question: ${solution!.problem}\n\nAnswer: ${solution!.answer}\n\nSolved with TutorSnap`;
      try { await Share.share({ message: text }); } catch { /* ignore */ }
      return;
    }
    setShareLoading(true);
    try {
      H.impactLight();
      const html = buildShareHtml();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Solution",
        UTI: "com.adobe.pdf",
      });
    } catch (_) {
      // User cancelled or error — ignore
    } finally {
      setShareLoading(false);
    }
  };

  const handleShareText = async () => {
    setShowShareMenu(false);
    H.impactLight()
    const stepsText = (solution!.steps || [])
      .map((s) => `Step ${s.stepNumber}: ${s.title}\n${s.expression ? `  ${s.expression}\n` : ""}  ${s.explanation}`)
      .join("\n\n");
    const tipsText = (solution!.tips || []).length > 0
      ? `\n\n💡 Tips:\n${solution!.tips!.map((t) => `• ${t}`).join("\n")}`
      : "";
    const message = `📚 ${getSubjectLabel(solution!.subject)} - TutorSnap\n\n❓ ${solution!.problem}\n\n✅ Answer: ${solution!.answer}\n\n${stepsText}${tipsText}\n\nSolved with TutorSnap · ${APP_URL.replace("https://", "")}`;
    if (Platform.OS === "web") {
      // Share.share is a no-op on web — use clipboard instead
      try {
        await Clipboard.setStringAsync(message);
        Alert.alert("Copied!", "Solution text copied to clipboard.");
      } catch { /* ignore */ }
      return;
    }
    try {
      await Share.share({ message });
    } catch {
      // user cancelled
    }
  };

  const handleSharePdfFromMenu = async () => {
    setShowShareMenu(false);
    await handleSharePdf();
  };

  const handleCopyLink = async () => {
    setShowShareMenu(false);
    H.impactLight()
    const encoded = encodeURIComponent(solution!.problem);
    const link = `https://${APP_URL.replace("https://", "")}/solve?q=${encoded}&subject=${solution!.subject}`;
    try {
      await Clipboard.setStringAsync(link);
      setCopyLinkFeedback(true);
      if (copyLinkFeedbackTimerRef.current) clearTimeout(copyLinkFeedbackTimerRef.current);
      copyLinkFeedbackTimerRef.current = setTimeout(() => setCopyLinkFeedback(false), 2000);
    } catch {
      // ignore
    }
  };

  const handlePracticeFromMenu = () => {
    setShowShareMenu(false);
    H.impactMedium()
    router.push({ pathname: "/(tabs)/practice", params: { subject: solution!.subject } } as any);
  };

  const handleShareToClassroom = async () => {
    setShowShareMenu(false);
    try {
      const mine = await getMyClassroom();
      const joined = await getJoinedClassroom();
      const classroom = mine || joined;
      if (!classroom) {
        Alert.alert(
          "No Classroom",
          "You haven't joined or created a classroom yet. Go to Settings → Classroom to get started.",
          [{ text: "OK" }]
        );
        return;
      }
      H.notificationSuccess()
      await shareToClassroom(classroom.code, {
        problem: solution!.problem,
        answer: solution!.answer,
        subject: solution!.subject,
        // Store steps as JSON strings so they can be parsed back into SolutionStep objects
        steps: (solution!.steps || []).map((s) => JSON.stringify(s)),
        sharedBy: "You",
      });
      Alert.alert("Shared!", `Problem added to "${classroom.name}" feed.`);
    } catch {
      Alert.alert("Error", "Could not share to classroom. Please try again.");
    }
  };

  const handleShare = () => setShowShareMenu(true);

  const handleCopyAnswer = async () => {
    H.impactLight();
    try {
      await Clipboard.setStringAsync(solution!.answer);
      setCopyFeedback(true);
      if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
      copyFeedbackTimerRef.current = setTimeout(() => setCopyFeedback(false), 1500);
    } catch (_) {
      // ignore
    }
  };

  const handleDiscussWithTutor = async () => {
    if (!solution) return;
    H.impactLight()
    setDiscussLoading(true);
    try {
      // Build a pre-seeded context message that gives the AI the full solution context
      const subjectLabel = getSubjectLabel(solution.subject);
      const seedMessage = `I just solved this problem with TutorSnap and I have some questions about it.\n\n**Subject:** ${subjectLabel}\n**Problem:** ${solution.problem}\n**Answer:** ${solution.answer}\n\nCan you help me understand this better?`;
      const session = await createSession(solution.subject);
      // Set a descriptive title
      const titleStr = `Discussing: ${solution.problem.length > 40 ? solution.problem.slice(0, 40) + "\u2026" : solution.problem}`;
      await renameSession(session.id, titleStr);
      // Navigate with seed message so chat screen pre-populates the context
      router.push({
        pathname: "/(tabs)/chat",
        params: { sessionId: session.id, seedMessage },
      });
    } catch {
      Alert.alert("Error", "Could not open the chat. Please try again.");
    } finally {
      setDiscussLoading(false);
    }
  };

  const handleBookmark = async () => {
    H.impactMedium();
    try {
      const historyItem: HistoryItem = {
        id: `bm-${Date.now()}`,
        problem: solution!.problem,
        answer: solution!.answer,
        subject: solution!.subject as MathSubject,
        steps: solution!.steps || [],
        conceptExplained: solution!.conceptExplained,
        tips: solution!.tips,
        solvedAt: Date.now(),
      };
      const added = await toggleBookmark(historyItem);
      setBookmarked(added);
      if (added && Platform.OS !== "web") {
        H.notificationSuccess();
      }
    } catch {
      Alert.alert("Error", "Could not save bookmark. Please try again.");
    }
  };

  return (
    <ScreenContainer>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      {/* Share Menu - Scrollable Bottom Sheet */}
      <Modal
        visible={showShareMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareMenu(false)}
      >
        <TouchableOpacity
          accessibilityLabel="Close share menu"
          style={styles.shareOverlay}
          activeOpacity={1}
          onPress={() => setShowShareMenu(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.shareMenu, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {}}>
            {/* Drag handle */}
            <View style={styles.shareMenuHandle}>
              <View style={[styles.shareMenuHandleBar, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.shareMenuTitle, { color: colors.muted }]}>Share Solution</Text>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              accessibilityLabel="Copy full solution"
              onPress={async () => {
                if (!solution) return;
                setShowShareMenu(false);
                H.impactLight();
                const stepsText = solution.steps?.map((s, i) => `Step ${i + 1}: ${s.title}\n${s.expression ? s.expression + "\n" : ""}${s.explanation}`).join("\n\n") ?? "";
                const parts = [
                  `PROBLEM:\n${solution.problem}`,
                  `ANSWER:\n${solution.answer}`,
                  stepsText ? `STEP-BY-STEP SOLUTION:\n${stepsText}` : "",
                  solution.conceptExplained ? `KEY CONCEPT:\n${solution.conceptExplained}` : "",
                  solution.tips && solution.tips.length > 0 ? `PRO TIPS:\n${solution.tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : "",
                ].filter(Boolean).join("\n\n");
                try {
                  await Clipboard.setStringAsync(parts);
                  Alert.alert("Copied!", "Full solution copied to clipboard.");
                } catch { /* ignore */ }
              }}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.primary}20` }]}>
                <IconSymbol size={18} name="doc.on.doc" color={colors.primary} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Copy Full Solution</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Problem, answer, steps, concept and tips</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
            {/* Copy as Markdown */}
            <TouchableOpacity
              accessibilityLabel="Copy as Markdown"
              onPress={async () => {
                if (!solution) return;
                setShowShareMenu(false);
                H.impactLight();
                const stepsText = solution.steps?.map((s, i) => `### Step ${i + 1}: ${s.title}\n${s.expression ? `\`${s.expression}\`\n` : ""}${s.explanation}`).join("\n\n") ?? "";
                const md = [
                  `## Problem\n\n${solution.problem}`,
                  `## Answer\n\n**${solution.answer}**`,
                  stepsText ? `## Step-by-Step Solution\n\n${stepsText}` : "",
                  solution.conceptExplained ? `## Key Concept\n\n${solution.conceptExplained}` : "",
                  solution.tips && solution.tips.length > 0 ? `## Pro Tips\n\n${solution.tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : "",
                ].filter(Boolean).join("\n\n");
                try {
                  await Clipboard.setStringAsync(md);
                  // Show a 2-second preview toast with the first non-empty line
                  const previewLine = md.split("\n").find(l => l.trim().length > 0) ?? "";
                  const preview = previewLine.length > 60 ? previewLine.substring(0, 57) + "..." : previewLine;
                  setMarkdownPreviewText(preview);
                  if (markdownPreviewTimerRef.current) clearTimeout(markdownPreviewTimerRef.current);
                  markdownPreviewTimerRef.current = setTimeout(() => setMarkdownPreviewText(null), 2500);
                } catch { /* ignore */ }
              }}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.success}15` }]}>
                <IconSymbol size={18} name="chevron.left.forwardslash.chevron.right" color={colors.success} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Copy as Markdown</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Paste into Notion, Obsidian or Google Docs</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
            {/* Share to Notes */}
            <TouchableOpacity
              accessibilityLabel="Share to Notes"
              onPress={async () => {
                if (!solution) return;
                setShowShareMenu(false);
                H.impactLight();
                const stepsText = solution.steps?.map((s, i) => `Step ${i + 1}: ${s.title}\n${s.expression ? s.expression + "\n" : ""}${s.explanation}`).join("\n\n") ?? "";
                const noteText = [
                  `PROBLEM:\n${solution.problem}`,
                  `ANSWER:\n${solution.answer}`,
                  stepsText ? `STEP-BY-STEP:\n${stepsText}` : "",
                  solution.conceptExplained ? `KEY CONCEPT:\n${solution.conceptExplained}` : "",
                  solution.tips && solution.tips.length > 0 ? `PRO TIPS:\n${solution.tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : "",
                ].filter(Boolean).join("\n\n");
                try {
                  if (Platform.OS !== "web") {
                    await Share.share({ message: noteText, title: `Solution: ${solution.problem.substring(0, 60)}` });
                  } else {
                    await Clipboard.setStringAsync(noteText);
                    Alert.alert("Copied!", "Solution text copied - paste into your notes app.");
                  }
                } catch { /* user cancelled */ }
              }}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.warning}15` }]}>
                <IconSymbol size={18} name="pencil.and.list.clipboard" color={colors.warning} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Save to Notes</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Send to Apple Notes, Keep, or any notes app</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
            {/* Share via WhatsApp */}
            {Platform.OS !== "web" && (
              <TouchableOpacity
                accessibilityLabel="Share via WhatsApp"
                onPress={async () => {
                  if (!solution) return;
                  setShowShareMenu(false);
                  H.impactLight();
                  try {
                    const stepsText = solution.steps?.map((s, i) => `Step ${i + 1}: ${s.title}\n${s.expression ? s.expression + "\n" : ""}${s.explanation}`).join("\n\n") ?? "";
                    const msg = encodeURIComponent(`*${solution.problem}*\n\n*Answer:* ${solution.answer}${stepsText ? "\n\n" + stepsText : ""}\n\n_Solved with TutorSnap_`);
                    const waUrl = `whatsapp://send?text=${msg}`;
                    const supported = await Linking.canOpenURL(waUrl);
                    if (supported) {
                      await Linking.openURL(waUrl);
                    } else {
                      // WhatsApp not installed — fall back to system share sheet
                      await Share.share({
                        message: decodeURIComponent(msg),
                        title: solution.problem,
                      });
                    }
                  } catch { /* user cancelled */ }
                }}
                style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
                activeOpacity={0.7}
              >
                <View style={[styles.shareMenuIcon, { backgroundColor: "#25D36615" }]}>
                  <Text style={{ fontSize: 18 }}>💬</Text>
                </View>
                <View style={styles.shareMenuInfo}>
                  <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Share via WhatsApp</Text>
                  <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>WhatsApp or system share if not installed</Text>
                </View>
                <IconSymbol size={16} name="chevron.right" color={colors.muted} />
              </TouchableOpacity>
            )}
            {/* Save to Files */}
            {Platform.OS !== "web" && (
              <TouchableOpacity
                accessibilityLabel="Save to Files"
                onPress={async () => {
                  if (!solution) return;
                  setShowShareMenu(false);
                  H.impactLight();
                  try {
                    // Build plain-text file content
                    const stepsText = solution.steps?.map((s, i) => `Step ${i + 1}: ${s.title}\n${s.expression ? s.expression + "\n" : ""}${s.explanation}`).join("\n\n") ?? "";
                    const fileContent = [
                      `PROBLEM:\n${solution.problem}`,
                      `ANSWER:\n${solution.answer}`,
                      stepsText ? `STEP-BY-STEP SOLUTION:\n${stepsText}` : "",
                      solution.conceptExplained ? `KEY CONCEPT:\n${solution.conceptExplained}` : "",
                      solution.tips && solution.tips.length > 0 ? `PRO TIPS:\n${solution.tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : "",
                    ].filter(Boolean).join("\n\n");
                    const safeName = solution.problem.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 40).trim() || "solution";
                    const fileUri = `${FileSystem.cacheDirectory}${safeName}.txt`;
                    await FileSystem.writeAsStringAsync(fileUri, fileContent, { encoding: FileSystem.EncodingType.UTF8 });
                    const canShare = await Sharing.isAvailableAsync();
                    if (canShare) {
                      await Sharing.shareAsync(fileUri, { mimeType: "text/plain", dialogTitle: "Save solution to Files" });
                    } else {
                      Alert.alert("Not available", "File sharing is not available on this device.");
                    }
                  } catch (err) {
                    Alert.alert("Error", "Could not save file. Please try again.");
                  }
                }}
                style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
                activeOpacity={0.7}
              >
                <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <IconSymbol size={18} name="folder.fill" color={colors.primary} />
                </View>
                <View style={styles.shareMenuInfo}>
                  <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Save to Files</Text>
                  <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Save as .txt to Files app or Google Drive</Text>
                </View>
                <IconSymbol size={16} name="chevron.right" color={colors.muted} />
              </TouchableOpacity>
            )}
            {/* Save PDF to Files */}
            {Platform.OS !== "web" && (
              <TouchableOpacity
                accessibilityLabel="Save PDF to Files"
                onPress={async () => {
                  if (!solution) return;
                  setShowShareMenu(false);
                  setShareLoading(true);
                  H.impactLight();
                  try {
                    const html = buildShareHtml();
                    const { uri } = await Print.printToFileAsync({ html, base64: false });
                    // Move to a named file in cache
                    const safeName = solution.problem.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 40).trim() || "solution";
                    const destUri = `${FileSystem.cacheDirectory}${safeName}.pdf`;
                    await FileSystem.copyAsync({ from: uri, to: destUri });
                    const canShare = await Sharing.isAvailableAsync();
                    if (canShare) {
                      await Sharing.shareAsync(destUri, { mimeType: "application/pdf", dialogTitle: "Save PDF to Files" });
                    } else {
                      Alert.alert("Not available", "PDF sharing is not available on this device.");
                    }
                  } catch {
                    Alert.alert("Error", "Could not generate PDF. Please try again.");
                  } finally {
                    setShareLoading(false);
                  }
                }}
                style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
                activeOpacity={0.7}
                disabled={shareLoading}
              >
                <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.error}15` }]}>
                  {shareLoading
                    ? <ActivityIndicator size="small" color={colors.error} />
                    : <IconSymbol size={18} name="doc.richtext" color={colors.error} />}
                </View>
                <View style={styles.shareMenuInfo}>
                  <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Save PDF to Files</Text>
                  <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>One-tap save to Files app or Google Drive</Text>
                </View>
                <IconSymbol size={16} name="chevron.right" color={colors.muted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityLabel="Share"
              onPress={handleShareText}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol size={18} name="text.bubble" color={colors.primary} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Share as Text</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Send to WhatsApp, iMessage, etc.</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Share"
              onPress={handleSharePdfFromMenu}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
              disabled={shareLoading}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.error}15` }]}>
                {shareLoading
                  ? <ActivityIndicator size="small" color={colors.error} />
                  : <IconSymbol size={18} name="doc.fill" color={colors.error} />}
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Share as PDF</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Formatted document with all steps</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Copy"
              onPress={handleCopyLink}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.success}15` }]}>
                <IconSymbol size={18} name="link" color={colors.success} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Copy Link</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Copy ${APP_URL.replace("https://", "")} solve link to clipboard</Text>
              </View>
              <IconSymbol size={16} name={copyLinkFeedback ? "checkmark.circle.fill" : "chevron.right"} color={copyLinkFeedback ? colors.success : colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Practice this topic"
              onPress={handlePracticeFromMenu}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.warning}15` }]}>
                <IconSymbol size={18} name="pencil.and.list.clipboard" color={colors.warning} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Practice This Topic</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Go to Practice mode for this subject</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Share"
              onPress={handleShareToClassroom}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.primary}20` }]}>
                <IconSymbol size={18} name="person.2.fill" color={colors.primary} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Share to Classroom</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Add to your class problem feed</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark this solution"}
              onPress={async () => { setShowShareMenu(false); await handleBookmark(); }}
              style={[styles.shareMenuItem, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.warning}15` }]}>
                <IconSymbol size={18} name={bookmarked ? "bookmark.fill" : "bookmark"} color={colors.warning} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>{bookmarked ? "Remove Bookmark" : "Bookmark"}</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>{bookmarked ? "Remove from your saved solutions" : "Save to your bookmarks"}</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Share this result with your invite code"
              onPress={async () => {
                setShowShareMenu(false);
                H.impactLight();
                const { getOrCreateReferralCode } = await import("@/lib/affiliate");
                const code = await getOrCreateReferralCode();
                const msg = `TutorSnap just solved this for me in seconds 🤯\n\n"${solution?.problem ?? "a tough problem"}"\n\nTry it free with my code: ${code}\nhttps://${APP_URL.replace("https://", "")}`;
                try {
                  if (Platform.OS !== "web") {
                    await Share.share({ message: msg });
                  } else {
                    await Clipboard.setStringAsync(msg);
                    Alert.alert("Copied!", "Message copied to clipboard.");
                  }
                } catch { /* user cancelled */ }
              }}
              style={styles.shareMenuItem}
              activeOpacity={0.7}
            >
              <View style={[styles.shareMenuIcon, { backgroundColor: `${colors.success}15` }]}>
                <IconSymbol size={18} name="person.badge.plus" color={colors.success} />
              </View>
              <View style={styles.shareMenuInfo}>
                <Text style={[styles.shareMenuLabel, { color: colors.foreground }]}>Invite a Friend</Text>
                <Text style={[styles.shareMenuDesc, { color: colors.muted }]}>Share your result + referral code</Text>
              </View>
              <IconSymbol size={16} name="chevron.right" color={colors.muted} />
            </TouchableOpacity>
            </ScrollView>
            {/* Cancel button */}
            <TouchableOpacity
              onPress={() => { H.impactLight(); setShowShareMenu(false); }}
              style={[styles.shareMenuCancel, { borderTopColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.shareMenuCancelText, { color: colors.error }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      {/* Copy Link feedback toast */}
      {copyLinkFeedback && (
        <View style={[styles.linkToast, { backgroundColor: colors.success }]}>
          <IconSymbol size={15} name="checkmark.circle.fill" color="#FFFFFF" />
          <Text style={styles.linkToastText}>Link copied to clipboard!</Text>
        </View>
      )}
      {/* Markdown preview toast */}
      {markdownPreviewText && (
        <View style={[styles.linkToast, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.success }]}>
          <IconSymbol size={15} name="checkmark.circle.fill" color={colors.success} />
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={[styles.linkToastText, { color: colors.success, fontSize: 11, fontWeight: "700" }]}>Markdown copied!</Text>
            <Text style={[styles.linkToastText, { color: colors.muted, fontSize: 10, fontWeight: "400", marginTop: 1 }]} numberOfLines={2} ellipsizeMode="tail">{markdownPreviewText}</Text>
          </View>
        </View>
      )}
      {/* Study Block saved toast */}
      {studyBlockSavedToast && (
        <View style={[styles.linkToast, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.success }]}>
          <IconSymbol size={15} name="note.text" color={colors.success} />
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={[styles.linkToastText, { color: colors.success, fontSize: 11, fontWeight: "700" }]}>Saved to Notes!</Text>
            <Text style={[styles.linkToastText, { color: colors.muted, fontSize: 10, fontWeight: "400", marginTop: 1 }]} numberOfLines={1} ellipsizeMode="tail">{studyBlockSavedToast}</Text>
          </View>
        </View>
      )}
      {/* Header */}
      <View style={[styles.navBarWrap, { borderBottomColor: colors.border }]}>
        {/* Row 1: back / title / actions */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Solution</Text>
          <View style={styles.navActions}>
            {/* Bookmark Button */}
            <TouchableOpacity onPress={() => { showHeaderTooltip("Bookmark"); handleBookmark(); }} style={styles.navActionBtn}>
              <IconSymbol
                size={22}
                name={bookmarked ? "bookmark.fill" : "bookmark"}
                color={bookmarked ? colors.warning : colors.muted}
              />
            </TouchableOpacity>
            {/* Share as PDF Button */}
            <TouchableOpacity onPress={() => { showHeaderTooltip("Share"); handleShare(); }} style={styles.navActionBtn} disabled={shareLoading}
              accessibilityLabel="Share">
              {shareLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <IconSymbol size={22} name="square.and.arrow.up" color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
          {headerTooltip && (
            <Animated.View pointerEvents="none" style={[styles.headerTooltip, { backgroundColor: colors.foreground, opacity: tooltipOpacity }]}>
              <Text style={[styles.headerTooltipText, { color: colors.background }]}>{headerTooltip}</Text>
            </Animated.View>
          )}
        </View>
        {/* Row 2: progress nudge strip (only when streak or daily goal data is available) */}
        {progressData && (
          <TouchableOpacity
            onPress={() => { H.impactLight(); router.push("/progress" as any); }}
            style={[styles.navProgressStrip, { backgroundColor: `${colors.warning}10` }]}
            activeOpacity={0.75}
            accessibilityLabel="View progress"
          >
            {/* Avatar or streak emoji */}
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={{ width: 22, height: 22, borderRadius: 11, marginRight: 2 }}
              />
            ) : (
              <Text style={styles.navProgressEmoji}>{getStreakEmoji(progressData.streak.currentStreak)}</Text>
            )}
            {progressData.streak.currentStreak > 0 && (
              <Text style={[styles.navProgressText, { color: colors.warning }]}>
                {progressData.streak.currentStreak}-day streak
              </Text>
            )}
            {progressData.streak.dailyGoal > 0 && (
              <>
                {progressData.streak.currentStreak > 0 && (
                  <View style={[styles.navProgressDot, { backgroundColor: colors.muted }]} />
                )}
                <Text style={[styles.navProgressText, { color: colors.muted }]}>
                  {progressData.streak.todaySolved}/{progressData.streak.dailyGoal} today
                </Text>
                <View style={[styles.navProgressTrack, { backgroundColor: `${colors.primary}20` }]}>
                  <View style={[styles.navProgressFill, {
                    backgroundColor: progressData.streak.todaySolved >= progressData.streak.dailyGoal ? colors.success : colors.primary,
                    width: `${Math.min(100, Math.round((progressData.streak.todaySolved / progressData.streak.dailyGoal) * 100))}%` as any,
                  }]} />
                </View>
              </>
            )}
            <IconSymbol size={12} name="chevron.right" color={colors.muted} style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Jump to Submission Ready anchor button */}
        {solution?.submissionReady && (
          <TouchableOpacity
            accessibilityLabel="Jump to Submission Ready"
            onPress={handleJumpToSubmission}
            activeOpacity={0.8}
            style={[
              styles.jumpToSubmissionBtn,
              { backgroundColor: `#6366f120`, borderColor: `#6366f140` },
            ]}
          >
            <Text style={{ fontSize: 14 }}>📋</Text>
            <Text style={[styles.jumpToSubmissionText, { color: '#6366f1', fontSize: fs(13) }]}>Jump to Submission Ready</Text>
            <IconSymbol size={14} name="chevron.right" color="#6366f1" />
          </TouchableOpacity>
        )}

        {/* Subject Badge + Grade Level Badge + Bookmark indicator */}
        <View style={styles.badgeRow}>
          <View style={[styles.subjectBadge, { backgroundColor: `${subjectColor}20` }]}>
            <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
            <Text style={[styles.subjectBadgeText, { color: subjectColor }]}>{subjectLabel}</Text>
          </View>
          {gradeLevel && (
            <View style={[styles.gradeBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
              <Text style={{ fontSize: 11 }}>📚</Text>
              <Text style={[styles.gradeBadgeText, { color: colors.primary }]}>{GRADE_LABELS[gradeLevel] ?? gradeLevel}</Text>
            </View>
          )}
          {bookmarked && (
            <View style={[styles.bookmarkedBadge, { backgroundColor: `${colors.warning}20`, borderColor: `${colors.warning}40` }]}>
              <Text style={{ fontSize: 12 }}>🔖</Text>
              <Text style={[styles.bookmarkedText, { color: colors.warning }]}>Bookmarked</Text>
            </View>
          )}
        </View>

        {/* Problem */}
        <View style={[styles.problemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { justifyContent: "space-between", marginBottom: 8 }]}>
            <Text style={[styles.problemLabel, { color: colors.muted }]}>PROBLEM</Text>
            <TouchableOpacity
              accessibilityLabel="Copy problem"
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(solution!.problem);
                  setCopyProblemFeedback(true);
                  H.impactLight();
                  if (copyProblemTimerRef.current) clearTimeout(copyProblemTimerRef.current);
                  copyProblemTimerRef.current = setTimeout(() => setCopyProblemFeedback(false), 1500);
                } catch { /* ignore */ }
              }}
              style={[styles.copyBtn, { backgroundColor: copyProblemFeedback ? `${colors.success}20` : "transparent" }]}
            >
              <IconSymbol size={14} name={copyProblemFeedback ? "checkmark.circle.fill" : "doc.on.doc"} color={copyProblemFeedback ? colors.success : colors.muted} />
              <Text style={[styles.copyText, { color: copyProblemFeedback ? colors.success : colors.muted }]}>{copyProblemFeedback ? "Copied!" : "Copy"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.problemText, { color: colors.foreground, fontSize: fs(16), lineHeight: fs(16) * 1.5 }]}>{cleanMathText(solution.problem)}</Text>
        </View>

        {/* Answer */}
        <View style={[styles.answerCard, { backgroundColor: `${subjectColor}15`, borderColor: `${subjectColor}40` }]}>
          <View style={styles.answerHeader}>
            <View style={styles.answerLabelRow}>
              <IconSymbol size={16} name="checkmark.circle.fill" color={colors.success} />
              <Text style={[styles.answerLabel, { color: colors.success }]}>ANSWER</Text>
            </View>
            <TouchableOpacity onPress={handleCopyAnswer} style={[styles.copyBtn, { backgroundColor: copyFeedback ? `${colors.success}20` : "transparent" }]}
              accessibilityLabel="Copy">
              <IconSymbol size={16} name="doc.on.doc" color={copyFeedback ? colors.success : colors.muted} />
              <Text style={[styles.copyText, { color: copyFeedback ? colors.success : colors.muted }]}>
                {copyFeedback ? "Copied!" : "Copy"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.answerText, { color: colors.foreground, fontSize: fs(22) }]}>{cleanMathText(solution.answer)}</Text>
        </View>

        {/* View Mode Toggle */}
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 12, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
          <TouchableOpacity
            accessibilityLabel="Steps view"
            onPress={() => { setViewMode("steps"); H.impactLight(); }}
            style={[{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 }, viewMode === "steps" ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
          >
            <IconSymbol size={15} name="list.bullet" color={viewMode === "steps" ? "#FFFFFF" : colors.muted} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: viewMode === "steps" ? "#FFFFFF" : colors.muted }}>Steps</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Study view"
            onPress={handleSwitchToStudy}
            style={[{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 }, viewMode === "study" ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
          >
            {studyBlocksLoading ? (
              <ActivityIndicator size="small" color={viewMode === "study" ? "#FFFFFF" : colors.muted} />
            ) : (
              <IconSymbol size={15} name="text.book.closed.fill" color={viewMode === "study" ? "#FFFFFF" : colors.muted} />
            )}
            <Text style={{ fontSize: 13, fontWeight: "700", color: viewMode === "study" ? "#FFFFFF" : colors.muted }}>Study View</Text>
          </TouchableOpacity>
        </View>

        {/* Study View: block-card renderer */}
        {viewMode === "study" && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {studyBlocksLoading && <StudyBlockSkeleton count={4} />}
            {studyBlocksError && !studyBlocksLoading && (
              <View style={{ alignItems: "center", padding: 20, gap: 10 }}>
                <Text style={{ color: colors.error, fontSize: 14, textAlign: "center" }}>{studyBlocksError}</Text>
                <TouchableOpacity
                  onPress={handleSwitchToStudy}
                  style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            {!studyBlocksLoading && !studyBlocksError && studyBlocks.map((block, i) => (
              <StudyBlockCard
                key={block.id}
                block={block}
                index={i}
                onSaveToNotes={handleSaveStudyBlockToNotes}
              />
            ))}
          </View>
        )}

        {/* Steps (only shown in steps mode) */}
        {viewMode === "steps" && (
        <View style={styles.stepsSection}>
          <View style={[styles.sectionHeader, { justifyContent: "space-between" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <IconSymbol size={16} name="list.bullet" color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Step-by-Step Solution
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Copy all steps"
              onPress={async () => {
                try {
                  const stepsText = solution!.steps?.map((s, i) => `Step ${i + 1}: ${s.title}\n${s.expression ? s.expression + "\n" : ""}${s.explanation}`).join("\n\n") ?? "";
                  await Clipboard.setStringAsync(stepsText);
                  setCopyStepsFeedback(true);
                  H.impactLight();
                  if (copyStepsTimerRef.current) clearTimeout(copyStepsTimerRef.current);
                  copyStepsTimerRef.current = setTimeout(() => setCopyStepsFeedback(false), 1500);
                } catch { /* ignore */ }
              }}
              style={[styles.copyBtn, { backgroundColor: copyStepsFeedback ? `${colors.success}20` : "transparent" }]}
            >
              <IconSymbol size={14} name={copyStepsFeedback ? "checkmark.circle.fill" : "doc.on.doc"} color={copyStepsFeedback ? colors.success : colors.muted} />
              <Text style={[styles.copyText, { color: copyStepsFeedback ? colors.success : colors.muted }]}>{copyStepsFeedback ? "Copied!" : "Copy All"}</Text>
            </TouchableOpacity>
          </View>
          {solution.steps?.map((step, index) => (
            <StepCard key={index} step={step} colors={colors} fs={fs} delay={index * 120} />
          ))}
        </View>
        )}

        {/* Concept Explanation */}
        {solution.conceptExplained && (
          <View style={[styles.conceptCard, { backgroundColor: `${colors.secondary}10`, borderColor: `${colors.secondary}30` }]}>
            <View style={[styles.sectionHeader, { justifyContent: "space-between" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <IconSymbol size={16} name="brain.head.profile" color={colors.secondary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Key Concept</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Copy key concept"
                onPress={async () => {
                  try {
                    await Clipboard.setStringAsync(solution!.conceptExplained!);
                    setCopyConceptFeedback(true);
                    H.impactLight();
                    if (copyConceptTimerRef.current) clearTimeout(copyConceptTimerRef.current);
                    copyConceptTimerRef.current = setTimeout(() => setCopyConceptFeedback(false), 1500);
                  } catch { /* ignore */ }
                }}
                style={[styles.copyBtn, { backgroundColor: copyConceptFeedback ? `${colors.success}20` : "transparent" }]}
              >
                <IconSymbol size={14} name={copyConceptFeedback ? "checkmark.circle.fill" : "doc.on.doc"} color={copyConceptFeedback ? colors.success : colors.muted} />
                <Text style={[styles.copyText, { color: copyConceptFeedback ? colors.success : colors.muted }]}>{copyConceptFeedback ? "Copied!" : "Copy"}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.conceptText, { color: colors.foreground, fontSize: fs(14), lineHeight: fs(14) * 1.57 }]}>{solution.conceptExplained}</Text>
          </View>
        )}

        {/* Tips */}
        {solution.tips && solution.tips.length > 0 && (
          <View style={[styles.tipsCard, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}30` }]}>
            <View style={[styles.sectionHeader, { justifyContent: "space-between" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <IconSymbol size={16} name="lightbulb.fill" color={colors.warning} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pro Tips</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Copy pro tips"
                onPress={async () => {
                  try {
                    const tipsText = solution!.tips!.map((t, i) => `${i + 1}. ${t}`).join("\n");
                    await Clipboard.setStringAsync(tipsText);
                    setCopyTipsFeedback(true);
                    H.impactLight();
                    if (copyTipsTimerRef.current) clearTimeout(copyTipsTimerRef.current);
                    copyTipsTimerRef.current = setTimeout(() => setCopyTipsFeedback(false), 1500);
                  } catch { /* ignore */ }
                }}
                style={[styles.copyBtn, { backgroundColor: copyTipsFeedback ? `${colors.success}20` : "transparent" }]}
              >
                <IconSymbol size={14} name={copyTipsFeedback ? "checkmark.circle.fill" : "doc.on.doc"} color={copyTipsFeedback ? colors.success : colors.muted} />
                <Text style={[styles.copyText, { color: copyTipsFeedback ? colors.success : colors.muted }]}>{copyTipsFeedback ? "Copied!" : "Copy"}</Text>
              </TouchableOpacity>
            </View>
            {solution.tips.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: colors.warning }]} />
                <Text style={[styles.tipText, { color: colors.foreground, fontSize: fs(14), lineHeight: fs(14) * 1.57 }]}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Worked Example */}
        {solution.workedExample && (
          <View style={[styles.workedExampleCard, { backgroundColor: `${colors.success}08`, borderColor: `${colors.success}30` }]}>
            <View style={[styles.sectionHeader, { justifyContent: "space-between" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <IconSymbol size={16} name="pencil.and.list.clipboard" color={colors.success} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  {solution.workedExample.title || "Worked Example"}
                </Text>
              </View>
              <WorkedExampleCopyButton
                problem={solution.workedExample.problem}
                solution={solution.workedExample.solution}
                title={solution.workedExample.title}
                colors={colors}
                fs={fs}
              />
            </View>
            <View style={[styles.workedExampleProblem, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}25` }]}>
              <Text style={[styles.workedExampleLabel, { color: colors.success }]}>EXAMPLE PROBLEM</Text>
              <Text style={[styles.workedExampleProblemText, { color: colors.foreground, fontSize: fs(14) }]}>
                {solution.workedExample.problem}
              </Text>
            </View>
            <AIResponseErrorBoundary
              fallbackText={solution.workedExample.solution}
              fontSize={fs(14)}
              color={colors.foreground}
            >
              <AIResponseRenderer
                markdown={solution.workedExample.solution}
                fontSize={fs(14)}
                color={colors.foreground}
                codeBackground={colors.surface}
                flavor="github"
                stripPreamble={false}
              />
            </AIResponseErrorBoundary>
          </View>
        )}

        {/* Related Topics */}
        {solution.relatedTopics && solution.relatedTopics.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={[styles.relatedLabel, { color: colors.muted }]}>Related Topics</Text>
            <View style={styles.relatedChips}>
              {solution.relatedTopics.map((topic, index) => (
                <View
                  key={index}
                  style={[styles.relatedChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.relatedChipText, { color: colors.foreground, fontSize: fs(13) }]}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Final Solution Card */}
        {solution.submissionReady && (
          <View onLayout={(e) => { submissionReadyYRef.current = e.nativeEvent.layout.y; }}>
            <SubmissionReadyCard content={solution.submissionReady} fs={fs} />
          </View>
        )}

        {/* AI Similar Problems */}
        <View onLayout={(e) => { similarYRef.current = e.nativeEvent.layout.y; }} style={[styles.similarSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            accessibilityLabel="Toggle show similar"
            onPress={async () => {
              if (showSimilar) { setShowSimilar(false); return; }
              if (similarProblems.length > 0) { setShowSimilar(true); return; }
              H.impactLight()
              try {
                const result = await generateSimilarMutation.mutateAsync({
                  problem: solution!.problem,
                  subject: solution!.subject,
                  difficulty: "medium",
                  count: 3,
                  gradeLevel: gradeLevel ?? undefined,
                });
                setSimilarProblems(result.problems ?? []);
                setShowSimilar(true);
                H.notificationSuccess()
              } catch { /* ignore */ }
            }}
            style={styles.similarHeader}
            activeOpacity={0.8}
          >
            <View style={[styles.similarIconWrap, { backgroundColor: `${colors.primary}15` }]}>
              {generateSimilarMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <IconSymbol size={18} name="wand.and.stars" color={colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.similarTitle, { color: colors.foreground }]}>Generate Similar Problems</Text>
              <Text style={[styles.similarSub, { color: colors.muted }]}>
                {generateSimilarMutation.isPending ? "Generating 3 practice problems…" : similarProblems.length > 0 ? `${similarProblems.length} problems ready` : "AI-generated practice problems"}
              </Text>
            </View>
            <IconSymbol size={16} name={showSimilar ? "chevron.up" : "chevron.down"} color={colors.muted} />
          </TouchableOpacity>

          {showSimilar && similarProblems.length > 0 && (
            <View style={styles.similarList}>
              {similarProblems.map((p, i) => (
                <View key={p.id} style={[styles.similarItem, { borderColor: colors.border }]}>
                  {/* Problem row: number badge + text + copy icon */}
                  <View style={styles.similarItemHeader}>
                    <View style={[styles.similarNum, { backgroundColor: `${colors.primary}20` }]}>
                      <Text style={[styles.similarNumText, { color: colors.primary }]}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.similarProblem, { color: colors.foreground, fontSize: fs(14) }]}>{cleanMathText(p.problem)}</Text>
                    <TouchableOpacity
                      accessibilityLabel={`Copy problem ${i + 1}`}
                      accessibilityRole="button"
                      onPress={async () => {
                        try {
                          await Clipboard.setStringAsync(p.problem);
                          setCopiedProblemId(p.id);
                          H.impactLight();
                          if (copiedProblemIdTimerRef.current) clearTimeout(copiedProblemIdTimerRef.current);
                          copiedProblemIdTimerRef.current = setTimeout(() => setCopiedProblemId(null), 2000);
                        } catch { /* ignore */ }
                      }}
                      style={[styles.similarCopyBtn, { backgroundColor: copiedProblemId === p.id ? `${colors.success}20` : `${colors.primary}12` }]}
                      activeOpacity={0.7}
                    >
                      <IconSymbol
                        size={14}
                        name={copiedProblemId === p.id ? "checkmark.circle.fill" : "doc.on.doc"}
                        color={copiedProblemId === p.id ? colors.success : colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                  {/* Hint toggle */}
                  <TouchableOpacity
                    accessibilityLabel="Toggle expanded hint"
                    onPress={() => setExpandedHint(expandedHint === p.id ? null : p.id)}
                    style={styles.hintToggle}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={14} name="lightbulb.fill" color={colors.warning} />
                    <Text style={[styles.hintToggleText, { color: colors.warning }]}>
                      {expandedHint === p.id ? "Hide hint" : "Show hint"}
                    </Text>
                  </TouchableOpacity>
                  {expandedHint === p.id && (
                    <View style={[styles.hintExpanded, { backgroundColor: `${colors.warning}08`, borderColor: `${colors.warning}25` }]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <Text style={[styles.hintText, { color: colors.foreground, fontSize: fs(13), flex: 1 }]}>{cleanMathText(p.hint)}</Text>
                        <TouchableOpacity
                          accessibilityLabel="Copy hint"
                          onPress={async () => {
                            try {
                              await Clipboard.setStringAsync(p.hint);
                              setCopiedHintId(p.id);
                              H.impactLight();
                              if (copiedHintIdTimerRef.current) clearTimeout(copiedHintIdTimerRef.current);
                              copiedHintIdTimerRef.current = setTimeout(() => setCopiedHintId(null), 1500);
                            } catch { /* ignore */ }
                          }}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          style={[styles.copyBtn, { backgroundColor: copiedHintId === p.id ? `${colors.success}20` : "transparent", marginTop: 2 }]}
                        >
                          <IconSymbol size={13} name={copiedHintId === p.id ? "checkmark.circle.fill" : "doc.on.doc"} color={copiedHintId === p.id ? colors.success : colors.muted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Style selector chips */}
        {!showAltExplanation && (
          <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginBottom: 8, flexWrap: "wrap" }}>
            {(["analogy", "step-by-step", "visual"] as const).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  setExplainStyle(s);
                  H.impactLight();
                  AsyncStorage.setItem("@tutorsnap/explainStyle", s).catch(() => {});
                }}
                style={[
                  styles.copyBtn,
                  {
                    backgroundColor: explainStyle === s ? `${colors.success}20` : `${colors.surface}`,
                    borderWidth: 1,
                    borderColor: explainStyle === s ? `${colors.success}50` : colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  },
                ]}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 13, fontWeight: explainStyle === s ? "700" : "500", color: explainStyle === s ? colors.success : colors.muted }}>
                  {s === "analogy" ? "Analogy" : s === "step-by-step" ? "Step-by-step" : "Visual"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Explain this Differently */}
        <TouchableOpacity
          accessibilityLabel="Explain this solution differently"
          onPress={() => {
            if (showAltExplanation && altExplanation) {
              setShowAltExplanation((v) => !v);
              return;
            }
            if (altExplanation && !showAltExplanation) {
              // Cached result: just show it instantly
              setShowAltExplanation(true);
              return;
            }
            runExplainDifferently();
          }}
          disabled={explainDiffLoading}
          style={[
            styles.discussBtn,
            { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` },
          ]}
          activeOpacity={0.8}
        >
          {explainDiffLoading ? (
            <ActivityIndicator size="small" color={colors.success} />
          ) : (
            <IconSymbol size={18} name="lightbulb.fill" color={colors.success} />
          )}
          <Text style={[styles.discussBtnText, { color: colors.success }]}>
            {showAltExplanation && altExplanation ? "Hide Alternative" : "Explain Differently"}
          </Text>
        </TouchableOpacity>

        {/* Skeleton loader while generating */}
        {explainDiffLoading && (
          <View style={[styles.altExplanationCard, { backgroundColor: `${colors.success}08`, borderColor: `${colors.success}30` }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <IconSymbol size={16} name="lightbulb.fill" color={colors.success} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Alternative Explanation</Text>
            </View>
            {[100, 85, 92, 70, 88].map((w, i) => (
              <View
                key={i}
                style={{
                  height: 13,
                  borderRadius: 6,
                  backgroundColor: `${colors.success}18`,
                  width: `${w}%`,
                  marginBottom: 8,
                }}
              />
            ))}
            <View style={{ height: 13, borderRadius: 6, backgroundColor: `${colors.success}18`, width: "55%" }} />
          </View>
        )}

        {/* Alternative explanation card */}
        {showAltExplanation && altExplanation && !explainDiffLoading && (
          <View style={[styles.altExplanationCard, { backgroundColor: `${colors.success}08`, borderColor: `${colors.success}30` }]}>
            {/* Row 1: icon + title (flex-shrink) + action buttons (fixed, never shrink) */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <IconSymbol size={16} name="lightbulb.fill" color={colors.success} style={{ flexShrink: 0 }} />
              <Text
                style={[styles.sectionTitle, { color: colors.foreground, flex: 1 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Alternative Explanation
              </Text>
              {/* Action buttons: fixed width, never shrink, always visible */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <TouchableOpacity
                  accessibilityLabel="Regenerate alternative explanation"
                  onPress={() => runExplainDifferently(true)}
                  style={[styles.copyBtn, { backgroundColor: `${colors.primary}15` }]}
                  disabled={explainDiffLoading}
                >
                  <IconSymbol size={14} name="arrow.clockwise" color={colors.primary} />
                  <Text style={[styles.copyText, { color: colors.primary }]}>Regenerate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Copy alternative explanation"
                  onPress={async () => {
                    try {
                      await Clipboard.setStringAsync(altExplanation!);
                      setCopyAltFeedback(true);
                      H.impactLight();
                      if (copyAltTimerRef.current) clearTimeout(copyAltTimerRef.current);
                      copyAltTimerRef.current = setTimeout(() => setCopyAltFeedback(false), 1500);
                    } catch { /* ignore */ }
                  }}
                  style={[styles.copyBtn, { backgroundColor: copyAltFeedback ? `${colors.success}20` : "transparent" }]}
                >
                  <IconSymbol size={14} name={copyAltFeedback ? "checkmark.circle.fill" : "doc.on.doc"} color={copyAltFeedback ? colors.success : colors.muted} />
                  <Text style={[styles.copyText, { color: copyAltFeedback ? colors.success : colors.muted }]}>{copyAltFeedback ? "Copied!" : "Copy"}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Row 2: metadata chips — wrap freely, never compete with action buttons */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              <View style={{ backgroundColor: `${colors.success}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.success }}>
                  {activeCardStyle === "analogy" ? "Analogy" : activeCardStyle === "step-by-step" ? "Step-by-step" : "Visual"}
                </Text>
              </View>
              {altExplanationCached && (
                <View style={{ backgroundColor: `${colors.success}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.success }}>Cached</Text>
                </View>
              )}
              {explainCount > 0 && (
                <View style={{ backgroundColor: `${colors.primary}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>#{explainCount}</Text>
                </View>
              )}
            </View>
            <AIResponseErrorBoundary fallbackText={altExplanation} fontSize={fs(14)} color={colors.foreground}>
              <AIResponseRenderer
                markdown={altExplanation}
                fontSize={fs(14)}
                color={colors.foreground}
                codeBackground={colors.surface}
                flavor="github"
                stripPreamble={false}
              />
            </AIResponseErrorBoundary>
            {/* Thumbs up/down rating row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: `${colors.success}20` }}>
              <Text style={{ fontSize: 12, color: colors.muted, flex: 1 }}>Was this helpful?</Text>
              {/* Thumbs up → opens store */}
              <TouchableOpacity
                accessibilityLabel="Rate explanation helpful"
                onPress={async () => {
                  if (altRating === "up") return;
                  setAltRating("up");
                  H.notificationSuccess();
                  try {
                    const url = Platform.OS === "ios"
                      ? "https://apps.apple.com/app/tutorsnap/id6748052679"
                      : "https://play.google.com/store/apps/details?id=com.tutorsnap.app";
                    await Linking.openURL(url);
                  } catch { /* ignore */ }
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: altRating === "up" ? `${colors.success}25` : colors.surface, borderWidth: 1, borderColor: altRating === "up" ? `${colors.success}50` : colors.border }}
              >
                <Text style={{ fontSize: 15 }}>👍</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: altRating === "up" ? colors.success : colors.muted }}>Yes</Text>
              </TouchableOpacity>
              {/* Thumbs down → dismiss */}
              <TouchableOpacity
                accessibilityLabel="Rate explanation not helpful"
                onPress={() => {
                  if (altRating === "down") return;
                  setAltRating("down");
                  H.impactLight();
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: altRating === "down" ? `${colors.error}15` : colors.surface, borderWidth: 1, borderColor: altRating === "down" ? `${colors.error}40` : colors.border }}
              >
                <Text style={{ fontSize: 15 }}>👎</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: altRating === "down" ? colors.error : colors.muted }}>No</Text>
              </TouchableOpacity>
            </View>
            {altRating === "down" && (
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 6, textAlign: "center" }}>Thanks for the feedback! Try regenerating with a different style.</Text>
            )}
            {/* Share explanation button */}
            <TouchableOpacity
              accessibilityLabel="Share this explanation"
              onPress={async () => {
                H.impactLight();
                const styleLabel = activeCardStyle === "analogy" ? "Analogy" : activeCardStyle === "step-by-step" ? "Step-by-step" : "Visual";
                const message = `📚 ${styleLabel} Explanation (via TutorSnap)\n\n❓ ${solution?.problem ?? ""}\n\n💡 ${altExplanation ?? ""}\n\nSolve more at ${APP_URL.replace("https://", "")}`;
                if (Platform.OS === "web") {
                  try {
                    await Clipboard.setStringAsync(message);
                    Alert.alert("Copied!", "Explanation copied to clipboard.");
                  } catch { /* ignore */ }
                  return;
                }
                try {
                  await Share.share({ message });
                } catch { /* user cancelled */ }
              }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, paddingVertical: 9, borderRadius: 12, backgroundColor: `${colors.primary}10`, borderWidth: 1, borderColor: `${colors.primary}25` }}
            >
              <IconSymbol size={15} name="paperplane.fill" color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>Share this explanation</Text>
            </TouchableOpacity>
            {/* Save to Notes button */}
            <TouchableOpacity
              accessibilityLabel="Save to Notes"
              onPress={async () => {
                if (saveNoteFeedback) return;
                H.impactLight();
                try {
                  const styleLabel = activeCardStyle === "analogy" ? "Analogy" : activeCardStyle === "step-by-step" ? "Step-by-step" : "Visual";
                  const noteContent = `📚 ${styleLabel} Explanation\n\n❓ ${solution?.problem ?? ""}\n\n💡 ${altExplanation ?? ""}`;
                  const SAVED_NOTES_KEY = "tutor_saved_notes";
                  const raw = await AsyncStorage.getItem(SAVED_NOTES_KEY);
                  const notes: { id: string; content: string; savedAt: number; type?: string }[] = raw ? JSON.parse(raw) : [];
                  notes.unshift({ id: `note-${Date.now()}`, content: noteContent, savedAt: Date.now(), type: "explanation" });
                  await AsyncStorage.setItem(SAVED_NOTES_KEY, JSON.stringify(notes.slice(0, 200)));
                  setSaveNoteFeedback(true);
                  H.notificationSuccess();
                  if (saveNoteTimerRef.current) clearTimeout(saveNoteTimerRef.current);
                  saveNoteTimerRef.current = setTimeout(() => setSaveNoteFeedback(false), 2000);
                } catch { /* ignore */ }
              }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, paddingVertical: 9, borderRadius: 12, backgroundColor: saveNoteFeedback ? `${colors.success}20` : `${colors.success}10`, borderWidth: 1, borderColor: saveNoteFeedback ? `${colors.success}50` : `${colors.success}25` }}
            >
              <IconSymbol size={15} name={saveNoteFeedback ? "checkmark.circle.fill" : "note.text.badge.plus"} color={colors.success} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.success }}>{saveNoteFeedback ? "Saved to Notes!" : "Save to Notes"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* All-3-styles prompt: shown after user has seen all 3 styles */}
        {seenStyles.size >= 3 && !explainDiffLoading && (
          <TouchableOpacity
            accessibilityLabel="Generate harder similar problems"
            activeOpacity={0.8}
            onPress={async () => {
              H.impactLight();
              try {
                const result = await generateSimilarMutation.mutateAsync({
                  problem: solution!.problem,
                  subject: solution!.subject,
                  difficulty: "hard",
                  count: 3,
                  gradeLevel: gradeLevel ?? undefined,
                });
                setSimilarProblems(result.problems ?? []);
                setShowSimilar(true);
                H.notificationSuccess();
                setTimeout(() => {
                  scrollRef.current?.scrollTo({ y: similarYRef.current - 16, animated: true });
                }, 150);
              } catch { /* ignore */ }
            }}
            style={{ marginHorizontal: 16, marginTop: 8, padding: 14, borderRadius: 14, backgroundColor: `${colors.warning}10`, borderWidth: 1, borderColor: `${colors.warning}40`, flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <Text style={{ fontSize: 18 }}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>You've explored all 3 styles!</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Ready for a challenge? Tap to generate harder similar problems.</Text>
            </View>
            {generateSimilarMutation.isPending
              ? <ActivityIndicator size="small" color={colors.warning} />
              : <IconSymbol size={16} name="chevron.right" color={colors.warning} />}
          </TouchableOpacity>
        )}




      </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navBarWrap: {
    borderBottomWidth: 0.5,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navProgressStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 6,
  },
  navProgressEmoji: { fontSize: 14 },
  navProgressText: { fontSize: 12, fontWeight: "600" },
  navProgressDot: { width: 3, height: 3, borderRadius: 2 },
  navProgressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  navProgressFill: { height: 4, borderRadius: 2 },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "700" },
  navActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  navActionBtn: { padding: 4 },
  headerTooltip: { position: "absolute", bottom: -28, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, zIndex: 999 },
  headerTooltipText: { fontSize: 12, fontWeight: "600" },
  badgeRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  subjectDot: { width: 8, height: 8, borderRadius: 4 },
  subjectBadgeText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  bookmarkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  bookmarkedText: { fontSize: 12, fontWeight: "600" },
  gradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  gradeBadgeText: { fontSize: 12, fontWeight: "700" },
  problemCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  problemLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  problemText: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
  answerCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  answerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  answerLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  answerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  copyText: { fontSize: 13, fontWeight: "600" },
  answerText: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  stepsSection: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  stepCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { fontSize: 13, fontWeight: "800" },
  stepTitle: { flex: 1, flexShrink: 1, fontSize: 14, fontWeight: "600" },
  stepBody: { paddingHorizontal: 14, paddingBottom: 14 },
  expressionBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  expressionText: { fontSize: 16, fontWeight: "700", fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace" },
  stepExplanation: { fontSize: 14, lineHeight: 22 },
  conceptCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  conceptText: { fontSize: 14, lineHeight: 22 },
  tipsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 22 },
  relatedSection: { paddingHorizontal: 16, marginBottom: 20 },
  relatedLabel: { fontSize: 13, fontWeight: "600", marginBottom: 10, letterSpacing: 0.5 },
  relatedChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relatedChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  relatedChipText: { fontSize: 13, fontWeight: "500" },
  actionRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  actionBtnText: { fontSize: 14, fontWeight: "700" },
  similarSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  similarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  similarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  similarTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  similarSub: { fontSize: 12 },
  similarList: { paddingHorizontal: 16, paddingBottom: 12 },
  similarItem: {
    borderTopWidth: 1,
    paddingVertical: 12,
    gap: 8,
  },
  similarItemHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  similarNum: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  similarNumText: { fontSize: 12, fontWeight: "800" },
  similarProblem: { flex: 1, fontWeight: "500", lineHeight: 20 },
  hintToggle: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 34 },
  hintToggleText: { fontSize: 12, fontWeight: "600" },
  hintText: { marginLeft: 34, lineHeight: 18 },
  shareOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 200,
    justifyContent: "flex-end",
  },
  shareMenu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: "75%",
    overflow: "hidden",
  },
  shareMenuHandle: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  shareMenuHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  shareMenuCancel: {
    borderTopWidth: 0.5,
    paddingVertical: 16,
    alignItems: "center",
  },
  shareMenuCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  shareMenuTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    paddingVertical: 14,
  },
  shareMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  shareMenuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  shareMenuInfo: { flex: 1 },
  shareMenuLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  shareMenuDesc: { fontSize: 12, lineHeight: 17 },
  linkToast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 300,
  },
  linkToastText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  discussBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  discussBtnText: { fontSize: 15, fontWeight: "700" },
  altExplanationCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  workedExampleCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  workedExampleProblem: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  workedExampleLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 6 },
  workedExampleProblemText: { fontSize: 14, lineHeight: 21, fontWeight: "500" },
  similarCopyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  hintExpanded: {
    marginLeft: 34,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  inviteShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  inviteShareBtnText: { fontSize: 14, fontWeight: "600" },
  jumpToSubmissionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  jumpToSubmissionText: {
    flex: 1,
    fontWeight: "600",
  },
});
