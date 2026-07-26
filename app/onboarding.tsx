import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  Platform,
  Animated,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { SUBJECT_CATEGORIES, type SubjectCategory } from "@/lib/subjects";
import { GRADE_OPTIONS, saveGlobalGrade, loadGlobalGrade } from "@/lib/grade-levels";
import { TUTOR_SETTINGS_KEY, DEFAULT_TUTOR_SETTINGS } from "@/components/tutor-settings-modal";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import { getTrialVariantConfig, getDefaultTrialVariantConfig, type TrialVariantConfig } from "@/lib/ab-test";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useOnboardingExit } from "@/hooks/use-onboarding-transition";

const { width: SCREEN_WIDTH, height: SCREEN_H } = Dimensions.get("window");

// ─── Confetti particle ────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  "#F59E0B", "#6366F1", "#10B981", "#EF4444",
  "#3B82F6", "#EC4899", "#14B8A6", "#F97316",
  "#8B5CF6", "#22D3EE", "#A3E635", "#FB7185",
];
const CONFETTI_SHAPES = ["square", "rect", "circle"] as const;
function ConfettiParticle({ index }: { index: number }) {
  const x = useRef(new Animated.Value((Math.random() * SCREEN_WIDTH * 1.2) - SCREEN_WIDTH * 0.1)).current;
  const y = useRef(new Animated.Value(-30 - Math.random() * 60)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.4 + Math.random() * 0.8)).current;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 7 + Math.random() * 10;
  const shape = CONFETTI_SHAPES[index % CONFETTI_SHAPES.length];
  const duration = 1600 + Math.random() * 1400;
  const delay = Math.random() * 600;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: SCREEN_H + 40, duration, delay, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 720 * (Math.random() > 0.5 ? 1 : -1), duration, delay, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.3 + Math.random() * 0.5, duration: duration * 0.6, delay, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(delay + duration * 0.65),
        Animated.timing(opacity, { toValue: 0, duration: duration * 0.35, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  const spin = rotate.interpolate({ inputRange: [0, 720], outputRange: ["0deg", "720deg"] });
  return (
    <Animated.View
      style={{
        position: "absolute",
        width: shape === "rect" ? size * 2 : size,
        height: shape === "rect" ? size * 0.45 : size,
        borderRadius: shape === "circle" ? size / 2 : 2,
        backgroundColor: color,
        transform: [{ translateX: x }, { translateY: y }, { rotate: spin }, { scale }],
        opacity,
      }}
    />
  );
}

export const ONBOARDING_DONE_KEY = "@tutorsnap/onboardingDone";
export const USER_NAME_KEY = "@tutorsnap/userName";

// Per-slide gradient colours [top, bottom]
const SLIDE_GRADIENTS: Record<string, [string, string]> = {
  name:          ["#0a7ea420", "#0a7ea405"],
  photo:         ["#7C3AED20", "#7C3AED05"],
  welcome:       ["#0a7ea420", "#0a7ea405"],
  solve:         ["#059669" + "20", "#059669" + "05"],
  practice:      ["#F59E0B20", "#F59E0B05"],
  subjects:      ["#3B82F620", "#3B82F605"],
  grade:         ["#8B5CF620", "#8B5CF605"],
  "tutor-preview": ["#0a7ea420", "#0a7ea405"],
  trial:         ["#F59E0B20", "#F59E0B05"],
};

const SLIDES = [
  {
    id: "name",
    emoji: "👋",
    title: "What's your name?",
    subtitle: "We'll use it to personalise your experience.",
  },
  {
    id: "photo",
    emoji: "🖼️",
    title: "Add a Profile Photo",
    subtitle: "Optional — you can always add or change it later in Settings.",
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

// ─── Slide transition wrapper ─────────────────────────────────────────────────
function SlideWrapper({ active, children }: { active: boolean; children: React.ReactNode }) {
  const opacity = useSharedValue(active ? 1 : 0);
  const scale = useSharedValue(active ? 1 : 0.94);

  useEffect(() => {
    if (active) {
      // Entering: fade in + scale up
      opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
      scale.value = withSequence(
        withTiming(0.94, { duration: 0 }),
        withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
      );
    } else {
      // Leaving: subtle fade out
      opacity.value = withTiming(0.6, { duration: 180, easing: Easing.in(Easing.quad) });
      scale.value = withTiming(0.97, { duration: 180, easing: Easing.in(Easing.quad) });
    }
  }, [active]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Reanimated.View style={[{ flex: 1, width: "100%" }, style]}>{children}</Reanimated.View>;
}

export default function OnboardingScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { fadeStyle } = useScreenTransition({ duration: 320, translateY: 20 });
  // Dark mode: brand-violet bloom; light mode: white bloom
  const bloomColor = colorScheme === "dark" ? "rgba(124,58,237,0.45)" : "rgba(255,255,255,0.95)";
  const { startExit, portalStyle, bloomStyle } = useOnboardingExit(bloomColor);
  const [trialVariant, setTrialVariant] = React.useState<TrialVariantConfig>(getDefaultTrialVariantConfig());
  React.useEffect(() => {
    getTrialVariantConfig().then(setTrialVariant).catch(() => {});
  }, []);
  const scrollRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Set<SubjectCategory>>(new Set());
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  // Animated value for dot indicator
  const dotAnim = useRef(new Animated.Value(0)).current;
  // Animated value for progress bar
  const progressBarAnim = useRef(new Animated.Value(0)).current;

  // Animate progress bar whenever slide changes
  useEffect(() => {
    Animated.timing(progressBarAnim, {
      toValue: (currentSlide + 1) / SLIDES.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide]);

  // Pre-fill saved values when re-running the wizard
  useEffect(() => {
    (async () => {
      try {
        const [savedName, savedGrade, savedCategories, savedAvatar] = await Promise.all([
          AsyncStorage.getItem(USER_NAME_KEY),
          loadGlobalGrade(),
          AsyncStorage.getItem("@tutorsnap/preferredCategories"),
          AsyncStorage.getItem("@tutorsnap/avatarUri"),
        ]);
        if (savedName) setUserName(savedName);
        if (savedGrade) setSelectedGrade(savedGrade);
        if (savedCategories) {
          try {
            const parsed = JSON.parse(savedCategories) as SubjectCategory[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSelectedCategories(new Set(parsed));
            }
          } catch { /* ignore */ }
        }
        if (savedAvatar) setAvatarUri(savedAvatar);
      } catch { /* ignore */ }
    })();
  }, []);

  const isLastSlide = currentSlide === SLIDES.length - 1;
  const isFirstSlide = currentSlide === 0;

  const goBack = () => {
    H.impactLight();
    const prev = currentSlide - 1;
    setCurrentSlide(prev);
    animateDot(prev);
    scrollRef.current?.scrollTo({ x: prev * SCREEN_WIDTH, animated: true });
  };

  const animateDot = (toIndex: number) => {
    Animated.spring(dotAnim, {
      toValue: toIndex,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  };

  const goNext = () => {
    H.impactLight();
    if (isLastSlide) {
      finishOnboardingAndShowPaywall();
    } else {
      // Skip the photo slide if the user already has a profile photo set
      let next = currentSlide + 1;
      if (SLIDES[next]?.id === "photo" && avatarUri) {
        next = next + 1;
      }
      setCurrentSlide(next);
      animateDot(next);
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    }
  };

  const handlePickPhoto = async () => {
    H.impactLight();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      // Try camera as fallback
      const camStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus.status !== "granted") return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    H.impactLight();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  /** Persist onboarding choices and pre-fill TutorSettings so the AI is personalised immediately. */
  const persistOnboardingChoices = async () => {
    const name = userName.trim();
    try {
      if (selectedCategories.size > 0) {
        await AsyncStorage.setItem(
          "@tutorsnap/preferredCategories",
          JSON.stringify(Array.from(selectedCategories))
        );
      }
      if (selectedGrade) await saveGlobalGrade(selectedGrade);
      if (name) await AsyncStorage.setItem(USER_NAME_KEY, name);
      if (avatarUri) await AsyncStorage.setItem("@tutorsnap/avatarUri", avatarUri);
    } catch { /* non-critical: preferences may not persist, but onboarding continues */ }

    // Pre-fill TutorSettings with onboarding values so the AI tutor is personalised
    // from the very first message, without requiring the user to re-enter them.
    try {
      const raw = await AsyncStorage.getItem(TUTOR_SETTINGS_KEY);
      const existing = raw ? { ...DEFAULT_TUTOR_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_TUTOR_SETTINGS };

      const patch: Partial<typeof existing> = {};
      if (name && !existing.nickname) patch.nickname = name;
      if (selectedGrade && !existing.gradeLevel) patch.gradeLevel = selectedGrade;

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
    } catch { /* non-critical */ }
  };

  const finishOnboardingAndShowPaywall = async () => {
    H.impactMedium();
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
    await persistOnboardingChoices();
    startExit(() => {
      router.replace({ pathname: "/(tabs)", params: { fromOnboarding: "1" } } as any);
      setTimeout(() => { router.push("/paywall" as any); }, 300);
    });
  };

  const finishOnboarding = async () => {
    H.notificationSuccess();
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
    await persistOnboardingChoices();
    startExit(() => {
      router.replace({ pathname: "/(tabs)", params: { fromOnboarding: "1" } } as any);
    });
  };

  const toggleCategory = (cat: SubjectCategory) => {
    H.impactLight();
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== currentSlide) {
      setCurrentSlide(idx);
      animateDot(idx);
    }
  };

  const currentGradient = SLIDE_GRADIENTS[SLIDES[currentSlide]?.id] ?? ["#0a7ea420", "#0a7ea405"];

  return (
    <Reanimated.View style={[styles.gradientRoot, { backgroundColor: colors.background }, fadeStyle, portalStyle]}>
    <LinearGradient
      colors={[currentGradient[0], currentGradient[1], "transparent"]}
      style={StyleSheet.absoluteFillObject}
    />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
      <SafeAreaView style={[styles.root, { backgroundColor: "transparent" }]} edges={["top", "bottom", "left", "right"]}>
        {/* Back button */}
        {!isFirstSlide && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={goBack}
            activeOpacity={0.7}
            accessibilityLabel="Go back" accessibilityHint="Returns to the previous screen"
            accessibilityRole="button"
          >
            <Text style={[styles.backArrow, { color: colors.foreground }]}>‹</Text>
          </TouchableOpacity>
        )}

        {/* Skip button — hidden on first and last slide */}
        {!isFirstSlide && !isLastSlide && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={finishOnboarding}
            activeOpacity={0.7}
            accessibilityLabel="Skip onboarding"
            accessibilityRole="button"
          >
            <Text style={[styles.skipText, { color: colors.muted }]}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={["#7C3AED", "#06B6D4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1, borderRadius: 2 }}
            />
          </Animated.View>
        </View>

        {/* Slides */}
        <ScrollView keyboardDismissMode="on-drag"
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
              <SlideWrapper active={idx === currentSlide}>
              {/* Emoji or avatar illustration */}
              {slide.id === "photo" && avatarUri ? (
                <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85} style={styles.avatarCircle}>
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarEditIcon}>✎</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.emojiCircle, { backgroundColor: (SLIDE_GRADIENTS[slide.id]?.[0] ?? `${colors.primary}15`) }]}>
                  <Text style={styles.emojiText}>{slide.emoji}</Text>
                </View>
              )}

              <Text style={[styles.slideTitle, { color: colors.foreground }]}>{slide.title}</Text>
              <Text style={[styles.slideSubtitle, { color: colors.muted }]}>{slide.subtitle}</Text>

              {/* Name input */}
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

              {/* Photo upload step */}
              {slide.id === "photo" && (
                <View style={styles.photoPickerArea}>
                  {!avatarUri ? (
                    <>
                      <TouchableOpacity
                        onPress={handlePickPhoto}
                        activeOpacity={0.85}
                        style={[styles.photoBtn, { backgroundColor: colors.primary }]}
                        accessibilityLabel="Choose from library"
                      >
                        <Text style={styles.photoBtnText}>📷  Choose from Library</Text>
                      </TouchableOpacity>
                      {Platform.OS !== "web" && (
                        <TouchableOpacity
                          onPress={handleTakePhoto}
                          activeOpacity={0.85}
                          style={[styles.photoBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }]}
                          accessibilityLabel="Take a photo"
                        >
                          <Text style={[styles.photoBtnText, { color: colors.foreground }]}>📸  Take a Photo</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={goNext}
                        activeOpacity={0.7}
                        style={styles.skipPhotoBtn}
                        accessibilityLabel="Skip photo"
                      >
                        <Text style={[styles.skipPhotoText, { color: colors.muted }]}>Skip for now</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.photoConfirmArea}>
                      <Text style={[styles.photoConfirmText, { color: colors.success }]}>
                        ✓ Photo added!
                      </Text>
                      <TouchableOpacity
                        onPress={handlePickPhoto}
                        activeOpacity={0.7}
                        style={styles.skipPhotoBtn}
                      >
                        <Text style={[styles.skipPhotoText, { color: colors.muted }]}>Change photo</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Subject category picker */}
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
                        accessibilityLabel={`${selected ? "Deselect" : "Select"} ${def.label} category`}
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
                        <Text style={[styles.categoryLabel, { color: selected ? def.color : colors.foreground }]}>
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

              {/* Grade level picker */}
              {slide.id === "grade" && (
                <ScrollView keyboardDismissMode="on-drag"
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

              {/* Tutor personality preview */}
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

              {/* Trial slide */}
              {slide.id === "trial" && (
                <View style={styles.trialFeatureList}>
                  {[
                    { emoji: "♾️", text: "Unlimited solves, quizzes & AI chat" },
                    { emoji: "📸", text: "Photo homework solver" },
                    { emoji: "🧠", text: "Step-by-step explanations" },
                    { emoji: "📈", text: "Progress tracking & streaks" },
                    { emoji: "🎖️", text: trialVariant.onboardingBullet },
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
              </SlideWrapper>
            </View>
          ))}
        </ScrollView>

        {/* Animated dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, idx) => {
            const isActive = idx === currentSlide;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  H.impactLight();
                  setCurrentSlide(idx);
                  animateDot(idx);
                  scrollRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: true });
                }}
                activeOpacity={0.7}
                accessibilityLabel={`Go to slide ${idx + 1}`}
              >
                {isActive ? (
                  <LinearGradient
                    colors={["#7C3AED", "#06B6D4"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.dot, { width: 24 }]}
                  />
                ) : (
                  <View
                    style={[styles.dot, { backgroundColor: `${colors.primary}30`, width: 8 }]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA button — hide on photo slide when no photo (Skip for now is the CTA) */}
        {!(SLIDES[currentSlide]?.id === "photo" && !avatarUri) && (
          <TouchableOpacity
            onPress={goNext}
            activeOpacity={0.85}
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            accessibilityLabel={isLastSlide ? "Get Started" : "Next slide"}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>
              {isLastSlide ? "See Plans" : "Next"}
            </Text>
          </TouchableOpacity>
        )}
        {/* Maybe Later link — only on the last (trial) slide */}
        {isLastSlide && (
          <TouchableOpacity
            onPress={finishOnboarding}
            activeOpacity={0.7}
            style={styles.maybeLaterBtn}
            accessibilityLabel="Maybe later, continue with free tier"
            accessibilityRole="button"
          >
            <Text style={[styles.maybeLaterText, { color: colors.muted }]}>
              Maybe Later — Start with Free Tier
            </Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
      </KeyboardAvoidingView>
        {/* Confetti removed — celebration fires only after a real purchase on /premium-welcome */}
        {/* Portal bloom overlay — full-screen white flash on exit */}
        <Reanimated.View style={bloomStyle} pointerEvents="none" />
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  gradientRoot: { flex: 1 },
  root: { flex: 1 },
  backBtn: {
    position: "absolute",
    top: 54,
    left: 20,
    zIndex: 10,
    padding: 8,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 34,
    fontWeight: "300",
    lineHeight: 38,
    marginTop: -4,
  },
  skipBtn: {
    position: "absolute",
    top: 56,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: { fontSize: 15, fontWeight: "600" },
  progressBarContainer: {
    position: "absolute",
    top: 56,
    left: 24,
    right: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.18)",
    zIndex: 10,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
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
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 32,
    position: "relative",
    overflow: "visible",
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarEditIcon: { color: "#fff", fontSize: 14, fontWeight: "700" },
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
  photoPickerArea: {
    width: "100%",
    marginTop: 32,
    gap: 12,
    alignItems: "center",
  },
  photoBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  photoBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  skipPhotoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  skipPhotoText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  photoConfirmArea: {
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  photoConfirmText: {
    fontSize: 17,
    fontWeight: "700",
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
    marginBottom: 8,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
  maybeLaterBtn: {
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 4,
  },
  maybeLaterText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.1,
    textDecorationLine: "underline",
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
  previewHint: { fontSize: 12, textAlign: "center", lineHeight: 18, marginTop: 4, marginBottom: 16 },
});
