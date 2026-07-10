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

## New Features (Round 6)
- [x] Error boundary on home screen with friendly retry card
- [x] Offline mode indicator (persistent banner when device is offline)
- [x] App version display at bottom of Settings screen
- [x] Fix APK version to 1.1.0 and update android package to com.tutorsnap.app
- [x] Extend ErrorBoundary to all tab screens (Chat, History, Practice, Scan)
- [x] Add crash reporting via componentDidCatch persisted to AsyncStorage
- [x] Add What's New changelog card in Settings under ABOUT
- [x] How-To modal in Settings with step-by-step guide
- [x] About TutorSnap modal with version, platform info, and Rate App button
- [x] Preferred Subjects editor in Settings (saves to AsyncStorage)
- [x] Clear History row in Settings (with confirmation alert)
- [x] Reset All Progress row in Settings (with confirmation alert)
- [x] Share Progress row in Settings (via expo-sharing)
- [x] Text Size / Font Size preference in Settings (Small/Medium/Large/XL)
- [x] FontSizeProvider context wired to root layout
- [x] Rate TutorSnap row in Settings (expo-store-review)
- [x] Privacy Policy row in Settings (opens browser)
- [x] Terms of Service row in Settings (opens browser)
- [x] Flashcards link in Settings PROGRESS & DATA section
- [ ] Wire useFontSize into Chat screen
- [ ] Wire useFontSize into Solution screen
- [ ] Add Contact Support row in Settings ABOUT section
- [ ] Preferred Subjects pre-select in Practice tab
- [x] Wire useFontSize into Solution screen (all reading-heavy text scales with Text Size setting)
- [x] Wire useFontSize into Chat screen (all message text scales with Text Size setting)
- [x] Add Contact Support row in Settings ABOUT section (pre-filled mailto)
- [x] Preferred Subjects pre-select in Practice tab (SubjectPicker opens to preferred category, starred tabs)
- [x] Study Planner screen with weekly schedule, time slots, and local notification reminders
- [ ] Flashcard deck PDF export and sharing
- [x] AI chat history persistence (AsyncStorage, 50-message rolling window)
- [x] Study Planner today-widget card on home screen
- [x] Streak Shield/Freeze system in Progress screen
- [x] Push notifications for scheduled study reminders
- [x] Pomodoro timer for active Study Planner sessions
- [x] Streak leaderboard with shareable invite links
- [x] AI-generated similar practice problems on Solution screen

- [x] Dark mode consistency audit — fixed ErrorBoundary, OfflineBanner, StreakShieldCard, and home screen shield toast

- [x] Voice input microphone button on Solve screen
- [x] Dark mode toggle shortcut in home screen header
- [x] Auto-show BadgeUnlockModal when new badge earned on home screen

## Settings Pages (Round 7 — Full 14-Page Implementation)
- [x] Replace all Manus domain URLs with tutorsnapai.tech (privacy, terms, support email)
- [x] Notification Center screen — 7 toggles (daily reminder, streak alerts, badges, study reminders, weekly report, practice nudge, achievements), enable/disable all, permission banner
- [x] Feedback screen — star rating (1-5), category picker (6 types), message form, mailto to feedback@tutorsnapai.tech
- [x] Report a Bug screen — category (8 types), severity (4 levels), description, steps to reproduce, device info auto-filled, mailto to bugs@tutorsnapai.tech
- [x] Legal hub screen — links to Privacy Policy, Terms, Cookie Policy, Licenses, Community Guidelines, Consent Management, Data Deletion
- [x] Cookie Policy modal — full policy text about local storage
- [x] Open Source Licenses modal — 20 packages listed with version and license type
- [x] Community Guidelines modal — 7 sections covering academic integrity, privacy, safety
- [x] Consent Management modal — analytics and marketing toggles with AsyncStorage persistence
- [x] Data Deletion Request modal — GDPR/CCPA compliant, mailto to privacy@tutorsnapai.tech
- [x] New settings rows added: Notification Center, Send Feedback, Report a Bug, Legal & Privacy Hub
- [x] 4 new screens registered in _layout.tsx (notification-center, feedback, report-bug, legal)
- [x] 15 new icon mappings added to icon-symbol.tsx
- [x] TypeScript: 0 errors

## New Features (Round 8)
- [x] FAQ / Help Center screen with search, categories, expandable Q&A, and contact fallback
- [x] In-app version update prompt — checks tutorsnapai.tech/version.json on launch, shows modal when update available
- [x] Wire FAQ link into Settings ABOUT section
- [x] Wire update check into root _layout.tsx

## New Features (Round 9)
- [x] Search/filter bar on Bookmarks screen (by subject, keyword, date)
- [x] Share button on Solution screen (share problem + steps as text or image)
- [x] Push notification deep link to What's New section in Settings

## New Features (Round 10)
- [x] Copy Link option in Solution share menu (generates tutorsnapai.tech/solve?q=... deep link)
- [x] Practice this topic shortcut in Solution share menu (navigates to Practice pre-filtered by subject)
- [x] Swipe-to-delete on Bookmarks screen (swipe-left reveals red Delete button)

## Bug Fixes (Round 11)
- [x] Fix hidden settings icon and light/dark mode toggle icon at top of dashboard
- [x] Fix subject picker modal not scrolling on mobile

## New Features (Round 11)
- [x] Streak freeze / grace day mechanic (earned after 7-day streak, one per week)
- [x] Similar Problems shortcut chip on Bookmarks card (jumps to Practice for that subject)
- [x] Share to Classroom feature (teacher generates class code, students join to receive problems)

## New Features (Round 12)
- [x] Classroom tab in main navigation bar (dedicated tab icon, accessible from anywhere)
- [x] Challenge a Classmate flow (timed challenge from Classroom feed via share link)
- [x] Teacher dashboard analytics in Classroom (subject breakdown, most shared topics)

## New Features (Round 13)
- [x] Classroom leaderboard tab (rank by challenges completed and fastest solve time)
- [x] Assign as Homework button (due date picker, Homework badge on feed cards, countdown)
- [x] Push notifications for new classroom problems (notify joined students when teacher shares)
- [x] Wire recordChallengeResult into challenge.tsx so leaderboard updates after each challenge

## New Features (Round 14)
- [x] Student display name prompt on classroom join (stored in AsyncStorage, shown on leaderboard)
- [x] Homework due soon banner on Home screen (appears when assignment due within 24 hours)
- [x] Reset leaderboard option in Classroom Manage tab (confirmation alert, clears all scores)

## Accessibility and App Store Metadata (Round 15)
- [x] App Store metadata added to app.config.ts (description, privacy manifest, NSUsageDescription strings for all permissions)
- [x] 153 accessibilityLabel props added across 31 files (all primary interactive elements)
- [x] Fixed 4 broken self-closing element injections (study-planner x2, cheat-sheet-bottom-sheet, subject-picker)
- [x] TypeScript: 0 errors after all fixes

## Round 16: Flashcard PDF Export + Version Endpoint
- [x] Flashcard PDF export: replace text-only share with a two-option menu (Share as PDF using expo-print, Share as Text), styled HTML deck with all cards
- [x] Version.json endpoint: add GET /version.json route to Express server returning current version metadata
- [x] useUpdateCheck hook refactored to use getApiBaseUrl() from the mobile architecture — no tutorsnapai.tech dependency
- [x] Export Deck button added to Session Complete screen (opens same two-option share menu)
- [x] FUTURE_WEB_SETUP.md created documenting all deferred tutorsnapai.tech tasks (version.json hosting, App Store ID, legal pages, universal links, email setup)

## Round 17: Quiz Share Results + Flashcards Onboarding Tip
- [x] Share Results button on quiz completion screen (share score, subject, and accuracy via native share sheet)
- [x] Onboarding tip card on Flashcards empty state explaining how to bookmark solutions to build a deck

## Round 18: AI Response Processing Pipeline (Option A — Production-grade)
- [x] Install react-native-enriched-markdown + katex (Software Mansion, native Fabric, LaTeX + GFM)
- [x] Build lib/ai-response-pipeline.ts: sanitize artifacts, normalize spacing, repair malformed content
- [x] Build components/ai-response-renderer.tsx: EnrichedMarkdownText wrapper with theme, streaming, fallback
- [x] Wire AIResponseRenderer into chat screen MessageBubble (replace raw Text)
- [x] Wire AIResponseRenderer into solution screen StepCard explanations and expressions
- [x] Add dev/render-test.tsx: comprehensive test screen covering all prompt types
- [x] Verify TypeScript 0 errors and no raw Markdown/LaTeX artifacts in UI

## Round 19: Full Application Audit Fixes
- [x] quiz.tsx: add error state with retry button for generateMutation failure
- [x] quiz.tsx: wrap saveQuizResult and recordQuizBonus in try/catch (non-critical failures)
- [x] settings.tsx: add error handling to handleSetGoal, handleToggleReminder, handleSaveTime, handleToggleCategory, handleClearHistory, handleRateApp, Linking.openURL calls
- [x] solution.tsx: add error handling to handleBookmark and handleShareToClassroom
- [x] study-planner.tsx: add error handling to loadStudySlots, handleSave, handleDelete
- [x] progress.tsx: add error handling to loadProgress and handleSetGoal
- [x] leaderboard.tsx: add error handling to load, handleCopyCode, handleAddFriend, handleRemoveFriend; fix parseInt radix
- [x] TypeScript: 0 errors after all fixes

## Round 20: Subject Picker + Dark Mode Fixes
- [x] Fix subject picker mobile: replaced 7 near-white/pastel subject colors with saturated accessible colors (anatomy, forensics, general_science, environmental_science, psychology, sociology, civics, statistics)
- [x] Fix web dark mode: added CSS variable fallbacks in global.css for pre-hydration rendering; aligned Tailwind darkMode to use [data-theme="dark"] selector; rewrote ThemeProvider to apply scheme synchronously on web via localStorage; rewrote use-color-scheme.web.ts to read localStorage synchronously; ThemeProvider now also writes to localStorage so web reads are instant on next load
- [x] TypeScript: 0 errors after all fixes

## Round 21: Subject Picker Mobile Fix
- [x] Diagnose why subject picker modal looks different/invisible on mobile vs web
- [x] Fix subject picker to render identically on mobile and web

## Round 22: Full Application Audit and Repair
- [x] Parallel scan all screens/components to catalogue defects (34 files audited)
- [x] Fix functional defects: study-planner subject sub-modal (absolute positioning fix), main Add/Edit modal also fixed
- [x] Fix visual issues: onboarding hardcoded #FFFFFF replaced with #fff (theme-safe)
- [x] Fix code quality: onboarding accessibilityRole added to all interactive elements
- [x] Fix accessibility: quiz OptionButton gets accessibilityLabel, accessibilityRole, accessibilityState; leaderboard rank rows get accessibilityLabel + accessibilityHint; quiz-history back/retry/practice buttons get proper labels
- [x] Verified solution.tsx catch blocks are all intentional (user-cancel patterns)
- [x] Verified challenge.tsx has no async generation — no error state needed
- [x] Verified hardcoded colors in practice/settings/quiz-history are semantic (not theme-dependent)
- [x] TypeScript: 0 errors after all fixes

## Round 23: Quiz Share Web Clipboard Fallback
- [x] Add Copy Results fallback on quiz share button for web (expo-clipboard when Share.share unavailable)

## Round 24: Persistent Chat Sessions + History Menu + Share
- [x] Build lib/chat-sessions.ts: multi-session data model, save/load/delete/list sessions, migration from old single-session storage
- [x] Build app/chat-history.tsx: full chat history menu (list sessions, resume, delete, search, share, clear all)
- [x] Refactor chat screen: named sessions, new chat button, resume from history, share chat button, history button, auto-save every message, auto-title from first user message
- [x] Register chat-history route in _layout.tsx
- [x] TypeScript: 0 errors
