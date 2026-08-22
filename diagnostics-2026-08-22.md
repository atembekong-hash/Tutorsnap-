# Production diagnostics, 2026-08-22

- `https://api.tutorsnapai.tech/api/health` returned HTTP 200 with `ok: true`, service `tutorsnap-api`, version `2.3.0`.
- `https://api.tutorsnapai.tech/api/ready` returned HTTP 200 with `ok: true` and `database: ready`.
- `https://api.tutorsnapai.tech/api/trpc/system.health` accepted the tRPC route; GET without input returned the expected BAD_REQUEST, and POST correctly rejected a query procedure with METHOD_NOT_SUPPORTED.
- The production host resolves to Railway (`gm3d9muo.up.railway.app`).
- Browser navigation to `https://tutorsnapai.tech` failed DNS resolution, so only the API host is available for web verification in this environment.
- Source fix is committed and pushed as `12f171a` to `atembekong-hash/Tutorsnap-`.
- GitHub CI run `32590353087` passed all validation jobs; its staging deployment job was skipped because the push was to `main`, not `release/*`.

## Root cause identified

Native sign-in stores the server-issued `oauth.validate` session token only if `lib/oauth-service.ts` forwards the backend `token` field. The restored source dropped that field, causing `auth-screen.tsx` to fall back to Google/Apple provider ID tokens. The tRPC server expects a TutorSnap HS256 session JWT, so protected Solve, Practice, and Classroom procedures returned UNAUTHORIZED while the standalone public AI Tutor stream continued to work.

A secondary split-brain issue existed in the Google refresh path and OAuth callback: the enhanced auth state and tRPC session store could diverge. The fix now forwards the token, prioritizes `result.token`, exchanges refreshed Google ID tokens for a new TutorSnap session JWT, and syncs callback sessions into both stores.

- Expo account `vvault07` authenticated successfully in the browser using the credentials supplied by the user. The Access tokens page is open and shows the account’s existing personal tokens; no new token has been created during this session.

- EAS build `98b68ef1-abfa-4ab0-bf8a-418873b403d5` completed with status `FINISHED`, app version `2.3.0`, Android build version `67`, profile `production-apk`, and source commit `5f9383c20fd00121eeab7b3fbb7575074dcb30c4`. Artifact URL: `https://expo.dev/artifacts/eas/AV-kkyPEG6CEdIKBYLa86uugb4DydHXCJSJbB6so-dE.apk`.
- The APK was downloaded to `/home/ubuntu/tutorsnap-release-2.3.0-build67/TutorSnap-2.3.0-67.apk` and its SHA-256 is `10f774e6422d38afa298f1f1b6fcca724481c4a96742b688fa436779003656d1`.
- The sandbox reset no longer has Android SDK verification binaries (`apksigner` and `aapt`) on PATH; APK signature and package metadata still need verification using an available alternative or after installing the Android build-tools package.

- Expo’s Access tokens page now shows 7 personal tokens, and the temporary `TutorSnap build 67 temporary` token is absent, confirming revocation and deletion.

- Production OTP request returned `{success:true, sent:true}` for the supplied account. Gmail opened successfully to the Google password step for `atembekong@gmail.com`; no email content or OTP has been accessed yet.
