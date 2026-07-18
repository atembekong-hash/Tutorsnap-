/**
 * Fraud Detection Service
 * Tracks redemption patterns and flags suspicious activity
 */

import { db } from "@/server/db";
import { fraudAlerts, redemptionHistory } from "@/drizzle/schema";
import { eq, and, gt, gte } from "drizzle-orm";

interface RedemptionContext {
  userId: number;
  code: string;
  ipAddress?: string;
  deviceId?: string;
  userAgent?: string;
}

interface FraudCheckResult {
  isFraudulent: boolean;
  severity: "low" | "medium" | "high" | "critical";
  alerts: string[];
  shouldBlock: boolean;
}

/**
 * Check for rapid redemption patterns (multiple codes in short time)
 */
async function checkRapidRedemption(userId: number): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const recentRedemptions = await db
    .select()
    .from(redemptionHistory)
    .where(
      and(
        eq(redemptionHistory.userId, userId),
        gte(redemptionHistory.createdAt, fiveMinutesAgo),
        eq(redemptionHistory.success, true)
      )
    );

  // Flag if more than 3 successful redemptions in 5 minutes
  return recentRedemptions.length > 3;
}

/**
 * Check for multiple IP addresses from same user
 */
async function checkMultipleIPs(userId: number, currentIP?: string): Promise<boolean> {
  if (!currentIP) return false;

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const redemptions = await db
    .select()
    .from(redemptionHistory)
    .where(
      and(
        eq(redemptionHistory.userId, userId),
        gte(redemptionHistory.createdAt, last24Hours)
      )
    );

  // Get unique IPs
  const uniqueIPs = new Set(
    redemptions
      .filter((r) => r.ipAddress)
      .map((r) => r.ipAddress)
  );

  // Flag if more than 5 different IPs in 24 hours
  return uniqueIPs.size > 5;
}

/**
 * Check for suspicious device patterns
 */
async function checkSuspiciousDevices(userId: number): Promise<boolean> {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const redemptions = await db
    .select()
    .from(redemptionHistory)
    .where(
      and(
        eq(redemptionHistory.userId, userId),
        gte(redemptionHistory.createdAt, last24Hours)
      )
    );

  // Get unique devices
  const uniqueDevices = new Set(
    redemptions
      .filter((r) => r.deviceId)
      .map((r) => r.deviceId)
  );

  // Flag if more than 10 different devices in 24 hours
  return uniqueDevices.size > 10;
}

/**
 * Check for high-value code abuse
 */
async function checkHighValueCodeAbuse(code: string, userId: number): Promise<boolean> {
  const last1Hour = new Date(Date.now() - 60 * 60 * 1000);
  
  const recentAttempts = await db
    .select()
    .from(redemptionHistory)
    .where(
      and(
        eq(redemptionHistory.code, code),
        gte(redemptionHistory.createdAt, last1Hour)
      )
    );

  // Flag if same code used more than 10 times in 1 hour
  return recentAttempts.length > 10;
}

/**
 * Perform comprehensive fraud check
 */
export async function checkFraud(context: RedemptionContext): Promise<FraudCheckResult> {
  const alerts: string[] = [];
  let severity: "low" | "medium" | "high" | "critical" = "low";

  // Check rapid redemption
  if (await checkRapidRedemption(context.userId)) {
    alerts.push("rapid_redemption");
    severity = "high";
  }

  // Check multiple IPs
  if (await checkMultipleIPs(context.userId, context.ipAddress)) {
    alerts.push("multiple_ips");
    severity = "high";
  }

  // Check suspicious devices
  if (await checkSuspiciousDevices(context.userId)) {
    alerts.push("suspicious_devices");
    severity = "critical";
  }

  // Check high-value code abuse
  if (await checkHighValueCodeAbuse(context.code, context.userId)) {
    alerts.push("high_value_code_abuse");
    severity = "critical";
  }

  // Determine if should block
  const shouldBlock = severity === "critical" || alerts.length > 2;

  // Log fraud alert if detected
  if (alerts.length > 0) {
    await logFraudAlert({
      userId: context.userId,
      alertType: alerts.join(","),
      ipAddress: context.ipAddress,
      deviceId: context.deviceId,
      severity,
      description: `Fraud detected: ${alerts.join(", ")}`,
    });
  }

  return {
    isFraudulent: alerts.length > 0,
    severity,
    alerts,
    shouldBlock,
  };
}

/**
 * Log a fraud alert to database
 */
export async function logFraudAlert(alert: {
  userId: number;
  alertType: string;
  ipAddress?: string;
  deviceId?: string;
  severity: string;
  description?: string;
}): Promise<void> {
  try {
    await db.insert(fraudAlerts).values({
      userId: alert.userId,
      alertType: alert.alertType,
      ipAddress: alert.ipAddress,
      deviceId: alert.deviceId,
      severity: alert.severity as any,
      description: alert.description,
      resolved: false,
    });
  } catch (error) {
    console.error("Failed to log fraud alert:", error);
  }
}

/**
 * Log redemption attempt
 */
export async function logRedemptionAttempt(context: RedemptionContext & { success: boolean; failureReason?: string }): Promise<void> {
  try {
    await db.insert(redemptionHistory).values({
      userId: context.userId,
      code: context.code,
      ipAddress: context.ipAddress,
      deviceId: context.deviceId,
      userAgent: context.userAgent,
      success: context.success,
      failureReason: context.failureReason,
    });
  } catch (error) {
    console.error("Failed to log redemption attempt:", error);
  }
}

/**
 * Get fraud alerts for a user
 */
export async function getUserFraudAlerts(userId: number): Promise<any[]> {
  try {
    return await db
      .select()
      .from(fraudAlerts)
      .where(eq(fraudAlerts.userId, userId));
  } catch (error) {
    console.error("Failed to get fraud alerts:", error);
    return [];
  }
}

/**
 * Resolve a fraud alert
 */
export async function resolveFraudAlert(alertId: number, actionTaken: string): Promise<void> {
  try {
    await db
      .update(fraudAlerts)
      .set({ resolved: true, actionTaken })
      .where(eq(fraudAlerts.id, alertId));
  } catch (error) {
    console.error("Failed to resolve fraud alert:", error);
  }
}

/**
 * Get redemption history for a user
 */
export async function getUserRedemptionHistory(userId: number, limit: number = 50): Promise<any[]> {
  try {
    return await db
      .select()
      .from(redemptionHistory)
      .where(eq(redemptionHistory.userId, userId))
      .limit(limit);
  } catch (error) {
    console.error("Failed to get redemption history:", error);
    return [];
  }
}
