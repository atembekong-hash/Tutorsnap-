/**
 * Redeem Referral Code Screen
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { redeemReferralCode } from "@/lib/rewards";
import { notifyReferralSuccess } from "@/lib/achievement-notifications";
import { useScreenTransition } from "@/hooks/use-screen-transition";

export default function RedeemCodeScreen() {
  const colors = useColors();
  const { fadeStyle: animatedStyle } = useScreenTransition();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      Alert.alert("Error", "Please enter a referral code");
      return;
    }

    setLoading(true);
    H.impactLight();

    try {
      const result = await redeemReferralCode(code.trim());
      
      if (result.success) {
        H.notificationSuccess();
        await notifyReferralSuccess(7);
        Alert.alert("Success!", result.message, [
          {
            text: "View Rewards",
            onPress: () => router.push("/rewards" as any),
          },
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ]);
        setCode("");
      } else {
        H.notificationError();
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      H.notificationError();
      Alert.alert("Error", "Failed to redeem code. Please try again.");
      console.warn("Redemption error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScreenContainer className="p-6">
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <TouchableOpacity accessibilityLabel="Go back" accessibilityHint="Returns to the previous screen" accessibilityRole="button" onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
              <IconSymbol size={24} name="chevron.left" color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.foreground }]}>Redeem Code</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Enter a referral code from a friend to earn free days
          </Text>
        </View>

        {/* Info Card */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: `${colors.primary}10`,
              borderColor: colors.primary,
            },
          ]}
        >
          <IconSymbol size={24} name="info.circle.fill" color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Redeeming a friend's referral code gives you 7 free days of TutorSnap Premium instantly. No credit card required. Days are added to your account immediately after redemption.
          </Text>
        </View>

        {/* Input Section */}
        <View style={{ marginTop: 24, gap: 12 }}>
          <Text style={[styles.label, { color: colors.foreground }]}>Referral Code</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Enter code (e.g., REF1234ABC)"
            placeholderTextColor={colors.muted}
            value={code}
            onChangeText={setCode}
            editable={!loading}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleRedeem}
          />
        </View>

        {/* Redeem Button */}
        <TouchableOpacity
          onPress={handleRedeem}
          disabled={loading}
          style={[
            styles.redeemBtn,
            {
              backgroundColor: colors.primary,
              opacity: loading ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[styles.redeemBtnText, { color: "#FFFFFF" }]}>
            {loading ? "Redeeming..." : "Redeem Code"}
          </Text>
        </TouchableOpacity>

        {/* Help Text */}
        <View style={{ marginTop: 32, gap: 8 }}>
          <Text style={[styles.helpTitle, { color: colors.foreground }]}>How it works</Text>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>1</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.foreground, flex: 1 }]}>
                Ask a friend who uses TutorSnap for their unique referral code. You can find yours in Settings under "Invite Friends".
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>2</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.foreground, flex: 1 }]}>
                Type or paste the 8-character code into the field above. Codes are not case-sensitive.
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>3</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.foreground, flex: 1 }]}>
                Tap "Redeem Code" and your 7 free Premium days are added to your account immediately.
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>4</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.foreground, flex: 1 }]}>
                Your friend also earns free days as a thank-you for referring you. Everyone wins!
              </Text>
            </View>
          </View>
        </View>

        {/* Rules & FAQ */}
        <View style={{ marginTop: 28, gap: 8 }}>
          <Text style={[styles.helpTitle, { color: colors.foreground }]}>Good to know</Text>
          <View style={{ gap: 10 }}>
            {[
              "Each referral code can only be redeemed once per account.",
              "You can redeem codes from multiple friends to stack up free days.",
              "Codes expire 90 days after they are generated by your friend.",
              "Redeemed days are added to your pending balance and applied at your next renewal.",
              "You cannot redeem your own referral code.",
              "If a code is invalid or expired, contact support at support@tutorsnapai.tech.",
            ].map((rule, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <Text style={{ color: colors.primary, fontWeight: "700", marginTop: 1 }}>•</Text>
                <Text style={[styles.stepText, { color: colors.muted, flex: 1 }]}>{rule}</Text>
              </View>
            ))}
          </View>
          </View>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  redeemBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  redeemBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 13,
    fontWeight: "500",
    paddingTop: 2,
  },
});
