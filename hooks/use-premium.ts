/**
 * hooks/use-premium.ts
 *
 * usePremium — central hook for subscription status and usage gating.
 *
 * Usage:
 *   const { isPremium, trialDaysRemaining, checkLimit, incrementUsage } = usePremium();
 *
 * checkLimit(type) returns true if the user has NOT exceeded the free limit.
 * Call incrementUsage(type) AFTER a successful action.
 */

import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import {
  FREE_LIMITS,
  SubscriptionStatus,
  getSubscriptionStatus,
  getUsageCount,
  incrementUsage as _incrementUsage,
} from "@/lib/subscription";

export interface PremiumState extends SubscriptionStatus {
  loading: boolean;
  /** usage counts for today */
  usage: {
    solves: number;
    quiz: number;
    chat: number;
  };
  /** returns true if the user can perform the action (premium or within free limit) */
  checkLimit: (type: "solves" | "quiz" | "chat") => boolean;
  /** increment usage counter and return new count */
  incrementUsage: (type: "solves" | "quiz" | "chat") => Promise<number>;
  /** force refresh subscription status */
  refresh: () => Promise<void>;
}

const DEFAULT_STATUS: SubscriptionStatus = {
  isPremium: true, // optimistic until loaded
  isTrialActive: true,
  trialDaysRemaining: 14,
  activeProductId: null,
  isDevMode: true,
};

export function usePremium(): PremiumState {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus>(DEFAULT_STATUS);
  const [usage, setUsage] = useState({ solves: 0, quiz: 0, chat: 0 });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, solves, quiz, chat] = await Promise.all([
        getSubscriptionStatus(),
        getUsageCount("solves"),
        getUsageCount("quiz"),
        getUsageCount("chat"),
      ]);
      setStatus(s);
      setUsage({ solves, quiz, chat });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Refresh whenever the screen comes into focus (e.g. returning from paywall)
  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const checkLimit = useCallback(
    (type: "solves" | "quiz" | "chat"): boolean => {
      if (status.isPremium) return true;
      const limitMap = {
        solves: FREE_LIMITS.solvesPerDay,
        quiz: FREE_LIMITS.quizQuestionsPerDay,
        chat: FREE_LIMITS.chatMessagesPerSession,
      };
      return usage[type] < limitMap[type];
    },
    [status.isPremium, usage]
  );

  const incrementUsage = useCallback(
    async (type: "solves" | "quiz" | "chat"): Promise<number> => {
      const next = await _incrementUsage(type);
      setUsage((prev) => ({ ...prev, [type]: next }));
      return next;
    },
    []
  );

  return {
    ...status,
    loading,
    usage,
    checkLimit,
    incrementUsage,
    refresh: loadAll,
  };
}
