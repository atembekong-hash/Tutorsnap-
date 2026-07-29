# RevenueCat Identity Audit — Pre-Fix State
# Generated: 2026-07-28

## Root Cause (confirmed from disk)

`initRevenueCat()` calls `Purchases.configure({ apiKey })` with NO `appUserID` parameter
(lib/subscription.ts:156). RC therefore starts with an anonymous random UUID on every app launch.

`loginRevenueCat(openId)` is called ONLY in `app/auth-screen.tsx:84` inside `finaliseSignIn()`.
`finaliseSignIn()` is called only on:
  - Explicit Google sign-in (auth-screen.tsx:115)
  - Explicit Apple sign-in (auth-screen.tsx:150)
  - Explicit Email/OTP sign-in (auth-screen.tsx:217)

It is NOT called on:
  - App restart with valid session (auth-context.tsx initAuth → getUserInfo → setUser, no RC call)
  - Automatic session restoration (hooks/use-auth.ts fetchUser → cachedUser, no RC call)

## openId Format (confirmed from disk)

| Provider | openId format | Source |
|---|---|---|
| Google | `google:{payload.sub}` | server/routers/oauth.ts:175 |
| Apple | `apple:{payload.sub}` | server/routers/oauth.ts:83 |
| Email | `email:{email}` | server/routers/email-auth.ts:450 |

## Component Tree (confirmed from disk)

RootLayout (app/_layout.tsx)
  └─ AuthProvider (lib/auth-context.tsx)
       └─ AuthGuard
            └─ ... app content ...

AuthProvider.initAuth() runs on mount:
  1. isAuthenticated() → checks AsyncStorage session token
  2. getUserInfo() → reads cached user from AsyncStorage
  3. setUser(userInfo) → React state set
  NO loginRevenueCat() call here.

RC init useEffect in RootLayout (app/_layout.tsx:115):
  1. initRevenueCat() → Purchases.configure({ apiKey }) — RC starts ANONYMOUS
  2. isAuthenticated() → checks session
  3. getSubscriptionStatus() → queries RC for ANONYMOUS user
  NO loginRevenueCat() call here.

## Identity Gap

On app restart for an authenticated user:
  - RC App User ID = anonymous UUID (random, changes on reinstall)
  - TutorSnap openId = permanent provider-scoped identifier
  - These are DIFFERENT → getSubscriptionStatus() queries wrong RC customer

## restorePurchases() Gap (confirmed from disk, lib/subscription.ts:335)

restorePurchases() calls Purchases.restorePurchases() without first calling loginRevenueCat().
If RC is in anonymous mode (app restart scenario), the restore is attributed to the anonymous ID.

## Sign-out (confirmed from disk, app/settings.tsx:699)

logoutRevenueCat() IS called before logout(). ✓
auth-context.tsx handleLogout does NOT call logoutRevenueCat(). ← secondary gap

## Fix Required

Phase 3: In app/_layout.tsx RC init useEffect, after initRevenueCat() and after auth check,
call loginRevenueCat(user.openId) if the user is authenticated.

The cleanest integration point is the EXISTING initRevenueCat().then() block at line 126,
which already calls isAuthenticated() and has access to auth state.

Phase 4: In restorePurchases(), call loginRevenueCat(openId) before Purchases.restorePurchases()
when an authenticated user is available.

Phase 5: auth-context.tsx handleLogout should also call logoutRevenueCat() so that
programmatic logout (not just settings screen) also clears RC identity.
