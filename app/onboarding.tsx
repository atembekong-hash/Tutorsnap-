import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/use-colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { SUBJECT_CATEGORIES, type SubjectCategory } from "@/lib/subjects";
import { GRADE_OPTIONS, saveGlobalGrade } from "@/lib/grade-levels";
import { TUTOR_SETTINGS_KEY, DEFAULT_TUTOR_SETTINGS } from "@/components/tutor-settings-modal";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ONBOARDING_DONE_KEY = "@tutorsnap/onboardingDone";
export const USER_NAME_KEY = "@tutorsnap/userName";

const SLIDES = [
  {
    id: "name",
    emoji: "👋",
    title: "What's your name?",
    subtitle: "We’ll use it to personalise your experience.",
  },
  {
    id: "welcome",
    emoji: "🎓",
    title: "Welcome to TutorSnap",
    subtitle:
      "Your AI-powered academic tutor for every subject, from Algebra to World History.",
  },
  {
    id: "solve",
    emoji: "✨",
    title: "Snap, Type, or Ask",
    subtitle:
      "Type a question, take a photo of your homework, or chat with the AI Tutor for step-by-step help.",
  },
  {
    id: "practice",
    emoji: "🔥",
    title: "Build Your Streak",
    subtitle:
      "Practice daily, hit your goal, and watch your streak grow. Progress tracking keeps you motivated.",
  },
  {
    id: "subjects",
    emoji: "📚",
    title: "Pick Your Subjects",
    subtitle: "Choose the areas you study most. You can always change this later in Settings.",
  },
  {
    id: "grade",
    emoji: "🎯",
    title: "What's Your Level?",
    subtitle: "We'll tailor explanations and questions to your grade. Change it anytime in Settings.",
  },
  {
    id: "tutor-preview",
    emoji: "🤖",
    title: "Meet Your AI Tutor",
    subtitle: "TutorSnap adapts to you. Here's how your tutor will work based on your choices.",
  },
  {
    id: "trial",
    emoji: "👑",
    title: "Start Free, Upgrade Anytime",
    subtitle:
      "Enjoy 2 free solves a day. Unlock unlimited solves, quizzes, and AI chat with a 14-day free trial.",
  },
];

const CATEGORY_ORDER: SubjectCategory[] = ["math", "english", "science", "social"];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Set<SubjectCategory>>(new Set());
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  const isLastSlide = currentSlide === SLIDES.length - 1;
  const _isTrialSlide = SLIDES[currentSlide]?.id === "trial";
  const _isSubjectsSlide = SLIDES[currentSlide]?.id === "subjects";

  const goNext = () => {
    H.impactLight()
    if (isLastSlide) {
      // On the trial slide, push to paywall first so users can start their trial
      // finishOnboarding is called after the paywall is dismissed (or skipped)
      finishOnboardingAndShowPaywall();
    } else {
      const next = currentSlide + 1;
      setCurrentSlide(next);
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    }
  };

  /** Persist onboarding choices and pre-fill TutorSettings so the AI is personalised immediately. */
  const persistOnboardingChoices = async () => {
    if (selectedCategories.size > 0) {
      await AsyncStorage.setItem(
        "@tutorsnap/preferredCategories",
        JSON.stringify(Array.from(selectedCategories))
      );
    }
    if (selectedGrade) await saveGlobalGrade(selectedGrade);
    const name = userName.trim();
    if (name) await AsyncStorage.setItem(USER_NAME_KEY, name);

    // Pre-fill TutorSettings with onboarding values so the AI tutor is personalised
    // from the very first message, without requiring the user to re-enter them.
    try {
      const raw = await AsyncStorage.getItem(TUTOR_SETTINGS_KEY);
      const existing = raw ? { ...DEFAULT_TUTOR_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_TUTOR_SETTINGS };

      // Only overwrite if the user hasn't already customised these fields
      const patch: Partial<typeof existing> = {};
      if (name && !existing.nickname) patch.nickname = name;
      if (selectedGrade && !existing.gradeLevel) patch.gradeLevel = selectedGrade;

      // Map the first selected category to a representative default subject
      if (selectedCategories.size > 0 && !existing.defaultSubject) {
        const categoryToSubject: Record<SubjectCategory, string> = {
          math:    "algebra",
          english: "composition",
          science: "biology",
          social:  "world_history",
        };
        const firstCat = Array.from(selectedCategories)[0] as SubjectCategory;
        patch.defaultSubject = categoryToSubject[firstCat] ?? "";
      }

      if (Object.keys(patch).length > 0) {
        await AsyncStorage.setItem(TUTOR_SETTINGS_KEY, JSON.stringify({ ...existing, ...patch }));
      }
    } catch { /* non-critical — ignore */ }
  };

  const finishOnboardingAndShowPaywall = async () => {
    H.notificationSuccess();
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
    await persistOnboardingChoices();
    // Replace to home first, then push paywall so dismissing paywall lands on home
    router.replace("/(tabs)" as any);
    // Small delay so the tab navigator is mounted before pushing the modal
    setTimeout(() => {
      router.push("/paywall" as any);
    }, 300);
  };

  const finishOnboarding = async () => {
    H.notificationSuccess();
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
    await persistOnboardingChoices();
    router.replace("/(tabs)");
  };

  const toggleCategory = (cat: SubjectCategory) => {
    H.impactLight()
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== currentSlide) setCurrentSlide(idx);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top", "bottom", "left", "right"]}>
      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={finishOnboarding}
        activeOpacity={0.7}
        accessibilityLabel="Skip onboarding"
        accessibilityRole="button"
      >
        <Text style={[styles.skipText, { color: colors.muted }]}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: "center" }}
      >
        {SLIDES.map((slide, _idx) => (
          <View key={slide.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* Emoji illustration */}
            <View style={[styles.emojiCircle, { backgroundColor: slide.id === "trial" ? "#F59E0B18" : `${colors.primary}15` }]}>
              <Text style={styles.emojiText}>{slide.emoji}</Text>
            </View>

            <Text style={[styles.slideTitle, { color: colors.foreground }]}>{slide.title}</Text>
            <Text style={[styles.slideSubtitle, { color: colors.muted }]}>{slide.subtitle}</Text>

            {/* Name input on name slide */}
            {slide.id === "name" && (
              <View style={{ width: "100%", marginTop: 32 }}>
                <TextInput
                  value={userName}
                  onChangeText={setUserName}
                  placeholder="Your first name"
                  placeholderTextColor={colors.muted}
                  returnKeyType="done"
                  maxLength={40}
                  autoFocus
                  accessibilityLabel="Enter your first name"
                  style={[styles.nameInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: userName.trim() ? colors.primary : colors.border }]}
                />
                {userName.trim().length > 0 && (
                  <Text style={[styles.nameHint, { color: colors.muted }]}>Hi, {userName.trim()}! 👋</Text>
                )}
              </View>
            )}

            {/* Subject category picker on subjects slide */}
            {slide.id === "subjects" && (
              <View style={styles.categoryGrid}>
                {CATEGORY_ORDER.map((cat) => {
                  const def = SUBJECT_CATEGORIES[cat];
                  const selected = selectedCategories.has(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => toggleCategory(cat)}
                      activeOpacity={0.8}
                      accessibilityLabel={`${selected ? 'Deselect' : 'Select'} ${def.label} category`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      style={[
                        styles.categoryCard,
                        {
                          backgroundColor: selected ? `${def.color}20` : colors.surface,
                          borderColor: selected ? def.color : colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.categoryEmoji}>{def.emoji}</Text>
                      <Text
                        style={[
                          styles.categoryLabel,
                          { color: selected ? def.color : colors.foreground },
                        ]}
                      >
                        {def.label}
                      </Text>
                      {selected && (
                        <View style={[styles.checkBadge, { backgroundColor: def.color }]}>
                          <Text style={styles.checkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Grade level picker on grade slide */}
            {slide.id === "grade" && (
              <ScrollView
                style={{ width: "100%", marginTop: 20 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
              >
                {GRADE_OPTIONS.map((opt) => {
                  const isActive = selectedGrade === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => { H.impactLight(); setSelectedGrade(opt.id); }}
                      activeOpacity={0.8}
                      accessibilityLabel={opt.label}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isActive }}
                      style={[
                        styles.gradeCard,
                        {
                          backgroundColor: isActive ? `${colors.primary}15` : colors.surface,
                          borderColor: isActive ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.gradeCardLabel, { color: isActive ? colors.primary : colors.foreground }]}>{opt.label}</Text>
                        <Text style={[styles.gradeCardSub, { color: colors.muted }]}>{opt.sub}</Text>
                      </View>
                      {isActive && (
                        <View style={[styles.gradeCheck, { backgroundColor: colors.primary }]}>
                          <Text style={styles.gradeCheckText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Tutor personality preview slide */}
            {slide.id === "tutor-preview" && (
              <View style={{ width: "100%", marginTop: 24, gap: 12 }}>
                {[
                  {
                    emoji: "🎓",
                    label: "Grade",
                    value: selectedGrade
                      ? GRADE_OPTIONS.find((g) => g.id === selectedGrade)?.label ?? selectedGrade
                      : "Not set - you can change this anytime",
                  },
                  {
                    emoji: "📚",
                    label: "Subjects",
                    value: selectedCategories.size > 0
                      ? Array.from(selectedCategories).map((c) => SUBJECT_CATEGORIES[c]?.label).join(", ")
                      : "All subjects",
                  },
                  {
                    emoji: "💬",
                    label: "Tone",
                    value: "Friendly & encouraging",
                  },
                  {
                    emoji: "🔢",
                    label: "Style",
                    value: "Step-by-step with full working shown",
                  },
                  {
                    emoji: "🌍",
                    label: "Language",
                    value: "English (change in Tutor Settings)",
                  },
                ].map((row) => (
                  <View
                    key={row.label}
                    style={[styles.previewRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={styles.previewEmoji}>{row.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.previewLabel, { color: colors.muted }]}>{row.label}</Text>
                      <Text style={[styles.previewValue, { color: colors.foreground }]}>{row.value}</Text>
                    </View>
                  </View>
                ))}
                <Text style={[styles.previewHint, { color: colors.muted }]}>
                  You can fine-tune all of this in Tutor Settings inside the chat.
                </Text>
              </View>
            )}

            {/* Trial slide feature list */}
            {slide.id === "trial" && (
              <View style={styles.trialFeatureList}>
                {[
                  { emoji: "♾️", text: "Unlimited solves, quizzes & AI chat" },
                  { emoji: "📸", text: "Photo homework solver" },
                  { emoji: "🧠", text: "Step-by-step explanations" },
                  { emoji: "📈", text: "Progress tracking & streaks" },
                  { emoji: "🎖️", text: "14-day free trial, cancel anytime" },
                ].map((item) => (
                  <View key={item.text} style={styles.trialFeatureRow}>
                    <Text style={styles.trialFeatureEmoji}>{item.emoji}</Text>
                    <Text style={[styles.trialFeatureText, { color: colors.foreground }]}>{item.text}</Text>
                  </View>
                ))}
                <Text style={[styles.trialPriceNote, { color: colors.muted }]}>
                  Then $9.99/mo or $69.99/yr · Cancel anytime
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              {
                backgroundColor:
                  idx === currentSlide ? colors.primary : `${colors.primary}30`,
                width: idx === currentSlide ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* CTA button */}
      <TouchableOpacity
        onPress={goNext}
        activeOpacity={0.85}
        style={[styles.ctaButton, { backgroundColor: colors.primary }]}
        accessibilityLabel={isLastSlide ? "Get Started" : "Next slide"}
        accessibilityRole="button"
      >
        <Text style={styles.ctaText}>
          {isLastSlide ? "Start Free Trial" : "Next"}
        </Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  skipBtn: {
    position: "absolute",
    top: 56,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: { fontSize: 15, fontWeight: "600" },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 20,
  },
  emojiCircle: {
    width: 120,
    height: 120,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  emojiText: { fontSize: 56 },
  slideTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  slideSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 28,
    justifyContent: "center",
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 32 * 2 - 12) / 2,
    padding: 18,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  categoryEmoji: { fontSize: 30 },
  categoryLabel: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  gradeCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 12 },
  gradeCardLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  gradeCardSub: { fontSize: 12 },
  gradeCheck: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  gradeCheckText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaButton: {
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  trialFeatureList: {
    marginTop: 28,
    gap: 12,
    width: "100%",
  },
  trialFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  trialFeatureEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: "center",
  },
  trialFeatureText: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
    flex: 1,
  },
  trialPriceNote: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    textAlign: "center",
  },
  nameHint: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 14,
    fontWeight: "500",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  previewEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  previewLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  previewValue: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
  previewHint: { fontSize: 12, textAlign: "center", lineHeight: 18, marginTop: 4 },
});
