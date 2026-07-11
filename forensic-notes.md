# Forensic Audit Notes — UI Polish Pass

## Practice Tab (Reference Standard)
- `header`: paddingHorizontal 20, paddingTop 16, paddingBottom 8
- `section`: paddingHorizontal 16, marginTop 20
- `sectionLabel`: fontSize 12, fontWeight 700, letterSpacing 1, marginBottom 12
- `title`: fontSize 28, fontWeight 800, letterSpacing -0.5
- `subtitle`: fontSize 14, marginTop 4
- `generateBtn`: marginHorizontal 16, marginTop 20, padding 16, borderRadius 16 — full width
- `questionCard`: padding 20, borderRadius 20, borderWidth 1
- `questionText`: fontSize 17, lineHeight 26
- `answerText`: fontSize 20, fontWeight 800
- `difficultyCard`: flex 1 (equal width), padding 14, borderRadius 14
- `quizSection`: marginHorizontal 16, borderRadius 16, padding 16
- ScrollView: `contentContainerStyle={{ paddingBottom: 40 }}`
- NO sticky header — header is inside ScrollView

## Solve/Home Screen (index.tsx) — Issues Found
- Header is INSIDE ScrollView (lines 386-481) — GOOD, already scrolls
- ScrollView at line 862 — needs `contentContainerStyle` with paddingBottom
- Widget spacing issues:
  - goalBar: marginTop 12 (should be 16-20)
  - subjectRow: marginTop 16 (OK)
  - inputSection: marginTop 20 (OK)
  - solveBtn: marginTop 14 (should be 16)
  - featureRow: marginTop 20 (OK)
  - examplesSection: marginTop 24 (OK)
- Widget width inconsistency: 
  - goalBar, inputSection, solveBtn, featureRow all use marginHorizontal 16 — consistent
  - shieldToast, homeworkBanner have NO marginHorizontal — they go edge to edge
  - StreakShieldCard, StreakProtectionBanner, DailyChallengeCard, TodayStudyWidget, WeeklyGoalsCard, AlmostThereBanner, StudyTipCard — need to check if they have their own padding
- Header icons: bell (notification) → replace with clock (history)
- Feature cards (3-up row): flex:1 equal width — OK

## History Tab (history.tsx)
- Fixed header + fixed search/filter outside ScrollView — needs to move inside
- FlatList for cards — keep as is but ensure full scroll

## Chat Tab (chat.tsx)
- EXCEPTION: keep fixed header + pinned input bar
- FlatList messages — OK

## Settings (settings.tsx)
- Fixed nav bar outside ScrollView — keep fixed (nav bar is standard)
- Body already scrolls — OK

## Classroom Tab (classroom.tsx)
- Fixed header + tab strip
- Right-side dropdown menus overflow/cover tab bar
- Sort modal uses `justifyContent: "flex-end"` — OK
- Per-card action menus on right side need `bottom` anchor or upward opening

## Theme Provider (lib/theme-provider.tsx)
- Lines 50-63: defaults to `useSystemColorScheme() ?? "light"` for native
- Lines 77-90: falls back to systemScheme when nothing saved
- Lines 15-25: web uses matchMedia
- FIX: change fallback from "light" to "dark" and change web matchMedia default to "dark"

## Tab Bar (_layout.tsx)
- History tab at lines 80-86 — REMOVE from tab bar
- Add history icon to home screen header (replace bell icon)

## Dark Mode Default
- File: lib/theme-provider.tsx
- Change: `useSystemColorScheme() ?? "light"` → `"dark"` 
- Change: web getWebInitialScheme fallback → "dark"
- Change: AsyncStorage fallback → "dark"

## Screens needing scroll-with-header fix
All screens except chat.tsx need header inside ScrollView or use Animated header.
Screens with fixed headers:
- history.tsx — header + search bar outside FlatList
- settings.tsx — nav bar (keep fixed, standard pattern)
- progress.tsx — fixed header
- classroom.tsx — fixed header + tabs (complex, keep fixed)
- solution.tsx — fixed nav bar (keep fixed, standard)
- quiz.tsx — fixed header (keep fixed, timer must be visible)
- daily-challenge.tsx — fixed nav bar (keep fixed)

## Solve Page Widget Width Fix
- All top-level widgets in ScrollView need consistent marginHorizontal: 16
- shieldToast: add marginHorizontal 16
- homeworkBanner: add marginHorizontal 16  
- StreakShieldCard wrapper: check component
- StreakProtectionBanner wrapper: check component
- DailyChallengeCard: already has padding in dcStyles
- TodayStudyWidget: check component
- WeeklyGoalsCard: check component
