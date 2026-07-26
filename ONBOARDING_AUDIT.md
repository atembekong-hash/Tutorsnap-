# Onboarding Fix Audit — July 2026

## Issues to Fix (13 total)

### onboarding.tsx

**Phase 1 — Safe Area (Issues #1, #2, #3)**
- backBtn: position absolute top:54 → replace with safeTop + 8 inline style
- skipBtn: position absolute top:56 → replace with safeTop + 10 inline style  
- progressBarContainer: position absolute top:56 → replace with safeTop + 10 inline style
- All three need useSafeAreaInsets().top added to component

**Phase 2 — Grade Scroll (Issue #6)**
- Grade ScrollView at line ~624: add nestedScrollEnabled={true}

**Phase 3 — Tutor Preview (Issues #7, #8)**
- Grade fallback text: "Not set - you can change this anytime" → "Not set"
- Wrap 5 preview rows + hint in ScrollView with nestedScrollEnabled={true}

**Phase 4 — Trial Slide (Issues #9, #10, #11)**
- CTA label: "See Plans" → "Start Free Trial" (only on last slide)
- maybeLaterText style: remove textDecorationLine: "underline"
- Remove hardcoded price "Then $9.99/mo or $69.99/yr" → replace with muted "Prices shown on next screen"

**Phase 6 — Photo Slide (Issues #3, #4)**
- "Change photo" link: smaller font (12px), colors.muted, no border
- Add scale animation when avatarUri first set

**Phase 7 — Short Screen Overflow (Issue #5)**
- Subjects grid: wrap in ScrollView with nestedScrollEnabled
- Grade ScrollView: add maxHeight: SCREEN_H * 0.45

### paywall.tsx

**Phase 5 — Paywall (Issues #12, #13)**
- closeBtn top:52 → insets.top + 8 (already imports useSafeAreaInsets)
- Add error/retry state when offeringsLoaded=true but offerings={}

## Checkpoint IDs
- Pre-work baseline: 86f046d9
- Phase 1 complete: TBD
- Phase 2 complete: TBD
- Phase 3 complete: TBD
- Phase 4 complete: TBD
- Phase 5 complete: TBD
- Phase 6 complete: TBD
- Phase 7 complete: TBD
- Final: TBD
