import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  appearanceSettings: text("appearanceSettings"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Referral codes table for tracking referral program
 */
export const referralCodes = mysqlTable("referral_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  uses: int("uses").default(0).notNull(),
  maxUses: int("maxUses").default(999).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;

/**
 * Fraud detection tracking table
 */
export const fraudAlerts = mysqlTable("fraud_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
  alertType: varchar("alertType", { length: 50 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  deviceId: varchar("deviceId", { length: 255 }),
  severity: varchar("severity", { length: 20 }).default("medium").notNull(),
  description: text("description"),
  resolved: boolean("resolved").default(false).notNull(),
  actionTaken: varchar("actionTaken", { length: 100 }),
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

/**
 * OTP codes table for email sign-in and change-email verification.
 * Replaces the in-memory Map so codes survive server restarts.
 * Rows are automatically cleaned up after verification or expiry.
 */
export const otpCodes = mysqlTable("otp_codes", {
  id: int("id").autoincrement().primaryKey(),
  /** The email address the code was issued for. */
  email: varchar("email", { length: 320 }).notNull(),
  /** SHA-256 hash of the 6-digit code. Never store the raw code. */
  hashedCode: varchar("hashedCode", { length: 64 }).notNull(),
  /** Unix timestamp (ms) after which the code is invalid. */
  expiresAt: timestamp("expiresAt").notNull(),
  /** Number of failed verification attempts. */
  attempts: int("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;
