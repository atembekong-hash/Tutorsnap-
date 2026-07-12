/**
 * FontSizeProvider — thin bridge to AppearanceContext.
 *
 * All font-size state now lives in AppearanceContext (lib/appearance-context.tsx).
 * This provider is kept for backward compatibility so existing `useFontSize()` calls
 * continue to work without changes.
 */
import React, { createContext, useContext } from "react";
import { useAppearance, FONT_SIZE_MULTIPLIERS, FONT_SIZE_LABELS, type FontSizeScale } from "@/lib/appearance-context";

export type { FontSizeScale };

interface FontSizeContextValue {
  scale: FontSizeScale;
  multiplier: number;
  setScale: (scale: FontSizeScale) => void;
  /** Convenience: scale a base font size by the current multiplier */
  fs: (base: number) => number;
}

const FontSizeContext = createContext<FontSizeContextValue>({
  scale: "medium",
  multiplier: 1.0,
  setScale: () => {},
  fs: (base) => base,
});

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSetting, fs } = useAppearance();

  const setScale = (newScale: FontSizeScale) => {
    updateSetting("fontSize", newScale);
  };

  return (
    <FontSizeContext.Provider
      value={{
        scale: settings.fontSize,
        multiplier: FONT_SIZE_MULTIPLIERS[settings.fontSize],
        setScale,
        fs,
      }}
    >
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  return useContext(FontSizeContext);
}

export { FONT_SIZE_LABELS as SCALE_LABELS, FONT_SIZE_MULTIPLIERS as SCALE_MULTIPLIERS };
export const FONT_SIZE_SCALES: FontSizeScale[] = ["small", "medium", "large", "xlarge"];
