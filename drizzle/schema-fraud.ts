import { mysqlTable, int, varchar, timestamp, boolean, text } from "drizzle-orm/mysql-core";
import { users } from "./schema";

/**
 * Fraud detection tracking table
 */
export const fraudAlerts = mysqlTable("fraud_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
  alertType: varchar("alertType", { length: 50 }).notNull(), // "rapid_redemption", "multiple_ips", "suspicious_pattern"
  ipAddress: varchar("ipAddress", { length: 45 }),
  deviceId: varchar("deviceId", { length: 255 }),
  severity: varchar("severity", { length: 20 }).default("medium").notNull(), // "low", "medium", "high", "critical"
  description: text("description"),
  resolved: boolean("resolved").default(false).notNull(),
  actionTaken: varchar("actionTaken", { length: 100 }), // "none", "warned", "suspended", "blocked"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Redemption history for tracking patterns
 */
export const redemptionHistory = mysqlTable("redemption_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
  codeId: int("codeId"),
  code: varchar("code", { length: 50 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  deviceId: varchar("deviceId", { length: 255 }),
  userAgent: text("userAgent"),
  success: boolean("success").default(true).notNull(),
  failureReason: varchar("failureReason", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type InsertFraudAlert = typeof fraudAlerts.$inferInsert;
export type RedemptionRecord = typeof redemptionHistory.$inferSelect;
export type InsertRedemptionRecord = typeof redemptionHistory.$inferInsert;
