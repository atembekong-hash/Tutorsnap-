/**
 * Auth Screen
 * Sign-in with Google, Apple, or Email OTP
 */

import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { setUserInfo, setSessionToken, setAuthTokens } from "@/lib/_core/auth-enhanced";
import { startTokenRefreshTimer } from "@/lib/token-refresh";
import { validateOAuthCredentials } from "@/lib/oauth-service";
import { sendEmailOtp, verifyEmailOtp } from "@/lib/email-auth";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DotsLoader } from "@/components/skeleton";

async function getPostAuthRoute(): Promise<string> {
  const onboardingDone = await AsyncStorage.getItem("@tutorsnap/onboardingDone");
  return onboardingDone ? "/(tabs)" : "/onboarding";
}

type EmailStep = "idle" | "enterEmail" | "enterCode";

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const router = useRouter();
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email OTP state
  const [emailStep, setEmailStep] = useState<EmailStep>("idle");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null); // shown in dev builds
  const emailRef = useRef<TextInput>(null);
  const otpRef = useRef<TextInput>(null);

  // ── Shared post-auth handler ─────────────────────────────────────────────
  const finaliseSignIn = async (user: {
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
    profilePhoto?: string | null;
    loginMethod: string | null;
  }, idToken: string) => {
    await setUserInfo({
      id: user.id,
      openId: user.openId,
      name: user.name,
      email: user.email,
      profilePhoto: user.profilePhoto ?? null,
      loginMethod: user.loginMethod,
      lastSignedIn: new Date(),
    });
    await setSessionToken(idToken);
    await setAuthTokens({
      accessToken: idToken,
      refreshToken: idToken,
      expiresAt: Date.now() + 60 * 60 * 1000,
      refreshExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    startTokenRefreshTimer();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAuthSuccess?.();
    const route = await getPostAuthRoute();
    router.replace(route as any);
  };

  // ── Google Sign-In ───────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      setEmailStep("idle");
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { signInWithGoogle } = await import("@/lib/google-signin");
      const credentials = await signInWithGoogle();
      if (!credentials) {
        setError("Google Sign-In cancelled");
        return;
      }

      const result = await validateOAuthCredentials(credentials);
      if (result.success && result.user) {
        await finaliseSignIn(result.user, credentials.idToken);
      } else {
        setError(result.error || "Google Sign-In failed");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // ── Apple Sign-In ────────────────────────────────────────────────────────
  const handleAppleSignIn = async () => {
    try {
      if (Platform.OS !== "ios") {
        setError("Apple Sign-In is only available on iOS");
        return;
      }
      setLoading(true);
      setError(null);
      setEmailStep("idle");
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { signInWithApple } = await import("@/lib/apple-signin");
      const credentials = await signInWithApple();
      if (!credentials) {
        setError("Apple Sign-In cancelled");
        return;
      }

      const result = await validateOAuthCredentials(credentials);
      if (result.success && result.user) {
        await finaliseSignIn(result.user, credentials.idToken);
      } else {
        setError(result.error || "Apple Sign-In failed");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // ── Email: show email input ──────────────────────────────────────────────
  const handleEmailPress = () => {
    setEmailStep("enterEmail");
    setError(null);
    setEmail("");
    setOtp("");
    setDevCode(null);
    setTimeout(() => emailRef.current?.focus(), 150);
  };

  // ── Email: send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await sendEmailOtp(trimmed);
      if (result.success) {
        setEmailStep("enterCode");
        if (result.devCode) {
          setDevCode(result.devCode); // Show in dev builds
        }
        setTimeout(() => otpRef.current?.focus(), 150);
      } else {
        setError(result.error || "Failed to send code");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  // ── Email: verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await verifyEmailOtp(email.trim().toLowerCase(), otp);
      if (result.success && result.user) {
        // Use email as a synthetic "token" for local auth storage
        const syntheticToken = `email:${result.user.openId}:${Date.now()}`;
        await finaliseSignIn(result.user, syntheticToken);
      } else {
        setError(result.error || "Invalid code");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setEmailStep("idle");
    setError(null);
    setOtp("");
    setDevCode(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>TutorSnap</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                Your AI tutor for math, science, and more
              </Text>
            </View>

            {/* Sign-In Section */}
            <View style={styles.signInSection}>
              {/* Error Message */}
              {error ? (
                <View style={[styles.errorBox, { backgroundColor: `${colors.error}18`, borderColor: colors.error }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              ) : null}

              {/* Dev OTP hint */}
              {devCode ? (
                <View style={[styles.devBox, { backgroundColor: `${colors.success}18`, borderColor: colors.success }]}>
                  <Text style={[styles.devText, { color: colors.success }]}>
                    Dev build — your code is: {devCode}
                  </Text>
                </View>
              ) : null}

              {/* ── Email flow ── */}
              {emailStep === "enterEmail" ? (
                <View style={styles.emailForm}>
                  <Text style={[styles.emailLabel, { color: colors.foreground }]}>Enter your email</Text>
                  <TextInput
                    ref={emailRef}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                  />
                  <Pressable
                    onPress={handleSendOtp}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                  >
                    {loading
                      ? <DotsLoader color="#fff" />
                      : <Text style={styles.primaryBtnText}>Send Code</Text>
                    }
                  </Pressable>
                  <Pressable onPress={handleBack} style={styles.backBtn}>
                    <Text style={[styles.backBtnText, { color: colors.muted }]}>← Back</Text>
                  </Pressable>
                </View>
              ) : emailStep === "enterCode" ? (
                <View style={styles.emailForm}>
                  <Text style={[styles.emailLabel, { color: colors.foreground }]}>
                    Enter the 6-digit code sent to
                  </Text>
                  <Text style={[styles.emailHighlight, { color: colors.primary }]}>{email}</Text>
                  <TextInput
                    ref={otpRef}
                    value={otp}
                    onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    maxLength={6}
                    onSubmitEditing={handleVerifyOtp}
                    style={[styles.otpInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                  />
                  <Pressable
                    onPress={handleVerifyOtp}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                  >
                    {loading
                      ? <DotsLoader color="#fff" />
                      : <Text style={styles.primaryBtnText}>Verify & Sign In</Text>
                    }
                  </Pressable>
                  <Pressable onPress={handleSendOtp} disabled={loading} style={styles.backBtn}>
                    <Text style={[styles.backBtnText, { color: colors.muted }]}>Resend code</Text>
                  </Pressable>
                  <Pressable onPress={handleBack} style={styles.backBtn}>
                    <Text style={[styles.backBtnText, { color: colors.muted }]}>← Change email</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* Google Sign-In Button */}
                  <Pressable
                    onPress={handleGoogleSignIn}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.oauthBtn,
                      { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                  >
                    {loading
                      ? <DotsLoader color={colors.primary} />
                      : <Text style={styles.oauthIcon}>🔵</Text>
                    }
                    <Text style={[styles.oauthBtnText, { color: colors.foreground }]}>
                      {loading ? "Signing in..." : "Continue with Google"}
                    </Text>
                  </Pressable>

                  {/* Apple Sign-In Button (iOS only) */}
                  {Platform.OS === "ios" && (
                    <Pressable
                      onPress={handleAppleSignIn}
                      disabled={loading}
                      style={({ pressed }) => [
                        styles.oauthBtn,
                        { borderColor: colors.border, backgroundColor: colors.foreground, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                      ]}
                    >
                      {loading
                        ? <DotsLoader color={colors.background} />
                        : <Text style={styles.oauthIcon}>🍎</Text>
                      }
                      <Text style={[styles.oauthBtnText, { color: colors.background }]}>
                        {loading ? "Signing in..." : "Continue with Apple"}
                      </Text>
                    </Pressable>
                  )}

                  {/* Divider */}
                  <View style={styles.divider}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.dividerText, { color: colors.muted }]}>or</Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  </View>

                  {/* Email Sign-In Button */}
                  <Pressable
                    onPress={handleEmailPress}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.oauthBtn,
                      { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                  >
                    <Text style={styles.oauthIcon}>✉️</Text>
                    <Text style={[styles.oauthBtnText, { color: colors.foreground }]}>
                      Continue with Email
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.muted }]}>
                By signing in, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 32 },
  header: { gap: 8, alignItems: "center" },
  title: { fontSize: 32, fontWeight: "700" },
  subtitle: { fontSize: 15, textAlign: "center" },
  signInSection: { gap: 12 },
  errorBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13 },
  devBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  devText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  oauthBtn: { borderWidth: 1, borderRadius: 10, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  oauthIcon: { fontSize: 20 },
  oauthBtnText: { fontSize: 15, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  emailForm: { gap: 10 },
  emailLabel: { fontSize: 15, fontWeight: "600" },
  emailHighlight: { fontSize: 14, fontWeight: "500" },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15 },
  otpInput: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 24, fontWeight: "700", textAlign: "center", letterSpacing: 8 },
  primaryBtn: { borderRadius: 10, padding: 14, alignItems: "center", justifyContent: "center", minHeight: 50 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  backBtn: { alignItems: "center", paddingVertical: 8 },
  backBtnText: { fontSize: 14 },
  footer: { alignItems: "center" },
  footerText: { fontSize: 11, textAlign: "center" },
});
