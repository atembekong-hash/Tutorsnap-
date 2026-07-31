# API_COMPATIBILITY.md
**Version:** 1.0  
**Last Updated:** 2026-07-31  
**Status:** Active — applies to all TutorSnap public API changes

---

## Purpose

This document defines the API versioning and backward compatibility policy for TutorSnap. Its purpose is to ensure that older installed app versions continue to function correctly after backend changes, and that breaking changes are communicated clearly and handled safely.

---

## Versioning Strategy

All public mobile API contracts are versioned using a URL path prefix.

```
https://api.tutorsnapai.tech/v1/...   ← current stable version
https://api.tutorsnapai.tech/v2/...   ← next major version (when needed)
```

The admin API uses a separate prefix and is not subject to the same versioning constraints as the public mobile API, since the admin portal is always deployed alongside the latest backend.

---

## Backward-Compatible Changes (No Version Bump Required)

The following changes may be made to an existing versioned API without creating a new version. They are safe because older clients can ignore new fields and continue functioning.

- Adding a new optional field to a response object
- Adding a new optional query parameter
- Adding a new endpoint
- Changing the order of fields in a response
- Adding a new enum value to a field (only if the client handles unknown enum values gracefully)
- Reducing a rate limit (making it more permissive)

---

## Breaking Changes (Require New Version or Deprecation Period)

The following changes break older clients and must never be made silently to an existing versioned endpoint.

- Removing a field from a response
- Renaming a field in a request or response
- Changing the type of a field (e.g., string to number)
- Changing the meaning of a field
- Making a previously optional field required
- Removing an endpoint
- Changing authentication requirements
- Changing error response shapes

When a breaking change is needed, the procedure is:

1. Create the new behavior under a new version prefix (e.g., `/v2/...`) or a new endpoint path.
2. Keep the old endpoint running unchanged.
3. Add the old endpoint to the Deprecation Register with a removal date at least 90 days in the future.
4. Update the admin portal's Mobile Release Matrix to show which app versions depend on the old endpoint.
5. Monitor adoption of the new app version. Do not remove the old endpoint until fewer than 1% of active users are on a build that depends on it.

---

## Minimum Supported App Version

The admin system maintains a `minimum_supported_version` configuration value (managed via System Config in Phase 5). When a user opens an app version below this threshold, the app displays a mandatory update prompt and all API calls return a `426 Upgrade Required` response.

This mechanism is the last resort for forcing users off deprecated API versions. It should only be used when the deprecated endpoint must be removed and a small percentage of users have not updated.

---

## Contract Tests

Every public API endpoint must have an automated contract test that verifies:

- The response shape matches the documented schema
- Required fields are always present
- Field types are correct
- Error responses match the documented error schema

Contract tests run in CI on every pull request. A failing contract test blocks the merge. This ensures that breaking changes are detected before they reach staging or production.

The following API contracts are covered by contract tests:

| Contract | Test Location |
|---|---|
| Mobile app ↔ Public API | `tests/contracts/mobile-api/` |
| Admin portal ↔ Admin API | `tests/contracts/admin-api/` |
| Backend ↔ RevenueCat webhooks | `tests/contracts/revenuecat/` |
| Backend ↔ AI providers | `tests/contracts/ai-providers/` |
| Mobile app ↔ Translation service | `tests/contracts/translations/` |
| Mobile app ↔ Feature Flag service | `tests/contracts/feature-flags/` |

---

## API Deprecation Process

When an endpoint is deprecated:

1. Add a `Deprecation` response header to all responses from the deprecated endpoint: `Deprecation: true; sunset="YYYY-MM-DD"`.
2. Add the endpoint to `DEPRECATION_REGISTER.md` with the sunset date.
3. Log a warning in the server for every call to the deprecated endpoint, including the calling app version.
4. Monitor the deprecation log in the admin portal (Monitoring section) to track remaining usage.
5. On the sunset date, remove the endpoint only if usage has dropped below 1% of active users. If usage has not dropped sufficiently, extend the sunset date and notify users via an in-app update prompt.
