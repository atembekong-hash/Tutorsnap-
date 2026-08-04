# TutorSnap Operations Runbook

**Author:** Manus AI  
**Applies to:** TutorSnap API 1.8.5 on Railway, Cloudflare DNS, Resend email, RevenueCat billing, Sentry observability, and Expo/EAS Android releases.

## Operating model

TutorSnap uses an isolated Railway `staging` environment before production. The API container starts only after committed Drizzle migrations succeed, and Railway routes traffic to a new deployment only after `/api/ready` returns HTTP 200. Railway documents that this health check protects deployment cutover but does **not** provide continuous monitoring after activation.[1]

| Environment | API                                       | Database                    | Deployment source                                                                       |
| ----------- | ----------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| Staging     | `https://api-staging-f955.up.railway.app` | Isolated Railway MySQL      | Validated `release/**` branch through GitHub Actions and a staging-scoped Railway token |
| Production  | `https://api.tutorsnapai.tech`            | Production Railway database | Promoted release commit after staging validation and release gates                      |

## CI/CD controls

Every push to `main` or `release/**`, and every pull request to `main`, runs `.github/workflows/ci.yml`. The workflow installs the locked pnpm dependency graph, type-checks, lints, runs the deterministic test suite, bundles the API and migration runner, verifies the committed generated bundle, builds the exact Railway Docker image, and scans committed source for secrets.

A successful push to `release/**` then deploys staging. `scripts/deploy-railway.mjs` uploads source in detached mode, captures the exact deployment ID, and polls that deployment to a terminal status. `scripts/verify-deployment.mjs` subsequently checks liveness, database readiness, version consistency, allowed and denied CORS origins, and RevenueCat webhook authentication. A failed build, migration, readiness check, or live contract check fails the workflow.

The GitHub `staging` environment requires one encrypted repository/environment secret named `RAILWAY_STAGING_TOKEN`. The token must be scoped to the TutorSnap Railway project’s `staging` environment. It must never be placed in source, workflow YAML, logs, issues, or build artifacts.

## Continuous monitoring

`.github/workflows/api-health-monitor.yml` runs every 15 minutes for staging and production. It uses the same live contract verifier as deployment CI. On failure, the workflow creates one idempotent GitHub issue per affected environment and adds subsequent failure evidence as comments. When health recovers, the workflow comments on and closes the incident issue automatically.

This external monitor is necessary because Railway’s deployment health checks are not ongoing uptime checks.[1] Sentry separately captures application exceptions and is labeled by Railway environment name, preventing staging events from polluting production.

## OTP cleanup scheduler

The primary OTP cleanup job is an in-process worker started with the API. It runs immediately at startup and every 30 minutes. A database-backed `scheduler_locks` row ensures only one API instance performs cleanup when replicas overlap.

The fallback endpoint is `POST /api/scheduled/otp-cleanup`. It requires either `Authorization: Bearer <SCHEDULE_SECRET>` or `X-Cron-Secret: <SCHEDULE_SECRET>`. An unauthenticated request must return HTTP 401. The secret is stored only in Railway. The fallback should be invoked manually only when scheduler logs or database inspection indicate stale OTP rows; it is not a second recurring scheduler.

## Deployment rollback

Railway retains successful deployments according to the workspace plan. To roll back, open **Service → Deployments**, use the action menu on the last known-good deployment, select **Rollback**, review the target deployment, and confirm. Railway states that rollback restores both the Docker image and the deployment’s custom variables, so variables changed after that deployment must be reviewed immediately after rollback.[2]

After rollback, verify the following in order:

| Gate                            | Expected result                                                  |
| ------------------------------- | ---------------------------------------------------------------- |
| `/api/health`                   | HTTP 200, `ok=true`, expected service version                    |
| `/api/ready`                    | HTTP 200, `database=ready`                                       |
| `/version.json`                 | `minVersion` is not greater than `latestVersion`                 |
| RevenueCat unsigned smoke event | HTTP 401                                                         |
| Resend OTP request              | Accepted and shown as delivered in Resend                        |
| Sentry                          | New errors use the correct `staging` or `production` environment |

Do not remove a failed deployment until its logs and deployment ID have been preserved. Railway distinguishes rollback from redeploy: rollback returns to a previous successful deployment and its variables, while redeploy creates a new deployment using the selected build’s exact code and configuration.[2]

## Database backups and restore

The current Railway workspace plan does not expose native volume backups or point-in-time recovery; the staging MySQL **Backups** tab reports **No Backups** and requires the Pro plan. This is a known release risk, not an active safeguard.

When native backups are available, enable daily, weekly, and monthly schedules on both staging and production MySQL volumes. Railway documents six-day retention for daily backups, one-month retention for weekly backups, and three-month retention for monthly backups.[3] Perform a staging restore drill before relying on production recovery. Railway restores a backup into a new volume, retains the previous volume unmounted, and stages the change for review before deployment.[3]

> **Release gate:** Do not describe the database as fully recoverable until a backup exists and a staging restore drill has been completed.

## Incident response

When an alert opens, first identify whether the failure is DNS/TLS, Railway routing, application startup, migration, database readiness, or an external integration. Preserve the GitHub run URL, Railway deployment ID, build logs, deploy logs, and Sentry event ID. If the active deployment cannot recover quickly, roll back to the last successful deployment and repeat the live contract checks. Database restore is a separate action and should be used only for confirmed data loss or corruption, not for application regressions.

## Secret rotation

Rotate Railway project tokens after personnel or automation changes, and revoke temporary tokens after migration work is complete. Rotating `JWT_SECRET` invalidates all sessions. Rotating `OTP_PEPPER` invalidates unexpired OTPs. Rotating `REVENUECAT_WEBHOOK_SECRET` requires updating Railway and RevenueCat together. Rotating `RESEND_API_KEY` requires updating Railway and confirming a delivered OTP before retiring the old key. Never copy secret values into incident issues or runbooks.

## References

[1]: https://docs.railway.com/deployments/healthchecks "Railway Docs — Healthchecks"
[2]: https://docs.railway.com/deployments/deployment-actions "Railway Docs — Deployment Actions"
[3]: https://docs.railway.com/volumes/backups "Railway Docs — Backups"
