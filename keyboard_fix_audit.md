# Keyboard Fix Audit — Jul 27 2026

## Problem
The name input on the onboarding screen (slide 1) was hidden behind the keyboard when it opened on mobile.

## Root Cause
The `KeyboardAvoidingView` wrapping the entire screen had `behavior="padding"` on iOS, but the horizontal paging `ScrollView` between the KAV and the input prevented the keyboard avoidance from propagating to the input inside the slide.

## Fix Applied
1. Outer `KeyboardAvoidingView` at line 473: `behavior={Platform.OS === "ios" ? "padding" : "height"}`, `keyboardVerticalOffset={0}`
2. Horizontal `ScrollView` at line 529: added `keyboardShouldPersistTaps="handled"` so taps on the Next button work while keyboard is open
3. Name input at line 566: added `onSubmitEditing={goNext}` so pressing "Done" on keyboard advances to next slide
4. Removed inner `KeyboardAvoidingView` that was wrapping just the name input (was causing double-offset)

## Files Changed
- `app/onboarding.tsx` (lines 473-476, 529-538, 559-582)

## Status
- TypeScript: 0 errors (LSP clean)
- Checkpoint needed: YES (not yet saved)
