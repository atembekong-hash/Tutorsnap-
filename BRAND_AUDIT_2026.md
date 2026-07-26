# TutorSnap Brand Identity Audit — 2026-07-26

## Official Brand Identity (Single Source of Truth)

| Field | Value |
|-------|-------|
| Company | Etiendem Technologies |
| Product | TutorSnap AI |
| Short Name | TutorSnap |
| AI Assistant | AI Tutor |
| Tagline | Learn Smarter. Achieve More. |
| Copyright | © 2026 Etiendem Technologies |
| Social Handle | @TutorSnapAIOfficial |

## Official URLs

| Purpose | URL |
|---------|-----|
| Primary / Canonical | https://tutorsnapai.tech |
| Fallback | https://www.tutorsnapai.tech |
| Help Center | https://help.tutorsnapai.tech |
| Documentation | https://docs.tutorsnapai.tech |
| Status | https://status.tutorsnapai.tech |
| Blog | https://blog.tutorsnapai.tech |
| Roadmap | https://roadmap.tutorsnapai.tech |
| Trust Center | https://trust.tutorsnapai.tech |
| Developer Portal | https://developers.tutorsnapai.tech |
| Careers | https://careers.tutorsnapai.tech |

## Official Email Addresses

| Purpose | Email |
|---------|-------|
| Support | support@tutorsnapai.tech |
| Business | contact@tutorsnapai.tech |
| Partnerships | partnerships@tutorsnapai.tech |
| Press | press@tutorsnapai.tech |
| Legal | legal@tutorsnapai.tech |
| Privacy | privacy@tutorsnapai.tech |
| Security | security@tutorsnapai.tech |
| Careers | careers@tutorsnapai.tech |
| No Reply | noreply@tutorsnapai.tech |
| Feedback | feedback@tutorsnapai.tech |
| Bug Reports | bugs@tutorsnapai.tech |

## Issues Found — Files to Update

### CRITICAL: Wrong/Placeholder Brand Values
1. `app.config.ts` line 21: `appSlug: "mathgenius-ai"` — DO NOT CHANGE (slug is permanent identifier)
2. `app.config.ts` line 22: `logoUrl: "https://files.manuscdn.com/..."` — manuscdn URL is OK (CDN)
3. `eas.json` lines 13,21,29,37,48: `EXPO_PUBLIC_API_BASE_URL: "https://mathgenius-g8jxpbar.manus.space"` — this is the live API URL, DO NOT CHANGE
4. `constants/oauth.ts` line 60: `return "https://mathgenius-g8jxpbar.manus.space"` — live API, DO NOT CHANGE
5. `app/(tabs)/chat.tsx` line 2193: `https://stutorsnapai.tech` — TYPO! Should be `https://tutorsnapai.tech`
6. `app/(tabs)/chat.tsx` line 2297: `https://stutorsnapai.tech` — TYPO! Should be `https://tutorsnapai.tech`

### MISSING: Company name not in About modal
- `app/settings.tsx` About modal: Missing "Etiendem Technologies" company name
- `app/settings.tsx` About modal: Missing tagline "Learn Smarter. Achieve More."
- `app/settings.tsx` About modal: Missing copyright "© 2026 Etiendem Technologies"
- `app/settings.tsx` version footer: Missing copyright

### MISSING: Full content pages
- `app/legal.tsx`: Privacy Policy text is brief — needs full production content
- `app/legal.tsx`: Terms of Service text is brief — needs full production content
- `app/legal.tsx`: Missing company name "Etiendem Technologies"
- `app/faq.tsx`: Needs company name references updated

### constants/app.ts — NEEDS EXPANSION
Current file has APP_NAME, APP_URL, SUPPORT_EMAIL, PRIVACY_URL, TERMS_URL.
Needs: COMPANY_NAME, TAGLINE, COPYRIGHT, all email addresses, all URLs.

### Files confirmed CORRECT (already using tutorsnapai.tech)
- app/faq.tsx: support@tutorsnapai.tech ✓
- app/feedback.tsx: feedback@tutorsnapai.tech ✓
- app/legal.tsx: privacy@tutorsnapai.tech, legal@tutorsnapai.tech ✓
- app/report-bug.tsx: bugs@tutorsnapai.tech ✓
- server/routers/email-auth.ts: support@tutorsnapai.tech ✓

## Implementation Plan

### Phase 2: Expand constants/app.ts (single source of truth)
### Phase 3: Fix typos in chat.tsx (stutorsnapai → tutorsnapai)
### Phase 4: Update settings.tsx About modal (add company, tagline, copyright)
### Phase 5: Populate full Privacy Policy and Terms of Service in legal.tsx
### Phase 6: Update all remaining files referencing brand
