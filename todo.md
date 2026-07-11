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
- [ ] Redeem a friend's code input in Settings
- [ ] Weekly affiliate digest notification (Monday 9am)
- [ ] Pending days expiry warning banner (90-day idle)
- [ ] Full audit: TypeScript / broken imports / null safety
- [ ] Full audit: functional — every screen, button, modal
- [ ] Full audit: visual — spacing, alignment, font sizes
- [ ] Full audit: accessibility — accessibilityLabel coverage
- [ ] Full audit: state integrity — stale data, error recovery
