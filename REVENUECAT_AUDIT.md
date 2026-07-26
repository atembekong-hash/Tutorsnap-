# RevenueCat Integration Audit

## Current State (before changes)

### lib/subscription.ts — ALL STUBS
- `initRevenueCat()`: reads env keys but never calls `Purchases.configure()` — just sets `_initialised = true`
- `getOfferings()`: returns hardcoded static data, never calls RevenueCat SDK
- `purchaseProduct()`: just writes to AsyncStorage, never calls `Purchases.purchaseStoreProduct()`
- `restorePurchases()`: just reads AsyncStorage, never calls `Purchases.restorePurchases()`
- `getSubscriptionStatus()`: reads AsyncStorage only, never checks RevenueCat entitlements
- `openManageSubscriptions()`: throws error unconditionally

### Environment Variables
- Saved as: `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` and `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY`
- Code currently reads: `EXPO_PUBLIC_RC_API_KEY_IOS` and `EXPO_PUBLIC_RC_API_KEY_ANDROID`
- Action needed: update code to read the new key names

### react-native-purchases
- NOT installed (comment says "add back once compatible version available")
- Need to check: `react-native-purchases` version compatible with Expo SDK 54 / RN 0.81

## Plan
1. Check compatible version of react-native-purchases
2. Install it
3. Update initRevenueCat → Purchases.configure
4. Update getOfferings → Purchases.getOfferings
5. Update purchaseProduct → Purchases.purchaseStoreProduct
6. Update restorePurchases → Purchases.restorePurchases
7. Update getSubscriptionStatus → check RC entitlement
8. Keep web + __DEV__ fallback paths intact
9. Update env key names to match saved secrets

## Key Names to Use
- iOS: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY
- Android: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY

## Entitlement ID
- RC_ENTITLEMENT_ID = "premium"

## Product IDs
- PRODUCT_MONTHLY = "tutorsnap_monthly"
- PRODUCT_ANNUAL = "tutorsnap_annual"
