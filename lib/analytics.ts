/**
 * Analytics tracking for share events, referral conversions, and engagement metrics
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

interface AnalyticsEvent {
  eventType: string;
  timestamp: number;
  data?: Record<string, any>;
}

interface ShareEvent extends AnalyticsEvent {
  eventType: "share_leaderboard" | "share_solution" | "share_referral";
  data: {
    userId?: string;
    rank?: number;
    solutionId?: string;
    subject?: string;
    platform?: string; // "native_share" | "clipboard" | "web"
  };
}

interface ReferralEvent extends AnalyticsEvent {
  eventType: "referral_code_generated" | "referral_code_redeemed" | "referral_link_shared";
  data: {
    referralCode: string;
    userId?: string;
    referrerUserId?: string;
  };
}

const ANALYTICS_KEY = "@tutorsnap/analytics_events";
const MAX_EVENTS = 1000; // Keep last 1000 events

/**
 * Log a share event
 */
export async function logShareEvent(
  eventType: "share_leaderboard" | "share_solution" | "share_referral",
  data: Record<string, any>
): Promise<void> {
  try {
    const event: ShareEvent = {
      eventType,
      timestamp: Date.now(),
      data,
    };
    await addAnalyticsEvent(event);
  } catch (error) {
    console.warn("Failed to log share event:", error);
  }
}

/**
 * Log a referral event
 */
export async function logReferralEvent(
  eventType: "referral_code_generated" | "referral_code_redeemed" | "referral_link_shared",
  data: Record<string, any>
): Promise<void> {
  try {
    const event: ReferralEvent = {
      eventType,
      timestamp: Date.now(),
      data: data as any,
    };
    await addAnalyticsEvent(event);
  } catch (error) {
    console.warn("Failed to log referral event:", error);
  }
}

/**
 * Add event to analytics storage
 */
async function addAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(ANALYTICS_KEY);
    const events: AnalyticsEvent[] = stored ? JSON.parse(stored) : [];
    
    // Add new event
    events.push(event);
    
    // Keep only last MAX_EVENTS
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }
    
    await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
  } catch (error) {
    console.warn("Failed to add analytics event:", error);
  }
}

/**
 * Get all analytics events
 */
export async function getAnalyticsEvents(): Promise<AnalyticsEvent[]> {
  try {
    const stored = await AsyncStorage.getItem(ANALYTICS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn("Failed to get analytics events:", error);
    return [];
  }
}

/**
 * Get share event statistics
 */
export async function getShareStats(): Promise<{
  totalShares: number;
  leaderboardShares: number;
  solutionShares: number;
  referralShares: number;
  sharesByPlatform: Record<string, number>;
}> {
  try {
    const events = await getAnalyticsEvents();
    const shareEvents = events.filter(e => 
      e.eventType === "share_leaderboard" || 
      e.eventType === "share_solution" || 
      e.eventType === "share_referral"
    );

    const stats = {
      totalShares: shareEvents.length,
      leaderboardShares: shareEvents.filter(e => e.eventType === "share_leaderboard").length,
      solutionShares: shareEvents.filter(e => e.eventType === "share_solution").length,
      referralShares: shareEvents.filter(e => e.eventType === "share_referral").length,
      sharesByPlatform: {} as Record<string, number>,
    };

    // Count by platform
    shareEvents.forEach(event => {
      const platform = (event as any).data?.platform || "unknown";
      stats.sharesByPlatform[platform] = (stats.sharesByPlatform[platform] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.warn("Failed to get share stats:", error);
    return {
      totalShares: 0,
      leaderboardShares: 0,
      solutionShares: 0,
      referralShares: 0,
      sharesByPlatform: {},
    };
  }
}

/**
 * Get referral event statistics
 */
export async function getReferralStats(): Promise<{
  codesGenerated: number;
  codesRedeemed: number;
  linksShared: number;
  conversionRate: number;
}> {
  try {
    const events = await getAnalyticsEvents();
    const referralEvents = events.filter(e => 
      e.eventType === "referral_code_generated" || 
      e.eventType === "referral_code_redeemed" || 
      e.eventType === "referral_link_shared"
    );

    const generated = referralEvents.filter(e => e.eventType === "referral_code_generated").length;
    const redeemed = referralEvents.filter(e => e.eventType === "referral_code_redeemed").length;
    const shared = referralEvents.filter(e => e.eventType === "referral_link_shared").length;

    return {
      codesGenerated: generated,
      codesRedeemed: redeemed,
      linksShared: shared,
      conversionRate: generated > 0 ? (redeemed / generated) * 100 : 0,
    };
  } catch (error) {
    console.warn("Failed to get referral stats:", error);
    return {
      codesGenerated: 0,
      codesRedeemed: 0,
      linksShared: 0,
      conversionRate: 0,
    };
  }
}

/**
 * Get engagement metrics for a time period
 */
export async function getEngagementMetrics(
  startTime: number,
  endTime: number
): Promise<{
  shareEvents: number;
  referralEvents: number;
  uniqueShareTypes: string[];
  topShareType: string | null;
}> {
  try {
    const events = await getAnalyticsEvents();
    const periodEvents = events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);

    const shareEvents = periodEvents.filter(e => 
      e.eventType === "share_leaderboard" || 
      e.eventType === "share_solution" || 
      e.eventType === "share_referral"
    );
    const referralEvents = periodEvents.filter(e => 
      e.eventType === "referral_code_generated" || 
      e.eventType === "referral_code_redeemed" || 
      e.eventType === "referral_link_shared"
    );

    const uniqueShareTypes = [...new Set(shareEvents.map(e => e.eventType))];
    
    // Find most common share type
    const shareTypeCounts: Record<string, number> = {};
    shareEvents.forEach(e => {
      shareTypeCounts[e.eventType] = (shareTypeCounts[e.eventType] || 0) + 1;
    });
    const topShareType = Object.entries(shareTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      shareEvents: shareEvents.length,
      referralEvents: referralEvents.length,
      uniqueShareTypes,
      topShareType,
    };
  } catch (error) {
    console.warn("Failed to get engagement metrics:", error);
    return {
      shareEvents: 0,
      referralEvents: 0,
      uniqueShareTypes: [],
      topShareType: null,
    };
  }
}

/**
 * Clear all analytics events
 */
export async function clearAnalyticsEvents(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ANALYTICS_KEY);
  } catch (error) {
    console.warn("Failed to clear analytics events:", error);
  }
}

/**
 * Export analytics data as JSON
 */
export async function exportAnalyticsData(): Promise<string> {
  try {
    const events = await getAnalyticsEvents();
    const shareStats = await getShareStats();
    const referralStats = await getReferralStats();
    
    const data = {
      exportedAt: new Date().toISOString(),
      totalEvents: events.length,
      events,
      shareStats,
      referralStats,
    };

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.warn("Failed to export analytics data:", error);
    return "{}";
  }
}
