# ARCHITECTURE_STATE.md
**Last Updated:** 2026-07-31  
**Status:** Design complete — no implementation code written yet

## Current System State

### Existing TutorSnap Project
- **Location:** `/home/ubuntu/mathgenius-ai`
- **Platform:** Expo mobile app (iOS + Android)
- **Backend:** Express + tRPC server at `api.tutorsnapai.tech`
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** JWT-based user auth (existing)
- **Storage:** S3-compatible
- **IAP:** RevenueCat (iOS + Android)
- **Last checkpoint:** `2655cedf` (versionCode 55 APK build)
- **GitHub remote:** `atembekong-hash/Tutorsnap-` (main branch)

### Admin System — Not Yet Built
Nothing has been implemented. The architecture exists only in design documents.

## Planned Architecture

### Admin Portal
- **Type:** Separate standalone React app
- **URL:** `admin.tutorsnapai.tech`
- **Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Radix UI
- **Auth:** Separate admin sessions (never shared with public app)

### Admin API
- **Type:** New Express router mounted on existing server
- **URL:** `admin-api.tutorsnapai.tech` (or `/admin` prefix behind subdomain proxy)
- **Auth:** Short-lived JWT (15 min) + rotating refresh token (8 hr)
- **Security:** RBAC middleware, MFA required, rate limiting, CSRF protection

### New Database Tables (planned, not yet created)
- `admin_accounts` — admin user accounts
- `admin_sessions` — admin session tokens
- `audit_log` — immutable action log
- `feature_flags` + `feature_flag_versions`
- `ai_prompts` + `ai_prompt_versions` + `ai_request_logs` + `ai_ab_tests`
- `translation_keys` + `translation_values` + `translation_bundle_versions`
- `user_moderation`
- `impersonation_sessions`
- `notification_templates` + `notification_campaigns`
- `abuse_reports` + `moderation_actions`
- `query_executions`
- `config_snapshots`

## Key Architectural Decisions
1. Admin portal is completely isolated from public app (separate subdomain, separate session system)
2. No free-form SQL console — curated query library only
3. Translations stored server-side, fetched by mobile app with version hash caching
4. All configurable systems follow: Draft → Review → Approve → Publish → Version History → Rollback
5. Audit log is append-only — no admin can delete records
6. User impersonation requires mandatory reason, 30-min timeout, full audit trail
7. AI prompts managed via database with full lifecycle (not hardcoded)
8. Monitoring uses deployment platform API for infrastructure metrics
