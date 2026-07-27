# TutorSnap - TODO

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
- [x] Flashcard deck PDF export and sharing
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

## Round 25: Chat Rename, Pin, and Discuss with Tutor
- [x] Session renaming: long-press on chat history card opens rename modal (inline text input + save)
- [x] Pinned chats: pin/unpin button on cards, pinned sessions always appear at top of history list (max 3)
- [x] Discuss with Tutor: button on solution screen opens a new chat pre-seeded with the problem and solution
- [x] TypeScript: 0 errors

## Round 26: Chat Auto-Seed, PDF Export, Tags
- [ ] Auto-send seed message when chat opened via Discuss with Tutor (AI responds immediately)
- [ ] Chat session PDF export via expo-print in share menu (Save as PDF option)
- [ ] Session tags/categories (Exam Prep, Homework, etc.) with filter bar in chat history
- [ ] TypeScript: 0 errors

## Round 26: Chat Auto-Seed, PDF Export, Tags/Categories
- [x] Auto-send seed message when chat opened via Discuss with Tutor (useEffect triggers sendMessage with seedMessage param)
- [x] Chat session PDF export: Share button opens two-option menu (Save as PDF via expo-print, Share as Text)
- [x] Session tags/categories: ChatSession model gets tags field; updateSessionTags/getAllTags functions added
- [x] Tag chips displayed on session cards; Tags action button opens TagEditModal
- [x] TagEditModal: add/remove tags (max 5), type custom tag or pick from suggestions (Exam Prep, Homework, Review, Practice, Notes, Project) plus all existing tags
- [x] Tag filter bar in Chat History: horizontal scrollable chips (All + each tag), filters session list in real time
- [x] tag.fill icon added to icon-symbol.tsx mapping
- [x] TypeScript: 0 errors

## Round 27: Quiz History Detail Screen
- [x] Extended QuizResult model with QuizQuestionSnapshot[] field (id, problem, options, correctAnswer, explanation, userAnswer)
- [x] quiz.tsx now saves per-question snapshots when a quiz finishes
- [x] Built app/quiz-history-detail.tsx: summary card, per-question breakdown, expandable explanations, answer summary for wrong answers
- [x] quiz-history.tsx cards are now tappable and navigate to detail screen with quiz id param
- [x] Registered quiz-history-detail route in _layout.tsx
- [x] Share/Copy button on detail screen exports full review as text
- [x] Practice Again button re-launches same quiz configuration
- [x] Graceful fallback for older quiz records without question detail
- [x] TypeScript: 0 errors

## Round 28: Subject Filter Chips + Adaptive Difficulty Banner
- [x] Quiz History: horizontal subject filter chip bar (All + per-subject chips with quiz count badges, active chip highlighted in primary color, clears on tap)
- [x] Quiz History: header subtitle updates to reflect active filter count
- [x] Quiz History: empty state when filter produces no results, with Clear Filter button
- [x] Practice: redesigned adaptive difficulty banner — prominent card with green accent strip, rocket icon, subject-specific copy, "Switch to X" button with haptic success, "Not now" dismiss; positioned below Quiz Stats card for maximum visibility
- [x] TypeScript: 0 errors

## Round 29: Solve Page Overhaul + Similar Problems Copy Icons + Elaborate Hints
- [x] Server: upgraded solve prompt — NEVER refuses any difficulty, 6-10 steps, each 3-5 sentences, includes workedExample section, 5-8 sentence conceptExplained, detailed tips (2-4 sentences each), max_tokens raised to 6000
- [x] Server: upgraded image-solve prompt with same comprehensive rules
- [x] Server: upgraded generateSimilar prompt — elaborate hints (2-4 sentences, concept pointer + why it applies + formula/rule), max_tokens raised to 2500
- [x] Server: upgraded practice prompt — 3 elaborate hints (concept pointer, first key step breakdown, hardest part guidance), max_tokens raised to 1500
- [x] Shared types: added WorkedExample type; added workedExample? field to MathSolution
- [x] Solution screen: renders new Worked Example card (green accent, example problem box, full narrative solution via AIResponseRenderer)
- [x] Solution screen: copy icon on each similar problem (checkmark feedback on success, haptic notification)
- [x] Solution screen: hint expanded section now has styled background box for better readability
- [x] TypeScript: 0 errors; Metro: bundled cleanly

## Round 30: Classroom Audit + Progress Chart + Solution Extras
- [x] Worked Example copy button on Solution screen
- [x] Per-subject quiz accuracy bar chart on Progress screen
- [x] Classroom: redirect /classroom to full-featured tab classroom
- [x] Classroom: leaderboard uses saved display name (not "Me")
- [x] Classroom: challenge result label distinguishes "Incorrect" vs "Timed out"
- [x] Classroom: joined classroom name set from student display name
- [x] Classroom: display-name editing uses cross-platform modal (replaces Alert.prompt)

## Round 31: Classroom Feed Search + Homework Completion Tracking
- [x] Classroom feed search bar (keyword, subject, person)
- [x] Homework completion: Done button on feed cards (student only)
- [x] Homework completion: green checkmark badge + green accent strip when done
- [x] Homework banner shows remaining count (e.g. "2 of 3 assignments remaining")
- [x] Empty state shows search icon and "No results found" when query has no matches
- [x] Clear Search button in empty state

## Round 32: Homework Notifications + Feed Sort/Filter
- [x] lib/homework-notifications.ts: scheduleHomeworkReminders, cancelHomeworkReminders, cancelAllHomeworkReminders
- [x] Schedule evening-before (7 PM) and morning-of (8 AM) reminders when homework is assigned
- [x] Cancel reminders when homework is unassigned or marked done
- [x] Re-schedule reminders when homework is un-done (toggled back)
- [x] Cancel all reminders when leaving a classroom
- [x] Feed sort menu: Newest first / Oldest first / Homework first
- [x] Feed subject filter chip bar (one chip per subject in feed)
- [x] Sort button highlights in primary color when non-default sort is active
- [x] Sort menu modal with checkmark on active option

## Round 33: Auto-solve Feed Cards + Persist Homework Completion
- [x] Classroom feed card navigation now passes proper data JSON param to solution screen
- [x] Solution screen auto-triggers solver when feed card has no cached answer/steps
- [x] Auto-solve shows spinner with problem text while solving
- [x] Auto-solve error state with "Try Again" and "Go Back" buttons
- [x] Homework completion state persisted to AsyncStorage (survives app restart)
- [x] Completion state loaded on classroom screen mount
- [x] Completion state saved on every toggle

## Round 34: Classroom Comment Threads + Offline Banner
- [x] lib/problem-comments.ts: getComments, addComment, deleteComment, getCommentCount (AsyncStorage)
- [x] components/problem-comment-sheet.tsx: bottom-sheet comment thread with FlatList, input row, delete own comments
- [x] Comment button on every feed card (shows count badge when > 0)
- [x] Comment counts loaded on feed load and refreshed when sheet closes
- [x] Offline banner already wired into root layout (covers all screens including Solve and Classroom)

## Round 35: Comment Replies, Feed Bookmarks, Classroom Audit Fixes
- [x] Add quoted reply threading to ProblemCommentSheet (replyToId, replyToAuthor, replyToText)
- [x] Add bookmark button to classroom feed cards (bookmark.fill / bookmark icon, persisted via bookmarks.ts)
- [x] Fix joined classroom name — student now enters classroom name in join modal (no more fabricated name)
- [x] Fix challenge leaderboard fallback from "Me" to "Student"
- [x] Fix "View Full Solution" in challenge to use data JSON param (auto-solve if steps missing)
- [x] Fix classroom feed steps — stored as JSON strings, parsed back on navigation (no more lossy string format)

## Round 36: Classroom Preview + Challenge History + Full App Audit

- [x] Expandable problem preview on classroom feed cards (tap to expand/collapse)
- [x] Challenge history log — lib/challenge-history.ts with local AsyncStorage persistence
- [x] Challenge history section in Progress screen (stats card + recent attempts list)
- [x] Save challenge attempt in challenge.tsx handleSubmit
- [x] Remove as any casts from workedExample in solution.tsx (type already correct)
- [x] Onboarding screen: use SafeAreaView for proper notch/safe-area handling
- [x] Server router: wrap solve and solveFromImage mutations in try-catch with TRPCError
- [x] All icon mappings verified — arrow.up.circle.fill added
- [x] All FlatLists verified to have keyExtractor
- [x] All onPress handlers verified — no dead-end buttons found
- [x] Classroom sort menu, search bar, subject filter all verified wired correctly
- [x] Leaderboard clipboard fallback already correct (expo-clipboard)
- [x] Auto-solve loading state in solution.tsx verified correct

## Round 37: Challenge History in Leaderboard + Settings Audit
- [x] Add challenge history section to Leaderboard screen (stats card + per-attempt rows)
- [x] Homework due-date display already fully implemented (confirmed in audit)
- [x] Settings audit: Reset All Progress now covers all 20+ storage keys (streak_freeze_v2, chat sessions, notif prefs, consent, challenge history, dynamic keys)
- [x] Settings audit: Notification Center toggles now gate actual notification delivery via lib/notification-prefs.ts
- [x] Settings audit: Fixed duplicate questionmark.circle icon (How To now uses book.fill)
- [x] Settings audit: Moved Classroom row from ABOUT section to PROGRESS & DATA section
- [x] Settings audit: Updated What's New to reflect recent features (quiz history detail, classroom overhaul, challenge history, deeper AI solutions, subject accuracy chart)
- [x] Settings audit: Subjects Covered card now uses dynamic SUBJECT_CATEGORIES data (38 subjects)
- [x] Created lib/notification-prefs.ts shared pref-gate helper
- [x] Wired studyReminders pref gate into lib/homework-notifications.ts
- [x] Wired dailyReminder pref gate into lib/notifications.ts
- [x] Wired studyReminders pref gate into lib/study-planner.ts (with cancel-on-disable)

## Round 38: Streak Alert + Weekly Report Notifications + Dashboard Bell Icon
- [x] Build lib/streak-notifications.ts with streak alert (8 PM daily) and weekly progress report (Sunday 9 AM)
- [x] Wire syncAllStreakNotifications into app launch (_layout.tsx)
- [x] Wire cancelStreakAlert when daily goal is met in index.tsx
- [x] Add notification bell icon with live badge count to dashboard header
- [x] Bell taps navigate to Notification Center screen

## Round 39: Notification deep-linking, bell badge clear, solution share clipboard fallback
- [x] Notification tap deep-linking: streak_alert and weekly_report route to Progress; homework_reminder routes to Classroom
- [x] Fix streak-notifications.ts data.type payloads to snake_case to match router
- [x] Clear bell badge (setBadgeCountAsync(0)) when Notification Center screen opens
- [x] Add expo-clipboard fallback to handleShareText in solution.tsx for web

## Round 40: RevenueCat Subscription System
- [x] Install react-native-purchases (RevenueCat SDK)
- [x] Create lib/subscription.ts — initRevenueCat, getSubscriptionStatus, purchaseProduct, restorePurchases, openManageSubscriptions, getOfferings, usage limit helpers, trial tracking, dev-mode fallback
- [x] Create app/paywall.tsx — hero with 14-day trial badge, monthly/annual plan cards (annual highlighted as Best Value with Save 42% badge), feature list, CTA "Start Free Trial", Restore Purchases link, legal text, dev-mode notice
- [x] Create hooks/use-premium.ts — usePremium hook with subscription status, usage counts, checkLimit, incrementUsage, auto-refresh on focus
- [x] Wire solve limit in app/(tabs)/index.tsx — checkLimit("solves") before handleSolve, paywall modal on limit hit, free-tier counter display
- [x] Wire quiz question limit in app/quiz.tsx — checkLimit per question in handleNext, paywall modal on limit hit
- [x] Wire chat message limit in app/(tabs)/chat.tsx — sessionMessageCount check in handleSend, paywall modal on limit hit
- [x] Add SUBSCRIPTION section to settings.tsx — status display (trial days remaining / active plan / dev mode), Restore Purchases row, Manage Subscription row, View Premium Plans row
- [x] Register /paywall route in app/_layout.tsx (modal presentation)
- [x] Wire trial expiry check on app launch in _layout.tsx — shows paywall if trial expired and not premium

## Round 41: Subscription Upsell Surface Expansion
- [x] Add chat nudge banner above input bar in chat.tsx (messages used / remaining, amber→red, taps to paywall)
- [x] Add premium crown badge to home screen header (gold crown taps to paywall; filled crown for premium users)
- [x] Add paywall slide to onboarding flow as final step ("Start your 14-day free trial")

## Round 42: Subscription Conversion Polish
- [x] Wire onboarding "Start Free Trial" CTA to push /paywall before finishing onboarding
- [x] Build post-purchase celebration screen (app/premium-welcome.tsx) with confetti + welcome message
- [x] Wire paywall to push /premium-welcome after successful purchase
- [x] Add quiz nudge banner above answer options in quiz.tsx

## Round 43: Engagement & Viral Loop Polish
- [x] Add ?restored=true variant to premium-welcome.tsx ("Welcome Back!" copy)
- [x] Wire paywall restore success to /premium-welcome?restored=true
- [x] Add streak-protection upsell banner on home screen (evening nudge for free users)
- [x] Add "Share your result" native share sheet after quiz completion

## Round 44: Growth & Retention Mechanics
- [x] Build app/refer.tsx — Refer a Friend screen with unique code, share message, incentive copy
- [x] Wire Refer a Friend row in Settings
- [x] Register /refer route in _layout.tsx
- [x] Add streak-protection push notification scheduled at 20:00 daily
- [x] Add App Store review prompt after quiz ≥80% + 3+ days usage

## Round 45: Engagement Features
- [x] Build lib/daily-challenge.ts — daily challenge logic with midnight reset and bonus XP
- [x] Build app/daily-challenge.tsx — daily challenge screen with countdown timer
- [x] Wire Daily Challenge entry point from home screen
- [x] Build leaderboard tab screen with weekly rankings
- [x] Add leaderboard tab to tab bar
- [x] Add "Explain this differently" button on solve results

## Round 46: Full Affiliate System
- [x] lib/affiliate.ts — referral tracking, reward tiers, earning options, stats
- [x] app/refer.tsx — full affiliate dashboard (earnings, history, tiers, sharing)
- [x] app/affiliate-rewards.tsx — rewards redemption screen
- [x] Settings affiliate section entry point

## Round 47: Affiliate Polish
- [x] Friend-joined push notification in lib/affiliate.ts
- [x] Home screen affiliate earnings widget
- [x] Share tier badge feature on affiliate dashboard

## Round 48: Affiliate Completion
- [x] Top Affiliates leaderboard section on affiliate dashboard
- [x] Referral deep-link handler and welcome banner
- [x] Solve result share button

## Round 49: Affiliate follow-ups + Full Audit
- [x] Redeem a friend's code input in Settings
- [x] Weekly affiliate digest notification (Monday 9am)
- [x] Pending days expiry warning banner (90-day idle)
- [x] Full audit: TypeScript / broken imports / null safety
- [x] Full audit: functional — every screen, button, modal
- [x] Full audit: visual — spacing, alignment, font sizes
- [x] Full audit: accessibility — accessibilityLabel coverage
- [x] Full audit: state integrity — stale data, error recovery

## Round 50: Comprehensive Forensic Audit (10-Section)
- [x] Phase 1: Full application discovery scan (all screens, routes, components, libs, storage keys)
- [x] Phase 2: Functional testing (all buttons, forms, navigation, modals, state persistence)
- [x] Phase 3: Critical crash/data fixes (icon mappings, JSON.parse guards, missing keys, branding)
- [x] Phase 4: Code quality (unused imports, ESLint errors, unescaped entities, dead code)
- [x] Phase 5: Design consistency (hardcoded colors assessed — semantic usage confirmed correct)
- [x] Phase 6: Accessibility (337 labels across 893 elements = 38% coverage, critical paths covered)
- [x] Phase 7: State/data integrity (storage key coverage verified, 2 missing keys added to Reset)
- [x] Phase 8: Performance (all 20 timer refs have cleanup, no memory leaks found)
- [x] Phase 9: Final validation (TS 0 errors, ESLint 0 errors 52 warnings, dev server clean)
- [x] Phase 10: Deliver structured completion report

## Round 26: AI Tutor Scroll Controls, Voice Transcript Toast, and Subject Memory
- [x] Add left-side scroll-to-top floating button in AI Tutor chat
- [x] Add right-side scroll-to-bottom floating button in AI Tutor chat
- [x] Add voice transcript confidence toast in AI Tutor chat
- [x] Persist last-used AI Tutor subject across sessions and new chats

## Round 27: AI Tutor Input Bar + Scroll FAB + Toast Polish
- [x] Long-press subject pill in AI Tutor input bar to clear subject (reset to General)
- [x] Fade-in/out animation on scroll-to-top and scroll-to-bottom FABs
- [x] Tap-to-dismiss on voice transcript toast

## Round 28: Fix AI Chat Responses in APK Build
- [x] Update EXPO_PUBLIC_API_BASE_URL to production domain so APK can reach the backend
- [x] Fix CORS middleware to always send ACAO header (native Android has no Origin header)
- [x] Fix credentials mode to use omit on native (Bearer token auth) vs include on web (cookie auth)
- [x] Replace global fetch with expo/fetch on native — RN built-in fetch does NOT support response.body.getReader() (ReadableStream) on Android/iOS Hermes engine

## Round 29: Error Bubble, Retry Button, expo/fetch for Solver
- [x] Add connection-failed error bubble in AI Tutor chat when stream errors out
- [x] Add retry button on failed AI messages in AI Tutor chat
- [x] Apply expo/fetch fix to Math Solver snap-to-solve streaming on native (confirmed: only chat.tsx uses streaming; all other screens use tRPC mutations)

## Round 30: Offline Banner, Subject Toast, FAB Press Animation
- [x] Add offline network status banner at top of AI Tutor chat
- [x] Add subject-cleared micro-toast on long-press clear of subject pill
- [x] Add scale-down press animation (0.88x) on scroll FABs

## Round 31: Reconnecting Banner, Haptic on Connectivity, Offline Message Queue
- [x] Add Reconnecting state to offline banner with auto-dismiss and Back online flash
- [x] Add haptic pulse on connectivity change (offline/online transitions)
- [x] Add offline message queue that holds unsent messages and auto-sends on reconnect

## Round 32: Cancel Queue, Pending Bubbles, Connection Quality
- [x] Add cancel queued messages button in offline banner
- [x] Add pending bubble previews for queued messages in chat FlatList
- [x] Add connection quality indicator (slow/fast) in status area using response time

## Round 33: Smooth Streaming Scroll + Polish
- [x] Fix shaky/jumpy scroll during AI streaming - make content growth buttery smooth
- [x] Long-press on individual pending bubble to remove it from queue
- [x] Slow-connection amber ring on send button when connection quality is slow
- [x] Session summary badge on AI Tutor tab showing total session count

## Round 34: Badge Mark-as-Read, Scroll Velocity Pause, Slow-Connection Tooltip
- [x] Mark-as-read tap on session count badge clears it until new session is created
- [x] Scroll velocity detector pauses auto-scroll during fast manual flicks
- [x] Slow-connection tooltip appears briefly when amber ring first shows

## Round 35: Reconnecting Spinner, Momentum Pause, Badge Pulse + Full Audit Fixes
- [x] Reconnecting spinner in slow-connection tooltip that upgrades to green "Fast connection restored"
- [x] Scroll momentum detector pauses auto-scroll during deceleration phase after flick ends
- [x] Badge pulse animation when session count badge first increments
- [x] Add unmount cleanup useEffect in chat.tsx to clear all timer refs on unmount
- [x] Add accessibilityLabel to scan screen captured image
- [x] Add accessibilityLabel to key icon-only buttons across all screens

## Round 36: New Chat Quick-Action on Home Screen
- [x] Add New Chat quick-action shortcut card on home screen to instantly start AI Tutor session

## Round 37: New Chat Banner Enhancements
- [x] Subject pre-fill: pass selected subject from home screen to AI Tutor chat when tapping banner
- [x] Continue last chat secondary link below the banner
- [x] Scale-down press animation (0.97x) on the New Chat banner

## Round 38: Home Screen Banner Advanced Features
- [x] Swipe-to-dismiss on Continue last chat link (persisted to AsyncStorage)
- [x] Long-press session preview tooltip on Continue last chat link
- [x] Quick Ask inline text input on the home screen banner

## Round 39: Quick Ask UX Polish
- [x] Clear (×) button on Quick Ask input
- [x] Inline subject chip next to Quick Ask send button
- [x] Undo toast after dismissing Continue last chat link

## Round 40: Quick Ask Advanced UX
- [x] Recent subjects row above Quick Ask input (last 2–3 used subjects as quick-tap chips)
- [x] Quick Ask history dropdown on focus (last 3–5 queries from AsyncStorage)
- [x] Animated slide-in/fade-out undo toast

## Round 41: Chat scroll UX
- [x] Allow user to freely scroll chat FlatList during AI streaming without auto-scroll resistance

## Round 42: Streaming UX — pill + stop-and-read
- [x] "↓ Generating…" pill shown when user scrolls up during streaming
- [x] Stop-and-read mode: slow character drain when user is scrolled up, resume normal speed at bottom

## Round 43: Auto-resume on scroll inactivity
- [x] Auto-resume streaming scroll after 3s of user scroll inactivity during stop-and-read mode

## Round 44: Chat top bar redesign
- [x] Add gear Settings button to top bar that opens a pop-up modal
- [x] Replace History + Share buttons with a single ⋯ dropdown in top bar
- [x] Remove subject text from status row; show subject as color dot on the chat input bar

## Round 46: Complete AI Tutor Settings System
- [x] Create TutorSettings component with 8 grouped sections
- [x] Section 1: Learning Profile (name, grade, subject, learning style, language)
- [x] Section 2: Response Style (length, tone, emojis, show working, follow-up chips)
- [x] Section 3: Chat Behaviour (typing animation, speed, auto-scroll, auto-resume, send-on-enter, voice)
- [x] Section 4: Session & History (save history, auto-title, max sessions, clear all, export)
- [x] Section 5: Appearance (avatar style, bubble style, font size, code theme, density)
- [x] Section 6: Accessibility (high contrast, reduce motion, screen reader hints)
- [x] Section 7: Notifications & Reminders (study reminders, session summary)
- [x] Section 8: Advanced (system prompt preview, model info, debug mode, reset all)
- [x] Wire all settings into chat.tsx with AsyncStorage persistence and live effects
- [x] Replace old Tutor Settings modal with new full-screen sheet

## Round 49: Affiliate Follow-ups & Full Audit
- [x] Redeem a friend's code — modal in Settings, one-time enforcement, 14-day trial activation
- [x] Weekly affiliate digest notification — Monday 9 AM, wired in _layout.tsx, routes to /refer on tap
- [x] Pending days expiry warning banner — 90-day idle threshold, shown on /refer screen
- [x] Audit: remove unused imports (Pressable, TutorSettings type, getSubjectEmoji, getGradePromptContext, handlePrivacyPolicy, handleTerms, isBookmarked, continueSessionDismissedKey)
- [x] Audit: fix Array<T> → T[] in sendStreamingChat signature
- [x] Audit: remove stale eslint-disable-next-line no-constant-condition directive
- [x] Audit: shareCopied state now renders "Copied!" feedback in share menu on web
- [x] TypeScript: 0 errors confirmed

## Round 50: TutorSettings Deep Integration
- [x] Inject TutorSettings (nickname, tone, responseLength, learningStyle, language, showWorking, useEmojis) into AI system prompt in sendStreamingChat
- [x] Wire studyReminders + studyReminderTime toggles in TutorSettingsModal to schedule/cancel daily local notification
- [x] Enforce maxSessions limit in chat-sessions.ts — prune oldest sessions on save

## Round 51: Onboarding → TutorSettings Pre-fill
- [x] Import TUTOR_SETTINGS_KEY and DEFAULT_TUTOR_SETTINGS into onboarding.tsx
- [x] Extract persistOnboardingChoices() helper that writes nickname, gradeLevel, defaultSubject into TutorSettings (only if not already customised)
- [x] Call persistOnboardingChoices() from both finishOnboarding (Skip) and finishOnboardingAndShowPaywall (Next on last slide)
- [x] Map first selected category to a representative default subject (math→algebra, english→composition, science→biology, social→world_history)
- [x] TypeScript: 0 errors confirmed

## Round 52: TutorSettings Deep Scan & Fixes
- [x] Fix 1: Add Language row to Section 1 (Learning Profile) — was in type/defaults but missing from UI
- [x] Fix 2: Add textformat icon mapping for Language row
- [x] Fix 3: Sync chat grade picker selection back to TutorSettings.gradeLevel on change
- [x] Fix 3b: Pass maxSessions limit to saveSession in grade picker (was missing)
- [x] Fix 4: Wire autoScroll setting — smoothScrollToEnd now respects tutorSettings.autoScroll
- [x] Fix 5: Wire saveHistory setting — persistMessages skips storage when disabled
- [x] Fix 5b: Wire autoTitle setting — session title generation now gated on tutorSettings.autoTitle
- [x] Fix 6: Wire sendOnEnter setting — TextInput returnKeyType and onSubmitEditing now use tutorSettings.sendOnEnter
- [x] Fix 7: Pass live systemPromptPreview to TutorSettingsModal so System Prompt overlay shows real data
- [x] Fix 7b: Update modelName to show actual model (gpt-4o-mini)
- [x] Fix 8: Add Export Format segment row to Section 4 (was in type/defaults but missing from UI)
- [x] Fix 8b: Wire exportFormat in onExportChat — PDF format triggers handleSharePDF directly

## Round 53: Welcome Message Fix + Round 52 Suggestions
- [x] Fix blank chat welcome message — merge two lines into one flowing sentence
- [x] Personalised welcome greeting — WelcomeCard shows "Hi, {nickname}! I'm TutorSnap ✨" when nickname is set
- [x] Session summary notification — fires when user taps New Chat and sessionSummary toggle is on
- [x] Tutor personality preview slide — new onboarding slide 7 shows grade, subjects, tone, style, language preview

## Round 54: Grade Picker Sync + Personalised Subject Greeting
- [x] Confirmed grade picker → TutorSettings.gradeLevel sync already in place (Round 52 Fix 3)
- [x] Subject-aware WelcomeCard greeting now includes nickname: "Hi, Alex! Ready for Algebra 📐"
- [x] No-subject greeting unchanged: "Hi, Alex! I'm TutorSnap ✨"

## Round 55: Free-scroll + Background Streaming + WelcomeCard Polish
- [x] Free-scroll during AI generation — removed 5x drain slowdown; user can scroll freely without resistance
- [x] Background streaming — AppState listener keeps drain loop alive when app is backgrounded
- [x] Subject subtitle personalisation with nickname — WelcomeCard subtitle includes name
- [ ] Nickname edit shortcut on WelcomeCard — deferred to Round 56

## Round 55b: Deep Scan Audit Fixes
- [x] TutorSettingsModal Section 1 — added gradeLevel and defaultSubject rows to UI (were in type but not rendered)
- [x] book.closed.fill icon mapping added to icon-symbol.tsx
- [x] Session summary notification tap — routes to chat tab in _layout.tsx
- [x] maxSessions pruning — pinned sessions now protected from eviction (separate pinned/unpinned buckets)
- [x] All other screens audited: onboarding, settings, home, flashcards, refer, progress, paywall — no critical defects
- [x] Code quality: 0 unused vars, 0 TypeScript errors, 34 warnings (all non-critical exhaustive-deps + no-require-imports)

## Round 56: WelcomeCard Nickname Edit + Typing Speed Live Preview
- [x] Nickname edit shortcut on WelcomeCard — "Edit name" / "Set your name" link below subtitle, taps open TutorSettingsModal
- [x] Typing speed live preview in TutorSettings Section 3 — animated demo sentence plays at selected speed, ↺ replay button, auto-runs on modal open and speed change
- [x] TypeScript: 0 errors confirmed

## Round 57: Chat Bar Position Fix
- [x] Add inputRef to TextInput so it can be programmatically blurred
- [x] Call inputRef.current?.blur() in handleSend after Keyboard.dismiss() so bar returns to bottom position after send
- [x] Set blurOnSubmit={false} to prevent double-blur conflict on multiline input
- [x] TypeScript: 0 errors confirmed

## Round 58: Input Bar UX Improvements
- [x] Re-focus input after AI response finishes streaming (350ms delay to let scroll settle)
- [x] Haptic on keyboard dismiss — Light impact in handleSend confirms bar returning to bottom
- [x] Safe-area bottom padding on floating bar wrapper using insets.bottom for home-indicator devices
- [x] TypeScript: 0 errors confirmed

## Round 59: Chat UX Polish
- [x] Animated three-dot typing indicator bubble (send → first token) — isWaitingForFirstToken state, cleared on first parsed.token
- [x] Input character counter (shown within 200 chars of 2000 limit) — amber at 200 left, red at 50 left
- [x] Swipe-down to dismiss keyboard on message FlatList — keyboardDismissMode=on-drag + keyboardShouldPersistTaps=handled

## Round 60: Typing Speed Fix
- [x] Added "Instant" (very_fast) option to Typing Speed in TutorSettings Section 3
- [x] Live preview always visible — shows "Responses appear instantly" when animation is off
- [x] very_fast added to TypingSpeed type in appearance-context.tsx (2ms/char)
- [x] TYPING_SPEED_MS updated in chat.tsx to include very_fast: 2ms
- [x] Appearance Settings screen updated to show Instant option
- [x] TypeScript: 0 errors confirmed

## Round 61: Per-Subject STEM Typing Speed Override
- [x] Added stemTypingSpeed field to TutorSettings type ("same" | "slow" | "normal" | "fast" | "very_fast")
- [x] Default: "same" (inherits global typing speed)
- [x] Added STEM Speed Override SegmentRow to TutorSettings Section 3 (Chat Behaviour)
- [x] Wired into getTypingDelayMs in chat.tsx — checked after Appearance Settings override, before auto-slow fallback
- [x] Applies to Math and Science subjects only (isMathSubject / isScienceSubject)
- [x] TypeScript: 0 errors confirmed

## APK Crash Fix (Round 62)
- [x] Remove react-native-purchases@10.4.2 (AGP 8.13.2 conflict + Kotlin 1.8.22 vs 2.0.21 mismatch)
- [x] Remove react-native-webview@14.0.1 (new arch codegenConfig conflict with old arch disabled)
- [x] Remove katex package (only used with WebView)
- [x] Restore newArchEnabled: true (all remaining native modules support new arch)
- [x] Fix expo-file-system version to ~19.0.23 (matches SDK 54)
- [x] Rewrite lib/subscription.ts as pure local subscription management (AsyncStorage-based)
- [x] Rewrite components/math-renderer.tsx as pure JS Unicode-based math rendering
- [x] Update tests/revenuecat-env.test.ts to validate new subscription module
- [x] Verify all native modules have codegenConfig (new arch compatible)
- [x] Verify all expo plugins in app.config.ts have packages installed
- [x] Verify TypeScript: 0 errors
- [x] Verify dev server: running, bundled without errors
- [x] Verify all tests pass (10 passed, 1 skipped)

## AI Tutor Premium Redesign
- [ ] Hide tab bar when AI Tutor chat tab is active (immersive full-screen)
- [ ] Glassmorphism header with blur, no border, minimal chrome
- [ ] Animated gradient orb avatar (breathing pulse animation)
- [ ] Cinematic welcome state with elegant typography and glass chips
- [ ] User bubbles with gradient (indigo→violet)
- [ ] AI responses borderless with generous whitespace
- [ ] Timestamps hidden by default, revealed on tap
- [ ] Glassmorphism input bar with backdrop blur and inner glow on focus
- [ ] Send button morph animation (mic → send arrow)
- [ ] Ambient gradient mesh background (dark mode)
- [ ] Polished generating state with pulsing glow on orb
- [ ] Fade-in slide-up animation for new messages

## AI Tutor Premium Redesign (Round 63)
- [x] Tab bar hidden when AI Tutor chat is active (full immersive screen)
- [x] Glassmorphism header with BlurView (iOS frosted glass, translucent on Android)
- [x] Animated gradient orb avatar (indigo→violet pulse with glow ring)
- [x] Cinematic welcome state: "How can I help you today?" with staggered fade-in
- [x] Glass suggestion chips with stronger border and bolder text
- [x] User message bubbles upgraded to indigo→violet gradient
- [x] Floating glassmorphism input bar (BlurView pill with primary-tinted border)
- [x] Gradient send button (indigo→violet when active, grey when disabled)
- [x] Ambient background gradient (deep navy dark / soft lavender light)
- [x] TypingDots upgraded: gradient dots (indigo/violet/indigo), scale+translateY wave
- [x] Scroll FABs and generating pill repositioned for hidden tab bar
- [x] ScreenContainer extended to include bottom safe area edge
- [x] expo-blur@15.0.8 installed (SDK 54 compatible, new arch)
- [x] TypeScript: 0 errors

## Premium Chat Animations with Settings (Round 64)
- [x] Swipe-to-reveal tab bar: pill indicator at bottom, tap to show tab bar for 3 seconds
- [x] Word-by-word fade-in animation for AI streaming responses (AnimatedFadeInWrapper)
- [x] Mood ring orb color shift: indigo→teal gradient when AI is generating
- [x] Settings toggles: "Swipe to Show Tab Bar", "Animate AI Responses", "Mood Ring Orb" in Appearance section
- [x] Icon mappings added: hand.draw, text.word.spacing, circle.hexagongrid.fill
- [x] animateWords prop added to AIResponseRenderer and MessageBubble
- [x] TypeScript: 0 errors
- [ ] Keep the chat input bar pinned to the bottom of the screen before and after sending a request
- [ ] Fix chat auto-scroll so the latest user message and AI response always land fully at the bottom
- [ ] Remove scroll resistance and scroll-fighting during and after AI response generation for a smooth, seamless feel
- [ ] Refactor the chat layout so the composer height is reserved correctly in the message list


## Release Candidate Polish (2026-07-22)

### UI/UX
- [ ] U2: Add "Continue with Apple" button on iOS in auth-screen.tsx
- [ ] U3: Hide tab bar when chat screen is open
- [x] U8: Strip em/en dashes from AI response text
- [ ] U9: Ensure paywall dev mode banner never shows in production

### Localization
- [ ] L1: Install i18next + react-i18next + expo-localization
- [ ] L2: Extract all user-facing strings into locales/en.json

### Code Quality
- [x] Q1: Remove all console.log from production app/lib code
- [ ] Q5: Fix paywall timer in _layout.tsx to use longer delay and auth gate

### Production Audit
- [x] A3: Increment build number in app.config.ts (buildNumber: "3", versionCode: 3)
- [x] A4: Fix EAS Android production AAB build failure — generated package-lock.json (lockfileVersion 3), added legacy-peer-deps=true to .npmrc, confirmed eas.json production profile has buildType: app-bundle
- [x] A5: Fix Google Sign-In DEVELOPER_ERROR on Play Store — added App Signing SHA-1 to Firebase + Google Cloud OAuth client, updated google-services.json, rebuilt AAB (versionCode 5)
- [x] AUTH1: Fix auth flash on cold start — AuthGuard component added to root layout, blocks navigation until AuthContext.isLoading resolves, shows themed background while loading

## Auth Flow Bug Fixes (Post-APK Testing)
- [x] Fix onboarding appearing before auth screen on fresh install — gate onboarding check on isSignedIn being true
- [x] Fix re-opening app logging user out — isAuthenticated now checks refresh token expiry (30 days) instead of access token expiry (1 hour)
- [x] Increment versionCode to 6 / buildNumber to 5 for new APK build

## Final Solution Card (Submission-Ready Deliverable)
- [x] Add finalSolution field to MathSolution and PracticeQuestion shared types
- [x] Update solve system prompt (text + image) to return finalSolution in JSON
- [x] Update practice system prompt to return finalSolution in JSON
- [x] Update AI Tutor chat system prompt to append ---FINAL_SOLUTION_START/END--- delimiters
- [x] Create FinalSolutionCard component (purple-accented, copy button, submission-ready label)
- [x] Integrate FinalSolutionCard into solution.tsx (Solve + Practice tabs)
- [x] Pass finalSolution field through practice.tsx handleViewSolution
- [x] Integrate FinalSolutionCard into chat.tsx MessageBubble (AI Tutor tab)

## Submission Ready Architecture (Full Rebuild)
- [x] Remove finalSolution field from prompts (was a summary, not a separate output)
- [x] Remove ---FINAL_SOLUTION_START/END--- delimiters from chat system prompt
- [x] Remove old FinalSolutionCard component
- [x] Add submissionReady field to MathSolution and PracticeQuestion types
- [x] Redesign solve/image-solve prompts: submissionReady is a brand-new independent output, not derived from the explanation
- [x] Redesign practice prompt: same submissionReady independence requirement
- [x] Redesign AI Tutor chat prompt: append ===SUBMISSION_READY_START=== / ===SUBMISSION_READY_END=== delimiters with a fully independent second output
- [x] Build SubmissionReadyCard component (distinct design, copy button, subject-adaptive content)
- [x] Wire SubmissionReadyCard into solution.tsx (Solve + Practice tabs)
- [x] Pass submissionReady through practice.tsx handleViewSolution
- [x] Wire SubmissionReadyCard into chat.tsx MessageBubble (AI Tutor tab)
- [x] TypeScript: 0 errors

## Quick-Access Shortcuts from Solve and Practice Tabs
- [x] Solve tab header: add Saved Notes icon button (next to bookmark)
- [x] Solve tab: add Save to Flashcards button at the bottom of the solution
- [x] Practice tab Quick Links: add Study Planner card
- [x] Practice tab Quick Links: add Classroom card

## Round 35: 4 New Features
- [x] Study View for Solve tab: segmented Chat/Study toggle in solution.tsx, generateStudyBlocks endpoint, StudyBlockCard component, block-card renderer replacing step cards in Study mode
- [x] Notes screen filter by source: filter chips (All / Alt Explanation / Chat / Note) above search bar in notes.tsx
- [x] Review Missed Questions flow: "Review Missed" button in ScoreSummary, dedicated screen listing only wrong answers with full explanations + Submission Ready cards
- [x] Extend payload hardening to Practice tab: solveExplanation trigger after Show Answer in practice.tsx, validated payload with subject/difficulty/gradeLevel

## Round 35 APK Build
- [x] Bump version to 1.1.2, buildNumber 6, versionCode 7
- [x] EAS APK build triggered for Round 35 (Study View, Notes filter, Review Missed, Practice hardening)

## Round 36: Toast + Review Missed History
- [x] Study Block card save toast: 2-second animated confirmation when block saved to Notes
- [x] Review Missed button in quiz-history-detail.tsx for any past quiz

## Round 36b: Quick Links Layout
- [x] Solve tab: added QUICK ACCESS row (Notes, Flashcards, Bookmarks, Planner) after EXPLORE section
- [x] Practice tab: Quick Links already trimmed to 4 cards (Quiz History, Study Planner, Flashcards, Progress)

## Round 37: Solution Header Progress Nudge
- [x] Add streak/stats badge below solution title in solution.tsx header (tap to open Progress)

## Round 38: Share Sheet Fix + Practice Progress Nudge
- [x] Fix share menu: compact scrollable bottom sheet with drag handle and Cancel button
- [x] Practice tab: progress nudge strip above generate card (streak + today goal)

## Round 39: Chat Share Sheet + Settings Profile Section
- [x] Convert chat share menu to bottom sheet (drag handle, ScrollView, Cancel button)
- [x] Add profile section to settings header: avatar, display name, photo upload via image picker

## Round 40: Avatar + Expanded Try Examples
- [x] Show user avatar (or initials) in chat tab header
- [x] Show user avatar in Solve tab home greeting (top-right, taps to Settings)
- [x] Expand Try Examples to 70 questions in 10 collapsible group dropdowns

## Round 41: Auto-expand Grade Group + Practice Avatar + APK Build
- [x] Auto-expand user's grade group in Try Examples on Solve tab load
- [x] Add avatar circle to Practice tab header
- [x] Bump version and trigger EAS APK build

## Round 42: Avatar in Solution Strip + Onboarding Flow
- [ ] Show user avatar in solution.tsx progress nudge strip (replace streak emoji with avatar)
- [ ] First-launch onboarding screen: name, grade level, preferred subjects
- [ ] Add photo upload step to onboarding (after name slide)
- [ ] Polish onboarding UI: gradient backgrounds, smoother transitions, dot indicators

## Round 43: Confetti + Re-run Setup Wizard
- [x] Add rich confetti burst to onboarding final slide (Start Free Trial tap)
- [x] Add Re-run Setup Wizard row to Settings profile section (clears only onboarding flag)

## Round 44: Pre-fill Onboarding + Streak Milestones
- [x] Pre-fill name and grade when re-running the onboarding wizard
- [x] Streak milestone celebration: confetti + toast at 3, 7, 14, 30 day streaks

## Round 45: Milestone Share Card + Streak-at-Risk Notification + APK 1.1.5
- [x] Milestone share card: Share button in StreakMilestoneModal (native share sheet)
- [x] Streak-at-risk evening push notification (8 PM local, only if streak > 0 and nothing solved today)
- [x] Version bump to 1.1.5 / versionCode 10
- [x] Build APK 1.1.5

## Round 46: Smooth Loading Animations
- [x] New skeleton primitives: ShimmerBox (sweep), PulseBox (scale+opacity), DotsLoader (bouncing dots), SpinnerOverlay, SolvingOverlay
- [x] HomeSkeletonScreen: full shimmer layout shown until first progress load
- [x] ProgressSkeletonScreen: replaces "Loading..." text on Progress tab
- [x] HistorySkeletonList: animated rows on History and Quiz History screens
- [x] SolvingOverlay: branded brain emoji + DotsLoader replaces plain ActivityIndicator on Solution screen
- [x] DotsLoader: replaces ActivityIndicator in Solve button (index.tsx) and AI Tutor session loading
- [x] QuizLoadingScreen: upgraded to use ShimmerBox progress bar

## Round 47: Screen Transitions + Practice Skeleton + History Pull-to-Refresh
- [x] Screen push transition: FadeIn + SlideInRight animation when navigating Home -> Solution
- [x] Practice tab: show PracticeSkeletonCard on initial mount before first load
- [x] History tab: pull-to-refresh with RefreshControl + skeleton animation

## Round 48: More Transition Polish
- [x] Apply useScreenTransition to Quiz, Flashcards, and Bookmarks screens
- [x] Pull-to-refresh on Quiz History screen
- [x] Staggered step animation on Solution screen (80ms per step)

## Round 49: UX Polish - Transitions, Refresh, Score Animation

- [x] Apply useScreenTransition to 19 remaining screens (challenge, chat-history, faq, feedback, leaderboard, legal, notes, notification-center, pomodoro, profile-setup, profile, progress, quiz-history-detail, quiz-history, report-bug, review-missed, rewards, settings, study-planner)
- [x] Pull-to-refresh on Bookmarks screen
- [x] Animated score count-up reveal on Quiz Results (0 to final pct over 600ms)
- [x] Fix onboarding dark mode (background now uses colors.background with LinearGradient overlay)
- [x] Build APK 1.1.6

## Round 50: Haptics, Empty States, Onboarding Skip

- [x] Haptic feedback at end of quiz score count-up animation (NotificationFeedbackType.Success)
- [x] Empty state illustrations for Bookmarks screen (open book SVG + CTA)
- [x] Empty state illustrations for History screen (magnifying glass SVG + CTA)
- [x] Empty state illustrations for Quiz History screen (trophy SVG + CTA)
- [x] Onboarding skip button (top-right, bypasses remaining slides, hidden on first/last slide)

## Round 51: Empty State Animation, Perfect Score Confetti, Onboarding Progress Bar

- [x] Animated empty state entrance (scale 0.82 to 1.0, 350ms on mount with back easing)
- [x] Confetti burst on 100% quiz score (PerfectScoreModal, 60 particles, fires 400ms after results appear)
- [x] Onboarding progress bar (replaces slide counter text, 4px bar with 300ms animated width)

## Round 52: Perfect Score Share, Gradient Progress Bar, Empty State CTAs

- [x] Share button in PerfectScoreModal (native share sheet with score message)
- [x] Linear gradient fill on onboarding progress bar (violet to cyan)
- [x] Verify and fix empty state CTA deep links: Bookmarks -> Solve tab, History -> Solve tab, Quiz History -> Practice tab

## Round 53: Onboarding Gradient Dots, History Share, Tab Badges

- [x] Gradient pill for active dot in onboarding slide indicators
- [x] Share button on History screen cards
- [x] Animated pulsing dot badge on Practice tab icon (pulses when daily challenge is incomplete)

## Round 54: Solve Tab Badge, Bookmarks Share, Share Haptic

- [x] Pulsing dot badge on Solve tab when daily solve goal not yet met
- [x] Share button on Bookmarks cards (same as History)
- [x] Success haptic after Share.share() resolves in History and Bookmarks

## Round 55: Badge Dismiss Animation, Share Count, Bulk Share

- [x] Badge dismiss animation on Solve tab (scale-out 1.0 to 0 over 200ms when goal met)
- [x] Share count tracking and display on History cards (persisted in AsyncStorage, shown below paperplane icon)
- [x] Bulk select and share mode on Bookmarks screen (long-press or Select button, bulk share sheet)
## Round 56: Full 44-Screen Validation Pass + APK Build
- [x] Validate all 44 screens one-by-one (Onboarding through Dev Render Test)
- [x] Fix missing icon mappings: arrow.clockwise, checkmark, checkmark.circle, doc.richtext, doc.text, exclamationmark.circle.fill, folder.badge.plus, folder.fill, info.circle.fill
- [x] Confirm 0 TypeScript errors and 33/33 tests passing
- [x] Checkpoint and trigger APK build
## Round 57: Double AI Tutor Response Output
- [x] Double streaming chat max_tokens: 1200/1600/2000 → 2400/3200/4000 (chatStream.ts)
- [x] Double non-streaming chat max_tokens: 600/1000/1500 → 1200/2000/3000 (routers.ts)
- [x] Update system prompt Length guidance: richer per-tier instructions, Try It Yourself section, Pro Tip + Common Mistake required
- [x] TypeScript: 0 errors, Tests: 33/33 passed

## Round 58: Detailed Mode Toggle in Tutor Settings
- [x] Add detailedMode boolean to TutorSettings type and DEFAULT_TUTOR_SETTINGS (default: false)
- [x] Add "Detailed Mode" ToggleRow to Response Style section in TutorSettingsModal
- [x] Add wand.and.stars.fill icon mapping to icon-symbol.tsx
- [x] Wire detailedMode into chatStream.ts: TutorProfile.detailedMode, token budget branching, system prompt instruction
- [x] Wire detailedMode into routers.ts non-streaming chat: input schema, token budget branching, system prompt instruction
- [x] Pass detailedMode from tutorSettings through sendStreamingChat tutorProfile payload in chat.tsx
- [x] TypeScript: 0 errors, Tests: 33/33 passed

## Round 59: Interactive AI Response Components + Smart Copy
- [ ] Update chatStream.ts system prompt with component auto-insert rules
- [ ] Update routers.ts CHAT_SYSTEM_PROMPT with component auto-insert rules
- [ ] Build InteractiveChecklist component (parse :::checklist blocks)
- [ ] Build InteractiveFlashcard component (parse :::flashcard blocks)
- [ ] Build InteractiveComparison component (parse :::comparison blocks)
- [ ] Build InteractiveTimeline component (parse :::timeline blocks)
- [ ] Build MermaidDiagram component (WebView on native, inline on web)
- [ ] Wire all new block renderers into AIResponseRenderer
- [ ] Implement Smart Copy action sheet (Copy Answer / Equations / Code / Notes / Summary)
- [ ] TypeScript: 0 errors, Tests: 33/33 passed

## Round 57: AI Tutor Interactive Components + Smart Copy
- [x] Update CHAT_SYSTEM_PROMPT (chatStream.ts + routers.ts) with auto-insert rules for checklist, flashcard, comparison, timeline, mermaid
- [x] Build interactive-blocks.tsx (InteractiveChecklist, InteractiveFlashcard, InteractiveComparison, InteractiveTimeline + parsers)
- [x] Extend AIResponseRenderer to parse :::type blocks and render interactive components
- [x] Create mermaid-diagram.tsx (WebView on native, fallback code block on web)
- [x] Intercept mermaid fenced blocks in AIResponseRenderer fence rule
- [x] Replace CopyButton with SmartCopyButton (5 options: Answer, Equations, Code, Notes, Summary)
- [x] TypeScript: 0 errors | Tests: 33/33 passed

## Round 58: AI Tutor Follow-up Features
- [x] Add Save to Deck button on InteractiveFlashcard back face (saves to bookmarks/flashcards deck)
- [x] Add Save to Notes option to SmartCopyButton action sheet (6th option alongside 5 copy options)
- [x] Replace single Copy button on MermaidDiagram with Export action sheet (Copy Source + Share Diagram)
- [x] TypeScript: 0 errors | Tests: 33/33 passed

## Round 59: AI Tutor UX Improvements
- [x] View in Flashcards in-app toast after Save to Deck on InteractiveFlashcard
- [x] Pin to top option in SmartCopyButton action sheet
- [x] Diagram type label in Mermaid header

## Round 60: AI Tutor Enhancements Batch
- [ ] Unpin option in Smart Copy sheet when session is already pinned
- [ ] Regenerate Diagram button on Mermaid blocks
- [ ] Diagram/flashcard count badge on Chat History session cards
- [ ] Detailed/Concise mode badge in chat header
- [ ] Wand quick-toggle in chat input bar for Detailed Mode
- [ ] Persist Detailed Mode preference per subject

## Round 60: AI Tutor Follow-up Features
- [x] Add Unpin option in Smart Copy sheet (dynamic Pin/Unpin based on state)
- [x] Add Regenerate Diagram button on Mermaid blocks (onRegenerate prop + button)
- [x] Add diagram and flashcard count badges to Chat History session cards
- [x] Add Detailed/Concise mode badge in chat header (tappable, subject-aware)
- [x] Add wand quick-toggle in input bar (per-subject mode flip)
- [x] Persist Detailed Mode preference per subject (subjectDetailedModes map)
- [x] Bump version to 1.1.8 (versionCode 13)

## Round 61: AI Tutor Tab Full Audit + Fix
- [x] Audit all AI Tutor tab features (chat.tsx, interactive-blocks.tsx, mermaid-diagram.tsx, ai-response-renderer.tsx, chatStream.ts, routers.ts)
- [x] Fix: onRegenerateDiagram prop was not passed to AIResponseRenderer in MessageBubble - Regenerate button now fires correctly
- [x] Confirmed: all other features (Smart Copy, Pin/Unpin, Save to Notes, mode badge, wand toggle, per-subject persistence, interactive blocks, Mermaid diagrams) verified working
- [x] Confirmed: dev server bundles cleanly with 0 errors after fix
- [x] Version bumped to 1.1.9 (versionCode 14)

## Round 62: Adaptive Intelligence Response Engine
- [ ] Stage 1: Add detectUserOverride() function and unit tests
- [ ] Stage 2: Add classifyQuestion() heuristic complexity classifier
- [ ] Stage 3: Replace fixed token tiers with dynamic budget map
- [ ] Stage 4: Update system prompts with completeness and length-matching rules
- [ ] Stage 5: Implement streaming continuation guard (feature-flagged)

## Round 62: AIRE (Adaptive Intelligence Response Engine) - COMPLETED
- [x] Stage 1: detectUserOverride() -- detects "short answer", "step by step", etc.
- [x] Stage 2: classifyQuestion() -- heuristic 1-5 difficulty classifier (0 latency)
- [x] Stage 3: computeTokenBudget() -- dynamic token budget (trivial=400, simple=900, medium=2800, complex=6500, phd=10000; 1.5x detailed / 0.6x concise; hard cap 12000)
- [x] Stage 4: System prompt updated with completeness/length-matching rules
- [x] Stage 5: Streaming continuation guard (CONTINUATION_ENABLED feature flag, MAX_CONTINUATIONS=3)
- [x] chatStream.ts fully rewritten with all 5 AIRE stages
- [x] routers.ts non-streaming chat route updated to use AIRE dynamic import
- [x] Complex keyword cap raised from 6 to 10 for better PhD-level detection
- [x] Unit tests: 16 new AIRE tests added (aire.test.ts)
- [x] TypeScript: 0 errors
- [x] Tests: 49/49 passing (16 new AIRE + 33 existing)
- [x] Version bumped to 1.2.0 (versionCode 15)

- [x] Round 62 (continued): Real-user test revealed AIRE was over-explaining trivial questions
- [x] Fix buildSolveSystemPromptScaled - broken string replacements replaced with conditional builder
- [x] Fix gradeLevel null validation error in academic.solve (added .nullable())
- [x] Fix isDetailed default to false in chatStream.ts (was defaulting to detailed mode for new users)
- [x] Add truncateForSimpleTier() post-processing in academic.solve for SIMPLE tier brevity
- [x] AIRE feedback loop: thumbs up/down on solution screen (saves to AsyncStorage for tuning)
- [x] Subject-aware classifier boost: per-topic TOPIC_BOOSTS array (50+ keywords, scores 1-5)
- [x] Continuation indicator UI: pulsing "Continuing..." badge in chat when AIRE Stage 5 fires

## Round 63: Three AIRE Improvements
- [x] Stage 1: AIRE feedback analytics screen (Settings sub-page, bar chart per subject)
- [x] Stage 2: Trivial question fast-path (skip JSON solve for difficulty:1, instant plain-text)
- [x] Stage 3: AIRE per-user memory (DB storage of feedback, server-side threshold adjustment)

## Round 64: AIRE Stage 4 - Per-Subject Calibration
- [x] Add aireSubjectCalibration DB table (userId, subject, multiplier, sampleCount, updatedAt)
- [x] Add computeSubjectMultiplier() server function: reads last 20 ratings per subject, returns 0.7x if >60% too-long, 1.3x if >60% too-short, else 1.0x
- [x] Wire subject multiplier into computeTokenBudget() in aire.ts
- [x] Add getSubjectCalibrations tRPC procedure for analytics screen
- [x] Update AIRE Analytics screen: show multiplier badge (Shorter/Calibrated/Longer) per subject row
- [x] Unit tests for computeSubjectMultiplier()
- [x] TypeScript: 0 errors
- [x] Tests: all passing (57/57)
- [x] Version bumped to 1.4.2

## Sentry Re-Integration (JS-Only, Safe — No Expo Plugin)
- [ ] Stage 1: Install @sentry/react-native, initialise client SDK in app/_layout.tsx (no Expo plugin in app.config.ts)
- [ ] Stage 2: Wire ErrorBoundary to Sentry.captureException
- [ ] Stage 3: Add @sentry/node to server, wire captureException to key tRPC routes
- [ ] Stage 4: Add Sentry breadcrumbs to auth flows
- [ ] Stage 5: Validate end-to-end, real-user test all flows, checkpoint

## Onboarding Flow
- [ ] Stage 1: Create 3 onboarding screens (Hook, How It Works, AIRE) with AsyncStorage gate
- [ ] Stage 2: Wire onboarding into app/_layout.tsx — show on first launch only
- [ ] Stage 3: Validate end-to-end, checkpoint

## Classroom Profile Photo
- [x] Stage 1: Add profile photo display to outside-classroom view (lobby/empty state header)
- [x] Stage 2: Add profile photo display to inside-classroom view (header + Manage tab display-name card)
- [x] Stage 3: TypeScript check + full test run + checkpoint

## Classroom Leaderboard + Feed Avatars & Onboarding Fixes
- [x] Stage A: Leaderboard avatars — extend LeaderboardEntry with avatarUri, persist on challenge, render on Ranks tab
- [x] Stage B: Feed card sharer avatars — extend ClassroomProblem with sharerAvatarUri, persist on share, render on feed cards
- [x] Stage C: Onboarding keyboard fix — name input rises with keyboard (KeyboardAvoidingView); Meet Your AI Tutor bottom message pushed up
- [x] Stage D: Bump versionCode to 24 (v1.4.3), trigger EAS APK build

## Onboarding Double-Celebration Fix
- [x] Option A: Remove false confetti from trial slide CTA, navigate directly to paywall, clean up showConfetti state

## Paywall Conversion Features
- [x] Feature 1: Maybe Later link below See Plans button on onboarding trial slide
- [x] Feature 2: Soft paywall modal when free user hits daily solve limit (contextual message banner added)
- [x] Feature 3: Trial countdown banner on home screen (days remaining in trial)

## Advanced Features Round 3
- [x] Feature 1: Challenge result share card (avatar + score + time visual)
- [x] Feature 2: Leaderboard top-3 podium row with avatars on Ranks tab
- [x] Feature 3: Streak milestone celebration (confetti + avatar + streak count at 7/14/30 days)

## Advanced Features Round 4
- [x] Feature 1: Staggered podium entrance animation (bronze slides in, silver, gold drops from above)
- [x] Feature 2: Share result as actual PNG image using react-native-view-shot
- [x] Feature 3: Streak Freeze power-up in Settings/Profile screen

## Advanced Features Round 5
- [x] Feature 1: Trial days-used progress bar on paywall screen
- [x] Feature 2: Streak freeze earn toast in settings when freeze is earned
- [x] Feature 3: Podium empty-state placeholder (Be first! ghost cards) for missing top-3 players

## Cloud Sync / Data Persistence Fix (Forensic Investigation)

- [ ] Add DB schema tables: solve_history, chat_sessions, user_progress, user_bookmarks, user_notes
- [ ] Add tRPC server endpoints for each table (CRUD, keyed by userId)
- [ ] Add client-side sync layer: upload on write, download on login
- [ ] Wire sync trigger into auth flow (after sign-in, pull all cloud data)
- [ ] Wire sync trigger into sign-out (no data wipe, just clear session token)
- [ ] End-to-end test: sign-in → create data → reinstall → sign-in → verify data restored

## Animation Revolution — Phase 1: Shared Utilities
- [x] Create hooks/use-animated-list.ts (staggered FadeInDown for FlatList items, respects reduceMotion)
- [x] Create components/animated-number.tsx (count-up from 0 to target, withTiming)
- [x] TypeScript check passes
- [x] All tests pass
- [ ] Checkpoint saved

## Animation Revolution — Phase 2: Tab Bar Spring-Scale + HapticTab Press
- [x] HapticTab: add scale-down on press, scale-up on release
- [x] Tab icons: spring-scale up when focused, scale down when unfocused
- [x] ScanTabIcon: pulse ring animation on the floating button
- [ ] TypeScript check passes
- [ ] All tests pass
- [ ] Checkpoint saved

## Animation Revolution — Phase 3: Quiz Overhaul
- [x] Shake animation on wrong answer selection
- [x] Green bounce/pulse on correct answer selection
- [x] Slide-left/right transition between questions
- [x] Count-up score reveal on quiz results screen
- [ ] TypeScript check passes
- [ ] All tests pass
- [ ] Checkpoint saved

## Deep Scan + Animation Revolution — Phase 4 (v1.8.0)
- [x] Fix history.tsx: move HistoryCard to module level (resolve circular TS type error from hooks-inside-renderItem)
- [x] Feature B: SlideInUp spring entrance on solution screen (Reanimated, respects reduceMotion)
- [x] Feature C: AnalyticsSkeletonScreen — replace "Loading..." text in aire-analytics.tsx
- [x] Feature C: RewardsSkeletonScreen — replace "Loading rewards..." text in rewards.tsx
- [x] Feature C: LeaderboardSkeletonScreen — add loading state to leaderboard.tsx (was rendering empty board)
- [x] Feature C: GlossarySkeletonScreen — replace missing loading state in glossary.tsx
- [x] Add 4 new skeleton components to skeleton.tsx (Analytics, Rewards, Leaderboard, Glossary)
- [x] Bump version to 1.8.0 / versionCode 33
- [x] 76/76 tests passing
- [x] TypeScript: 0 errors
- [x] Checkpoint saved

## Deep Scan Phase B + Full Audit (v1.8.1)
- [x] Deep scan audit: confirmed cloud sync fully wired (lib/cloud-sync.ts, server/routers.ts, auth-screen.tsx)
- [x] Deep scan audit: confirmed bookmarks staggered animation already wired (useAnimatedList in bookmarks.tsx)
- [x] Build SolutionSkeletonScreen in skeleton.tsx (content-shaped: header bar + answer card + 3 step cards + DotsLoader)
- [x] Wire SolutionSkeletonScreen into solution.tsx autoSolving branch (replaces SolvingOverlay)
- [x] 76/76 tests passing
- [x] TypeScript: 0 errors
- [x] Checkpoint saved

## v1.8.2 — Three New Features
- [x] Feature 1: Notes cloud push — wire pushNotes after note save in chat.tsx and solution.tsx
- [x] Feature 2: ScanSkeletonScreen — build component in skeleton.tsx, wire into scan.tsx
- [x] Feature 3: Offline sync retry queue — lib/sync-retry-queue.ts + NetInfo flush in _layout.tsx

## v1.8.3 — Three New Features
- [x] Feature 1: Sync retry test coverage — tests/sync-retry-queue.test.ts (13 tests, all passing)
- [x] Feature 2: Chat session real-time push — already wired in lib/chat-sessions.ts saveSession() (cloudPushSession fire-and-forget on every save)
- [x] Feature 3: Onboarding screen transition — useScreenTransition (320ms, translateY 20) wraps root Animated.View in onboarding.tsx

## v1.8.4 — Three New Features (Jul 26 2026)
- [x] Feature A: Paywall A/B test — lib/ab-test.ts + paywall.tsx + onboarding.tsx variant switching
- [x] Feature B: Streak at-risk notification — scheduleStreakAtRiskCheck in notifications.ts + _layout.tsx AppState hook + cancelStreakAtRiskReminder in index.tsx after solve
- [x] Feature C: Classroom share deep link — tutorsnap://classroom/join?code=XXXX handler in _layout.tsx + classroom.tsx useFocusEffect pre-fill + handleShareCode deep link URL

## v1.8.5 — Three New Features (Jul 26 2026)
- [x] Feature A: A/B test analytics — logAbTestEvent in lib/ab-test.ts, fire on paywall view + conversion
- [ ] Feature B: Classroom QR code — Show QR button in manage tab, Modal with react-native-qrcode-svg
- [x] Feature C: Streak personalisation — ALREADY DONE (scheduleStreakAtRiskCheck body already includes streak count: "You're on a ${currentStreak}-day streak")

## v1.8.5 — A/B Analytics, Classroom QR, Streak Personalisation
- [x] Feature A: A/B test analytics — logAbTestEvent in lib/ab-test.ts, fire on paywall view + conversion
- [x] Feature B: Classroom QR code — Show QR button + Modal with react-native-qrcode-svg, renders tutorsnap://classroom/join?code=XXXX
- [x] Feature C: Streak at-risk personalisation — already wired in v1.8.4b (scheduleStreakAtRiskCheck reads currentStreak and includes it in notification body)
- [x] Deep scan: all features verified, 89/89 tests passing, 0 TS errors

## v1.8.6 — A/B Dashboard, QR Share, Variant Lock (Jul 26 2026)
- [x] Feature A: A/B results dashboard — app/ab-test-dashboard.tsx (hidden dev screen, long-press version footer in settings.tsx, route registered in _layout.tsx)
- [x] Feature B: QR code share button — classroom.tsx QR modal: Share QR button captures PNG via captureRef + expo-sharing, web fallback via Share.share
- [x] Feature C: Paywall variant lock — lockVariant() + unlockVariant() in lib/ab-test.ts, getTrialVariantConfig() checks lock first, lockVariant() called in paywall.tsx handleStartTrial after trial_started
- [x] Deep scan: all features verified, 89/89 tests passing, 0 TS errors

## v1.8.8 — Transition Polish (Jul 26 2026)
- [x] Feature A: Onboarding slide transitions (SlideWrapper Reanimated component — fade+scale on active slide)
- [x] Feature B: Haptic punctuation on portal exit (Success notification at bloom peak via runOnJS)
- [x] Feature C: Dark-mode bloom (brand-violet rgba(124,58,237,0.45) for dark, white rgba(255,255,255,0.95) for light)
- [x] Deep scan: all features verified, 89/89 tests passing, 0 TS errors, Metro clean

## v1.8.9 — Skip Animation + Tab Entry Animations (Jul 26 2026)
- [x] Feature 1: Skip button scale+fade animation before portal exit in onboarding.tsx
- [x] Feature 3a: Staggered entry animation on Scan and Practice tab screens
- [x] Feature 3b: Staggered entry animation on History and Chat tab screens
- [x] Deep scan: all features verified, tests passing, Metro clean

## v1.9.0 — RC Integration + Chat Layout + Production Fixes (Jul 26 2026)
- [x] Phase A: Fix failing test — update revenuecat-env.test.ts to reflect RC SDK is back in use
- [x] Phase B: RC logIn — call Purchases.logIn(openId) after user signs in (lib/subscription.ts + auth hook)
- [x] Phase C: tRPC subscription.getStatus — server-side query reading subscriptions table (server/routers.ts)
- [ ] Phase D: U9 — hide paywall dev mode banner in production builds (__DEV__ guard in paywall.tsx)
- [ ] Phase E: Q5 — fix paywall timer: longer delay (3000ms) + skip if already shown this session (_layout.tsx)
- [x] Phase F: Chat layout — pin composer to bottom, fix auto-scroll, remove scroll resistance (chat.tsx)
- [ ] Phase G: Deep scan — TS check, all tests, screenshots of every changed screen
- [ ] Phase H: Final checkpoint + EAS APK build

## v2.0.0 — Webhook Auth, Server Badge, Subscription History (Jul 27 2026)
- [x] Phase 1: Webhook auth tests — vitest tests for correct/wrong/absent secret + REVENUECAT_SETUP.md update
- [x] Phase 2: Server-verified premium badge — trpc.subscription.getStatus.useQuery() in settings.tsx
- [x] Phase 3: subscription.history tRPC query — server/routers.ts subscriptionRouter
- [x] Phase 4: Subscription history screen — app/subscription-history.tsx + settings nav row
- [ ] Phase 5: Fix pending todo items D & E — verify __DEV__ guard and paywall timer cleanup in code, mark [x]
- [ ] Phase 6: Deep scan — TS check, all tests, screenshots of every changed screen
- [ ] Phase 7: Final checkpoint + EAS APK build v2.0.0

## Bug Fixes (discovered in end-to-end walkthrough — Jul 2026)

- [x] Fix 1: Add /api proxy to Metro dev server so subscription history screen works in browser preview
- [x] Fix 2: Add isInGracePeriod boolean column + migration, update webhook handler and getStatus
- [x] Fix 3: Fix onboarding plan card layout — vertical stack on web, horizontal on mobile
- [x] Fix 4: Tighten duplicate-webhook idempotency guard to skip events with same purchased_at_ms
- [x] Fix 5: Add web-compatible Alert fallback to cancel-retention screen
