# TutorSnap Production Hardening Handoff

**Reviewed repository:** [`atembekong-hash/Tutorsnap-`](https://github.com/atembekong-hash/Tutorsnap-)  
**Hardening branch:** `production-hardening`  
**Pull request:** [#3 — Security hardening for production readiness](https://github.com/atembekong-hash/Tutorsnap-/pull/3)  
**Latest commit:** `4f3b0a0`

## What was fixed

The hardening branch removes client authority over user identity in OAuth profile operations and referral ownership operations. Profile reads and updates now require an authenticated procedure and use `ctx.user.id`; referral generation, validation, and code listing follow the same rule. Referral-use increments are conditional and atomic, preventing concurrent requests from exceeding the configured usage limit.

All model-backed tRPC operations now require authentication and use bounded prompt, history, array, and count inputs. A per-user, per-route sliding-window limiter bounds authenticated model requests in each API process. AI feedback is also session-bound instead of accepting anonymous user-scoped writes.

The direct voice path is now authenticated on both the mobile client and backend. The upload route validates audio MIME types, rejects malformed or oversized Base64 payloads, uses random per-user storage keys, and requires `PUBLIC_API_URL` in production. Transcription accepts only first-party storage URLs, checks ownership, resolves the object to a server-side signed URL, enforces HTTPS in production, applies a fetch timeout, and limits streamed audio to 16 MB. The storage proxy requires authentication and applies ownership checks to voice objects.

RevenueCat webhook handling now rejects events missing subscription identity fields and returns HTTP 503 when the database is unavailable, allowing the provider to retry rather than silently losing the event. Production configuration now documents the canonical API-origin requirement, and the repository has a maintained README covering development, validation, deployment, and security expectations.

## Validation evidence

| Gate | Result |
|---|---|
| TypeScript (`pnpm check`) | Passed with 0 errors |
| Lint (`pnpm lint`) | Passed with 0 errors; 189 pre-existing warnings remain |
| CI unit/contract suite (`pnpm test:ci`) | 23 test files passed, 1 environment-dependent file skipped; 258 tests passed, 9 skipped |
| Focused hardening regressions | Passed; authorization, AI, voice-adjacent, webhook, and rendering tests passed |
| Backend bundle (`pnpm build`) | Passed; generated `dist` artifact committed |
| Diff whitespace check | Passed |
| GitHub pull-request CI | Passed on the prior hardening commit; the latest test-only commit was pushed and its hosted check was pending at handoff |

The nine skipped tests are environment-dependent checks, and the classroom integration file is skipped unless a real test database is configured. Local validation does not substitute for real-device testing or production-provider verification.

## Required release gates outside the repository

The app should not be called fully production-ready until an owner completes the following gates. Configure the production secret store with `PUBLIC_API_URL=https://api.tutorsnapai.tech`, database credentials, session/OAuth configuration, AI and storage credentials, `REVENUECAT_WEBHOOK_SECRET`, email configuration, and scheduler secrets. Confirm that the actual deployed API origin matches the mobile app’s configured API base URL.

Run a staging migration and API contract verification, then exercise the RevenueCat webhook from the provider test console. Verify Google and Apple sign-in with production client IDs, email OTP delivery and rate limits, purchases and restore flows, cancellation and grace-period behavior, and account deletion. Execute the checklist on physical iOS and Android devices for camera, microphone, notifications, deep links, offline recovery, keyboard behavior, light/dark mode, and small-screen layouts.

Finally, review the remaining lint warnings, especially React Hook dependency warnings and unused variables, as a separate quality-cleanup change; they do not currently fail CI, but eliminating them will reduce maintenance risk. Merge PR #3 only after the owner has reviewed the external release gates and confirmed a rollback target.

## Files changed

The branch changes the API bootstrap and authorization layers, OAuth and referral routers, AI procedure definitions and validation, voice upload/transcription/storage paths, the mobile voice hook, production configuration, the generated backend bundle, the README, and authorization regression tests. The original static assessment remains available as `TUTORSNAP_REPOSITORY_ASSESSMENT.md` for historical context; this handoff reflects the subsequent fixes.
