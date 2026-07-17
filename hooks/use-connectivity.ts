/**
 * Hook to detect network connectivity and manage offline queue.
 */

import { useEffect, useState } from "react";
import * as Network from "expo-network";
import { getQueue, removeFromQueue } from "@/lib/offline-queue";

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupListener = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        setIsOnline(state.isConnected ?? true);

        // Check queue size
        const queue = await getQueue();
        setQueueSize(queue.length);
      } catch (err) {
        console.error("[Connectivity] Error checking network:", err);
      }
    };

    setupListener();

    // Listen for network changes
    const subscription = Network.addNetworkStateListener(({ isConnected }) => {
      setIsOnline(isConnected ?? true);
      console.log(`[Connectivity] Network ${isConnected ? "online" : "offline"}`);

      // If coming back online, process queue
      if (isConnected) {
        processQueue();
      }
    });

    unsubscribe = subscription.remove;

    return () => {
      unsubscribe?.();
    };
  }, []);

  const processQueue = async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;

    console.log(`[Connectivity] Processing ${queue.length} queued requests`);
    setQueueSize(queue.length);
  };

  return { isOnline, queueSize };
}
