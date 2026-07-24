/**
 * Auth Lifecycle Hook
 * Manages session restoration, token refresh, and error recovery
 */

import { useEffect, useRef, useState } from "react";
import {
  validateSessionOnStartup,
  refreshGoogleSession,
  logout as performLogout,
  getSessionStatus,
  StoredSession,
} from "@/lib/auth-lifecycle";

interface AuthLifecycleState {
  isRestoring: boolean;
  isAuthenticated: boolean;
  session: StoredSession | null;
  error: string | null;
  isRefreshing: boolean;
}

export function useAuthLifecycle() {
  const [state, setState] = useState<AuthLifecycleState>({
    isRestoring: true,
    isAuthenticated: false,
    session: null,
    error: null,
    isRefreshing: false,
  });

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loginLockRef = useRef(false);

  /**
   * Restore session on app startup
   */
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const session = await validateSessionOnStartup();

        if (!isMounted) return;

        if (session) {
          setState({
            isRestoring: false,
            isAuthenticated: true,
            session,
            error: null,
            isRefreshing: false,
          });

          // Schedule token refresh check
          scheduleRefreshCheck();
        } else {
          setState({
            isRestoring: false,
            isAuthenticated: false,
            session: null,
            error: null,
            isRefreshing: false,
          });
        }
      } catch (error) {
        if (!isMounted) return;

        console.error("[Auth] Session restoration failed:", error);
        setState({
          isRestoring: false,
          isAuthenticated: false,
          session: null,
          error: "Failed to restore session",
          isRefreshing: false,
        });
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Schedule periodic token refresh check
   */
  function scheduleRefreshCheck() {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    // Check every minute
    refreshTimerRef.current = setInterval(async () => {
      const isValid = await refreshGoogleSession();
      if (!isValid) {
        console.warn("[Auth] Session refresh check failed, clearing session");
        setState((prev) => ({
          ...prev,
          isAuthenticated: false,
          session: null,
          error: "Session expired",
        }));
      }
    }, 60 * 1000);
  }

  /**
   * Logout
   */
  async function logout() {
    try {
      setState((prev) => ({ ...prev, isRefreshing: true }));
      await performLogout();

      setState({
        isRestoring: false,
        isAuthenticated: false,
        session: null,
        error: null,
        isRefreshing: false,
      });

      // Clear refresh timer
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    } catch (error) {
      console.error("[Auth] Logout failed:", error);
      setState((prev) => ({
        ...prev,
        error: "Logout failed",
        isRefreshing: false,
      }));
    }
  }

  /**
   * Prevent duplicate login requests
   */
  function canLogin(): boolean {
    return !loginLockRef.current && !state.isRestoring;
  }

  function lockLogin() {
    loginLockRef.current = true;
  }

  function unlockLogin() {
    loginLockRef.current = false;
  }

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  return {
    ...state,
    logout,
    canLogin,
    lockLogin,
    unlockLogin,
  };
}
