# TutorSnap

TutorSnap is an Expo and React Native learning application with AI-powered problem solving, practice and quiz flows, voice input, cloud synchronization, subscriptions, and guided classrooms. The backend is an Express server exposing tRPC procedures, OAuth routes, storage and transcription endpoints, RevenueCat webhook handling, health/readiness checks, and Drizzle/MySQL persistence.

## Prerequisites

Use Node.js 22, Corepack, and pnpm 9.12.0. A local development environment needs the variables described in [`PRODUCTION_CONFIG.md`](./PRODUCTION_CONFIG.md) for the features being exercised. Never commit server credentials, signing keys, OAuth private keys, database URLs, webhook secrets, or API keys.

## Install and run locally

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

The development command starts the API and the Expo web/Metro process together. To run them separately, use `pnpm dev:server` and `pnpm dev:metro`. Native development uses `pnpm android` or `pnpm ios` on a machine with the corresponding toolchain.

## Validation commands

Run the following before opening a pull request or creating a release:

```bash
pnpm check
pnpm lint
pnpm test:ci
pnpm build
```

`pnpm test:ci` is the deterministic suite used by CI. Environment-dependent checks are available through `pnpm test:integration:config` and `pnpm test:integration:webhook`; classroom database integration is run by the CI workflow against a temporary MySQL service.

## Backend deployment

The backend is containerized with [`Dockerfile`](./Dockerfile) and configured for Railway in [`railway.json`](./railway.json). Production must provide, at minimum, a database connection, OAuth/session configuration, AI/storage configuration, RevenueCat webhook secret, and `PUBLIC_API_URL`. `PUBLIC_API_URL` must be the canonical HTTPS origin of the API; it is used to create first-party audio URLs and prevents host-header-derived URLs in production.

Railway runs the compiled migration bundle before starting the API. The readiness endpoint is `/api/ready`, while `/api/health` reports basic service metadata. Do not consider a deployment successful until readiness, migration completion, and the API contract verification have all passed.

## Security expectations

User-scoped procedures must use the authenticated server session and must not trust a client-supplied user ID. Voice uploads and transcription are authenticated, bounded to supported audio formats and sizes, and scoped to the owner’s storage prefix. Chargeable AI operations require authentication and enforce bounded request schemas. RevenueCat webhooks require `REVENUECAT_WEBHOOK_SECRET` in production and return retryable errors when persistence is unavailable.

When adding a new route, decide explicitly whether it is public. For every public route, document why authentication is unnecessary, bound every string and array input, avoid accepting arbitrary URLs, and add abuse controls appropriate to its cost. For every user-owned route, add unauthenticated and cross-user authorization tests.

## Release checklist

The detailed manual matrix is maintained in [`PRODUCTION_READINESS_CHECKLIST.md`](./PRODUCTION_READINESS_CHECKLIST.md). A release owner should record the app version, build number, device/OS coverage, test date, tester, evidence links, known waivers, and rollback decision. The repository’s CI checks are necessary but do not replace real-device checks for camera, microphone, notifications, OAuth, purchases, deep links, offline recovery, and light/dark mode.

## Repository map

| Area | Location | Purpose |
|---|---|---|
| Mobile routes | `app/` | Expo Router screens and protected navigation |
| Shared UI | `components/`, `hooks/`, `lib/` | Reusable presentation, state, and client integrations |
| API | `server/` | Express bootstrap, tRPC routers, OAuth, storage, AI, and operations |
| Database | `drizzle/` | Schema and migration definitions |
| Tests | `tests/` | Unit, contract, authorization, integration, and regression coverage |
| Operations | `docs/operations/`, `PRODUCTION_CONFIG.md` | Deployment, monitoring, and environment guidance |
| CI | `.github/workflows/` | Validation, staging deployment, and health monitoring |
