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
    userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
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

/**
 * Per-user, per-subject AIRE calibration cache.
 * Stores the computed token-budget multiplier so the server does not
 * re-aggregate on every solve request.
 * multiplier: 0.7 = user finds responses too long, 1.3 = too short, 1.0 = calibrated.
 */
export const aireSubjectCalibration = mysqlTable(
  "aire_subject_calibration",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
    /** Subject slug matching aire_feedback.subject */
    subject: varchar("subject", { length: 64 }).notNull().default("other"),
    /** Computed multiplier: 0.7 | 1.0 | 1.3 */
    multiplier: varchar("multiplier", { length: 8 }).notNull().default("1.0"),
    /** Number of feedback samples used to compute this multiplier */
    sampleCount: int("sampleCount").notNull().default(0),
    /** Timestamp of the last feedback submission for this subject — used for 30-day decay */
    lastFeedbackAt: timestamp("lastFeedbackAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("aire_calib_userId_subject_idx").on(t.userId, t.subject),
  ],
);

export type AireSubjectCalibration = typeof aireSubjectCalibration.$inferSelect;
export type InsertAireSubjectCalibration = typeof aireSubjectCalibration.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Cloud-sync tables — all user data that must survive reinstall / new builds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Solve history — every problem the user has solved.
 * Mirrors the local "math_history" AsyncStorage key.
 * Synced to the server on every solve; pulled on sign-in.
 */
export const solveHistory = mysqlTable(
  "solve_history",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** The problem text (may be a question or image description). */
    problem: text("problem").notNull(),
    /** The AI-generated answer (short form). */
    answer: text("answer"),
    /** Subject slug (e.g. "algebra", "calculus"). */
    subject: varchar("subject", { length: 64 }),
    /** Full solution JSON blob (steps, hints, etc.) — stored as TEXT. */
    solutionJson: text("solutionJson"),
    /** Whether the user bookmarked this solve. */
    bookmarked: boolean("bookmarked").default(false).notNull(),
    /** Client-side timestamp of when the solve happened. */
    solvedAt: timestamp("solvedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [index("solve_history_userId_idx").on(t.userId, t.solvedAt)],
);

export type SolveHistoryRow = typeof solveHistory.$inferSelect;
export type InsertSolveHistory = typeof solveHistory.$inferInsert;

/**
 * Chat sessions — full AI tutor conversation history.
 * Mirrors the local "@tutorsnap/chatSessions/*" AsyncStorage keys.
 * Each row is one session; messages stored as JSON blob.
 */
export const chatSessions = mysqlTable(
  "chat_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Client-generated session ID (e.g. "session_1234_abc"). */
    sessionId: varchar("sessionId", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }),
    subject: varchar("subject", { length: 64 }),
    gradeLevel: varchar("gradeLevel", { length: 32 }),
    /** Full messages JSON array. */
    messagesJson: text("messagesJson").notNull(),
    /** Comma-separated tag strings. */
    tags: text("tags"),
    pinned: boolean("pinned").default(false).notNull(),
    messageCount: int("messageCount").default(0).notNull(),
    /** Client-side timestamps. */
    sessionCreatedAt: timestamp("sessionCreatedAt").notNull(),
    sessionUpdatedAt: timestamp("sessionUpdatedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("chat_sessions_userId_idx").on(t.userId),
    index("chat_sessions_sessionId_idx").on(t.userId, t.sessionId),
  ],
);

export type ChatSessionRow = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

/**
 * User progress — streak, subject counts, weekly activity.
 * Mirrors the local "math_progress" AsyncStorage key.
 * One row per user; upserted on every solve.
 */
export const userProgress = mysqlTable("user_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  /** Full ProgressData JSON blob. */
  progressJson: text("progressJson").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProgressRow = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;

/**
 * User bookmarks — saved solutions.
 * Mirrors the local "math_bookmarks" AsyncStorage key.
 */
export const userBookmarks = mysqlTable(
  "user_bookmarks",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Client-side bookmark ID (timestamp string). */
    bookmarkId: varchar("bookmarkId", { length: 64 }).notNull(),
    /** Full HistoryItem JSON blob. */
    itemJson: text("itemJson").notNull(),
    /** Subject slug for server-side filtering. */
    subject: varchar("subject", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("user_bookmarks_userId_idx").on(t.userId),
    index("user_bookmarks_bookmarkId_idx").on(t.userId, t.bookmarkId),
  ],
);

export type UserBookmarkRow = typeof userBookmarks.$inferSelect;
export type InsertUserBookmark = typeof userBookmarks.$inferInsert;

/**
 * User notes — saved notes from the Notes screen.
 * Mirrors the local "tutor_saved_notes" AsyncStorage key.
 */
export const userNotes = mysqlTable(
  "user_notes",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Client-side note ID. */
    noteId: varchar("noteId", { length: 64 }).notNull(),
    /** Full note JSON blob. */
    noteJson: text("noteJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("user_notes_userId_idx").on(t.userId),
    index("user_notes_noteId_idx").on(t.userId, t.noteId),
  ],
);

export type UserNoteRow = typeof userNotes.$inferSelect;
export type InsertUserNote = typeof userNotes.$inferInsert;

/**
 * RevenueCat subscriptions — server-side record of each user's subscription state.
 * Populated and updated by the RevenueCat webhook (POST /api/webhooks/revenuecat).
 *
 * One row per (userId, productId) pair; upserted on every relevant webhook event.
 * The `status` field reflects the most recent event:
 *   - "active"    → INITIAL_PURCHASE or RENEWAL
 *   - "cancelled" → CANCELLATION (still active until expiresAt)
 *   - "expired"   → EXPIRATION
 *   - "refunded"  → REFUND
 *
 * Indexes:
 *   - idx_subscriptions_userId: look up all subscriptions for a user
 *   - idx_subscriptions_rcUserId: look up by RevenueCat app user ID
 */
export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    /** FK to users.id — null if the RevenueCat user cannot be resolved to a local user. */
    userId: int("userId").references(() => users.id, { onDelete: "set null" }),
    /** RevenueCat app user ID (the `app_user_id` field in webhook payloads). */
    revenueCatUserId: varchar("revenueCatUserId", { length: 255 }).notNull(),
    /** Product ID, e.g. "tutorsnap_monthly" or "tutorsnap_annual". */
    productId: varchar("productId", { length: 255 }).notNull(),
    /** Current subscription status. */
    status: mysqlEnum("status", ["active", "cancelled", "expired", "refunded"]).notNull().default("active"),
    /** Timestamp when the subscription expires (from RevenueCat expiration_at_ms). */
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("idx_subscriptions_userId").on(t.userId),
    index("idx_subscriptions_rcUserId").on(t.revenueCatUserId),
  ],
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
