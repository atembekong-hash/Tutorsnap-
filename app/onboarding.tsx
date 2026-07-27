import React, { useRef, useState, useEffect } from "react";
import {
  Alert,
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
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { SUBJECT_CATEGORIES, type SubjectCategory } from "@/lib/subjects";
import { GRADE_OPTIONS, saveGlobalGrade, loadGlobalGrade } from "@/lib/grade-levels";
import { TUTOR_SETTINGS_KEY, DEFAULT_TUTOR_SETTINGS } from "@/components/tutor-settings-modal";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import { getTrialVariantConfig, getDefaultTrialVariantConfig, type TrialVariantConfig } from "@/lib/ab-test";
import {
  PRICE_MONTHLY, PRICE_ANNUAL, PRICE_ANNUAL_MONTHLY_EQUIV, DISCOUNT_PCT,
  PRODUCT_MONTHLY, PRODUCT_ANNUAL,
  getOfferings, purchaseProduct,
} from "@/lib/subscription";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useOnboardingExit } from "@/hooks/use-onboarding-transition";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const { width: SCREEN_WIDTH, height: SCREEN_H } = Dimensions.get("window");

export const ONBOARDING_DONE_KEY = "@tutorsnap/onboardingDone";
export const USER_NAME_KEY = "@tutorsnap/userName";

// ─── Per-slide gradient definitions ──────────────────────────────────────────
// Each entry: [gradientTop, gradientBottom, accentColor]
const SLIDE_THEMES: Record<string, { colors: [string, string, string]; accent: string }> = {
  name:            { colors: ["#4F46E5", "#7C3AED", "#312E81"], accent: "#7C3AED" },
  photo:           { colors: ["#0891B2", "#06B6D4", "#164E63"], accent: "#06B6D4" },
  welcome:         { colors: ["#1D4ED8", "#3B82F6", "#1E3A8A"], accent: "#3B82F6" },
  solve:           { colors: ["#047857", "#10B981", "#064E3B"], accent: "#10B981" },
  practice:        { colors: ["#B45309", "#F59E0B", "#78350F"], accent: "#F59E0B" },
  subjects:        { colors: ["#6D28D9", "#A855F7", "#4C1D95"], accent: "#A855F7" },
  grade:           { colors: ["#BE123C", "#F43F5E", "#881337"], accent: "#F43F5E" },
  "tutor-preview": { colors: ["#3730A3", "#6366F1", "#1E1B4B"], accent: "#6366F1" },
  trial:           { colors: ["#92400E", "#F59E0B", "#451A03"], accent: "#F59E0B" },
};

const SLIDES = [
  {
    id: "name",
    emoji: "👋",
    title: "What's your name?",
    subtitle: "Your AI Tutor will greet you personally.",
  },
  {
    id: "photo",
    emoji: "🖼️",
    title: "Add a Profile Photo",
    subtitle: "Optional. Helps classmates recognise you.",
  },
  {
    id: "welcome",
    emoji: "🎓",
    title: "Welcome to TutorSnap",
    subtitle: "AI tutoring for every subject, tailored to you.",
  },
  {
    id: "solve",
    emoji: "✨",
    title: "Snap, Type, or Ask",
    subtitle: "Point your camera at any problem for instant step-by-step help.",
  },
  {
    id: "practice",
    emoji: "🔥",
    title: "Build Your Streak",
    subtitle: "Daily practice builds mastery. Earn XP and climb the leaderboard.",
  },
  {
    id: "subjects",
    emoji: "📚",
    title: "Pick Your Subjects",
    subtitle: "We'll show you the most relevant content.",
  },
  {
    id: "grade",
    emoji: "🎯",
    title: "What's Your Level?",
    subtitle: "Explanations tuned to your grade. Change anytime.",
  },
  {
    id: "tutor-preview",
    emoji: "🤖",
    title: "Meet Your AI Tutor",
    subtitle: "Personalised to your subjects, grade, and learning style.",
  },
  {
    id: "trial",
    emoji: "👑",
    title: "Start Free, Upgrade Anytime",
    subtitle: "14-day free trial. No charge today.",
  },
];

const CATEGORY_ORDER: SubjectCategory[] = ["math", "english", "science", "social"];

// ─── Slide entrance animation wrapper ────────────────────────────────────────
function SlideWrapper({ active, children }: { active: boolean; children: React.ReactNode }) {
  const opacity = useSharedValue(active ? 1 : 0);
  const translateY = useSharedValue(active ? 0 : 18);

  useEffect(() => {
    if (active) {
      opacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
      translateY.value = withSequence(
        withTiming(18, { duration: 0 }),
        withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }),
      );
    } else {
      opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
      translateY.value = withTiming(-10, { duration: 200, easing: Easing.in(Easing.quad) });
    }
  }, [active]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Reanimated.View style={[{ flex: 1, width: "100%" }, style]}>
      {children}
    </Reanimated.View>
  );
}

// ─── Glass card component ─────────────────────────────────────────────────────
function GlassCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

// ─── Hero emoji container ─────────────────────────────────────────────────────
function HeroEmoji({ emoji }: { emoji: string }) {
  return (
    <View style={styles.heroContainer}>
      <Text style={styles.heroEmoji}>{emoji}</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const safeTop = insets.top;
  const safeBottom = insets.bottom;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const router = useRouter();
  const { fadeStyle } = useScreenTransition({ duration: 320, translateY: 20 });
  const bloomColor = colorScheme === "dark" ? "rgba(124,58,237,0.45)" : "rgba(255,255,255,0.95)";
  const { startExit, portalStyle, bloomStyle } = useOnboardingExit(bloomColor);

  const skipBtnScale   = useSharedValue(1);
  const skipBtnOpacity = useSharedValue(1);
  const skipBtnStyle   = useAnimatedStyle(() => ({
    transform: [{ scale: skipBtnScale.value }],
    opacity: skipBtnOpacity.value,
  }));

  const [trialVariant, setTrialVariant] = React.useState<TrialVariantConfig>(getDefaultTrialVariantConfig());
  const [selectedPlan, setSelectedPlan] = React.useState<string>(PRODUCT_ANNUAL);
  const [purchaseLoading, setPurchaseLoading] = React.useState(false);
  const [monthlyPriceStr, setMonthlyPriceStr] = React.useState(`$${PRICE_MONTHLY.toFixed(2)}/mo`);
  const [annualPriceStr, setAnnualPriceStr] = React.useState(`$${PRICE_ANNUAL.toFixed(2)}/yr`);

  React.useEffect(() => {
    getTrialVariantConfig().then(setTrialVariant).catch(() => {});
    getOfferings().then((pkgs) => {
      for (const pkg of pkgs) {
        if (pkg.productId === PRODUCT_MONTHLY) setMonthlyPriceStr(pkg.priceString);
        if (pkg.productId === PRODUCT_ANNUAL) setAnnualPriceStr(pkg.priceString);
      }
    }).catch(() => {});
  }, []);

  const handleOnboardingPurchase = async () => {
    H.impactMedium();
    setPurchaseLoading(true);
    try {
      const result = await purchaseProduct(selectedPlan);
      if (result.success) {
        H.notificationSuccess();
        await finishOnboarding();
      } else if (!result.cancelled) {
        Alert.alert(
          "Purchase Failed",
          result.error ?? "Something went wrong. Please try again.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const scrollRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Set<SubjectCategory>>(new Set());
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const progressBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressBarAnim, {
      toValue: (currentSlide + 1) / SLIDES.length,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [currentSlide]);

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
    scrollRef.current?.scrollTo({ x: prev * SCREEN_WIDTH, animated: true });
  };

  const goNext = () => {
    H.impactLight();
    if (isLastSlide) {
      handleOnboardingPurchase();
    } else {
      let next = currentSlide + 1;
      if (SLIDES[next]?.id === "photo" && avatarUri) {
        next = next + 1;
      }
      setCurrentSlide(next);
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    }
  };

  const handlePickPhoto = async () => {
    H.impactLight();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
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
    } catch { /* non-critical */ }

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

  const finishOnboarding = async () => {
    H.notificationSuccess();
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
    await persistOnboardingChoices();
    startExit(() => {
      router.replace({ pathname: "/(tabs)", params: { fromOnboarding: "1" } } as any);
    });
  };

  const handleSkipWithAnimation = () => {
    skipBtnScale.value   = withTiming(0.82, { duration: 110, easing: Easing.in(Easing.quad) });
    skipBtnOpacity.value = withTiming(0,    { duration: 110, easing: Easing.in(Easing.quad) });
    setTimeout(finishOnboarding, 120);
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
    }
  };

  const currentTheme = SLIDE_THEMES[SLIDES[currentSlide]?.id] ?? SLIDE_THEMES.welcome;

  // CTA label
  const ctaLabel = isLastSlide
    ? (purchaseLoading ? "Starting Trial..." : "Start Free Trial")
    : "Continue";

  // Hide CTA on photo slide when no photo yet (handled inline)
  const showCta = !(SLIDES[currentSlide]?.id === "photo" && !avatarUri)
    && !(keyboardVisible && SLIDES[currentSlide]?.id === "name");

  return (
    <Reanimated.View style={[{ flex: 1 }, fadeStyle, portalStyle]}>
      <LinearGradient
        colors={currentTheme.colors}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={safeBottom + 8}
      >
        <SafeAreaView
          style={{ flex: 1 }}
          edges={["top", "bottom", "left", "right"]}
        >
          {/* ── Top chrome ─────────────────────────────────────────────────── */}
          <View style={[styles.topChrome, { paddingTop: 4 }]}>
            {/* Back button */}
            {!isFirstSlide ? (
              <TouchableOpacity
                onPress={goBack}
                activeOpacity={0.7}
                style={styles.backBtn}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <MaterialIcons name="chevron-left" size={28} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtn} />
            )}

            {/* Progress bar */}
            <View style={styles.progressBarTrack}>
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
              />
            </View>

            {/* Skip button */}
            {!isFirstSlide && !isLastSlide ? (
              <Reanimated.View style={[styles.skipBtn, skipBtnStyle]}>
                <TouchableOpacity
                  onPress={handleSkipWithAnimation}
                  activeOpacity={0.7}
                  accessibilityLabel="Skip onboarding"
                  accessibilityRole="button"
                >
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
              </Reanimated.View>
            ) : (
              <View style={styles.skipBtn} />
            )}
          </View>

          {/* ── Slides ─────────────────────────────────────────────────────── */}
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleScroll}
            style={{ flex: 1 }}
            contentContainerStyle={{ alignItems: "flex-start" }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEnabled={false}
          >
            {SLIDES.map((slide, idx) => {
              const theme = SLIDE_THEMES[slide.id] ?? SLIDE_THEMES.welcome;
              return (
                <View key={slide.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
                  <SlideWrapper active={idx === currentSlide}>
                    {/* Hero illustration */}
                    {slide.id === "photo" && avatarUri ? (
                      <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85} style={styles.avatarHero}>
                        <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                        <View style={[styles.avatarEditBadge, { backgroundColor: theme.accent }]}>
                          <MaterialIcons name="edit" size={14} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <HeroEmoji emoji={slide.emoji} />
                    )}

                    {/* Title */}
                    <Text style={styles.slideTitle}>{slide.title}</Text>
                    {/* Subtitle */}
                    <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>

                    {/* ── Skip setup link on welcome slide ── */}
                    {slide.id === "welcome" && (
                      <TouchableOpacity
                        onPress={() => {
                          H.impactLight();
                          const trialIdx = SLIDES.findIndex((s) => s.id === "trial");
                          if (trialIdx >= 0) {
                            setCurrentSlide(trialIdx);
                            scrollRef.current?.scrollTo({ x: trialIdx * SCREEN_WIDTH, animated: true });
                          }
                        }}
                        activeOpacity={0.7}
                        style={styles.skipSetupBtn}
                        accessibilityLabel="Skip to trial"
                        accessibilityRole="button"
                      >
                        <Text style={styles.skipSetupText}>Skip setup</Text>
                      </TouchableOpacity>
                    )}

                    {/* ── Welcome feature pills ── */}
                    {slide.id === "welcome" && (
                      <View style={styles.featurePillsRow}>
                        {[
                          { icon: "photo-camera", label: "Snap" },
                          { icon: "chat", label: "Chat" },
                          { icon: "fitness-center", label: "Practice" },
                        ].map((f) => (
                          <View key={f.label} style={styles.featurePill}>
                            <MaterialIcons name={f.icon as any} size={14} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.featurePillText}>{f.label}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* ── Solve feature mini-cards ── */}
                    {slide.id === "solve" && (
                      <View style={styles.solveCardsRow}>
                        {[
                          { icon: "photo-camera", label: "Camera", desc: "Snap a problem" },
                          { icon: "keyboard", label: "Type", desc: "Type it out" },
                          { icon: "chat-bubble", label: "Chat", desc: "Ask anything" },
                        ].map((c) => (
                          <GlassCard key={c.label} style={styles.solveMiniCard}>
                            <MaterialIcons name={c.icon as any} size={22} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.solveMiniLabel}>{c.label}</Text>
                            <Text style={styles.solveMiniDesc}>{c.desc}</Text>
                          </GlassCard>
                        ))}
                      </View>
                    )}

                    {/* ── Practice streak row ── */}
                    {slide.id === "practice" && (
                      <View style={styles.streakSection}>
                        <View style={styles.streakRow}>
                          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                            <View key={i} style={[styles.streakDay, i < 5 && styles.streakDayActive]}>
                              <Text style={[styles.streakDayLabel, i < 5 && styles.streakDayLabelActive]}>{day}</Text>
                              {i < 5 && <Text style={styles.streakFlame}>🔥</Text>}
                            </View>
                          ))}
                        </View>
                        <View style={styles.streakStats}>
                          <GlassCard style={styles.streakStatCard}>
                            <Text style={styles.streakStatNum}>5</Text>
                            <Text style={styles.streakStatLabel}>Day Streak</Text>
                          </GlassCard>
                          <GlassCard style={styles.streakStatCard}>
                            <Text style={styles.streakStatNum}>240</Text>
                            <Text style={styles.streakStatLabel}>XP Earned</Text>
                          </GlassCard>
                          <GlassCard style={styles.streakStatCard}>
                            <Text style={styles.streakStatNum}>#12</Text>
                            <Text style={styles.streakStatLabel}>Rank</Text>
                          </GlassCard>
                        </View>
                      </View>
                    )}

                    {/* ── Name input ── */}
                    {slide.id === "name" && (
                      <View style={styles.nameInputArea}>
                        <TextInput
                          value={userName}
                          onChangeText={setUserName}
                          placeholder="Your first name"
                          placeholderTextColor="rgba(255,255,255,0.45)"
                          returnKeyType="done"
                          maxLength={40}
                          autoFocus
                          onSubmitEditing={goNext}
                          accessibilityLabel="Enter your first name"
                          style={[
                            styles.nameInput,
                            { borderColor: userName.trim() ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" },
                          ]}
                        />
                        {userName.trim().length > 0 && (
                          <Text style={styles.nameHint}>Hi, {userName.trim()}! 👋</Text>
                        )}
                      </View>
                    )}

                    {/* ── Photo upload ── */}
                    {slide.id === "photo" && !avatarUri && (
                      <View style={styles.photoArea}>
                        <TouchableOpacity
                          onPress={handlePickPhoto}
                          activeOpacity={0.85}
                          style={styles.photoBtnPrimary}
                          accessibilityLabel="Choose from library"
                        >
                          <MaterialIcons name="photo-library" size={18} color={currentTheme.accent} />
                          <Text style={[styles.photoBtnPrimaryText, { color: currentTheme.accent }]}>Choose from Library</Text>
                        </TouchableOpacity>
                        {Platform.OS !== "web" && (
                          <TouchableOpacity
                            onPress={handleTakePhoto}
                            activeOpacity={0.85}
                            style={styles.photoBtnSecondary}
                            accessibilityLabel="Take a photo"
                          >
                            <MaterialIcons name="camera-alt" size={18} color="rgba(255,255,255,0.85)" />
                            <Text style={styles.photoBtnSecondaryText}>Take a Photo</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={goNext}
                          activeOpacity={0.7}
                          style={styles.skipPhotoBtn}
                          accessibilityLabel="Skip photo"
                        >
                          <Text style={styles.skipPhotoText}>Skip for now</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* ── Subjects picker ── */}
                    {slide.id === "subjects" && (
                      <View style={styles.subjectsGrid}>
                        {CATEGORY_ORDER.map((cat) => {
                          const def = SUBJECT_CATEGORIES[cat];
                          const selected = selectedCategories.has(cat);
                          return (
                            <TouchableOpacity
                              key={cat}
                              onPress={() => toggleCategory(cat)}
                              activeOpacity={0.8}
                              accessibilityLabel={`${selected ? "Deselect" : "Select"} ${def.label}`}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: selected }}
                              style={[
                                styles.subjectCard,
                                selected && styles.subjectCardSelected,
                              ]}
                            >
                              {selected && (
                                <View style={styles.subjectCheckBadge}>
                                  <MaterialIcons name="check" size={12} color="#fff" />
                                </View>
                              )}
                              <Text style={styles.subjectEmoji}>{def.emoji}</Text>
                              <Text style={[styles.subjectLabel, selected && styles.subjectLabelSelected]}>
                                {def.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* ── Grade picker ── */}
                    {slide.id === "grade" && (
                      <View style={styles.gradeGrid}>
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
                                isActive && styles.gradeCardActive,
                              ]}
                            >
                              {isActive && (
                                <View style={styles.gradeCheckDot}>
                                  <MaterialIcons name="check" size={9} color="#fff" />
                                </View>
                              )}
                              <Text style={[styles.gradeCardLabel, isActive && styles.gradeCardLabelActive]}>
                                {opt.label}
                              </Text>
                              <Text style={styles.gradeCardSub}>{opt.sub}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* ── Tutor preview ── */}
                    {slide.id === "tutor-preview" && (
                      <View style={styles.tutorPreviewList}>
                        {[
                          {
                            icon: "school",
                            label: "Grade",
                            value: selectedGrade
                              ? GRADE_OPTIONS.find((g) => g.id === selectedGrade)?.label ?? selectedGrade
                              : "Not set",
                          },
                          {
                            icon: "menu-book",
                            label: "Subjects",
                            value: selectedCategories.size > 0
                              ? Array.from(selectedCategories).map((c) => SUBJECT_CATEGORIES[c]?.label).join(", ")
                              : "All subjects",
                          },
                          {
                            icon: "sentiment-satisfied",
                            label: "Tone",
                            value: "Friendly and encouraging",
                          },
                          {
                            icon: "format-list-numbered",
                            label: "Style",
                            value: "Step-by-step with full working",
                          },
                          {
                            icon: "language",
                            label: "Language",
                            value: "English (change in Tutor Settings)",
                          },
                        ].map((row) => (
                          <GlassCard key={row.label} style={styles.tutorPreviewRow}>
                            <MaterialIcons name={row.icon as any} size={18} color="rgba(255,255,255,0.8)" />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.tutorPreviewLabel}>{row.label}</Text>
                              <Text style={styles.tutorPreviewValue}>{row.value}</Text>
                            </View>
                          </GlassCard>
                        ))}
                        <Text style={styles.tutorPreviewHint}>
                          Fine-tune all of this in Tutor Settings inside the chat.
                        </Text>
                      </View>
                    )}

                    {/* ── Trial plan selector ── */}
                    {slide.id === "trial" && (
                      <View style={styles.trialSection}>
                        <View style={styles.trialPlanRow}>
                          {/* Monthly */}
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => { H.impactLight(); setSelectedPlan(PRODUCT_MONTHLY); }}
                            style={[
                              styles.trialPlanCard,
                              selectedPlan === PRODUCT_MONTHLY && styles.trialPlanCardSelected,
                            ]}
                            accessibilityLabel={`Monthly plan ${monthlyPriceStr}`}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: selectedPlan === PRODUCT_MONTHLY }}
                          >
                            <Text style={styles.trialPlanCardTitle}>Monthly</Text>
                            <Text style={[styles.trialPlanCardPrice, selectedPlan === PRODUCT_MONTHLY && styles.trialPlanCardPriceSelected]}>
                              {monthlyPriceStr}
                            </Text>
                          </TouchableOpacity>

                          {/* Annual */}
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => { H.impactLight(); setSelectedPlan(PRODUCT_ANNUAL); }}
                            style={[
                              styles.trialPlanCard,
                              selectedPlan === PRODUCT_ANNUAL && styles.trialPlanCardSelected,
                            ]}
                            accessibilityLabel={`Annual plan ${annualPriceStr} save ${DISCOUNT_PCT}%`}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: selectedPlan === PRODUCT_ANNUAL }}
                          >
                            <View style={styles.trialSaveBadge}>
                              <Text style={styles.trialSaveBadgeText}>Save {DISCOUNT_PCT}%</Text>
                            </View>
                            <Text style={styles.trialPlanCardTitle}>Annual</Text>
                            <Text style={[styles.trialPlanCardPrice, selectedPlan === PRODUCT_ANNUAL && styles.trialPlanCardPriceSelected]}>
                              {annualPriceStr}
                            </Text>
                            <Text style={styles.trialPlanCardNote}>${PRICE_ANNUAL_MONTHLY_EQUIV}/mo</Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.trialPriceNote}>
                          {selectedPlan === PRODUCT_ANNUAL
                            ? `Free for ${trialVariant.trialDays} days, then ${annualPriceStr}. Cancel anytime.`
                            : `Free for ${trialVariant.trialDays} days, then ${monthlyPriceStr}. Cancel anytime.`}
                        </Text>
                      </View>
                    )}
                  </SlideWrapper>
                </View>
              );
            })}
          </ScrollView>

          {/* ── Bottom chrome ───────────────────────────────────────────────── */}
          {!keyboardVisible && (
            <View style={styles.dotsRow}>
              {SLIDES.map((_, idx) => {
                const isActive = idx === currentSlide;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      H.impactLight();
                      setCurrentSlide(idx);
                      scrollRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: true });
                    }}
                    activeOpacity={0.7}
                    accessibilityLabel={`Go to slide ${idx + 1}`}
                    style={[styles.dot, isActive && styles.dotActive]}
                  />
                );
              })}
            </View>
          )}

          {showCta && (
            <TouchableOpacity
              onPress={goNext}
              activeOpacity={0.92}
              disabled={purchaseLoading}
              style={[styles.ctaButton, { opacity: purchaseLoading ? 0.75 : 1 }]}
              accessibilityLabel={isLastSlide ? "Start free trial" : "Continue"}
              accessibilityRole="button"
            >
              <Text style={[styles.ctaText, { color: currentTheme.accent }]}>
                {ctaLabel}
              </Text>
              {!isLastSlide && (
                <MaterialIcons name="arrow-forward" size={20} color={currentTheme.accent} style={{ marginLeft: 6 }} />
              )}
            </TouchableOpacity>
          )}

          {isLastSlide && !keyboardVisible && (
            <TouchableOpacity
              onPress={finishOnboarding}
              activeOpacity={0.7}
              style={styles.maybeLaterBtn}
              accessibilityLabel="Maybe later, continue with free tier"
              accessibilityRole="button"
            >
              <Text style={styles.maybeLaterText}>
                Maybe Later - Start with Free Tier
              </Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Portal bloom overlay */}
      <Reanimated.View style={bloomStyle} pointerEvents="none" />
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  // ── Top chrome ──────────────────────────────────────────────────────────────
  topChrome: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  skipBtn: {
    width: 44,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    fontWeight: "600",
  },

  // ── Slide container ──────────────────────────────────────────────────────────
  slide: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  heroContainer: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 0,
  },
  heroEmoji: {
    fontSize: 52,
  },

  // ── Avatar hero ───────────────────────────────────────────────────────────────
  avatarHero: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    position: "relative",
    overflow: "visible",
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  // ── Typography ────────────────────────────────────────────────────────────────
  slideTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.4,
    lineHeight: 32,
    marginBottom: 8,
  },
  slideSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "400",
    paddingHorizontal: 8,
  },

  // ── Skip setup (welcome) ──────────────────────────────────────────────────────
  skipSetupBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignSelf: "center",
  },
  skipSetupText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "500",
  },

  // ── Welcome feature pills ─────────────────────────────────────────────────────
  featurePillsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    justifyContent: "center",
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  featurePillText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Solve mini-cards ──────────────────────────────────────────────────────────
  solveCardsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    width: "100%",
  },
  solveMiniCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    gap: 4,
  },
  solveMiniLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  solveMiniDesc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },

  // ── Practice streak ───────────────────────────────────────────────────────────
  streakSection: {
    width: "100%",
    marginTop: 18,
    gap: 10,
  },
  streakRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  streakDay: {
    width: 36,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  streakDayActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.45)",
  },
  streakDayLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "700",
  },
  streakDayLabelActive: {
    color: "rgba(255,255,255,0.9)",
  },
  streakFlame: {
    fontSize: 12,
  },
  streakStats: {
    flexDirection: "row",
    gap: 8,
  },
  streakStatCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  streakStatNum: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },
  streakStatLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },

  // ── Glass card ────────────────────────────────────────────────────────────────
  glassCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 14,
    padding: 12,
  },

  // ── Name input ────────────────────────────────────────────────────────────────
  nameInputArea: {
    width: "100%",
    marginTop: 16,
    gap: 10,
  },
  nameInput: {
    fontSize: 17,
    fontWeight: "600",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.14)",
    color: "#fff",
    textAlign: "center",
  },
  nameHint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },

  // ── Photo area ────────────────────────────────────────────────────────────────
  photoArea: {
    width: "100%",
    marginTop: 16,
    gap: 10,
    alignItems: "center",
  },
  photoBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: "center",
  },
  photoBtnPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
  },
  photoBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: "center",
  },
  photoBtnSecondaryText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "600",
  },
  skipPhotoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipPhotoText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },

  // ── Subjects ──────────────────────────────────────────────────────────────────
  subjectsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
    width: "100%",
    justifyContent: "center",
  },
  subjectCard: {
    width: (SCREEN_WIDTH - 24 * 2 - 10) / 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  subjectCardSelected: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderColor: "rgba(255,255,255,0.6)",
  },
  subjectCheckBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  subjectEmoji: {
    fontSize: 28,
  },
  subjectLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  subjectLabelSelected: {
    color: "#fff",
  },

  // ── Grade grid ────────────────────────────────────────────────────────────────
  gradeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
    width: "100%",
    justifyContent: "center",
  },
  gradeCard: {
    width: (SCREEN_WIDTH - 24 * 2 - 6 * 3) / 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    position: "relative",
  },
  gradeCardActive: {
    backgroundColor: "rgba(255,255,255,0.28)",
    borderColor: "rgba(255,255,255,0.65)",
  },
  gradeCheckDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  gradeCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    marginBottom: 1,
  },
  gradeCardLabelActive: {
    color: "#fff",
  },
  gradeCardSub: {
    fontSize: 9,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },

  // ── Tutor preview ─────────────────────────────────────────────────────────────
  tutorPreviewList: {
    width: "100%",
    marginTop: 14,
    gap: 7,
  },
  tutorPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  tutorPreviewLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  tutorPreviewValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
    lineHeight: 16,
  },
  tutorPreviewHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 15,
    marginTop: 2,
  },

  // ── Trial ─────────────────────────────────────────────────────────────────────
  trialSection: {
    width: "100%",
    marginTop: 14,
    gap: 10,
  },
  trialPlanRow: {
    flexDirection: "row",
    gap: 10,
  },
  trialPlanCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    position: "relative",
    marginTop: 8,
  },
  trialPlanCardSelected: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.65)",
  },
  trialSaveBadge: {
    position: "absolute",
    top: -10,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  trialSaveBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: 0.3,
  },
  trialPlanCardTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
    marginTop: 4,
  },
  trialPlanCardPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "rgba(255,255,255,0.75)",
  },
  trialPlanCardPriceSelected: {
    color: "#fff",
  },
  trialPlanCardNote: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  trialPriceNote: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 16,
  },

  // ── Bottom chrome ─────────────────────────────────────────────────────────────
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    width: 24,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  ctaButton: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 6,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  maybeLaterBtn: {
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 2,
  },
  maybeLaterText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
});
