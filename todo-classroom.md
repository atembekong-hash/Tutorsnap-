# Classroom Production Readiness TODO

## Phase 1: Discovery ✓
- [x] Map classroom architecture (local-first AsyncStorage)
- [x] Identify all screens involved
- [x] Identify all user journeys (teacher + student)
- [x] Identify all permission gates
- [x] Identify all state transitions
- [x] Identify all edge cases

## Phase 2: Teacher Journey Execution
- [ ] Navigate to Classroom tab — verify lobby state renders correctly
- [ ] Create a classroom with a name — verify code generated
- [ ] Verify Manage tab auto-selected after creation
- [ ] Copy classroom code — verify clipboard feedback
- [ ] Share invite via Share sheet — verify deep link format
- [ ] Show QR code modal — verify QR renders
- [ ] Navigate to Solution screen and share a problem to feed
- [ ] Verify problem appears in Feed tab
- [ ] Assign problem as homework with due date
- [ ] Verify homework appears in HW tab with correct due date grouping
- [ ] Verify Analytics (Stats) tab shows correct counts
- [ ] Verify teacher has Remove Problem button on feed cards
- [ ] Verify teacher has Assign Homework button on feed cards
- [ ] Verify Reset Leaderboard works
- [ ] Test Delete Classroom — verify state clears

## Phase 3: Student Journey Execution
- [ ] Join classroom with teacher's code — verify name prompt appears
- [ ] Enter display name and classroom name — verify join completes
- [ ] Verify Feed tab shows shared problems
- [ ] Verify student does NOT see Analytics tab
- [ ] Verify student sees homework in HW tab
- [ ] Mark homework as done — verify progress bar updates
- [ ] Unmark homework — verify state reverts
- [ ] Tap a problem card — verify navigates to Solution screen
- [ ] Challenge from feed — verify navigates to challenge screen with classCode
- [ ] Verify leaderboard updates after challenge completion
- [ ] Edit display name — verify leaderboard name updates
- [ ] Test Leave Classroom — verify state clears

## Phase 4: Edge Cases & Error Handling
- [ ] Join with invalid code (< 4 chars) — verify error alert
- [ ] Join with 4-char code — verify it works (min is 4)
- [ ] Create classroom with empty name — verify default name used
- [ ] Search feed with no results — verify empty state
- [ ] Filter by subject — verify correct items shown
- [ ] Sort by oldest/homework_first — verify order changes
- [ ] Homework tab with no homework — verify empty state
- [ ] Leaderboard tab with no entries — verify empty state
- [ ] Analytics tab with no feed items — verify empty state
- [ ] Deep link handling — verify pending code picked up on focus

## Phase 5: Defect Repair
- [ ] Fix any issues discovered during execution

## Phase 6: Regression Testing
- [ ] Re-verify teacher journey end-to-end
- [ ] Re-verify student journey end-to-end
- [ ] Verify no regressions in other tabs

## Known Architectural Limitations (by design)
- Classroom is local-only (AsyncStorage) — no real-time sync across devices
- Students joining a classroom only join locally on their own device
- The join code is a local identifier — no server validates it
- Leaderboard only updates when a challenge is completed with a classCode param
- Analytics only shows teacher's own locally-shared problems
