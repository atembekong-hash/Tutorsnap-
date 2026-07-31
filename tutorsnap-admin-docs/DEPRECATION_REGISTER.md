# DEPRECATION_REGISTER.md
**Version:** 1.0  
**Last Updated:** 2026-07-31  
**Status:** Active — update whenever an API endpoint, database column, or feature is deprecated

---

## Purpose

This register tracks every deprecated API endpoint, database column, feature flag, and system behavior in TutorSnap. Nothing is removed from production without first being listed here with a sunset date, a migration path, and evidence that usage has dropped to an acceptable level.

---

## Active Deprecations

No active deprecations at this time. The platform is in its initial release state (v2.2.0).

---

## Completed Deprecations (Removed)

No completed deprecations yet.

---

## Deprecation Record Template

When adding a new deprecation, copy this template and fill in all fields.

```
### DEP-NNN — [What is being deprecated]
**Type:** API endpoint | Database column | Feature flag | Behavior  
**Deprecated in version:** [app or API version]  
**Sunset date:** [date — minimum 90 days from deprecation]  
**Removal PR:** [link when available]  
**Migration path:** [what should callers use instead?]  
**Deprecation header added:** yes/no  
**Current usage:** [percentage of active users or requests still using this]  
**Status:** Active | Extended | Removed  
**Notes:** [anything relevant]
```

---

## Deprecation Rules

An item may only be removed from production when all of the following are true:

1. It has been listed in this register for at least 90 days.
2. Usage has dropped below 1% of active users or API requests (verified from the admin monitoring dashboard).
3. The removal has been reviewed and approved.
4. The rollback migration (for database columns) or the old endpoint (for APIs) has been verified to be removable without data loss.
5. The removal is documented in CHANGELOG.md.
