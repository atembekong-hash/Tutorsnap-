# Payment System Hardening — Progress Log
Started: 2026-07-28
Baseline checkpoint: ae45f53 (origin/main)
Forensic audit: forensic_payment_audit.md (commit f55b5d6)
Baseline tests: 179/179 passing

## Phase Status

- [x] Phase 1 — Setup: baseline confirmed (179/179 tests, git state clean)
- [x] Phase 2 — FIX-1: initRevenueCat race condition (promise-mutex) ✓
- [x] Phase 3 — Checkpoint A ✓
- [x] Phase 4 — FIX-2: Webhook secret hardening (production rejects 500 when secret missing) ✓
- [x] Phase 5 — Checkpoint B: 198/198 tests passing ✓
- [x] Phase 6 — FIX-3: restorePurchases stale cache (included in Checkpoint A) ✓
- [x] Phase 7 — Checkpoint C: merged into Checkpoint A ✓
- [ ] Phase 8 — FIX-4: Server-side premium enforcement on AI/solve tRPC procedures
- [ ] Phase 9 — Checkpoint D
- [x] Phase 10 — FIX-5: RC v10 cancel code (included in Checkpoint A) ✓
- [ ] Phase 10b — FIX-6: Move incrementUsage to onSuccess callback
- [ ] Phase 11 — Checkpoint E
- [ ] Phase 12 — FIX-7: Webhook timestamp review + dead-letter decision
- [ ] Phase 13 — Checkpoint F
- [ ] Phase 14 — Final validation + report

## Next immediate action
Phase 8: FIX-4 — Add server-side premium enforcement middleware on tRPC solve/AI procedures in server/routers.ts

## Files in scope
- lib/subscription.ts (FIX-1, FIX-3, FIX-5)
- server/_core/index.ts (FIX-2, FIX-7)
- server/routers.ts (FIX-4)
- app/(tabs)/index.tsx (FIX-6)
- tests/ (new test files for each fix)

## Next immediate action
Begin Phase 2: Replace _initialised boolean with _initPromise singleton in lib/subscription.ts
