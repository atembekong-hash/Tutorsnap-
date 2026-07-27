# Phase Progress Notes

## Current state: checkpoint da6d25d5 (Phase A complete)

## Phase A — DONE ✅ (checkpoint da6d25d5)
- paywall.tsx: Added ToS/Privacy links at bottom
- paywall.tsx: Replaced ctaSubLabel with plan-aware post-trial price label
- Verified in browser: "Free for 7 days, then $69.99/yr ($5.83/mo). Cancel anytime."
- Verified in browser: "Terms of Service · Privacy Policy" links present
- 157/157 tests pass

## Phase B — IN PROGRESS (NOT YET CHECKPOINTED)
- onboarding.tsx: Added subscription imports (purchaseProduct, getOfferings, etc.)
- onboarding.tsx: Added selectedPlan, purchaseLoading, monthlyPriceStr, annualPriceStr state
- onboarding.tsx: Added handleOnboardingPurchase() function
- onboarding.tsx: Replaced trial slide feature list with inline plan selector (two cards)
- onboarding.tsx: Updated goNext to call handleOnboardingPurchase() on last slide
- onboarding.tsx: CTA button shows "Starting Trial…" during loading, disabled during purchase
- onboarding.tsx: Added trialPlanRow, trialPlanCard, trialPlanCardAnnual, trialPlanCardSelected, trialPlanBadge, trialPlanBadgeText, trialPlanLabel, trialPlanPrice, trialPlanNote styles
- 157/157 tests pass, no TS errors
- Browser verification: onboarding page loaded blank (white screen) — need to investigate

## Phase C — NOT STARTED
- New file: app/cancel-retention.tsx
- settings.tsx: change handleManageSubscription to push to /cancel-retention

## Key files changed:
- /home/ubuntu/mathgenius-ai/app/paywall.tsx (Phase A)
- /home/ubuntu/mathgenius-ai/app/onboarding.tsx (Phase B)

## App URL: https://8081-i7efnn8a2rjqf407r8m27-093736d4.us2.manus.computer
