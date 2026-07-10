# Round 22 Full Audit Findings

## Files that failed to scan (tab-route paths with parentheses)
Need to read these directly:
- app/(tabs)/index.tsx
- app/(tabs)/chat.tsx
- app/(tabs)/scan.tsx
- app/(tabs)/practice.tsx
- app/(tabs)/history.tsx
- app/(tabs)/classroom.tsx (tab version)
- app/(tabs)/_layout.tsx

## HIGH severity files
None reported as HIGH.

## MEDIUM severity files and key issues

### app/onboarding.tsx
- VISUAL: Hardcoded "#FFFFFF" in checkText (line 273) and ctaText (line 292) — breaks dark mode
- CODE: StyleSheet defined inside component scope (line 207) — moves on every render
- ACCESSIBILITY: Missing accessibilityLabel on Skip, category, Next/Get Started buttons

### app/solution.tsx  
- FUNCTIONAL: 5 catch blocks silently swallow errors (lines 194, 208, 245, 295, 565)
- CODE: Excessive non-null assertions (!) throughout, index used as key (line 498)
- VISUAL: Hardcoded colors in buildShareHtml and IconSymbol (lines 159-168, 657-658)

### app/quiz.tsx
- CODE: Massive number of hardcoded "#fff" colors in StyleSheet (lines 56-900+) — these are subject badge background text colors, likely intentional white-on-color but should use theme token
- ACCESSIBILITY: Missing accessibilityLabel on answer option buttons (lines 179, 183)
- FUNCTIONAL: Empty catch blocks for history/bonus saves (lines 314, 317)

### app/flashcards.tsx
- FUNCTIONAL: handleExportPDF catch block may silently fail
- VISUAL: Some hardcoded colors

### app/bookmarks.tsx
- ACCESSIBILITY: Missing accessibilityLabel on delete/bookmark buttons
- CODE: Some unsafe null access

### app/progress.tsx
- VISUAL: Hardcoded colors for progress bar segments
- ACCESSIBILITY: Missing labels on interactive elements

### app/settings.tsx
- FUNCTIONAL: Several Linking.openURL calls without proper error handling shown to user
- VISUAL: Some hardcoded colors

### app/leaderboard.tsx
- CODE: parseInt without radix (already fixed in Round 19)
- ACCESSIBILITY: Missing labels on friend action buttons

### app/study-planner.tsx
- FUNCTIONAL: Subject sub-modal uses old sibling pattern (same bug as subject-picker before fix)
- VISUAL: Some hardcoded colors

### app/pomodoro.tsx
- FUNCTIONAL: Timer state may not persist correctly on app background
- VISUAL: Some hardcoded colors

### app/challenge.tsx
- FUNCTIONAL: Missing error state for challenge generation failure

### app/quiz-history.tsx
- VISUAL: Some hardcoded colors
- ACCESSIBILITY: Missing labels

### app/notification-center.tsx
- FUNCTIONAL: Mark all as read may not handle errors

### app/feedback.tsx
- FUNCTIONAL: Form submission error not shown to user

### app/report-bug.tsx
- FUNCTIONAL: Form submission error not shown to user

### app/faq.tsx
- VISUAL: Hardcoded colors in accordion

### app/legal.tsx
- VISUAL: Hardcoded colors

### app/classroom.tsx (root, not tab)
- Generally clean from Round 19 fixes

## Components

### components/cheat-sheet-bottom-sheet.tsx - CLEAN
### components/subject-picker.tsx - CLEAN (just fixed)
### components/ai-response-renderer.tsx - CLEAN
### components/math-keyboard.tsx - Some hardcoded colors
### components/voice-button.tsx - CLEAN
### components/update-prompt-modal.tsx - CLEAN
### components/offline-banner.tsx - CLEAN
### components/weekly-goals-card.tsx - Some hardcoded colors
### components/badge-unlock-modal.tsx - Some hardcoded colors
### components/streak-freeze-card.tsx - CLEAN
### components/streak-shield-card.tsx - CLEAN
### components/study-tip-card.tsx - CLEAN
### components/today-study-widget.tsx - Some hardcoded colors
### components/almost-there-banner.tsx - CLEAN
### components/subject-ring.tsx - CLEAN

## Priority Fix List

### P1 - Functional/Breaking
1. study-planner.tsx: Subject sub-modal uses old sibling pattern → fix to absolute positioning
2. onboarding.tsx: Hardcoded "#FFFFFF" text breaks dark mode
3. solution.tsx: Silent catch blocks hide errors from user
4. challenge.tsx: Missing error state

### P2 - Code Quality  
1. quiz.tsx: All those "#fff" in StyleSheet — check if intentional (white text on colored badges)
2. solution.tsx: Non-null assertions, index as key
3. onboarding.tsx: StyleSheet inside component

### P3 - Accessibility
1. onboarding.tsx: Missing accessibilityLabel on all interactive elements
2. quiz.tsx: Missing accessibilityLabel on answer buttons
3. leaderboard.tsx: Missing labels on friend buttons
4. quiz-history.tsx: Missing labels

### P4 - Visual
1. Various hardcoded colors that should use theme tokens
