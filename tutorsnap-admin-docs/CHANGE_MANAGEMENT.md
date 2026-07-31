# CHANGE_MANAGEMENT.md
**Version:** 1.0  
**Last Updated:** 2026-07-31  
**Status:** Active — applies to all future TutorSnap changes

---

## Purpose

This document defines the permanent change management framework for TutorSnap. Every future change to the mobile app, backend, database, AI systems, or admin portal must follow this framework without exception. No change is treated as an isolated coding task. Every change is a controlled production modification.

---

## The Change Workflow

Every future change follows this sequence in full. No step may be skipped.

```
Discovery → Impact Analysis → Design → Implementation →
Automated Testing → Staging Verification → Real-User Testing →
Release Approval → Controlled Rollout → Monitoring →
Completion or Rollback
```

### Step 1 — Discovery
Define the change clearly. What is being added, modified, or removed? Who requested it? What problem does it solve? Document the change in a brief (1–2 paragraph) change proposal before any design work begins.

### Step 2 — Impact Analysis
Before any design or code is written, complete the Change Impact Analysis (see section below). No change begins without this analysis. The analysis is documented and attached to the change record.

### Step 3 — Design
Produce a design document covering: API contract changes, database schema changes, mobile app changes, admin portal changes, and feature flag requirements. For breaking changes, include the deprecation and migration plan.

### Step 4 — Implementation
Implement the change in the development environment. Follow the Database Migration Discipline policy for any schema changes. Follow the API Versioning policy for any API changes. All new backend behavior must be hidden behind a feature flag until the corresponding mobile build is available and sufficiently adopted.

### Step 5 — Automated Testing
Run the full contract test suite. All contract tests must pass before proceeding. New features must include new contract tests covering the changed API surface.

### Step 6 — Staging Verification
Deploy to the staging environment. Verify the change works correctly against staging data. Verify that older app versions continue to work against the new backend (backward compatibility test).

### Step 7 — Real-User Testing
Deploy to the internal testing channel (Expo internal distribution or TestFlight internal group). Verify with real devices. For significant changes, run a beta rollout to the beta channel.

### Step 8 — Release Approval
Document the release decision: what is being released, what was verified, what the rollback plan is. For changes affecting payments, user data, or AI behavior, require explicit approval before proceeding.

### Step 9 — Controlled Rollout
Use feature flags for percentage rollout. Start at 5–10% of users. Monitor error rates and key metrics. Expand to 25%, 50%, 100% only if metrics remain healthy.

### Step 10 — Monitoring
Monitor for 24–48 hours after full rollout. Watch: error rate, AI request failure rate, subscription events, crash rate, and any metrics specific to the changed feature.

### Step 11 — Completion or Rollback
If monitoring shows healthy metrics: mark the change complete, update the deprecation register if applicable, update the mobile release matrix, and update the admin system if required (see Admin-System Drift section). If monitoring shows degradation: execute the rollback plan immediately.

---

## Change Impact Analysis Template

Every change must complete this analysis before implementation begins. Document the answers in the change record.

| Dimension | Questions to Answer |
|---|---|
| **Mobile files affected** | Which screens, components, hooks, and lib files change? |
| **Backend services affected** | Which API routes, tRPC procedures, or server modules change? |
| **Database tables affected** | Which tables are added, modified, or read differently? |
| **Admin portal changes** | Does the admin portal need new pages, controls, or data? |
| **API contract changes** | Are any request/response shapes changing? Is this backward-compatible? |
| **Existing user-data impact** | Does this change affect data already stored for existing users? |
| **Older app-version impact** | Will users on older installed builds break or see degraded behavior? |
| **Subscription impact** | Does this change affect premium features, paywalls, or RevenueCat events? |
| **Analytics impact** | Are new events needed? Do existing event schemas change? |
| **Security and privacy impact** | Does this change expose new data, require new permissions, or affect GDPR? |
| **Rollback path** | How is this change reversed if it causes problems in production? |

---

## Admin-System Drift Prevention

Whenever the mobile app gains, removes, or changes a feature, the following checklist must be evaluated before the change is marked complete.

| Mobile Change | Admin System Check Required |
|---|---|
| New AI feature | Does the AI Operations Center need new prompt controls, usage monitoring, or cost tracking? |
| New subscription tier | Does the billing dashboard need to display the new tier? Does the premium override support it? |
| New classroom role | Does RBAC need new permissions? Does the classroom management UI need updates? |
| New language added | Does the translation management interface support the new language? |
| New user-data field | Does the GDPR export include the new field? Does the deletion procedure remove it? |
| New content type | Does content moderation need to handle the new type? |
| New notification type | Does the notification center support the new template? |
| New feature flag key | Is the flag registered in the feature flag service? |
| New API endpoint | Is the endpoint covered by contract tests? Is it versioned correctly? |
| Removed feature | Are deprecated API endpoints scheduled for removal? Is the deprecation register updated? |

The admin platform and mobile application must evolve together. A mobile feature is not complete until the admin system is updated to match.

---

## Environment Isolation

Three permanent environments must be maintained with complete isolation of configuration, secrets, databases, and feature flags.

| Environment | Purpose | Feature Flags | Database |
|---|---|---|---|
| **Development** | Active development and local testing | All flags enabled by default | Seeded test data |
| **Staging** | Pre-release verification against production-like data | Mirrors production flags | Copy of production schema, anonymized data |
| **Production** | Live users | Controlled rollout flags | Live data |

Where supported by the distribution platform, also maintain:

- **Internal testing channel** — Expo internal distribution or TestFlight internal group. Used for Step 7 of the change workflow.
- **Beta channel** — TestFlight external beta or Google Play internal testing. Used for percentage rollout before full production release.

Configuration, API keys, database connection strings, and RevenueCat keys must never be shared between environments.

---

## Over-the-Air (OTA) Update Policy

Expo Updates may be used for JavaScript and asset updates under the following conditions only.

OTA updates are permitted when the update contains no native module changes, no new Expo SDK APIs, no new native permissions, and no changes to the app's native runtime version. The update must be fully compatible with every installed native build that will receive it.

OTA updates are prohibited for changes that require a new native build, changes that add or modify native permissions, changes to the Expo SDK version, changes to native dependencies, and any change that would break compatibility with an older installed native runtime.

Every OTA release must specify the runtime version it targets. The admin system must maintain a rollback procedure for every OTA release: the previous OTA bundle must be re-publishable within 5 minutes of a decision to rollback.

---

## Safe Feature Evolution States

Every substantial new feature must pass through these states in order. The feature flag service (Phase 5) manages these states.

| State | Description | Who Can See It |
|---|---|---|
| **Development** | Feature is being built. Not visible to any users. | No users |
| **Internal Testing** | Feature is complete and deployed. Visible to admin-designated internal users only. | Internal test accounts |
| **Beta Rollout** | Feature is stable. Visible to opted-in beta users. | Beta segment |
| **Percentage Rollout** | Feature is rolling out. Visible to N% of all users. | N% of all users |
| **Full Release** | Feature is fully available. | All users |
| **Paused** | Feature is temporarily disabled. Returns to previous state on resume. | No users |
| **Emergency Disabled** | Feature is immediately disabled for all users via kill switch. | No users |
| **Rolled Back** | Feature has been reverted to a previous state. | Previous state's audience |

New backend behavior must remain in the **Development** or **Internal Testing** state until the corresponding mobile build has been released and adopted by a sufficient percentage of the user base (recommended: 80% of active users on the new build before removing backward-compatibility shims).
