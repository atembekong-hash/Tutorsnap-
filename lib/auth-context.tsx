/**
 * Auth Context
 * Global authentication state management
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getUserInfo, isAuthenticated, logout } from "@/lib/_core/auth-enhanced";
import { logoutRevenueCat } from "@/lib/subscription";
import type { User } from "@/lib/_core/auth-enhanced";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const userInfo = await getUserInfo();
      setUser(userInfo);
    } catch (error) {
      console.error("[Auth] Failed to refresh user:", error);
      setUser(null);
    }
  };

  const handleLogout = async () => {
    try {
      // IDENTITY FIX (Phase 5): Revert RC to anonymous identity on programmatic logout.
      // This ensures account switching (sign out A -> sign in B) never leaks A's RC identity.
      // logoutRevenueCat() is non-fatal - if it fails, the next loginRevenueCat() call
      // on sign-in will overwrite the stale identity anyway.
      await logoutRevenueCat().catch(() => {});
      await logout();
      setUser(null);
    } catch (error) {
      console.error("[Auth] Logout failed:", error);
      throw error;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        const isAuth = await isAuthenticated();
        if (isAuth) {
          await refreshUser();
        }
      } catch (error) {
        console.error("[Auth] Initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isSignedIn: !!user,
    logout: handleLogout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
