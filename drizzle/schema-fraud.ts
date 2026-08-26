import { boolean, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./schema";

/**
 * Fraud detection tracking table
 */
export const fraudAlerts = pgTable("fraud_alerts", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }),
  alertType: varchar("alertType", { length: 50 }).notNull(), // "rapid_redemption", "multiple_ips", "suspicious_pattern"
  ipAddress: varchar("ipAddress", { length: 45 }),
  deviceId: varchar("deviceId", { length: 255 }),
  severity: varchar("severity", { length: 20 }).default("medium").notNull(), // "low", "medium", "high", "critical"
  description: text("description"),
  resolved: boolean("resolved").default(false).notNull(),
  actionTaken: varchar("actionTaken", { length: 100 }), // "none", "warned", "suspended", "blocked"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Redemption history for tracking patterns
 */
export const redemptionHistory = pgTable("redemption_history", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }),
  codeId: integer("codeId"),
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
