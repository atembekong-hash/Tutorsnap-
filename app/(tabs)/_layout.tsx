import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Platform, StyleSheet, Animated, Easing } from "react-native";
import { useRef, useEffect } from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { SchemeColors } from "@/constants/theme";
import { useChatBadge } from "@/hooks/use-chat-badge";
import { Text } from "react-native";
import { useAppearance } from "@/lib/appearance-context";

function ScanTabIcon({ color: _color, focused: _focused }: { color: string; focused: boolean }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.scanIconContainer,
        { backgroundColor: colors.primary },
      ]}
    >
      <IconSymbol size={26} name="camera.fill" color="#FFFFFF" />
    </View>
  );
}

function ChatTabIcon({ color, focused: _focused }: { color: string; focused: boolean }) {
  const colors = useColors();
  const { unreadCount, markAsRead } = useChatBadge();
  const badgeScaleAnim = useRef(new Animated.Value(1)).current;
  const prevUnreadRef = useRef(unreadCount);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      Animated.sequence([
        Animated.timing(badgeScaleAnim, { toValue: 0.8, duration: 60, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(badgeScaleAnim, { toValue: 1.15, duration: 160, useNativeDriver: true, easing: Easing.out(Easing.back(2)) }),
        Animated.timing(badgeScaleAnim, { toValue: 1.0, duration: 120, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start();
    }
    prevUnreadRef.current = unreadCount;
    if (unreadCount > 0 && _focused) {
      markAsRead();
    }
  }, [unreadCount, _focused, badgeScaleAnim, markAsRead]);

  return (
    <View style={{ position: "relative" }}>
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
    </View>
  );
}

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
          tabBarIcon: ({ color }) => <IconSymbol size={30} name="sum" color={color} />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: "Practice",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="pencil.and.list.clipboard" color={color} />,
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
          title: "AI Tutor",
          tabBarIcon: ({ color, focused }) => <ChatTabIcon color={color} focused={focused} />,
          tabBarStyle: chatTabBarStyle,
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
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.2.fill" color={color} />,
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
