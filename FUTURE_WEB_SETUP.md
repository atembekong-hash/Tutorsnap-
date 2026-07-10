# Future Web Setup — tutorsnapai.tech

This document records all web-domain and hosting tasks that are intentionally deferred until the TutorSnap web application is built. None of these tasks are required for the mobile app to function.

---

## 1. Version Check Endpoint

**Current mobile behaviour:** The `useUpdateCheck` hook (`lib/use-update-check.ts`) fetches version metadata from the app's own Express backend at `/version.json`. This works in both development and production because the backend is bundled with the mobile app deployment.

**What to do when the web app is live:**

Point `https://tutorsnapai.tech/version.json` to the same JSON payload. The simplest approach is to add a reverse-proxy rule in your web server (Nginx, Caddy, Cloudflare Worker, or Vercel edge function) that forwards requests for `/version.json` to the Express API, or serve it as a static file from a CDN.

The expected JSON shape is:

```json
{
  "latestVersion": "1.1.0",
  "minVersion": "1.0.0",
  "releaseNotes": [
    "Flashcard PDF export",
    "Classroom leaderboard and homework tools"
  ],
  "iosStoreUrl": "https://apps.apple.com/app/tutorsnap/id<YOUR_APP_STORE_ID>",
  "androidStoreUrl": "https://play.google.com/store/apps/details?id=com.tutorsnap.app",
  "forceUpdate": false
}
```

Update `latestVersion` and `releaseNotes` with each new app release.

---

## 2. App Store ID Placeholder

**Current state:** The `/version.json` endpoint in `server/_core/index.ts` contains a placeholder iOS App Store ID (`id0000000000`).

**What to do:** Once the app is published on the App Store, replace `id0000000000` with the real numeric App Store ID in:

- `server/_core/index.ts` — the `iosStoreUrl` field in the `/version.json` route
- Any deep link or "Rate App" handler in `app/settings.tsx`

---

## 3. Legal and Policy Pages

The following URLs are referenced throughout the app and currently lead nowhere. They need real pages on the web domain:

| URL | Referenced in |
|-----|---------------|
| `https://tutorsnapai.tech/privacy` | `app/settings.tsx`, `app/legal.tsx` |
| `https://tutorsnapai.tech/terms` | `app/settings.tsx`, `app/legal.tsx` |
| `https://tutorsnapai.tech/solve?q=...` | Copy Link in `app/solution.tsx` share menu |

---

## 4. Deep Link / Universal Link Verification

When the web domain is live, configure Apple App Site Association (`/.well-known/apple-app-site-association`) and Android Asset Links (`/.well-known/assetlinks.json`) so that `tutorsnapai.tech/solve?q=...` deep links open the app directly instead of the browser.

---

## 5. Email Addresses

The following email addresses are used in the app and should be configured on the domain:

| Address | Used for |
|---------|----------|
| `support@tutorsnapai.tech` | Contact Support in Settings |
| `feedback@tutorsnapai.tech` | Send Feedback screen |
| `bugs@tutorsnapai.tech` | Report a Bug screen |
| `privacy@tutorsnapai.tech` | Data Deletion Request in Legal hub |

---

## Summary Checklist

- [ ] Point `tutorsnapai.tech/version.json` to the Express backend or a static CDN file
- [ ] Replace the placeholder App Store ID (`id0000000000`) after App Store submission
- [ ] Publish Privacy Policy at `tutorsnapai.tech/privacy`
- [ ] Publish Terms of Service at `tutorsnapai.tech/terms`
- [ ] Configure Apple App Site Association and Android Asset Links for universal links
- [ ] Set up email routing for support, feedback, bugs, and privacy addresses
