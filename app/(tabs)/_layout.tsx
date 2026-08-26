import { Tabs, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Platform, StyleSheet, Animated, Easing, Text } from "react-native";
import { useRef, useEffect, useCallback, useState } from "react";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { SchemeColors } from "@/constants/theme";
import { useChatBadge } from "@/hooks/use-chat-badge";
import { getDailyChallengeState } from "@/lib/daily-challenge";
import { getProgress } from "@/lib/progress";
import { useAppearance } from "@/lib/appearance-context";

// ─── Shared: spring-scale on focus ───────────────────────────────────────────
function useTabFocusScale(focused: boolean, reduceMotion: boolean) {
  const scale = useRef(new Animated.Value(focused ? 1.12 : 1)).current;
  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(focused ? 1.12 : 1);
      return;
    }
    Animated.spring(scale, {
      toValue: focused ? 1.12 : 1,
      useNativeDriver: true,
      tension: 260,
      friction: 18,
    }).start();
  }, [focused, reduceMotion, scale]);
  return scale;
}

// ─── ScanTabIcon ─────────────────────────────────────────────────────────────
function ScanTabIcon({ color: _color, focused }: { color: string; focused: boolean }) {
  const colors = useColors();
  const { settings } = useAppearance();
  const scale = useTabFocusScale(focused, settings.reduceMotion);

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Main button, intentionally static with no glow or pulse */}
      <Animated.View
        style={[
          styles.scanIconContainer,
          { backgroundColor: colors.primary, transform: [{ scale }] },
        ]}
      >
        <IconSymbol size={26} name="camera.fill" color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

// ─── ChatTabIcon ──────────────────────────────────────────────────────────────
function ChatTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const colors = useColors();
  const { settings } = useAppearance();
  const { unreadCount, markAsRead } = useChatBadge();
  const badgeScaleAnim = useRef(new Animated.Value(1)).current;
  const prevUnreadRef = useRef(unreadCount);
  const iconScale = useTabFocusScale(focused, settings.reduceMotion);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      Animated.sequence([
        Animated.timing(badgeScaleAnim, { toValue: 0.8, duration: 60, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(badgeScaleAnim, { toValue: 1.15, duration: 160, useNativeDriver: true, easing: Easing.out(Easing.back(2)) }),
        Animated.timing(badgeScaleAnim, { toValue: 1.0, duration: 120, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start();
    }
    prevUnreadRef.current = unreadCount;
    if (unreadCount > 0 && focused) {
      markAsRead();
    }
  }, [unreadCount, focused, badgeScaleAnim, markAsRead]);

  return (
    <Animated.View style={{ position: "relative", transform: [{ scale: iconScale }] }}>
      <IconSymbol size={24} name="bubble.left.fill" color={color} />
      {unreadCount > 0 && (
        <Animated.View style={[
          styles.chatBadge,
          { backgroundColor: colors.primary, transform: [{ scale: badgeScaleAnim }] },
        ]}>
          <Text style={styles.chatBadgeText}>
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── SolveTabIcon ─────────────────────────────────────────────────────────────
function SolveTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { settings } = useAppearance();
  const [goalMet, setGoalMet] = useState(true);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dismissAnim = useRef(new Animated.Value(1)).current;
  const prevGoalMet = useRef(true);
  const iconScale = useTabFocusScale(focused, settings.reduceMotion);

  useFocusEffect(
    useCallback(() => {
      getProgress().then((p) => {
        const met = p.streak.todaySolved >= p.streak.dailyGoal;
        setGoalMet(met);
        if (!met) {
          setBadgeVisible(true);
          dismissAnim.setValue(1);
        }
      });
    }, [dismissAnim])
  );

  // Dismiss animation when goal transitions from not-met to met
  useEffect(() => {
    if (!prevGoalMet.current && goalMet && badgeVisible) {
      Animated.timing(dismissAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.quad),
      }).start(() => setBadgeVisible(false));
    }
    prevGoalMet.current = goalMet;
  }, [goalMet, badgeVisible, dismissAnim]);

  // Pulse animation when badge is visible and tab not focused
  useEffect(() => {
    if (!badgeVisible || goalMet || focused || settings.reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [badgeVisible, goalMet, focused, pulseAnim, settings.reduceMotion]);

  return (
    <Animated.View style={{ position: "relative", transform: [{ scale: iconScale }] }}>
      <IconSymbol size={30} name="sum" color={color} />
      {badgeVisible && settings.showTabDots && (
        <Animated.View
          style={[
            styles.practiceBadge,
            { transform: [{ scale: Animated.multiply(pulseAnim, dismissAnim) }], opacity: dismissAnim },
          ]}
        />
      )}
    </Animated.View>
  );
}

// ─── PracticeTabIcon ──────────────────────────────────────────────────────────
function PracticeTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { settings } = useAppearance();
  const [dailyDone, setDailyDone] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const iconScale = useTabFocusScale(focused, settings.reduceMotion);

  useFocusEffect(
    useCallback(() => {
      getDailyChallengeState().then((s) => setDailyDone(s.completed));
    }, [])
  );

  useEffect(() => {
    if (dailyDone || focused || settings.reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [dailyDone, focused, pulseAnim, settings.reduceMotion]);

  return (
    <Animated.View style={{ position: "relative", transform: [{ scale: iconScale }] }}>
      <IconSymbol size={24} name="pencil.and.list.clipboard" color={color} />
      {!dailyDone && settings.showTabDots && (
        <Animated.View
          style={[
            styles.practiceBadge,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
      )}
    </Animated.View>
  );
}

// ─── ClassroomTabIcon ─────────────────────────────────────────────────────────
function ClassroomTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { settings } = useAppearance();
  const iconScale = useTabFocusScale(focused, settings.reduceMotion);
  return (
    <Animated.View style={{ transform: [{ scale: iconScale }] }}>
      <IconSymbol size={24} name="person.2.fill" color={color} />
    </Animated.View>
  );
}

// ─── TabLayout ────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;
  const { settings } = useAppearance();

  const standardTabBarStyle = {
    paddingTop: 8,
    paddingBottom: bottomPadding,
    height: tabBarHeight,
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 0.5,
  } as const;

  // When hideTabBarOnChat is enabled, the chat tab bar is hidden (display: none)
  const chatTabBarStyle = settings.hideTabBarOnChat
    ? { display: "none" as const }
    : standardTabBarStyle;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Solve",
          tabBarIcon: ({ color, focused }) => <SolveTabIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: "Practice",
          tabBarIcon: ({ color, focused }) => <PracticeTabIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "",
          tabBarIcon: ({ color, focused }) => <ScanTabIcon color={color} focused={focused} />,
          tabBarStyle: {
            paddingTop: 8,
            paddingBottom: bottomPadding,
            height: tabBarHeight,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 0.5,
          },
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          // AI Tutor is a page opened from the top-page action, not a bottom tab.
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="glossary"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="classroom"
        options={{
          title: "Classroom",
          tabBarIcon: ({ color, focused }) => <ClassroomTabIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  chatBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  chatBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 0.2,
  },
  practiceBadge: {
    position: "absolute" as const,
    top: -3,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  scanIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    elevation: 8,
    ...Platform.select({
      native: {
        shadowColor: SchemeColors.light.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      web: { boxShadow: "0 4px 8px rgba(79,70,229,0.3)" },
    }),
  },
});
