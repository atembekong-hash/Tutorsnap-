# OTA_UPDATE_POLICY.md
**Version:** 1.0  
**Last Updated:** 2026-07-31  
**Status:** Active — applies to all Expo OTA update decisions

---

## Purpose

This document defines the policy for using Expo Updates (over-the-air updates) in TutorSnap. OTA updates are a powerful tool that, if misused, can break the app for users on older native builds. This policy ensures OTA updates are used safely and conservatively.

---

## When OTA Updates Are Permitted

An OTA update may be published when all of the following conditions are true:

- The update contains only JavaScript and asset changes (no native module changes)
- The update does not add or modify any Expo SDK APIs that require native support
- The update does not add or modify any native permissions
- The update does not change the app's Expo runtime version
- The update is fully compatible with every installed native build that will receive it
- The update has been tested against the oldest supported native runtime version

---

## When OTA Updates Are Prohibited

An OTA update must not be published when any of the following is true:

- The change requires a new native build (new native module, new permission, Expo SDK upgrade)
- The change modifies the app's runtime version
- The change adds new native dependencies
- The change would break or degrade behavior on an older installed native runtime
- The change is being used to bypass App Store or Google Play review requirements

---

## Runtime Version Controls

Every OTA update must specify the `runtimeVersion` it targets in `eas.json` or `app.config.ts`. The runtime version must match the native build that the update is compatible with.

Users on a native build with a different runtime version will not receive the OTA update. They will continue running the last OTA update compatible with their native build, or the native build's bundled JavaScript if no compatible OTA update exists.

---

## OTA Release Procedure

1. Verify the update meets all "permitted" conditions above.
2. Publish the update to the **internal testing channel** first.
3. Test on at least one iOS device and one Android device running the target native build.
4. Verify the update does not break any functionality on the oldest supported native build.
5. Publish to the **staging channel** and run automated contract tests.
6. Publish to **production** using a phased rollout (10% → 50% → 100% over 24 hours).
7. Monitor crash rate and error rate for 24 hours after full rollout.

---

## OTA Rollback Procedure

Every OTA release must have a rollback procedure ready before publishing to production.

To rollback an OTA update:
1. In the Expo dashboard, navigate to the project's Updates section.
2. Find the previous stable update for the affected runtime version.
3. Re-publish the previous update as the active update for the production channel.
4. The rollback takes effect within one update check cycle (default: app foreground or 5-minute interval).

The target time from rollback decision to rollback complete is under 5 minutes.

---

## OTA Update Log

Every OTA update published to production must be recorded here.

| Date | Channel | Runtime Version | Description | Rolled Back? | Notes |
|---|---|---|---|---|---|
| (No OTA updates published yet) | — | — | — | — | — |
