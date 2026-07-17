/**
 * Hook to manage cache refresh for practice and quiz screens.
 * Provides a way to bypass cache and regenerate questions on demand.
 */

import { useRef } from "react";

export function useCacheRefresh() {
  const refreshCounterRef = useRef(0);

  /**
   * Generate a unique cache-busting key by incrementing a counter.
   * Pass this to mutations to bypass cache.
   */
  const getRefreshKey = () => {
    refreshCounterRef.current++;
    return `refresh_${refreshCounterRef.current}_${Date.now()}`;
  };

  /**
   * Reset the refresh counter.
   */
  const resetRefresh = () => {
    refreshCounterRef.current = 0;
  };

  return { getRefreshKey, resetRefresh };
}
