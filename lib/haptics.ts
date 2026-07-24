/**
 * Platform-safe haptics wrapper.
 * All haptic calls in the app MUST go through this module.
 * The wrapper guards against web environments where haptics are unavailable.
 */
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const isNative = Platform.OS !== "web";

 

export function impactLight(): void {
  if (isNative) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function impactMedium(): void {
  if (isNative) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function impactHeavy(): void {
  if (isNative) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export function notificationSuccess(): void {
  if (isNative) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function notificationError(): void {
  if (isNative) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

export function notificationWarning(): void {
  if (isNative) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

export function selectionFeedback(): void {
  if (isNative) void Haptics.selectionAsync();
}

/** Triple rapid-fire Light impacts at 80ms intervals — used for milestone confetti burst. */
export function celebrationBurst(): void {
  if (!isNative) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 80);
  setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 160);
}
