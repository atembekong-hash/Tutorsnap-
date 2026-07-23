/**
 * Profile Setup Screen
 * First-time user profile configuration
 */

import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import { setUserInfo } from "@/lib/_core/auth-enhanced";
import { useAuth } from "@/lib/auth-context";
import * as Haptics from "expo-haptics";
import { DotsLoader } from "@/components/skeleton";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    try {
      if (!name.trim()) {
        setError("Please enter your name");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      setLoading(true);
      setError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (!user) {
        setError("User not found");
        return;
      }

      // Update user profile
      const updatedUser = {
        ...user,
        name: name.trim(),
        email: email.trim() || user.email,
        lastSignedIn: new Date(),
      };

      await setUserInfo(updatedUser);
      await refreshUser();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to home
      router.replace("/(tabs)");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Profile setup failed";
      setError(message);
      console.error("[ProfileSetup] Error:", err);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });
  return (
    <ScreenContainer containerClassName="bg-background">
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-between px-6 py-8">
          {/* Header */}
          <View className="gap-4">
            <View className="items-center gap-2">
              <Text className="text-3xl font-bold text-foreground">Welcome to TutorSnap! 👋</Text>
              <Text className="text-base text-muted text-center">
                Let's set up your profile to personalize your learning experience
              </Text>
            </View>
          </View>

          {/* Profile Form */}
          <View className="gap-6">
            {/* Error Message */}
            {error && (
              <View className="bg-error/10 border border-error rounded-lg p-4">
                <Text className="text-error text-sm">{error}</Text>
              </View>
            )}

            {/* Name Input */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Your Name</Text>
              <TextInput
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                editable={!loading}
                placeholderTextColor={colors.muted}
                className="bg-surface border border-border rounded-lg p-4 text-foreground"
                style={{
                  color: colors.foreground,
                }}
              />
            </View>

            {/* Email Input */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Email Address</Text>
              <TextInput
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                keyboardType="email-address"
                placeholderTextColor={colors.muted}
                className="bg-surface border border-border rounded-lg p-4 text-foreground"
                style={{
                  color: colors.foreground,
                }}
              />
              <Text className="text-xs text-muted">
                We'll use this to send you important updates and password recovery
              </Text>
            </View>

            {/* Continue Button */}
            <Pressable
              onPress={handleContinue}
              disabled={loading}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View className="bg-primary rounded-lg p-4 flex-row items-center justify-center gap-2">
                {loading ? (
                  <DotsLoader color={colors.background} />
                ) : null}
                <Text className="text-background font-semibold text-base">
                  {loading ? "Setting up..." : "Continue to TutorSnap"}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Footer */}
          <View className="gap-2 items-center">
            <Text className="text-muted text-xs text-center">
              You can update your profile anytime in Settings
            </Text>
          </View>
        </View>
      </ScrollView>
    
      </Animated.View></ScreenContainer>
  );
}
