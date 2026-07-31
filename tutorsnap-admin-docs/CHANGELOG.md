# CHANGELOG.md
**Last Updated:** 2026-07-31

This file records every significant change to the TutorSnap Admin System, in reverse chronological order.

---

## [Design v3.0] — 2026-07-31

### Added
- Application Change Management and Compatibility Framework (CHANGE_MANAGEMENT.md)
- API versioning and backward compatibility policy (API_COMPATIBILITY.md)
- Database migration discipline (DATABASE_MIGRATION_POLICY.md)
- Mobile release matrix and version tracking (MOBILE_RELEASE_MATRIX.md)
- Deprecation register (DEPRECATION_REGISTER.md)
- OTA update policy (OTA_UPDATE_POLICY.md)
- 5 new architectural decisions (DEC-011 through DEC-015)
- Admin-system drift prevention checklist
- Safe feature evolution states (Development → Internal Testing → Beta → Percentage → Full Release → Pause → Emergency Disable → Rollback)
- Contract testing requirements for all service boundaries
- Environment isolation requirements (Development, Staging, Production)
- Change impact analysis template (11 dimensions)
- PROJECT_STATUS.md updated to reference all 15 documents

---

## [Design v2.0] — 2026-07-31

### Added
- Complete Implementation Master Plan with 14 phases, each containing: objectives, files expected to change, database migrations, API endpoints, UI components, estimated complexity, rollback strategy, test strategy, validation checklist, and exit criteria.
- Persistent recovery system: PROJECT_STATUS.md, ARCHITECTURE_STATE.md, IMPLEMENTATION_PROGRESS.md, COMPLETED_PHASES.md, NEXT_PHASE.md, KNOWN_RISKS.md, DECISIONS.md, CHANGELOG.md
- Phase dependency map showing the full build order
- Universal operational lifecycle (Draft → Review → Approve → Publish → Version History → Rollback) applied to all configurable systems
- User impersonation design with strict controls (mandatory reason, secondary approval, 30-min timeout, red banner, audit trail)
- Curated query library replacing the free-form SQL console
- Server-side translation service design with mobile app cache integration
- AI Operations Center design with A/B prompt testing and full lifecycle management
- Monitoring design using deployment platform API for infrastructure metrics
- 6 known risks identified and documented with mitigations
- 10 architectural decisions recorded with rationale

### Changed
- Admin portal changed from a route in the existing app to a completely separate application at `admin.tutorsnapai.tech`
- Billing dashboard scoped to read-only RevenueCat integration (refunds remain manual via Apple/Google)

### Removed
- Free-form SQL console removed from scope (replaced by curated query library)

---

## [Design v1.0] — 2026-07-31

### Added
- Initial architecture document based on the original TutorSnap Platform Control Center spec
- System map with 16 components
- Security requirements (RBAC, MFA, session management, audit logs)
- Module specifications for all 14 domains
- Implementation order recommendation
- 5 open questions identified for user confirmation

---

## Template for future entries

## [Phase N complete] — [date]
### Added
- [what was built]
### Changed
- [what was modified]
### Fixed
- [what was repaired]
### Git Checkpoint
- [hash]
