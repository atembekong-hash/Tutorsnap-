/**
 * lib/affiliate.ts
 *
 * Full affiliate / referral system for TutorSnap.
 * All data is persisted locally in AsyncStorage.
 *
 * Earning options:
 *   1. Referral — invite a friend who signs up with your code → +7 days each
 *   2. Social Share — share on any platform → +1 day (once per 24 h)
 *   3. Review Reward — leave an App Store / Play Store review → +3 days (once)
 *   4. Content Creator — share a solve screenshot with #TutorSnap → +2 days (up to 5×)
 *   5. Classroom Invite — invite a teacher who creates a classroom → +14 days
 *   6. Milestone Bonus — reach referral milestones (5, 10, 25) → bonus days
 *
 * Reward tiers (total referrals):
 *   Starter   0–4    referrals  → 7 days per referral
 *   Advocate  5–9    referrals  → 10 days per referral + "Advocate" badge
 *   Champion  10–24  referrals  → 14 days per referral + "Champion" badge
 *   Legend    25+    referrals  → 30 days per referral + "Legend" badge + 1 month free
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ─── Keys ────────────────────────────────────────────────────────────────────
const KEYS = {
  code: "@tutorsnap/referralCode",
  stats: "@tutorsnap/affiliateStats",
  history: "@tutorsnap/affiliateHistory",
  lastShare: "@tutorsnap/affiliateLastShare",
  reviewDone: "@tutorsnap/affiliateReviewDone",
  contentCount: "@tutorsnap/affiliateContentCount",
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type EarningType =
  | "referral"
  | "social_share"
  | "review"
  | "content_creator"
  | "classroom_invite"
  | "milestone_bonus";

export type RewardTier = "starter" | "advocate" | "champion" | "legend";

export interface AffiliateEvent {
  id: string;
  type: EarningType;
  daysEarned: number;
  label: string;
  timestamp: number;
}

export interface AffiliateStats {
  totalReferrals: number;
  totalDaysEarned: number;
  pendingDays: number;      // days not yet "redeemed" (shown as balance)
  redeemedDays: number;
  socialShareCount: number;
  contentCount: number;
  reviewDone: boolean;
  classroomInvites: number;
}

export interface EarningOption {
  id: EarningType;
  emoji: string;
  title: string;
  subtitle: string;
  reward: string;
  available: boolean;
  availableNote?: string;
  action: "share_code" | "share_social" | "review" | "content" | "classroom" | "none";
}

// ─── Tier helpers ─────────────────────────────────────────────────────────────
export function getTier(totalReferrals: number): RewardTier {
  if (totalReferrals >= 25) return "legend";
  if (totalReferrals >= 10) return "champion";
  if (totalReferrals >= 5)  return "advocate";
  return "starter";
}

export const TIER_META: Record<RewardTier, {
  label: string; emoji: string; color: string;
  daysPerReferral: number; minReferrals: number; maxReferrals: number | null;
  perks: string[];
}> = {
  starter:   { label: "Starter",   emoji: "🌱", color: "#22C55E", daysPerReferral: 14, minReferrals: 0,  maxReferrals: 4,    perks: ["14 days per referral", "Invite up to 100 friends"] },
  advocate:  { label: "Advocate",  emoji: "⭐", color: "#0a7ea4", daysPerReferral: 21, minReferrals: 5,  maxReferrals: 9,    perks: ["21 days per referral", "Advocate badge", "Priority support"] },
  champion:  { label: "Champion",  emoji: "🏆", color: "#F59E0B", daysPerReferral: 30, minReferrals: 10, maxReferrals: 24,   perks: ["30 days per referral", "Champion badge", "Early feature access"] },
  legend:    { label: "Legend",    emoji: "👑", color: "#8B5CF6", daysPerReferral: 60, minReferrals: 25, maxReferrals: null, perks: ["60 days per referral", "Legend badge", "2 free months bonus", "VIP support"] },
};

export const MILESTONE_BONUSES: { at: number; bonus: number; label: string }[] = [
  { at: 5,  bonus: 30,  label: "5 referrals milestone — 1 month bonus!" },
  { at: 10, bonus: 60,  label: "10 referrals milestone — Champion unlocked! 2 month bonus!" },
  { at: 25, bonus: 120, label: "25 referrals milestone — Legend unlocked! 4 month bonus!" },
];

// ─── Code ─────────────────────────────────────────────────────────────────────
export async function getOrCreateReferralCode(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEYS.code);
  if (existing) return existing;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  await AsyncStorage.setItem(KEYS.code, code);
  return code;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
const DEFAULT_STATS: AffiliateStats = {
  totalReferrals: 0, totalDaysEarned: 0, pendingDays: 0,
  redeemedDays: 0, socialShareCount: 0, contentCount: 0,
  reviewDone: false, classroomInvites: 0,
};

export async function getAffiliateStats(): Promise<AffiliateStats> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.stats);
    if (!raw) return { ...DEFAULT_STATS };
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_STATS }; }
}

async function saveStats(stats: AffiliateStats): Promise<void> {
  await AsyncStorage.setItem(KEYS.stats, JSON.stringify(stats));
}

// ─── History ──────────────────────────────────────────────────────────────────
export async function getAffiliateHistory(): Promise<AffiliateEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.history);
    if (!raw) return [];
    return JSON.parse(raw) as AffiliateEvent[];
  } catch { return []; }
}

async function addEvent(event: Omit<AffiliateEvent, "id" | "timestamp">): Promise<AffiliateEvent> {
  const history = await getAffiliateHistory();
  const newEvent: AffiliateEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };
  history.unshift(newEvent);
  await AsyncStorage.setItem(KEYS.history, JSON.stringify(history.slice(0, 100)));
  return newEvent;
}

// ─── Earning actions ──────────────────────────────────────────────────────────

/** Record a successful referral (called when a referred user signs up). */
export async function recordReferral(): Promise<{ daysEarned: number; milestoneBonus: number; newTier: RewardTier }> {
  const stats = await getAffiliateStats();
  const tier = getTier(stats.totalReferrals);
  const daysEarned = TIER_META[tier].daysPerReferral;

  stats.totalReferrals += 1;
  stats.totalDaysEarned += daysEarned;
  stats.pendingDays += daysEarned;

  // Check milestone bonus
  let milestoneBonus = 0;
  const milestone = MILESTONE_BONUSES.find((m) => m.at === stats.totalReferrals);
  if (milestone) {
    milestoneBonus = milestone.bonus;
    stats.totalDaysEarned += milestoneBonus;
    stats.pendingDays += milestoneBonus;
    await addEvent({ type: "milestone_bonus", daysEarned: milestoneBonus, label: milestone.label });
  }

  await saveStats(stats);
  await addEvent({ type: "referral", daysEarned, label: `Friend joined with your code (+${daysEarned} days)` });

  const newTier = getTier(stats.totalReferrals);
  // Fire push notification (non-blocking)
  sendFriendJoinedNotification(daysEarned + milestoneBonus, newTier).catch(() => {});
  return { daysEarned, milestoneBonus, newTier };
}

/** Record a social share (once per 24 hours). Returns days earned or 0 if on cooldown. */
export async function recordSocialShare(): Promise<number> {
  const lastRaw = await AsyncStorage.getItem(KEYS.lastShare);
  const last = lastRaw ? parseInt(lastRaw, 10) : 0;
  const now = Date.now();
  if (now - last < 24 * 60 * 60 * 1000) return 0; // cooldown

  const stats = await getAffiliateStats();
  const daysEarned = 3;
  stats.socialShareCount += 1;
  stats.totalDaysEarned += daysEarned;
  stats.pendingDays += daysEarned;
  await saveStats(stats);
  await AsyncStorage.setItem(KEYS.lastShare, String(now));
  await addEvent({ type: "social_share", daysEarned, label: "Shared TutorSnap on social media (+3 days)" });
  return daysEarned;
}

/** Record an App Store / Play Store review (once ever). */
export async function recordReview(): Promise<number> {
  const done = await AsyncStorage.getItem(KEYS.reviewDone);
  if (done) return 0;

  const stats = await getAffiliateStats();
  const daysEarned = 7;
  stats.reviewDone = true;
  stats.totalDaysEarned += daysEarned;
  stats.pendingDays += daysEarned;
  await saveStats(stats);
  await AsyncStorage.setItem(KEYS.reviewDone, "1");
  await addEvent({ type: "review", daysEarned, label: "Left an App Store review (+7 days)" });
  return daysEarned;
}

/** Record a content creator share (up to 5 times). */
export async function recordContentShare(): Promise<number> {
  const stats = await getAffiliateStats();
  if (stats.contentCount >= 10) return 0;

  const daysEarned = 5;
  stats.contentCount += 1;
  stats.totalDaysEarned += daysEarned;
  stats.pendingDays += daysEarned;
  await saveStats(stats);
  await addEvent({ type: "content_creator", daysEarned, label: `Shared a solve screenshot #${stats.contentCount} (+5 days)` });
  return daysEarned;
}

/** Record a classroom invite (teacher creates classroom via your link). */
export async function recordClassroomInvite(): Promise<number> {
  const stats = await getAffiliateStats();
  const daysEarned = 30;
  stats.classroomInvites += 1;
  stats.totalDaysEarned += daysEarned;
  stats.pendingDays += daysEarned;
  await saveStats(stats);
  await addEvent({ type: "classroom_invite", daysEarned, label: "Teacher joined via your classroom link (+30 days)" });
  return daysEarned;
}

/** Redeem all pending days (apply to subscription). Returns days redeemed. */
export async function redeemPendingDays(): Promise<number> {
  const stats = await getAffiliateStats();
  const toRedeem = stats.pendingDays;
  if (toRedeem <= 0) return 0;
  stats.redeemedDays += toRedeem;
  stats.pendingDays = 0;
  await saveStats(stats);
  await addEvent({ type: "referral", daysEarned: 0, label: `Redeemed ${toRedeem} days to your subscription` });
  return toRedeem;
}

/** Send a local push notification when a referred friend joins. */
export async function sendFriendJoinedNotification(daysEarned: number, newTier?: RewardTier): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: asked } = await Notifications.requestPermissionsAsync();
      if (asked !== "granted") return;
    }
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("affiliate", {
        name: "Affiliate Rewards",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const tierMsg = newTier && newTier !== "starter"
      ? ` You've reached ${TIER_META[newTier].emoji} ${TIER_META[newTier].label} tier!`
      : "";
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🎁 A friend just joined TutorSnap!",
        body: `You earned +${daysEarned} free days.${tierMsg} Keep sharing to earn more!`,
        sound: true,
        data: { screen: "/refer" },
        ...(Platform.OS === "android" ? { channelId: "affiliate" } : {}),
      },
      trigger: null, // immediate
    });
  } catch { /* silently ignore */ }
}

/** Build the list of earning options with live availability. */
export async function getEarningOptions(stats: AffiliateStats): Promise<EarningOption[]> {
  const lastRaw = await AsyncStorage.getItem(KEYS.lastShare);
  const last = lastRaw ? parseInt(lastRaw, 10) : 0;
  const shareAvailable = Date.now() - last >= 24 * 60 * 60 * 1000;
  const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - last)) / (60 * 60 * 1000));

  return [
    {
      id: "referral",
      emoji: "🎁",
      title: "Invite a Friend",
      subtitle: "Share your code — they get 7 bonus days, you get days based on your tier",
      reward: `+${TIER_META[getTier(stats.totalReferrals)].daysPerReferral} days per referral`,
      // Updated to revised generous tier
      available: true,
      action: "share_code",
    },
    {
      id: "social_share",
      emoji: "📣",
      title: "Share on Social Media",
      subtitle: "Post about TutorSnap on any platform — Instagram, TikTok, X, WhatsApp…",
      reward: "+3 days (once per 24 h)",
      available: shareAvailable,
      availableNote: shareAvailable ? undefined : `Available in ${hoursLeft}h`,
      action: "share_social",
    },
    {
      id: "review",
      emoji: "⭐",
      title: "Leave a Review",
      subtitle: "Rate TutorSnap on the App Store or Google Play",
      reward: "+7 days (one-time)",
      available: !stats.reviewDone,
      availableNote: stats.reviewDone ? "Already claimed ✓" : undefined,
      action: "review",
    },
    {
      id: "content_creator",
      emoji: "📸",
      title: "Share a Solve Screenshot",
      subtitle: "Post a screenshot of a solved problem with #TutorSnap",
      reward: `+5 days (${stats.contentCount}/10 claimed)`,
      available: stats.contentCount < 10,
      availableNote: stats.contentCount >= 10 ? "Max reached ✓" : undefined,
      action: "content",
    },
    {
      id: "classroom_invite",
      emoji: "🏫",
      title: "Invite a Teacher",
      subtitle: "Share your classroom invite link — when a teacher creates a classroom, you earn big",
      reward: "+30 days per teacher",
      available: true,
      action: "classroom",
    },
  ];
}
