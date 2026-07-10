# Subject Picker Mobile Diagnostic — Round 21

## Root Cause Found

The `SubjectPicker` modal uses a **sibling layout** inside the `<Modal>`:

```jsx
<Modal transparent animationType="slide">
  <Pressable style={styles.backdrop} />   {/* flex: 1 — takes ALL space */}
  <View style={styles.sheet} />           {/* sits BELOW the backdrop */}
</Modal>
```

### Why it works on web but breaks on mobile

**Web (React Native Web):** The Modal renders into a CSS `position: fixed` overlay. The two sibling elements stack visually because CSS stacking context works differently — the sheet appears at the bottom of the viewport even though it is a sibling after the backdrop.

**Native (iOS/Android):** Inside a transparent Modal, the root is a full-screen flex column. The `Pressable` backdrop has `flex: 1` which takes ALL available height, pushing the `<View sheet>` completely off-screen below the viewport. The sheet is technically rendered but invisible because it is below the screen boundary.

### Additional issues found

1. `styles.sheet` has `maxHeight: "72%"` — percentage heights on native can be unreliable inside Modal without explicit parent dimensions.
2. No `statusBarTranslucent` prop on Modal — on Android, the modal may not cover the status bar correctly.
3. The sheet has no explicit height or `flex` — it relies on content to size itself, which can collapse on native.

## Fix Required

Replace the sibling pattern with the **absolute positioning pattern** used by `cheat-sheet-bottom-sheet.tsx`:

```jsx
<Modal transparent statusBarTranslucent>
  {/* Backdrop: absoluteFillObject covers entire screen */}
  <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" }}>
    <Pressable style={{ flex: 1 }} onPress={close} />
  </View>
  {/* Sheet: absolute positioned at bottom */}
  <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "75%" }}>
    ...content...
  </View>
</Modal>
```

This ensures:
- Backdrop covers full screen on both native and web
- Sheet is always anchored at the bottom regardless of flex layout
- Content is visible and scrollable on both platforms

## Files to change
- `/home/ubuntu/mathgenius-ai/components/subject-picker.tsx` — rewrite Modal structure
