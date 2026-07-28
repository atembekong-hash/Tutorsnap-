import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Integration tests fire HTTP requests against the local dev server.
    // The server can take up to 10s to cold-start after a sandbox restore.
    testTimeout: 15_000,
    // Global setup: defines Expo/React Native globals (__DEV__ etc.) that
    // Metro injects at bundle time but are absent in the Node test environment.
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
