/**
 * OfflineBanner — animated banner that slides down from the top when the device
 * loses internet access, and briefly shows "Back online ✓" when reconnected.
 */
import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, StyleSheet, Platform, View } from "react-native";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useColors } from "@/hooks/use-colors";

type BannerState = "hidden" | "offline" | "back-online";

export function OfflineBanner() {
  const { isOnline, isChecking } = useNetworkStatus();
  const colors = useColors();
  const slideY = useRef(new Animated.Value(-56)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [bannerState, setBannerState] = useState<BannerState>("hidden");
  const wasOfflineRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isChecking) return;

    if (!isOnline) {
      // Show offline banner
      wasOfflineRef.current = true;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setBannerState("offline");
      opacity.setValue(1);
      Animated.spring(slideY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        useNativeDriver: true,
      }).start();
    } else if (wasOfflineRef.current) {
      // Show "Back online" briefly, then hide
      setBannerState("back-online");
      opacity.setValue(1);
      Animated.spring(slideY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        useNativeDriver: true,
      }).start();

      hideTimerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(slideY, {
            toValue: -56,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setBannerState("hidden");
          wasOfflineRef.current = false;
        });
      }, 2200);
    }

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isOnline, isChecking]);

  if (bannerState === "hidden") return null;

  const isBackOnline = bannerState === "back-online";

  // Offline: dark navy-ish using surface+foreground blend; Online: success green
  // We use explicit dark values so the banner is always high-contrast regardless of app theme
  const offlineBg = "#1C1C2E";
  const onlineBg = colors.success;

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: isBackOnline ? onlineBg : offlineBg },
        { transform: [{ translateY: slideY }], opacity },
      ]}
      pointerEvents="none"
    >
      <View style={[
        styles.dot,
        { backgroundColor: isBackOnline ? "#FFFFFF" : colors.error },
      ]} />
      <Text style={styles.text}>
        {isBackOnline ? "Back online" : "No internet connection"}
      </Text>
      {isBackOnline && <Text style={styles.checkmark}>✓</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 34,
    paddingBottom: 12,
    elevation: 10,
    ...Platform.select({
      native: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.3)" },
    }),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
