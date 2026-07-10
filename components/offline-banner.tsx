/**
 * OfflineBanner — a subtle animated banner that slides down from the top
 * when the device loses internet access, and slides back up when reconnected.
 */
import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, Platform } from "react-native";
import { useNetworkStatus } from "@/hooks/use-network-status";

export function OfflineBanner() {
  const { isOnline, isChecking } = useNetworkStatus();
  const slideY = useRef(new Animated.Value(-48)).current;
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (isChecking) return;

    if (!isOnline) {
      wasOfflineRef.current = true;
      Animated.spring(slideY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        useNativeDriver: true,
      }).start();
    } else if (wasOfflineRef.current) {
      // Only animate hide if we were previously offline (avoid initial hide animation)
      Animated.timing(slideY, {
        toValue: -48,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        wasOfflineRef.current = false;
      });
    }
  }, [isOnline, isChecking, slideY]);

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideY }] },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.text}>No internet connection</Text>
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
    backgroundColor: "#1a1a2e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 14 : 10,
    elevation: 10,
    ...Platform.select({
      native: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      web: { boxShadow: "0 2px 6px rgba(0,0,0,0.25)" },
    }),
  },
  icon: {
    fontSize: 14,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
