import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/use-colors";
import { SUBJECT_CATEGORIES, type SubjectCategory } from "@/lib/subjects";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ONBOARDING_DONE_KEY = "@tutorsnap/onboardingDone";

const SLIDES = [
  {
    id: "welcome",
    emoji: "🎓",
    title: "Welcome to TutorSnap",
    subtitle:
      "Your AI-powered academic tutor for every subject — from Algebra to World History.",
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
];

const CATEGORY_ORDER: SubjectCategory[] = ["math", "english", "science", "social"];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Set<SubjectCategory>>(new Set());

  const isLastSlide = currentSlide === SLIDES.length - 1;

  const goNext = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLastSlide) {
      finishOnboarding();
    } else {
      const next = currentSlide + 1;
      setCurrentSlide(next);
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    }
  };

  const finishOnboarding = async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
    if (selectedCategories.size > 0) {
      await AsyncStorage.setItem(
        "@tutorsnap/preferredCategories",
        JSON.stringify(Array.from(selectedCategories))
      );
    }
    router.replace("/(tabs)");
  };

  const toggleCategory = (cat: SubjectCategory) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
        {SLIDES.map((slide, idx) => (
          <View key={slide.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* Emoji illustration */}
            <View style={[styles.emojiCircle, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={styles.emojiText}>{slide.emoji}</Text>
            </View>

            <Text style={[styles.slideTitle, { color: colors.foreground }]}>{slide.title}</Text>
            <Text style={[styles.slideSubtitle, { color: colors.muted }]}>{slide.subtitle}</Text>

            {/* Subject category picker on last slide */}
            {idx === SLIDES.length - 1 && (
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
          {isLastSlide ? "Get Started" : "Next"}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </View>
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
});
