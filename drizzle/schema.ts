import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index } from "drizzle-orm/mysql-core";

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
 * Stores only the HMAC-SHA-256 hash of the code (never the raw code).
 * Rows are consumed (deleted) on first valid verification.
 *
 * Rate limits are tracked in otp_audit (separate table) so deleting a
 * consumed/expired code does NOT reset the rate-limit counters.
 *
 * Indexes:
 *   - idx_otp_email_purpose: supports cooldown check and prior-code invalidation
 *   - idx_otp_expires: supports scheduled cleanup
 */
export const otpCodes = mysqlTable(
  "otp_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    /** The email address the code was issued for. */
    email: varchar("email", { length: 320 }).notNull(),
    /**
     * HMAC-SHA-256 of the 6-digit code, keyed with OTP_PEPPER.
     * Never store the raw code.
     */
    hashedCode: varchar("hashedCode", { length: 64 }).notNull(),
    /**
     * Purpose binding: "signin" or "change_email".
     * A code issued for one purpose cannot be used for another.
     */
    purpose: varchar("purpose", { length: 20 }).notNull().default("signin"),
    /** Timestamp after which the code is invalid (10 minutes from issue). */
    expiresAt: timestamp("expiresAt").notNull(),
    /** Number of failed verification attempts. Locked out at 5. */
    attempts: int("attempts").default(0).notNull(),
    /** IP address of the requester (trusted-proxy extracted). */
    ipAddress: varchar("ipAddress", { length: 45 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    idxEmailPurpose: index("idx_otp_email_purpose").on(t.email, t.purpose, t.createdAt),
    idxExpires: index("idx_otp_expires").on(t.expiresAt),
  })
);

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;

/**
 * OTP audit log — durable record of every OTP send request.
 *
 * This table is NEVER deleted from during normal operation. It is the
 * authoritative source for rate-limit enforcement:
 *   - Per-email: max 5 sends per 10-minute window
 *   - Per-IP: max 10 sends per 10-minute window
 *
 * Rows older than 24 hours are pruned by the scheduled cleanup job.
 * Deleting consumed/expired rows from otp_codes does NOT affect rate limits.
 *
 * Indexes:
 *   - idx_audit_email_created: per-email rate-limit query (O(log n))
 *   - idx_audit_ip_created: per-IP rate-limit query (O(log n))
 */
export const otpAudit = mysqlTable(
  "otp_audit",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Email the OTP was issued for. */
    email: varchar("email", { length: 320 }).notNull(),
    /** Purpose: "signin" or "change_email". */
    purpose: varchar("purpose", { length: 20 }).notNull().default("signin"),
    /** Trusted-proxy extracted IP address of the requester. */
    ipAddress: varchar("ipAddress", { length: 45 }),
    /** Outcome: "sent" | "rate_limited_email" | "rate_limited_ip" | "cooldown" | "error" */
    outcome: varchar("outcome", { length: 30 }).notNull().default("sent"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    idxAuditEmailCreated: index("idx_audit_email_created").on(t.email, t.createdAt),
    idxAuditIpCreated: index("idx_audit_ip_created").on(t.ipAddress, t.createdAt),
  })
);

export type OtpAuditEntry = typeof otpAudit.$inferSelect;
export type InsertOtpAuditEntry = typeof otpAudit.$inferInsert;

/**
 * Scheduler lock table — prevents duplicate cron workers across server instances.
 * A worker acquires the lock by inserting a row; it releases it on completion.
 * Rows older than the lock TTL are considered stale and can be overwritten.
 */
export const schedulerLocks = mysqlTable("scheduler_locks", {
  /** Unique job name (e.g., "otp-cleanup"). */
  jobName: varchar("jobName", { length: 100 }).notNull().primaryKey(),
  /** Instance identifier (hostname + PID). */
  instanceId: varchar("instanceId", { length: 200 }).notNull(),
  /** Lock expiry — stale locks older than this are ignored. */
  expiresAt: timestamp("expiresAt").notNull(),
  acquiredAt: timestamp("acquiredAt").defaultNow().notNull(),
});

export type SchedulerLock = typeof schedulerLocks.$inferSelect;

/**
 * AIRE per-user feedback memory.
 * Stores the last 10 response-length ratings per user.
 * Used server-side to adjust classifier token budgets for that user.
 */
export const aireFeedback = mysqlTable(
  "aire_feedback",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Difficulty tier: 1=trivial, 2=simple, 3=medium, 4=complex, 5=phd */
    difficulty: int("difficulty").notNull(),
    /** Subject slug (e.g. "calculus", "algebra", "other") */
    subject: varchar("subject", { length: 64 }).notNull().default("other"),
    /** Number of steps in the response */
    steps: int("steps").notNull().default(1),
    /** User rating: -1 = too short, 0 = just right, 1 = too long */
    rating: int("rating").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("aire_feedback_userId_idx").on(t.userId)],
);

export type AireFeedback = typeof aireFeedback.$inferSelect;
export type InsertAireFeedback = typeof aireFeedback.$inferInsert;
