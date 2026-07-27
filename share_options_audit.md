# Share Options Audit — Jul 27 2026

## Current State (quiz.tsx)
- Single "Share Results" button in ScoreSummary component (lines 337-361)
- On mobile: calls `Share.share({ message })` — opens native share sheet
- On web: copies text to clipboard via `expo-clipboard`
- Message format: emoji + name + subject + score + time + bonus + "Practiced with TutorSnap"

## Imports already in quiz.tsx
- `Share` from react-native (already imported)
- `* as Clipboard` from expo-clipboard (already imported)
- `Platform` from react-native (already imported)
- `Modal` from react-native (already imported)
- `Linking` NOT imported — need to add for WhatsApp/Twitter deep links

## Plan: Replace single button with "Share" button that opens a bottom-sheet modal
Share options to implement:
1. **Copy Text** — copies the message string to clipboard (already works)
2. **Share via WhatsApp** — `Linking.openURL("whatsapp://send?text=...")`
3. **Share to Twitter/X** — `Linking.openURL("https://twitter.com/intent/tweet?text=...")`
4. **More Options (Native Share)** — `Share.share({ message })` — opens system share sheet
5. **Cancel** — closes the modal

## Implementation approach
- Add `showShareSheet` state boolean to ScoreSummary
- Replace the single TouchableOpacity share button with one that sets `showShareSheet=true`
- Add a Modal with a bottom-sheet style View containing the 4 share option rows + Cancel
- Each row: icon + label + onPress handler
- Import `Linking` from react-native (already in RN, no install needed)

## Files to change
- `app/quiz.tsx` — ScoreSummary component (lines ~218-364)
  - Add `showShareSheet` state
  - Add `Linking` import
  - Replace single share button with sheet-opener
  - Add Modal bottom sheet with 4 options

## Status
- NOT yet implemented
