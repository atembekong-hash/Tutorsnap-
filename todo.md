# MathGenius AI - TODO

## Core Setup
- [x] Update theme colors (violet brand palette)
- [x] Update icon-symbol.tsx with all needed icons
- [x] Generate and set app logo/icon
- [x] Update app.config.ts branding

## Screens
- [x] Build Home/Solve screen with text input and subject filter chips
- [x] Build Camera Scan screen with image picker and camera
- [x] Build Solution screen with step-by-step display
- [x] Build History screen with past problems, search, filter
- [x] Build Practice screen with subject/difficulty selection and hints
- [x] Build AI Chat screen (AI Tutor)

## Backend & AI
- [x] Set up tRPC backend routes for math solving
- [x] Integrate LLM for math solving with structured JSON output
- [x] Integrate LLM for image-based math solving (vision)
- [x] Add AI practice problem generation with hints
- [x] Add AI chat/tutor endpoint

## Features
- [x] Add subject filter chips on solve screen
- [x] Add solution sharing functionality
- [x] Add copy answer to clipboard
- [x] Add AsyncStorage for history persistence
- [x] Add haptic feedback throughout
- [x] Add example problems on home screen
- [x] Add progressive hint reveal in practice
- [x] Add search and subject filter in history
- [x] Add solved count badge on home screen
- [x] 5-tab navigation with center camera FAB

## Quality
- [x] TypeScript errors: 0
- [x] expo-clipboard installed
- [x] expo-image-picker installed
- [x] All icon mappings complete

## New Features (Round 2)
- [x] Custom math keyboard component with symbols (∫, √, π, ², ³, ÷, ×, ≤, ≥, ≠, ∞, θ, Δ, Σ)
- [x] Toggle math keyboard on/off in solve screen
- [x] Streak tracking (daily solve streak counter)
- [x] Subject mastery progress bars per subject
- [x] Daily goal tracking (e.g., solve 3 problems/day)
- [x] Stats screen / progress section on home screen
- [x] Solution bookmarking (star/bookmark button on solution screen)
- [x] Bookmarks tab or section to view saved solutions
- [x] Bookmark indicator on history cards

## New Features (Round 4)
- [x] Subject-specific formula cheat sheet bottom sheet on Solve screen
- [x] Offline mode indicator banner and graceful AI feature disabling

## New Features (Round 5)
- [x] Extend cheat sheets: Biology, Chemistry (organic), Grammar
- [x] Copy/Share-as-Image on Solution screen
- [x] Timed Practice Quiz mode with AI questions and scoring
- [x] Quiz history saved to AsyncStorage with stats card on Practice screen
- [x] Configurable quiz length picker (3/5/10 questions)
- [x] Streak bonus on home screen for 80%+ quiz score
- [x] This Week section on home screen: 7-day activity grid, weekly quiz goal, progress ring
- [x] Subject mastery badges (Bronze/Silver/Gold) on Progress screen
- [x] AI study tip of the day card on home screen
- [x] Quiz history detail screen with View History button on Practice stats card
- [x] Badge unlock confetti/scale animation on first tier earn in mastery badges
- [x] Streak Shield — earn/spend shield to protect streak on missed days
- [x] Per-subject difficulty persistence — remember last difficulty per subject
