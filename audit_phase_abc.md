# Audit Notes — Phases A, B, C

## Phase A: Compliance Fixes (paywall.tsx)

### What exists:
- `PRIVACY_URL = "https://tutorsnapai.tech/privacy"` in constants/app.ts ✅
- `TERMS_URL = "https://tutorsnapai.tech/terms"` in constants/app.ts ✅
- Legal text at line 422-424: "Subscription auto-renews unless cancelled at least 24 hours..."
- ctaSubLabel (from ab-test.ts): "14-day free trial, then cancel anytime" OR "7-day free trial, then 50% off your first month"
- PRICE_MONTHLY = 9.99, PRICE_ANNUAL = 69.99

### What's missing:
1. ToS and Privacy Policy links in the paywall footer (Apple HIG + App Store Review requirement)
2. Post-trial standard price not shown explicitly (e.g. "then $9.99/mo" after the free trial ends)
   - ctaSubLabel says "then cancel anytime" but doesn't show the price after trial

### Changes needed (paywall.tsx):
1. After the legal Text at line 422, add two inline Pressable links: "Terms of Service" and "Privacy Policy"
   - Use Linking.openURL(TERMS_URL) and Linking.openURL(PRIVACY_URL)
2. Update ctaSubLabel display to also show post-trial price:
   - For monthly: "Free for X days, then $9.99/mo. Cancel anytime."
   - For annual: "Free for X days, then $69.99/yr ($5.83/mo). Cancel anytime."
   - This should be derived from selectedPlan + trialVariant.trialDays

### Files to change: app/paywall.tsx only

---

## Phase B: Onboarding Paywall

### What exists:
- onboarding.tsx has `finishOnboardingAndShowPaywall()` at line 380 which:
  1. Sets ONBOARDING_DONE_KEY = "true"
  2. router.replace to /(tabs)
  3. setTimeout 300ms → router.push("/paywall")
- This function is called at line 281 (some step's "Next" button)
- `finishOnboarding()` at line 390 skips the paywall (used by Skip button at line 455 and Done button at line 803)

### What's missing:
- The paywall is shown as a modal AFTER navigating to the home screen — this is a jarring experience
- Industry best practice: show paywall as the FINAL step of onboarding, not as a popup after
- The Skip button bypasses the paywall entirely — this is correct (don't force it)
- Need to add a dedicated "paywall step" as the last onboarding screen

### Approach:
- Add a new step at the END of the onboarding flow (after the last content step, before Done)
- This step IS the paywall — rendered inline within onboarding, not as a separate route
- The step shows: trial badge, plan selector (monthly/annual), CTA, and skip option
- "Start Free Trial" → purchaseProduct() → then finishOnboarding()
- "Maybe Later" / "Skip" → finishOnboarding() (no paywall push)
- This replaces the setTimeout hack with a proper flow

### Files to change: app/onboarding.tsx only

---

## Phase C: Pre-cancellation Retention Screen

### What exists:
- settings.tsx line 1130: handleManageSubscription() calls openManageSubscriptions()
- openManageSubscriptions() in lib/subscription.ts opens the App Store subscription page
- No retention screen exists between the tap and the App Store redirect

### What's needed:
- A new screen: app/cancel-retention.tsx
- Shown when user taps "Manage Subscription" and isPremium=true
- Shows: "Before you go..." with exit survey (4 options: Too expensive, Not using it enough, Found a better app, Technical issues)
- After selecting reason: show a personalised offer (e.g. "Too expensive" → show 50% off offer)
- "Accept Offer" → navigate to paywall with offer pre-selected
- "Continue to Cancel" → openManageSubscriptions() → App Store
- "Never Mind" → dismiss / go back

### Files to change:
1. app/cancel-retention.tsx (new file)
2. app/settings.tsx — change handleManageSubscription to push to /cancel-retention instead of openManageSubscriptions directly

---

## Current checkpoint: d22b0175
## Test suite baseline: 157/157 passing
