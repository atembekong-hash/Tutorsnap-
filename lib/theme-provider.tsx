import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SchemeColors, type ColorScheme } from "@/constants/theme";

const THEME_STORAGE_KEY = "@tutorsnap/colorScheme";

/**
 * Read the persisted color scheme synchronously from localStorage (web only).
 * This is called during the initial useState() call so the very first render
 * already has the correct scheme — no flash of wrong theme.
 */
function getWebInitialScheme(): ColorScheme | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // localStorage unavailable
  }
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return null;
}

/**
 * Apply a color scheme to the DOM synchronously (web only).
 * Sets data-theme attribute, .dark class, and all CSS custom properties.
 */
function applySchemeToDOM(scheme: ColorScheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = scheme;
  // Keep .dark class in sync for any third-party components that use it
  root.classList.toggle("dark", scheme === "dark");
  const palette = SchemeColors[scheme];
  Object.entries(palette).forEach(([token, value]) => {
    root.style.setProperty(`--color-${token}`, value);
  });
}

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = (useSystemColorScheme() ?? "light") as ColorScheme;

  // On web: read localStorage synchronously so first render is correct.
  // On native: start with system scheme; AsyncStorage load will correct it.
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    const webInitial = getWebInitialScheme();
    if (webInitial) {
      // Apply to DOM immediately so CSS variables are correct before paint
      applySchemeToDOM(webInitial);
      return webInitial;
    }
    return systemScheme;
  });

  const [loaded, setLoaded] = useState(false);

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    applySchemeToDOM(scheme);
  }, []);

  // Load persisted theme from AsyncStorage (native) or confirm web value
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        const scheme: ColorScheme =
          saved === "dark" || saved === "light" ? saved : systemScheme;
        setColorSchemeState(scheme);
        applyScheme(scheme);
        setLoaded(true);
      })
      .catch(() => {
        applyScheme(colorScheme);
        setLoaded(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setColorScheme = useCallback(
    (scheme: ColorScheme) => {
      setColorSchemeState(scheme);
      applyScheme(scheme);
      AsyncStorage.setItem(THEME_STORAGE_KEY, scheme).catch(() => {});
      // Also persist to localStorage for synchronous web reads on next load
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, scheme);
        } catch {
          // ignore
        }
      }
    },
    [applyScheme],
  );

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary":    SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface":    SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted":      SchemeColors[colorScheme].muted,
        "color-border":     SchemeColors[colorScheme].border,
        "color-success":    SchemeColors[colorScheme].success,
        "color-warning":    SchemeColors[colorScheme].warning,
        "color-error":      SchemeColors[colorScheme].error,
      }),
    [colorScheme],
  );

  const value = useMemo(
    () => ({ colorScheme, setColorScheme }),
    [colorScheme, setColorScheme],
  );

  // On web, the synchronous initial scheme means we can render immediately.
  // On native, wait for AsyncStorage to avoid a flash of wrong theme.
  const isWebReady = typeof window !== "undefined";
  if (!loaded && !isWebReady) {
    return (
      <ThemeContext.Provider value={value}>
        <View style={[{ flex: 1 }, themeVariables]} />
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
