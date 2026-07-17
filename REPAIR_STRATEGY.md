# TutorSnap — Critical Repair Strategy

## Root Cause Analysis: Scanner Hang

### The Problem
Users report: "Scanner stares at me forever" when attempting to solve an image.

### Root Cause
The `IMAGE_SOLVE_SYSTEM_PROMPT` demands:
- "AT LEAST 10-15 steps" with "5-8 sentences each"
- "A COMPLETE similar problem solved from scratch — this example must itself have at least 8 steps"
- "A LONG, RICH paragraph (10-15 sentences)" for conceptExplained
- "LONG narrative (at least 300 words)" for workedExample.solution

**This is impossible to deliver within 2500 tokens.** The model either:
1. Truncates mid-response → JSON parse fails → generic error
2. Hangs trying to generate → request timeout (no timeout configured)
3. Returns incomplete JSON → parse error

### Why Previous Speed Attempts Failed
- **Image compression**: Added device-side latency, made things slower
- **Instant capture**: Didn't address the real bottleneck (server-side prompt)
- **detail: "low"**: Caused vision model to silently fail on some providers
- **Parallel race**: Helped slightly, but both models hit the same prompt problem

### The Real Solution
**Rewrite the prompt to be realistic and fast-responding:**
- 3-5 clear steps (not 10-15)
- 2-3 sentences per step (not 5-8)
- No 300-word worked example
- No "LONG, RICH paragraph" conceptExplained
- Realistic token budget: 800 tokens (not 2500)

This still provides excellent educational value — just focused and concise instead of exhaustive.

---

## Repair Strategy: Priority Order

### TIER 1: CRITICAL (Blocks Core Functionality)

#### Fix #1: IMAGE_SOLVE_SYSTEM_PROMPT Rewrite
- **File**: `server/routers.ts` lines 102-140
- **Change**: Replace exhaustive prompt with fast, realistic prompt
- **Result**: Scanner will complete in 3-5 seconds instead of hanging
- **Impact**: Unblocks scanner for all users

#### Fix #2: Add Request Timeout
- **File**: `lib/trpc.ts`
- **Change**: Add 30-second timeout to all mutations
- **Result**: Hung requests fail gracefully instead of hanging forever
- **Impact**: Prevents infinite waits

#### Fix #3: Improve Error Messages
- **File**: `app/(tabs)/scan.tsx` lines ~450-500
- **Change**: Show specific error hints (image quality, network, etc.)
- **Result**: Users know why solve failed and how to fix it
- **Impact**: Better UX on failures

---

### TIER 2: HIGH (Affects Multiple Workflows)

#### Fix #4: Dead Code Cleanup
- **File**: `app/(tabs)/index.tsx` line 373
- **Change**: Remove unused `DailyChallengeCard` function
- **Result**: Cleaner codebase, no confusion
- **Impact**: Maintainability

#### Fix #5: Unused Imports & Variables
- **Files**: Multiple (10+ files)
- **Change**: Remove all unused imports and variables
- **Result**: Cleaner code, faster type checking
- **Impact**: Code quality

#### Fix #6: Unguarded Timers (Remaining 3)
- **Files**: `app/quiz-history-detail.tsx:307`, `app/quiz.tsx:167`, `app/solution.tsx:115`
- **Change**: Add useRef cleanup guards
- **Result**: No memory leaks or state updates after unmount
- **Impact**: Stability

---

### TIER 3: MEDIUM (Edge Cases & Data Integrity)

#### Fix #7: Duplicate Progress Storage
- **Files**: `lib/progress.ts`, `server/routers.ts`
- **Change**: Single source of truth (server), AsyncStorage is cache only
- **Result**: No out-of-sync state
- **Impact**: Data integrity

#### Fix #8: No Offline Queue
- **Files**: `app/(tabs)/scan.tsx`, `server/routers.ts`
- **Change**: Queue failed solves, retry when online
- **Result**: Users don't lose work
- **Impact**: Reliability

#### Fix #9: Missing Soft Deletes
- **File**: `drizzle/schema.ts`
- **Change**: Add `deleted_at` timestamp to all data tables
- **Result**: Audit trail, data recovery
- **Impact**: Data integrity

#### Fix #10: No Cascade Delete Protection
- **File**: `server/routers.ts` (classroom delete)
- **Change**: Cascade or prevent orphaned records
- **Result**: Database consistency
- **Impact**: Data integrity

---

### TIER 4: SECURITY & COMPLIANCE

#### Fix #11: Input Validation
- **File**: `server/routers.ts` (solve mutations)
- **Change**: Validate problem text length, content type
- **Result**: Prevent abuse, injection attacks
- **Impact**: Security

#### Fix #12: Rate Limiting
- **File**: `server/_core/index.ts`
- **Change**: Add rate limiter middleware (10 solves/min per user)
- **Result**: Prevent abuse, cost control
- **Impact**: Security & cost

#### Fix #13: Classroom Permission Checks
- **File**: `server/routers.ts` (classroom routes)
- **Change**: Server-side verification of ownership/membership
- **Result**: Prevent unauthorized access
- **Impact**: Security

---

## Execution Plan

### Phase 1: Unblock Scanner (30 minutes)
1. Rewrite `IMAGE_SOLVE_SYSTEM_PROMPT` (realistic prompt)
2. Add request timeout to tRPC
3. Improve error messages in scan UI
4. Test: Scan a simple math problem, verify 3-5 second response

### Phase 2: Code Quality (20 minutes)
1. Remove dead code (`DailyChallengeCard`)
2. Remove unused imports (10+ files)
3. Add timer cleanup guards (3 files)
4. Run TypeScript check, ESLint

### Phase 3: Data Integrity (40 minutes)
1. Add soft deletes to schema
2. Add cascade delete protection
3. Consolidate progress storage
4. Add offline queue for failed solves

### Phase 4: Security (30 minutes)
1. Add input validation
2. Add rate limiting
3. Add permission checks
4. Test: Attempt unauthorized access, verify blocked

### Phase 5: Testing & Validation (40 minutes)
1. Full regression test (all workflows)
2. Performance profiling
3. Error state testing
4. Final checkpoint

---

## Success Criteria

- ✅ Scanner completes in <5 seconds
- ✅ No hung requests (timeout after 30s)
- ✅ All workflows tested end-to-end
- ✅ 0 TypeScript errors
- ✅ 0 unused imports/variables
- ✅ No memory leaks (timers cleaned up)
- ✅ Data integrity verified (soft deletes, cascades)
- ✅ Security checks pass (input validation, rate limiting, permissions)

