# Master Audit v6 — v1.8.6 Session

## Current checkpoint: 3139704e (v1.8.5)

## Three features to implement:

### Feature A: A/B Results Dashboard
- Hidden dev screen behind long-press on version footer in settings.tsx (line 1848-1856)
- Version footer is a `<View style={styles.versionFooter}>` wrapping two Text elements
- Need to: wrap in TouchableOpacity with onLongPress, create app/ab-test-dashboard.tsx, register in _layout.tsx
- ab-test.ts exports: getTrialVariantConfig, getDefaultTrialVariantConfig, logAbTestEvent, TrialVariantConfig
- logAbTestEvent stores events in AsyncStorage key "@tutorsnap/ab_test_events" (to verify)

### Feature B: QR Code Share Button
- classroom.tsx line 255: `const [showQRModal, setShowQRModal] = useState(false);`
- QR Modal at line 1879-1912 — has QRCode component, Done button
- Need to: add "Share QR" button inside the modal that captures QR as image and shares via expo-sharing
- react-native-qrcode-svg supports `getRef()` to get SVG ref — can use expo-file-system + expo-sharing
- Alternative: use ViewShot (react-native-view-shot) to capture the QR view as image

### Feature C: Paywall Variant Lock
- ab-test.ts line 103-105: assigns variant and saves to AsyncStorage
- Need to add: `lockVariant()` function that sets a separate "locked" flag
- `getTrialVariantConfig()` should check locked flag and skip re-randomisation
- `handleStartTrial` in paywall.tsx (line 134) calls `logAbTestEvent("trial_started", ...)` — add `lockVariant()` call here

## Files to touch:
- Feature A: app/settings.tsx, app/ab-test-dashboard.tsx (new), app/_layout.tsx, lib/ab-test.ts
- Feature B: app/(tabs)/classroom.tsx
- Feature C: lib/ab-test.ts, app/paywall.tsx

## Mitigation protocol:
1. One feature at a time
2. Checkpoint between each feature
3. Fresh file reads at start of each phase
4. Tests after each feature (89 tests currently passing)
5. No build at end
