import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as H from "@/lib/haptics";
import { useRef } from "react";
import { Animated } from "react-native";

export function HapticTab(props: BottomTabBarButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (ev: Parameters<NonNullable<BottomTabBarButtonProps["onPressIn"]>>[0]) => {
    if (process.env.EXPO_OS === "ios") {
      H.impactLight();
    }
    Animated.spring(scale, {
      toValue: 0.88,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
    props.onPressIn?.(ev);
  };

  const handlePressOut = (ev: Parameters<NonNullable<BottomTabBarButtonProps["onPressOut"]>>[0]) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 18,
    }).start();
    props.onPressOut?.(ev);
  };

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <PlatformPressable
        {...props}
        style={[{ flex: 1 }, typeof props.style === "object" ? props.style : undefined]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      />
    </Animated.View>
  );
}
