# Solve Page Audit Notes

## File: /home/ubuntu/mathgenius-ai/app/(tabs)/index.tsx (2091 lines)

## Top bar (lines 678-772) — DO NOT TOUCH except:
- Row 1: "TutorSnap" label (greeting) + icon buttons (history, theme, premium, settings) — KEEP
- Row 2: grade badge + streak badge — KEEP
- MISSING: "Solve any problem" subtitle line needs to be added below the greeting in Row 1 area

## Current render order (lines 665-1417):
1. Header (Row1 + Row2) — lines 678-772
2. Daily Goal Progress bar — lines 774-806
3. Shield Used Toast — lines 809-815
4. Homework Due Soon Banner — lines 817-845
5. TodayRow (horizontal widget strip) — lines 848-868
6. StudyTipCard (only when online + subject selected) — lines 871-873
7. Input Section (inputCard with TextInput + toolbar) — lines 876-954
8. Grade Level Selector Pill — lines 957-977
9. Offline Warning — lines 980-992
10. Solve Row (SubjectPicker + VoiceButton + SolveBtn) — lines 995-1041
11. UpsellNudgeBanner — lines 1044-1048
12. Error message — lines 1050-1066
13. Animated.View containing:
    a. "Ask AI Tutor" banner — lines 1070-1101
    b. Recent subjects row — lines 1104-1130
    c. Quick Ask inline input — lines 1133-1210
    d. Quick Ask history dropdown — lines 1213-1232
    e. Subject picker for Quick Ask — lines 1235-1241
    f. Continue last chat (Swipeable) — lines 1244-1293
    g. Undo toast — lines 1295-1326
14. Feature Cards Row (Scan + Practice + Progress) — lines 1330-1368
15. Example Problems section — lines 1371-1406

## Issues found:
- No "Solve any problem" subtitle in header
- solveRow: SubjectPicker has maxWidth:200 but no flex shrink guard; VoiceButton is fixed 50px; SolveBtn has flex:1 but inner has no flex — can overflow
- featureCard: 3 equal flex:1 cards — text clips on narrow screens (no minWidth)
- quickAskRow: subject chip has maxWidth:90 which truncates long subject names
- The Animated.View block groups Ask AI Tutor + Quick Ask + Continue Last Chat — confusing visual grouping, no dividers
- UpsellNudgeBanner appears between solve button and AI tutor banner with no breathing room
- No widgets between Feature Cards and Example Problems (user wants widgets before suggested questions)
- Example Problems section has weak visual weight

## Redesign plan:
### Keep (untouched):
- Header Row1 + Row2 (top bar icons/badges)
- Daily Goal Progress bar
- Shield Used Toast
- Homework Due Soon Banner
- TodayRow widget strip
- StudyTipCard
- Grade Level Selector Pill
- Grade Picker Modal
- Paywall Modal
- Math Keyboard
- Badge Unlock Modal
- Cheat Sheet Bottom Sheet

### Fix:
1. Add "Solve any problem" subtitle below "TutorSnap" in header
2. Fix solveRow overflow: give SolveBtn flex:1 with proper inner flex
3. Fix featureCard: add minWidth:0 and numberOfLines on text
4. Fix quickAskRow subject chip: increase maxWidth or use flex shrink
5. Separate Animated.View into cleaner visual groups with proper spacing

### Restructure render order:
1. Header (unchanged top bar)
2. Daily Goal Progress bar
3. Shield/Homework banners
4. TodayRow
5. StudyTipCard
6. ── SOLVE SECTION ──
   - Section label "SOLVE A PROBLEM"
   - Input Card (TextInput + toolbar)
   - Grade Level Pill + Offline Warning (inline row)
   - Solve Row (SubjectPicker + Mic + SolveBtn) — fixed overflow
   - Error message
7. ── AI TUTOR SECTION ──
   - Ask AI Tutor banner (full width, prominent)
   - Quick Ask row (below, secondary)
   - Recent subjects chips
   - Continue last chat link
8. ── EXPLORE SECTION ──
   - Section label "EXPLORE"
   - Feature Cards (Scan + Practice + Progress) — 3 col
9. ── BEFORE EXAMPLES — NEW WIDGETS ──
   - Recent Solves mini-history (last 3 solves, horizontal scroll)
   - Quick Tips strip (3 tips: "Type or speak", "Pick a subject", "Get step-by-step")
   - UpsellNudgeBanner (moved here)
10. ── TRY AN EXAMPLE ──
    - Section label with subject-aware header
    - Example cards (existing)

## State additions needed:
- recentSolves: HistoryItem[] — load last 3 from AsyncStorage "math_history" on focus
