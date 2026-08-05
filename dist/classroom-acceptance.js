"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/_core/classroom-acceptance.ts
var import_node_crypto = require("node:crypto");
var import_client = require("@trpc/client");
var import_promise = require("mysql2/promise");
var import_superjson = __toESM(require("superjson"));

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
var import_axios = __toESM(require("axios"));
var import_cookie = require("cookie");
var import_jose = require("jose");

// server/db.ts
var import_drizzle_orm = require("drizzle-orm");
var import_mysql2 = require("drizzle-orm/mysql2");

// drizzle/schema.ts
var import_mysql_core = require("drizzle-orm/mysql-core");
var users = (0, import_mysql_core.mysqlTable)("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: (0, import_mysql_core.varchar)("openId", { length: 64 }).notNull().unique(),
  name: (0, import_mysql_core.text)("name"),
  email: (0, import_mysql_core.varchar)("email", { length: 320 }),
  loginMethod: (0, import_mysql_core.varchar)("loginMethod", { length: 64 }),
  role: (0, import_mysql_core.mysqlEnum)("role", ["user", "admin"]).default("user").notNull(),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: (0, import_mysql_core.timestamp)("lastSignedIn").defaultNow().notNull(),
  appearanceSettings: (0, import_mysql_core.text)("appearanceSettings")
});
var referralCodes = (0, import_mysql_core.mysqlTable)("referral_codes", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  code: (0, import_mysql_core.varchar)("code", { length: 50 }).notNull().unique(),
  userId: (0, import_mysql_core.int)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  uses: (0, import_mysql_core.int)("uses").default(0).notNull(),
  maxUses: (0, import_mysql_core.int)("maxUses").default(999).notNull(),
  expiresAt: (0, import_mysql_core.timestamp)("expiresAt").notNull(),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var fraudAlerts = (0, import_mysql_core.mysqlTable)("fraud_alerts", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  userId: (0, import_mysql_core.int)("userId").references(() => users.id, { onDelete: "cascade" }),
  alertType: (0, import_mysql_core.varchar)("alertType", { length: 50 }).notNull(),
  ipAddress: (0, import_mysql_core.varchar)("ipAddress", { length: 45 }),
  deviceId: (0, import_mysql_core.varchar)("deviceId", { length: 255 }),
  severity: (0, import_mysql_core.varchar)("severity", { length: 20 }).default("medium").notNull(),
  description: (0, import_mysql_core.text)("description"),
  resolved: (0, import_mysql_core.boolean)("resolved").default(false).notNull(),
  actionTaken: (0, import_mysql_core.varchar)("actionTaken", { length: 100 }),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var redemptionHistory = (0, import_mysql_core.mysqlTable)("redemption_history", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  userId: (0, import_mysql_core.int)("userId").references(() => users.id, { onDelete: "cascade" }),
  codeId: (0, import_mysql_core.int)("codeId"),
  code: (0, import_mysql_core.varchar)("code", { length: 50 }).notNull(),
  ipAddress: (0, import_mysql_core.varchar)("ipAddress", { length: 45 }),
  deviceId: (0, import_mysql_core.varchar)("deviceId", { length: 255 }),
  userAgent: (0, import_mysql_core.text)("userAgent"),
  success: (0, import_mysql_core.boolean)("success").default(true).notNull(),
  failureReason: (0, import_mysql_core.varchar)("failureReason", { length: 100 }),
  createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull()
});
var otpCodes = (0, import_mysql_core.mysqlTable)(
  "otp_codes",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    /** The email address the code was issued for. */
    email: (0, import_mysql_core.varchar)("email", { length: 320 }).notNull(),
    /**
     * HMAC-SHA-256 of the 6-digit code, keyed with OTP_PEPPER.
     * Never store the raw code.
     */
    hashedCode: (0, import_mysql_core.varchar)("hashedCode", { length: 64 }).notNull(),
    /**
     * Purpose binding: "signin" or "change_email".
     * A code issued for one purpose cannot be used for another.
     */
    purpose: (0, import_mysql_core.varchar)("purpose", { length: 20 }).notNull().default("signin"),
    /** Timestamp after which the code is invalid (10 minutes from issue). */
    expiresAt: (0, import_mysql_core.timestamp)("expiresAt").notNull(),
    /** Number of failed verification attempts. Locked out at 5. */
    attempts: (0, import_mysql_core.int)("attempts").default(0).notNull(),
    /** IP address of the requester (trusted-proxy extracted). */
    ipAddress: (0, import_mysql_core.varchar)("ipAddress", { length: 45 }),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull()
  },
  (t) => ({
    idxEmailPurpose: (0, import_mysql_core.index)("idx_otp_email_purpose").on(t.email, t.purpose, t.createdAt),
    idxExpires: (0, import_mysql_core.index)("idx_otp_expires").on(t.expiresAt)
  })
);
var otpAudit = (0, import_mysql_core.mysqlTable)(
  "otp_audit",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    /** Email the OTP was issued for. */
    email: (0, import_mysql_core.varchar)("email", { length: 320 }).notNull(),
    /** Purpose: "signin" or "change_email". */
    purpose: (0, import_mysql_core.varchar)("purpose", { length: 20 }).notNull().default("signin"),
    /** Trusted-proxy extracted IP address of the requester. */
    ipAddress: (0, import_mysql_core.varchar)("ipAddress", { length: 45 }),
    /** Outcome: "sent" | "rate_limited_email" | "rate_limited_ip" | "cooldown" | "error" */
    outcome: (0, import_mysql_core.varchar)("outcome", { length: 30 }).notNull().default("sent"),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull()
  },
  (t) => ({
    idxAuditEmailCreated: (0, import_mysql_core.index)("idx_audit_email_created").on(t.email, t.createdAt),
    idxAuditIpCreated: (0, import_mysql_core.index)("idx_audit_ip_created").on(t.ipAddress, t.createdAt)
  })
);
var schedulerLocks = (0, import_mysql_core.mysqlTable)("scheduler_locks", {
  /** Unique job name (e.g., "otp-cleanup"). */
  jobName: (0, import_mysql_core.varchar)("jobName", { length: 100 }).notNull().primaryKey(),
  /** Instance identifier (hostname + PID). */
  instanceId: (0, import_mysql_core.varchar)("instanceId", { length: 200 }).notNull(),
  /** Lock expiry — stale locks older than this are ignored. */
  expiresAt: (0, import_mysql_core.timestamp)("expiresAt").notNull(),
  acquiredAt: (0, import_mysql_core.timestamp)("acquiredAt").defaultNow().notNull()
});
var aireFeedback = (0, import_mysql_core.mysqlTable)(
  "aire_feedback",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    userId: (0, import_mysql_core.int)("userId").references(() => users.id, { onDelete: "cascade" }),
    /** Difficulty tier: 1=trivial, 2=simple, 3=medium, 4=complex, 5=phd */
    difficulty: (0, import_mysql_core.int)("difficulty").notNull(),
    /** Subject slug (e.g. "calculus", "algebra", "other") */
    subject: (0, import_mysql_core.varchar)("subject", { length: 64 }).notNull().default("other"),
    /** Number of steps in the response */
    steps: (0, import_mysql_core.int)("steps").notNull().default(1),
    /** User rating: -1 = too short, 0 = just right, 1 = too long */
    rating: (0, import_mysql_core.int)("rating").notNull(),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull()
  },
  (t) => [(0, import_mysql_core.index)("aire_feedback_userId_idx").on(t.userId)]
);
var aireSubjectCalibration = (0, import_mysql_core.mysqlTable)(
  "aire_subject_calibration",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    userId: (0, import_mysql_core.int)("userId").references(() => users.id, { onDelete: "cascade" }),
    /** Subject slug matching aire_feedback.subject */
    subject: (0, import_mysql_core.varchar)("subject", { length: 64 }).notNull().default("other"),
    /** Computed multiplier: 0.7 | 1.0 | 1.3 */
    multiplier: (0, import_mysql_core.varchar)("multiplier", { length: 8 }).notNull().default("1.0"),
    /** Number of feedback samples used to compute this multiplier */
    sampleCount: (0, import_mysql_core.int)("sampleCount").notNull().default(0),
    /** Timestamp of the last feedback submission for this subject — used for 30-day decay */
    lastFeedbackAt: (0, import_mysql_core.timestamp)("lastFeedbackAt").defaultNow().notNull(),
    updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (t) => [
    (0, import_mysql_core.index)("aire_calib_userId_subject_idx").on(t.userId, t.subject)
  ]
);
var solveHistory = (0, import_mysql_core.mysqlTable)(
  "solve_history",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    userId: (0, import_mysql_core.int)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** The problem text (may be a question or image description). */
    problem: (0, import_mysql_core.text)("problem").notNull(),
    /** The AI-generated answer (short form). */
    answer: (0, import_mysql_core.text)("answer"),
    /** Subject slug (e.g. "algebra", "calculus"). */
    subject: (0, import_mysql_core.varchar)("subject", { length: 64 }),
    /** Full solution JSON blob (steps, hints, etc.) — stored as TEXT. */
    solutionJson: (0, import_mysql_core.text)("solutionJson"),
    /** Whether the user bookmarked this solve. */
    bookmarked: (0, import_mysql_core.boolean)("bookmarked").default(false).notNull(),
    /** Client-side timestamp of when the solve happened. */
    solvedAt: (0, import_mysql_core.timestamp)("solvedAt").notNull(),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull()
  },
  (t) => [(0, import_mysql_core.index)("solve_history_userId_idx").on(t.userId, t.solvedAt)]
);
var chatSessions = (0, import_mysql_core.mysqlTable)(
  "chat_sessions",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    userId: (0, import_mysql_core.int)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Client-generated session ID (e.g. "session_1234_abc"). */
    sessionId: (0, import_mysql_core.varchar)("sessionId", { length: 64 }).notNull(),
    title: (0, import_mysql_core.varchar)("title", { length: 255 }),
    subject: (0, import_mysql_core.varchar)("subject", { length: 64 }),
    gradeLevel: (0, import_mysql_core.varchar)("gradeLevel", { length: 32 }),
    /** Full messages JSON array. */
    messagesJson: (0, import_mysql_core.text)("messagesJson").notNull(),
    /** Comma-separated tag strings. */
    tags: (0, import_mysql_core.text)("tags"),
    pinned: (0, import_mysql_core.boolean)("pinned").default(false).notNull(),
    messageCount: (0, import_mysql_core.int)("messageCount").default(0).notNull(),
    /** Client-side timestamps. */
    sessionCreatedAt: (0, import_mysql_core.timestamp)("sessionCreatedAt").notNull(),
    sessionUpdatedAt: (0, import_mysql_core.timestamp)("sessionUpdatedAt").notNull(),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (t) => [
    (0, import_mysql_core.index)("chat_sessions_userId_idx").on(t.userId),
    (0, import_mysql_core.index)("chat_sessions_sessionId_idx").on(t.userId, t.sessionId)
  ]
);
var userProgress = (0, import_mysql_core.mysqlTable)("user_progress", {
  id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
  userId: (0, import_mysql_core.int)("userId").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  /** Full ProgressData JSON blob. */
  progressJson: (0, import_mysql_core.text)("progressJson").notNull(),
  updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
});
var userBookmarks = (0, import_mysql_core.mysqlTable)(
  "user_bookmarks",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    userId: (0, import_mysql_core.int)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Client-side bookmark ID (timestamp string). */
    bookmarkId: (0, import_mysql_core.varchar)("bookmarkId", { length: 64 }).notNull(),
    /** Full HistoryItem JSON blob. */
    itemJson: (0, import_mysql_core.text)("itemJson").notNull(),
    /** Subject slug for server-side filtering. */
    subject: (0, import_mysql_core.varchar)("subject", { length: 64 }),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull()
  },
  (t) => [
    (0, import_mysql_core.index)("user_bookmarks_userId_idx").on(t.userId),
    (0, import_mysql_core.index)("user_bookmarks_bookmarkId_idx").on(t.userId, t.bookmarkId)
  ]
);
var userNotes = (0, import_mysql_core.mysqlTable)(
  "user_notes",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    userId: (0, import_mysql_core.int)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Client-side note ID. */
    noteId: (0, import_mysql_core.varchar)("noteId", { length: 64 }).notNull(),
    /** Full note JSON blob. */
    noteJson: (0, import_mysql_core.text)("noteJson").notNull(),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (t) => [
    (0, import_mysql_core.index)("user_notes_userId_idx").on(t.userId),
    (0, import_mysql_core.index)("user_notes_noteId_idx").on(t.userId, t.noteId)
  ]
);
var subscriptions = (0, import_mysql_core.mysqlTable)(
  "subscriptions",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    /** FK to users.id — null if the RevenueCat user cannot be resolved to a local user. */
    userId: (0, import_mysql_core.int)("userId").references(() => users.id, { onDelete: "set null" }),
    /** RevenueCat app user ID (the `app_user_id` field in webhook payloads). */
    revenueCatUserId: (0, import_mysql_core.varchar)("revenueCatUserId", { length: 255 }).notNull(),
    /** Product ID, e.g. "tutorsnap_monthly" or "tutorsnap_annual". */
    productId: (0, import_mysql_core.varchar)("productId", { length: 255 }).notNull(),
    /** Current subscription status. */
    status: (0, import_mysql_core.mysqlEnum)("status", ["active", "cancelled", "expired", "refunded"]).notNull().default("active"),
    /**
     * True when the subscription is in a billing grace period.
     * Set to true on BILLING_ISSUE / GRACE_PERIOD_START; cleared to false on all other events.
     * Replaces the fragile expiresAt-in-past heuristic used previously.
     */
    isInGracePeriod: (0, import_mysql_core.boolean)("isInGracePeriod").notNull().default(false),
    /** Timestamp when the subscription expires (from RevenueCat expiration_at_ms). */
    expiresAt: (0, import_mysql_core.timestamp)("expiresAt"),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (t) => [
    (0, import_mysql_core.index)("idx_subscriptions_userId").on(t.userId),
    (0, import_mysql_core.index)("idx_subscriptions_rcUserId").on(t.revenueCatUserId)
  ]
);
var classrooms = (0, import_mysql_core.mysqlTable)(
  "classrooms",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    publicId: (0, import_mysql_core.varchar)("publicId", { length: 36 }).notNull().unique(),
    teacherId: (0, import_mysql_core.int)("teacherId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: (0, import_mysql_core.varchar)("name", { length: 120 }).notNull(),
    joinCode: (0, import_mysql_core.varchar)("joinCode", { length: 8 }).notNull().unique(),
    subject: (0, import_mysql_core.varchar)("subject", { length: 64 }).notNull(),
    gradeLevel: (0, import_mysql_core.varchar)("gradeLevel", { length: 32 }),
    isActive: (0, import_mysql_core.boolean)("isActive").default(true).notNull(),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (t) => [
    (0, import_mysql_core.index)("classrooms_teacher_idx").on(t.teacherId),
    (0, import_mysql_core.index)("classrooms_active_updated_idx").on(t.isActive, t.updatedAt)
  ]
);
var classroomMembers = (0, import_mysql_core.mysqlTable)(
  "classroom_members",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    classroomId: (0, import_mysql_core.int)("classroomId").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
    userId: (0, import_mysql_core.int)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: (0, import_mysql_core.mysqlEnum)("role", ["teacher", "learner"]).notNull(),
    joinedAt: (0, import_mysql_core.timestamp)("joinedAt").defaultNow().notNull()
  },
  (t) => [
    (0, import_mysql_core.uniqueIndex)("classroom_members_class_user_uq").on(t.classroomId, t.userId),
    (0, import_mysql_core.index)("classroom_members_user_joined_idx").on(t.userId, t.joinedAt),
    (0, import_mysql_core.index)("classroom_members_class_role_idx").on(t.classroomId, t.role)
  ]
);
var assignments = (0, import_mysql_core.mysqlTable)(
  "assignments",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    publicId: (0, import_mysql_core.varchar)("publicId", { length: 36 }).notNull().unique(),
    classroomId: (0, import_mysql_core.int)("classroomId").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
    createdByUserId: (0, import_mysql_core.int)("createdByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: (0, import_mysql_core.varchar)("title", { length: 160 }).notNull(),
    instructions: (0, import_mysql_core.text)("instructions").notNull(),
    subject: (0, import_mysql_core.varchar)("subject", { length: 64 }).notNull(),
    dueAt: (0, import_mysql_core.timestamp)("dueAt"),
    status: (0, import_mysql_core.mysqlEnum)("status", ["draft", "published"]).default("draft").notNull(),
    publishedAt: (0, import_mysql_core.timestamp)("publishedAt"),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (t) => [
    (0, import_mysql_core.index)("assignments_class_status_due_idx").on(t.classroomId, t.status, t.dueAt),
    (0, import_mysql_core.index)("assignments_class_updated_idx").on(t.classroomId, t.updatedAt)
  ]
);
var assignmentSubmissions = (0, import_mysql_core.mysqlTable)(
  "assignment_submissions",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    publicId: (0, import_mysql_core.varchar)("publicId", { length: 36 }).notNull().unique(),
    assignmentId: (0, import_mysql_core.int)("assignmentId").notNull().references(() => assignments.id, { onDelete: "cascade" }),
    userId: (0, import_mysql_core.int)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: (0, import_mysql_core.mysqlEnum)("status", ["pending", "complete"]).default("pending").notNull(),
    responseText: (0, import_mysql_core.text)("responseText"),
    submittedAt: (0, import_mysql_core.timestamp)("submittedAt"),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (t) => [
    (0, import_mysql_core.uniqueIndex)("assignment_submissions_assignment_user_uq").on(t.assignmentId, t.userId),
    (0, import_mysql_core.index)("assignment_submissions_status_idx").on(t.assignmentId, t.status),
    (0, import_mysql_core.index)("assignment_submissions_user_updated_idx").on(t.userId, t.updatedAt)
  ]
);
var assignmentComments = (0, import_mysql_core.mysqlTable)(
  "assignment_comments",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    publicId: (0, import_mysql_core.varchar)("publicId", { length: 36 }).notNull().unique(),
    assignmentId: (0, import_mysql_core.int)("assignmentId").notNull().references(() => assignments.id, { onDelete: "cascade" }),
    authorUserId: (0, import_mysql_core.int)("authorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: (0, import_mysql_core.text)("body").notNull(),
    isDeleted: (0, import_mysql_core.boolean)("isDeleted").default(false).notNull(),
    deletedAt: (0, import_mysql_core.timestamp)("deletedAt"),
    deletedByUserId: (0, import_mysql_core.int)("deletedByUserId").references(() => users.id, { onDelete: "set null" }),
    moderationReason: (0, import_mysql_core.varchar)("moderationReason", { length: 64 }),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, import_mysql_core.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (t) => [
    (0, import_mysql_core.index)("assignment_comments_assignment_created_idx").on(t.assignmentId, t.createdAt, t.id),
    (0, import_mysql_core.index)("assignment_comments_author_created_idx").on(t.authorUserId, t.createdAt)
  ]
);
var classroomJoinAttempts = (0, import_mysql_core.mysqlTable)(
  "classroom_join_attempts",
  {
    id: (0, import_mysql_core.int)("id").autoincrement().primaryKey(),
    userId: (0, import_mysql_core.int)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    ipAddress: (0, import_mysql_core.varchar)("ipAddress", { length: 45 }),
    codeHash: (0, import_mysql_core.varchar)("codeHash", { length: 64 }).notNull(),
    outcome: (0, import_mysql_core.varchar)("outcome", { length: 32 }).notNull(),
    createdAt: (0, import_mysql_core.timestamp)("createdAt").defaultNow().notNull()
  },
  (t) => [
    (0, import_mysql_core.index)("classroom_join_user_created_idx").on(t.userId, t.createdAt),
    (0, import_mysql_core.index)("classroom_join_ip_created_idx").on(t.ipAddress, t.createdAt),
    (0, import_mysql_core.index)("classroom_join_hash_created_idx").on(t.codeHash, t.createdAt)
  ]
);

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = (0, import_mysql2.drizzle)(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/_core/sdk.ts
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(EXCHANGE_TOKEN_PATH, payload);
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(GET_USER_INFO_PATH, {
      accessToken: token.accessToken
    });
    return data;
  }
};
var createOAuthHttpClient = () => import_axios.default.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(platforms.filter((p) => typeof p === "string"));
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = (0, import_cookie.parse)(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new import_jose.SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await (0, import_jose.jwtVerify)(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = token || cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/classroom-acceptance.ts
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function makeClient(apiBaseUrl, token) {
  return (0, import_client.createTRPCClient)({
    links: [
      (0, import_client.httpBatchLink)({
        url: `${apiBaseUrl}/api/trpc`,
        transformer: import_superjson.default,
        headers: () => ({ Authorization: `Bearer ${token}` })
      })
    ]
  });
}
async function expectCode(operation, expectedCode, label) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof import_client.TRPCClientError && typeof error.data === "object" && error.data && "code" in error.data && error.data.code === expectedCode) {
      return;
    }
    throw new Error(
      `${label}: expected ${expectedCode}, received ${String(error)}`
    );
  }
  throw new Error(
    `${label}: expected ${expectedCode}, but the operation succeeded`
  );
}
async function seedIdentity(pool, identity) {
  await pool.execute(
    `INSERT INTO users (openId, name, email, loginMethod, role, lastSignedIn)
     VALUES (?, ?, ?, 'email', 'user', CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       email = VALUES(email),
       loginMethod = 'email',
       role = 'user',
       lastSignedIn = CURRENT_TIMESTAMP`,
    [identity.openId, identity.name, identity.email]
  );
}
async function removeIdentities(pool, identities) {
  const placeholders = identities.map(() => "?").join(", ");
  await pool.execute(
    `DELETE FROM users WHERE openId IN (${placeholders})`,
    identities.map((identity) => identity.openId)
  );
}
async function main() {
  const target = process.env.CLASSROOM_ACCEPTANCE_TARGET;
  assert(
    target === "staging",
    "Refusing to run outside an explicit staging target"
  );
  assert(
    process.env.CLASSROOM_MVP_ENABLED === "true",
    "CLASSROOM_MVP_ENABLED must be true in staging before acceptance"
  );
  const databaseUrl = process.env.DATABASE_URL;
  assert(
    databaseUrl,
    "DATABASE_URL is required for isolated staging test identities"
  );
  const apiBaseUrl = process.env.CLASSROOM_ACCEPTANCE_API_BASE_URL || `http://127.0.0.1:${process.env.PORT || "3000"}`;
  assert(
    apiBaseUrl.includes("127.0.0.1") || apiBaseUrl.includes("api-staging"),
    "Acceptance API target must be the local staging service or staging hostname"
  );
  const started = Date.now();
  const runId = `${started.toString(36)}-${(0, import_node_crypto.randomBytes)(4).toString("hex")}`;
  const className = `E2E Guided Classroom ${runId}`;
  const identities = [
    {
      openId: `classroom-e2e-${runId}-teacher`,
      name: "E2E Teacher",
      email: `teacher-${runId}@staging.tutorsnap.test`
    },
    {
      openId: `classroom-e2e-${runId}-learner-a`,
      name: "E2E Learner A",
      email: `learner-a-${runId}@staging.tutorsnap.test`
    },
    {
      openId: `classroom-e2e-${runId}-learner-b`,
      name: "E2E Learner B",
      email: `learner-b-${runId}@staging.tutorsnap.test`
    },
    {
      openId: `classroom-e2e-${runId}-outsider`,
      name: "E2E Outsider",
      email: `outsider-${runId}@staging.tutorsnap.test`
    }
  ];
  const evidence = {
    target,
    apiBaseUrl,
    runId,
    startedAt: new Date(started).toISOString(),
    checks: {}
  };
  const pool = (0, import_promise.createPool)({ uri: databaseUrl, connectionLimit: 2 });
  let teacher = null;
  let classroomId = null;
  try {
    await removeIdentities(pool, identities);
    await Promise.all(
      identities.map((identity) => seedIdentity(pool, identity))
    );
    const tokens = await Promise.all(
      identities.map(
        (identity) => sdk.createSessionToken(identity.openId, {
          name: identity.name,
          expiresInMs: 60 * 60 * 1e3
        })
      )
    );
    const [teacherClient, learnerA, learnerB, outsider] = tokens.map(
      (token) => makeClient(apiBaseUrl, token)
    );
    teacher = teacherClient;
    const statuses = await Promise.all([
      teacher.classroom.status.query(),
      learnerA.classroom.status.query(),
      learnerB.classroom.status.query()
    ]);
    assert(
      statuses.every((status) => status.enabled),
      "Classroom flag is not enabled for every session"
    );
    evidence.checks.concurrentAuthenticatedSessions = 3;
    const classroom = await teacher.classroom.create.mutate({
      name: className,
      subject: "algebra",
      gradeLevel: "Grade 8"
    });
    classroomId = classroom.id;
    assert(
      classroom.role === "teacher",
      "Creator did not receive the teacher role"
    );
    assert(
      classroom.joinCode,
      "Teacher projection did not include a join code"
    );
    const [teacherDuringJoin, joinedA, joinedB] = await Promise.all([
      teacher.classroom.get.query({ classroomId }),
      learnerA.classroom.join.mutate({ code: classroom.joinCode }),
      learnerB.classroom.join.mutate({ code: classroom.joinCode })
    ]);
    assert(
      teacherDuringJoin.role === "teacher",
      "Teacher session lost its class role"
    );
    assert(
      joinedA.role === "learner" && joinedB.role === "learner",
      "Concurrent learner joins failed"
    );
    evidence.checks.concurrentTeacherAndLearnerJoinFlow = true;
    const memberList = await teacher.classroom.listMembers.query({
      classroomId,
      limit: 25
    });
    assert(
      memberList.items.filter((member) => member.role === "learner").length === 2,
      "Teacher did not see both learners"
    );
    await Promise.all([
      expectCode(
        () => learnerA.classroom.listMembers.query({
          classroomId: classroom.id,
          limit: 25
        }),
        "FORBIDDEN",
        "learner roster access"
      ),
      expectCode(
        () => outsider.classroom.get.query({ classroomId: classroom.id }),
        "NOT_FOUND",
        "outsider class access"
      )
    ]);
    evidence.checks.relationshipAuthorization = true;
    const assignment = await teacher.classroom.assignment.create.mutate({
      classroomId,
      title: `Concurrent equations ${runId}`,
      instructions: "Solve 3x + 5 = 20 and explain each inverse operation.",
      subject: "algebra",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1e3)
    });
    await Promise.all([
      expectCode(
        () => learnerA.classroom.assignment.get.query({
          assignmentId: assignment.id
        }),
        "NOT_FOUND",
        "learner draft access"
      ),
      expectCode(
        () => outsider.classroom.assignment.get.query({
          assignmentId: assignment.id
        }),
        "NOT_FOUND",
        "outsider assignment access"
      )
    ]);
    await teacher.classroom.assignment.publish.mutate({
      assignmentId: assignment.id
    });
    const [learnerAssignmentA, learnerAssignmentB] = await Promise.all([
      learnerA.classroom.assignment.get.query({ assignmentId: assignment.id }),
      learnerB.classroom.assignment.get.query({ assignmentId: assignment.id })
    ]);
    assert(
      learnerAssignmentA.role === "learner" && learnerAssignmentB.role === "learner",
      "Published assignment was not visible to both learners"
    );
    evidence.checks.draftHiddenThenPublished = true;
    const [submissionA, submissionB, teacherConcurrentView] = await Promise.all(
      [
        learnerA.classroom.submission.upsert.mutate({
          assignmentId: assignment.id,
          status: "complete",
          responseText: "Subtract 5, divide by 3, so x = 5."
        }),
        learnerB.classroom.submission.upsert.mutate({
          assignmentId: assignment.id,
          status: "complete",
          responseText: "3x = 15, therefore x = 5."
        }),
        teacher.classroom.assignment.get.query({ assignmentId: assignment.id })
      ]
    );
    assert(
      submissionA.status === "complete" && submissionB.status === "complete",
      "Concurrent submissions did not complete"
    );
    assert(
      teacherConcurrentView.role === "teacher",
      "Teacher could not view the assignment during submissions"
    );
    const teacherSubmissions = await teacher.classroom.submission.listForAssignment.query({
      assignmentId: assignment.id,
      limit: 25
    });
    assert(
      teacherSubmissions.items.filter((item) => item.status === "complete").length === 2,
      "Teacher did not receive both completed submissions"
    );
    evidence.checks.concurrentSubmissions = 2;
    const [commentA, commentB, teacherComment] = await Promise.all([
      learnerA.classroom.comment.add.mutate({
        assignmentId: assignment.id,
        body: "I used inverse operations in two steps."
      }),
      learnerB.classroom.comment.add.mutate({
        assignmentId: assignment.id,
        body: "Remember to check the solution by substitution."
      }),
      teacher.classroom.comment.add.mutate({
        assignmentId: assignment.id,
        body: "Good explanations. Keep the reasoning visible."
      })
    ]);
    assert(
      commentA.body && commentB.body && teacherComment.body,
      "Concurrent discussion posts failed"
    );
    await Promise.all([
      expectCode(
        () => learnerA.classroom.comment.delete.mutate({ commentId: commentB.id }),
        "FORBIDDEN",
        "cross-learner comment deletion"
      ),
      expectCode(
        () => learnerA.classroom.comment.moderate.mutate({
          commentId: commentB.id,
          reason: "spam"
        }),
        "FORBIDDEN",
        "learner moderation"
      ),
      expectCode(
        () => learnerB.classroom.progress.getClassSummary.query({
          classroomId: classroom.id
        }),
        "FORBIDDEN",
        "learner aggregate progress"
      )
    ]);
    await Promise.all([
      teacher.classroom.comment.moderate.mutate({
        commentId: commentB.id,
        reason: "inappropriate"
      }),
      learnerA.classroom.comment.delete.mutate({ commentId: commentA.id })
    ]);
    const discussion = await learnerB.classroom.comment.list.query({
      assignmentId: assignment.id,
      limit: 25
    });
    assert(
      discussion.items.filter((comment) => comment.isDeleted).length === 2,
      "Deleted and moderated comments did not render as tombstones"
    );
    evidence.checks.moderatedDiscussion = true;
    evidence.checks.crossStudentMutationDenied = true;
    const [teacherProgress, learnerAProgress, learnerBProgress] = await Promise.all([
      teacher.classroom.progress.getClassSummary.query({ classroomId }),
      learnerA.classroom.progress.getMine.query({ classroomId }),
      learnerB.classroom.progress.getMine.query({ classroomId })
    ]);
    assert(
      teacherProgress.learnerCount === 2 && teacherProgress.completedSubmissions === 2 && teacherProgress.completionPercent === 100,
      "Teacher aggregate progress is incorrect"
    );
    assert(
      learnerAProgress.completed === 1 && learnerBProgress.completed === 1,
      "Learner-private progress is incorrect"
    );
    evidence.checks.teacherAggregateCompletionPercent = teacherProgress.completionPercent;
    evidence.checks.eachLearnerPrivateCompleted = 1;
    await teacher.classroom.archive.mutate({ classroomId });
    await Promise.all([
      expectCode(
        () => learnerA.classroom.submission.upsert.mutate({
          assignmentId: assignment.id,
          status: "pending",
          responseText: "Attempt after archive"
        }),
        "PRECONDITION_FAILED",
        "archived learner submission"
      ),
      expectCode(
        () => learnerB.classroom.comment.add.mutate({
          assignmentId: assignment.id,
          body: "Attempt after archive"
        }),
        "PRECONDITION_FAILED",
        "archived learner comment"
      )
    ]);
    await teacher.classroom.restore.mutate({ classroomId });
    evidence.checks.archiveReadOnlyAndRestore = true;
    await teacher.classroom.delete.mutate({
      classroomId,
      confirmationName: className
    });
    classroomId = null;
    evidence.checks.teacherConfirmedDeletion = true;
    evidence.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    evidence.elapsedMs = Date.now() - started;
    console.log(JSON.stringify({ ok: true, evidence }, null, 2));
  } finally {
    if (classroomId && teacher) {
      try {
        await teacher.classroom.delete.mutate({
          classroomId,
          confirmationName: className
        });
      } catch {
      }
    }
    await removeIdentities(pool, identities);
    await pool.end();
  }
}
main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
