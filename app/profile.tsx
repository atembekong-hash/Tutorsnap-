/**
 * Profile Screen
 * View and edit user profile
 */

import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import { setUserInfo, logout } from "@/lib/_core/auth-enhanced";
import { useAuth } from "@/lib/auth-context";
import * as Haptics from "expo-haptics";

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      if (!name.trim()) {
        setError("Name cannot be empty");
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

      const updatedUser = {
        ...user,
        name: name.trim(),
        email: email.trim() || user.email,
        lastSignedIn: new Date(),
      };

      await setUserInfo(updatedUser);
      await refreshUser();
      setIsEditing(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
      console.error("[Profile] Save error:", err);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

              // In production, call backend API to delete account
              // For now, just logout
              await logout();
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              router.replace("/auth-screen");
            } catch (err) {
              console.error("[Profile] Delete error:", err);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await logout();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace("/auth-screen");
          } catch (err) {
            console.error("[Profile] Logout error:", err);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <Text className="text-foreground">Loading profile...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });
  return (
    <ScreenContainer containerClassName="bg-background">
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 gap-6 px-6 py-8">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">Profile</Text>
            <Text className="text-sm text-muted">Manage your account information</Text>
          </View>

          {/* Error Message */}
          {error && (
            <View className="bg-error/10 border border-error rounded-lg p-4">
              <Text className="text-error text-sm">{error}</Text>
            </View>
          )}

          {/* Profile Card */}
          <View className="bg-surface border border-border rounded-lg p-6 gap-4">
            {/* Name */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-muted">Name</Text>
              {isEditing ? (
                <TextInput
                  placeholder="Your name"
                  value={name}
                  onChangeText={setName}
                  editable={!loading}
                  placeholderTextColor={colors.muted}
                  className="bg-background border border-border rounded-lg p-3 text-foreground"
                  style={{ color: colors.foreground }}
                />
              ) : (
                <Text className="text-base font-medium text-foreground">{name}</Text>
              )}
            </View>

            {/* Email */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-muted">Email</Text>
              {isEditing ? (
                <TextInput
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                  keyboardType="email-address"
                  placeholderTextColor={colors.muted}
                  className="bg-background border border-border rounded-lg p-3 text-foreground"
                  style={{ color: colors.foreground }}
                />
              ) : (
                <Text className="text-base font-medium text-foreground">{email || "Not set"}</Text>
              )}
            </View>

            {/* Login Method */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-muted">Login Method</Text>
              <Text className="text-base font-medium text-foreground capitalize">
                {user.loginMethod || "Unknown"}
              </Text>
            </View>

            {/* Last Signed In */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-muted">Last Signed In</Text>
              <Text className="text-base font-medium text-foreground">
                {user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString() : "Never"}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            {isEditing ? (
              <>
                <Pressable
                  onPress={handleSaveProfile}
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
                      <ActivityIndicator color={colors.background} size="small" />
                    ) : null}
                    <Text className="text-background font-semibold text-base">
                      {loading ? "Saving..." : "Save Changes"}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setIsEditing(false);
                    setName(user.name || "");
                    setEmail(user.email || "");
                    setError(null);
                  }}
                  disabled={loading}
                >
                  <View className="border border-border rounded-lg p-4 flex-row items-center justify-center">
                    <Text className="text-foreground font-semibold text-base">Cancel</Text>
                  </View>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => setIsEditing(true)}
                disabled={loading}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <View className="bg-primary rounded-lg p-4 flex-row items-center justify-center">
                  <Text className="text-background font-semibold text-base">Edit Profile</Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* Danger Zone */}
          <View className="gap-3 border-t border-border pt-6">
            <Text className="text-sm font-semibold text-error">Danger Zone</Text>

            <Pressable
              onPress={handleLogout}
              disabled={loading}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View className="border border-border rounded-lg p-4 flex-row items-center justify-center">
                <Text className="text-foreground font-semibold text-base">Sign Out</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleDeleteAccount}
              disabled={loading}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View className="bg-error/10 border border-error rounded-lg p-4 flex-row items-center justify-center">
                <Text className="text-error font-semibold text-base">Delete Account</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    
      </Animated.View></ScreenContainer>
  );
}
