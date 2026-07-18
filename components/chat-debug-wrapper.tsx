import React, { useEffect } from "react";
import { Platform } from "react-native";

/**
 * Debug wrapper that logs all errors and warnings to console
 * This helps capture errors that occur in child components
 */
export function ChatDebugWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Log component mount
    console.log('[ChatDebugWrapper] Mounted on platform:', Platform.OS);

    // Override console.error to capture all errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      console.log('[ERROR CAPTURED]', ...args);
      originalError(...args);
    };

    // Override console.warn to capture all warnings
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      console.log('[WARN CAPTURED]', ...args);
      originalWarn(...args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    console.log('[ChatDebugWrapper] Rendering children...');
  });

  return <>{children}</>;
}
