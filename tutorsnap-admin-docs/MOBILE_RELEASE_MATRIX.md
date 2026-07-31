# MOBILE_RELEASE_MATRIX.md
**Version:** 1.0  
**Last Updated:** 2026-07-31  
**Status:** Active — update after every mobile release

---

## Purpose

This document tracks every released version of the TutorSnap mobile app. It is used to determine which API endpoints and database schemas must remain backward-compatible, and to monitor user adoption of new releases.

---

## Current Minimum Supported Version

| Platform | Minimum Supported Version | Build Number | Enforced Since |
|---|---|---|---|
| iOS | 2.2.0 | 40 | Not yet enforced |
| Android | 2.2.0 | 55 | Not yet enforced |

When a version falls below the minimum supported threshold, the app displays a mandatory update prompt and the API returns `426 Upgrade Required`.

---

## Release History

### iOS Releases

| Version | Build | Release Date | API Version | Key Features | Known Issues | Adoption % | Status |
|---|---|---|---|---|---|---|---|
| 2.2.0 | 40 | 2026-07-31 | v1 | Classroom, AI solve, IAP | Paid Apps Agreement unsigned (IAP fix pending) | — | Current |

### Android Releases

| Version | Build | Release Date | API Version | Key Features | Known Issues | Adoption % | Status |
|---|---|---|---|---|---|---|---|
| 2.2.0 | 55 | 2026-07-31 | v1 | Classroom, AI solve, IAP | — | — | Current |

---

## API Dependency Map

This table shows which API endpoints each app version depends on. Use this to determine when it is safe to remove deprecated endpoints.

| API Endpoint | Introduced In | Deprecated In | Removal Date | Versions Depending On It |
|---|---|---|---|---|
| (All v1 endpoints) | 2.2.0 | — | — | 2.2.0+ |

---

## Feature Flag Dependency Map

This table shows which feature flags each app version can consume. App versions that predate a feature flag's introduction will ignore it and use the default behavior.

| Feature Flag Key | Introduced In App Version | Default Behavior (flag absent) |
|---|---|---|
| (To be populated as feature flags are created in Phase 5) | — | — |

---

## Database Schema Dependency Map

This table shows which database columns each app version depends on. Use this to determine when it is safe to remove deprecated columns (expand-and-contract pattern).

| Table | Column | Introduced In | Deprecated In | Safe to Remove After |
|---|---|---|---|---|
| (To be populated as schema changes are made) | — | — | — | — |

---

## How to Update This Document

After every mobile release, add a row to the iOS or Android release table with:
- The exact version number and build number
- The release date
- The API version the build was compiled against
- A brief description of key features
- Any known issues at time of release
- Adoption percentage (update weekly from the admin analytics dashboard)
- Status: Current, Supported, Deprecated, or Unsupported

After every API change, update the API Dependency Map to show which versions depend on the changed endpoint.

After every database schema change, update the Database Schema Dependency Map.
