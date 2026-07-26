# v1.8.9 Audit — Skip Animation + Tab Entry Animations

## Current checkpoint: f33d4356

## Feature 1: Skip button animation (onboarding.tsx)
- Target file: app/onboarding.tsx
- The skip button is a TouchableOpacity with onPress={() => handleSkip()}
- handleSkip() calls finishOnboarding() which calls startExit(router)
- Plan: Add a Reanimated shared value `skipBtnScale` and `skipBtnOpacity`
  - On press: animate scale 1→0.88 + opacity 1→0 over 120ms, THEN call startExit
  - Use `withTiming` + callback to chain the exit
  - Keep the button as TouchableOpacity but wrap it in Reanimated.View with the animated style
  - No new hook needed — all inline in onboarding.tsx

## Feature 3: Tab entry animations (scan, practice, history, chat)
- Target files:
  - app/(tabs)/scan.tsx
  - app/(tabs)/practice.tsx  
  - app/(tabs)/history.tsx
  - app/(tabs)/chat.tsx
- Hook to use: hooks/use-onboarding-transition.ts already exports useOnboardingEntry
- Pattern from index.tsx:
  - Import useOnboardingEntry from "@/hooks/use-onboarding-transition"
  - Import useLocalSearchParams from "expo-router"
  - const { from } = useLocalSearchParams<{ from?: string }>()
  - const { staggeredStyles } = useOnboardingEntry(from === "onboarding")
  - Wrap 3-5 major sections in Reanimated.View with staggeredStyles[0..N]
- IMPORTANT: Only wrap top-level sections, never individual list items

## Mitigation rules
1. One file at a time
2. Checkpoint after each feature
3. No tsc --noEmit (too memory-heavy) — rely on Metro bundler error log instead
4. Read each file fresh before editing
5. Screenshot after each checkpoint
