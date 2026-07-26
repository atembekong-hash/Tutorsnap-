import React, { useState, useRef, useCallback, useEffect } from "react";
import ReAnimated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Modal ,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Easing,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { MathKeyboard } from "@/components/math-keyboard";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProgress, getStreakEmoji, getDailyGoalPercent, getShieldCount, applyStreakShieldIfNeeded, type ProgressData } from "@/lib/progress";
import { useThemeContext } from "@/lib/theme-provider";
import type { HistoryItem, MathSubject } from "@/shared/types";
import { SubjectPicker } from "@/components/subject-picker";
import { type SubjectId, getSubjectDef, isMathSubject, getSubjectPlaceholder } from "@/lib/subjects";
import { VoiceButton } from "@/components/voice-button";
import { CheatSheetBottomSheet } from "@/components/cheat-sheet-bottom-sheet";
import { hasCheatSheet } from "@/lib/cheat-sheets";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { ErrorBoundary } from "@/components/error-boundary";
import { getWeeklyData, type WeeklyData } from "@/lib/weekly-goals";
import { StudyTipCard } from "@/components/study-tip-card";
import { getAlmostBadges, computeMasteryBadges, getSeenBadges, markBadgeSeen, type BadgeTier, BADGE_COLORS, BADGE_EMOJI } from "@/lib/mastery-badges";
import { getAffiliateStats } from "@/lib/affiliate";
import { loadStudySlots, formatTime, type StudySlot } from "@/lib/study-planner";
import { getShieldCount as _getShieldCount, earnShield } from "@/lib/progress";
import { BadgeUnlockModal } from "@/components/badge-unlock-modal";
import { getTodayQuestion, getDailyChallengeState } from "@/lib/daily-challenge";
import { getMyClassroom, getJoinedClassroom, getClassroomFeed, type ClassroomProblem } from "@/lib/classroom";
import * as Notifications from "expo-notifications";
import { usePremium } from "@/hooks/use-premium";
import { FREE_LIMITS } from "@/lib/subscription";
import { UpsellNudgeBanner } from "@/components/upsell-nudge-banner";
import { useAppearance } from "@/lib/appearance-context";
import { loadGlobalGrade, saveGlobalGrade, GRADE_LABELS, GRADE_OPTIONS } from "@/lib/grade-levels";
import { listSessionSummaries, type ChatSessionSummary } from "@/lib/chat-sessions";
import { Swipeable } from "react-native-gesture-handler";
import { cleanMathText } from "@/lib/clean-math-text";
import { useAuth } from "@/lib/auth-context";
import { StreakMilestoneModal } from "@/components/streak-milestone-modal";
import { checkStreakMilestone, type MilestoneInfo } from "@/lib/streak-milestones";
import { HomeSkeletonScreen, DotsLoader } from "@/components/skeleton";
import { SolveMilestoneModal, shouldCelebrateSolveMilestone } from "@/components/solve-milestone-modal";

function getAppearanceSubjectKey(subjectId: string): string {
  const def = getSubjectDef(subjectId);

  switch (def.label) {
    case "Physics":
    case "Chemistry":
    case "Biology":
    case "Statistics":
    case "Economics":
    case "Geometry":
    case "Computer Science":
      return def.label;
    default:
      return def.category === "math" ? "Mathematics" : def.label;
  }
}

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

// 70 grade-grouped examples — 10 groups of 7
const GRADE_EXAMPLE_GROUPS: { id: string; label: string; emoji: string; questions: string[] }[] = [
  {
    id: "gr1_2",
    label: "Grade 1 - 2",
    emoji: "🌱",
    questions: [
      "What is 5 + 7?",
      "How many sides does a triangle have?",
      "What sound does the letter B make?",
      "If I have 10 apples and eat 3, how many are left?",
      "What is bigger: 15 or 9?",
      "Name three animals that live in the ocean.",
      "What day comes after Monday?",
    ],
  },
  {
    id: "gr3_4",
    label: "Grade 3 - 4",
    emoji: "📚",
    questions: [
      "What is 12 x 9?",
      "What is the perimeter of a rectangle with length 8 and width 5?",
      "What is a noun? Give two examples.",
      "What are the three states of matter?",
      "What is the capital of France?",
      "Write a sentence using a simile.",
      "What is 3/4 + 1/4?",
    ],
  },
  {
    id: "gr5_6",
    label: "Grade 5 - 6",
    emoji: "🔢",
    questions: [
      "What is 15% of 80?",
      "Explain the difference between a prime and composite number.",
      "What is the main idea of a paragraph?",
      "Describe the water cycle.",
      "What caused the American Revolution?",
      "Simplify: 24/36",
      "What is the difference between a simile and a metaphor?",
    ],
  },
  {
    id: "gr7_8",
    label: "Grade 7 - 8",
    emoji: "📐",
    questions: [
      "Solve for x: 3x - 5 = 16",
      "What is the Pythagorean theorem? Give an example.",
      "Explain the difference between mitosis and meiosis.",
      "What is the theme of To Kill a Mockingbird?",
      "What were the main causes of World War I?",
      "Calculate the area of a circle with radius 7.",
      "What is Newton's Second Law of Motion?",
    ],
  },
  {
    id: "gr9_10",
    label: "Grade 9 - 10",
    emoji: "🧮",
    questions: [
      "Solve: 2x^2 + 5x - 3 = 0 using the quadratic formula.",
      "Explain the difference between ionic and covalent bonds.",
      "Analyze the symbolism of the green light in The Great Gatsby.",
      "What were the causes and effects of the French Revolution?",
      "Find the slope of the line through (2, 3) and (5, 9).",
      "Explain the law of conservation of energy.",
      "What is the difference between active and passive voice?",
    ],
  },
  {
    id: "gcse",
    label: "GCSE",
    emoji: "🇬🇧",
    questions: [
      "Expand and simplify: (x + 3)(x - 2)",
      "Balance the equation: Mg + HCl to MgCl2 + H2",
      "Explain how natural selection leads to evolution.",
      "Analyse the effect of the writer's language choices in this extract.",
      "What is the difference between speed and velocity?",
      "Calculate the compound interest on 500 at 4% for 3 years.",
      "Describe the causes of the First World War.",
    ],
  },
  {
    id: "alevel",
    label: "A-Level",
    emoji: "🎓",
    questions: [
      "Differentiate f(x) = x^3 sin(x) using the product rule.",
      "Explain the mechanism of nucleophilic substitution (SN2).",
      "Critically evaluate Keynesian economic theory.",
      "Analyse the use of free indirect discourse in Emma by Jane Austen.",
      "Derive the equation for simple harmonic motion.",
      "What is the Hardy-Weinberg principle and when does it apply?",
      "Evaluate the integral of (x^2 + 3x) between x = 1 and x = 4.",
    ],
  },
  {
    id: "university",
    label: "University",
    emoji: "🏛️",
    questions: [
      "Prove that the square root of 2 is irrational.",
      "Explain the Heisenberg uncertainty principle and its implications.",
      "Compare Rawls' theory of justice with Nozick's libertarianism.",
      "Derive the Black-Scholes option pricing formula.",
      "Explain the mechanism of action of CRISPR-Cas9.",
      "What is the difference between frequentist and Bayesian inference?",
      "Solve the differential equation: dy/dx + 2y = e^(-x)",
    ],
  },
  {
    id: "stem_mix",
    label: "STEM Mix",
    emoji: "⚗️",
    questions: [
      "What is the time complexity of binary search?",
      "Explain how a transformer works.",
      "What is the difference between machine learning and deep learning?",
      "Calculate the pH of a 0.01 M HCl solution.",
      "Explain the central dogma of molecular biology.",
      "What is the difference between series and parallel circuits?",
      "Solve: log base 2 of x = 5",
    ],
  },
  {
    id: "humanities_mix",
    label: "Humanities Mix",
    emoji: "🌍",
    questions: [
      "What is cognitive dissonance? Give a real-world example.",
      "Explain the difference between a democracy and a republic.",
      "What is the significance of the Magna Carta?",
      "Explain supply and demand with a real-world example.",
      "What is the difference between weather and climate?",
      "Analyse the theme of power in Animal Farm.",
      "What is the difference between primary and secondary sources?",
    ],
  },
];


// ─── Today Row ───────────────────────────────────────────────────────────────
interface TodayRowProps {
  progress: import("@/lib/progress").ProgressData | null;
  weeklyData: import("@/lib/weekly-goals").WeeklyData | null;
  almostBadge: { subject: string; subjectLabel: string; remaining: number; nextTier: "bronze" | "silver" | "gold" } | null;
  bannerDismissed: boolean;
  isPremium: boolean;
  isDevMode: boolean;
  isOnline: boolean;
  selectedSubject: import("@/lib/subjects").SubjectId | null;
  usage: { solves: number };
  gradeLevel: string | null;
  onShieldEarned: (count: number) => void;
  onSolveNow: () => void;
  onDismissBadge: () => void;
  onGoSolveBadge: () => void;
  onWeeklyGoalChanged: () => void;
}

function TodayRow({
  progress, weeklyData, almostBadge, bannerDismissed,
  isPremium, isDevMode: _isDevMode, isOnline: _isOnline, selectedSubject: _selectedSubject, usage, gradeLevel,
  onShieldEarned, onSolveNow, onDismissBadge: _onDismissBadge, onGoSolveBadge, onWeeklyGoalChanged: _onWeeklyGoalChanged,
}: TodayRowProps) {
  const colors = useColors();
  const router = useRouter();
  const { widgetWidth, visibleWidgetOrder: _visibleWidgetOrder, isWidgetVisible, getSubjectAccent } = useAppearance();
  const { colorScheme } = useThemeContext();
  const streak = progress?.streak?.currentStreak ?? 0;
  const todaySolved = progress?.streak?.todaySolved ?? 0;
  const [shields, setShields] = React.useState(0);
  const [canEarn, setCanEarn] = React.useState(false);
  const [todaySlots, setTodaySlots] = React.useState<StudySlot[]>([]);
  const [affiliatePending, setAffiliatePending] = React.useState(0);
  const [challengeCompleted, setChallengeCompleted] = React.useState(false);
  const [challengeCorrect, setChallengeCorrect] = React.useState<boolean | null>(null);
  const [isEvening, setIsEvening] = React.useState(false);

  React.useEffect(() => {
    _getShieldCount().then((c) => {
      setShields(c);
      setCanEarn(streak > 0 && streak % 7 === 0 && c < 3);
    });
    loadStudySlots().then((all) => {
      const todayWeekday = new Date().getDay() as StudySlot["weekday"];
      setTodaySlots(all.filter((s) => s.weekday === todayWeekday).sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)));
    });
    getAffiliateStats().then((s) => setAffiliatePending(s?.pendingDays ?? 0)).catch(() => {});
    getDailyChallengeState().then((s) => { setChallengeCompleted(s.completed); setChallengeCorrect(s.correct); });
    const h = new Date().getHours();
    setIsEvening(h >= 18 && h < 24);
  }, [streak]);

  const cards: React.ReactNode[] = [];

  // Build cards in the order specified by visibleWidgetOrder (from AppearanceContext)
  // Each card is only added if its widget is visible in settings

  // 1. Streak card (always show when streak > 0)
  if (streak > 0 && isWidgetVisible("streak")) {
    const streakEmoji = getStreakEmoji(streak);
    const shieldLabel = shields === 0 ? "No shields" : `${shields}/3 shields`;
    cards.push(
      <TouchableOpacity
        key="streak"
        onPress={() => router.push("/progress" as any)}
        activeOpacity={0.82}
        style={[trStyles.card, { width: widgetWidth, backgroundColor: colors.surface, borderColor: `${colors.primary}35` }]}
        accessibilityLabel={`Streak: ${streak} days`}
      >
        <Text style={trStyles.cardEmoji}>{streakEmoji}</Text>
        <Text style={[trStyles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{streak} day{streak !== 1 ? "s" : ""}</Text>
        <Text style={[trStyles.cardSub, { color: colors.muted }]} numberOfLines={2}>{shieldLabel}</Text>
        {canEarn && (
          <TouchableOpacity
            onPress={async () => {
              const n = await earnShield();
              setShields(n);
              setCanEarn(false);
              onShieldEarned(n);
            }}
            style={[trStyles.cardBadge, { backgroundColor: `${colors.primary}20` }]}
          >
            <Text style={[trStyles.cardBadgeText, { color: colors.primary }]}>Claim 🛡️</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // 2. Daily Challenge card — moved to TripleWidget below
  const q = getTodayQuestion(gradeLevel);
  const qColor = getSubjectAccent(getAppearanceSubjectKey(q.subject), colorScheme);

  // 3. Global Rankings — moved to TripleWidget below

  // 4. Study Plan (only if sessions today)
  if (todaySlots.length > 0 && isWidgetVisible("study")) {
    const next = todaySlots.find((s) => {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      return s.hour * 60 + s.minute >= nowMin;
    }) ?? todaySlots[0];
    cards.push(
      <TouchableOpacity
        key="study"
        onPress={() => router.push("/study-planner" as any)}
        activeOpacity={0.82}
        style={[trStyles.card, { width: widgetWidth, backgroundColor: colors.surface, borderColor: `${colors.primary}35` }]}
        accessibilityLabel="Open study planner"
      >
        <Text style={trStyles.cardEmoji}>📅</Text>
        <Text style={[trStyles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>Study Plan</Text>
        <Text style={[trStyles.cardSub, { color: colors.muted }]} numberOfLines={2}>{todaySlots.length} session{todaySlots.length !== 1 ? "s" : ""} · {formatTime(next.hour, next.minute)}</Text>
      </TouchableOpacity>
    );
  }

  // 5. Weekly Goals — moved to TripleWidget below

  // 6. Almost-There Badge (only if applicable and not dismissed)
  if (almostBadge && !bannerDismissed && isWidgetVisible("badge")) {
    const tierColor = BADGE_COLORS[almostBadge.nextTier];
    const tierEmoji = BADGE_EMOJI[almostBadge.nextTier];
    cards.push(
      <TouchableOpacity
        key="badge"
        onPress={onGoSolveBadge}
        activeOpacity={0.82}
        style={[trStyles.card, { width: widgetWidth, backgroundColor: colors.surface, borderColor: `${tierColor}50` }]}
        accessibilityLabel={`Almost ${almostBadge.nextTier} badge in ${almostBadge.subjectLabel}`}
      >
        <Text style={trStyles.cardEmoji}>{tierEmoji}</Text>
        <Text style={[trStyles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{almostBadge.subjectLabel}</Text>
        <Text style={[trStyles.cardSub, { color: colors.muted }]} numberOfLines={2}>{almostBadge.remaining} more for {almostBadge.nextTier}</Text>
      </TouchableOpacity>
    );
  }

  // 7. Evening streak protection (only if applicable)
  if (!isPremium && isEvening && streak > 0 && todaySolved === 0 && isWidgetVisible("streakprotect")) {
    cards.push(
      <TouchableOpacity
        key="streakprotect"
        onPress={() => !isPremium && usage.solves >= FREE_LIMITS.solvesPerDay ? router.push("/paywall" as any) : onSolveNow()}
        activeOpacity={0.82}
        style={[trStyles.card, { width: widgetWidth, backgroundColor: colors.surface, borderColor: `${colors.warning}50` }]}
        accessibilityLabel="Protect your streak"
      >
        <Text style={trStyles.cardEmoji}>⚠️</Text>
        <Text style={[trStyles.cardTitle, { color: colors.warning }]} numberOfLines={1}>Streak at risk!</Text>
        <Text style={[trStyles.cardSub, { color: colors.muted }]} numberOfLines={2}>Solve now to keep it</Text>
      </TouchableOpacity>
    );
  }

  // 8. Affiliate earnings (only if pending days > 0)
  if (affiliatePending > 0 && isWidgetVisible("affiliate")) {
    cards.push(
      <TouchableOpacity
        key="affiliate"
        onPress={() => router.push("/refer" as any)}
        activeOpacity={0.82}
        style={[trStyles.card, { width: widgetWidth, backgroundColor: colors.surface, borderColor: `${colors.success}35` }]}
        accessibilityLabel="View affiliate earnings"
      >
        <Text style={trStyles.cardEmoji}>💰</Text>
        <Text style={[trStyles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>Earnings</Text>
        <Text style={[trStyles.cardSub, { color: colors.muted }]} numberOfLines={1}>{affiliatePending} days pending</Text>
      </TouchableOpacity>
    );
  }

  const challengeStatus = challengeCompleted
    ? (challengeCorrect ? "✅ Done" : "❌ Attempted")
    : `+${q.bonusXp} XP`;
  const challengeBorderColor = challengeCompleted
    ? (challengeCorrect ? `${colors.success}50` : `${colors.error}35`)
    : `${qColor}35`;

  return (
    <View>
      {/* Horizontal small-widget strip (streak, study, badge, affiliate, etc.) */}
      {cards.length > 0 && (
        <ReAnimated.View entering={FadeInDown.duration(350).delay(80)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={trStyles.row}
          style={trStyles.container}
          snapToInterval={widgetWidth + 10}
          snapToAlignment="start"
          decelerationRate="fast"
          pagingEnabled={false}
        >
          {cards}
                </ScrollView>
        </ReAnimated.View>
      )}
      {/* ── Triple Widget: Daily Challenge + Rankings + Weekly Goal ── */}
      <ReAnimated.View entering={FadeInDown.duration(350).delay(180)}>
      <View style={[trStyles.tripleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Row 1: Daily Challenge */}
        {isWidgetVisible("challenge") && (
          <TouchableOpacity
            onPress={() => router.push("/daily-challenge" as any)}
            activeOpacity={0.82}
            style={[trStyles.tripleRow, { borderColor: challengeBorderColor }]}
            accessibilityLabel="Open Daily Challenge"
          >
            <View style={[trStyles.tripleIconWrap, { backgroundColor: `${qColor}18` }]}>
              <Text style={trStyles.tripleEmoji}>⚡</Text>
            </View>
            <View style={trStyles.tripleContent}>
              <Text style={[trStyles.tripleTitle, { color: colors.foreground }]} numberOfLines={1}>Daily Challenge</Text>
              <Text style={[trStyles.tripleSub, { color: colors.muted }]} numberOfLines={1}>{challengeStatus}</Text>
            </View>
            <IconSymbol size={14} name="chevron.right" color={colors.muted} />
          </TouchableOpacity>
        )}

        {/* Divider */}
        {isWidgetVisible("challenge") && (isWidgetVisible("rankings") || (weeklyData && isWidgetVisible("goals"))) && (
          <View style={[trStyles.tripleDivider, { backgroundColor: colors.border }]} />
        )}

        {/* Row 2: Rankings */}
        {isWidgetVisible("rankings") && (
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/leaderboard" as any)}
            activeOpacity={0.82}
            style={[trStyles.tripleRow, { borderColor: `${colors.warning}35` }]}
            accessibilityLabel="View global rankings"
          >
            <View style={[trStyles.tripleIconWrap, { backgroundColor: `${colors.warning}18` }]}>
              <Text style={trStyles.tripleEmoji}>🏆</Text>
            </View>
            <View style={trStyles.tripleContent}>
              <Text style={[trStyles.tripleTitle, { color: colors.foreground }]} numberOfLines={1}>Rankings</Text>
              <Text style={[trStyles.tripleSub, { color: colors.muted }]} numberOfLines={1}>Weekly leaderboard</Text>
            </View>
            <IconSymbol size={14} name="chevron.right" color={colors.muted} />
          </TouchableOpacity>
        )}

        {/* Divider */}
        {isWidgetVisible("rankings") && weeklyData && isWidgetVisible("goals") && (
          <View style={[trStyles.tripleDivider, { backgroundColor: colors.border }]} />
        )}

        {/* Row 3: Weekly Goal */}
        {weeklyData && isWidgetVisible("goals") && (
          <TouchableOpacity
            onPress={() => router.push("/progress" as any)}
            activeOpacity={0.82}
            style={[trStyles.tripleRow, { borderColor: `${colors.success}35` }]}
            accessibilityLabel="View weekly goals"
          >
            <View style={[trStyles.tripleIconWrap, { backgroundColor: `${colors.success}18` }]}>
              <Text style={trStyles.tripleEmoji}>🎯</Text>
            </View>
            <View style={trStyles.tripleContent}>
              <Text style={[trStyles.tripleTitle, { color: colors.foreground }]} numberOfLines={1}>Weekly Goal</Text>
              <View style={trStyles.tripleGoalRow}>
                <View style={[trStyles.tripleProgressTrack, { backgroundColor: `${colors.success}20` }]}>
                  <View style={[trStyles.tripleProgressFill, { width: `${weeklyData.goalPct}%` as any, backgroundColor: colors.success }]} />
                </View>
                <Text style={[trStyles.tripleGoalPct, { color: colors.success }]}>{weeklyData.goalPct}%</Text>
              </View>
              <Text style={[trStyles.tripleSub, { color: colors.muted }]} numberOfLines={1}>{weeklyData.quizzesThisWeek}/{weeklyData.weeklyGoal} quizzes</Text>
            </View>
            <IconSymbol size={14} name="chevron.right" color={colors.muted} />
          </TouchableOpacity>
        )}
            </View>
      </ReAnimated.View>
    </View>
  );
}
const trStyles = StyleSheet.create({
  container: { marginTop: 8 },
  row: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  card: {
    width: 130, // overridden at runtime via widgetWidth from AppearanceContext
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 8,
    gap: 2,
    overflow: "hidden",
    minWidth: 0,
  },
  cardEmoji: { fontSize: 16 },
  cardTitle: { fontSize: 11, fontWeight: "700", marginTop: 2, flexShrink: 1, minWidth: 0 },
  cardSub: { fontSize: 10, lineHeight: 13, flexShrink: 1, minWidth: 0 },
  cardBadge: { marginTop: 3, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", maxWidth: "100%" },
  cardBadgeText: { fontSize: 10, fontWeight: "700" },
  progressBar: { height: 3, borderRadius: 2, marginTop: 3, overflow: "hidden", alignSelf: "stretch" },
  progressFill: { height: 3, borderRadius: 2 },
  // Triple Widget styles
  tripleCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  tripleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    minWidth: 0,
  },
  tripleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tripleEmoji: { fontSize: 18 },
  tripleContent: { flex: 1, minWidth: 0, gap: 2 },
  tripleTitle: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  tripleSub: { fontSize: 12, flexShrink: 1 },
  tripleGoalRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  tripleProgressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  tripleProgressFill: { height: 6, borderRadius: 3 },
  tripleGoalPct: { fontSize: 12, fontWeight: "700", flexShrink: 0 },
  tripleDivider: { height: 1, marginHorizontal: 16 },
});


// ─── Main Screen ──────────────────────────────────────────────────────────────
function SolveScreenContent() {
  const colors = useColors();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useThemeContext();
  const [problem, setProblem] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [showMathKeyboard, setShowMathKeyboard] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const { isOnline } = useNetworkStatus();

  // Auto-hide math keyboard when a non-math subject is selected
  const handleSubjectChange = useCallback((id: SubjectId | null) => {
    setSelectedSubject(id);
    if (!isMathSubject(id)) {
      setShowMathKeyboard(false);
    }
  }, []);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [almostBadge, setAlmostBadge] = useState<{ subject: string; subjectLabel: string; remaining: number; nextTier: "bronze" | "silver" | "gold" } | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [_shieldCount, setShieldCount] = useState(0);
  const [shieldUsedToast, setShieldUsedToast] = useState(false);
  const [pendingBadge, setPendingBadge] = useState<{ tier: BadgeTier; subjectLabel: string } | null>(null);
  const [dueSoonHomework, setDueSoonHomework] = useState<ClassroomProblem | null>(null);
  const [homeworkBannerDismissed, setHomeworkBannerDismissed] = useState(false);
  const [_pendingNotifCount, setPendingNotifCount] = useState(0);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallContext, setPaywallContext] = useState<string | null>(null);
  const { isPremium, isTrialActive, trialDaysRemaining, usage, checkLimit, incrementUsage: incUsage, isDevMode } = usePremium();
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const cursorPosRef = useRef<number>(0);
  const shieldToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [homeGradeLevel, setHomeGradeLevel] = useState<string | null>(null);
  const [showSolveGradePicker, setShowSolveGradePicker] = useState(false);
  const [rememberGrade, setRememberGrade] = useState(false);
  const [_userName, setUserName] = useState<string | null>(null); // used by StreakMilestoneModal
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [lastSession, setLastSession] = useState<ChatSessionSummary | null>(null);
  const [quickAskText, setQuickAskText] = useState("");
  const [continueSessionDismissed, setContinueSessionDismissed] = useState(false);
  const [sessionPreviewTooltip, setSessionPreviewTooltip] = useState(false);
  const bannerScaleAnim = useRef(new Animated.Value(1)).current;
  const quickAskInputRef = useRef<TextInput>(null);
  // Phase 7 animations
  const [inputFocused, setInputFocused] = useState(false);
  const solveBtnScale = useSharedValue(1);
  const solveBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: solveBtnScale.value }],
  }));
  const [undoToast, setUndoToast] = useState(false);
  const undoToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showQuickAskSubjectPicker, setShowQuickAskSubjectPicker] = useState(false);
  // Round 40: recent subjects row
  const [recentSubjects, setRecentSubjects] = useState<SubjectId[]>([]);
  // Round 40: quick ask history dropdown
  const [quickAskHistory, setQuickAskHistory] = useState<string[]>([]);
  const [showQuickAskHistory, setShowQuickAskHistory] = useState(false);
  // Round 40: animated undo toast
  const undoToastAnim = useRef(new Animated.Value(0)).current; // 0=hidden, 1=visible
  // Recent solves mini-history
  const [recentSolves, setRecentSolves] = useState<HistoryItem[]>([]);
  // Streak milestone celebration
  const [streakMilestone, setStreakMilestone] = useState<MilestoneInfo | null>(null);
  // Solve milestone celebration (10, 25, 50, 100 solves)
  const [solveMilestoneCount, setSolveMilestoneCount] = useState<number | null>(null);
  // Home loading state — show skeleton until first progress load completes
  const [homeLoading, setHomeLoading] = useState(true);

  const loadProgress = async () => {
    const p = await getProgress();
    setProgress(p);
    setHomeLoading(false);
    // Find the closest almost-badge to nudge the user
    const almosts = getAlmostBadges(p.subjectCounts);
    if (almosts.length > 0) {
      const a = almosts[0];
      setAlmostBadge({ subject: a.subject, subjectLabel: a.label, remaining: a.remaining, nextTier: a.nextTier });
      setBannerDismissed(false);
    } else {
      setAlmostBadge(null);
    }
  };

  const loadWeeklyData = async () => {
    const w = await getWeeklyData();
    setWeeklyData(w);
  };

  const loadDueSoonHomework = async () => {
    try {
      const [mine, joined] = await Promise.all([getMyClassroom(), getJoinedClassroom()]);
      const active = mine || joined;
      if (!active) { setDueSoonHomework(null); return; }
      const feed = await getClassroomFeed(active.code);
      const now = Date.now();
      const soon = feed
        .filter((p) => p.isHomework && p.dueDate)
        .filter((p) => {
          const diff = (new Date(p.dueDate!).getTime() - now) / (1000 * 60 * 60);
          return diff >= 0 && diff <= 24;
        })
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
      setDueSoonHomework(soon[0] || null);
      setHomeworkBannerDismissed(false);
    } catch { setDueSoonHomework(null); }
  };

  useFocusEffect(
    useCallback(() => {
      // Apply streak shield if user missed a day
      applyStreakShieldIfNeeded().then(({ shieldUsed }) => {
        if (shieldUsed) {
          setShieldUsedToast(true);
          if (shieldToastTimerRef.current) clearTimeout(shieldToastTimerRef.current);
          shieldToastTimerRef.current = setTimeout(() => setShieldUsedToast(false), 4000);
        }
      });
      getShieldCount().then(setShieldCount);
      loadGlobalGrade().then((g: string | null) => {
        setHomeGradeLevel(g);
        // Auto-expand the user's grade group in Try Examples
        if (g) setExpandedGroups(new Set([g]));
      });
      AsyncStorage.getItem("@tutorsnap/userName").then((n) => setUserName(n || null));
      AsyncStorage.getItem("@tutorsnap/avatarUri").then((uri) => setAvatarUri(uri || null));
      // Load most recent chat session for "Continue last chat" link
      listSessionSummaries().then((sessions) => {
        const sorted = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        setLastSession(sorted[0] ?? null);
      }).catch(() => {});
      // Load continue-session dismissed state
      AsyncStorage.getItem("@tutorsnap/continueSessionDismissed").then((v) => {
        setContinueSessionDismissed(v === "1");
      }).catch(() => {});
      // Round 40: load recent subjects from chat sessions (last 3 unique non-null subjects)
      listSessionSummaries().then((sessions) => {
        const sorted = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        const seen = new Set<string>();
        const recent: SubjectId[] = [];
        for (const s of sorted) {
          if (s.subject && !seen.has(s.subject) && recent.length < 3) {
            seen.add(s.subject);
            recent.push(s.subject as SubjectId);
          }
        }
        setRecentSubjects(recent);
      }).catch(() => {});
      // Round 40: load quick ask history (last 5 queries)
      AsyncStorage.getItem("@tutorsnap/quickAskHistory").then((v) => {
        setQuickAskHistory(v ? JSON.parse(v) : []);
      }).catch(() => {});
      loadProgress();
      loadWeeklyData();
      loadDueSoonHomework();
      // Load recent solves for mini-history widget
      AsyncStorage.getItem("math_history").then((v) => {
        const history: HistoryItem[] = v ? JSON.parse(v) : [];
        setRecentSolves(history.slice(0, 3));
      }).catch(() => {});
      // Load pending notification count for bell badge
      if (Platform.OS !== "web") {
        Notifications.getAllScheduledNotificationsAsync()
          .then((reqs: unknown[]) => setPendingNotifCount(reqs.length))
          .catch(() => {});
      }
      // Onboarding check intentionally removed from here.
      // auth-screen.tsx calls getPostAuthRoute() after sign-in which routes to
      // /onboarding if needed. Checking here caused a race condition where
      // onboarding appeared before the sign-in screen on first launch.
    }, [])
  );

  // Auth guard is handled in the root layout via AuthGuard component.
  // Onboarding check: only redirect to onboarding once the user is confirmed
  // signed in. Running this unconditionally on mount caused a race where
  // onboarding appeared before the auth-screen on fresh installs.
  const { isSignedIn, isLoading: authLoading } = useAuth();
  useEffect(() => {
    if (authLoading || !isSignedIn) return; // wait until auth is resolved and user is in
    (async () => {
      try {
        const onboardingDone = await AsyncStorage.getItem("@tutorsnap/onboardingDone");
        if (!onboardingDone) {
          router.replace("/onboarding" as any);
        }
      } catch { /* ignore */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isSignedIn]);

  const solveMutation = trpc.academic.solve.useMutation({
    onSuccess: async (data) => {
      H.notificationSuccess();
      const historyItem = {
        id: `history-${Date.now()}`,
        problem: data.problem || problem,
        answer: data.answer,
        subject: data.subject as MathSubject,
        steps: data.steps || [],
        conceptExplained: data.conceptExplained,
        tips: data.tips,
        solvedAt: Date.now(),
        gradeLevel: homeGradeLevel ?? null,
      } as HistoryItem & { gradeLevel: string | null };
      try {
        const existing = await AsyncStorage.getItem("math_history");
        const history: HistoryItem[] = existing ? JSON.parse(existing) : [];
        history.unshift(historyItem);
        await AsyncStorage.setItem("math_history", JSON.stringify(history.slice(0, 100)));
        // Mirror to cloud (fire-and-forget)
        const { pushSolve } = await import("@/lib/cloud-sync");
        pushSolve({
          problem: historyItem.problem,
          answer: historyItem.answer,
          subject: historyItem.subject,
          solutionJson: JSON.stringify({ steps: historyItem.steps, conceptExplained: historyItem.conceptExplained }),
          bookmarked: false,
          solvedAt: historyItem.solvedAt ?? Date.now(),
        }).catch(() => {});
      } catch (_) {
        // ignore
      }
      // Record solve in progress
      const { recordSolve } = await import("@/lib/progress");
      const updatedProgress = await recordSolve(data.subject as MathSubject || "other");
      await loadProgress();
      // Cancel streak alert if daily goal is now met
      try {
        const { cancelStreakAlert } = await import("@/lib/streak-notifications");
        if (updatedProgress.streak.todaySolved >= updatedProgress.streak.dailyGoal) {
          await cancelStreakAlert();
        }
      } catch { /* ignore */ }
      // Check for streak milestone celebration
      try {
        const hit = await checkStreakMilestone(updatedProgress.streak.currentStreak);
        if (hit) setStreakMilestone(hit);
      } catch { /* ignore */ }
      // Check if a new badge was just earned
      try {
        const { getProgress: getP } = await import("@/lib/progress");
        const freshProgress = await getP();
        if (freshProgress?.subjectCounts) {
          const badges = computeMasteryBadges(freshProgress.subjectCounts);
          const seen = await getSeenBadges();
          for (const badge of badges) {
            const key = `${badge.subject}-${badge.tier}`;
            if (!seen.has(key)) {
              await markBadgeSeen(badge.subject, badge.tier);
              setPendingBadge({ tier: badge.tier, subjectLabel: badge.label });
              break; // show one at a time
            }
          }
        }
      } catch {
        // ignore badge check errors
      }

      // Refresh recent solves widget
      AsyncStorage.getItem("math_history").then((v) => {
        const h: HistoryItem[] = v ? JSON.parse(v) : [];
        setRecentSolves(h.slice(0, 3));
        // Show celebration modal at solve milestones (10, 25, 50, 100)
        // Guard ensures each milestone fires exactly once per user lifetime
        const SOLVE_MILESTONES = new Set([10, 25, 50, 100]);
        if (SOLVE_MILESTONES.has(h.length)) {
          shouldCelebrateSolveMilestone(h.length).then((should) => {
            if (should) setSolveMilestoneCount(h.length);
          }).catch(() => {});
        }
      }).catch(() => {});
      router.push({
        pathname: "/solution",
        params: { data: JSON.stringify(data) },
      });
    },
    onError: () => {
      H.notificationError();
    },
  });

  const handleSolve = async () => {
    if (!problem.trim()) return;
    // Usage limit check (free tier)
    if (!checkLimit("solves")) {
      setPaywallContext(`You've used your ${FREE_LIMITS.solvesPerDay} free solve${(FREE_LIMITS.solvesPerDay as number) === 1 ? "" : "s"} today. Upgrade to solve unlimited problems.`);
      setShowPaywallModal(true);
      return;
    }
    Keyboard.dismiss();
    setShowMathKeyboard(false);
    H.impactMedium();
    await incUsage("solves");
    const fullProblem = problem.trim();
    solveMutation.mutate({ problem: fullProblem, subject: selectedSubject ?? "other", gradeLevel: homeGradeLevel ?? undefined });
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

  // Round 40: persist a quick ask query to the history list (max 5, deduped)
  const saveQuickAskToHistory = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      const existing = await AsyncStorage.getItem("@tutorsnap/quickAskHistory");
      const prev: string[] = existing ? JSON.parse(existing) : [];
      const deduped = [trimmed, ...prev.filter((q) => q !== trimmed)].slice(0, 5);
      await AsyncStorage.setItem("@tutorsnap/quickAskHistory", JSON.stringify(deduped));
      setQuickAskHistory(deduped);
    } catch { /* ignore */ }
  }, []);

  // Round 40: animate undo toast in/out
  useEffect(() => {
    Animated.timing(undoToastAnim, {
      toValue: undoToast ? 1 : 0,
      duration: undoToast ? 220 : 180,
      useNativeDriver: true,
      easing: undoToast ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
    }).start();
  }, [undoToast, undoToastAnim]);

  // Round 40: cleanup timer refs on unmount
  useEffect(() => {
    return () => {
      if (undoToastTimerRef.current) clearTimeout(undoToastTimerRef.current);
      if (shieldToastTimerRef.current) clearTimeout(shieldToastTimerRef.current);
    };
  }, []);

  const streak = progress?.streak;
  const dailyGoalPct = streak
    ? getDailyGoalPercent(streak.todaySolved, streak.dailyGoal)
    : 0;
  const streakEmoji = streak ? getStreakEmoji(streak.currentStreak) : "🌱";

  if (homeLoading) {
    return (
      <ScreenContainer>
        <HomeSkeletonScreen />
      </ScreenContainer>
    );
  }

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
          {/* Header — Row 1: app name + action icons */}
          <View style={styles.header}>
            <View style={styles.headerRow1}>
              <View>
                <Text style={[styles.greeting, { color: colors.muted }]}>TutorSnap</Text>
                <Text style={[styles.title, { color: colors.foreground }]}>Solve any problem</Text>
              </View>
              <View style={styles.headerIcons}>
                <TouchableOpacity
                  accessibilityLabel="View history"
                  onPress={() => router.push("/(tabs)/history" as any)}
                  style={styles.iconBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconSymbol size={24} name="clock.fill" color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Toggle color scheme"
                  onPress={() => {
                    const next = colorScheme === "dark" ? "light" : "dark";
                    setColorScheme(next);
                    H.impactLight();
                  }}
                  style={styles.iconBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconSymbol
                    size={24}
                    name={colorScheme === "dark" ? "sun.max.fill" : "moon.fill"}
                    color={colors.foreground}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel={isPremium ? "Premium member" : "Upgrade to Premium"}
                  onPress={() => {
                    if (!isPremium && !isDevMode) {
                      H.impactLight()
                      router.push("/paywall" as any);
                    }
                  }}
                  style={[
                    styles.iconBtn,
                    isPremium || isDevMode
                      ? { backgroundColor: `#F59E0B18` }
                      : { backgroundColor: `${colors.primary}12` },
                  ]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ fontSize: 20, lineHeight: 24 }}>
                    {isPremium || isDevMode ? "👑" : "⭐"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Open settings"
                  onPress={() => router.push("/settings" as any)}
                  style={[styles.iconBtn, { padding: 0, width: 34, height: 34, borderRadius: 17, overflow: "hidden", backgroundColor: `${colors.primary}15`, borderWidth: 1, borderColor: `${colors.primary}30`, alignItems: "center", justifyContent: "center" }]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                  ) : (
                    <IconSymbol size={20} name="person.fill" color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {/* Row 2: grade badge + streak badge */}
            <View style={[styles.headerRow2, { justifyContent: "flex-end" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {homeGradeLevel && (
                <TouchableOpacity
                  accessibilityLabel={`Grade level: ${GRADE_LABELS[homeGradeLevel]}. Tap to change in Settings`}
                  accessibilityRole="button"
                  onPress={() => router.push("/settings" as any)}
                  style={[styles.gradeBadge, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.gradeBadgeText, { color: colors.primary }]}>{GRADE_LABELS[homeGradeLevel]}</Text>
                </TouchableOpacity>
              )}
              {streak && streak.currentStreak > 0 && (
                <TouchableOpacity
                  accessibilityLabel="View progress"
                  onPress={() => router.push("/progress" as any)}
                  style={[styles.streakBadge, { backgroundColor: `${colors.warning}18`, borderColor: `${colors.warning}35` }]}
                >
                  <Text style={styles.streakEmoji}>{streakEmoji}</Text>
                  <View>
                    <Text style={[styles.streakNumber, { color: colors.warning }]}>
                      {streak.currentStreak}
                    </Text>
                    <Text style={[styles.streakLabel, { color: colors.muted }]}>streak</Text>
                  </View>
                </TouchableOpacity>
              )}
              </View>
            </View>
          </View>
          {/* Daily Goal Progress */}
          {streak && streak.dailyGoal > 0 && (
            <TouchableOpacity
              accessibilityLabel="View progress"
              onPress={() => router.push("/progress" as any)}
              style={[styles.goalBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <View style={styles.goalBarLeft}>
                <Text style={[styles.goalBarLabel, { color: colors.foreground }]} numberOfLines={1}>
                  Daily Goal
                </Text>
                <Text style={[styles.goalBarCount, { color: colors.muted }]} numberOfLines={1}>
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

          {/* Trial Countdown Banner — shown for free-trial users who have not yet purchased */}
          {isTrialActive && !isDevMode && !trialBannerDismissed && (
            <TouchableOpacity
              accessibilityLabel={`${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left in your free trial. Tap to upgrade.`}
              style={[styles.trialBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}
              onPress={() => { router.push("/paywall" as any); }}
              activeOpacity={0.8}
            >
              <View style={styles.trialBannerLeft}>
                <Text style={styles.trialBannerEmoji}>⏳</Text>
                <View>
                  <Text style={[styles.trialBannerTitle, { color: colors.foreground }]}>
                    {trialDaysRemaining} day{trialDaysRemaining === 1 ? '' : 's'} left in your free trial
                  </Text>
                  <Text style={[styles.trialBannerSub, { color: colors.muted }]}>
                    Upgrade to keep unlimited access
                  </Text>
                </View>
              </View>
              <View style={styles.trialBannerRight}>
                <View style={[styles.trialBannerChip, { backgroundColor: colors.primary }]}>
                  <Text style={styles.trialBannerChipText}>Upgrade</Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="Dismiss trial banner"
                  onPress={() => setTrialBannerDismissed(true)}
                  style={styles.trialBannerClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.trialBannerCloseText, { color: colors.muted }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

          {/* Shield Used Toast */}
          {shieldUsedToast && (
            <View style={[styles.shieldToast, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}40` }]}>
              <Text style={[styles.shieldToastText, { color: colors.primary }]}>
                🛡️ Streak shield activated! Your streak is safe.
              </Text>
            </View>
          )}
          {/* Homework Due Soon Banner */}
          {dueSoonHomework && !homeworkBannerDismissed && (
            <TouchableOpacity
              accessibilityLabel="Open classroom"
              style={[styles.homeworkBanner, { backgroundColor: `${colors.warning}18`, borderColor: `${colors.warning}50` }]}
              onPress={() => router.push("/(tabs)/classroom" as any)}
              activeOpacity={0.8}
            >
              <View style={styles.homeworkBannerLeft}>
                <Text style={styles.homeworkBannerEmoji}>📚</Text>
                <View>
                  <Text style={[styles.homeworkBannerTitle, { color: colors.foreground }]}>Homework Due Soon</Text>
                  <Text style={[styles.homeworkBannerSub, { color: colors.muted }]} numberOfLines={1}>
                    {dueSoonHomework.homeworkTitle || dueSoonHomework.problem.slice(0, 40)}
                  </Text>
                </View>
              </View>
              <View style={styles.homeworkBannerRight}>
                <Text style={[styles.homeworkBannerDue, { color: colors.warning }]}>Due today</Text>
                <TouchableOpacity
                  accessibilityLabel="Toggle homework banner dismissed"
                  onPress={() => setHomeworkBannerDismissed(true)}
                  style={styles.homeworkBannerClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.homeworkBannerCloseText, { color: colors.muted }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Today Row: horizontally-scrollable widget strip ── */}
          <TodayRow
            progress={progress}
            weeklyData={weeklyData}
            almostBadge={almostBadge}
            bannerDismissed={bannerDismissed}
            isPremium={isPremium}
            isDevMode={isDevMode}
            isOnline={isOnline}
            selectedSubject={selectedSubject}
            usage={usage}
            gradeLevel={homeGradeLevel}
            onShieldEarned={(count) => setShieldCount(count)}
            onSolveNow={() => inputRef.current?.focus()}
            onDismissBadge={() => setBannerDismissed(true)}
            onGoSolveBadge={() => {
              const subjectId = almostBadge?.subject as SubjectId;
              if (subjectId) handleSubjectChange(subjectId);
              setBannerDismissed(true);
            }}
            onWeeklyGoalChanged={() => loadWeeklyData()}
          />

          {/* Study Tip of the Day */}
          {isOnline && selectedSubject && (
            <StudyTipCard subject={selectedSubject} gradeLevel={homeGradeLevel} />
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION 1: SOLVE A PROBLEM                                         */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionLabelRow}>
              <View style={[styles.sectionLabelDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionLabelText, { color: colors.muted }]}>SOLVE A PROBLEM</Text>
            </View>

            {/* Input Card */}
            <View
              style={[
                styles.inputCard,
                {
                  backgroundColor: solveMutation.isPending ? `${colors.primary}08` : `${colors.primary}05`,
                  borderColor: solveMutation.isPending ? colors.primary : inputFocused ? colors.primary : `${colors.primary}60`,
                  borderWidth: inputFocused || solveMutation.isPending ? 1.5 : 1,
                },
              ]}
            >
              <View style={{ position: "relative" }}>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: colors.foreground, paddingBottom: 36 }]}
                  placeholder={getSubjectPlaceholder(selectedSubject)}
                  placeholderTextColor={colors.muted}
                  multiline
                  value={problem}
                  onChangeText={setProblem}
                  returnKeyType="done"
                  onSubmitEditing={handleSolve}
                  onSelectionChange={(e) => {
                    cursorPosRef.current = e.nativeEvent.selection.end;
                  }}
                  onFocus={() => { setShowMathKeyboard(false); setInputFocused(true); }}
                  onBlur={() => setInputFocused(false)}
                />
                {Platform.OS !== "web" && (
                  <View style={styles.inputMicWrapper} pointerEvents="box-none">
                    <VoiceButton
                      size={40}
                      onTranscript={(text) => { setProblem((prev) => prev ? `${prev} ${text}` : text); }}
                    />
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.inputActions,
                  { borderTopColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <Text style={[styles.charCount, { color: colors.muted }]}>{problem.length} / 5000</Text>
                <View style={styles.inputActionBtns}>
                  {selectedSubject && hasCheatSheet(selectedSubject) && (
                    <TouchableOpacity
                      accessibilityLabel="Toggle show cheat sheet"
                      onPress={() => { H.impactLight(); setShowCheatSheet(true); }}
                      style={[styles.keyboardToggleBtn, { backgroundColor: "transparent", borderColor: colors.border }]}
                    >
                      <Text style={[styles.keyboardToggleText, { color: colors.muted }]}>📋 Formulas</Text>
                    </TouchableOpacity>
                  )}
                  {isMathSubject(selectedSubject) && (
                    <TouchableOpacity
                      accessibilityLabel="Toggle show math keyboard"
                      onPress={() => { Keyboard.dismiss(); setShowMathKeyboard((v) => !v); H.impactLight(); }}
                      style={[
                        styles.keyboardToggleBtn,
                        {
                          backgroundColor: showMathKeyboard ? `${colors.primary}20` : "transparent",
                          borderColor: showMathKeyboard ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.keyboardToggleText, { color: showMathKeyboard ? colors.primary : colors.muted }]}>∑ Math</Text>
                    </TouchableOpacity>
                  )}
                  {problem.length > 0 && (
                    <TouchableOpacity onPress={() => setProblem("")} style={styles.clearBtn} accessibilityLabel="Clear problem">
                      <IconSymbol size={18} name="xmark.circle.fill" color={colors.muted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Unified action row: Any level | All Subjects | Solve with AI */}
            <View style={styles.unifiedActionRow}>

              {/* Pill 1: Grade level */}
              <TouchableOpacity
                onPress={() => { H.impactLight(); setShowSolveGradePicker(true); }}
                style={[styles.actionPill, {
                  backgroundColor: homeGradeLevel ? `${colors.primary}15` : colors.surface,
                  borderColor: homeGradeLevel ? colors.primary : colors.border,
                }]}
                accessibilityLabel={homeGradeLevel ? `Grade level: ${GRADE_LABELS[homeGradeLevel]}` : "Set grade level"}
                activeOpacity={0.75}
              >
                <IconSymbol size={13} name="graduationcap.fill" color={homeGradeLevel ? colors.primary : colors.muted} />
                <Text style={[styles.actionPillText, { color: homeGradeLevel ? colors.primary : colors.muted }]} numberOfLines={1}>
                  {homeGradeLevel ? GRADE_LABELS[homeGradeLevel] : "Any level"}
                </Text>
                <Text style={[styles.actionPillChevron, { color: homeGradeLevel ? colors.primary : colors.muted }]}>▾</Text>
              </TouchableOpacity>

              {/* Pill 2: Subject picker — forced to same flex:1 size as the other pills */}
              <SubjectPicker
                value={selectedSubject}
                onChange={handleSubjectChange}
                showAll
                triggerStyle={{
                  flex: 1,
                  paddingVertical: 11,
                  paddingHorizontal: 10,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              />

              {/* Pill 3: Solve with AI */}
              <ReAnimated.View style={solveBtnAnimStyle}>
              <TouchableOpacity
                accessibilityLabel="Solve problem"
                onPress={() => {
                  solveBtnScale.value = withSpring(1, { damping: 8, stiffness: 200 });
                  handleSolve();
                }}
                onPressIn={() => { solveBtnScale.value = withTiming(0.96, { duration: 80 }); }}
                onPressOut={() => { solveBtnScale.value = withSpring(1, { damping: 10, stiffness: 180 }); }}
                disabled={!problem.trim() || solveMutation.isPending || !isOnline}
                activeOpacity={1}
                style={[styles.actionPill, styles.actionPillSolve, {
                  backgroundColor: isOnline ? colors.primary : colors.muted,
                  borderColor: isOnline ? colors.primary : colors.muted,
                  opacity: !problem.trim() || solveMutation.isPending || !isOnline ? 0.6 : 1,
                }]}
              >
                {solveMutation.isPending ? (
                  <><DotsLoader color="#FFFFFF" /><Text style={styles.actionPillSolveText}>Solving...</Text></>
                ) : !isOnline ? (
                  <><IconSymbol size={14} name="wifi.slash" color="#FFFFFF" /><Text style={styles.actionPillSolveText}>Offline</Text></>
                ) : (
                  <><IconSymbol size={14} name="wand.and.stars" color="#FFFFFF" /><Text style={styles.actionPillSolveText}>Solve with AI</Text></>
                )}
              </TouchableOpacity>
              </ReAnimated.View>

            </View>

            {/* Offline warning strip */}
            {!isOnline && (
              <View style={[styles.offlinePill, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40`, marginTop: 6 }]}>
                <Text style={{ fontSize: 12 }}>📡</Text>
                <Text style={[styles.offlinePillText, { color: colors.warning }]}>No internet connection</Text>
              </View>
            )}

            {/* Error state */}
            {solveMutation.isError && (
              <View style={[styles.errorBox, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
                <IconSymbol size={16} name="exclamationmark.triangle.fill" color={colors.error} />
                <Text style={[styles.errorBoxText, { color: colors.error }]}>
                  Failed to solve. Please check your connection and try again.
                </Text>
              </View>
            )}
          </View>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION 3: EXPLORE FEATURES                                        */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionLabelRow}>
              <View style={[styles.sectionLabelDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.sectionLabelText, { color: colors.muted }]}>EXPLORE</Text>
            </View>
            <View style={styles.featureRow}>
              <TouchableOpacity accessibilityLabel="Camera" accessibilityHint="Opens the camera to scan a problem" accessibilityRole="button"
                onPress={() => router.push("/(tabs)/scan" as any)}
                style={[styles.featureCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}
                activeOpacity={0.8}
              >
                <View style={[styles.featureIcon, { backgroundColor: colors.primary }]}>
                  <IconSymbol size={20} name="camera.fill" color="#FFFFFF" />
                </View>
                <Text style={[styles.featureTitle, { color: colors.foreground }]} numberOfLines={1}>Scan</Text>
                <Text style={[styles.featureDesc, { color: colors.muted }]} numberOfLines={2}>Photo to solution</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Go to practice"
                onPress={() => router.push("/(tabs)/practice" as any)}
                style={[styles.featureCard, { backgroundColor: `${colors.secondary}12`, borderColor: `${colors.secondary}25` }]}
                activeOpacity={0.8}
              >
                <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
                  <IconSymbol size={20} name="pencil.and.list.clipboard" color="#FFFFFF" />
                </View>
                <Text style={[styles.featureTitle, { color: colors.foreground }]} numberOfLines={1}>Practice</Text>
                <Text style={[styles.featureDesc, { color: colors.muted }]} numberOfLines={2}>Generated problems</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="View progress"
                onPress={() => router.push("/progress" as any)}
                style={[styles.featureCard, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}25` }]}
                activeOpacity={0.8}
              >
                <View style={[styles.featureIcon, { backgroundColor: colors.success }]}>
                  <IconSymbol size={20} name="chart.bar.fill" color="#FFFFFF" />
                </View>
                <Text style={[styles.featureTitle, { color: colors.foreground }]} numberOfLines={1}>Progress</Text>
                <Text style={[styles.featureDesc, { color: colors.muted }]} numberOfLines={2}>Stats & streaks</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION 3b: QUICK LINKS ROW                                         */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionLabelRow}>
              <View style={[styles.sectionLabelDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionLabelText, { color: colors.muted }]}>QUICK ACCESS</Text>
            </View>
            <View style={[styles.featureRow, { marginTop: 10 }]}>
              {[
                { icon: "note.text" as const, label: "Notes", route: "/notes", color: colors.primary },
                { icon: "rectangle.stack.fill" as const, label: "Flashcards", route: "/flashcards", color: colors.secondary },
                { icon: "bookmark.fill" as const, label: "Bookmarks", route: "/bookmarks", color: colors.warning },
                { icon: "calendar" as const, label: "Planner", route: "/study-planner", color: colors.success },
              ].map((item) => (
                <TouchableOpacity
                  key={item.route}
                  onPress={() => { H.impactLight(); router.push(item.route as any); }}
                  style={[styles.featureCard, { backgroundColor: `${item.color}12`, borderColor: `${item.color}25` }]}
                  activeOpacity={0.8}
                  accessibilityLabel={item.label}
                >
                  <View style={[styles.featureIcon, { backgroundColor: item.color }]}>
                    <IconSymbol size={20} name={item.icon} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.featureTitle, { color: colors.foreground }]} numberOfLines={1}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION 4: RECENT SOLVES + TIPS + UPSELL (before examples)         */}
          {/* ─────────────────────────────────────────────────────────────────── */}

          {/* Recent Solves mini-history — only shown when there are solves */}
          {recentSolves.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionLabelRow}>
                <View style={[styles.sectionLabelDot, { backgroundColor: colors.warning }]} />
                <Text style={[styles.sectionLabelText, { color: colors.muted }]}>RECENT SOLVES</Text>
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/history" as any)}
                  style={styles.sectionLabelAction}
                  accessibilityLabel="View all history"
                >
                  <Text style={[styles.sectionLabelActionText, { color: colors.primary }]}>See all</Text>
                  <IconSymbol size={11} name="chevron.right" color={colors.primary} />
                </TouchableOpacity>
              </View>
              {recentSolves.map((item) => {
                const subjectColor = (() => { try { return getSubjectDef(item.subject).color; } catch { return colors.primary; } })();
                const subjectLabel = (() => { try { return getSubjectDef(item.subject).label; } catch { return item.subject; } })();
                const now = Date.now();
                const diff = now - item.solvedAt;
                const minutes = Math.floor(diff / 60000);
                const hours = Math.floor(diff / 3600000);
                const days = Math.floor(diff / 86400000);
                const timeAgo = minutes < 1 ? "Just now" : minutes < 60 ? `${minutes}m ago` : hours < 24 ? `${hours}h ago` : days < 7 ? `${days}d ago` : new Date(item.solvedAt).toLocaleDateString();
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push({ pathname: "/solution", params: { data: JSON.stringify(item) } } as any)}
                    style={[styles.recentSolveCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.recentSolveAccent, { backgroundColor: subjectColor }]} />
                    <View style={styles.recentSolveContent}>
                      <View style={styles.recentSolveBadgeRow}>
                        <View style={[styles.recentSolveBadge, { backgroundColor: `${subjectColor}20` }]}>
                          <Text style={[styles.recentSolveBadgeText, { color: subjectColor }]}>{subjectLabel}</Text>
                        </View>
                        <Text style={[styles.recentSolveTime, { color: colors.muted }]}>{timeAgo}</Text>
                      </View>
                      <Text style={[styles.recentSolveProblem, { color: colors.foreground }]} numberOfLines={2}>{cleanMathText(item.problem)}</Text>
                      <View style={styles.recentSolveAnswerRow}>
                        <IconSymbol size={12} name="checkmark.circle.fill" color={colors.success} />
                        <Text style={[styles.recentSolveAnswer, { color: colors.success }]} numberOfLines={1}>{cleanMathText(item.answer)}</Text>
                      </View>
                    </View>
                    <IconSymbol size={16} name="chevron.right" color={colors.muted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* How to Use — 3-tip strip */}
          <View style={[styles.tipsStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { emoji: "⌨️", title: "Type or Speak", desc: "Enter your problem or use voice" },
              { emoji: "📚", title: "Pick a Subject", desc: "Get subject-specific solutions" },
              { emoji: "📋", title: "Step-by-Step", desc: "Full explanations, not just answers" },
            ].map((tip, i) => (
              <View key={i} style={[styles.tipItem, i < 2 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
                <Text style={styles.tipEmoji}>{tip.emoji}</Text>
                <Text style={[styles.tipTitle, { color: colors.foreground }]}>{tip.title}</Text>
                <Text style={[styles.tipDesc, { color: colors.muted }]}>{tip.desc}</Text>
              </View>
            ))}
          </View>

          {/* Upsell nudge banner */}
          <UpsellNudgeBanner
            solvesUsed={usage.solves}
            isPremium={isPremium}
            isDevMode={isDevMode}
          />

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* SECTION 5: TRY AN EXAMPLE                                          */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionLabelRow}>
              <View style={[styles.sectionLabelDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.sectionLabelText, { color: colors.muted }]}>
                {selectedSubject ? `${(getSubjectDef(selectedSubject)?.label ?? "Subject").toUpperCase()} EXAMPLES` : "TRY AN EXAMPLE"}
              </Text>
            </View>
            {selectedSubject && SUBJECT_EXAMPLES[selectedSubject] ? (
              // Subject-specific flat list
              (SUBJECT_EXAMPLES[selectedSubject] ?? []).map((example: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleExample(example)}
                  style={[styles.exampleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.exampleNumber, { backgroundColor: `${colors.primary}20` }]}>
                    <Text style={[styles.exampleNumberText, { color: colors.primary }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.exampleText, { color: colors.foreground }]}>{example}</Text>
                  <IconSymbol size={16} name="chevron.right" color={colors.muted} />
                </TouchableOpacity>
              ))
            ) : (
              // Grade-grouped collapsible dropdowns
              GRADE_EXAMPLE_GROUPS.map((group) => {
                const isExpanded = expandedGroups.has(group.id);
                const isUserLevel = homeGradeLevel ? group.id === homeGradeLevel : false;
                return (
                  <View key={group.id} style={[styles.exampleGroupWrap, { borderColor: isUserLevel ? `${colors.primary}50` : colors.border, backgroundColor: colors.surface }]}>
                    {/* Group header / toggle */}
                    <TouchableOpacity
                      onPress={() => {
                        setExpandedGroups((prev) => {
                          const next = new Set(prev);
                          if (next.has(group.id)) next.delete(group.id);
                          else next.add(group.id);
                          return next;
                        });
                      }}
                      style={styles.exampleGroupHeader}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.exampleGroupEmoji}>{group.emoji}</Text>
                      <Text style={[styles.exampleGroupLabel, { color: colors.foreground }]}>{group.label}</Text>
                      {isUserLevel && (
                        <View style={[styles.exampleGroupBadge, { backgroundColor: `${colors.primary}20` }]}>
                          <Text style={[styles.exampleGroupBadgeText, { color: colors.primary }]}>Your level</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }} />
                      <Text style={[styles.exampleGroupCount, { color: colors.muted }]}>7 questions</Text>
                      <IconSymbol
                        size={16}
                        name={isExpanded ? "chevron.down" : "chevron.right"}
                        color={colors.muted}
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>
                    {/* Expanded questions */}
                    {isExpanded && group.questions.map((q, qi) => (
                      <TouchableOpacity
                        key={qi}
                        onPress={() => handleExample(q)}
                        style={[styles.exampleCard, { backgroundColor: `${colors.background}`, borderColor: colors.border, marginTop: qi === 0 ? 4 : 0, marginBottom: qi === group.questions.length - 1 ? 8 : 0 }]}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.exampleNumber, { backgroundColor: `${colors.primary}20` }]}>
                          <Text style={[styles.exampleNumberText, { color: colors.primary }]}>{qi + 1}</Text>
                        </View>
                        <Text style={[styles.exampleText, { color: colors.foreground }]}>{q}</Text>
                        <IconSymbol size={16} name="chevron.right" color={colors.muted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })
            )}
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

      {/* Badge Unlock Modal */}
      {pendingBadge && (
        <BadgeUnlockModal
          visible={!!pendingBadge}
          tier={pendingBadge.tier}
          subjectLabel={pendingBadge.subjectLabel}
          onClose={() => setPendingBadge(null)}
        />
      )}
      {/* Streak Milestone Celebration */}
      <StreakMilestoneModal
        info={streakMilestone}
        onDismiss={() => setStreakMilestone(null)}
        avatarUri={avatarUri ?? undefined}
        displayName={_userName ?? undefined}
      />
      {/* Solve Milestone Celebration — fires review prompt after dismiss */}
      <SolveMilestoneModal
        solveCount={solveMilestoneCount}
        onDismiss={() => {
          const count = solveMilestoneCount;
          setSolveMilestoneCount(null);
          if (count !== null) {
            import("@/lib/review-prompt").then(({ maybeRequestReviewOnSolve }) => {
              maybeRequestReviewOnSolve(count).catch(() => {});
            }).catch(() => {});
          }
        }}
        onViewRank={() => {
          setSolveMilestoneCount(null);
          router.push("/(tabs)/leaderboard" as any);
        }}
      />
      {/* Cheat Sheet Bottom Sheet */}
      <CheatSheetBottomSheet
        visible={showCheatSheet}
        subjectId={selectedSubject ?? ""}
        onClose={() => setShowCheatSheet(false)}
      />

      {/* Paywall Modal — shown when free daily solve limit is reached */}
      <Modal
        visible={showPaywallModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowPaywallModal(false); setPaywallContext(null); }}
      >
        <View style={{ flex: 1 }}>
          {/* Inline close button so user can dismiss without going premium */}
          <TouchableOpacity
            onPress={() => { setShowPaywallModal(false); setPaywallContext(null); }}
            style={{ position: "absolute", top: 16, right: 20, zIndex: 10, padding: 8 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 16, color: colors.muted }}>✕</Text>
          </TouchableOpacity>
          {/* Contextual message banner — shown when the modal is triggered by a usage limit */}
          {paywallContext && (
            <View style={{
              marginTop: 56,
              marginHorizontal: 20,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: `${colors.warning}18`,
              borderWidth: 1,
              borderColor: `${colors.warning}40`,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}>
              <Text style={{ fontSize: 18 }}>⚠️</Text>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: "500", color: colors.foreground, lineHeight: 19 }}>
                {paywallContext}
              </Text>
            </View>
          )}
          {/* Lazy-import the paywall screen to avoid circular deps */}
          {React.createElement(require("../paywall").default)}
        </View>
      </Modal>

      {/* ── Solve-Tab Grade Level Picker ─────────────────────────────────────── */}
      <Modal
        visible={showSolveGradePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSolveGradePicker(false)}
      >
        <View style={styles.gradePickerOverlay}>
          <View style={[styles.gradePickerSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.gradePickerHeader}>
              <Text style={[styles.gradePickerTitle, { color: colors.foreground }]}>Grade Level</Text>
              <TouchableOpacity onPress={() => setShowSolveGradePicker(false)} accessibilityLabel="Close" accessibilityHint="Dismisses this panel" accessibilityRole="button">
                <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.gradePickerSub, { color: colors.muted }]}>
              AI will tailor explanations to this level.
            </Text>
            {/* Remember this toggle */}
            <TouchableOpacity
              onPress={() => { H.impactLight(); setRememberGrade((v) => !v); }}
              style={[styles.rememberRow, { backgroundColor: rememberGrade ? `${colors.primary}10` : colors.surface, borderColor: rememberGrade ? colors.primary : colors.border }]}
              activeOpacity={0.75}
              accessibilityLabel="Remember this grade level as default"
              accessibilityRole="switch"
              accessibilityState={{ checked: rememberGrade }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rememberLabel, { color: rememberGrade ? colors.primary : colors.foreground }]}>Remember this</Text>
                <Text style={[styles.rememberSub, { color: colors.muted }]}>Save as your default grade level</Text>
              </View>
              <View style={[styles.rememberToggle, { backgroundColor: rememberGrade ? colors.primary : colors.border }]}>
                <View style={[styles.rememberThumb, { transform: [{ translateX: rememberGrade ? 18 : 2 }] }]} />
              </View>
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
              <TouchableOpacity
                onPress={() => { H.impactLight(); setHomeGradeLevel(null); if (rememberGrade) saveGlobalGrade(null); setShowSolveGradePicker(false); }}
                style={[styles.gradePickerRow, { backgroundColor: !homeGradeLevel ? `${colors.primary}15` : colors.surface, borderColor: !homeGradeLevel ? colors.primary : colors.border }]}
                activeOpacity={0.75}
                accessibilityLabel="Any level"
                accessibilityRole="radio"
                accessibilityState={{ checked: !homeGradeLevel }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gradePickerOptLabel, { color: !homeGradeLevel ? colors.primary : colors.foreground }]}>Any level</Text>
                  <Text style={[styles.gradePickerOptSub, { color: colors.muted }]}>Let AI decide the depth</Text>
                </View>
                {!homeGradeLevel && <IconSymbol size={18} name="checkmark.circle.fill" color={colors.primary} />}
              </TouchableOpacity>
              {GRADE_OPTIONS.map((opt) => {
                const isActive = homeGradeLevel === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => { H.impactLight(); setHomeGradeLevel(opt.id); if (rememberGrade) saveGlobalGrade(opt.id); setShowSolveGradePicker(false); }}
                    style={[styles.gradePickerRow, { backgroundColor: isActive ? `${colors.primary}15` : colors.surface, borderColor: isActive ? colors.primary : colors.border }]}
                    activeOpacity={0.75}
                    accessibilityLabel={opt.label}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isActive }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gradePickerOptLabel, { color: isActive ? colors.primary : colors.foreground }]}>{opt.label}</Text>
                      <Text style={[styles.gradePickerOptSub, { color: colors.muted }]}>{opt.sub}</Text>
                    </View>
                    {isActive && <IconSymbol size={18} name="checkmark.circle.fill" color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

export default function SolveScreen() {
  return (
    <ErrorBoundary label="Home">
      <SolveScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerRow2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  greetingLine: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.1,
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
  streakEmoji: { fontSize: 17 },
  streakNumber: { fontSize: 17, fontWeight: "800", lineHeight: 20 },
  streakLabel: { fontSize: 9, fontWeight: "600", letterSpacing: 0.3 },
  gradeBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  gradeBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
  goalBar: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    overflow: "hidden",
  },
  goalBarLeft: { flex: 1, minWidth: 0 },
  goalBarLabel: { fontSize: 17, fontWeight: "700" },
  goalBarCount: { fontSize: 15, marginTop: 4 },
  goalBarRight: { alignItems: "flex-end", gap: 6, flexShrink: 0 },
  goalBarTrack: {
    width: 120,
    height: 9,
    borderRadius: 5,
    overflow: "hidden",
  },
  goalBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  goalBarPct: { fontSize: 15, fontWeight: "700" },
  subjectRow: {
    paddingHorizontal: 16,
    marginTop: 20,
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
    borderRadius: 16,
    borderWidth: 2.5,
    overflow: "hidden",
  },
  input: {
    padding: 18,
    fontSize: 17,
    minHeight: 170,
    textAlignVertical: "top",
    lineHeight: 26,
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
  solveRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  solveBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  solveBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
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
    marginTop: 24,
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
  newChatBanner: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  newChatLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  newChatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  newChatTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 20,
  },
  newChatSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 17,
    marginTop: 1,
  },
  continueLastChat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  continueLastChatText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  quickAskRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  quickAskInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 4,
  },
  quickAskSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickAskClearBtn: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  recentSubjectsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 2,
    gap: 6,
  },
  recentSubjectsLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginRight: 2,
  },
  recentSubjectChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  recentSubjectChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  quickAskHistoryDropdown: {
    marginHorizontal: 16,
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  quickAskHistoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  quickAskHistoryText: {
    fontSize: 13,
    flex: 1,
  },
  quickAskClearText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  quickAskSubjectChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 90,
  },
  quickAskSubjectChipText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  undoToast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  undoToastText: {
    fontSize: 13,
    flex: 1,
  },
  undoToastRestoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  undoToastRestoreText: {
    fontSize: 13,
    fontWeight: "700",
  },
  continueSwipeDismiss: {
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 12,
  },
  continueSwipeDismissText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  sessionPreviewTooltip: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sessionPreviewTooltipText: {
    fontSize: 12,
    lineHeight: 18,
  },
  examplesSection: {
    paddingHorizontal: 16,
    marginTop: 28,
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
  offlineWarning: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  offlineWarningText: { fontSize: 13, fontWeight: "600", flex: 1 },
  shieldToast: { borderRadius: 14, borderWidth: 1, padding: 14, marginHorizontal: 16, marginBottom: 12, alignItems: "center" },
  shieldToastText: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  homeworkBanner: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginHorizontal: 16, marginBottom: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  homeworkBannerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  homeworkBannerEmoji: { fontSize: 22 },
  homeworkBannerTitle: { fontSize: 13, fontWeight: "700" },
  homeworkBannerSub: { fontSize: 12, marginTop: 1 },
  homeworkBannerRight: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 },
  homeworkBannerDue: { fontSize: 12, fontWeight: "700" },
  homeworkBannerClose: { padding: 2 },
  homeworkBannerCloseText: { fontSize: 14, fontWeight: "600" },
  trialBanner: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginHorizontal: 16, marginBottom: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  trialBannerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  trialBannerEmoji: { fontSize: 22 },
  trialBannerTitle: { fontSize: 13, fontWeight: "700" },
  trialBannerSub: { fontSize: 12, marginTop: 1 },
  trialBannerRight: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 },
  trialBannerChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  trialBannerChipText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  trialBannerClose: { padding: 2 },
  trialBannerCloseText: { fontSize: 14, fontWeight: "600" },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
  rankingsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  rankingsCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  rankingsCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  rankingsCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  gradeSelectorRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
  },
  gradeSelectorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  gradeSelectorText: {
    fontSize: 13,
    fontWeight: "600",
  },
  gradePickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  gradePickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 20,
    maxHeight: "80%",
  },
  gradePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  gradePickerTitle: { fontSize: 20, fontWeight: "800" },
  gradePickerSub: { fontSize: 13, marginBottom: 14 },
  gradePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  gradePickerOptLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  gradePickerOptSub: { fontSize: 12 },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
    gap: 12,
  },
  rememberLabel: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  rememberSub: { fontSize: 12 },
  rememberToggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
  },
  rememberThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  // ── Elite Redesign: Section structure ────────────────────────────────────
  sectionBlock: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionLabelText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    flex: 1,
  },
  sectionLabelAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  sectionLabelActionText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Controls row (grade pill + offline pill) ──────────────────────────────
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    marginTop: 6,
  },
  offlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  offlinePillText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Error box ─────────────────────────────────────────────────────────────
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // ── Recent Solves widget ──────────────────────────────────────────────────
  recentSolveCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  recentSolveAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  recentSolveContent: {
    flex: 1,
    padding: 12,
    gap: 5,
  },
  recentSolveBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recentSolveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recentSolveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  recentSolveTime: {
    fontSize: 11,
  },
  recentSolveProblem: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  recentSolveAnswerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  recentSolveAnswer: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  // ── How to Use tips strip ─────────────────────────────────────────────────
  tipsStrip: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  tipItem: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    gap: 4,
  },
  tipEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  tipDesc: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },

  // ── Example card refinements ──────────────────────────────────────────────
  exampleNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  exampleNumberText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Mic button overlaid inside input card bottom-right
  inputMicWrapper: {
    position: "absolute",
    bottom: 10,
    right: 12,
  },

  // ── Unified 3-pill action row ─────────────────────────────────────────────
  unifiedActionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  actionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 5,
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  actionPillChevron: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionPillSolve: {
    // Override: solid filled pill for the primary CTA
    borderWidth: 0,
  },
  actionPillSolveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    flexShrink: 1,
  },
  exampleGroupWrap: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  exampleGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  exampleGroupEmoji: {
    fontSize: 18,
  },
  exampleGroupLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  exampleGroupBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  exampleGroupBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  exampleGroupCount: {
    fontSize: 12,
  },
});
