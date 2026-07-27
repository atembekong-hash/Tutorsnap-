# v2.0.0 Audit — Phase 1 Start

## Baseline
- Version: 1.9.0 / buildNumber 35 / versionCode 39
- Tests: 91/91 passing
- TS: 0 errors

## Phase 1 Goal
Add vitest tests for webhook auth:
1. Correct secret → 200 {"ok":true,"handled":false} (no event body)
2. Wrong secret → 401 {"error":"Unauthorized"}  
3. Absent env var → 200 passthrough (dev mode)

## Webhook endpoint location
- File: server/_core/index.ts
- Route: POST /api/webhooks/revenuecat
- Auth check: lines ~144-149 (checks process.env.REVENUECAT_WEBHOOK_SECRET)

## Test approach
- Use supertest + vitest to spin up the Express app
- Mock process.env.REVENUECAT_WEBHOOK_SECRET in each test case
- Do NOT hit the database — test only the auth layer
