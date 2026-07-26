# RevenueCat Setup Checklist

Complete these steps in order before releasing TutorSnap to the App Store or Google Play.

---

## 1. RevenueCat Dashboard

1. Go to [app.revenuecat.com](https://app.revenuecat.com) and open your project.
2. **Entitlement:** Create an entitlement with ID exactly `premium`.
3. **Products:** Add two products:
   - `tutorsnap_monthly` → link to your App Store / Play Store monthly product
   - `tutorsnap_annual`  → link to your App Store / Play Store annual product
4. **Offering:** Create an offering with ID `default` (or mark it as the current offering).
5. **Packages:** Inside the offering, add two packages:
   - Monthly package → attach `tutorsnap_monthly`
   - Annual package  → attach `tutorsnap_annual`
6. **API Keys:** Copy your public app-specific keys:
   - iOS key starts with `appl_`
   - Android key starts with `goog_`
   - Set them as `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` and `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY`

---

## 2. App Store Connect (iOS)

1. Create two in-app purchase products:
   - Product ID: `tutorsnap_monthly` | Type: Auto-Renewable Subscription | Price: $9.99/mo
   - Product ID: `tutorsnap_annual`  | Type: Auto-Renewable Subscription | Price: $69.99/yr
2. Set up a **Subscription Group** (e.g., "TutorSnap Premium") and add both products to it.
3. Enable a **14-day free trial** introductory offer on both products.
4. Submit for review (required before purchases work in production).

---

## 3. Google Play Console (Android)

1. Create a subscription product with two base plans:
   - Base plan ID: `tutorsnap_monthly` | Billing period: 1 month | Price: $9.99
   - Base plan ID: `tutorsnap_annual`  | Billing period: 1 year  | Price: $69.99
2. Add a **free trial offer** (14 days) to both base plans.
3. Activate the subscription product before testing.

---

## 4. RevenueCat Webhook (Server-Side)

1. In RevenueCat dashboard → Project → Integrations → Webhooks
2. Add a new webhook:
   - URL: `https://mathgenius-g8jxpbar.manus.space/api/webhooks/revenuecat`
   - Authorization header: set a strong random secret (32+ chars)
3. Set `REVENUECAT_WEBHOOK_SECRET` environment variable on your server to the same secret.
4. The server endpoint handles these events:
   - `INITIAL_PURCHASE` → mark user premium
   - `RENEWAL` → extend premium
   - `CANCELLATION` → schedule expiry
   - `EXPIRATION` → revoke premium
   - `REFUND` → revoke premium immediately

---

## 5. Testing

- Use **RevenueCat sandbox** environment for testing (set up sandbox testers in App Store Connect / Google Play).
- In `__DEV__` mode, all features are unlocked without SDK calls — no purchases needed for development.
- Use the RevenueCat dashboard's **Customer Lookup** to verify entitlements are granted correctly after a test purchase.

---

## Code References

| Constant | Value | File |
|----------|-------|------|
| `RC_ENTITLEMENT_ID` | `"premium"` | `lib/subscription.ts` |
| `PRODUCT_MONTHLY` | `"tutorsnap_monthly"` | `lib/subscription.ts` |
| `PRODUCT_ANNUAL` | `"tutorsnap_annual"` | `lib/subscription.ts` |
| Apple key env var | `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` | `.env` / secrets |
| Android key env var | `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY` | `.env` / secrets |
| Webhook secret env var | `REVENUECAT_WEBHOOK_SECRET` | server `.env` / secrets |
