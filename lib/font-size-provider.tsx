import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FontSizeScale = "small" | "medium" | "large" | "xlarge";

const FONT_SIZE_KEY = "@tutorsnap/fontSizeScale";

// All multipliers scaled ×1.4 to increase every widget by 40%
const SCALE_MULTIPLIERS: Record<FontSizeScale, number> = {
  small:  1.23,  // was 0.88  × 1.4
  medium: 1.40,  // was 1.0   × 1.4  (default)
  large:  1.60,  // was 1.14  × 1.4
  xlarge: 1.79,  // was 1.28  × 1.4
};

const SCALE_LABELS: Record<FontSizeScale, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "Extra Large",
};

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
  const [scale, setScaleState] = useState<FontSizeScale>("medium");

  useEffect(() => {
    AsyncStorage.getItem(FONT_SIZE_KEY).then((saved) => {
      if (saved && saved in SCALE_MULTIPLIERS) {
        setScaleState(saved as FontSizeScale);
      }
    });
  }, []);

  const setScale = async (newScale: FontSizeScale) => {
    setScaleState(newScale);
    await AsyncStorage.setItem(FONT_SIZE_KEY, newScale);
  };

  const multiplier = SCALE_MULTIPLIERS[scale];
  const fs = (base: number) => Math.round(base * multiplier);

  return (
    <FontSizeContext.Provider value={{ scale, multiplier, setScale, fs }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  return useContext(FontSizeContext);
}

export { SCALE_LABELS, SCALE_MULTIPLIERS };
export const FONT_SIZE_SCALES: FontSizeScale[] = ["small", "medium", "large", "xlarge"];
