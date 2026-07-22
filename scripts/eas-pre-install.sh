#!/bin/bash
# EAS Build pre-install hook: install pnpm and run pnpm install
# This runs BEFORE EAS's own `npm install` step.
# EAS only auto-detects yarn; for pnpm projects we must install manually.

set -e

echo "=====> Installing pnpm..."
npm install -g pnpm@9.12.0

echo "=====> Running pnpm install..."
pnpm install --frozen-lockfile

echo "=====> pnpm install complete."
