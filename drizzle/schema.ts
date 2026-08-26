import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "cancelled", "expired", "refunded"]);
const classroomRoleEnum = pgEnum("classroom_role", ["teacher", "learner"]);
const assignmentStatusEnum = pgEnum("assignment_status", ["draft", "published"]);
const submissionStatusEnum = pgEnum("submission_status", ["pending", "complete"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  appearanceSettings: text("appearanceSettings"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Referral codes table for tracking referral program
 */
export const referralCodes = pgTable("referral_codes", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  uses: integer("uses").default(0).notNull(),
  maxUses: integer("maxUses").default(999).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;

/**
 * Fraud detection tracking table
 */
export const fraudAlerts = pgTable("fraud_alerts", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }),
  alertType: varchar("alertType", { length: 50 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  deviceId: varchar("deviceId", { length: 255 }),
  severity: varchar("severity", { length: 20 }).default("medium").notNull(),
  description: text("description"),
  resolved: boolean("resolved").default(false).notNull(),
  actionTaken: varchar("actionTaken", { length: 100 }),
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
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
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
    attempts: integer("attempts").default(0).notNull(),
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
export const otpAudit = pgTable(
  "otp_audit",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
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
export const schedulerLocks = pgTable("scheduler_locks", {
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
export const aireFeedback = pgTable(
  "aire_feedback",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").references(() => users.id, { onDelete: "cascade" }),
    /** Difficulty tier: 1=trivial, 2=simple, 3=medium, 4=complex, 5=phd */
    difficulty: integer("difficulty").notNull(),
    /** Subject slug (e.g. "calculus", "algebra", "other") */
    subject: varchar("subject", { length: 64 }).notNull().default("other"),
    /** Number of steps in the response */
    steps: integer("steps").notNull().default(1),
    /** User rating: -1 = too short, 0 = just right, 1 = too long */
    rating: integer("rating").notNull(),
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
export const aireSubjectCalibration = pgTable(
  "aire_subject_calibration",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").references(() => users.id, { onDelete: "cascade" }),
    /** Subject slug matching aire_feedback.subject */
    subject: varchar("subject", { length: 64 }).notNull().default("other"),
    /** Computed multiplier: 0.7 | 1.0 | 1.3 */
    multiplier: varchar("multiplier", { length: 8 }).notNull().default("1.0"),
    /** Number of feedback samples used to compute this multiplier */
    sampleCount: integer("sampleCount").notNull().default(0),
    /** Timestamp of the last feedback submission for this subject — used for 30-day decay */
    lastFeedbackAt: timestamp("lastFeedbackAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
export const solveHistory = pgTable(
  "solve_history",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
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
export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
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
    messageCount: integer("messageCount").default(0).notNull(),
    /** Client-side timestamps. */
    sessionCreatedAt: timestamp("sessionCreatedAt").notNull(),
    sessionUpdatedAt: timestamp("sessionUpdatedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
export const userProgress = pgTable("user_progress", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  /** Full ProgressData JSON blob. */
  progressJson: text("progressJson").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserProgressRow = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;

/**
 * User bookmarks — saved solutions.
 * Mirrors the local "math_bookmarks" AsyncStorage key.
 */
export const userBookmarks = pgTable(
  "user_bookmarks",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
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
export const userNotes = pgTable(
  "user_notes",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Client-side note ID. */
    noteId: varchar("noteId", { length: 64 }).notNull(),
    /** Full note JSON blob. */
    noteJson: text("noteJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    /** FK to users.id — null if the RevenueCat user cannot be resolved to a local user. */
    userId: integer("userId").references(() => users.id, { onDelete: "set null" }),
    /** RevenueCat app user ID (the `app_user_id` field in webhook payloads). */
    revenueCatUserId: varchar("revenueCatUserId", { length: 255 }).notNull(),
    /** Product ID, e.g. "tutorsnap_monthly" or "tutorsnap_annual". */
    productId: varchar("productId", { length: 255 }).notNull(),
    /** Current subscription status. */
    status: subscriptionStatusEnum("status").notNull().default("active"),
    /**
     * True when the subscription is in a billing grace period.
     * Set to true on BILLING_ISSUE / GRACE_PERIOD_START; cleared to false on all other events.
     * Replaces the fragile expiresAt-in-past heuristic used previously.
     */
    isInGracePeriod: boolean("isInGracePeriod").notNull().default(false),
    /** Timestamp when the subscription expires (from RevenueCat expiration_at_ms). */
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [
    index("idx_subscriptions_userId").on(t.userId),
    index("idx_subscriptions_rcUserId").on(t.revenueCatUserId),
  ],
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Guided Classroom — private, asynchronous teacher/learner workspace
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A private classroom owned by exactly one creator/teacher.
 * `publicId` is the only classroom identifier exposed through the API.
 * `joinCode` is teacher-only data and may be rotated at any time.
 */
export const classrooms = pgTable(
  "classrooms",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    publicId: varchar("publicId", { length: 36 }).notNull().unique(),
    teacherId: integer("teacherId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    joinCode: varchar("joinCode", { length: 8 }).notNull().unique(),
    subject: varchar("subject", { length: 64 }).notNull(),
    gradeLevel: varchar("gradeLevel", { length: 32 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [
    index("classrooms_teacher_idx").on(t.teacherId),
    index("classrooms_active_updated_idx").on(t.isActive, t.updatedAt),
  ],
);

export type ClassroomRow = typeof classrooms.$inferSelect;
export type InsertClassroom = typeof classrooms.$inferInsert;

/**
 * Relationship-based classroom authorization. A user's classroom role exists
 * only in this table; it never changes the account-wide users.role value.
 */
export const classroomMembers = pgTable(
  "classroom_members",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    classroomId: integer("classroomId").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: classroomRoleEnum("role").notNull(),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("classroom_members_class_user_uq").on(t.classroomId, t.userId),
    index("classroom_members_user_joined_idx").on(t.userId, t.joinedAt),
    index("classroom_members_class_role_idx").on(t.classroomId, t.role),
  ],
);

export type ClassroomMemberRow = typeof classroomMembers.$inferSelect;
export type InsertClassroomMember = typeof classroomMembers.$inferInsert;

/** Text-only class work. Learners can resolve published assignments only. */
export const assignments = pgTable(
  "assignments",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    publicId: varchar("publicId", { length: 36 }).notNull().unique(),
    classroomId: integer("classroomId").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
    createdByUserId: integer("createdByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    instructions: text("instructions").notNull(),
    subject: varchar("subject", { length: 64 }).notNull(),
    dueAt: timestamp("dueAt"),
    status: assignmentStatusEnum("status").default("draft").notNull(),
    publishedAt: timestamp("publishedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [
    index("assignments_class_status_due_idx").on(t.classroomId, t.status, t.dueAt),
    index("assignments_class_updated_idx").on(t.classroomId, t.updatedAt),
  ],
);

export type AssignmentRow = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;

/** One current submission per learner and assignment. */
export const assignmentSubmissions = pgTable(
  "assignment_submissions",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    publicId: varchar("publicId", { length: 36 }).notNull().unique(),
    assignmentId: integer("assignmentId").notNull().references(() => assignments.id, { onDelete: "cascade" }),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: submissionStatusEnum("status").default("pending").notNull(),
    responseText: text("responseText"),
    submittedAt: timestamp("submittedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("assignment_submissions_assignment_user_uq").on(t.assignmentId, t.userId),
    index("assignment_submissions_status_idx").on(t.assignmentId, t.status),
    index("assignment_submissions_user_updated_idx").on(t.userId, t.updatedAt),
  ],
);

export type AssignmentSubmissionRow = typeof assignmentSubmissions.$inferSelect;
export type InsertAssignmentSubmission = typeof assignmentSubmissions.$inferInsert;

/**
 * Flat, class-visible assignment discussion. Deletion is a moderation tombstone;
 * the API never returns a deleted body to normal clients.
 */
export const assignmentComments = pgTable(
  "assignment_comments",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    publicId: varchar("publicId", { length: 36 }).notNull().unique(),
    assignmentId: integer("assignmentId").notNull().references(() => assignments.id, { onDelete: "cascade" }),
    authorUserId: integer("authorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    isDeleted: boolean("isDeleted").default(false).notNull(),
    deletedAt: timestamp("deletedAt"),
    deletedByUserId: integer("deletedByUserId").references(() => users.id, { onDelete: "set null" }),
    moderationReason: varchar("moderationReason", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [
    index("assignment_comments_assignment_created_idx").on(t.assignmentId, t.createdAt, t.id),
    index("assignment_comments_author_created_idx").on(t.authorUserId, t.createdAt),
  ],
);

export type AssignmentCommentRow = typeof assignmentComments.$inferSelect;
export type InsertAssignmentComment = typeof assignmentComments.$inferInsert;

/**
 * Durable, privacy-minimized audit source for join-code brute-force protection.
 * Only a SHA-256 code hash is stored; raw join codes never enter this table.
 */
export const classroomJoinAttempts = pgTable(
  "classroom_join_attempts",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    ipAddress: varchar("ipAddress", { length: 45 }),
    codeHash: varchar("codeHash", { length: 64 }).notNull(),
    outcome: varchar("outcome", { length: 32 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("classroom_join_user_created_idx").on(t.userId, t.createdAt),
    index("classroom_join_ip_created_idx").on(t.ipAddress, t.createdAt),
    index("classroom_join_hash_created_idx").on(t.codeHash, t.createdAt),
  ],
);

export type ClassroomJoinAttemptRow = typeof classroomJoinAttempts.$inferSelect;
export type InsertClassroomJoinAttempt = typeof classroomJoinAttempts.$inferInsert;
