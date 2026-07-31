# NEXT_PHASE.md
**Last Updated:** 2026-07-31

## Current Status
Implementation has not begun. Awaiting user approval.

## Next Phase to Execute
**Phase 0 — Project Bootstrap**

### What to do
1. Create `tutorsnap-admin/` directory inside `/home/ubuntu/mathgenius-ai/`
2. Initialize admin portal as a Vite + React 18 + TypeScript app
3. Initialize admin API as a new Express router directory
4. Create shared TypeScript types in `tutorsnap-admin/shared/`
5. Verify TypeScript compiles with zero errors
6. Save git checkpoint
7. Update all recovery documents

### Files to create
- `tutorsnap-admin/admin-portal/` — Vite scaffold
- `tutorsnap-admin/admin-api/` — Express router scaffold
- `tutorsnap-admin/shared/types/admin.ts`
- `tutorsnap-admin/shared/types/audit.ts`
- `tutorsnap-admin/shared/types/permissions.ts`

### Success criteria
Admin portal dev server starts. TypeScript is clean. Git checkpoint saved. GitHub push confirmed.

### After Phase 0 completes
Update this file to point to Phase 1 — Admin Authentication and RBAC.
