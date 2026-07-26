/**
 * useAnimatedList
 *
 * Returns a helper that generates Reanimated `entering` animation props
 * for FlatList / ScrollView items, creating a staggered cascade effect.
 *
 * Usage in renderItem:
 * ```tsx
 * const { getEntering } = useAnimatedList();
 * // In renderItem:
 * <Animated.View entering={getEntering(index)}>
 *   <MyCard />
 * </Animated.View>
 * ```
 *
 * Features:
 * - Staggered FadeInDown with configurable delay per item
 * - Automatically disabled when reduceMotion is true (appearance setting)
 * - Caps stagger at maxItems so very long lists don't have huge delays
 * - Returns undefined (no animation) when reduceMotion is on
 */
import { useAppearance } from "@/lib/appearance-context";
import { FadeInDown } from "react-native-reanimated";

interface UseAnimatedListOptions {
  /** Delay between each item in ms. Default 50. */
  staggerMs?: number;
  /** Duration of each item's entrance. Default 300. */
  durationMs?: number;
  /** Maximum number of items that get a stagger delay. Items beyond this cap
   *  all use the same delay as item #maxItems. Default 20. */
  maxItems?: number;
  /** Initial vertical offset in px. Default 16. */
  initialTranslateY?: number;
}

export function useAnimatedList(options: UseAnimatedListOptions = {}) {
  const {
    staggerMs = 50,
    durationMs = 300,
    maxItems = 20,
    initialTranslateY = 16,
  } = options;

  const { settings } = useAppearance();
  const reduceMotion = settings.reduceMotion;

  /**
   * Returns the `entering` prop for an Animated.View at the given list index.
   * Returns undefined when reduceMotion is enabled so the view renders instantly.
   */
  function getEntering(index: number) {
    if (reduceMotion) return undefined;
    const cappedIndex = Math.min(index, maxItems);
    return FadeInDown.delay(cappedIndex * staggerMs)
      .duration(durationMs)
      .withInitialValues({ transform: [{ translateY: initialTranslateY }], opacity: 0 });
  }

  return { getEntering, reduceMotion };
}
