import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

const THEME_STORAGE_KEY = "@tutorsnap/colorScheme";

/**
 * Read the persisted color scheme from localStorage synchronously.
 * Falls back to the OS preference, then to "light".
 * This prevents a flash of unstyled content on web dark mode.
 */
function getInitialColorScheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // localStorage may be unavailable (private browsing, security policy)
  }
  // Fall back to OS preference
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

/**
 * Web-specific color scheme hook.
 * Reads the persisted preference synchronously so the first render
 * already has the correct scheme — no flash of wrong theme.
 */
export function useColorScheme() {
  const [colorScheme, setColorScheme] = useState<"light" | "dark">(getInitialColorScheme);
  const systemScheme = useRNColorScheme();

  useEffect(() => {
    // After hydration, re-read in case localStorage changed in another tab
    const persisted = localStorage.getItem(THEME_STORAGE_KEY);
    if (persisted === "dark" || persisted === "light") {
      setColorScheme(persisted);
    } else if (systemScheme) {
      setColorScheme(systemScheme as "light" | "dark");
    }
  }, [systemScheme]);

  return colorScheme;
}
