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

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FontFamily = "system" | "rounded" | "serif" | "mono";
export type FontSizeScale = "small" | "medium" | "large" | "xlarge";
export type LineSpacing = "compact" | "normal" | "relaxed";
export type WidgetSize = "compact" | "normal" | "large";
export type ChatBubbleStyle = "rounded" | "flat" | "minimal";
export type MessageDensity = "compact" | "comfortable" | "spacious";
export type StepStyle = "cards" | "list" | "minimal";

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
}

export const PRESET_THEMES: PresetTheme[] = [
  {
    id: "focus",
    label: "Focus",
    description: "Distraction-free study mode with muted tones and compact layout.",
    emoji: "🎯",
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
  // Solution
  stepStyle: StepStyle;
  // Accessibility
  reduceMotion: boolean;
  highContrast: boolean;
  largeTapTargets: boolean;
  /** ID of the last applied preset, or null if no preset is active */
  activePresetId: string | null;
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
  stepStyle: "cards",
  reduceMotion: false,
  highContrast: false,
  largeTapTargets: false,
  activePresetId: null,
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

interface AppearanceContextValue {
  settings: AppearanceSettings;
  updateSetting: <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) => void;
  resetSettings: () => void;
  /** Apply a named preset theme (merges preset settings into current settings) */
  applyPreset: (presetId: string) => void;
  /** Reset only per-subject accent colour overrides to their defaults */
  resetSubjectAccents: () => void;
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

  // Load persisted settings on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<AppearanceSettings>;
          // Deep merge: ensure all new keys from DEFAULT_APPEARANCE are present
          setSettings((prev) => ({
            ...prev,
            ...saved,
            widgetVisibility: { ...DEFAULT_APPEARANCE.widgetVisibility, ...(saved.widgetVisibility ?? {}) },
            widgetOrder: saved.widgetOrder ?? DEFAULT_APPEARANCE.widgetOrder,
            subjectAccentColors: { ...DEFAULT_SUBJECT_ACCENT_COLORS, ...(saved.subjectAccentColors ?? {}) },
          }));
        } catch { /* ignore malformed */ }
      }
      setLoaded(true);
    });
  }, []);

  const updateSetting = useCallback(<K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K],
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_APPEARANCE);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_APPEARANCE)).catch(() => {});
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = PRESET_THEMES.find((p) => p.id === presetId);
    if (!preset) return;
    setSettings((prev) => {
      const next = { ...prev, ...preset.settings, activePresetId: presetId };
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
