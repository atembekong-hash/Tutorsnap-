/**
 * Auth Screen
 * One-tap sign-in with Google and Apple
 */

import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import { setUserInfo, setSessionToken, setAuthTokens } from "@/lib/_core/auth-enhanced";
import { validateOAuthCredentials } from "@/lib/oauth-service";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function getPostAuthRoute(): Promise<string> {
  const onboardingDone = await AsyncStorage.getItem("@tutorsnap/onboardingDone");
  return onboardingDone ? "/(tabs)" : "/onboarding";
}

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const router = useRouter();
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Use real Google Sign-In
      const { signInWithGoogle } = await import("@/lib/google-signin");
      console.log("[Auth] Google Sign-In initiated");

      const credentials = await signInWithGoogle();
      if (!credentials) {
        setError("Google Sign-In cancelled");
        return;
      }

      const result = await validateOAuthCredentials(credentials);

      if (result.success && result.user) {
        await setUserInfo({
          id: result.user.id,
          openId: result.user.openId,
          name: result.user.name,
          email: result.user.email,
          profilePhoto: result.user.profilePhoto,
          loginMethod: result.user.loginMethod,
          lastSignedIn: new Date(),
        });

        await setSessionToken(credentials.idToken);
        // Also store as auth_token so isAuthenticated() returns true
        await setAuthTokens({
          accessToken: credentials.idToken,
          refreshToken: credentials.idToken,
          expiresAt: Date.now() + 60 * 60 * 1000,        // 1 hour
          refreshExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        onAuthSuccess?.();
        const route = await getPostAuthRoute();
        router.replace(route as any);
      } else {
        setError(result.error || "Google Sign-In failed");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      setError(message);
      console.error("[Auth] Google Sign-In error:", err);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      if (Platform.OS !== "ios") {
        setError("Apple Sign-In is only available on iOS");
        return;
      }

      setLoading(true);
      setError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Use real Apple Sign-In
      const { signInWithApple } = await import("@/lib/apple-signin");
      console.log("[Auth] Apple Sign-In initiated");

      const credentials = await signInWithApple();
      if (!credentials) {
        setError("Apple Sign-In cancelled");
        return;
      }

      const result = await validateOAuthCredentials(credentials);

      if (result.success && result.user) {
        await setUserInfo({
          id: result.user.id,
          openId: result.user.openId,
          name: result.user.name,
          email: result.user.email,
          profilePhoto: result.user.profilePhoto,
          loginMethod: result.user.loginMethod,
          lastSignedIn: new Date(),
        });

        await setSessionToken(credentials.idToken);
        // Also store as auth_token so isAuthenticated() returns true
        await setAuthTokens({
          accessToken: credentials.idToken,
          refreshToken: credentials.idToken,
          expiresAt: Date.now() + 60 * 60 * 1000,        // 1 hour
          refreshExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        onAuthSuccess?.();
        const route = await getPostAuthRoute();
        router.replace(route as any);
      } else {
        setError(result.error || "Apple Sign-In failed");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      setError(message);
      console.error("[Auth] Apple Sign-In error:", err);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-between px-6 py-8">
          {/* Header */}
          <View className="gap-4">
            <View className="items-center gap-2">
              <Text className="text-4xl font-bold text-foreground">TutorSnap</Text>
              <Text className="text-base text-muted text-center">
                Your AI tutor for math, science, and more
              </Text>
            </View>
          </View>

          {/* Sign-In Section */}
          <View className="gap-4">
            {/* Error Message */}
            {error && (
              <View className="bg-error/10 border border-error rounded-lg p-4">
                <Text className="text-error text-sm">{error}</Text>
              </View>
            )}

            {/* Google Sign-In Button */}
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View className="bg-white border border-border rounded-lg p-4 flex-row items-center justify-center gap-3">
                {loading ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text className="text-2xl">🔵</Text>
                )}
                <Text className="text-foreground font-semibold text-base">
                  {loading ? "Signing in..." : "Continue with Google"}
                </Text>
              </View>
            </Pressable>

            {/* Apple Sign-In Button (iOS only) */}
            {Platform.OS === "ios" && (
              <Pressable
                onPress={handleAppleSignIn}
                disabled={loading}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <View className="bg-foreground rounded-lg p-4 flex-row items-center justify-center gap-3">
                  {loading ? (
                    <ActivityIndicator color={colors.background} size="small" />
                  ) : (
                    <Text className="text-2xl">🍎</Text>
                  )}
                  <Text className="text-background font-semibold text-base">
                    {loading ? "Signing in..." : "Continue with Apple"}
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Divider */}
            <View className="flex-row items-center gap-3">
              <View className="flex-1 h-px bg-border" />
              <Text className="text-muted text-sm">or</Text>
              <View className="flex-1 h-px bg-border" />
            </View>

            {/* Email Sign-In Button (placeholder) */}
            <Pressable
              disabled={loading}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View className="border border-border rounded-lg p-4 flex-row items-center justify-center gap-3">
                <Text className="text-2xl">✉️</Text>
                <Text className="text-foreground font-semibold text-base">Continue with Email</Text>
              </View>
            </Pressable>
          </View>

          {/* Footer */}
          <View className="gap-2 items-center">
            <Text className="text-muted text-xs text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
