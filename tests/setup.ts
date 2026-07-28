/**
 * tests/setup.ts
 *
 * Vitest global setup — runs before every test file.
 * Defines Expo/React Native globals that are injected by Metro bundler
 * but are not present in the Node.js test environment.
 */

// Expo defines __DEV__ as a global boolean in the Metro bundler.
// In the Node test environment we default it to false (production-like)
// so that subscription.ts takes the real SDK path rather than the dev bypass.
// Individual tests that need dev mode can override this via vi.stubGlobal.
(globalThis as any).__DEV__ = false;
