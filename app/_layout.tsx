import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack , useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono/400Regular";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform , Alert } from "react-native";
// Removed: React Navigation Stack is not compatible with Expo Router
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { OfflineBanner } from "@/components/offline-banner";
import { UpdatePromptModal } from "@/components/update-prompt-modal";
import { useUpdateCheck } from "@/lib/use-update-check";
import { FontSizeProvider } from "@/lib/font-size-provider";
import { AppearanceProvider } from "@/lib/appearance-context";
import { applyImportedAppearance } from "@/lib/appearance-deep-link";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { syncAllStreakNotifications } from "@/lib/streak-notifications";
import { initRevenueCat, getSubscriptionStatus } from "@/lib/subscription";
import { recordFirstLaunch } from "@/lib/review-prompt";
import { getOrCreateReferralCode, scheduleWeeklyAffiliateDigest } from "@/lib/affiliate";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { playTransitionSound } from "@/lib/sound-effects";
import { AuthProvider } from "@/lib/auth-context";

// Show notifications as banners when app is in foreground
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const router = useRouter();
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;
  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Load premium fonts — Inter for body text, JetBrains Mono for code
  const [_fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    JetBrainsMono_400Regular,
  });

  useEffect(() => {
    initManusRuntime();
    // Record first launch date for App Store review prompt gating
    recordFirstLaunch().catch(() => {});
    // Sync streak alert and weekly report notifications on every app launch
    syncAllStreakNotifications().catch(() => {});
    // Schedule weekly affiliate digest (Monday 9 AM)
    scheduleWeeklyAffiliateDigest().catch(() => {});
    // Initialise RevenueCat and check trial / subscription status
    initRevenueCat().then(async () => {
      try {
        const status = await getSubscriptionStatus();
        // If trial has expired and user is not premium, show paywall
        if (!status.isPremium && !status.isTrialActive && !status.isDevMode) {
          // Small delay so the app UI settles before presenting paywall
          setTimeout(() => {
            router.push("/paywall" as any);
          }, 1500);
        }
      } catch { /* ignore — paywall check failure is non-critical */ }
    }).catch(() => {});
  }, []);

  // Handle referral deep-link on initial URL and subsequent opens
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        // Handle appearance preset deep links: ?appearance=<base64>
        const appearanceParam = parsed.queryParams?.appearance as string | undefined;
        if (appearanceParam) {
          try {
            await applyImportedAppearance(appearanceParam);
            Alert.alert("Appearance Applied", "A shared appearance preset has been applied. Open Appearance Settings to review.", [{ text: "OK" }]);
          } catch { /* invalid payload — ignore */ }
          return;
        }
        const ref = (parsed.queryParams?.ref ?? parsed.queryParams?.code) as string | undefined;
        if (!ref) return;
        // Don't apply your own code
        const myCode = await getOrCreateReferralCode();
        if (ref.toUpperCase() === myCode.toUpperCase()) return;
        // Only apply once per install
        const applied = await AsyncStorage.getItem("@referral_applied");
        if (applied) return;
        await AsyncStorage.setItem("@referral_applied", ref);
        // Record the referral for the referrer (simulated — in production this would be server-side)
        // Show welcome banner to the new user
        setTimeout(() => {
          Alert.alert(
            "🎁 You were invited!",
            `A friend shared TutorSnap with you.\n\nYour 14-day free trial starts now — enjoy unlimited solves, quizzes, and AI tutoring!`,
            [{ text: "Start Learning 🚀", style: "default" }]
          );
        }, 2000);
      } catch { /* non-critical */ }
    };
    // Check the URL that launched the app
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    // Listen for URLs while the app is open
    const sub = Linking.addEventListener("url", (e) => handleUrl(e.url));
    return () => sub.remove();
  }, []);

  // Handle notification taps — route by data payload
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.slotId) {
        // Tapped a study planner notification — open the planner
        router.push("/study-planner" as any);
      } else if (data?.type === "streak_alert" || data?.type === "weekly_report") {
        // Tapped a streak alert or weekly progress report — go to Progress
        router.push("/progress" as any);
      } else if (data?.type === "homework_reminder" || data?.problemId) {
        // Tapped a homework reminder (by type or by problemId payload) — go to Classroom
        router.push("/(tabs)/classroom" as any);
      } else if (data?.screen === "/refer" || data?.screen === "refer" || data?.type === "affiliate_digest") {
        // Tapped an affiliate / referral notification — open the Refer screen
        router.push("/refer" as any);
      } else if (data?.screen === "whats_new" || data?.type === "update") {
        // Tapped an "update available" or "what's new" notification — open Settings scrolled to What's New
        router.push({ pathname: "/settings", params: { scrollTo: "whats_new" } } as any);
      } else if (data?.screen === "settings") {
        router.push("/settings" as any);
      } else if (data?.screen === "chat-history" || data?.type === "session_summary") {
        // Tapped a session summary notification — open the chat sessions list
        router.push("/(tabs)/chat" as any);
      }
    });
    return () => sub.remove();
  }, [router]);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const { updateAvailable, updateInfo, forceUpdate, dismiss } = useUpdateCheck();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
          <OfflineBanner />
          <UpdatePromptModal
            visible={updateAvailable}
            updateInfo={updateInfo}
            forceUpdate={forceUpdate}
            onDismiss={dismiss}
          />
          <Stack screenOptions={{
            headerShown: false,
          }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="onboarding"
              options={{
                presentation: "fullScreenModal",
                animation: "fade",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="flashcards"
              options={{
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="solution"
              options={{
                presentation: "card",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="progress"
              options={{
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="bookmarks"
              options={{
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="quiz"
              options={{
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="classroom"
              options={{
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="challenge"
              options={{
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="study-planner"
              options={{
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="pomodoro"
              options={{
                presentation: "fullScreenModal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="leaderboard"
              options={{
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen name="oauth/callback" />
            <Stack.Screen
              name="notification-center"
              options={{
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="feedback"
              options={{
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="report-bug"
              options={{
                presentation: "card",
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="legal"
              options={{
                presentation: "card",
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="faq"
              options={{
                presentation: "card",
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="quiz-history"
              options={{
                presentation: "card",
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="quiz-history-detail"
              options={{
                presentation: "card",
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="chat-history"
              options={{
                presentation: "card",
                animation: "slide_from_right",
                headerShown: false,
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="paywall"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                gestureEnabled: true,
                gestureDirection: "vertical",
              }}
            />
            <Stack.Screen
              name="premium-welcome"
              options={{
                presentation: "fullScreenModal",
                animation: "fade",
                gestureEnabled: false,
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="refer"
              options={{
                presentation: "card",
                animation: "slide_from_right",
                headerShown: false,
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="daily-challenge"
              options={{
                presentation: "card",
                animation: "slide_from_right",
                headerShown: false,
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="appearance-settings"
              options={{
                presentation: "card",
                animation: "slide_from_right",
                headerShown: false,
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
          </Stack>
          <StatusBar style="auto" />
          </QueryClientProvider>
        </trpc.Provider>
      </AuthProvider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";
  if (shouldOverrideSafeArea) {
    return (
      <AppearanceProvider>
      <FontSizeProvider>
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
      </FontSizeProvider>
      </AppearanceProvider>
    );
  }
  return (
    <AppearanceProvider>
    <FontSizeProvider>
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
    </FontSizeProvider>
    </AppearanceProvider>
  );
}
