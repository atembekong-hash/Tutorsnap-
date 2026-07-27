# Practice Tab Scroll Fix Audit — Jul 27 2026

## Problem
Only the lower portion of the Practice tab screen scrolls. The header, subject picker, and difficulty selector are fixed/non-scrollable.

## Root Cause
The JSX is split into two ReAnimated.View blocks:
1. Lines 301-397: First ReAnimated.View (staggeredStyles[0]) — contains header, subject picker, difficulty. NO ScrollView. Fixed.
2. Lines 398-970: Second ReAnimated.View (staggeredStyles[1]) — wraps the ScrollView. Only lower content scrolls.

## Fix Required
Move the header/subject/difficulty block (lines 301-397) INSIDE the ScrollView as the first child, so everything scrolls together.

Specifically:
- Remove `</ReAnimated.View>` at line 397 (closes staggeredStyles[0])
- Remove `<ReAnimated.View style={[{ flex: 1 }, staggeredStyles[1]]}>` at line 398
- Move the `<ScrollView ...>` opening to BEFORE the header (after line 300)
- The staggeredStyles[0] animated wrapper should wrap the entire ScrollView content
- The staggeredStyles[1] wrapper can be removed or merged

## Files to Change
- `app/(tabs)/practice.tsx` (lines 298-400)

## Status
- Fix NOT yet applied
- Checkpoint needed after fix
