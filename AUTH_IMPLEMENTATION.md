# TutorSnap Authentication System - Implementation Plan

## Phase 2: OAuth Provider Setup

### Google Sign-In Configuration
- **Android**: Use `@react-native-google-signin/google-signin`
- **iOS**: Use native Google Sign-In SDK via Expo
- **Web**: Use `@react-oauth/google`
- **Credentials**: Web Client ID, Android Client ID, iOS Client ID

### Apple Sign-In Configuration
- **iOS Only**: Use `expo-apple-authentication`
- **Credentials**: Team ID, Key ID, Private Key

### Backend OAuth Router
- Endpoints:
  - `POST /api/oauth/validate` - Validate OAuth tokens
  - `POST /api/oauth/callback` - Handle OAuth callback
  - `POST /api/auth/logout` - Clear session
  - `POST /api/auth/refresh` - Refresh expired tokens

## Phase 3: Session Management
- JWT tokens (1-hour expiration)
- Refresh tokens (30-day expiration)
- Secure storage (Keychain/Keystore)
- Automatic token refresh on app foreground
- Session validation on app launch

## Phase 4-5: OAuth Integration
- Google Sign-In button (all platforms)
- Apple Sign-In button (iOS only)
- Loading states and error handling
- Deep link callback handling

## Phase 6: Account Management
- Auto-create user on first sign-in
- Profile completion flow
- Account linking (multiple OAuth providers)

## Phase 7: Profile Management
- View profile screen
- Edit profile (name, photo, email)
- Account settings
- Connected accounts

## Phase 8: Sign Out
- Clear session token
- Clear user info
- Clear cached data
- Revoke refresh tokens

## Phase 9: Account Recovery
- Email-based account recovery
- Device trust management
- Session history
- Security alerts

## Phase 10: Testing
- End-to-end flow testing
- Error scenario handling
- Security validation
- Performance optimization

## Database Schema Updates
```sql
-- User profiles table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profilePhoto VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phoneNumber VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSON;

-- Session logs table
CREATE TABLE IF NOT EXISTS sessionLogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  loginMethod VARCHAR(50),
  ipAddress VARCHAR(45),
  deviceId VARCHAR(255),
  deviceName VARCHAR(255),
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Account recovery tokens
CREATE TABLE IF NOT EXISTS recoveryTokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  type ENUM('email_verification', 'password_reset', 'account_recovery'),
  expiresAt TIMESTAMP NOT NULL,
  usedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Device trust records
CREATE TABLE IF NOT EXISTS trustedDevices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  deviceId VARCHAR(255) UNIQUE NOT NULL,
  deviceName VARCHAR(255),
  lastUsedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

## Security Checklist
- [ ] PKCE flow for mobile OAuth
- [ ] Secure token storage (Keychain/Keystore)
- [ ] CSRF protection with state validation
- [ ] Rate limiting on auth endpoints
- [ ] Biometric fallback support
- [ ] Session timeout handling
- [ ] Token refresh before expiration
- [ ] Secure logout with token revocation
- [ ] Account recovery flow
- [ ] Device trust management
- [ ] Security audit logging
- [ ] Error message sanitization

## Environment Variables Required
- `GOOGLE_CLIENT_ID_WEB`
- `GOOGLE_CLIENT_ID_ANDROID`
- `GOOGLE_CLIENT_ID_IOS`
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
