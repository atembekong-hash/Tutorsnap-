# TutorSnap Admin System — Implementation Master Plan

**Version:** 1.0  
**Status:** Design Phase — Awaiting implementation approval  
**Last Updated:** 2026-07-31  
**Total Phases:** 14  
**Recovery System:** See `/tutorsnap-admin-docs/` directory

---

## How to Use This Plan

This document is the single source of truth for the entire admin system build. If the sandbox resets at any point, resume from this file and the companion recovery documents — not from conversation history.

**Before starting any phase:**
1. Read `NEXT_PHASE.md` to confirm which phase to start
2. Read `KNOWN_RISKS.md` for any active blockers
3. Read `ARCHITECTURE_STATE.md` for current system state

**After completing any phase:**
1. Run the phase validation checklist
2. Save a git checkpoint
3. Update all 8 recovery documents
4. Update `NEXT_PHASE.md` to point to the next phase

---

## Phase Dependency Map

```
Phase 0 (Bootstrap)
    └── Phase 1 (Admin Auth + RBAC)
            └── Phase 2 (Audit Log)
                    └── Phase 3 (Admin Portal Shell)
                            ├── Phase 4 (User Management)
                            ├── Phase 5 (Feature Flags)
                            └── Phase 6 (AI Operations)
                                    └── Phase 7 (Translation Service)
                                            ├── Phase 8 (Classroom Management)
                                            ├── Phase 9 (Billing Dashboard)
                                            └── Phase 10 (Notifications)
                                                    ├── Phase 11 (Content Moderation)
                                                    ├── Phase 12 (Analytics)
                                                    └── Phase 13 (Monitoring + Developer Tools)
                                                            └── Phase 14 (Backup, Recovery, Final Audit)
```

---

## Phase 0 — Project Bootstrap

**Complexity:** Low  
**Estimated session time:** 30 minutes  
**Depends on:** Nothing

### Objectives
- Create the admin system directory structure inside the existing TutorSnap project
- Initialize the admin portal as a separate React app
- Set up shared TypeScript types between admin API and admin portal
- Establish the recovery document system
- Create the first git checkpoint

### Files Expected to Change
```
tutorsnap-admin/                    ← new top-level directory
  admin-portal/                     ← separate React app (Vite + React 18)
    src/
      main.tsx
      App.tsx
      router.tsx
    index.html
    vite.config.ts
    package.json
    tsconfig.json
  admin-api/                        ← new Express router mounted on existing server
    index.ts
    middleware/
      auth.ts                       ← placeholder
      audit.ts                      ← placeholder
    routers/
      index.ts                      ← placeholder
  shared/
    types/
      admin.ts                      ← shared TypeScript types
      audit.ts
      permissions.ts
```

### Database Migrations
None in this phase.

### API Endpoints
None in this phase.

### UI Components
- Vite project scaffold with Tailwind CSS configured
- Empty router with placeholder routes for all 14 phases

### Rollback Strategy
Delete the `tutorsnap-admin/` directory. No existing files are modified in this phase.

### Test Strategy
- Verify `pnpm dev` starts the admin portal on a separate port
- Verify TypeScript compiles with zero errors
- Verify the admin portal loads in the browser with a placeholder page

### Validation Checklist
- [ ] `tutorsnap-admin/` directory exists with correct structure
- [ ] Admin portal Vite dev server starts without errors
- [ ] TypeScript compiles with zero errors in both admin-portal and admin-api
- [ ] Shared types are importable from both sides
- [ ] Placeholder routes render without crashing

### Exit Criteria
Admin portal dev server runs. TypeScript is clean. Git checkpoint saved.

---

## Phase 1 — Admin Authentication and RBAC

**Complexity:** High  
**Estimated session time:** 60–90 minutes  
**Depends on:** Phase 0

### Objectives
- Create `admin_accounts` and `admin_sessions` database tables
- Implement admin login with email + password + TOTP MFA
- Implement JWT access token (15 min) + rotating refresh token (8 hr) session system
- Implement RBAC middleware with three roles: super_admin, operations_admin, read_only_analyst
- Implement permission checking at the route level
- Seed the first Super Admin account via a one-time CLI script
- Build the admin portal login screen with MFA input

### Files Expected to Change
```
server/
  admin/
    auth.ts                         ← login, logout, refresh, MFA verify
    seed-admin.ts                   ← one-time CLI seeding script
  middleware/
    admin-auth.ts                   ← JWT verification + role check
    admin-permissions.ts            ← fine-grained permission guards
drizzle/
  migrations/
    0001_admin_accounts.sql
    0002_admin_sessions.sql
admin-portal/src/
  pages/
    Login.tsx
    MFAVerify.tsx
  hooks/
    useAdminAuth.ts
  lib/
    api.ts                          ← admin API client
    auth.ts                         ← token storage + refresh logic
```

### Database Migrations
```sql
-- Migration 0001
CREATE TABLE admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'operations_admin', 'read_only_analyst')),
  password_hash TEXT NOT NULL,
  mfa_secret TEXT,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_recovery_codes TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 0002
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_accounts(id) ON DELETE CASCADE,
  refresh_token_hash TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON admin_sessions(admin_id);
CREATE INDEX ON admin_sessions(refresh_token_hash);
```

### API Endpoints
```
POST   /admin/auth/login              ← email + password → MFA challenge
POST   /admin/auth/mfa/verify         ← TOTP code → access + refresh tokens
POST   /admin/auth/refresh            ← refresh token → new access token
POST   /admin/auth/logout             ← revoke refresh token
GET    /admin/auth/sessions           ← list active sessions (self)
DELETE /admin/auth/sessions/:id       ← revoke specific session
GET    /admin/auth/me                 ← current admin profile
```

### UI Components
- `LoginPage` — email/password form, error states, loading state
- `MFAPage` — 6-digit TOTP input with auto-submit, resend option
- `AuthGuard` — HOC that redirects unauthenticated users to login
- `RoleGuard` — HOC that renders 403 for insufficient permissions

### Rollback Strategy
Drop `admin_accounts` and `admin_sessions` tables. Delete `server/admin/auth.ts` and `server/middleware/admin-auth.ts`. The existing TutorSnap app is unaffected.

### Test Strategy
- Unit test: password hashing and verification
- Unit test: TOTP generation and verification
- Unit test: JWT signing and verification
- Integration test: full login flow (email → MFA → tokens)
- Integration test: token refresh
- Integration test: role-based route protection (403 for wrong role)
- Manual test: login screen renders and submits correctly

### Validation Checklist
- [ ] `admin_accounts` table created with correct schema
- [ ] `admin_sessions` table created with correct schema
- [ ] Seed script creates Super Admin account successfully
- [ ] Login with correct credentials + MFA returns valid tokens
- [ ] Login with wrong password returns 401
- [ ] Login with wrong MFA code returns 401
- [ ] Expired access token returns 401
- [ ] Valid refresh token returns new access token
- [ ] Route with `super_admin` role rejects `read_only_analyst` token
- [ ] Login page renders and submits without errors
- [ ] MFA page renders and auto-submits on 6th digit

### Exit Criteria
Admin can log in with MFA, receive tokens, access protected routes, and be rejected on insufficient role. Git checkpoint saved.

---

## Phase 2 — Audit Log System

**Complexity:** Medium  
**Estimated session time:** 45 minutes  
**Depends on:** Phase 1

### Objectives
- Create `audit_log` table (append-only)
- Implement audit middleware that automatically logs every admin API request
- Implement the `auditAction()` helper for explicit action logging
- Build the audit log viewer in the admin portal (table with filters)
- Implement audit log export to CSV

### Files Expected to Change
```
drizzle/migrations/
  0003_audit_log.sql
server/admin/
  audit.ts                          ← auditAction() helper + middleware
admin-portal/src/
  pages/
    AuditLog.tsx
  components/
    AuditTable.tsx
    AuditFilters.tsx
    AuditExport.tsx
```

### Database Migrations
```sql
-- Migration 0003
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_accounts(id),
  admin_email TEXT NOT NULL,
  admin_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_id UUID,
  impersonating_user_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON audit_log(admin_id);
CREATE INDEX ON audit_log(action);
CREATE INDEX ON audit_log(target_type, target_id);
CREATE INDEX ON audit_log(timestamp DESC);
-- No DELETE or UPDATE permissions granted on this table
```

### API Endpoints
```
GET    /admin/audit                   ← paginated list with filters
GET    /admin/audit/:id               ← single record detail
GET    /admin/audit/export            ← CSV export (date range required)
```

### UI Components
- `AuditLogPage` — full-page table with filters
- `AuditTable` — sortable, filterable, paginated table
- `AuditFilters` — filter by admin, action, target type, date range
- `AuditDetailModal` — shows previous/new value diff for a single record

### Rollback Strategy
Drop `audit_log` table. Delete `server/admin/audit.ts`. Remove audit middleware from admin router.

### Test Strategy
- Unit test: `auditAction()` writes correct record structure
- Integration test: every admin API call generates an audit record
- Integration test: audit log is queryable with all filter combinations
- Integration test: CSV export contains correct data

### Validation Checklist
- [ ] `audit_log` table created
- [ ] Every admin API call generates an audit record
- [ ] Audit records contain all required fields
- [ ] Audit log page loads and displays records
- [ ] Filters work correctly (by admin, action, date range)
- [ ] CSV export downloads with correct data
- [ ] No admin can delete audit records (permission denied)

### Exit Criteria
Every admin action is logged. Audit log is viewable and exportable. Git checkpoint saved.

---

## Phase 3 — Admin Portal Shell

**Complexity:** Medium  
**Estimated session time:** 60 minutes  
**Depends on:** Phase 1, Phase 2

### Objectives
- Build the complete admin portal navigation shell
- Implement dark/light mode toggle
- Implement global search (UI only, wired to real data in later phases)
- Implement admin profile dropdown (view sessions, change password, logout)
- Implement notification center (UI only)
- Implement keyboard shortcuts framework
- Implement responsive layout (desktop-first, tablet-capable)

### Files Expected to Change
```
admin-portal/src/
  components/
    layout/
      AppShell.tsx                  ← main layout wrapper
      Sidebar.tsx                   ← navigation sidebar
      TopBar.tsx                    ← search + profile + notifications
      Breadcrumb.tsx
    ui/
      Button.tsx
      Badge.tsx
      Card.tsx
      Table.tsx                     ← base table component
      Modal.tsx
      Toast.tsx
      Tooltip.tsx
      Skeleton.tsx
      EmptyState.tsx
      ErrorBoundary.tsx
  hooks/
    useTheme.ts
    useKeyboardShortcuts.ts
    useGlobalSearch.ts
  pages/
    Dashboard.tsx                   ← placeholder home screen
    NotFound.tsx
    Forbidden.tsx
```

### Database Migrations
None.

### API Endpoints
```
GET    /admin/search?q=              ← global search across users, classrooms, prompts
```

### UI Components
All listed above. This phase establishes the design system used by all subsequent phases.

### Rollback Strategy
Revert admin-portal/src to Phase 2 state. No backend changes.

### Test Strategy
- Visual review of all components in light and dark mode
- Keyboard navigation test (Tab, Enter, Escape work correctly)
- Responsive layout test at 1280px, 1440px, 1920px
- Global search returns results without crashing

### Validation Checklist
- [ ] Sidebar navigation renders all phase placeholders
- [ ] Dark mode and light mode toggle works
- [ ] Admin profile dropdown shows name, role, active sessions
- [ ] Logout clears tokens and redirects to login
- [ ] Global search input is accessible via Cmd+K / Ctrl+K
- [ ] 404 and 403 pages render correctly
- [ ] No console errors in any state

### Exit Criteria
Admin portal shell is complete. All navigation links render placeholder pages. Design system components are established. Git checkpoint saved.

---

## Phase 4 — User Management

**Complexity:** High  
**Estimated session time:** 90 minutes  
**Depends on:** Phase 3

### Objectives
- Build the complete user management interface
- Search, filter, paginate users
- View full user profile (devices, login history, AI usage, subscription history)
- Ban, suspend, delete, restore users with mandatory reason
- Change user roles (student/teacher)
- Grant/revoke premium manually
- Export user data (GDPR)
- Implement user impersonation with all controls

### Files Expected to Change
```
drizzle/migrations/
  0004_user_moderation.sql
  0005_impersonation_sessions.sql
server/admin/
  users.ts                          ← all user management endpoints
admin-portal/src/
  pages/
    users/
      UserList.tsx
      UserDetail.tsx
      UserModeration.tsx
  components/
    users/
      UserTable.tsx
      UserFilters.tsx
      UserProfile.tsx
      UserDevices.tsx
      UserLoginHistory.tsx
      UserAIUsage.tsx
      UserSubscriptionHistory.tsx
      BanModal.tsx
      SuspendModal.tsx
      ImpersonateModal.tsx
      PremiumOverrideModal.tsx
```

### Database Migrations
```sql
-- Migration 0004
CREATE TABLE user_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ban', 'suspension', 'warning')),
  reason TEXT NOT NULL,
  admin_id UUID REFERENCES admin_accounts(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  lifted_at TIMESTAMPTZ,
  lifted_by UUID REFERENCES admin_accounts(id),
  notes TEXT
);
CREATE INDEX ON user_moderation(user_id);

-- Migration 0005
CREATE TABLE impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_accounts(id),
  target_user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES admin_accounts(id),
  token_hash TEXT UNIQUE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);
```

### API Endpoints
```
GET    /admin/users                   ← paginated list with filters
GET    /admin/users/:id               ← full user profile
GET    /admin/users/:id/devices       ← device list
GET    /admin/users/:id/login-history ← login history
GET    /admin/users/:id/ai-usage      ← AI usage stats
GET    /admin/users/:id/subscriptions ← subscription history
POST   /admin/users/:id/ban           ← ban user (reason required)
POST   /admin/users/:id/suspend       ← suspend user (reason + duration)
POST   /admin/users/:id/restore       ← lift ban or suspension
DELETE /admin/users/:id               ← soft delete (reason required)
POST   /admin/users/:id/premium       ← grant/revoke premium
PATCH  /admin/users/:id/role          ← change role
GET    /admin/users/:id/export        ← GDPR data export (JSON)
POST   /admin/users/:id/impersonate   ← start impersonation session
DELETE /admin/impersonate/:sessionId  ← end impersonation session
```

### Rollback Strategy
Drop `user_moderation` and `impersonation_sessions` tables. Delete `server/admin/users.ts`. Revert portal pages.

### Test Strategy
- Integration test: search returns correct users
- Integration test: ban creates moderation record and blocks user login
- Integration test: impersonation token is valid for 30 min then expires
- Integration test: impersonation requires reason (400 without it)
- Integration test: GDPR export contains all user data fields
- Manual test: all modals open, submit, and show success/error states

### Validation Checklist
- [ ] User list loads with pagination
- [ ] Search by email, name, ID works
- [ ] Filter by role, premium status, ban status works
- [ ] User profile shows all sections (devices, history, usage)
- [ ] Ban modal requires reason, creates audit log entry
- [ ] Banned user cannot log in to the mobile app
- [ ] Impersonation modal requires reason (min 20 chars)
- [ ] Impersonation token expires after 30 minutes
- [ ] GDPR export downloads complete user data
- [ ] All actions appear in audit log

### Exit Criteria
All user management operations work end-to-end with audit logging. Impersonation is functional with all controls. Git checkpoint saved.

---

## Phase 5 — Feature Flag System

**Complexity:** High  
**Estimated session time:** 90 minutes  
**Depends on:** Phase 3

### Objectives
- Build the complete feature flag service (backend + admin UI)
- Implement full lifecycle: Draft → Review → Approve → Publish
- Implement rollout targeting: all, percentage, country, platform, user segment
- Implement emergency kill switch
- Integrate with the mobile app (app fetches flags on launch)
- Build the admin flag management UI

### Files Expected to Change
```
drizzle/migrations/
  0006_feature_flags.sql
server/admin/
  feature-flags.ts
server/public/
  config.ts                         ← public endpoint for mobile app
admin-portal/src/
  pages/
    feature-flags/
      FlagList.tsx
      FlagDetail.tsx
      FlagEditor.tsx
      FlagHistory.tsx
  components/
    feature-flags/
      FlagCard.tsx
      RolloutConfig.tsx
      KillSwitchToggle.tsx
      LifecycleStatus.tsx
      VersionHistory.tsx
```

### Database Migrations
```sql
-- Migration 0006
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','published','archived')),
  enabled BOOLEAN DEFAULT FALSE,
  rollout_config JSONB NOT NULL DEFAULT '{"type":"all"}',
  emergency_kill BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES admin_accounts(id),
  reviewed_by UUID REFERENCES admin_accounts(id),
  published_by UUID REFERENCES admin_accounts(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feature_flag_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID REFERENCES feature_flags(id),
  enabled BOOLEAN,
  rollout_config JSONB,
  version INTEGER,
  change_summary TEXT,
  created_by UUID REFERENCES admin_accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON feature_flag_versions(flag_id, version DESC);
```

### API Endpoints
```
-- Admin API
GET    /admin/flags                   ← list all flags
POST   /admin/flags                   ← create draft
GET    /admin/flags/:id               ← flag detail + history
PATCH  /admin/flags/:id               ← update draft
POST   /admin/flags/:id/submit        ← submit for review
POST   /admin/flags/:id/approve       ← approve (different admin)
POST   /admin/flags/:id/reject        ← reject with reason
POST   /admin/flags/:id/publish       ← publish approved flag
POST   /admin/flags/:id/rollback/:v   ← rollback to version v
DELETE /admin/flags/:id               ← archive flag

-- Public API (mobile app)
GET    /api/config/flags              ← returns all published flags for the requesting platform
```

### UI Components
All listed above plus a live preview panel showing what the flag config will look like to different user segments.

### Rollback Strategy
Drop `feature_flags` and `feature_flag_versions` tables. Remove the `/api/config/flags` public endpoint. The mobile app falls back to hardcoded defaults.

### Test Strategy
- Integration test: full lifecycle from draft to published
- Integration test: reviewer cannot be the same admin as the author
- Integration test: emergency kill switch overrides all rollout rules
- Integration test: mobile app receives correct flags for its platform/country
- Integration test: rollback restores previous version correctly
- Manual test: all lifecycle state transitions work in the UI

### Validation Checklist
- [ ] Flag creation with all rollout types works
- [ ] Draft cannot be published without going through review
- [ ] Author cannot approve their own flag
- [ ] Emergency kill switch disables flag for all users immediately
- [ ] Mobile app `/api/config/flags` returns correct published flags
- [ ] Version history shows all previous states
- [ ] Rollback re-publishes previous version with audit log entry
- [ ] All actions in audit log

### Exit Criteria
Feature flags are fully operational end-to-end including mobile app integration. Git checkpoint saved.

---

## Phase 6 — AI Operations Center

**Complexity:** Very High  
**Estimated session time:** 120 minutes  
**Depends on:** Phase 3

### Objectives
- Build prompt management with full lifecycle and versioning
- Build provider and model configuration
- Build AI request log viewer
- Build cost and token usage dashboard
- Build A/B prompt testing framework
- Build latency monitoring charts

### Files Expected to Change
```
drizzle/migrations/
  0007_ai_prompts.sql
  0008_ai_request_logs.sql
  0009_ai_ab_tests.sql
server/admin/
  ai-operations.ts
server/
  ai-gateway.ts                     ← updated to use DB prompts + log requests
admin-portal/src/
  pages/
    ai/
      PromptList.tsx
      PromptEditor.tsx
      PromptHistory.tsx
      ProviderConfig.tsx
      RequestLogs.tsx
      CostDashboard.tsx
      ABTests.tsx
      LatencyCharts.tsx
```

### Database Migrations
```sql
-- Migration 0007
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_message TEXT NOT NULL,
  user_template TEXT NOT NULL,
  model TEXT NOT NULL,
  temperature FLOAT DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  provider TEXT NOT NULL,
  tags TEXT[],
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES admin_accounts(id),
  published_by UUID REFERENCES admin_accounts(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES ai_prompts(id),
  system_message TEXT,
  user_template TEXT,
  model TEXT,
  config_json JSONB,
  version INTEGER,
  created_by UUID REFERENCES admin_accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 0008
CREATE TABLE ai_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  feature TEXT NOT NULL,
  prompt_id UUID REFERENCES ai_prompts(id),
  prompt_version INTEGER,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  cost_usd NUMERIC(10,6),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  ab_test_id UUID,
  ab_variant TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON ai_request_logs(created_at DESC);
CREATE INDEX ON ai_request_logs(user_id);
CREATE INDEX ON ai_request_logs(feature);

-- Migration 0009
CREATE TABLE ai_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  prompt_a_id UUID REFERENCES ai_prompts(id),
  prompt_b_id UUID REFERENCES ai_prompts(id),
  split_percentage INTEGER DEFAULT 50,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES admin_accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
```

### API Endpoints
```
-- Prompt Management
GET    /admin/ai/prompts              ← list prompts
POST   /admin/ai/prompts              ← create draft
GET    /admin/ai/prompts/:id          ← detail + history
PATCH  /admin/ai/prompts/:id          ← update draft
POST   /admin/ai/prompts/:id/submit   ← submit for review
POST   /admin/ai/prompts/:id/approve  ← approve
POST   /admin/ai/prompts/:id/publish  ← publish
POST   /admin/ai/prompts/:id/rollback/:v ← rollback

-- Provider Config
GET    /admin/ai/providers            ← list providers + status
PATCH  /admin/ai/providers/:name      ← update config (key, enabled, priority)

-- Logs and Analytics
GET    /admin/ai/logs                 ← paginated request logs with filters
GET    /admin/ai/cost                 ← cost aggregation by provider/model/date
GET    /admin/ai/latency              ← latency percentiles by provider/model
GET    /admin/ai/ab-tests             ← list A/B tests
POST   /admin/ai/ab-tests             ← create A/B test
PATCH  /admin/ai/ab-tests/:id         ← update/end A/B test
```

### Rollback Strategy
Drop `ai_prompts`, `ai_prompt_versions`, `ai_request_logs`, `ai_ab_tests` tables. Revert `ai-gateway.ts` to use hardcoded prompts. The app continues to work with the previous hardcoded prompts.

### Test Strategy
- Integration test: full prompt lifecycle from draft to published
- Integration test: AI gateway uses the published prompt for a given feature key
- Integration test: A/B test routes 50% of requests to each variant
- Integration test: cost aggregation returns correct totals
- Manual test: prompt editor renders with syntax highlighting

### Validation Checklist
- [ ] Prompt creation and full lifecycle works
- [ ] AI gateway reads prompts from database (not hardcoded)
- [ ] Every AI request generates a log record
- [ ] Cost dashboard shows correct aggregations
- [ ] Latency charts show P50/P95/P99
- [ ] A/B test splits traffic correctly
- [ ] Rollback restores previous prompt version
- [ ] All actions in audit log

### Exit Criteria
AI operations center is fully functional. AI gateway uses database-managed prompts. Git checkpoint saved.

---

## Phase 7 — Translation Service

**Complexity:** High  
**Estimated session time:** 90 minutes  
**Depends on:** Phase 3

### Objectives
- Migrate translations from app bundle to server database
- Build translation management UI (search, edit, publish, missing strings)
- Build mobile app cache integration (version hash, conditional fetch)
- Implement import/export (CSV, JSON)
- Implement translation versioning

### Files Expected to Change
```
drizzle/migrations/
  0010_translations.sql
server/admin/
  translations.ts
server/public/
  translations.ts                   ← public endpoint for mobile app
admin-portal/src/
  pages/
    translations/
      TranslationList.tsx
      TranslationEditor.tsx
      MissingStrings.tsx
      ImportExport.tsx
mobile app (mathgenius-ai):
  lib/translations.ts               ← updated to fetch from server
```

### Database Migrations
```sql
-- Migration 0010
CREATE TABLE translation_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  namespace TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON translation_keys(namespace);

CREATE TABLE translation_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID REFERENCES translation_keys(id),
  language TEXT NOT NULL,
  value TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES admin_accounts(id),
  published_by UUID REFERENCES admin_accounts(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key_id, language)
);

CREATE TABLE translation_bundle_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_hash TEXT UNIQUE NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  published_by UUID REFERENCES admin_accounts(id),
  change_count INTEGER
);
```

### API Endpoints
```
-- Admin API
GET    /admin/translations            ← list with filters (namespace, language, status)
POST   /admin/translations            ← create key
PATCH  /admin/translations/:id        ← update value for a language
POST   /admin/translations/publish    ← publish all approved translations
GET    /admin/translations/missing    ← keys missing one or more languages
GET    /admin/translations/export     ← export as JSON or CSV
POST   /admin/translations/import     ← import from JSON or CSV

-- Public API (mobile app)
GET    /api/translations/:lang        ← full bundle for a language
GET    /api/translations/version      ← current bundle version hash
```

### Rollback Strategy
The mobile app falls back to bundled translation files if the server is unreachable. Drop translation tables. The app continues to work with bundled defaults.

### Test Strategy
- Integration test: mobile app receives correct translations for each language
- Integration test: version hash changes only when translations are published
- Integration test: mobile app does not re-download if version hash unchanged
- Integration test: CSV import creates correct records
- Manual test: missing strings filter shows correct gaps

### Validation Checklist
- [ ] All 35 languages seeded from existing app bundle
- [ ] Translation editor allows inline editing
- [ ] Missing strings filter works correctly
- [ ] Mobile app fetches translations on launch
- [ ] Mobile app uses cached bundle when server returns "up to date"
- [ ] CSV export and import round-trip correctly
- [ ] Version history shows previous values
- [ ] All actions in audit log

### Exit Criteria
Translations are server-managed. Mobile app fetches and caches translations. Git checkpoint saved.

---

## Phase 8 — Classroom Management

**Complexity:** Medium  
**Estimated session time:** 60 minutes  
**Depends on:** Phase 3

### Objectives
- Build classroom list with search and filters
- View classroom details (members, activity, problems)
- Archive, delete, restore classrooms
- Remove individual members
- Transfer classroom ownership
- Observer mode (admin joins as read-only observer)

### Files Expected to Change
```
drizzle/migrations/
  0011_classroom_admin.sql
server/admin/
  classrooms.ts
admin-portal/src/
  pages/
    classrooms/
      ClassroomList.tsx
      ClassroomDetail.tsx
      ClassroomMembers.tsx
      ClassroomActivity.tsx
```

### Database Migrations
```sql
-- Migration 0011
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES admin_accounts(id);
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES admin_accounts(id);
```

### API Endpoints
```
GET    /admin/classrooms              ← paginated list with filters
GET    /admin/classrooms/:id          ← detail + members + activity
POST   /admin/classrooms/:id/archive  ← archive classroom
POST   /admin/classrooms/:id/restore  ← restore archived classroom
DELETE /admin/classrooms/:id          ← soft delete
DELETE /admin/classrooms/:id/members/:userId ← remove member
PATCH  /admin/classrooms/:id/owner    ← transfer ownership
POST   /admin/classrooms/:id/observe  ← generate observer join token
```

### Rollback Strategy
Revert schema additions (ALTER TABLE). Delete `server/admin/classrooms.ts`. Revert portal pages.

### Test Strategy
- Integration test: archive/restore cycle works correctly
- Integration test: observer token allows read-only classroom access
- Integration test: ownership transfer updates classroom correctly
- Manual test: all modals open and submit correctly

### Validation Checklist
- [ ] Classroom list loads with pagination and search
- [ ] Archive and restore work correctly
- [ ] Member removal works and is audit logged
- [ ] Ownership transfer works
- [ ] Observer mode generates valid token
- [ ] All actions in audit log

### Exit Criteria
All classroom management operations work. Git checkpoint saved.

---

## Phase 9 — Billing Dashboard

**Complexity:** Medium  
**Estimated session time:** 60 minutes  
**Depends on:** Phase 3

### Objectives
- Integrate with RevenueCat REST API (read-only)
- Display active subscribers, revenue, failed renewals, expiring subscriptions
- Manual premium override (grant/revoke in TutorSnap database)
- Revenue charts (daily, weekly, monthly)

### Files Expected to Change
```
server/admin/
  billing.ts                        ← RevenueCat API integration
admin-portal/src/
  pages/
    billing/
      BillingDashboard.tsx
      SubscriberList.tsx
      RevenueCharts.tsx
      PremiumOverride.tsx
```

### Database Migrations
None (premium override already handled in Phase 4 user management).

### API Endpoints
```
GET    /admin/billing/summary         ← MRR, ARR, active subscribers, churn
GET    /admin/billing/subscribers     ← paginated subscriber list
GET    /admin/billing/revenue         ← revenue time series
GET    /admin/billing/expiring        ← subscriptions expiring in next 30 days
GET    /admin/billing/failed          ← failed renewal attempts
```

### Rollback Strategy
Delete `server/admin/billing.ts`. Revert portal pages. No database changes.

### Test Strategy
- Integration test: RevenueCat API returns valid data
- Integration test: revenue aggregation is correct
- Manual test: charts render correctly with real data

### Validation Checklist
- [ ] RevenueCat API connection works
- [ ] Subscriber count matches RevenueCat dashboard
- [ ] Revenue charts render correctly
- [ ] Expiring subscriptions list is accurate
- [ ] Manual premium override works (from Phase 4)

### Exit Criteria
Billing dashboard shows real RevenueCat data. Git checkpoint saved.

---

## Phase 10 — Notification Center

**Complexity:** High  
**Estimated session time:** 90 minutes  
**Depends on:** Phase 3

### Objectives
- Build notification template management with lifecycle
- Build broadcast notification (all users)
- Build segmented notifications (free, premium, teachers, country)
- Build scheduled notifications
- Build delivery analytics and failure logs

### Files Expected to Change
```
drizzle/migrations/
  0012_notification_templates.sql
  0013_notification_campaigns.sql
server/admin/
  notifications.ts
admin-portal/src/
  pages/
    notifications/
      NotificationList.tsx
      NotificationCompose.tsx
      NotificationSchedule.tsx
      DeliveryAnalytics.tsx
      FailureLogs.tsx
```

### Database Migrations
```sql
-- Migration 0012
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES admin_accounts(id),
  published_by UUID REFERENCES admin_accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 0013
CREATE TABLE notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_id UUID REFERENCES notification_templates(id),
  segment JSONB NOT NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  created_by UUID REFERENCES admin_accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints
```
GET    /admin/notifications/templates         ← list templates
POST   /admin/notifications/templates         ← create template
PATCH  /admin/notifications/templates/:id     ← update draft
POST   /admin/notifications/templates/:id/publish ← publish
GET    /admin/notifications/campaigns         ← list campaigns
POST   /admin/notifications/campaigns         ← create campaign
POST   /admin/notifications/campaigns/:id/send ← send immediately
POST   /admin/notifications/campaigns/:id/schedule ← schedule
GET    /admin/notifications/campaigns/:id/analytics ← delivery stats
```

### Rollback Strategy
Drop `notification_templates` and `notification_campaigns` tables. Delete `server/admin/notifications.ts`.

### Test Strategy
- Integration test: broadcast notification sends to all users
- Integration test: segmented notification sends only to matching users
- Integration test: scheduled notification fires at correct time
- Integration test: delivery analytics update correctly

### Validation Checklist
- [ ] Template creation and lifecycle works
- [ ] Broadcast sends to all active users
- [ ] Segmented send filters correctly by segment
- [ ] Scheduled notification fires at correct time
- [ ] Delivery analytics show sent/delivered/failed counts
- [ ] Failure logs show error details
- [ ] All actions in audit log

### Exit Criteria
Notification center is fully operational. Git checkpoint saved.

---

## Phase 11 — Content Moderation

**Complexity:** Medium  
**Estimated session time:** 60 minutes  
**Depends on:** Phase 3

### Objectives
- Build flagged content queue
- Build abuse report management
- Remove and restore content
- Moderator notes and history
- AI-generated moderation reports

### Files Expected to Change
```
drizzle/migrations/
  0014_moderation.sql
server/admin/
  moderation.ts
admin-portal/src/
  pages/
    moderation/
      ModerationQueue.tsx
      AbuseReports.tsx
      ContentDetail.tsx
      ModerationHistory.tsx
```

### Database Migrations
```sql
-- Migration 0014
CREATE TABLE abuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  resolved_by UUID REFERENCES admin_accounts(id),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON abuse_reports(status);

CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_accounts(id),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints
```
GET    /admin/moderation/queue        ← pending reports
GET    /admin/moderation/reports      ← all reports with filters
POST   /admin/moderation/reports/:id/resolve ← resolve report
POST   /admin/moderation/content/:type/:id/remove ← remove content
POST   /admin/moderation/content/:type/:id/restore ← restore content
GET    /admin/moderation/history      ← moderation action history
```

### Rollback Strategy
Drop `abuse_reports` and `moderation_actions` tables. Delete `server/admin/moderation.ts`.

### Test Strategy
- Integration test: report queue shows pending reports
- Integration test: content removal marks content as removed in database
- Integration test: resolution closes report and creates audit entry
- Manual test: queue renders correctly with real report data

### Validation Checklist
- [ ] Report queue loads with pending reports
- [ ] Content removal works and is audit logged
- [ ] Report resolution updates status correctly
- [ ] Moderator notes are saved and visible in history
- [ ] All actions in audit log

### Exit Criteria
Content moderation queue is operational. Git checkpoint saved.

---

## Phase 12 — Analytics Dashboards

**Complexity:** High  
**Estimated session time:** 90 minutes  
**Depends on:** Phase 3

### Objectives
- Build executive analytics dashboard
- DAU/MAU, retention, subscription metrics, AI usage, classroom growth
- Country distribution, session length, feature adoption
- Conversion funnels
- Real-time activity feed

### Files Expected to Change
```
server/admin/
  analytics.ts                      ← aggregation queries
admin-portal/src/
  pages/
    analytics/
      Overview.tsx
      UserAnalytics.tsx
      RevenueAnalytics.tsx
      AIAnalytics.tsx
      ClassroomAnalytics.tsx
      RealTimeActivity.tsx
  components/
    charts/
      LineChart.tsx
      BarChart.tsx
      FunnelChart.tsx
      GeoMap.tsx
      MetricCard.tsx
```

### Database Migrations
None (analytics are computed from existing tables).

### API Endpoints
```
GET    /admin/analytics/overview      ← key metrics summary
GET    /admin/analytics/users         ← DAU, MAU, retention cohorts
GET    /admin/analytics/revenue       ← MRR, ARR, conversion rate
GET    /admin/analytics/ai            ← AI usage, cost, feature breakdown
GET    /admin/analytics/classrooms    ← classroom growth, teacher growth
GET    /admin/analytics/geo           ← country distribution
GET    /admin/analytics/realtime      ← active users in last 5 minutes
```

### Rollback Strategy
Delete `server/admin/analytics.ts`. Revert portal pages. No database changes.

### Test Strategy
- Integration test: DAU/MAU returns correct counts
- Integration test: retention cohort calculation is correct
- Manual test: all charts render with real data
- Performance test: analytics queries complete in under 2 seconds

### Validation Checklist
- [ ] Overview dashboard loads with correct metrics
- [ ] DAU/MAU charts render correctly
- [ ] Revenue metrics match billing dashboard
- [ ] AI usage analytics match AI request logs
- [ ] Real-time activity shows current active users
- [ ] All charts are responsive and readable

### Exit Criteria
Analytics dashboards are fully operational with real data. Git checkpoint saved.

---

## Phase 13 — Monitoring and Developer Tools

**Complexity:** Medium  
**Estimated session time:** 75 minutes  
**Depends on:** Phase 3

### Objectives
- Build API health monitoring dashboard
- Build infrastructure metrics display (from deployment platform API)
- Build curated query library interface
- Build log viewer
- Build cache management
- Build webhook monitor
- Build environment viewer

### Files Expected to Change
```
server/admin/
  monitoring.ts
  developer-tools.ts
admin-portal/src/
  pages/
    monitoring/
      SystemHealth.tsx
      APIMetrics.tsx
      InfraMetrics.tsx
      ErrorLogs.tsx
    developer/
      QueryLibrary.tsx
      LogViewer.tsx
      CacheManager.tsx
      WebhookMonitor.tsx
      EnvironmentViewer.tsx
```

### Database Migrations
```sql
-- Query execution log (already planned in architecture)
CREATE TABLE query_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_accounts(id),
  query_name TEXT NOT NULL,
  parameters_json JSONB,
  rows_affected INTEGER,
  execution_ms INTEGER,
  approved_by UUID REFERENCES admin_accounts(id),
  reason TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints
```
GET    /admin/monitoring/health       ← all service health statuses
GET    /admin/monitoring/api          ← API metrics (latency, error rate)
GET    /admin/monitoring/infra        ← infrastructure metrics
GET    /admin/monitoring/logs         ← paginated error logs
GET    /admin/developer/queries       ← list available queries
POST   /admin/developer/queries/:name ← execute a curated query
GET    /admin/developer/cache         ← cache stats
DELETE /admin/developer/cache/:key    ← invalidate cache key
GET    /admin/developer/env           ← non-secret environment info
```

### Rollback Strategy
Delete `server/admin/monitoring.ts` and `server/admin/developer-tools.ts`. Drop `query_executions` table. Revert portal pages.

### Test Strategy
- Integration test: health check returns status for all services
- Integration test: curated query executes and returns results
- Integration test: write query requires approval before execution
- Manual test: log viewer loads and filters correctly

### Validation Checklist
- [ ] Health dashboard shows all service statuses
- [ ] API metrics show latency and error rate
- [ ] Curated query library lists all available queries
- [ ] Write queries require approval
- [ ] Log viewer loads and filters correctly
- [ ] Cache invalidation works
- [ ] All query executions are logged

### Exit Criteria
Monitoring and developer tools are operational. Git checkpoint saved.

---

## Phase 14 — Backup, Recovery, and Final Audit

**Complexity:** Medium  
**Estimated session time:** 60 minutes  
**Depends on:** All previous phases

### Objectives
- Implement configuration snapshot system
- Implement restore point creation
- Build final end-to-end audit of the entire platform
- Fix any defects discovered during audit
- Generate complete documentation
- Final git checkpoint

### Files Expected to Change
```
drizzle/migrations/
  0016_config_snapshots.sql
server/admin/
  backup.ts
admin-portal/src/
  pages/
    backup/
      Snapshots.tsx
      RestorePoints.tsx
docs/
  ADMIN_SYSTEM_ARCHITECTURE.md
  ADMIN_API_REFERENCE.md
  PERMISSION_MODEL.md
  SECURITY_MODEL.md
  DEPLOYMENT_GUIDE.md
  DISASTER_RECOVERY.md
```

### Exit Criteria
Full end-to-end audit complete. All defects fixed. Documentation generated. Both recovery conditions satisfied (internal checkpoint + GitHub push). Mission complete.

---

## System Configuration (Phase Supplement)

The following system configuration capabilities are distributed across phases but collected here for reference:

```
Managed via Feature Flags (Phase 5):
  - Maintenance mode
  - Feature limits
  - AI limits

Managed via System Config table (added in Phase 5):
  - App announcements
  - Required app version
  - Minimum supported version
  - Terms of Service URL
  - Privacy Policy URL
  - Support links
  - Storage limits
  - Application branding

Managed via Translation Service (Phase 7):
  - All user-facing strings in 35 languages
```
