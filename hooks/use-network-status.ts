/**
 * useNetworkStatus — tracks whether the device has internet access.
 * Uses expo-network's addNetworkStateListener for real-time updates.
 *
 * Also tracks connectivity transitions:
 *  - wasJustReconnected: true for one render cycle after going offline → online
 *  - wasJustDisconnected: true for one render cycle after going online → offline
 */
import { useState, useEffect, useRef } from "react";
import * as Network from "expo-network";

export interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
  /** True for one tick after the device transitions from offline → online */
  wasJustReconnected: boolean;
  /** True for one tick after the device transitions from online → offline */
  wasJustDisconnected: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true); // optimistic default
  const [isChecking, setIsChecking] = useState(true);
  const [wasJustReconnected, setWasJustReconnected] = useState(false);
  const [wasJustDisconnected, setWasJustDisconnected] = useState(false);
  const prevOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Initial check
    Network.getNetworkStateAsync()
      .then((state) => {
        const online = state.isConnected === true && state.isInternetReachable !== false;
        setIsOnline(online);
        prevOnlineRef.current = online;
      })
      .catch(() => {
        setIsOnline(true);
        prevOnlineRef.current = true;
      })
      .finally(() => setIsChecking(false));

    // Subscribe to changes
    const subscription = Network.addNetworkStateListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      const prev = prevOnlineRef.current;

      if (prev !== null && prev !== online) {
        if (online) {
          // Just reconnected
          setWasJustReconnected(true);
          setTimeout(() => setWasJustReconnected(false), 50);
        } else {
          // Just disconnected
          setWasJustDisconnected(true);
          setTimeout(() => setWasJustDisconnected(false), 50);
        }
      }

      prevOnlineRef.current = online;
      setIsOnline(online);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return { isOnline, isChecking, wasJustReconnected, wasJustDisconnected };
}
