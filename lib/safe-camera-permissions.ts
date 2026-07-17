/**
 * Safe camera permissions wrapper
 * Handles cases where expo-camera returns undefined
 */

import { useCameraPermissions as useExpoPermissions } from "expo-camera";
import { useState, useEffect } from "react";

export interface SafePermission {
  granted: boolean;
  canAskAgain: boolean;
}

/**
 * Safe wrapper around useCameraPermissions
 * Prevents crashes when permission object is undefined
 */
export function useSafeCameraPermissions(): [
  SafePermission | null,
  () => Promise<SafePermission>
] {
  const [permission, requestPermission] = useExpoPermissions();
  const [safePermission, setSafePermission] = useState<SafePermission | null>(null);

  useEffect(() => {
    if (permission === undefined || permission === null) {
      // Default to requesting permission
      setSafePermission({ granted: false, canAskAgain: true });
    } else {
      setSafePermission({
        granted: permission.granted === true,
        canAskAgain: permission.canAskAgain !== false,
      });
    }
  }, [permission]);

  const requestSafePermission = async (): Promise<SafePermission> => {
    try {
      const result = await requestPermission();

      if (!result) {
        return { granted: false, canAskAgain: true };
      }

      return {
        granted: result.granted === true,
        canAskAgain: result.canAskAgain !== false,
      };
    } catch (error) {
      console.error("Permission request failed:", error);
      return { granted: false, canAskAgain: true };
    }
  };

  return [safePermission, requestSafePermission];
}
