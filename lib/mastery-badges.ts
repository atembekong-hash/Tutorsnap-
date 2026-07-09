import type { MathSubject } from "@/shared/types";
import { getSubjectLabel, getSubjectColor } from "@/lib/subjects";

export type BadgeTier = "bronze" | "silver" | "gold";

export interface MasteryBadge {
  subject: MathSubject;
  label: string;
  color: string;
  tier: BadgeTier;
  solves: number;
  nextTier: BadgeTier | null;
  nextThreshold: number | null;
  progress: number; // 0-100 toward next tier (or 100 if gold)
}

export const BADGE_THRESHOLDS: Record<BadgeTier, number> = {
  bronze: 10,
  silver: 25,
  gold: 50,
};

export const BADGE_COLORS: Record<BadgeTier, string> = {
  bronze: "#CD7F32",
  silver: "#A8A9AD",
  gold: "#FFD700",
};

export const BADGE_EMOJI: Record<BadgeTier, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
};

export function getTierForSolves(solves: number): BadgeTier | null {
  if (solves >= BADGE_THRESHOLDS.gold) return "gold";
  if (solves >= BADGE_THRESHOLDS.silver) return "silver";
  if (solves >= BADGE_THRESHOLDS.bronze) return "bronze";
  return null;
}

export function computeMasteryBadges(
  subjectCounts: Partial<Record<MathSubject, number>>
): MasteryBadge[] {
  const badges: MasteryBadge[] = [];

  for (const [subject, solves] of Object.entries(subjectCounts) as [MathSubject, number][]) {
    if (!solves || solves === 0) continue;
    const tier = getTierForSolves(solves);
    if (!tier) continue; // hasn't reached bronze yet

    let nextTier: BadgeTier | null = null;
    let nextThreshold: number | null = null;
    let progress = 100;

    if (tier === "bronze") {
      nextTier = "silver";
      nextThreshold = BADGE_THRESHOLDS.silver;
      progress = Math.round(((solves - BADGE_THRESHOLDS.bronze) / (BADGE_THRESHOLDS.silver - BADGE_THRESHOLDS.bronze)) * 100);
    } else if (tier === "silver") {
      nextTier = "gold";
      nextThreshold = BADGE_THRESHOLDS.gold;
      progress = Math.round(((solves - BADGE_THRESHOLDS.silver) / (BADGE_THRESHOLDS.gold - BADGE_THRESHOLDS.silver)) * 100);
    }

    badges.push({
      subject,
      label: getSubjectLabel(subject),
      color: getSubjectColor(subject),
      tier,
      solves,
      nextTier,
      nextThreshold,
      progress: Math.min(100, progress),
    });
  }

  // Sort: gold first, then silver, then bronze; within tier sort by solves desc
  const tierOrder: Record<BadgeTier, number> = { gold: 0, silver: 1, bronze: 2 };
  badges.sort((a, b) => {
    const td = tierOrder[a.tier] - tierOrder[b.tier];
    return td !== 0 ? td : b.solves - a.solves;
  });

  return badges;
}

/** Return subjects close to earning their next badge (within 5 solves) */
export function getAlmostBadges(
  subjectCounts: Partial<Record<MathSubject, number>>
): { subject: MathSubject; label: string; remaining: number; nextTier: BadgeTier }[] {
  const result = [];
  for (const [subject, solves] of Object.entries(subjectCounts) as [MathSubject, number][]) {
    if (!solves) continue;
    for (const tier of ["bronze", "silver", "gold"] as BadgeTier[]) {
      const threshold = BADGE_THRESHOLDS[tier];
      if (solves < threshold && threshold - solves <= 5) {
        result.push({ subject, label: getSubjectLabel(subject), remaining: threshold - solves, nextTier: tier });
        break;
      }
    }
  }
  return result;
}
