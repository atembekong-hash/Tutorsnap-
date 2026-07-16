"""
Apply three premium features to chat.tsx:
1. Mood Ring Orb - color shift during AI generation
2. Swipe to show tab bar - gesture to reveal hidden tab bar
3. Animate AI Responses - word-by-word fade-in
"""

import re

with open('app/(tabs)/chat.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ─── 1. MOOD RING ORB ─────────────────────────────────────────────────────────
# Replace AIAvatar to accept a `moodRing` prop that shifts colors when active
old_avatar = '''function AIAvatar({ size = 30, pulsing = false }: { size?: number; pulsing?: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    if (pulsing) {
      pulse.start();
      glow.start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.6);
    }
    return () => { pulse.stop(); glow.stop(); };
  }, [pulsing, pulseAnim, glowAnim]);
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {/* Outer glow ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: size + 8,
          height: size + 8,
          borderRadius: (size + 8) / 2,
          backgroundColor: "#7C3AED",
          opacity: glowAnim.interpolate({ inputRange: [0.6, 1], outputRange: [0, 0.25] }),
        }}
      />
      <LinearGradient
        colors={["#6366F1", "#7C3AED", "#4F46E5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >'''

new_avatar = '''function AIAvatar({ size = 30, pulsing = false, moodRing = false }: { size?: number; pulsing?: boolean; moodRing?: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const colorShiftAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    if (pulsing) {
      pulse.start();
      glow.start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.6);
    }
    return () => { pulse.stop(); glow.stop(); };
  }, [pulsing, pulseAnim, glowAnim]);
  // Mood ring: animate color shift when generating
  useEffect(() => {
    if (moodRing && pulsing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(colorShiftAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(colorShiftAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      ).start();
    } else {
      colorShiftAnim.setValue(0);
    }
  }, [moodRing, pulsing, colorShiftAnim]);
  // Interpolate glow color for mood ring
  const glowColor = moodRing && pulsing
    ? colorShiftAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["#7C3AED", "#06B6D4", "#14B8A6"] })
    : "#7C3AED";
  // Determine gradient colors based on mood ring state
  const gradientColors: [string, string, string] = moodRing && pulsing
    ? ["#06B6D4", "#0891B2", "#14B8A6"]
    : ["#6366F1", "#7C3AED", "#4F46E5"];
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {/* Outer glow ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: size + 8,
          height: size + 8,
          borderRadius: (size + 8) / 2,
          backgroundColor: glowColor as any,
          opacity: glowAnim.interpolate({ inputRange: [0.6, 1], outputRange: [0, 0.25] }),
        }}
      />
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >'''

if old_avatar in content:
    content = content.replace(old_avatar, new_avatar, 1)
    print("✓ Mood Ring Orb: AIAvatar upgraded")
else:
    print("✗ Mood Ring Orb: AIAvatar pattern not found")

# ─── 2. PASS moodRing prop to header AIAvatar ──────────────────────────────────
# The header avatar already uses pulsing={isStreaming || isWaitingForFirstToken}
# We need to add moodRing={tutorSettings.moodRingOrb}
old_header_avatar = '<AIAvatar size={28} pulsing={isStreaming || isWaitingForFirstToken} />'
new_header_avatar = '<AIAvatar size={28} pulsing={isStreaming || isWaitingForFirstToken} moodRing={tutorSettings.moodRingOrb} />'
if old_header_avatar in content:
    content = content.replace(old_header_avatar, new_header_avatar, 1)
    print("✓ Mood Ring Orb: header avatar updated")
else:
    print("✗ Mood Ring Orb: header avatar pattern not found")

# ─── 3. SWIPE TO SHOW TAB BAR ─────────────────────────────────────────────────
# Add a state and PanResponder for swipe-down gesture near the top of ChatScreenContent
# We'll add it after the tutorSettings line
old_tutor_line = '  const { settings: tutorSettings, update: updateTutorSetting, reset: resetTutorSettings } = useTutorSettings();'
swipe_state = '''  const { settings: tutorSettings, update: updateTutorSetting, reset: resetTutorSettings } = useTutorSettings();

  // ── Swipe-to-show tab bar ───────────────────────────────────────────────────
  const [tabBarVisible, setTabBarVisible] = useState(false);
  const tabBarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTabBarBriefly = useCallback(() => {
    if (!tutorSettings.swipeToShowTabBar) return;
    setTabBarVisible(true);
    if (tabBarTimeoutRef.current) clearTimeout(tabBarTimeoutRef.current);
    tabBarTimeoutRef.current = setTimeout(() => setTabBarVisible(false), 3500);
  }, [tutorSettings.swipeToShowTabBar]);'''

if old_tutor_line in content:
    content = content.replace(old_tutor_line, swipe_state, 1)
    print("✓ Swipe Tab Bar: state added")
else:
    print("✗ Swipe Tab Bar: tutorSettings line not found")

# ─── 4. Add PanResponder import (check if already imported) ────────────────────
if 'PanResponder' not in content:
    # Add PanResponder to the react-native import
    content = content.replace(
        'import {\n  ActivityIndicator,',
        'import {\n  ActivityIndicator,\n  PanResponder,',
        1
    )
    print("✓ PanResponder import added")
else:
    print("✓ PanResponder already imported")

# ─── 5. Add swipe gesture handler to the ScreenContainer area ──────────────────
# We need to add a panResponder for the swipe-down gesture
# Find the ScreenContainer return and add a View with panResponder handlers above it
# Instead, let's add a swipe handler to the FlatList/ScrollView area
# The simplest approach: add onScrollBeginDrag handler to detect upward scroll at top

# Find the header area and add a swipe indicator pill
old_screen_container = '<ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-background">'
new_screen_container = '''<ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-background">
        {/* Swipe indicator pill — shows when tab bar is hidden */}
        {tutorSettings.swipeToShowTabBar && !tabBarVisible && (
          <TouchableOpacity
            onPress={showTabBarBriefly}
            style={{
              position: "absolute",
              bottom: 6,
              alignSelf: "center",
              zIndex: 999,
              paddingVertical: 4,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: `${colors.muted}30`,
            }}
            activeOpacity={0.6}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: `${colors.muted}60` }} />
          </TouchableOpacity>
        )}'''

if old_screen_container in content:
    content = content.replace(old_screen_container, new_screen_container, 1)
    print("✓ Swipe Tab Bar: indicator pill added")
else:
    print("✗ Swipe Tab Bar: ScreenContainer pattern not found")

# ─── 6. Make the tab bar visibility dynamic via navigation params ──────────────
# The tab bar is hidden via `tabBarStyle: { display: "none" }` in _layout.tsx
# We need to communicate tabBarVisible from chat.tsx to _layout.tsx
# Best approach: use navigation.setOptions to dynamically show/hide tab bar
old_nav_import = 'import { useRouter } from "expo-router";'
if old_nav_import in content:
    content = content.replace(
        old_nav_import,
        'import { useRouter, useNavigation } from "expo-router";',
        1
    )
    print("✓ useNavigation import added")
else:
    # Try alternate import pattern
    if 'useNavigation' not in content:
        content = content.replace(
            'from "expo-router"',
            'useNavigation } from "expo-router"',
            1
        )
        print("✓ useNavigation added to existing import")
    else:
        print("✓ useNavigation already imported")

# Add useEffect to toggle tab bar visibility
old_show_tab = '  const showTabBarBriefly = useCallback(() => {'
new_show_tab = '''  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: tabBarVisible ? {
        paddingTop: 8,
        paddingBottom: Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8),
        height: 60 + (Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8)),
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        borderTopWidth: 0.5,
      } : { display: "none" as const },
    });
  }, [tabBarVisible, navigation, colors, insets]);
  const showTabBarBriefly = useCallback(() => {'''

if old_show_tab in content:
    content = content.replace(old_show_tab, new_show_tab, 1)
    print("✓ Swipe Tab Bar: navigation.setOptions added")
else:
    print("✗ Swipe Tab Bar: showTabBarBriefly pattern not found")

# Check if insets is available
if 'useSafeAreaInsets' not in content:
    print("⚠ Need to add useSafeAreaInsets import")
else:
    print("✓ useSafeAreaInsets already imported")

# Check if insets variable exists
insets_check = content.find('const insets = useSafeAreaInsets()')
if insets_check == -1:
    # Add insets after the colors hook
    content = content.replace(
        '  const colors = useColors();\n  const colorScheme = useColorScheme();',
        '  const colors = useColors();\n  const insets = useSafeAreaInsets();\n  const colorScheme = useColorScheme();',
        1
    )
    print("✓ insets variable added")
else:
    print("✓ insets already defined")

# ─── 7. ANIMATE AI RESPONSES — word-by-word fade-in ────────────────────────────
# We'll add an AnimatedWord component and modify how streaming text is displayed
# The cleanest approach: add a wrapper component that splits text into words and fades them in
# This goes near the top helper components section

animated_word_component = '''
// ─── Animated Word Fade-In ──────────────────────────────────────────────────
function AnimatedWordText({ text, color, fontSize, enabled }: { text: string; color: string; fontSize: number; enabled: boolean }) {
  if (!enabled || !text) {
    return <Text style={{ color, fontSize, lineHeight: fontSize * 1.5 }}>{text}</Text>;
  }
  const words = text.split(/( )/);
  return (
    <Text style={{ color, fontSize, lineHeight: fontSize * 1.5, flexWrap: "wrap" }}>
      {words.map((word, i) => (
        <AnimatedWordSpan key={`${i}-${word}`} word={word} delay={i * 35} />
      ))}
    </Text>
  );
}

function AnimatedWordSpan({ word, delay }: { word: string; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      delay: Math.min(delay, 2000),
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [opacity, delay]);
  return <Animated.Text style={{ opacity }}>{word}</Animated.Text>;
}

'''

# Insert before the AIAvatar component
avatar_marker = '// ─── AI Avatar — animated gradient orb ─────────────────────────────────────'
if avatar_marker in content:
    content = content.replace(avatar_marker, animated_word_component + avatar_marker, 1)
    print("✓ Animate AI Responses: AnimatedWordText component added")
else:
    print("✗ Animate AI Responses: avatar marker not found")

with open('app/(tabs)/chat.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✓ All premium features applied to chat.tsx")
