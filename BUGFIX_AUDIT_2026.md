# Bug Fix Audit — TutorSnap AI v2.5.x
Date: 2026-07-26

## Files to scan before editing
1. app/(tabs)/history.tsx — History page access
2. app/(tabs)/_layout.tsx — Tab registration, notification dots, camera glow
3. app/result.tsx — Done button, share options, related topics copy
4. app/(tabs)/practice.tsx — Full page scroll
5. app/leaderboard.tsx — Back button navigation
6. app/solution.tsx OR app/result.tsx — Header overlap with status bar
7. app/flashcards.tsx OR flashcard component — Card scroll

## Phase Tracking
- [ ] Phase 1: History access
- [ ] Phase 2+3: Done button + share options
- [ ] Phase 4: Practice scroll
- [ ] Phase 5: Notification dots default off
- [ ] Phase 6+7: Camera glow + leaderboard back
- [ ] Phase 8: Solution header overlap
- [ ] Phase 9+10: Flashcard scroll + related topics copy
- [ ] Phase 11: Deep scan + EAS build
