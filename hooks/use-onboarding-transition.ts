/**
 * useOnboardingExit  — used in onboarding.tsx
 * useOnboardingEntry — used in index.tsx
 *
 * Portal-burst exit: the onboarding screen scales up + fades out while a
 * white bloom overlay flashes, giving a "stepping through a portal" feel.
 *
 * Staggered entry: the dashboard fades in section-by-section with a 70 ms
 * stagger between each of the 5 content sections.
 *
 * All animations run on the native thread via Reanimated 4 shared values.
 * No hooks are called inside loops or conditionals (rules-of-hooks safe).
 */
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const PORTAL_DURATION = 380;
const BLOOM_PEAK      = 160;
const BLOOM_FADE      = 220;
const ENTRY_FADE      = 320;
const STAGGER_MS      = 70;
const SECTION_DUR     = 350;
const SECTION_OFFSET  = 28;

// ─── EXIT (onboarding.tsx) ────────────────────────────────────────────────────

export function useOnboardingExit(bloomColor = "#ffffff") {
  const portalScale   = useSharedValue(1);
  const portalOpacity = useSharedValue(1);
  const bloomOpacity  = useSharedValue(0);

  const portalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: portalScale.value }],
    opacity: portalOpacity.value,
  }));

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloomOpacity.value,
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: bloomColor,
    zIndex: 999,
  }));

  /**
   * Fire the portal-burst exit animation.
   * `onDone` is called on the JS thread when the fade-out completes.
   * A Success haptic fires at the bloom peak (~160ms) for tactile punctuation.
   */
  const triggerSuccessHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const startExit = (onDone: () => void) => {
    "worklet";
    // Haptic at bloom peak (160ms) — fired on JS thread via runOnJS
    bloomOpacity.value = withSequence(
      withTiming(1, {
        duration: BLOOM_PEAK,
        easing: Easing.out(Easing.quad),
      }, () => { runOnJS(triggerSuccessHaptic)(); }),
      withTiming(0, { duration: BLOOM_FADE, easing: Easing.in(Easing.quad) }),
    );
    // Screen scales up slightly as it fades out
    portalScale.value = withTiming(1.12, {
      duration: PORTAL_DURATION,
      easing: Easing.in(Easing.cubic),
    });
    portalOpacity.value = withTiming(
      0,
      { duration: PORTAL_DURATION, easing: Easing.in(Easing.cubic) },
      (finished) => { if (finished) runOnJS(onDone)(); },
    );
  };

  return { startExit, portalStyle, bloomStyle };
}

// ─── ENTRY (index.tsx) ────────────────────────────────────────────────────────

export function useOnboardingEntry() {
  // Background fade
  const bgOpacity = useSharedValue(0);

  // 5 section shared values — declared individually (no hooks in loops)
  const s0Op = useSharedValue(0);
  const s0Ty = useSharedValue(SECTION_OFFSET);
  const s1Op = useSharedValue(0);
  const s1Ty = useSharedValue(SECTION_OFFSET);
  const s2Op = useSharedValue(0);
  const s2Ty = useSharedValue(SECTION_OFFSET);
  const s3Op = useSharedValue(0);
  const s3Ty = useSharedValue(SECTION_OFFSET);
  const s4Op = useSharedValue(0);
  const s4Ty = useSharedValue(SECTION_OFFSET);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  const s0Style = useAnimatedStyle(() => ({
    opacity: s0Op.value,
    transform: [{ translateY: s0Ty.value }],
  }));
  const s1Style = useAnimatedStyle(() => ({
    opacity: s1Op.value,
    transform: [{ translateY: s1Ty.value }],
  }));
  const s2Style = useAnimatedStyle(() => ({
    opacity: s2Op.value,
    transform: [{ translateY: s2Ty.value }],
  }));
  const s3Style = useAnimatedStyle(() => ({
    opacity: s3Op.value,
    transform: [{ translateY: s3Ty.value }],
  }));
  const s4Style = useAnimatedStyle(() => ({
    opacity: s4Op.value,
    transform: [{ translateY: s4Ty.value }],
  }));

  // Tuple so consumers can index by section number
  const staggeredStyles = [s0Style, s1Style, s2Style, s3Style, s4Style] as const;

  const startEntry = () => {
    "worklet";
    bgOpacity.value = withTiming(1, { duration: ENTRY_FADE, easing: Easing.out(Easing.cubic) });

    s0Op.value = withTiming(1, { duration: SECTION_DUR, easing: Easing.out(Easing.cubic) });
    s0Ty.value = withTiming(0, { duration: SECTION_DUR, easing: Easing.out(Easing.cubic) });

    s1Op.value = withDelay(STAGGER_MS * 1, withTiming(1, { duration: SECTION_DUR, easing: Easing.out(Easing.cubic) }));
    s1Ty.value = withDelay(STAGGER_MS * 1, withTiming(0, { duration: SECTION_DUR, easing: Easing.out(Easing.cubic) }));

    s2Op.value = withDelay(STAGGER_MS * 2, withTiming(1, { duration: SECTION_DUR, easing: Easing.out(Easing.cubic) }));
    s2Ty.value = withDelay(STAGGER_MS * 2, withTiming(0, { duration: SECTION_DUR, easing: Easing.out(Easing.cubic) }));

    s3Op.value = withDelay(STAGGER_MS * 3, withTiming(1, { duration: SECTION_DUR, easing: Easing.out(Easing.cubic) }));
    s3Ty.value = withDelay(STAGGER_MS * 3, withTiming(0, { duration: SECTION_DUR, easing: Easing.out(Easing.cubic) }));

    s4Op.value = withDelay(STAGGER_MS * 4, withTiming(1, { duration: SECTION_DUR, easing: Easing.out(Easing.cubic) }));
    s4Ty.value = withDelay(STAGGER_MS * 4, withTiming(0, { duration: SECTION_DUR, easing: Easing.out(Easing.cubic) }));
  };

  return { startEntry, bgStyle, staggeredStyles };
}
