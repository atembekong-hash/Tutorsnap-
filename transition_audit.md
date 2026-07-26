# Onboarding Transition Audit
Date: 2026-07-26
Restored checkpoint: a3d18f69

## Goal
Portal-burst exit on onboarding.tsx + staggered entry on index.tsx.

## Files to touch
- NEW: hooks/use-onboarding-transition.ts
- EDIT: app/onboarding.tsx  (exit wiring)
- EDIT: app/(tabs)/index.tsx  (entry wiring)

## onboarding.tsx — key facts (read fresh)
- Root tag: `<Animated.View style={[styles.gradientRoot, { backgroundColor: colors.background }, fadeStyle]}>`
- Closing tag: `</Animated.View>` (just before final `);`)
- finishOnboarding → router.replace("/(tabs)")
- finishOnboardingAndShowPaywall → router.replace("/(tabs)") + setTimeout push /paywall
- Imports: react-native-reanimated NOT yet imported as default

## index.tsx — key facts
- ReAnimated already imported as: `import ReAnimated, { ... } from "react-native-reanimated";`
- useLocalSearchParams NOT yet imported
- Header section starts at: `{/* Header — Row 1: app name + action icons */}`
- Header View: `<View style={styles.header}>`
- Header closes at line ~1109: `</View>` (the styles.header View)

## Mitigation rules
1. One phase = one file touched
2. Checkpoint between phases
3. No tsc --noEmit (too heavy — causes sandbox reset)
4. Verify via Metro log tail only
5. Screenshots after each phase
