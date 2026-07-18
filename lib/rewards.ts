/**
 * Rewards system for tracking earned free days and referral tier progress
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface RewardTier {
  tier: number;
  name: string;
  requiredReferrals: number;
  freeDaysReward: number;
  emoji: string;
  description: string;
}

export interface UserRewards {
  totalFreeDaysEarned: number;
  currentTier: number;
  referralsInCurrentTier: number;
  nextTierProgress: number; // 0-100
  unclaimedRewards: number;
}

const REWARDS_KEY = "@tutorsnap/rewards";
const REWARD_TIERS: RewardTier[] = [
  {
    tier: 1,
    name: "Starter",
    requiredReferrals: 1,
    freeDaysReward: 3,
    emoji: "🌱",
    description: "Refer 1 friend",
  },
  {
    tier: 2,
    name: "Rising Star",
    requiredReferrals: 3,
    freeDaysReward: 7,
    emoji: "⭐",
    description: "Refer 3 friends",
  },
  {
    tier: 3,
    name: "Champion",
    requiredReferrals: 5,
    freeDaysReward: 14,
    emoji: "🏆",
    description: "Refer 5 friends",
  },
  {
    tier: 4,
    name: "Legend",
    requiredReferrals: 10,
    freeDaysReward: 30,
    emoji: "👑",
    description: "Refer 10 friends",
  },
  {
    tier: 5,
    name: "Influencer",
    requiredReferrals: 20,
    freeDaysReward: 60,
    emoji: "🚀",
    description: "Refer 20 friends",
  },
];

/**
 * Get all reward tiers
 */
export function getRewardTiers(): RewardTier[] {
  return REWARD_TIERS;
}

/**
 * Get a specific reward tier
 */
export function getRewardTier(tier: number): RewardTier | undefined {
  return REWARD_TIERS.find(t => t.tier === tier);
}

/**
 * Get the next reward tier
 */
export function getNextRewardTier(currentTier: number): RewardTier | undefined {
  return REWARD_TIERS.find(t => t.tier === currentTier + 1);
}

/**
 * Initialize user rewards
 */
async function initializeRewards(): Promise<UserRewards> {
  const rewards: UserRewards = {
    totalFreeDaysEarned: 0,
    currentTier: 0,
    referralsInCurrentTier: 0,
    nextTierProgress: 0,
    unclaimedRewards: 0,
  };
  await AsyncStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
  return rewards;
}

/**
 * Get user rewards
 */
export async function getUserRewards(): Promise<UserRewards> {
  try {
    const stored = await AsyncStorage.getItem(REWARDS_KEY);
    if (!stored) {
      return initializeRewards();
    }
    return JSON.parse(stored);
  } catch (error) {
    console.warn("Failed to get user rewards:", error);
    return initializeRewards();
  }
}

/**
 * Add a referral and update tier progress
 */
export async function addReferral(): Promise<UserRewards> {
  try {
    let rewards = await getUserRewards();
    rewards.referralsInCurrentTier += 1;

    // Check if user advanced to next tier
    const nextTier = getNextRewardTier(rewards.currentTier);
    if (nextTier && rewards.referralsInCurrentTier >= nextTier.requiredReferrals) {
      rewards.currentTier = nextTier.tier;
      rewards.unclaimedRewards += nextTier.freeDaysReward;
      rewards.referralsInCurrentTier = 0;
    }

    // Update progress for current tier
    const currentTier = getRewardTier(rewards.currentTier + 1);
    if (currentTier) {
      rewards.nextTierProgress = Math.min(
        100,
        (rewards.referralsInCurrentTier / currentTier.requiredReferrals) * 100
      );
    }

    await AsyncStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
    return rewards;
  } catch (error) {
    console.warn("Failed to add referral:", error);
    return getUserRewards();
  }
}

/**
 * Claim rewards (convert to free days)
 */
export async function claimRewards(): Promise<UserRewards> {
  try {
    const rewards = await getUserRewards();
    rewards.totalFreeDaysEarned += rewards.unclaimedRewards;
    rewards.unclaimedRewards = 0;
    await AsyncStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
    return rewards;
  } catch (error) {
    console.warn("Failed to claim rewards:", error);
    return getUserRewards();
  }
}

/**
 * Get progress to next tier
 */
export async function getNextTierProgress(): Promise<{
  current: RewardTier | undefined;
  next: RewardTier | undefined;
  progress: number;
  referralsNeeded: number;
}> {
  try {
    const rewards = await getUserRewards();
    const current = getRewardTier(rewards.currentTier);
    const next = getNextRewardTier(rewards.currentTier);

    return {
      current,
      next,
      progress: rewards.nextTierProgress,
      referralsNeeded: next ? next.requiredReferrals - rewards.referralsInCurrentTier : 0,
    };
  } catch (error) {
    console.warn("Failed to get next tier progress:", error);
    return {
      current: undefined,
      next: undefined,
      progress: 0,
      referralsNeeded: 0,
    };
  }
}

/**
 * Get reward summary
 */
export async function getRewardSummary(): Promise<{
  totalEarned: number;
  unclaimed: number;
  currentTierName: string;
  currentTierEmoji: string;
  nextTierName: string | null;
  nextTierEmoji: string | null;
  progressPercent: number;
}> {
  try {
    const rewards = await getUserRewards();
    const current = getRewardTier(rewards.currentTier);
    const next = getNextRewardTier(rewards.currentTier);

    return {
      totalEarned: rewards.totalFreeDaysEarned,
      unclaimed: rewards.unclaimedRewards,
      currentTierName: current?.name || "Starter",
      currentTierEmoji: current?.emoji || "🌱",
      nextTierName: next?.name || null,
      nextTierEmoji: next?.emoji || null,
      progressPercent: rewards.nextTierProgress,
    };
  } catch (error) {
    console.warn("Failed to get reward summary:", error);
    return {
      totalEarned: 0,
      unclaimed: 0,
      currentTierName: "Starter",
      currentTierEmoji: "🌱",
      nextTierName: null,
      nextTierEmoji: null,
      progressPercent: 0,
    };
  }
}

/**
 * Redeem a referral code
 */
export async function redeemReferralCode(code: string): Promise<{ success: boolean; message: string; freeDaysAdded?: number }> {
  try {
    // Validate code format
    if (!code || code.length < 5) {
      return { success: false, message: "Invalid referral code format" };
    }

    // In production, this would verify the code with the backend
    // For now, we'll accept any valid-looking code and award bonus days
    const rewards = await getUserRewards();
    const bonusFreeDays = 7; // Bonus for redeeming a referral code
    
    rewards.totalFreeDaysEarned += bonusFreeDays;
    rewards.unclaimedRewards += bonusFreeDays;
    
    await AsyncStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
    
    return {
      success: true,
      message: `Referral code redeemed! +${bonusFreeDays} free days`,
      freeDaysAdded: bonusFreeDays,
    };
  } catch (error) {
    console.warn("Failed to redeem referral code:", error);
    return { success: false, message: "Failed to redeem code. Try again." };
  }
}

/**
 * Get tier-based perks for current tier
 */
export async function getTierPerks(): Promise<{
  unlimitedDailySolves: boolean;
  prioritySupport: boolean;
  adFree: boolean;
  customThemes: boolean;
  advancedAnalytics: boolean;
}> {
  try {
    const rewards = await getUserRewards();
    const tier = rewards.currentTier;

    return {
      unlimitedDailySolves: tier >= 3, // Champion and above
      prioritySupport: tier >= 4, // Legend and above
      adFree: tier >= 2, // Rising Star and above
      customThemes: tier >= 3, // Champion and above
      advancedAnalytics: tier >= 4, // Legend and above
    };
  } catch (error) {
    console.warn("Failed to get tier perks:", error);
    return {
      unlimitedDailySolves: false,
      prioritySupport: false,
      adFree: false,
      customThemes: false,
      advancedAnalytics: false,
    };
  }
}

/**
 * Check if user has a specific perk
 */
export async function hasPerk(perk: keyof ReturnType<typeof getTierPerks>): Promise<boolean> {
  const perks = await getTierPerks();
  return perks[perk] || false;
}

/**
 * Reset rewards (for testing)
 */
export async function resetRewards(): Promise<void> {
  try {
    await AsyncStorage.removeItem(REWARDS_KEY);
  } catch (error) {
    console.warn("Failed to reset rewards:", error);
  }
}
