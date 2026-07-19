# Apple Sign-In Setup Guide for TutorSnap

This guide walks you through setting up Apple Sign-In for TutorSnap on iOS.

## Prerequisites

- Apple Developer Account (paid membership required)
- iOS app with Bundle ID: `com.tutorsnap.app`
- Production domain: `tutorsnapai.tech`
- SSL certificate for `tutorsnapai.tech`

## Step 1: Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Click "Certificates, Identifiers & Profiles"
3. Click "Identifiers" (left sidebar)
4. Click the "+" button to create a new identifier
5. Select "App IDs" → "Continue"
6. Select "App" → "Continue"
7. Fill in:
   - **Description**: TutorSnap
   - **Bundle ID**: `com.tutorsnap.app` (Explicit)
8. Scroll down to "Capabilities" and check:
   - ☑️ **Sign in with Apple**
9. Click "Continue" → "Register" → "Done"

## Step 2: Create Services ID

1. In "Identifiers", click the "+" button again
2. Select "Services IDs" → "Continue"
3. Fill in:
   - **Description**: TutorSnap Services
   - **Identifier**: `com.tutorsnap.app` (same as App ID)
4. Check ☑️ **Sign in with Apple**
5. Click "Configure"
6. In the popup:
   - **Primary App ID**: Select `com.tutorsnap.app`
   - **Domains and Subdomains**: Add `tutorsnapai.tech`
   - **Return URLs**: Add `https://tutorsnapai.tech/api/oauth/callback`
7. Click "Save" → "Continue" → "Register" → "Done"

## Step 3: Create Private Email Relay (Optional but Recommended)

Apple allows users to hide their real email. You can receive forwarded emails:

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Click "Certificates, Identifiers & Profiles"
3. Click "More" → "Email Communication"
4. Add an email address to receive forwarded emails from users who hide their identity
5. Verify the email address

## Step 4: Configure Signing Certificate

You need a valid signing certificate to build the iOS app.

### 4.1 Create Certificate Signing Request (CSR)

1. On your Mac, open **Keychain Access** (Applications → Utilities)
2. Go to **Keychain Access** → **Certificate Assistant** → **Request a Certificate from a Certificate Authority**
3. Fill in:
   - **User Email Address**: your-email@example.com
   - **Common Name**: TutorSnap
   - **Request is**: "Saved to disk"
4. Click "Continue" and save the file

### 4.2 Create Development Certificate

1. In Apple Developer Portal, go to **Certificates**
2. Click "+" to create a new certificate
3. Select "iOS App Development" → "Continue"
4. Upload the CSR file from step 4.1
5. Click "Continue" → "Download"
6. Double-click the downloaded `.cer` file to install it

### 4.3 Create Production Certificate

1. Repeat steps 4.2, but select "Apple Distribution" instead
2. Download and install the production certificate

## Step 5: Create Provisioning Profiles

### 5.1 Development Provisioning Profile

1. In Apple Developer Portal, go to **Provisioning Profiles**
2. Click "+" to create a new profile
3. Select "iOS App Development" → "Continue"
4. Select App ID: `com.tutorsnap.app` → "Continue"
5. Select your development certificate → "Continue"
6. Enter profile name: `TutorSnap Development`
7. Click "Generate" → "Download"
8. Double-click to install

### 5.2 Production Provisioning Profile

1. Repeat steps 5.1, but select "App Store" instead
2. Name it: `TutorSnap Production`

## Step 6: Configure Xcode Project

### 6.1 Setup Team ID

1. Open Xcode
2. Open the TutorSnap project
3. Select the project in the navigator
4. Select the target
5. Go to "Signing & Capabilities"
6. Set **Team** to your Apple Developer Team
7. Verify Bundle ID is `com.tutorsnap.app`

### 6.2 Add Sign in with Apple Capability

1. In "Signing & Capabilities", click "+ Capability"
2. Search for "Sign in with Apple"
3. Click to add it
4. Verify it appears in the capabilities list

## Step 7: Configure Backend

### 7.1 Get Team ID and Key ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Click "Certificates, Identifiers & Profiles" → "Keys"
3. Click "+" to create a new key
4. Check ☑️ **Sign in with Apple**
5. Click "Configure"
6. Select your App ID: `com.tutorsnap.app`
7. Click "Save"
8. Click "Continue" → "Register"
9. Download the private key file (`.p8`) - **keep this secure!**
10. Note your **Team ID** and **Key ID**

### 7.2 Create Client Secret

The backend needs to create a JWT token signed with your private key:

```javascript
// Example Node.js code to generate client secret
const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('path/to/AuthKey_XXXXXXXXXX.p8', 'utf8');

const payload = {
  iss: 'TEAM_ID', // Your Apple Team ID
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6 months
  aud: 'https://appleid.apple.com',
  sub: 'com.tutorsnap.app', // Your Services ID
};

const clientSecret = jwt.sign(payload, privateKey, {
  algorithm: 'ES256',
  keyid: 'KEY_ID', // Your Key ID
});

console.log(clientSecret);
```

## Step 8: Configure Environment Variables

Add these to your backend `.env` file:

```bash
# Apple Sign-In
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_BUNDLE_ID=com.tutorsnap.app
APPLE_SERVICES_ID=com.tutorsnap.app
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APPLE_REDIRECT_URI=https://tutorsnapai.tech/api/oauth/callback
```

## Step 9: Implement Backend Token Verification

Your backend needs to verify Apple identity tokens. Here's a template:

```typescript
import jwt from 'jsonwebtoken';
import axios from 'axios';

async function verifyAppleToken(identityToken: string) {
  try {
    // Get Apple's public keys
    const response = await axios.get('https://appleid.apple.com/auth/keys');
    const keys = response.data.keys;

    // Decode token header to find the key
    const decoded = jwt.decode(identityToken, { complete: true });
    const kid = decoded.header.kid;

    // Find the matching public key
    const key = keys.find((k: any) => k.kid === kid);
    if (!key) {
      throw new Error('Key not found');
    }

    // Convert JWK to PEM format
    const publicKey = jwkToPem(key);

    // Verify the token
    const verified = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      audience: 'com.tutorsnap.app',
      issuer: 'https://appleid.apple.com',
    });

    return verified;
  } catch (error) {
    console.error('Apple token verification failed:', error);
    throw error;
  }
}
```

## Step 10: Test Apple Sign-In

### 10.1 Build and Run on iOS Device

```bash
# Build debug build
eas build --platform ios --profile preview

# Or build locally
pnpm run ios
```

### 10.2 Test Sign-In Flow

1. Run the app on an iOS device (simulator doesn't support Apple Sign-In)
2. Tap "Sign in with Apple"
3. Complete the Apple sign-in flow
4. Verify user is logged in

### 10.3 Test with Hidden Email

1. During sign-in, select "Hide My Email"
2. Verify the app handles the private email relay correctly
3. Check that the forwarded email is received

## Troubleshooting

### "Invalid client" Error
- Verify Services ID matches exactly: `com.tutorsnap.app`
- Check that Sign in with Apple is enabled for the Services ID
- Verify domain is correctly configured: `tutorsnapai.tech`

### "Invalid redirect URI" Error
- Verify return URL in Services ID configuration matches exactly:
  - `https://tutorsnapai.tech/api/oauth/callback`
- Check that domain has valid SSL certificate

### "Token verification failed" Error
- Verify the identity token hasn't expired
- Check that the public key is correctly fetched from Apple
- Ensure the token audience matches your Services ID

### "Sign-in not available" on Simulator
- Apple Sign-In only works on physical iOS devices
- Use a real device for testing

## Production Deployment

Before deploying to production:

1. ✅ Create production certificate and provisioning profile
2. ✅ Update backend with production Team ID and Key ID
3. ✅ Verify SSL certificate for `tutorsnapai.tech`
4. ✅ Test Apple Sign-In on production domain
5. ✅ Submit app to App Store for review

## References

- [Apple Sign-In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Sign in with Apple REST API](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api)
- [Configuring Your Environment for Sign in with Apple](https://developer.apple.com/documentation/sign_in_with_apple/configuring_your_environment_for_sign_in_with_apple)
- [Verifying a User](https://developer.apple.com/documentation/sign_in_with_apple/verifying_a_user)
