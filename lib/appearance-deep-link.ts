/**
 * appearance-deep-link.ts
 *
 * Utilities for sharing and applying appearance settings via deep links.
 *
 * Deep link format:
 *   <scheme>://appearance?appearance=<base64-encoded-json>
 *
 * The encoded payload is a subset of AppearanceSettings (no customPreset,
 * no previousSettings — only the visual/style fields that make sense to share).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@tutorsnap/appearanceSettings";

/** Fields that are safe to share via a deep link */
const SHAREABLE_KEYS = [
  "fontFamily",
  "fontSizeScale",
  "lineSpacing",
  "boldLabels",
  "accentColorId",
  "subjectAccentColors",
  "widgetSize",
  "chatBubbleStyle",
  "messageDensity",
  "stepStyle",
  "reduceMotion",
  "highContrast",
  "largeTapTargets",
  "activePresetId",
  "customPresetName",
] as const;

type ShareablePayload = Partial<Record<(typeof SHAREABLE_KEYS)[number], unknown>>;

/**
 * Encode the current appearance settings (shareable subset) as a base64 string
 * suitable for use as a URL query parameter.
 */
export async function encodeAppearanceForLink(): Promise<string> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const settings: Record<string, unknown> = raw ? JSON.parse(raw) : {};
  const payload: ShareablePayload = {};
  for (const key of SHAREABLE_KEYS) {
    if (key in settings) {
      (payload as Record<string, unknown>)[key] = settings[key];
    }
  }
  const json = JSON.stringify(payload);
  // btoa is available on React Native (Hermes) and web
  return btoa(unescape(encodeURIComponent(json)));
}

/**
 * Decode a base64 appearance payload and merge it into the stored settings.
 * Throws if the payload is invalid.
 */
export async function applyImportedAppearance(base64: string): Promise<void> {
  const json = decodeURIComponent(escape(atob(base64)));
  const incoming = JSON.parse(json) as Record<string, unknown>;
  if (typeof incoming !== "object" || incoming === null) {
    throw new Error("Invalid appearance payload");
  }
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const current: Record<string, unknown> = raw ? JSON.parse(raw) : {};
  for (const key of SHAREABLE_KEYS) {
    if (key in incoming) {
      current[key] = incoming[key];
    }
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}
