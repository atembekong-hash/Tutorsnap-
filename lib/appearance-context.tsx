/**
 * AppearanceContext — Global App Personalisation Settings
 *
 * Covers: font family, font size, line spacing, bold labels, widget size,
 * widget visibility, widget order, accent color, per-subject accent colors,
 * chat bubble style, message density, solution step style, reduce motion,
 * high contrast, large tap targets.
 *
 * Also provides 4 named preset themes (Focus, Vibrant, Minimal, Accessible)
 * that can be applied with a single tap.
 *
 * All settings persist to AsyncStorage and are applied app-wide.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { getApiBaseUrl } from "@/constants/oauth";
import { getSessionToken } from "@/lib/_core/auth";
import type { AppRouter } from "@/server/routers";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FontFamily = "system" | "rounded" | "serif" | "mono";
export type FontSizeScale = "small" | "medium" | "large" | "xlarge";
export type LineSpacing = "compact" | "normal" | "relaxed";
export type WidgetSize = "compact" | "normal" | "large";
export type ChatBubbleStyle = "rounded" | "flat" | "minimal";
export type MessageDensity = "compact" | "comfortable" | "spacious";
export type StepStyle = "cards" | "list" | "minimal";
export type TypingSpeed = "slow" | "normal" | "fast" | "very_fast";

export type WidgetId =
  | "streak"
  | "challenge"
  | "rankings"
  | "study"
  | "goals"
  | "badge"
  | "streakprotect"
  | "affiliate";

export const WIDGET_LABELS: Record<WidgetId, string> = {
  streak: "Streak",
  challenge: "Daily Challenge",
  rankings: "Global Rankings",
  study: "Study Plan",
  goals: "Weekly Goal",
  badge: "Badge Progress",
  streakprotect: "Streak Protection",
  affiliate: "Affiliate Earnings",
};

export const WIDGET_EMOJIS: Record<WidgetId, string> = {
  streak: "🔥",
  challenge: "⚡",
  rankings: "🏆",
  study: "📅",
  goals: "🎯",
  badge: "🥇",
  streakprotect: "⚠️",
  affiliate: "💰",
};

export const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  "streak", "challenge", "rankings", "study", "goals", "badge", "streakprotect", "affiliate",
];

export interface AccentColor {
  id: string;
  label: string;
  light: string;
  dark: string;
}

export const ACCENT_COLORS: AccentColor[] = [
  { id: "indigo",  label: "Indigo",  light: "#4F46E5", dark: "#6366F1" },
  { id: "blue",    label: "Blue",    light: "#2563EB", dark: "#3B82F6" },
  { id: "purple",  label: "Purple",  light: "#7C3AED", dark: "#8B5CF6" },
  { id: "teal",    label: "Teal",    light: "#0D9488", dark: "#14B8A6" },
  { id: "rose",    label: "Rose",    light: "#E11D48", dark: "#FB7185" },
  { id: "amber",   label: "Amber",   light: "#D97706", dark: "#FBBF24" },
  { id: "green",   label: "Green",   light: "#059669", dark: "#34D399" },
  { id: "slate",   label: "Slate",   light: "#475569", dark: "#94A3B8" },
];

// ─── Per-subject accent colours ───────────────────────────────────────────────

/** Canonical subject names used as keys in subjectAccentColors */
export const SUBJECT_NAMES = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Statistics",
  "Computer Science",
  "Economics",
  "Geometry",
] as const;

export type SubjectName = (typeof SUBJECT_NAMES)[number];

/** Default per-subject accent color IDs (empty = fall back to global accentColorId) */
export const DEFAULT_SUBJECT_ACCENT_COLORS: Record<SubjectName, string> = {
  Mathematics: "indigo",
  Physics: "blue",
  Chemistry: "teal",
  Biology: "green",
  Statistics: "amber",
  "Computer Science": "purple",
  Economics: "rose",
  Geometry: "slate",
};

// ─── Preset themes ────────────────────────────────────────────────────────────

export interface PresetTheme {
  id: string;
  label: string;
  description: string;
  /** Emoji icon shown on the preset card */
  emoji: string;
  /** Partial AppearanceSettings that will be merged when applied */
  settings: Partial<AppearanceSettings>;
  /** Representative colour swatches [accent, surface, background] for light mode */
  swatches: [string, string, string];
  /** Representative colour swatches [accent, surface, background] for dark mode */
  swatchesDark: [string, string, string];
}

export const PRESET_THEMES: PresetTheme[] = [
  {
    id: "focus",
    label: "Focus",
    description: "Distraction-free study mode with muted tones and compact layout.",
    emoji: "🎯",
    swatches: ["#475569", "#F1F5F9", "#FFFFFF"],
    swatchesDark: ["#94A3B8", "#1E2022", "#151718"],
    settings: {
      accentColorId: "slate",
      fontFamily: "system",
      fontSize: "medium",
      lineSpacing: "compact",
      messageDensity: "compact",
      chatBubbleStyle: "flat",
      stepStyle: "list",
      boldLabels: false,
      reduceMotion: true,
      highContrast: false,
      largeTapTargets: false,
    },
  },
  {
    id: "vibrant",
    label: "Vibrant",
    description: "Bold colours, rounded fonts, and spacious layout for an energetic feel.",
    emoji: "🌈",
    swatches: ["#7C3AED", "#F5F3FF", "#FFFFFF"],
    swatchesDark: ["#8B5CF6", "#2D1B69", "#151718"],
    settings: {
      accentColorId: "purple",
      fontFamily: "rounded",
      fontSize: "large",
      lineSpacing: "relaxed",
      messageDensity: "spacious",
      chatBubbleStyle: "rounded",
      stepStyle: "cards",
      boldLabels: true,
      reduceMotion: false,
      highContrast: false,
      largeTapTargets: false,
    },
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean lines, flat bubbles, and no visual noise.",
    emoji: "⬜",
    swatches: ["#94A3B8", "#F8FAFC", "#FFFFFF"],
    swatchesDark: ["#64748B", "#1E2022", "#151718"],
    settings: {
      accentColorId: "slate",
      fontFamily: "system",
      fontSize: "medium",
      lineSpacing: "normal",
      messageDensity: "comfortable",
      chatBubbleStyle: "minimal",
      stepStyle: "minimal",
      boldLabels: false,
      reduceMotion: true,
      highContrast: false,
      largeTapTargets: false,
    },
  },
  {
    id: "accessible",
    label: "Accessible",
    description: "Large text, high contrast, and bigger tap targets for easier reading.",
    emoji: "♿",
    swatches: ["#2563EB", "#EFF6FF", "#FFFFFF"],
    swatchesDark: ["#3B82F6", "#1E3A5F", "#151718"],
    settings: {
      accentColorId: "blue",
      fontFamily: "system",
      fontSize: "xlarge",
      lineSpacing: "relaxed",
      messageDensity: "spacious",
      chatBubbleStyle: "rounded",
      stepStyle: "cards",
      boldLabels: true,
      reduceMotion: true,
      highContrast: true,
      largeTapTargets: true,
    },
  },
  // ── 5. Midnight ──────────────────────────────────────────────────────────────
  {
    id: "midnight",
    label: "Midnight",
    description: "Deep dark background with cool indigo accent — perfect for late-night study.",
    emoji: "🌙",
    swatches: ["#4F46E5", "#1E1B4B", "#0F0E1A"],
    swatchesDark: ["#6366F1", "#1E1B4B", "#0F0E1A"],
    settings: {
      accentColorId: "indigo",
      fontFamily: "system",
      fontSize: "medium",
      lineSpacing: "normal",
      messageDensity: "comfortable",
      chatBubbleStyle: "rounded",
      stepStyle: "list",
      boldLabels: false,
      reduceMotion: false,
      highContrast: false,
      largeTapTargets: false,
    },
  },
  // ── 6. Pastel ────────────────────────────────────────────────────────────────
  {
    id: "pastel",
    label: "Pastel",
    description: "Soft rose accent with gentle spacing — calm and easy on the eyes.",
    emoji: "🌸",
    swatches: ["#E11D48", "#FFF1F2", "#FFFFFF"],
    swatchesDark: ["#FB7185", "#2D1018", "#151718"],
    settings: {
      accentColorId: "rose",
      fontFamily: "rounded",
      fontSize: "medium",
      lineSpacing: "relaxed",
      messageDensity: "comfortable",
      chatBubbleStyle: "rounded",
      stepStyle: "cards",
      boldLabels: false,
      reduceMotion: false,
      highContrast: false,
      largeTapTargets: false,
    },
  },
  // ── 7. Forest ────────────────────────────────────────────────────────────────
  {
    id: "forest",
    label: "Forest",
    description: "Earthy green tones for a grounded, focused study environment.",
    emoji: "🌿",
    swatches: ["#059669", "#ECFDF5", "#FFFFFF"],
    swatchesDark: ["#34D399", "#052E16", "#0A1A10"],
    settings: {
      accentColorId: "green",
      fontFamily: "system",
      fontSize: "medium",
      lineSpacing: "normal",
      messageDensity: "comfortable",
      chatBubbleStyle: "flat",
      stepStyle: "list",
      boldLabels: false,
      reduceMotion: false,
      highContrast: false,
      largeTapTargets: false,
    },
  },
  // ── 8. Ocean ─────────────────────────────────────────────────────────────────
  {
    id: "ocean",
    label: "Ocean",
    description: "Cool teal waves with spacious layout — refreshing and clear.",
    emoji: "🌊",
    swatches: ["#0D9488", "#F0FDFA", "#FFFFFF"],
    swatchesDark: ["#14B8A6", "#042F2E", "#0A1A1A"],
    settings: {
      accentColorId: "teal",
      fontFamily: "system",
      fontSize: "medium",
      lineSpacing: "relaxed",
      messageDensity: "spacious",
      chatBubbleStyle: "rounded",
      stepStyle: "cards",
      boldLabels: false,
      reduceMotion: false,
      highContrast: false,
      largeTapTargets: false,
    },
  },
  // ── 9. Sunset ────────────────────────────────────────────────────────────────
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm amber hues with bold labels — energetic and motivating.",
    emoji: "🌅",
    swatches: ["#D97706", "#FFFBEB", "#FFFFFF"],
    swatchesDark: ["#FBBF24", "#2D1A00", "#1A0F00"],
    settings: {
      accentColorId: "amber",
      fontFamily: "rounded",
      fontSize: "medium",
      lineSpacing: "normal",
      messageDensity: "comfortable",
      chatBubbleStyle: "rounded",
      stepStyle: "cards",
      boldLabels: true,
      reduceMotion: false,
      highContrast: false,
      largeTapTargets: false,
    },
  },
  // ── 10. High Contrast ────────────────────────────────────────────────────────
  {
    id: "high-contrast",
    label: "High Contrast",
    description: "Maximum contrast with blue accent and extra-large text for clarity.",
    emoji: "🔲",
    swatches: ["#1D4ED8", "#EFF6FF", "#FFFFFF"],
    swatchesDark: ["#60A5FA", "#1E3A5F", "#000000"],
    settings: {
      accentColorId: "blue",
      fontFamily: "system",
      fontSize: "xlarge",
      lineSpacing: "relaxed",
      messageDensity: "spacious",
      chatBubbleStyle: "flat",
      stepStyle: "cards",
      boldLabels: true,
      reduceMotion: true,
      highContrast: true,
      largeTapTargets: true,
    },
  },
];

// ─── AppearanceSettings interface ─────────────────────────────────────────────

export interface AppearanceSettings {
  // Typography
  fontFamily: FontFamily;
  fontSize: FontSizeScale;
  lineSpacing: LineSpacing;
  boldLabels: boolean;
  // Widgets
  widgetSize: WidgetSize;
  widgetVisibility: Record<WidgetId, boolean>;
  widgetOrder: WidgetId[];
  // Accent
  accentColorId: string;
  /** Per-subject accent color overrides. Keys are SubjectName; empty string = use global. */
  subjectAccentColors: Record<string, string>;
  // Chat
  chatBubbleStyle: ChatBubbleStyle;
  messageDensity: MessageDensity;
  typingSpeed: TypingSpeed;
  /**
   * Global speed multiplier for the typewriter animation.
   * Range 1–5: 1 = Very Slow (60ms/char), 5 = Very Fast (3ms/char).
   * Applied on top of the per-preset base delay and subject-aware adjustment.
   */
  typingSpeedMultiplier: number;
  /**
   * Per-subject speed overrides. Keys are SubjectName; value is 1–5 multiplier.
   * 0 = use global multiplier (no override).
   */
  subjectSpeedOverrides: Record<string, number>;
  // Solution
  stepStyle: StepStyle;
  // Accessibility
  reduceMotion: boolean;
  highContrast: boolean;
  largeTapTargets: boolean;
  /** ID of the last applied preset, or null if no preset is active */
  activePresetId: string | null;
  /** User-saved custom preset snapshot, or null if never saved */
  customPreset: Partial<AppearanceSettings> | null;
  /** User-chosen display name for the Custom preset */
  customPresetName: string;
  /** Snapshot of settings before the last preset was applied, for undo */
  previousSettings: Partial<AppearanceSettings> | null;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  fontFamily: "system",
  fontSize: "medium",
  lineSpacing: "normal",
  boldLabels: false,
  widgetSize: "normal",
  widgetVisibility: {
    streak: true,
    challenge: true,
    rankings: true,
    study: true,
    goals: true,
    badge: true,
    streakprotect: true,
    affiliate: true,
  },
  widgetOrder: [...DEFAULT_WIDGET_ORDER],
  accentColorId: "indigo",
  subjectAccentColors: { ...DEFAULT_SUBJECT_ACCENT_COLORS },
  chatBubbleStyle: "rounded",
  messageDensity: "comfortable",
  typingSpeed: "slow",
  typingSpeedMultiplier: 3,
  subjectSpeedOverrides: {},
  stepStyle: "cards",
  reduceMotion: false,
  highContrast: false,
  largeTapTargets: false,
  activePresetId: null,
  customPreset: null,
  customPresetName: "Custom",
  previousSettings: null,
};

// ─── Derived helpers ──────────────────────────────────────────────────────────

export const FONT_SIZE_MULTIPLIERS: Record<FontSizeScale, number> = {
  small: 0.88,
  medium: 1.0,
  large: 1.14,
  xlarge: 1.28,
};

export const FONT_SIZE_LABELS: Record<FontSizeScale, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "Extra Large",
};

export const LINE_SPACING_MULTIPLIERS: Record<LineSpacing, number> = {
  compact: 1.2,
  normal: 1.45,
  relaxed: 1.7,
};

export const WIDGET_SIZE_VALUES: Record<WidgetSize, number> = {
  compact: 110,
  normal: 130,
  large: 155,
};

export const FONT_FAMILY_VALUES: Record<FontFamily, string | undefined> = {
  system: undefined,
  rounded: "System",   // iOS: uses SF Pro Rounded via fontVariant; Android: fallback to system
  serif: "Georgia",
  mono: "Courier New",
};

export const MESSAGE_DENSITY_PADDING: Record<MessageDensity, number> = {
  compact: 8,
  comfortable: 14,
  spacious: 20,
};

export const BUBBLE_BORDER_RADIUS: Record<ChatBubbleStyle, number> = {
  rounded: 20,
  flat: 8,
  minimal: 4,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "@tutorsnap/appearanceSettings";

// ─── Remote tRPC client (lazy, used only when authenticated) ──────────────────
function makeRemoteClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        transformer: superjson,
        async headers() {
          const token = await getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

interface AppearanceContextValue {
  settings: AppearanceSettings;
  updateSetting: <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => void;
  resetSettings: () => void;
  /** Apply a named preset theme (merges preset settings into current settings) */
  applyPreset: (presetId: string) => void;
  /** Reset only per-subject accent colour overrides to their defaults */
  resetSubjectAccents: () => void;
  /** Save current settings as the Custom preset */
  saveCustomPreset: (name?: string) => void;
  /** Rename the Custom preset without re-snapshotting settings */
  renameCustomPreset: (name: string) => void;
  /** Undo the last preset apply, restoring the previous settings snapshot */
  undoPreset: () => void;
  /** Convenience: scale a base font size by the current multiplier */
  fs: (base: number) => number;
  /** Resolved accent color for current color scheme */
  accentColor: (scheme: "light" | "dark") => string;
  /**
   * Resolved accent color for a specific subject.
   * Falls back to the global accent color if no per-subject override is set.
   */
  getSubjectAccent: (subject: string, scheme: "light" | "dark") => string;
  /** Resolved font family string (or undefined for system default) */
  fontFamilyValue: string | undefined;
  /** Widget card width in pixels */
  widgetWidth: number;
  /** Whether a widget should be shown (visibility + conditional logic) */
  isWidgetVisible: (id: WidgetId) => boolean;
  /** Ordered list of widget IDs that are enabled */
  visibleWidgetOrder: WidgetId[];
}

const AppearanceContext = createContext<AppearanceContextValue>({
  settings: DEFAULT_APPEARANCE,
  updateSetting: () => {},
  resetSettings: () => {},
  applyPreset: () => {},
  resetSubjectAccents: () => {},
  saveCustomPreset: () => {},
  renameCustomPreset: () => {},
  undoPreset: () => {},
  fs: (base) => base,
  accentColor: () => ACCENT_COLORS[0].light,
  getSubjectAccent: () => ACCENT_COLORS[0].light,
  fontFamilyValue: undefined,
  widgetWidth: 130,
  isWidgetVisible: () => true,
  visibleWidgetOrder: [...DEFAULT_WIDGET_ORDER],
});

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [loaded, setLoaded] = useState(false);
  const remoteClientRef = useRef<ReturnType<typeof makeRemoteClient> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function getRemoteClient() {
    if (!remoteClientRef.current) {
      remoteClientRef.current = makeRemoteClient();
    }
    return remoteClientRef.current;
  }

  function mergeSettings(saved: Partial<AppearanceSettings>): AppearanceSettings {
    return {
      ...DEFAULT_APPEARANCE,
      ...saved,
      widgetVisibility: { ...DEFAULT_APPEARANCE.widgetVisibility, ...(saved.widgetVisibility ?? {}) },
      widgetOrder: saved.widgetOrder ?? DEFAULT_APPEARANCE.widgetOrder,
      subjectAccentColors: { ...DEFAULT_SUBJECT_ACCENT_COLORS, ...(saved.subjectAccentColors ?? {}) },
    };
  }

  // Debounced backend sync — fires 2s after last change
  function scheduleRemoteSync(next: AppearanceSettings) {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        const token = await getSessionToken();
        if (!token) return; // not authenticated, skip
        const safe = { ...next, customPreset: next.customPreset ? { ...next.customPreset, customPreset: undefined } : null };
        await getRemoteClient().user.saveAppearanceSettings.mutate({ settings: JSON.stringify(safe) });
      } catch { /* silent — local storage is the source of truth */ }
    }, 2000);
  }

  // Load persisted settings on mount — local first, then try backend
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(async (raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<AppearanceSettings>;
          setSettings(mergeSettings(saved));
        } catch { /* ignore malformed */ }
      }
      setLoaded(true);
      // Try to load from backend (may override local if newer)
      try {
        const token = await getSessionToken();
        if (!token) return;
        const result = await getRemoteClient().user.getAppearanceSettings.query();
        if (result.settings) {
          const remote = JSON.parse(result.settings) as Partial<AppearanceSettings>;
          const merged = mergeSettings(remote);
          setSettings(merged);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
        }
      } catch { /* silent — local storage remains */ }
    });
  }, []);

  // Keys that should NOT clear the active preset when changed
  const PRESET_META_KEYS = new Set<keyof AppearanceSettings>(["activePresetId", "customPreset", "customPresetName"]);

  const updateSetting = useCallback(<K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K],
  ) => {
    setSettings((prev) => {
      // Clear the active preset label when the user manually changes any visual setting
      const shouldClearPreset = !PRESET_META_KEYS.has(key);
      const next = {
        ...prev,
        [key]: value,
        ...(shouldClearPreset ? { activePresetId: null } : {}),
      };
      // Guard: never serialise customPreset.customPreset (circular-like nesting)
      const safe = { ...next, customPreset: next.customPreset ? { ...next.customPreset, customPreset: undefined } : null };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(safe)).catch(() => {});
      scheduleRemoteSync(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_APPEARANCE);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_APPEARANCE)).catch(() => {});
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    if (presetId === "custom") {
      setSettings((prev) => {
        if (!prev.customPreset) return prev;
        // Snapshot current settings for undo (strip previousSettings to avoid deep nesting)
        const { previousSettings: _ps, ...snapshot } = prev;
        const next = { ...prev, ...prev.customPreset, activePresetId: "custom", previousSettings: snapshot };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      return;
    }
    const preset = PRESET_THEMES.find((p) => p.id === presetId);
    if (!preset) return;
    setSettings((prev) => {
      const { previousSettings: _ps, ...snapshot } = prev;
      const next = { ...prev, ...preset.settings, activePresetId: presetId, previousSettings: snapshot };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const undoPreset = useCallback(() => {
    setSettings((prev) => {
      if (!prev.previousSettings) return prev;
      const next = { ...prev, ...prev.previousSettings, previousSettings: null };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetSubjectAccents = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, subjectAccentColors: { ...DEFAULT_SUBJECT_ACCENT_COLORS }, activePresetId: null };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const saveCustomPreset = useCallback((name?: string) => {
    setSettings((prev) => {
      // Snapshot everything except customPreset itself, activePresetId, and customPresetName
      const { customPreset: _cp, activePresetId: _ap, customPresetName: _cn, ...snapshot } = prev;
      const next = {
        ...prev,
        customPreset: snapshot,
        activePresetId: "custom",
        customPresetName: name ?? prev.customPresetName,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const renameCustomPreset = useCallback((name: string) => {
    setSettings((prev) => {
      const next = { ...prev, customPresetName: name };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const fs = useCallback(
    (base: number) => Math.round(base * FONT_SIZE_MULTIPLIERS[settings.fontSize]),
    [settings.fontSize],
  );

  const accentColor = useCallback(
    (scheme: "light" | "dark") => {
      const found = ACCENT_COLORS.find((c) => c.id === settings.accentColorId);
      return found ? found[scheme] : ACCENT_COLORS[0][scheme];
    },
    [settings.accentColorId],
  );

  const getSubjectAccent = useCallback(
    (subject: string, scheme: "light" | "dark") => {
      const overrideId = settings.subjectAccentColors[subject];
      const colorId = overrideId || settings.accentColorId;
      const found = ACCENT_COLORS.find((c) => c.id === colorId);
      return found ? found[scheme] : ACCENT_COLORS[0][scheme];
    },
    [settings.subjectAccentColors, settings.accentColorId],
  );

  const fontFamilyValue = FONT_FAMILY_VALUES[settings.fontFamily];
  const widgetWidth = WIDGET_SIZE_VALUES[settings.widgetSize];

  const isWidgetVisible = useCallback(
    (id: WidgetId) => settings.widgetVisibility[id] ?? true,
    [settings.widgetVisibility],
  );

  const visibleWidgetOrder = settings.widgetOrder.filter(
    (id) => settings.widgetVisibility[id] ?? true,
  );

  // Don't render children until settings are loaded to avoid flash of defaults
  if (!loaded) return null;

  return (
    <AppearanceContext.Provider
      value={{
        settings,
        updateSetting,
        resetSettings,
        applyPreset,
        resetSubjectAccents,
        saveCustomPreset,
        renameCustomPreset,
        undoPreset,
        fs,
        accentColor,
        getSubjectAccent,
        fontFamilyValue,
        widgetWidth,
        isWidgetVisible,
        visibleWidgetOrder,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  return useContext(AppearanceContext);
}
