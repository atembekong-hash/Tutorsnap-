# KNOWN_RISKS.md
**Last Updated:** 2026-07-31

## Active Risks

### RISK-001 — Sandbox Memory Pressure (HIGH)
**Description:** The sandbox has 3.8 GB RAM. Metro bundler alone consumes nearly all of it, causing OOM kills that reset the sandbox mid-session.  
**Mitigation:** Kill Metro before running any heavy operations. Run admin portal dev server on a separate port. Keep phases small (30–90 min each). Save checkpoint after every phase.  
**Status:** Active — mitigated by phase design

### RISK-002 — Git Remote Instability (MEDIUM)
**Description:** The Manus internal git remote returned a 500 error during a previous session, preventing automatic project restore.  
**Mitigation:** Push to GitHub (`atembekong-hash/Tutorsnap-`) after every phase as a secondary backup.  
**Status:** Active — mitigated by dual-remote strategy

### RISK-003 — RevenueCat API Access Unknown (MEDIUM)
**Description:** It is unknown whether the RevenueCat account has REST API access enabled. The billing dashboard (Phase 9) requires this.  
**Mitigation:** Confirm before starting Phase 9. If REST API is not available, the billing dashboard will display a "Connect RevenueCat API" setup screen instead of crashing.  
**Status:** Open — needs user confirmation

### RISK-004 — Translation Migration Scope Unknown (LOW)
**Description:** The number of existing translation strings and their current storage format (hardcoded, i18n JSON files, etc.) is unknown.  
**Mitigation:** Audit translation files at the start of Phase 7. If strings are hardcoded in components, a migration script will be needed.  
**Status:** Open — needs investigation at Phase 7

### RISK-005 — Deployment Platform Unknown (LOW)
**Description:** The deployment platform for the TutorSnap API is unknown, which affects how infrastructure metrics are sourced for Phase 13.  
**Mitigation:** Confirm before starting Phase 13. If platform is unknown, Phase 13 monitoring will use application-level metrics only (no CPU/memory).  
**Status:** Open — needs user confirmation

### RISK-006 — Admin Portal Subdomain Not Configured (LOW)
**Description:** `admin.tutorsnapai.tech` does not exist yet. DNS and proxy configuration will be needed before the admin portal can be deployed.  
**Mitigation:** This is a deployment concern, not a development concern. Development uses localhost. Subdomain setup is documented in the deployment guide (Phase 14).  
**Status:** Deferred to Phase 14

## Resolved Risks
None yet.
