/**
 * Achievement Notification Service
 * Handles push notifications for rewards and tier unlocks
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure notification handler
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return false; // Web doesn't support native notifications
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.warn("Failed to request notification permissions:", error);
    return false;
  }
}

/**
 * Send tier unlock notification
 */
export async function notifyTierUnlock(tierName: string, emoji: string): Promise<void> {
  try {
    if (Platform.OS === "web") return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🎉 Tier Unlocked!",
        body: `Congratulations! You've reached ${emoji} ${tierName}!`,
        data: { type: "tier_unlock", tier: tierName },
        sound: "default",
        badge: 1,
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.warn("Failed to send tier unlock notification:", error);
  }
}

/**
 * Send referral success notification
 */
export async function notifyReferralSuccess(freeDays: number): Promise<void> {
  try {
    if (Platform.OS === "web") return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "✅ Referral Redeemed",
        body: `You earned ${freeDays} free days! Check your rewards.`,
        data: { type: "referral_success", freeDays },
        sound: "default",
        badge: 1,
      },
      trigger: null,
    });
  } catch (error) {
    console.warn("Failed to send referral notification:", error);
  }
}

/**
 * Send reward claimed notification
 */
export async function notifyRewardClaimed(freeDays: number): Promise<void> {
  try {
    if (Platform.OS === "web") return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🎁 Rewards Claimed",
        body: `${freeDays} free days added to your account!`,
        data: { type: "reward_claimed", freeDays },
        sound: "default",
        badge: 1,
      },
      trigger: null,
    });
  } catch (error) {
    console.warn("Failed to send reward claimed notification:", error);
  }
}

/**
 * Send daily reminder notification
 */
export async function scheduleDailyReminder(): Promise<void> {
  try {
    if (Platform.OS === "web") return;

    // Schedule for 9 AM daily
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📚 Daily Challenge Waiting",
        body: "Complete today's challenge to earn rewards!",
        data: { type: "daily_reminder" },
        sound: "default",
      },
      trigger: {
        type: "daily" as any,
        hour: 9,
        minute: 0,
      } as any,
    });
  } catch (error) {
    console.warn("Failed to schedule daily reminder:", error);
  }
}

/**
 * Send referral milestone notification
 */
export async function notifyReferralMilestone(
  referralCount: number,
  nextTierName: string
): Promise<void> {
  try {
    if (Platform.OS === "web") return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚀 You're Close!",
        body: `${referralCount} referrals! Unlock ${nextTierName} with just a few more shares.`,
        data: { type: "referral_milestone", referralCount, nextTier: nextTierName },
        sound: "default",
      },
      trigger: null,
    });
  } catch (error) {
    console.warn("Failed to send referral milestone notification:", error);
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.warn("Failed to clear notifications:", error);
  }
}

/**
 * Listen for notification responses
 */
export function setupNotificationListener(
  onResponse: (notification: Notifications.Notification) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    ({ notification }) => {
      onResponse(notification);
    }
  );

  return () => subscription.remove();
}
