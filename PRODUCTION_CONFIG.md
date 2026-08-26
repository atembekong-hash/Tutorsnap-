# TutorSnap Production Configuration

This document outlines the production configuration for TutorSnap with tutorsnapai.tech as the primary domain.

## Production Values

### Mobile App (iOS & Android)

| Field | Value |
|-------|-------|
| **Package Name (Android)** | `com.tutorsnap.app` |
| **Bundle ID (iOS)** | `com.tutorsnap.app` |
| **Mobile Scheme** | `tutorsnap://` |
| **Native Callback** | `tutorsnap://oauth/callback` |

### Web

| Field | Value |
|-------|-------|
| **Production Domain** | `tutorsnapai.tech` |
| **Production API URL** | `https://api.tutorsnapai.tech` | Set this as `PUBLIC_API_URL` for the backend. The value must be the canonical HTTPS API origin. |
| **Web OAuth Callback** | `https://tutorsnapai.tech/api/oauth/callback` |
| **Privacy Policy** | `https://tutorsnapai.tech/privacy` |
| **Terms of Service** | `https://tutorsnapai.tech/terms` |
| **Support** | `https://tutorsnapai.tech/support` |

### Apple Sign-In (iOS)

| Field | Value |
|-------|-------|
| **Services ID** | `com.tutorsnap.app` |
| **Domain** | `tutorsnapai.tech` |
| **Return URL** | `https://tutorsnapai.tech/api/oauth/callback` |
| **Associated Domains** | `applinks:tutorsnapai.tech`, `applinks:www.tutorsnapai.tech`, `webcredentials:tutorsnapai.tech` |

### Required backend environment variable

Set `PUBLIC_API_URL=https://api.tutorsnapai.tech` in production. The voice upload and transcription flow rejects host-header-derived origins in production and accepts only first-party, HTTPS storage URLs. Keep all database, OAuth, AI, email, session, webhook, and scheduler secrets in the deployment secret store; do not place them in this file or in the repository.

## Development/Preview Configuration

For development and testing, the app uses dynamic preview URLs:

| Field | Value |
|-------|-------|
| **Mobile Scheme** | `manus://` |
| **Native Callback** | `manus://oauth/callback` |
| **Web Preview** | Dynamic (e.g., `https://8081-xxxxx.us2.manus.computer`) |
| **API Preview** | Dynamic (e.g., `https://3000-xxxxx.us2.manus.computer`) |

## Environment Detection

The app automatically detects the environment:

- **Production** (`NODE_ENV === "production"`):
  - Uses `tutorsnap://` scheme
  - Redirects to `https://tutorsnapai.tech`
  - Uses `https://api.tutorsnapai.tech`

- **Development/Preview** (default):
  - Uses `manus://` scheme
  - Uses dynamic preview URLs from environment variables
  - Maintains backward compatibility with Manus infrastructure

## Configuration Files

### app.config.ts

- `PRODUCTION_DOMAIN`: `tutorsnapai.tech`
- `PRODUCTION_API_URL`: `https://api.tutorsnapai.tech`
- `PRODUCTION_MOBILE_SCHEME`: `tutorsnap`
- `linking.prefixes`: Includes both production domain and legacy fallback

### constants/oauth.ts

- `OAUTH_PRODUCTION_DOMAIN`: `tutorsnapai.tech`
- `OAUTH_PRODUCTION_API_URL`: `https://api.tutorsnapai.tech`
- `OAUTH_PRODUCTION_MOBILE_SCHEME`: `tutorsnap`
- `getRedirectUri()`: Returns production URL in production, preview URL in development

### server/_core/oauth.ts

- Callback redirect: Uses production domain in production, preview URL in development
- Cookie domain: Set for both production and preview domains

## Google OAuth Setup

### Android

- **Package Name**: `com.tutorsnap.app`
- **SHA-1 Fingerprint**: [Get from your keystore]
- **Redirect URI**: `tutorsnap://oauth/callback`

### iOS

- **Bundle ID**: `com.tutorsnap.app`
- **Redirect URI**: `tutorsnap://oauth/callback`

### Web

- **Authorized Redirect URI**: `https://tutorsnapai.tech/api/oauth/callback`
- **Authorized JavaScript Origins**: `https://tutorsnapai.tech`

## Apple Sign-In Setup

### iOS

- **Bundle ID**: `com.tutorsnap.app`
- **Services ID**: `com.tutorsnap.app`
- **Domain**: `tutorsnapai.tech`
- **Return URL**: `https://tutorsnapai.tech/api/oauth/callback`
- **Associated Domains**: Configure in Xcode with `applinks:tutorsnapai.tech`

## Deployment Checklist

- [ ] DNS records configured for `tutorsnapai.tech`
- [ ] SSL certificate installed for `tutorsnapai.tech`
- [ ] Google OAuth credentials created (Android, iOS, Web)
- [ ] Apple Sign-In configured with Services ID
- [ ] Backend API deployed to `https://api.tutorsnapai.tech`
- [ ] OAuth callback endpoint tested at `/api/oauth/callback`
- [ ] Deep links tested on iOS and Android
- [ ] Web OAuth flow tested on production domain
- [ ] Cookie domain verified for both `tutorsnapai.tech` and `api.tutorsnapai.tech`

## Rollback Plan

If issues occur in production:

1. Revert to preview configuration by setting `NODE_ENV !== "production"`
2. Temporarily redirect `tutorsnapai.tech` to preview URL
3. Update OAuth credentials to use preview URLs
4. Test thoroughly before re-deploying to production

## Notes

- The `manus://` scheme is retained for development and preview environments
- Legacy fallback to `https://tutorsnap.app` is included for testing
- Production configuration is automatically detected via `NODE_ENV`
- All environment-specific logic is centralized in configuration files
