# DECISIONS.md
**Last Updated:** 2026-07-31

This document records every architectural and implementation decision made during the TutorSnap Admin System project, including the rationale and the date of the decision.

---

## DEC-001 — Admin Portal as Separate Application
**Date:** 2026-07-31  
**Decision:** Build the admin portal as a completely separate React application deployed to `admin.tutorsnapai.tech`, not as a route within the existing TutorSnap web build.  
**Rationale:** Security isolation (a breach in the public app cannot compromise the admin surface), independent deployment, ability to restrict by IP allowlist at the CDN level, and no bloat to the public app bundle.  
**Decided by:** User

## DEC-002 — No Free-Form SQL Console
**Date:** 2026-07-31  
**Decision:** Replace the free-form SQL console with a curated query library defined in code, reviewed via pull request. Write operations require two-admin approval.  
**Rationale:** Free-form SQL consoles have caused production incidents at major companies. A curated library provides the same diagnostic value with dramatically lower risk.  
**Decided by:** User

## DEC-003 — Server-Side Translation Storage
**Date:** 2026-07-31  
**Decision:** Move translations from the app bundle to a server-side database. The mobile app fetches translations on launch, caches them with a version hash, and only re-fetches when the server reports a newer version.  
**Rationale:** Enables content updates without app releases. Supports 35+ languages with admin-managed editing.  
**Decided by:** User

## DEC-004 — AI Prompt Lifecycle (Draft → Review → Approve → Publish)
**Date:** 2026-07-31  
**Decision:** AI prompts are managed in the database with a mandatory review workflow. No prompt can go live without a reviewer different from the author.  
**Rationale:** A bad prompt can break the solve feature for all users instantly. The review step prevents accidental or malicious prompt changes from reaching production.  
**Decided by:** User

## DEC-005 — Monitoring via Deployment Platform API
**Date:** 2026-07-31  
**Decision:** Infrastructure metrics (CPU, memory, disk) are sourced from the deployment platform's API, not from application-level polling.  
**Rationale:** Application code cannot reliably measure its own infrastructure. Platform APIs provide accurate, real-time metrics without additional agents.  
**Decided by:** User

## DEC-006 — User Impersonation with Strict Controls
**Date:** 2026-07-31  
**Decision:** Impersonation requires: mandatory reason (min 20 chars), secondary approval for privileged accounts, 30-minute non-renewable token, persistent red banner, full audit logging.  
**Rationale:** Impersonation is a powerful tool that can be abused. Strict controls ensure it is used only for legitimate support purposes and every use is traceable.  
**Decided by:** User

## DEC-007 — Universal Operational Lifecycle
**Date:** 2026-07-31  
**Decision:** Every configurable system (prompts, feature flags, translations, notifications, system config) follows the same lifecycle: Draft → Review → Approve → Publish → Version History → Rollback → Audit History.  
**Rationale:** Consistency reduces cognitive load for admins. Every system behaves the same way, reducing the chance of mistakes.  
**Decided by:** User

## DEC-008 — Modular, Independently Deployable Services
**Date:** 2026-07-31  
**Decision:** Each service (AI Gateway, Feature Flag Service, Translation Service, etc.) is designed as an independent module with a clean interface. Services can be extracted into separate deployments as scale demands.  
**Rationale:** Avoids future rewrites. The platform can scale individual services without restructuring the entire system.  
**Decided by:** User

## DEC-009 — Audit Log is Append-Only
**Date:** 2026-07-31  
**Decision:** The `audit_log` table has no DELETE or UPDATE permissions granted to any role, including Super Admin. Records are exported to S3 nightly.  
**Rationale:** An audit log that can be modified is not an audit log. Immutability is the foundation of trust in the system.  
**Decided by:** Architecture review

## DEC-010 — Phase-Based Implementation with Sandbox Recovery
**Date:** 2026-07-31  
**Decision:** Implementation is broken into 14 phases, each designed to complete in 30–90 minutes. After every phase: run validation checklist, save git checkpoint, push to GitHub, update all 8 recovery documents.  
**Rationale:** The sandbox resets under memory pressure. Small phases with checkpoints ensure no significant work is lost on reset.  
**Decided by:** User
