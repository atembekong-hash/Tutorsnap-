# TutorSnap Deep Scan Audit — v1.8.x
Date: 2026-07-26

## Feature Status

### 1. Cloud Sync
- **Status: ALREADY IMPLEMENTED**
- lib/cloud-sync.ts — 432 lines, full push/pull for history, bookmarks, progress, chat sessions, notes
- DB tables: solve_history, chat_sessions, user_progress, user_bookmarks, user_notes (drizzle/schema.ts)
- tRPC endpoints: cloudSyncRouter in server/routers.ts (pushSolveHistory, pullSolveHistory, pushChatSession, pullChatSessions, pushProgress, pullProgress, pushBookmarks, pullBookmarks, pushNotes, pullNotes)
- Write-path hooks: pushSolve called from index.tsx + scan.tsx; pushChatSession from lib/chat-sessions.ts; pushProgress from lib/progress.ts; pushBookmarks from lib/bookmarks.ts
- Auth-flow wiring: auth-screen.tsx calls resetSyncClient() + pullAllFromCloud() + pushAllLocalDataToCloud() on sign-in
- **Gap found**: notes saveNote() in chat.tsx and solution.tsx does NOT call pushNotes. The _pushAllNotes helper in cloud-sync.ts reads from "@tutorsnap/savedNotes" key but individual note saves don't push. LOW PRIORITY — notes are pushed on next pullAllFromCloud (sign-in).

### 2. Solution Skeleton Screen
- **Status: NEEDS IMPLEMENTATION**
- Current: SolvingOverlay (opaque modal with brain emoji + dots) shown during autoSolving state
- Goal: Replace with SolutionSkeletonScreen — content-shaped skeleton that mirrors the actual solution layout (header bar, answer card, steps list) so the transition from loading → content feels smooth
- Files to touch: components/skeleton.tsx (add SolutionSkeletonScreen), app/solution.tsx (swap SolvingOverlay for SolutionSkeletonScreen in autoSolving branch)

### 3. Bookmarks Staggered Animation
- **Status: ALREADY IMPLEMENTED**
- app/bookmarks.tsx line 270: useAnimatedList({ staggerMs: 45, durationMs: 280 })
- app/bookmarks.tsx line 282: ReAnimated.View entering={getListEntering(index)} wraps each card
- FlatList at line 821 uses renderItem that applies the animation

## Additional Gaps Found During Scan

### A. History screen — HistoryCard module-level fix (v1.8.0)
- **Status: FIXED in v1.8.0 checkpoint**

### B. Solution screen — SlideInUp entrance (v1.8.0)
- **Status: FIXED in v1.8.0 checkpoint**

### C. Skeleton screens for Analytics/Rewards/Leaderboard/Glossary (v1.8.0)
- **Status: FIXED in v1.8.0 checkpoint**

## Phase Plan
- Phase 2: Build SolutionSkeletonScreen + wire into solution.tsx
- Phase 3: Checkpoint + screenshot
- Phase 4: Full real-user test pass
- Phase 5: Final checkpoint + deliver
