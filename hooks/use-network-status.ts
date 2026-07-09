/**
 * useNetworkStatus — tracks whether the device has internet access.
 * Uses expo-network's addNetworkStateListener for real-time updates.
 */
import { useState, useEffect } from "react";
import * as Network from "expo-network";

export interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true); // optimistic default
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Initial check
    Network.getNetworkStateAsync()
      .then((state) => {
        setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
      })
      .catch(() => {
        // If we can't check, assume online
        setIsOnline(true);
      })
      .finally(() => setIsChecking(false));

    // Subscribe to changes
    const subscription = Network.addNetworkStateListener((state) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return { isOnline, isChecking };
}
