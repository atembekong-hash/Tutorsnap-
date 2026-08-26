"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc3) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc3 = __getOwnPropDesc(from, key)) || desc3.enumerable });
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// shared/const.ts
var COOKIE_NAME, ONE_YEAR_MS, AXIOS_TIMEOUT_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG;
var init_const = __esm({
  "shared/const.ts"() {
    "use strict";
    COOKIE_NAME = "app_session_id";
    ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
    AXIOS_TIMEOUT_MS = 3e4;
    UNAUTHED_ERR_MSG = "Please login (10001)";
    NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
  }
});

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aireFeedback: () => aireFeedback,
  aireSubjectCalibration: () => aireSubjectCalibration,
  assignmentComments: () => assignmentComments,
  assignmentSubmissions: () => assignmentSubmissions,
  assignments: () => assignments,
  chatSessions: () => chatSessions,
  classroomJoinAttempts: () => classroomJoinAttempts,
  classroomMembers: () => classroomMembers,
  classrooms: () => classrooms,
  fraudAlerts: () => fraudAlerts,
  otpAudit: () => otpAudit,
  otpCodes: () => otpCodes,
  redemptionHistory: () => redemptionHistory,
  referralCodes: () => referralCodes,
  schedulerLocks: () => schedulerLocks,
  solveHistory: () => solveHistory,
  subscriptions: () => subscriptions,
  userBookmarks: () => userBookmarks,
  userNotes: () => userNotes,
  userProgress: () => userProgress,
  users: () => users
});
var import_pg_core, userRoleEnum, subscriptionStatusEnum, classroomRoleEnum, assignmentStatusEnum, submissionStatusEnum, users, referralCodes, fraudAlerts, redemptionHistory, otpCodes, otpAudit, schedulerLocks, aireFeedback, aireSubjectCalibration, solveHistory, chatSessions, userProgress, userBookmarks, userNotes, subscriptions, classrooms, classroomMembers, assignments, assignmentSubmissions, assignmentComments, classroomJoinAttempts;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    import_pg_core = require("drizzle-orm/pg-core");
    userRoleEnum = (0, import_pg_core.pgEnum)("user_role", ["user", "admin"]);
    subscriptionStatusEnum = (0, import_pg_core.pgEnum)("subscription_status", ["active", "cancelled", "expired", "refunded"]);
    classroomRoleEnum = (0, import_pg_core.pgEnum)("classroom_role", ["teacher", "learner"]);
    assignmentStatusEnum = (0, import_pg_core.pgEnum)("assignment_status", ["draft", "published"]);
    submissionStatusEnum = (0, import_pg_core.pgEnum)("submission_status", ["pending", "complete"]);
    users = (0, import_pg_core.pgTable)("users", {
      /**
       * Surrogate primary key. Auto-incremented numeric value managed by the database.
       * Use this for relations between tables.
       */
      id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
      /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
      openId: (0, import_pg_core.varchar)("openId", { length: 64 }).notNull().unique(),
      name: (0, import_pg_core.text)("name"),
      email: (0, import_pg_core.varchar)("email", { length: 320 }),
      loginMethod: (0, import_pg_core.varchar)("loginMethod", { length: 64 }),
      role: userRoleEnum("role").default("user").notNull(),
      createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
      updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull(),
      lastSignedIn: (0, import_pg_core.timestamp)("lastSignedIn").defaultNow().notNull(),
      appearanceSettings: (0, import_pg_core.text)("appearanceSettings")
    });
    referralCodes = (0, import_pg_core.pgTable)("referral_codes", {
      id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
      code: (0, import_pg_core.varchar)("code", { length: 50 }).notNull().unique(),
      userId: (0, import_pg_core.integer)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
      uses: (0, import_pg_core.integer)("uses").default(0).notNull(),
      maxUses: (0, import_pg_core.integer)("maxUses").default(999).notNull(),
      expiresAt: (0, import_pg_core.timestamp)("expiresAt").notNull(),
      createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
      updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
    });
    fraudAlerts = (0, import_pg_core.pgTable)("fraud_alerts", {
      id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
      userId: (0, import_pg_core.integer)("userId").references(() => users.id, { onDelete: "cascade" }),
      alertType: (0, import_pg_core.varchar)("alertType", { length: 50 }).notNull(),
      ipAddress: (0, import_pg_core.varchar)("ipAddress", { length: 45 }),
      deviceId: (0, import_pg_core.varchar)("deviceId", { length: 255 }),
      severity: (0, import_pg_core.varchar)("severity", { length: 20 }).default("medium").notNull(),
      description: (0, import_pg_core.text)("description"),
      resolved: (0, import_pg_core.boolean)("resolved").default(false).notNull(),
      actionTaken: (0, import_pg_core.varchar)("actionTaken", { length: 100 }),
      createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
      updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
    });
    redemptionHistory = (0, import_pg_core.pgTable)("redemption_history", {
      id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
      userId: (0, import_pg_core.integer)("userId").references(() => users.id, { onDelete: "cascade" }),
      codeId: (0, import_pg_core.integer)("codeId"),
      code: (0, import_pg_core.varchar)("code", { length: 50 }).notNull(),
      ipAddress: (0, import_pg_core.varchar)("ipAddress", { length: 45 }),
      deviceId: (0, import_pg_core.varchar)("deviceId", { length: 255 }),
      userAgent: (0, import_pg_core.text)("userAgent"),
      success: (0, import_pg_core.boolean)("success").default(true).notNull(),
      failureReason: (0, import_pg_core.varchar)("failureReason", { length: 100 }),
      createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull()
    });
    otpCodes = (0, import_pg_core.pgTable)(
      "otp_codes",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        /** The email address the code was issued for. */
        email: (0, import_pg_core.varchar)("email", { length: 320 }).notNull(),
        /**
         * HMAC-SHA-256 of the 6-digit code, keyed with OTP_PEPPER.
         * Never store the raw code.
         */
        hashedCode: (0, import_pg_core.varchar)("hashedCode", { length: 64 }).notNull(),
        /**
         * Purpose binding: "signin" or "change_email".
         * A code issued for one purpose cannot be used for another.
         */
        purpose: (0, import_pg_core.varchar)("purpose", { length: 20 }).notNull().default("signin"),
        /** Timestamp after which the code is invalid (10 minutes from issue). */
        expiresAt: (0, import_pg_core.timestamp)("expiresAt").notNull(),
        /** Number of failed verification attempts. Locked out at 5. */
        attempts: (0, import_pg_core.integer)("attempts").default(0).notNull(),
        /** IP address of the requester (trusted-proxy extracted). */
        ipAddress: (0, import_pg_core.varchar)("ipAddress", { length: 45 }),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull()
      },
      (t2) => ({
        idxEmailPurpose: (0, import_pg_core.index)("idx_otp_email_purpose").on(t2.email, t2.purpose, t2.createdAt),
        idxExpires: (0, import_pg_core.index)("idx_otp_expires").on(t2.expiresAt)
      })
    );
    otpAudit = (0, import_pg_core.pgTable)(
      "otp_audit",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        /** Email the OTP was issued for. */
        email: (0, import_pg_core.varchar)("email", { length: 320 }).notNull(),
        /** Purpose: "signin" or "change_email". */
        purpose: (0, import_pg_core.varchar)("purpose", { length: 20 }).notNull().default("signin"),
        /** Trusted-proxy extracted IP address of the requester. */
        ipAddress: (0, import_pg_core.varchar)("ipAddress", { length: 45 }),
        /** Outcome: "sent" | "rate_limited_email" | "rate_limited_ip" | "cooldown" | "error" */
        outcome: (0, import_pg_core.varchar)("outcome", { length: 30 }).notNull().default("sent"),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull()
      },
      (t2) => ({
        idxAuditEmailCreated: (0, import_pg_core.index)("idx_audit_email_created").on(t2.email, t2.createdAt),
        idxAuditIpCreated: (0, import_pg_core.index)("idx_audit_ip_created").on(t2.ipAddress, t2.createdAt)
      })
    );
    schedulerLocks = (0, import_pg_core.pgTable)("scheduler_locks", {
      /** Unique job name (e.g., "otp-cleanup"). */
      jobName: (0, import_pg_core.varchar)("jobName", { length: 100 }).notNull().primaryKey(),
      /** Instance identifier (hostname + PID). */
      instanceId: (0, import_pg_core.varchar)("instanceId", { length: 200 }).notNull(),
      /** Lock expiry — stale locks older than this are ignored. */
      expiresAt: (0, import_pg_core.timestamp)("expiresAt").notNull(),
      acquiredAt: (0, import_pg_core.timestamp)("acquiredAt").defaultNow().notNull()
    });
    aireFeedback = (0, import_pg_core.pgTable)(
      "aire_feedback",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        userId: (0, import_pg_core.integer)("userId").references(() => users.id, { onDelete: "cascade" }),
        /** Difficulty tier: 1=trivial, 2=simple, 3=medium, 4=complex, 5=phd */
        difficulty: (0, import_pg_core.integer)("difficulty").notNull(),
        /** Subject slug (e.g. "calculus", "algebra", "other") */
        subject: (0, import_pg_core.varchar)("subject", { length: 64 }).notNull().default("other"),
        /** Number of steps in the response */
        steps: (0, import_pg_core.integer)("steps").notNull().default(1),
        /** User rating: -1 = too short, 0 = just right, 1 = too long */
        rating: (0, import_pg_core.integer)("rating").notNull(),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull()
      },
      (t2) => [(0, import_pg_core.index)("aire_feedback_userId_idx").on(t2.userId)]
    );
    aireSubjectCalibration = (0, import_pg_core.pgTable)(
      "aire_subject_calibration",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        userId: (0, import_pg_core.integer)("userId").references(() => users.id, { onDelete: "cascade" }),
        /** Subject slug matching aire_feedback.subject */
        subject: (0, import_pg_core.varchar)("subject", { length: 64 }).notNull().default("other"),
        /** Computed multiplier: 0.7 | 1.0 | 1.3 */
        multiplier: (0, import_pg_core.varchar)("multiplier", { length: 8 }).notNull().default("1.0"),
        /** Number of feedback samples used to compute this multiplier */
        sampleCount: (0, import_pg_core.integer)("sampleCount").notNull().default(0),
        /** Timestamp of the last feedback submission for this subject — used for 30-day decay */
        lastFeedbackAt: (0, import_pg_core.timestamp)("lastFeedbackAt").defaultNow().notNull(),
        updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
      },
      (t2) => [
        (0, import_pg_core.index)("aire_calib_userId_subject_idx").on(t2.userId, t2.subject)
      ]
    );
    solveHistory = (0, import_pg_core.pgTable)(
      "solve_history",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        userId: (0, import_pg_core.integer)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
        /** The problem text (may be a question or image description). */
        problem: (0, import_pg_core.text)("problem").notNull(),
        /** The AI-generated answer (short form). */
        answer: (0, import_pg_core.text)("answer"),
        /** Subject slug (e.g. "algebra", "calculus"). */
        subject: (0, import_pg_core.varchar)("subject", { length: 64 }),
        /** Full solution JSON blob (steps, hints, etc.) — stored as TEXT. */
        solutionJson: (0, import_pg_core.text)("solutionJson"),
        /** Whether the user bookmarked this solve. */
        bookmarked: (0, import_pg_core.boolean)("bookmarked").default(false).notNull(),
        /** Client-side timestamp of when the solve happened. */
        solvedAt: (0, import_pg_core.timestamp)("solvedAt").notNull(),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull()
      },
      (t2) => [(0, import_pg_core.index)("solve_history_userId_idx").on(t2.userId, t2.solvedAt)]
    );
    chatSessions = (0, import_pg_core.pgTable)(
      "chat_sessions",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        userId: (0, import_pg_core.integer)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
        /** Client-generated session ID (e.g. "session_1234_abc"). */
        sessionId: (0, import_pg_core.varchar)("sessionId", { length: 64 }).notNull(),
        title: (0, import_pg_core.varchar)("title", { length: 255 }),
        subject: (0, import_pg_core.varchar)("subject", { length: 64 }),
        gradeLevel: (0, import_pg_core.varchar)("gradeLevel", { length: 32 }),
        /** Full messages JSON array. */
        messagesJson: (0, import_pg_core.text)("messagesJson").notNull(),
        /** Comma-separated tag strings. */
        tags: (0, import_pg_core.text)("tags"),
        pinned: (0, import_pg_core.boolean)("pinned").default(false).notNull(),
        messageCount: (0, import_pg_core.integer)("messageCount").default(0).notNull(),
        /** Client-side timestamps. */
        sessionCreatedAt: (0, import_pg_core.timestamp)("sessionCreatedAt").notNull(),
        sessionUpdatedAt: (0, import_pg_core.timestamp)("sessionUpdatedAt").notNull(),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
        updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
      },
      (t2) => [
        (0, import_pg_core.index)("chat_sessions_userId_idx").on(t2.userId),
        (0, import_pg_core.index)("chat_sessions_sessionId_idx").on(t2.userId, t2.sessionId)
      ]
    );
    userProgress = (0, import_pg_core.pgTable)("user_progress", {
      id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
      userId: (0, import_pg_core.integer)("userId").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
      /** Full ProgressData JSON blob. */
      progressJson: (0, import_pg_core.text)("progressJson").notNull(),
      updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
    });
    userBookmarks = (0, import_pg_core.pgTable)(
      "user_bookmarks",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        userId: (0, import_pg_core.integer)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
        /** Client-side bookmark ID (timestamp string). */
        bookmarkId: (0, import_pg_core.varchar)("bookmarkId", { length: 64 }).notNull(),
        /** Full HistoryItem JSON blob. */
        itemJson: (0, import_pg_core.text)("itemJson").notNull(),
        /** Subject slug for server-side filtering. */
        subject: (0, import_pg_core.varchar)("subject", { length: 64 }),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull()
      },
      (t2) => [
        (0, import_pg_core.index)("user_bookmarks_userId_idx").on(t2.userId),
        (0, import_pg_core.index)("user_bookmarks_bookmarkId_idx").on(t2.userId, t2.bookmarkId)
      ]
    );
    userNotes = (0, import_pg_core.pgTable)(
      "user_notes",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        userId: (0, import_pg_core.integer)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
        /** Client-side note ID. */
        noteId: (0, import_pg_core.varchar)("noteId", { length: 64 }).notNull(),
        /** Full note JSON blob. */
        noteJson: (0, import_pg_core.text)("noteJson").notNull(),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
        updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
      },
      (t2) => [
        (0, import_pg_core.index)("user_notes_userId_idx").on(t2.userId),
        (0, import_pg_core.index)("user_notes_noteId_idx").on(t2.userId, t2.noteId)
      ]
    );
    subscriptions = (0, import_pg_core.pgTable)(
      "subscriptions",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        /** FK to users.id — null if the RevenueCat user cannot be resolved to a local user. */
        userId: (0, import_pg_core.integer)("userId").references(() => users.id, { onDelete: "set null" }),
        /** RevenueCat app user ID (the `app_user_id` field in webhook payloads). */
        revenueCatUserId: (0, import_pg_core.varchar)("revenueCatUserId", { length: 255 }).notNull(),
        /** Product ID, e.g. "tutorsnap_monthly" or "tutorsnap_annual". */
        productId: (0, import_pg_core.varchar)("productId", { length: 255 }).notNull(),
        /** Current subscription status. */
        status: subscriptionStatusEnum("status").notNull().default("active"),
        /**
         * True when the subscription is in a billing grace period.
         * Set to true on BILLING_ISSUE / GRACE_PERIOD_START; cleared to false on all other events.
         * Replaces the fragile expiresAt-in-past heuristic used previously.
         */
        isInGracePeriod: (0, import_pg_core.boolean)("isInGracePeriod").notNull().default(false),
        /** Timestamp when the subscription expires (from RevenueCat expiration_at_ms). */
        expiresAt: (0, import_pg_core.timestamp)("expiresAt"),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
        updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
      },
      (t2) => [
        (0, import_pg_core.index)("idx_subscriptions_userId").on(t2.userId),
        (0, import_pg_core.index)("idx_subscriptions_rcUserId").on(t2.revenueCatUserId)
      ]
    );
    classrooms = (0, import_pg_core.pgTable)(
      "classrooms",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        publicId: (0, import_pg_core.varchar)("publicId", { length: 36 }).notNull().unique(),
        teacherId: (0, import_pg_core.integer)("teacherId").notNull().references(() => users.id, { onDelete: "cascade" }),
        name: (0, import_pg_core.varchar)("name", { length: 120 }).notNull(),
        joinCode: (0, import_pg_core.varchar)("joinCode", { length: 8 }).notNull().unique(),
        subject: (0, import_pg_core.varchar)("subject", { length: 64 }).notNull(),
        gradeLevel: (0, import_pg_core.varchar)("gradeLevel", { length: 32 }),
        isActive: (0, import_pg_core.boolean)("isActive").default(true).notNull(),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
        updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
      },
      (t2) => [
        (0, import_pg_core.index)("classrooms_teacher_idx").on(t2.teacherId),
        (0, import_pg_core.index)("classrooms_active_updated_idx").on(t2.isActive, t2.updatedAt)
      ]
    );
    classroomMembers = (0, import_pg_core.pgTable)(
      "classroom_members",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        classroomId: (0, import_pg_core.integer)("classroomId").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
        userId: (0, import_pg_core.integer)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
        role: classroomRoleEnum("role").notNull(),
        joinedAt: (0, import_pg_core.timestamp)("joinedAt").defaultNow().notNull()
      },
      (t2) => [
        (0, import_pg_core.uniqueIndex)("classroom_members_class_user_uq").on(t2.classroomId, t2.userId),
        (0, import_pg_core.index)("classroom_members_user_joined_idx").on(t2.userId, t2.joinedAt),
        (0, import_pg_core.index)("classroom_members_class_role_idx").on(t2.classroomId, t2.role)
      ]
    );
    assignments = (0, import_pg_core.pgTable)(
      "assignments",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        publicId: (0, import_pg_core.varchar)("publicId", { length: 36 }).notNull().unique(),
        classroomId: (0, import_pg_core.integer)("classroomId").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
        createdByUserId: (0, import_pg_core.integer)("createdByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
        title: (0, import_pg_core.varchar)("title", { length: 160 }).notNull(),
        instructions: (0, import_pg_core.text)("instructions").notNull(),
        subject: (0, import_pg_core.varchar)("subject", { length: 64 }).notNull(),
        dueAt: (0, import_pg_core.timestamp)("dueAt"),
        status: assignmentStatusEnum("status").default("draft").notNull(),
        publishedAt: (0, import_pg_core.timestamp)("publishedAt"),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
        updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
      },
      (t2) => [
        (0, import_pg_core.index)("assignments_class_status_due_idx").on(t2.classroomId, t2.status, t2.dueAt),
        (0, import_pg_core.index)("assignments_class_updated_idx").on(t2.classroomId, t2.updatedAt)
      ]
    );
    assignmentSubmissions = (0, import_pg_core.pgTable)(
      "assignment_submissions",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        publicId: (0, import_pg_core.varchar)("publicId", { length: 36 }).notNull().unique(),
        assignmentId: (0, import_pg_core.integer)("assignmentId").notNull().references(() => assignments.id, { onDelete: "cascade" }),
        userId: (0, import_pg_core.integer)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
        status: submissionStatusEnum("status").default("pending").notNull(),
        responseText: (0, import_pg_core.text)("responseText"),
        submittedAt: (0, import_pg_core.timestamp)("submittedAt"),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
        updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
      },
      (t2) => [
        (0, import_pg_core.uniqueIndex)("assignment_submissions_assignment_user_uq").on(t2.assignmentId, t2.userId),
        (0, import_pg_core.index)("assignment_submissions_status_idx").on(t2.assignmentId, t2.status),
        (0, import_pg_core.index)("assignment_submissions_user_updated_idx").on(t2.userId, t2.updatedAt)
      ]
    );
    assignmentComments = (0, import_pg_core.pgTable)(
      "assignment_comments",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        publicId: (0, import_pg_core.varchar)("publicId", { length: 36 }).notNull().unique(),
        assignmentId: (0, import_pg_core.integer)("assignmentId").notNull().references(() => assignments.id, { onDelete: "cascade" }),
        authorUserId: (0, import_pg_core.integer)("authorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
        body: (0, import_pg_core.text)("body").notNull(),
        isDeleted: (0, import_pg_core.boolean)("isDeleted").default(false).notNull(),
        deletedAt: (0, import_pg_core.timestamp)("deletedAt"),
        deletedByUserId: (0, import_pg_core.integer)("deletedByUserId").references(() => users.id, { onDelete: "set null" }),
        moderationReason: (0, import_pg_core.varchar)("moderationReason", { length: 64 }),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull(),
        updatedAt: (0, import_pg_core.timestamp)("updatedAt").defaultNow().notNull()
      },
      (t2) => [
        (0, import_pg_core.index)("assignment_comments_assignment_created_idx").on(t2.assignmentId, t2.createdAt, t2.id),
        (0, import_pg_core.index)("assignment_comments_author_created_idx").on(t2.authorUserId, t2.createdAt)
      ]
    );
    classroomJoinAttempts = (0, import_pg_core.pgTable)(
      "classroom_join_attempts",
      {
        id: (0, import_pg_core.integer)("id").generatedAlwaysAsIdentity().primaryKey(),
        userId: (0, import_pg_core.integer)("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
        ipAddress: (0, import_pg_core.varchar)("ipAddress", { length: 45 }),
        codeHash: (0, import_pg_core.varchar)("codeHash", { length: 64 }).notNull(),
        outcome: (0, import_pg_core.varchar)("outcome", { length: 32 }).notNull(),
        createdAt: (0, import_pg_core.timestamp)("createdAt").defaultNow().notNull()
      },
      (t2) => [
        (0, import_pg_core.index)("classroom_join_user_created_idx").on(t2.userId, t2.createdAt),
        (0, import_pg_core.index)("classroom_join_ip_created_idx").on(t2.ipAddress, t2.createdAt),
        (0, import_pg_core.index)("classroom_join_hash_created_idx").on(t2.codeHash, t2.createdAt)
      ]
    );
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  closeDb: () => closeDb,
  db: () => db,
  getAppearanceSettings: () => getAppearanceSettings,
  getDb: () => getDb,
  getUserByOpenId: () => getUserByOpenId,
  saveAppearanceSettings: () => saveAppearanceSettings,
  upsertUser: () => upsertUser
});
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new import_pg.Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.DATABASE_POOL_MAX ?? 10),
        idleTimeoutMillis: 3e4,
        connectionTimeoutMillis: 15e3,
        ssl: process.env.DATABASE_SSL === "false" ? void 0 : { rejectUnauthorized: false }
      });
      _db = (0, import_node_postgres.drizzle)(_pool);
    } catch (error) {
      console.warn("[Database] Failed to initialize PostgreSQL:", error);
      _pool = null;
      _db = null;
    }
  }
  return _db;
}
async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db2 = await getDb();
  if (!db2) {
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
    await db2.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db2 = await getDb();
  if (!db2) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db2.select().from(users).where((0, import_drizzle_orm.eq)(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAppearanceSettings(userId) {
  const db2 = await getDb();
  if (!db2) return null;
  const result = await db2.select({ appearanceSettings: users.appearanceSettings }).from(users).where((0, import_drizzle_orm.eq)(users.id, userId)).limit(1);
  return result.length > 0 ? result[0].appearanceSettings ?? null : null;
}
async function saveAppearanceSettings(userId, settings) {
  const db2 = await getDb();
  if (!db2) return;
  await db2.update(users).set({ appearanceSettings: settings }).where((0, import_drizzle_orm.eq)(users.id, userId));
}
var import_drizzle_orm, import_node_postgres, import_pg, _pool, _db, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    import_drizzle_orm = require("drizzle-orm");
    import_node_postgres = require("drizzle-orm/node-postgres");
    import_pg = require("pg");
    init_schema();
    init_env();
    _pool = null;
    _db = null;
    db = {
      insert: async (table) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        return database.insert(table);
      },
      select: async () => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        return database.select();
      },
      update: async (table) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        return database.update(table);
      },
      delete: async (table) => {
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        return database.delete(table);
      }
    };
  }
});

// shared/_core/errors.ts
var HttpError, ForbiddenError;
var init_errors = __esm({
  "shared/_core/errors.ts"() {
    "use strict";
    HttpError = class extends Error {
      constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "HttpError";
      }
    };
    ForbiddenError = (msg) => new HttpError(403, msg);
  }
});

// server/_core/sdk.ts
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
var import_axios, import_cookie, import_jose, isNonEmptyString, EXCHANGE_TOKEN_PATH, GET_USER_INFO_PATH, GET_USER_INFO_WITH_JWT_PATH, OAuthService, createOAuthHttpClient, SDKServer, CRON_OPEN_ID_PREFIX, sdk;
var init_sdk = __esm({
  "server/_core/sdk.ts"() {
    "use strict";
    init_const();
    init_errors();
    import_axios = __toESM(require("axios"));
    import_cookie = require("cookie");
    import_jose = require("jose");
    init_db();
    init_env();
    isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
    EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
    GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
    GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
    OAuthService = class {
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
    createOAuthHttpClient = () => import_axios.default.create({
      baseURL: ENV.oAuthServerUrl,
      timeout: AXIOS_TIMEOUT_MS
    });
    SDKServer = class {
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
    CRON_OPEN_ID_PREFIX = "cron_";
    sdk = new SDKServer();
  }
});

// server/_core/chatStream.ts
var chatStream_exports = {};
__export(chatStream_exports, {
  classifyQuestion: () => classifyQuestion,
  computeTokenBudget: () => computeTokenBudget,
  detectUserOverride: () => detectUserOverride,
  registerChatStreamRoute: () => registerChatStreamRoute
});
function detectUserOverride(message) {
  const lower = message.toLowerCase();
  const shortPatterns = [
    /\bshort\s+answer\b/,
    /\bjust\s+the\s+formula\b/,
    /\bjust\s+the\s+answer\b/,
    /\bbriefly\b/,
    /\bin\s+one\s+line\b/,
    /\bquick\s+answer\b/,
    /\bquickly\b/,
    /\btldr\b/,
    /\btl;dr\b/,
    /\bsummarise\b/,
    /\bsummarize\b/,
    /\bshort\b.*\bonly\b/,
    /\bdon'?t\s+explain\b/,
    /\bno\s+explanation\b/,
    /\bjust\s+tell\s+me\b/,
    /\bkeep\s+it\s+short\b/,
    /\bkeep\s+it\s+brief\b/,
    /\bone\s+word\b/
  ];
  const fullPatterns = [
    /\bstep[\s-]by[\s-]step\b/,
    /\bshow\s+all\s+working\b/,
    /\bshow\s+your\s+work\b/,
    /\bfull\s+explanation\b/,
    /\bexplain\s+everything\b/,
    /\bin\s+detail\b/,
    /\bdetailed\s+explanation\b/,
    /\bfull\s+working\b/,
    /\bwalk\s+me\s+through\b/,
    /\bexplain\s+fully\b/,
    /\bexplain\s+in\s+full\b/,
    /\bcomprehensive\b/,
    /\bexhaustive\b/,
    /\bdon'?t\s+skip\b/,
    /\bshow\s+every\s+step\b/,
    /\bfrom\s+scratch\b/,
    /\bfrom\s+first\s+principles\b/,
    /\bprove\s+it\b/,
    /\bderive\b/,
    /\bderivation\b/
  ];
  if (shortPatterns.some((p) => p.test(lower))) return "short";
  if (fullPatterns.some((p) => p.test(lower))) return "full";
  return null;
}
function classifyQuestion(message, subject) {
  const lower = message.toLowerCase();
  let score = 0;
  const words = message.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 5) score += 0;
  else if (words <= 15) score += 1;
  else if (words <= 40) score += 2;
  else if (words <= 80) score += 3;
  else score += 4;
  const complexKeywords = [
    "prove",
    "proof",
    "derive",
    "derivation",
    "deduce",
    "theorem",
    "lemma",
    "integrate",
    "integration",
    "differentiate",
    "differentiation",
    "eigenvalue",
    "eigenvector",
    "fourier",
    "laplace",
    "transform",
    "differential equation",
    "partial derivative",
    "gradient",
    "divergence",
    "curl",
    "navier",
    "stokes",
    "schrodinger",
    "hamiltonian",
    "lagrangian",
    "algorithm",
    "complexity",
    "big o",
    "recursion",
    "dynamic programming",
    "proof by induction",
    "proof by contradiction",
    "axiom",
    "corollary",
    "convergence",
    "divergence series",
    "limit",
    "epsilon delta",
    "quantum",
    "relativity",
    "thermodynamics",
    "entropy",
    "organic chemistry",
    "reaction mechanism",
    "synthesis",
    "essay",
    "analyse",
    "critically evaluate",
    "compare and contrast"
  ];
  const complexCount = complexKeywords.filter((k) => lower.includes(k)).length;
  score += Math.min(complexCount * 2, 10);
  const mediumKeywords = [
    "solve",
    "calculate",
    "find",
    "simplify",
    "factorise",
    "factorize",
    "expand",
    "equation",
    "formula",
    "explain",
    "describe",
    "what is",
    "how does",
    "why does",
    "graph",
    "plot",
    "sketch",
    "draw",
    "balance",
    "convert",
    "translate",
    "summarise",
    "summarize"
  ];
  const mediumCount = mediumKeywords.filter((k) => lower.includes(k)).length;
  score += Math.min(mediumCount, 3);
  const symbolPattern = /[=^∫∑√∂∇×÷±≤≥≠∞θΔΣΩαβγλμπφψ]/g;
  const symbolCount = (message.match(symbolPattern) ?? []).length;
  score += Math.min(symbolCount * 2, 6);
  const latexPattern = /\$[^$]+\$|\\\w+/g;
  const latexCount = (message.match(latexPattern) ?? []).length;
  score += Math.min(latexCount, 4);
  const TOPIC_BOOSTS = [
    // Advanced mathematics
    ["topology", 5],
    ["abstract algebra", 5],
    ["real analysis", 5],
    ["complex analysis", 5],
    ["number theory", 4],
    ["linear algebra", 3],
    ["multivariable", 4],
    ["vector calculus", 4],
    ["probability distribution", 3],
    ["hypothesis test", 3],
    ["bayesian", 4],
    ["differential equation", 4],
    ["partial differential", 5],
    ["fourier series", 4],
    ["matrix", 2],
    ["determinant", 2],
    ["eigenvalue", 4],
    ["eigenvector", 4],
    // Advanced physics
    ["quantum mechanics", 5],
    ["quantum field", 5],
    ["special relativity", 5],
    ["general relativity", 5],
    ["electromagnetism", 4],
    ["thermodynamics", 3],
    ["statistical mechanics", 5],
    ["wave function", 4],
    ["schrodinger", 5],
    ["hamiltonian", 5],
    ["lagrangian", 5],
    ["navier-stokes", 5],
    ["maxwell", 4],
    ["lorentz", 4],
    ["kinematics", 2],
    ["dynamics", 2],
    ["momentum", 2],
    ["energy conservation", 2],
    // Advanced chemistry
    ["organic synthesis", 5],
    ["reaction mechanism", 4],
    ["stereochemistry", 4],
    ["electrochemistry", 4],
    ["thermochemistry", 3],
    ["quantum chemistry", 5],
    ["spectroscopy", 3],
    ["nmr", 4],
    ["chromatography", 3],
    ["acid base", 2],
    ["titration", 2],
    ["stoichiometry", 2],
    ["molar mass", 1],
    // Computer science
    ["dynamic programming", 4],
    ["graph algorithm", 4],
    ["np-complete", 5],
    ["turing", 5],
    ["machine learning", 4],
    ["neural network", 4],
    ["backpropagation", 5],
    ["time complexity", 3],
    ["space complexity", 3],
    ["big o", 3],
    ["recursion", 2],
    ["sorting", 2],
    ["binary search", 2],
    // Biology
    ["molecular biology", 4],
    ["genetics", 3],
    ["dna replication", 3],
    ["protein synthesis", 3],
    ["evolution", 2],
    ["natural selection", 2],
    ["cell division", 2],
    // Economics
    ["game theory", 4],
    ["econometrics", 5],
    ["macroeconomics", 3],
    ["microeconomics", 3],
    ["supply and demand", 2],
    ["elasticity", 2],
    // English / Humanities
    ["literary analysis", 3],
    ["critical theory", 4],
    ["rhetorical analysis", 3],
    ["compare and contrast", 3],
    ["critically evaluate", 4],
    ["essay", 2]
  ];
  const topicBonus = TOPIC_BOOSTS.reduce((acc, [keyword, bonus]) => {
    return lower.includes(keyword) ? Math.max(acc, bonus) : acc;
  }, 0);
  score += topicBonus;
  if (topicBonus === 0) {
    const subjectLower = (subject ?? "").toLowerCase();
    const heavySubjects = ["mathematics", "maths", "math", "physics", "chemistry", "computer science", "statistics"];
    const mediumSubjects = ["biology", "economics", "engineering"];
    if (heavySubjects.some((s) => subjectLower.includes(s))) score += 2;
    else if (mediumSubjects.some((s) => subjectLower.includes(s))) score += 1;
  }
  if (words <= 5 && complexCount === 0 && symbolCount === 0 && latexCount === 0) {
    return { difficulty: 1, type: "trivial" };
  }
  if (score <= 2) return { difficulty: 1, type: "trivial" };
  if (score <= 5) return { difficulty: 2, type: "simple" };
  if (score <= 10) return { difficulty: 3, type: "medium" };
  if (score <= 16) return { difficulty: 4, type: "complex" };
  return { difficulty: 5, type: "phd" };
}
function computeTokenBudget(classification, override, detailedMode) {
  if (override === "short") return 240;
  if (override === "full") return 5e3;
  const BASE = {
    1: 220,
    2: 600,
    3: 1400,
    4: 2800,
    5: 4200
  };
  const base = BASE[classification.difficulty] ?? 1400;
  const multiplier = detailedMode ? 1.2 : 0.65;
  return Math.min(Math.round(base * multiplier), 5e3);
}
function endsNaturally(text2) {
  const tail = text2.slice(-120).trimEnd();
  if (tail.length === 0) return true;
  if (/[.!?]$/.test(tail)) return true;
  if (/```\s*$/.test(tail)) return true;
  if (/:::\s*$/.test(tail)) return true;
  if (/^#{1,6}\s+.+$/m.test(tail.split("\n").pop() ?? "")) return true;
  if (tail.includes("===SUBMISSION_READY_END===")) return true;
  if (/---\s*$/.test(tail)) return true;
  return false;
}
function buildTutorProfileContext(profile) {
  if (!profile) return "";
  const parts = [];
  if (profile.nickname) {
    parts.push(`Address the student as "${profile.nickname}" when appropriate.`);
  }
  const toneMap = {
    encouraging: "Be warm, positive, and encouraging. Celebrate small wins and build confidence.",
    formal: "Use formal, precise academic language. Be professional and concise.",
    casual: "Be relaxed and conversational, like a friendly study buddy. Use informal language.",
    socratic: "Use the Socratic method: guide the student to discover answers through questions rather than stating them directly."
  };
  if (profile.tone && toneMap[profile.tone]) parts.push(toneMap[profile.tone]);
  const lengthMap = {
    brief: "Keep responses SHORT and to the point. Avoid unnecessary elaboration.",
    standard: "Provide balanced responses: thorough but not overwhelming.",
    detailed: "Provide an in-depth explanation with necessary reasoning, but avoid repetition and filler."
  };
  if (profile.responseLength && lengthMap[profile.responseLength]) parts.push(lengthMap[profile.responseLength]);
  const styleMap = {
    "visual": "Use diagrams described in text, tables, and visual analogies where possible.",
    "step-by-step": "Always break explanations into numbered steps. Never skip steps.",
    "conceptual": "Focus on the underlying concept and theory before showing calculations.",
    "example-heavy": "Use one strong worked example, or two only when comparison is necessary."
  };
  if (profile.learningStyle && styleMap[profile.learningStyle]) parts.push(styleMap[profile.learningStyle]);
  if (profile.language && profile.language !== "English") {
    parts.push(`Respond in ${profile.language}.`);
  }
  if (profile.showWorking === false) {
    parts.push("Give the final answer directly without showing every intermediate working step.");
  } else if (profile.showWorking === true) {
    parts.push("Show all necessary working steps clearly, without padding simple operations.");
  }
  if (profile.useEmojis === false) {
    parts.push("Do NOT use emoji in your responses.");
  } else if (profile.useEmojis === true) {
    parts.push("You may use emoji sparingly to make responses friendlier.");
  }
  if (profile.detailedMode === true) {
    parts.push(
      "DETAILED MODE is ON: Match depth to the question. Use 2-4 sentences for simple questions, 4-8 sentences plus one useful example for medium questions, and clearly numbered working with a brief verification for complex questions. Add a Pro Tip, Common Mistake, or Try It Yourself prompt only when it materially helps."
    );
  } else {
    parts.push(
      "CONCISE MODE is ON: Keep responses focused and efficient. Answer the question directly, show essential working steps only, and avoid over-explaining."
    );
  }
  return parts.length > 0 ? `

TUTOR PERSONALISATION:
${parts.map((p) => `- ${p}`).join("\n")}` : "";
}
async function streamOnce(messages, maxTokens, res, emitTokens) {
  const payload = {
    model: "claude-haiku-4-5",
    stream: false,
    max_tokens: maxTokens,
    messages
  };
  const upstream = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!upstream.ok) {
    const errText = await upstream.text();
    throw new Error(`LLM error: ${upstream.status} ${errText}`);
  }
  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await upstream.json();
    if (body.error) {
      const errorMessage = typeof body.error === "string" ? body.error : body.error.message ?? "Unknown LLM error";
      if (errorMessage !== "Streaming is not supported") {
        throw new Error(`LLM error: ${errorMessage}`);
      }
      const fallback = await fetch(resolveApiUrl(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`
        },
        body: JSON.stringify({ ...payload, stream: false })
      });
      if (!fallback.ok) {
        const errorText = await fallback.text();
        throw new Error(`LLM fallback error: ${fallback.status} ${errorText}`);
      }
      const fallbackBody = await fallback.json();
      if (fallbackBody.error) {
        const fallbackError = typeof fallbackBody.error === "string" ? fallbackBody.error : fallbackBody.error.message ?? "Unknown LLM error";
        throw new Error(`LLM fallback error: ${fallbackError}`);
      }
      const fallbackContent = fallbackBody.choices?.[0]?.message?.content;
      const text3 = Array.isArray(fallbackContent) ? fallbackContent.map((part) => part.text ?? "").join("") : fallbackContent ?? "";
      if (text3 && emitTokens) res.write(`data: ${JSON.stringify({ token: text3 })}

`);
      return { text: text3, finishReason: "stop" };
    }
    const content = body.choices?.[0]?.message?.content;
    const text2 = Array.isArray(content) ? content.map((part) => part.text ?? "").join("") : content ?? "";
    if (text2 && emitTokens) res.write(`data: ${JSON.stringify({ token: text2 })}

`);
    return { text: text2, finishReason: "stop" };
  }
  const reader = upstream.body?.getReader();
  if (!reader) return { text: "", finishReason: "stop" };
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let finishReason = "stop";
  const flush = () => {
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const raw = trimmed.slice(5).trim();
      if (raw === "[DONE]") continue;
      try {
        const parsed = JSON.parse(raw);
        const choice = parsed.choices?.[0];
        const token = choice?.delta?.content;
        if (token) {
          accumulated += token;
          if (emitTokens) {
            res.write(`data: ${JSON.stringify({ token })}

`);
          }
        }
        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;
        }
      } catch {
      }
    }
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    flush();
  }
  if (buffer.trim()) {
    buffer += "\n";
    flush();
  }
  return { text: accumulated, finishReason };
}
function registerChatStreamRoute(app) {
  app.post("/api/chat/stream", async (req, res) => {
    try {
      const { messages, subject, gradeLevel, tutorProfile } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "messages array is required" });
        return;
      }
      const subjectContext = subject ? `
The student is currently focused on: ${subject}. Tailor your explanations to this subject when relevant.` : "";
      const gradeCtx = gradeLevel && GRADE_LEVEL_DESCRIPTIONS[gradeLevel] ? `
ADAPT YOUR RESPONSE to this student's level: ${GRADE_LEVEL_DESCRIPTIONS[gradeLevel]}` : "";
      const profileCtx = buildTutorProfileContext(tutorProfile);
      const systemPrompt = CHAT_SYSTEM_PROMPT + subjectContext + gradeCtx + profileCtx;
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
      const override = detectUserOverride(lastUserMsg);
      const classification = classifyQuestion(lastUserMsg, subject);
      const isDetailed = tutorProfile?.detailedMode === true;
      const tokenBudget = computeTokenBudget(classification, override, isDetailed);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
      const llmMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content }))
      ];
      let fullText = "";
      let continuations = 0;
      const first = await streamOnce(llmMessages, tokenBudget, res, true);
      fullText = first.text;
      if (CONTINUATION_ENABLED) {
        while (continuations < MAX_CONTINUATIONS && first.finishReason === "length" && !endsNaturally(fullText)) {
          continuations++;
          res.write(`data: ${JSON.stringify({ continuation: true })}

`);
          const continuationMessages = [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            {
              role: "assistant",
              content: fullText
            },
            {
              role: "user",
              content: "Continue exactly from where you left off. Do not repeat anything already written. Do not add any preamble \u2014 just continue the response seamlessly."
            }
          ];
          const cont = await streamOnce(continuationMessages, tokenBudget, res, true);
          fullText += cont.text;
          if (cont.finishReason !== "length" || endsNaturally(fullText)) break;
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      console.error("[chatStream] error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      } else {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  });
}
var CONTINUATION_ENABLED, MAX_CONTINUATIONS, CHAT_SYSTEM_PROMPT, GRADE_LEVEL_DESCRIPTIONS, resolveApiUrl;
var init_chatStream = __esm({
  "server/_core/chatStream.ts"() {
    "use strict";
    init_env();
    CONTINUATION_ENABLED = true;
    MAX_CONTINUATIONS = 1;
    CHAT_SYSTEM_PROMPT = `You are TutorSnap, an expert academic tutor covering all school subjects (Mathematics, Science, English, History, and more).

## RESPONSE STYLE \u2014 CRITICAL RULES:

1. **LEAD WITH THE ANSWER.** The very first sentence must state the direct answer or result. No preamble, no "Great question!", no "Let me explain...", no restating the question. Just answer immediately.
2. **Then explain.** After the direct answer, provide the explanation, steps, and reasoning.
3. **Match length to complexity.** A trivial question (e.g. "What is 1+1?") deserves 1-3 sentences. A complex proof or derivation deserves full, unabridged working. Do NOT pad simple answers and do NOT truncate complex ones.
4. **Never truncate mid-thought.** Never end mid-equation, mid-proof, mid-code block, mid-table, or mid-sentence. If you are running long, finish the current section cleanly before stopping.
5. **Respect explicit student preferences.** If the student says "short answer", "just the formula", "briefly", or "tldr" \u2014 give only the direct answer with no elaboration. If they say "step by step", "show all working", "full explanation", or "explain everything" \u2014 complete every step without abbreviating.
6. **Close all open blocks.** Before ending any response, verify all code fences (\`\`\`), component blocks (:::), and tables (|) are properly closed.

## FORMATTING RULES:

### Mathematics & Science
- ALWAYS use LaTeX for ALL mathematical expressions:
  - Inline math: $x^2 + y^2 = r^2$
  - Block/display math: $$\\frac{d}{dx}[x^n] = nx^{n-1}$$
  - Use LaTeX for fractions (\\frac{}{}), exponents (^), roots (\\sqrt{}), Greek letters (\\pi, \\alpha), integrals (\\int), summations (\\sum)
  - NEVER write math as plain text \u2014 always use LaTeX

### Structure
- Use # for the main topic heading
- Use ## for major sections (Key Concept, Step-by-Step, Worked Example, Summary)
- Use ### for subsections
- Use ##### for standalone formulas
- Use ###### for Pro Tips or Common Mistakes
- Use > blockquotes for important theorems or warnings
- Use numbered lists for sequential steps
- Use **bold** for key terms
- Use --- to separate major sections

### Length guidance (STRICT \u2014 follow exactly based on question complexity)
- **Trivial** (e.g. "What is 1+1?", "What is 2+2?", "What colour is the sky?"): 1-2 sentences MAXIMUM. State the answer and one brief reason. NO steps, NO examples, NO Pro Tip, NO Common Mistake, NO Try It Yourself. Stop immediately after the answer.
- **Simple** (e.g. "What is the quadratic formula?", "What is photosynthesis?"): 3-6 sentences. Direct answer + brief explanation. One example only if essential. No Pro Tip or Common Mistake for simple factual questions.
- **Medium** (e.g. "Explain integration by parts", "Solve 3x + 5 = 14"): show the essential steps and at most one worked example. Add a short key insight when useful.
- **Complex** (e.g. "Prove the fundamental theorem of calculus"): show all necessary steps, state assumptions, and include a brief verification or summary. Add an extension problem only when requested.
- **PhD-level** (e.g. "Derive the Navier-Stokes equations from first principles"): provide a rigorous derivation with necessary intermediate steps, assumptions, and interpretation, but avoid repeated summaries or filler.

For every level, add Pro Tip, Common Mistake, or Try It Yourself sections only when they materially improve the answer.

## INTERACTIVE COMPONENTS \u2014 AUTO-INSERT RULES:

Decide whether one of the following components would materially improve understanding. Use at most one by default, and omit components for simple answers.

### Checklist \u2014 use when listing steps, requirements, or things to remember
Syntax (emit exactly as shown, one item per line):
:::checklist
- Item one
- Item two
- Item three
:::

### Flashcard \u2014 use when introducing a key term, formula, or concept worth memorising
Syntax (emit exactly as shown):
:::flashcard
front: The term or question (e.g. "What is the quadratic formula?")
back: The definition or answer (e.g. "$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$")
:::

### Comparison \u2014 use when contrasting two or more concepts, methods, or items
Syntax (emit exactly as shown, pipe-separated, first row is headers):
:::comparison
Feature | Option A | Option B
Speed | Fast | Slow
Accuracy | Medium | High
:::

### Timeline \u2014 use for historical events, process sequences, or ordered steps with dates/labels
Syntax (emit exactly as shown, one entry per line as "label: description"):
:::timeline
1687: Newton publishes Principia Mathematica
1905: Einstein publishes special relativity
1915: Einstein publishes general relativity
:::

### Diagram (Mermaid) \u2014 use for flowcharts, decision trees, mind maps, process flows, and relationships
Syntax (standard fenced code block with mermaid language tag):
\`\`\`mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action]
  B -->|No| D[Other Action]
\`\`\`

### When to use each component:
- **Checklist**: problem-solving steps, exam tips, requirements lists, "things to check" lists
- **Flashcard**: vocabulary terms, formulas, theorems, key facts worth memorising
- **Comparison**: comparing methods (e.g. integration by parts vs substitution), pros/cons, similarities/differences
- **Timeline**: history topics, chronological processes, ordered sequences of events
- **Mermaid diagram**: algorithms, decision logic, cause-and-effect chains, concept maps, process flows
- **Tables** (standard Markdown): data comparison, formula sheets, unit conversions \u2014 use freely

Do NOT insert a component if it would not genuinely help. Quality over quantity. One well-placed component beats three unnecessary ones.

## SUBMISSION READY SECTION \u2014 ALWAYS REQUIRED FOR SUBSTANTIVE RESPONSES:

After every response that answers a question, solves a problem, or provides a definition, you MUST append the following block EXACTLY as shown, after ALL other content. This is a COMPLETELY INDEPENDENT second output \u2014 do NOT summarise, condense, or copy from the explanation above. Generate it fresh as if you are writing only the answer a student would hand in for marking.

===SUBMISSION_READY_START===
[Generate a brand-new, independent submission-ready answer here. Rules by subject:
- Mathematics / Physics / Chemistry / Statistics: Complete worked solution. Every calculation on its own numbered line. All formula substitutions shown. All intermediate values with units. Final answer stated clearly on the last line. No prose, no commentary.
- Programming / Computer Science: Final production-ready code only. No explanation.
- Essays / English / History / Social Studies: Complete, polished final response. Full sentences and paragraphs. No notes or meta-commentary.
- Definitions / Vocabulary: Concise, precise final definition only.
- Multiple Choice: State the correct option and answer, then include only the essential supporting calculation or one-line justification if needed.
A student must be able to skip the entire explanation above, read ONLY this section, and have everything needed to submit a correct, complete, polished answer.]
===SUBMISSION_READY_END===

For purely conversational messages (greetings, "thank you", meta-questions about the tutor) where there is no definite answer to submit, omit the SUBMISSION READY section entirely.`;
    GRADE_LEVEL_DESCRIPTIONS = {
      grade1: "Grade 1 (age 6-7): Use very simple words, very short sentences, and fun real-world examples a young child would understand. Avoid all jargon.",
      grade2: "Grade 2 (age 7-8): Use simple words and short sentences. Relate concepts to everyday objects and activities a child knows.",
      grade3: "Grade 3 (age 8-9): Use clear, simple language. Introduce basic subject vocabulary with immediate plain-English definitions.",
      grade4: "Grade 4 (age 9-10): Use friendly, clear language. Introduce subject terms with definitions and simple examples.",
      grade5: "Grade 5 (age 10-11): Use clear language with some subject-specific terms. Provide step-by-step explanations with relatable examples.",
      grade6: "Grade 6 (age 11-12): Use very simple language, short sentences, relatable real-world examples. Avoid jargon.",
      grade7: "Grade 7 (age 12-13): Simple language, concrete examples, introduce basic terminology with clear definitions.",
      grade8: "Grade 8 (age 13-14): Moderate complexity, introduce subject-specific terms, use step-by-step explanations.",
      grade9: "Grade 9 (age 14-15): High school level, standard academic vocabulary, structured explanations.",
      grade10: "Grade 10 (age 15-16): GCSE / sophomore level, precise academic language, multi-step reasoning.",
      gcse: "GCSE / Grade 10-11: UK secondary school level, exam-focused explanations, mark-scheme style answers.",
      alevel: "A-Level / Grade 11-12: Advanced pre-university level, rigorous explanations, introduce university concepts.",
      university: "University / Degree level: Assume strong subject knowledge, use technical terminology freely, provide rigorous academic-level explanations."
    };
    resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
  }
});

// server/_core/trpc.ts
var import_server, import_superjson2, t, loggingMiddleware, router, publicProcedure, requireUser, protectedProcedure, adminProcedure;
var init_trpc = __esm({
  "server/_core/trpc.ts"() {
    "use strict";
    init_const();
    import_server = require("@trpc/server");
    import_superjson2 = __toESM(require("superjson"));
    t = import_server.initTRPC.context().create({
      transformer: import_superjson2.default
    });
    loggingMiddleware = t.middleware(async (opts) => {
      const { path, type, input } = opts;
      try {
        const result = await opts.next();
        return result;
      } catch (error) {
        throw error;
      }
    });
    router = t.router;
    publicProcedure = t.procedure.use(loggingMiddleware);
    requireUser = t.middleware(async (opts) => {
      const { ctx, next } = opts;
      if (!ctx.user) {
        throw new import_server.TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      }
      return next({
        ctx: {
          ...ctx,
          user: ctx.user
        }
      });
    });
    protectedProcedure = t.procedure.use(loggingMiddleware).use(requireUser);
    adminProcedure = t.procedure.use(loggingMiddleware).use(
      t.middleware(async (opts) => {
        const { ctx, next } = opts;
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new import_server.TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
        }
        return next({
          ctx: {
            ...ctx,
            user: ctx.user
          }
        });
      })
    );
  }
});

// server/_core/notification.ts
var notification_exports = {};
__export(notification_exports, {
  notifyOwner: () => notifyOwner
});
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new import_server2.TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new import_server2.TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}
var import_server2, TITLE_MAX_LENGTH, CONTENT_MAX_LENGTH, trimValue, isNonEmptyString2, buildEndpointUrl, validatePayload;
var init_notification = __esm({
  "server/_core/notification.ts"() {
    "use strict";
    import_server2 = require("@trpc/server");
    init_env();
    TITLE_MAX_LENGTH = 1200;
    CONTENT_MAX_LENGTH = 2e4;
    trimValue = (value) => value.trim();
    isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
    buildEndpointUrl = (baseUrl) => {
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      return new URL("webdevtoken.v1.WebDevService/SendNotification", normalizedBase).toString();
    };
    validatePayload = (input) => {
      if (!isNonEmptyString2(input.title)) {
        throw new import_server2.TRPCError({
          code: "BAD_REQUEST",
          message: "Notification title is required."
        });
      }
      if (!isNonEmptyString2(input.content)) {
        throw new import_server2.TRPCError({
          code: "BAD_REQUEST",
          message: "Notification content is required."
        });
      }
      const title = trimValue(input.title);
      const content = trimValue(input.content);
      if (title.length > TITLE_MAX_LENGTH) {
        throw new import_server2.TRPCError({
          code: "BAD_REQUEST",
          message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
        });
      }
      if (content.length > CONTENT_MAX_LENGTH) {
        throw new import_server2.TRPCError({
          code: "BAD_REQUEST",
          message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
        });
      }
      return { title, content };
    };
  }
});

// server/routers/email-auth.ts
var email_auth_exports = {};
__export(email_auth_exports, {
  emailAuthRouter: () => emailAuthRouter,
  startOtpCleanupScheduler: () => startOtpCleanupScheduler
});
function ipToInt(ip) {
  return ip.split(".").reduce((acc, octet) => acc << 8 | parseInt(octet, 10), 0) >>> 0;
}
function cidrContains(cidr, ip) {
  try {
    const [base, bits] = cidr.split("/");
    const mask = bits ? ~((1 << 32 - parseInt(bits, 10)) - 1) >>> 0 : 4294967295;
    return (ipToInt(base) & mask) === (ipToInt(ip) & mask);
  } catch {
    return false;
  }
}
function isTrustedProxy(remoteAddress) {
  const cidrs = process.env.TRUSTED_PROXY_CIDRS ? process.env.TRUSTED_PROXY_CIDRS.split(",").map((s) => s.trim()) : DEFAULT_TRUSTED_CIDRS;
  const addr = remoteAddress.replace(/^::ffff:/, "");
  return cidrs.some((cidr) => cidrContains(cidr, addr));
}
function getClientIp(req) {
  if (!req) return "unknown";
  const remote = req.socket?.remoteAddress ?? "";
  if (isTrustedProxy(remote)) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const first = forwarded.split(",")[0].trim();
      if (first) return first;
    }
    const cfIp = req.headers["cf-connecting-ip"];
    if (typeof cfIp === "string" && cfIp.trim()) return cfIp.trim();
  }
  return remote || "unknown";
}
function hashCode(code) {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[EmailAuth] OTP_PEPPER is not set \u2014 refusing to hash without pepper in production");
    }
    const { createHash: createHash2 } = require("crypto");
    return createHash2("sha256").update(code).digest("hex");
  }
  return (0, import_crypto.createHmac)("sha256", pepper).update(code).digest("hex");
}
function timingSafeCompare(a, b) {
  if (a.length !== b.length) return false;
  return (0, import_crypto.timingSafeEqual)(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
function generateOtp() {
  return String((0, import_crypto.randomInt)(1e5, 999999));
}
async function sendOtpEmail(to, code, purpose) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "support@tutorsnapai.tech";
  if (!apiKey) {
    console.warn(`[EmailAuth] RESEND_API_KEY not set \u2014 OTP (${purpose}) for ${to}: ${code}`);
    return false;
  }
  const subjectMap = {
    signin: `Your TutorSnap sign-in code: ${code}`,
    change_email: `Verify your new TutorSnap email address: ${code}`
  };
  const headingMap = {
    signin: "Here is your sign-in code:",
    change_email: "Verify your new email address:"
  };
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `TutorSnap <${fromEmail}>`,
      to,
      subject: subjectMap[purpose],
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #11181C; margin: 0 0 8px;">TutorSnap</h1>
          <p style="color: #687076; margin: 0 0 32px;">Your AI tutor for math, science, and more</p>
          <p style="color: #11181C; margin: 0 0 16px;">${headingMap[purpose]}</p>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
            <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #0a7ea4;">${code}</span>
          </div>
          <p style="color: #687076; font-size: 14px; margin: 0 0 8px;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color: #687076; font-size: 14px; margin: 0;">If you did not request this code, you can safely ignore this email.</p>
        </div>
      `,
      text: `Your TutorSnap code is: ${code}

This code expires in 10 minutes.

If you did not request this, ignore this email.`
    });
    if (error) {
      console.error("[EmailAuth] Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[EmailAuth] Failed to send OTP email:", err);
    return false;
  }
}
async function issueOtp(email, purpose, clientIp) {
  const db2 = await getDb();
  if (!db2) return { ok: false, error: "Database unavailable. Please try again." };
  const now = /* @__PURE__ */ new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
  const emailSendCount = await db2.select({ count: import_drizzle_orm5.sql`COUNT(*)` }).from(otpAudit).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(otpAudit.email, email), (0, import_drizzle_orm5.gt)(otpAudit.createdAt, windowStart)));
  if ((emailSendCount[0]?.count ?? 0) >= MAX_SENDS_PER_EMAIL) {
    await db2.insert(otpAudit).values({ email, purpose, ipAddress: clientIp, outcome: "rate_limited_email" });
    return { ok: false, error: "Too many code requests for this email. Please wait 10 minutes." };
  }
  if (clientIp !== "unknown") {
    const ipSendCount = await db2.select({ count: import_drizzle_orm5.sql`COUNT(*)` }).from(otpAudit).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(otpAudit.ipAddress, clientIp), (0, import_drizzle_orm5.gt)(otpAudit.createdAt, windowStart)));
    if ((ipSendCount[0]?.count ?? 0) >= MAX_SENDS_PER_IP) {
      await db2.insert(otpAudit).values({ email, purpose, ipAddress: clientIp, outcome: "rate_limited_ip" });
      return { ok: false, error: "Too many requests from your network. Please wait 10 minutes." };
    }
  }
  const recent = await db2.select({ createdAt: otpAudit.createdAt }).from(otpAudit).where(
    (0, import_drizzle_orm5.and)(
      (0, import_drizzle_orm5.eq)(otpAudit.email, email),
      (0, import_drizzle_orm5.eq)(otpAudit.purpose, purpose),
      (0, import_drizzle_orm5.eq)(otpAudit.outcome, "sent"),
      (0, import_drizzle_orm5.gt)(otpAudit.createdAt, new Date(now.getTime() - RESEND_COOLDOWN_MS))
    )
  ).limit(1);
  if (recent.length > 0) {
    const elapsed = now.getTime() - new Date(recent[0].createdAt).getTime();
    const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1e3);
    return { ok: false, error: `Please wait ${remaining} seconds before requesting a new code.` };
  }
  await db2.delete(otpCodes).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(otpCodes.email, email), (0, import_drizzle_orm5.eq)(otpCodes.purpose, purpose)));
  const code = generateOtp();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  await db2.insert(otpCodes).values({
    email,
    hashedCode: hashCode(code),
    purpose,
    expiresAt,
    attempts: 0,
    ipAddress: clientIp
  });
  await db2.insert(otpAudit).values({ email, purpose, ipAddress: clientIp, outcome: "sent" });
  const sent = await sendOtpEmail(email, code, purpose);
  const devCode = process.env.NODE_ENV !== "production" ? code : void 0;
  return { ok: true, sent, devCode };
}
async function verifyOtpCode(email, code, purpose) {
  const db2 = await getDb();
  if (!db2) return { ok: false, error: "Database unavailable. Please try again." };
  return await db2.transaction(
    async (tx) => {
      const rows = await tx.select().from(otpCodes).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(otpCodes.email, email), (0, import_drizzle_orm5.eq)(otpCodes.purpose, purpose))).limit(1);
      const entry = rows[0];
      if (!entry) {
        return { ok: false, error: "No code found for this email. Please request a new one." };
      }
      if (/* @__PURE__ */ new Date() > new Date(entry.expiresAt)) {
        await tx.delete(otpCodes).where((0, import_drizzle_orm5.eq)(otpCodes.id, entry.id));
        return { ok: false, error: "Code has expired. Please request a new one." };
      }
      if (entry.attempts >= MAX_ATTEMPTS) {
        await tx.delete(otpCodes).where((0, import_drizzle_orm5.eq)(otpCodes.id, entry.id));
        return { ok: false, error: "Too many incorrect attempts. Please request a new code." };
      }
      const incrementRows = await tx.update(otpCodes).set({ attempts: import_drizzle_orm5.sql`${otpCodes.attempts} + 1` }).where(
        (0, import_drizzle_orm5.and)(
          (0, import_drizzle_orm5.eq)(otpCodes.id, entry.id),
          (0, import_drizzle_orm5.lt)(otpCodes.attempts, MAX_ATTEMPTS),
          (0, import_drizzle_orm5.gt)(otpCodes.expiresAt, /* @__PURE__ */ new Date())
        )
      ).returning({ id: otpCodes.id });
      const affected = incrementRows.length;
      if (affected === 0) {
        return { ok: false, error: "Code is no longer valid. Please request a new one." };
      }
      const candidate = hashCode(code);
      if (!timingSafeCompare(candidate, entry.hashedCode)) {
        const remaining = MAX_ATTEMPTS - entry.attempts - 1;
        if (remaining <= 0) {
          await tx.delete(otpCodes).where((0, import_drizzle_orm5.eq)(otpCodes.id, entry.id));
          return { ok: false, error: "Too many incorrect attempts. Please request a new code." };
        }
        return {
          ok: false,
          error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        };
      }
      const deletedRows = await tx.delete(otpCodes).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(otpCodes.id, entry.id), (0, import_drizzle_orm5.eq)(otpCodes.hashedCode, entry.hashedCode))).returning({ id: otpCodes.id });
      const deleted = deletedRows.length;
      if (deleted === 0) {
        return { ok: false, error: "Code was already used. Please request a new one." };
      }
      return { ok: true };
    }
  );
}
async function startOtpCleanupScheduler() {
  await runCleanupIfLockAcquired();
  setInterval(runCleanupIfLockAcquired, CLEANUP_INTERVAL_MS);
}
async function runCleanupIfLockAcquired() {
  const db2 = await getDb();
  if (!db2) return;
  const now = /* @__PURE__ */ new Date();
  const lockExpiry = new Date(now.getTime() + LOCK_TTL_MS);
  try {
    await db2.execute(
      import_drizzle_orm5.sql`INSERT INTO scheduler_locks ("jobName", "instanceId", "expiresAt", "acquiredAt")
          VALUES ('otp-cleanup', ${INSTANCE_ID}, ${lockExpiry}, ${now})
          ON CONFLICT ("jobName") DO UPDATE SET
            "instanceId" = EXCLUDED."instanceId",
            "expiresAt" = EXCLUDED."expiresAt",
            "acquiredAt" = EXCLUDED."acquiredAt"
          WHERE scheduler_locks."expiresAt" < EXCLUDED."acquiredAt"`
    );
    const lockRows = await db2.select().from((init_schema(), __toCommonJS(schema_exports)).schedulerLocks).where((0, import_drizzle_orm5.eq)((init_schema(), __toCommonJS(schema_exports)).schedulerLocks.jobName, "otp-cleanup")).limit(1);
    if (!lockRows[0] || lockRows[0].instanceId !== INSTANCE_ID) {
      return;
    }
    const cutoff = /* @__PURE__ */ new Date();
    const otpDeletedRows = await db2.delete(otpCodes).where((0, import_drizzle_orm5.lt)(otpCodes.expiresAt, cutoff)).returning({ id: otpCodes.id });
    const otpDeleted = otpDeletedRows.length;
    const auditCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
    const auditDeletedRows = await db2.delete(otpAudit).where((0, import_drizzle_orm5.lt)(otpAudit.createdAt, auditCutoff)).returning({ id: otpAudit.id });
    const auditDeleted = auditDeletedRows.length;
  } catch (err) {
    console.warn("[OTP Cleanup] Scheduler error (non-fatal):", err?.message ?? err);
  }
}
var import_zod4, import_drizzle_orm5, import_crypto, import_os, OTP_TTL_MS, RESEND_COOLDOWN_MS, MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MS, MAX_SENDS_PER_EMAIL, MAX_SENDS_PER_IP, DEFAULT_TRUSTED_CIDRS, emailAuthRouter, CLEANUP_INTERVAL_MS, LOCK_TTL_MS, INSTANCE_ID;
var init_email_auth = __esm({
  "server/routers/email-auth.ts"() {
    "use strict";
    init_trpc();
    import_zod4 = require("zod");
    init_db();
    init_schema();
    import_drizzle_orm5 = require("drizzle-orm");
    import_crypto = require("crypto");
    import_os = require("os");
    init_sdk();
    OTP_TTL_MS = 10 * 60 * 1e3;
    RESEND_COOLDOWN_MS = 60 * 1e3;
    MAX_ATTEMPTS = 5;
    RATE_LIMIT_WINDOW_MS = 10 * 60 * 1e3;
    MAX_SENDS_PER_EMAIL = 5;
    MAX_SENDS_PER_IP = 10;
    DEFAULT_TRUSTED_CIDRS = [
      // Cloudflare IPv4 (as of 2025)
      "173.245.48.0/20",
      "103.21.244.0/22",
      "103.22.200.0/22",
      "103.31.4.0/22",
      "141.101.64.0/18",
      "108.162.192.0/18",
      "190.93.240.0/20",
      "188.114.96.0/20",
      "197.234.240.0/22",
      "198.41.128.0/17",
      "162.158.0.0/15",
      "104.16.0.0/13",
      "104.24.0.0/14",
      "172.64.0.0/13",
      "131.0.72.0/22",
      // Google Cloud Run / internal
      "10.0.0.0/8",
      "172.16.0.0/12",
      "192.168.0.0/16",
      "169.254.0.0/16",
      // Loopback (dev)
      "127.0.0.0/8",
      "::1/128"
    ];
    emailAuthRouter = router({
      /**
       * Step 1 (sign-in): Send a 6-digit OTP to the given email address.
       */
      sendOtp: publicProcedure.input(import_zod4.z.object({ email: import_zod4.z.string().email() })).mutation(async ({ input, ctx }) => {
        const email = input.email.toLowerCase().trim();
        const ip = getClientIp(ctx.req);
        const result = await issueOtp(email, "signin", ip);
        if (!result.ok) return { success: false, error: result.error };
        return {
          success: true,
          sent: result.sent,
          message: result.sent ? "A 6-digit code has been sent to your email." : "Could not send email. Check server logs for the code (dev mode).",
          devCode: result.devCode
        };
      }),
      /**
       * Step 2 (sign-in): Verify the OTP and sign in / register the user.
       */
      verifyOtp: publicProcedure.input(
        import_zod4.z.object({
          email: import_zod4.z.string().email(),
          code: import_zod4.z.string().length(6),
          name: import_zod4.z.string().optional()
        })
      ).mutation(async ({ input }) => {
        const email = input.email.toLowerCase().trim();
        const verification = await verifyOtpCode(email, input.code, "signin");
        if (!verification.ok) return { success: false, error: verification.error };
        try {
          const db2 = await getDb();
          if (!db2) return { success: false, error: "Database unavailable" };
          const openId = `email:${email}`;
          const existingRows = await db2.select().from(users).where((0, import_drizzle_orm5.eq)(users.openId, openId)).limit(1);
          let user = existingRows[0];
          if (!user) {
            await db2.insert(users).values({
              openId,
              email,
              name: input.name || email.split("@")[0],
              loginMethod: "email",
              lastSignedIn: /* @__PURE__ */ new Date()
            });
            const newRows = await db2.select().from(users).where((0, import_drizzle_orm5.eq)(users.openId, openId)).limit(1);
            user = newRows[0];
          } else {
            await db2.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(users.openId, openId));
          }
          const sessionToken = await sdk.createSessionToken(user.openId, {
            name: user.name || user.email?.split("@")[0] || ""
          });
          return {
            success: true,
            token: sessionToken,
            user: {
              id: user.id,
              openId: user.openId,
              name: user.name,
              email: user.email,
              loginMethod: user.loginMethod
            }
          };
        } catch (error) {
          console.error("[EmailAuth] DB error:", error);
          return { success: false, error: "Failed to sign in. Please try again." };
        }
      }),
      /**
       * Change-email step 1: Send an OTP to the new email address.
       */
      sendChangeEmailOtp: protectedProcedure.input(import_zod4.z.object({ newEmail: import_zod4.z.string().email() })).mutation(async ({ input, ctx }) => {
        const newEmail = input.newEmail.toLowerCase().trim();
        try {
          const db2 = await getDb();
          if (db2) {
            const existing = await db2.select({ id: users.id }).from(users).where((0, import_drizzle_orm5.eq)(users.email, newEmail)).limit(1);
            if (existing.length > 0) {
              return { success: false, error: "That email address is already in use." };
            }
          }
        } catch {
        }
        const ip = getClientIp(ctx.req);
        const result = await issueOtp(newEmail, "change_email", ip);
        if (!result.ok) return { success: false, error: result.error };
        return {
          success: true,
          sent: result.sent,
          message: result.sent ? `A verification code has been sent to ${newEmail}.` : "Could not send email. Check server logs for the code (dev mode).",
          devCode: result.devCode
        };
      }),
      /**
       * Change-email step 2: Verify the OTP and update the user's email.
       */
      verifyChangeEmail: protectedProcedure.input(import_zod4.z.object({ newEmail: import_zod4.z.string().email(), code: import_zod4.z.string().length(6) })).mutation(async ({ ctx, input }) => {
        const newEmail = input.newEmail.toLowerCase().trim();
        const verification = await verifyOtpCode(newEmail, input.code, "change_email");
        if (!verification.ok) return { success: false, error: verification.error };
        try {
          const db2 = await getDb();
          if (!db2) return { success: false, error: "Database unavailable" };
          await db2.update(users).set({ email: newEmail, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm5.eq)(users.id, ctx.user.id));
          return { success: true, newEmail };
        } catch (error) {
          console.error("[EmailAuth] Change email DB error:", error);
          return { success: false, error: "Failed to update email. Please try again." };
        }
      })
    });
    CLEANUP_INTERVAL_MS = 30 * 60 * 1e3;
    LOCK_TTL_MS = 35 * 60 * 1e3;
    INSTANCE_ID = `${(0, import_os.hostname)()}-${process.pid}`;
  }
});

// server/routers/classroom.ts
var classroom_exports = {};
__export(classroom_exports, {
  classroomInternals: () => classroomInternals,
  classroomRouter: () => classroomRouter,
  startClassroomCleanupScheduler: () => startClassroomCleanupScheduler
});
function isClassroomEnabled() {
  const value = process.env.CLASSROOM_MVP_ENABLED?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}
async function requireDatabase() {
  const database = await getDb();
  if (!database) {
    throw new import_server3.TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Classroom data is temporarily unavailable."
    });
  }
  return database;
}
function requireActiveClass(classroom) {
  if (!classroom.isActive) {
    throw new import_server3.TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This class is archived and is currently read-only."
    });
  }
}
function safeDisplayName(name, role) {
  const normalized = name?.trim();
  if (normalized) return normalized.slice(0, 120);
  return role === "teacher" ? "Teacher" : "Learner";
}
function normalizeJoinCode(value) {
  return value.toUpperCase().replace(/[\s-]+/g, "");
}
function generateJoinCode() {
  let code = "";
  for (let index2 = 0; index2 < JOIN_CODE_LENGTH; index2 += 1) {
    code += JOIN_CODE_ALPHABET[(0, import_node_crypto3.randomInt)(0, JOIN_CODE_ALPHABET.length)];
  }
  return code;
}
function hashJoinCode(code) {
  return (0, import_node_crypto3.createHash)("sha256").update(code).digest("hex");
}
function isDuplicateEntry(error) {
  let candidate = error;
  for (let depth = 0; candidate && depth < 4; depth += 1) {
    if (candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062 || candidate.message?.includes("Duplicate entry") === true) {
      return true;
    }
    candidate = candidate.cause;
  }
  return false;
}
function encodeCursor(id) {
  return Buffer.from(String(id), "utf8").toString("base64url");
}
function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const value = Number(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("invalid");
    return value;
  } catch {
    throw new import_server3.TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid pagination cursor."
    });
  }
}
function ipToInt2(ip) {
  return ip.split(".").reduce((acc, octet) => acc << 8 | Number.parseInt(octet, 10), 0) >>> 0;
}
function cidrContains2(cidr, ip) {
  if (cidr === "::1/128") return ip === "::1";
  try {
    const [base, rawBits] = cidr.split("/");
    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(base) || !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip))
      return false;
    const bits = rawBits ? Number.parseInt(rawBits, 10) : 32;
    if (bits < 0 || bits > 32) return false;
    const mask = bits === 0 ? 0 : 4294967295 << 32 - bits >>> 0;
    return (ipToInt2(base) & mask) === (ipToInt2(ip) & mask);
  } catch {
    return false;
  }
}
function isTrustedProxy2(remoteAddress) {
  const cidrs = process.env.TRUSTED_PROXY_CIDRS ? process.env.TRUSTED_PROXY_CIDRS.split(",").map((entry) => entry.trim()).filter(Boolean) : DEFAULT_TRUSTED_CIDRS2;
  const normalized = remoteAddress.replace(/^::ffff:/, "");
  return cidrs.some((cidr) => cidrContains2(cidr, normalized));
}
function getClientIp2(req) {
  if (!req) return "unknown";
  const remote = req.socket?.remoteAddress ?? "";
  if (isTrustedProxy2(remote)) {
    const cfIp = req.headers["cf-connecting-ip"];
    if (typeof cfIp === "string" && cfIp.trim())
      return cfIp.trim().slice(0, 45);
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first.slice(0, 45);
    }
  }
  return (remote || "unknown").slice(0, 45);
}
async function resolveClassroomAccess(database, userId, classroomPublicId) {
  const rows = await database.select({ classroom: classrooms, membership: classroomMembers }).from(classrooms).innerJoin(
    classroomMembers,
    (0, import_drizzle_orm6.and)(
      (0, import_drizzle_orm6.eq)(classroomMembers.classroomId, classrooms.id),
      (0, import_drizzle_orm6.eq)(classroomMembers.userId, userId)
    )
  ).where((0, import_drizzle_orm6.eq)(classrooms.publicId, classroomPublicId)).limit(1);
  const row = rows[0];
  if (!row) {
    throw new import_server3.TRPCError({ code: "NOT_FOUND", message: "Class not found." });
  }
  return row;
}
async function resolveAssignmentAccess(database, userId, assignmentPublicId) {
  const rows = await database.select({
    assignment: assignments,
    classroom: classrooms,
    membership: classroomMembers
  }).from(assignments).innerJoin(classrooms, (0, import_drizzle_orm6.eq)(classrooms.id, assignments.classroomId)).innerJoin(
    classroomMembers,
    (0, import_drizzle_orm6.and)(
      (0, import_drizzle_orm6.eq)(classroomMembers.classroomId, classrooms.id),
      (0, import_drizzle_orm6.eq)(classroomMembers.userId, userId)
    )
  ).where((0, import_drizzle_orm6.eq)(assignments.publicId, assignmentPublicId)).limit(1);
  const row = rows[0];
  if (!row) {
    throw new import_server3.TRPCError({
      code: "NOT_FOUND",
      message: "Assignment not found."
    });
  }
  if (row.membership.role === "learner" && row.assignment.status !== "published") {
    throw new import_server3.TRPCError({
      code: "NOT_FOUND",
      message: "Assignment not found."
    });
  }
  return row;
}
async function resolveCommentAccess(database, userId, commentPublicId) {
  const rows = await database.select({
    comment: assignmentComments,
    assignment: assignments,
    classroom: classrooms,
    membership: classroomMembers
  }).from(assignmentComments).innerJoin(assignments, (0, import_drizzle_orm6.eq)(assignments.id, assignmentComments.assignmentId)).innerJoin(classrooms, (0, import_drizzle_orm6.eq)(classrooms.id, assignments.classroomId)).innerJoin(
    classroomMembers,
    (0, import_drizzle_orm6.and)(
      (0, import_drizzle_orm6.eq)(classroomMembers.classroomId, classrooms.id),
      (0, import_drizzle_orm6.eq)(classroomMembers.userId, userId)
    )
  ).where((0, import_drizzle_orm6.eq)(assignmentComments.publicId, commentPublicId)).limit(1);
  const row = rows[0];
  if (!row || row.membership.role === "learner" && row.assignment.status !== "published") {
    throw new import_server3.TRPCError({ code: "NOT_FOUND", message: "Comment not found." });
  }
  return row;
}
function requireTeacher(role) {
  if (role !== "teacher") {
    throw new import_server3.TRPCError({
      code: "FORBIDDEN",
      message: "Teacher access is required."
    });
  }
}
function requireLearner(role) {
  if (role !== "learner") {
    throw new import_server3.TRPCError({
      code: "FORBIDDEN",
      message: "Learner access is required."
    });
  }
}
function classProjection(classroom, role, memberCount) {
  return {
    id: classroom.publicId,
    name: classroom.name,
    subject: classroom.subject,
    gradeLevel: classroom.gradeLevel,
    role,
    isActive: classroom.isActive,
    ...typeof memberCount === "number" ? { memberCount } : {},
    ...role === "teacher" ? { joinCode: classroom.joinCode } : {},
    createdAt: classroom.createdAt,
    updatedAt: classroom.updatedAt
  };
}
function assignmentProjection(assignment) {
  return {
    id: assignment.publicId,
    title: assignment.title,
    instructions: assignment.instructions,
    subject: assignment.subject,
    dueAt: assignment.dueAt,
    status: assignment.status,
    publishedAt: assignment.publishedAt,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt
  };
}
async function enforceJoinRateLimit(database, userId, ipAddress) {
  const windowStart = new Date(Date.now() - JOIN_RATE_WINDOW_MS);
  const [userRows, ipRows] = await Promise.all([
    database.select({ count: import_drizzle_orm6.sql`COUNT(*)` }).from(classroomJoinAttempts).where(
      (0, import_drizzle_orm6.and)(
        (0, import_drizzle_orm6.eq)(classroomJoinAttempts.userId, userId),
        (0, import_drizzle_orm6.gt)(classroomJoinAttempts.createdAt, windowStart)
      )
    ),
    ipAddress === "unknown" ? Promise.resolve([{ count: 0 }]) : database.select({ count: import_drizzle_orm6.sql`COUNT(*)` }).from(classroomJoinAttempts).where(
      (0, import_drizzle_orm6.and)(
        (0, import_drizzle_orm6.eq)(classroomJoinAttempts.ipAddress, ipAddress),
        (0, import_drizzle_orm6.gt)(classroomJoinAttempts.createdAt, windowStart)
      )
    )
  ]);
  if ((Number(userRows[0]?.count) || 0) >= MAX_JOIN_ATTEMPTS_PER_USER || (Number(ipRows[0]?.count) || 0) >= MAX_JOIN_ATTEMPTS_PER_IP) {
    throw new import_server3.TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many class-code attempts. Please wait before trying again."
    });
  }
}
async function recordJoinAttempt(database, userId, ipAddress, normalizedCode, outcome) {
  await database.insert(classroomJoinAttempts).values({
    userId,
    ipAddress: ipAddress === "unknown" ? null : ipAddress,
    codeHash: hashJoinCode(normalizedCode),
    outcome: outcome.slice(0, 32)
  });
}
async function findClassByJoinCode(database, normalizedCode) {
  const rows = await database.select().from(classrooms).where(
    (0, import_drizzle_orm6.and)(
      (0, import_drizzle_orm6.eq)(classrooms.joinCode, normalizedCode),
      (0, import_drizzle_orm6.eq)(classrooms.isActive, true)
    )
  ).limit(1);
  return rows[0] ?? null;
}
async function countLearners(database, classroomId) {
  const rows = await database.select({ count: import_drizzle_orm6.sql`COUNT(*)` }).from(classroomMembers).where(
    (0, import_drizzle_orm6.and)(
      (0, import_drizzle_orm6.eq)(classroomMembers.classroomId, classroomId),
      (0, import_drizzle_orm6.eq)(classroomMembers.role, "learner")
    )
  );
  return Number(rows[0]?.count) || 0;
}
async function enforceCommentRateLimit(database, userId) {
  const now = Date.now();
  const [minuteRows, hourRows] = await Promise.all([
    database.select({ count: import_drizzle_orm6.sql`COUNT(*)` }).from(assignmentComments).where(
      (0, import_drizzle_orm6.and)(
        (0, import_drizzle_orm6.eq)(assignmentComments.authorUserId, userId),
        (0, import_drizzle_orm6.gt)(
          assignmentComments.createdAt,
          new Date(now - COMMENT_MINUTE_WINDOW_MS)
        )
      )
    ),
    database.select({ count: import_drizzle_orm6.sql`COUNT(*)` }).from(assignmentComments).where(
      (0, import_drizzle_orm6.and)(
        (0, import_drizzle_orm6.eq)(assignmentComments.authorUserId, userId),
        (0, import_drizzle_orm6.gt)(
          assignmentComments.createdAt,
          new Date(now - COMMENT_HOUR_WINDOW_MS)
        )
      )
    )
  ]);
  if ((Number(minuteRows[0]?.count) || 0) >= MAX_COMMENTS_PER_MINUTE || (Number(hourRows[0]?.count) || 0) >= MAX_COMMENTS_PER_HOUR) {
    throw new import_server3.TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "You are commenting too quickly. Please wait before posting again."
    });
  }
}
async function buildClassCard(database, classroom, membership) {
  const assignmentRows = await database.select({
    id: assignments.id,
    publicId: assignments.publicId,
    title: assignments.title,
    dueAt: assignments.dueAt,
    status: assignments.status
  }).from(assignments).where((0, import_drizzle_orm6.eq)(assignments.classroomId, classroom.id)).orderBy((0, import_drizzle_orm6.asc)(assignments.dueAt), (0, import_drizzle_orm6.desc)(assignments.id));
  const published = assignmentRows.filter(
    (assignment) => assignment.status === "published"
  );
  let completed = 0;
  let completedAssignmentIds = /* @__PURE__ */ new Set();
  if (membership.role === "learner" && published.length > 0) {
    const submissionRows = await database.select({
      assignmentId: assignmentSubmissions.assignmentId,
      status: assignmentSubmissions.status
    }).from(assignmentSubmissions).where(
      (0, import_drizzle_orm6.and)(
        (0, import_drizzle_orm6.eq)(assignmentSubmissions.userId, membership.userId),
        (0, import_drizzle_orm6.inArray)(
          assignmentSubmissions.assignmentId,
          published.map((assignment) => assignment.id)
        ),
        (0, import_drizzle_orm6.eq)(assignmentSubmissions.status, "complete")
      )
    );
    completed = submissionRows.length;
    completedAssignmentIds = new Set(
      submissionRows.map((submission) => submission.assignmentId)
    );
  }
  const nextDue = published.find(
    (assignment) => assignment.dueAt && assignment.dueAt.getTime() >= Date.now() && (membership.role === "teacher" || !completedAssignmentIds.has(assignment.id))
  ) ?? null;
  const memberCount = membership.role === "teacher" ? await countLearners(database, classroom.id) : void 0;
  return {
    ...classProjection(classroom, membership.role, memberCount),
    assignmentCounts: {
      draft: membership.role === "teacher" ? assignmentRows.filter((assignment) => assignment.status === "draft").length : 0,
      published: published.length,
      completed,
      pending: membership.role === "learner" ? Math.max(0, published.length - completed) : 0
    },
    nextDue: nextDue ? { id: nextDue.publicId, title: nextDue.title, dueAt: nextDue.dueAt } : null
  };
}
async function startClassroomCleanupScheduler() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  await runClassroomCleanupIfLockAcquired();
  const timer = setInterval(
    runClassroomCleanupIfLockAcquired,
    CLEANUP_INTERVAL_MS2
  );
  timer.unref?.();
}
async function runClassroomCleanupIfLockAcquired() {
  const database = await getDb();
  if (!database) return;
  const now = /* @__PURE__ */ new Date();
  const lockExpiry = new Date(now.getTime() + LOCK_TTL_MS2);
  try {
    await database.execute(import_drizzle_orm6.sql`INSERT INTO scheduler_locks ("jobName", "instanceId", "expiresAt", "acquiredAt")
      VALUES ('classroom-security-cleanup', ${CLEANUP_INSTANCE_ID}, ${lockExpiry}, ${now})
      ON CONFLICT ("jobName") DO UPDATE SET
        "instanceId" = EXCLUDED."instanceId",
        "expiresAt" = EXCLUDED."expiresAt",
        "acquiredAt" = EXCLUDED."acquiredAt"
      WHERE scheduler_locks."expiresAt" < EXCLUDED."acquiredAt"`);
    const lockRows = await database.select().from(schedulerLocks).where((0, import_drizzle_orm6.eq)(schedulerLocks.jobName, "classroom-security-cleanup")).limit(1);
    if (!lockRows[0] || lockRows[0].instanceId !== CLEANUP_INSTANCE_ID) return;
    await database.delete(classroomJoinAttempts).where(
      (0, import_drizzle_orm6.lt)(
        classroomJoinAttempts.createdAt,
        new Date(now.getTime() - JOIN_AUDIT_RETENTION_MS)
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Classroom Cleanup] Non-fatal scheduler error: ${message}`);
  }
}
var import_node_crypto3, import_node_os, import_server3, import_drizzle_orm6, import_zod5, PUBLIC_ID_SCHEMA, CLASSROOM_ID_INPUT, ASSIGNMENT_ID_INPUT, COMMENT_ID_INPUT, CURSOR_SCHEMA, PAGE_SIZE_SCHEMA, CLASS_NAME_SCHEMA, SUBJECT_SCHEMA, GRADE_LEVEL_SCHEMA, ASSIGNMENT_TITLE_SCHEMA, ASSIGNMENT_INSTRUCTIONS_SCHEMA, RESPONSE_TEXT_SCHEMA, COMMENT_BODY_SCHEMA, MODERATION_REASON_SCHEMA, JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH, MAX_JOIN_CODE_GENERATION_ATTEMPTS, MAX_TEACHER_CLASSES, MAX_ACTIVE_LEARNERS, JOIN_RATE_WINDOW_MS, MAX_JOIN_ATTEMPTS_PER_USER, MAX_JOIN_ATTEMPTS_PER_IP, COMMENT_MINUTE_WINDOW_MS, COMMENT_HOUR_WINDOW_MS, MAX_COMMENTS_PER_MINUTE, MAX_COMMENTS_PER_HOUR, CLASS_CODE_ERROR, DEFAULT_TRUSTED_CIDRS2, classroomEnabledProcedure, classroomMemberProcedure, classroomTeacherProcedure, assignmentMemberProcedure, assignmentTeacherProcedure, commentMemberProcedure, classroomRouter, CLEANUP_INTERVAL_MS2, LOCK_TTL_MS2, JOIN_AUDIT_RETENTION_MS, CLEANUP_INSTANCE_ID, cleanupStarted, classroomInternals;
var init_classroom = __esm({
  "server/routers/classroom.ts"() {
    "use strict";
    import_node_crypto3 = require("node:crypto");
    import_node_os = require("node:os");
    import_server3 = require("@trpc/server");
    import_drizzle_orm6 = require("drizzle-orm");
    import_zod5 = require("zod");
    init_schema();
    init_db();
    init_trpc();
    PUBLIC_ID_SCHEMA = import_zod5.z.string().uuid();
    CLASSROOM_ID_INPUT = import_zod5.z.object({ classroomId: PUBLIC_ID_SCHEMA });
    ASSIGNMENT_ID_INPUT = import_zod5.z.object({ assignmentId: PUBLIC_ID_SCHEMA });
    COMMENT_ID_INPUT = import_zod5.z.object({ commentId: PUBLIC_ID_SCHEMA });
    CURSOR_SCHEMA = import_zod5.z.string().max(64).optional();
    PAGE_SIZE_SCHEMA = import_zod5.z.number().int().min(1).max(50).default(25);
    CLASS_NAME_SCHEMA = import_zod5.z.string().trim().min(1).max(120);
    SUBJECT_SCHEMA = import_zod5.z.string().trim().min(1).max(64);
    GRADE_LEVEL_SCHEMA = import_zod5.z.string().trim().min(1).max(32).nullable().optional();
    ASSIGNMENT_TITLE_SCHEMA = import_zod5.z.string().trim().min(1).max(160);
    ASSIGNMENT_INSTRUCTIONS_SCHEMA = import_zod5.z.string().trim().min(1).max(2e4);
    RESPONSE_TEXT_SCHEMA = import_zod5.z.string().trim().max(4e3).nullable().optional();
    COMMENT_BODY_SCHEMA = import_zod5.z.string().trim().min(1).max(1e3);
    MODERATION_REASON_SCHEMA = import_zod5.z.enum([
      "inappropriate",
      "harassment",
      "spam",
      "personal_information",
      "other"
    ]);
    JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    JOIN_CODE_LENGTH = 8;
    MAX_JOIN_CODE_GENERATION_ATTEMPTS = 8;
    MAX_TEACHER_CLASSES = 20;
    MAX_ACTIVE_LEARNERS = 100;
    JOIN_RATE_WINDOW_MS = 10 * 60 * 1e3;
    MAX_JOIN_ATTEMPTS_PER_USER = 10;
    MAX_JOIN_ATTEMPTS_PER_IP = 100;
    COMMENT_MINUTE_WINDOW_MS = 60 * 1e3;
    COMMENT_HOUR_WINDOW_MS = 60 * 60 * 1e3;
    MAX_COMMENTS_PER_MINUTE = 10;
    MAX_COMMENTS_PER_HOUR = 50;
    CLASS_CODE_ERROR = "That class code is invalid or unavailable.";
    DEFAULT_TRUSTED_CIDRS2 = [
      "173.245.48.0/20",
      "103.21.244.0/22",
      "103.22.200.0/22",
      "103.31.4.0/22",
      "141.101.64.0/18",
      "108.162.192.0/18",
      "190.93.240.0/20",
      "188.114.96.0/20",
      "197.234.240.0/22",
      "198.41.128.0/17",
      "162.158.0.0/15",
      "104.16.0.0/13",
      "104.24.0.0/14",
      "172.64.0.0/13",
      "131.0.72.0/22",
      "10.0.0.0/8",
      "172.16.0.0/12",
      "192.168.0.0/16",
      "169.254.0.0/16",
      "127.0.0.0/8",
      "::1/128"
    ];
    classroomEnabledProcedure = protectedProcedure.use(async ({ next }) => {
      if (!isClassroomEnabled()) {
        throw new import_server3.TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Guided Classroom is temporarily unavailable."
        });
      }
      return next();
    });
    classroomMemberProcedure = classroomEnabledProcedure.input(CLASSROOM_ID_INPUT).use(async ({ ctx, input, next }) => {
      const database = await requireDatabase();
      const access = await resolveClassroomAccess(
        database,
        ctx.user.id,
        input.classroomId
      );
      return next({ ctx: { ...ctx, database, classroomAccess: access } });
    });
    classroomTeacherProcedure = classroomMemberProcedure.use(
      async ({ ctx, next }) => {
        requireTeacher(ctx.classroomAccess.membership.role);
        return next({ ctx });
      }
    );
    assignmentMemberProcedure = classroomEnabledProcedure.input(ASSIGNMENT_ID_INPUT).use(async ({ ctx, input, next }) => {
      const database = await requireDatabase();
      const access = await resolveAssignmentAccess(
        database,
        ctx.user.id,
        input.assignmentId
      );
      return next({ ctx: { ...ctx, database, assignmentAccess: access } });
    });
    assignmentTeacherProcedure = assignmentMemberProcedure.use(
      async ({ ctx, next }) => {
        requireTeacher(ctx.assignmentAccess.membership.role);
        return next({ ctx });
      }
    );
    commentMemberProcedure = classroomEnabledProcedure.input(COMMENT_ID_INPUT).use(async ({ ctx, input, next }) => {
      const database = await requireDatabase();
      const access = await resolveCommentAccess(
        database,
        ctx.user.id,
        input.commentId
      );
      return next({ ctx: { ...ctx, database, commentAccess: access } });
    });
    classroomRouter = router({
      status: protectedProcedure.query(() => ({ enabled: isClassroomEnabled() })),
      create: classroomEnabledProcedure.input(
        import_zod5.z.object({
          name: CLASS_NAME_SCHEMA,
          subject: SUBJECT_SCHEMA,
          gradeLevel: GRADE_LEVEL_SCHEMA
        })
      ).mutation(async ({ ctx, input }) => {
        const database = await requireDatabase();
        const ownedRows = await database.select({ count: import_drizzle_orm6.sql`COUNT(*)` }).from(classrooms).where(
          (0, import_drizzle_orm6.and)(
            (0, import_drizzle_orm6.eq)(classrooms.teacherId, ctx.user.id),
            (0, import_drizzle_orm6.eq)(classrooms.isActive, true)
          )
        );
        if ((Number(ownedRows[0]?.count) || 0) >= MAX_TEACHER_CLASSES) {
          throw new import_server3.TRPCError({
            code: "FORBIDDEN",
            message: `You can own up to ${MAX_TEACHER_CLASSES} active classes.`
          });
        }
        for (let attempt = 0; attempt < MAX_JOIN_CODE_GENERATION_ATTEMPTS; attempt += 1) {
          const publicId = (0, import_node_crypto3.randomUUID)();
          const joinCode = generateJoinCode();
          try {
            const created = await database.transaction(async (transaction) => {
              await transaction.insert(classrooms).values({
                publicId,
                teacherId: ctx.user.id,
                name: input.name,
                joinCode,
                subject: input.subject,
                gradeLevel: input.gradeLevel ?? null
              });
              const rows = await transaction.select().from(classrooms).where((0, import_drizzle_orm6.eq)(classrooms.publicId, publicId)).limit(1);
              const classroom = rows[0];
              if (!classroom)
                throw new Error("Classroom creation did not return a record");
              await transaction.insert(classroomMembers).values({
                classroomId: classroom.id,
                userId: ctx.user.id,
                role: "teacher"
              });
              return classroom;
            });
            return classProjection(created, "teacher", 0);
          } catch (error) {
            if (isDuplicateEntry(error) && attempt < MAX_JOIN_CODE_GENERATION_ATTEMPTS - 1)
              continue;
            throw error;
          }
        }
        throw new import_server3.TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to generate a unique class code."
        });
      }),
      getMyClasses: classroomEnabledProcedure.input(import_zod5.z.object({ includeArchived: import_zod5.z.boolean().default(false) }).optional()).query(async ({ ctx, input }) => {
        const database = await requireDatabase();
        const where = input?.includeArchived ? (0, import_drizzle_orm6.eq)(classroomMembers.userId, ctx.user.id) : (0, import_drizzle_orm6.and)(
          (0, import_drizzle_orm6.eq)(classroomMembers.userId, ctx.user.id),
          (0, import_drizzle_orm6.eq)(classrooms.isActive, true)
        );
        const rows = await database.select({ classroom: classrooms, membership: classroomMembers }).from(classroomMembers).innerJoin(classrooms, (0, import_drizzle_orm6.eq)(classrooms.id, classroomMembers.classroomId)).where(where).orderBy((0, import_drizzle_orm6.desc)(classrooms.updatedAt));
        return Promise.all(
          rows.map(
            (row) => buildClassCard(database, row.classroom, row.membership)
          )
        );
      }),
      get: classroomMemberProcedure.query(async ({ ctx }) => {
        const memberCount = await countLearners(
          ctx.database,
          ctx.classroomAccess.classroom.id
        );
        return classProjection(
          ctx.classroomAccess.classroom,
          ctx.classroomAccess.membership.role,
          memberCount
        );
      }),
      getByCode: classroomEnabledProcedure.input(import_zod5.z.object({ code: import_zod5.z.string().trim().min(4).max(32) })).query(async ({ ctx, input }) => {
        const database = await requireDatabase();
        const code = normalizeJoinCode(input.code);
        const ipAddress = getClientIp2(ctx.req);
        await enforceJoinRateLimit(database, ctx.user.id, ipAddress);
        const classroom = code.length === JOIN_CODE_LENGTH ? await findClassByJoinCode(database, code) : null;
        await recordJoinAttempt(
          database,
          ctx.user.id,
          ipAddress,
          code,
          classroom ? "preview_success" : "preview_failed"
        );
        if (!classroom)
          throw new import_server3.TRPCError({ code: "NOT_FOUND", message: CLASS_CODE_ERROR });
        return {
          id: classroom.publicId,
          name: classroom.name,
          subject: classroom.subject,
          gradeLevel: classroom.gradeLevel
        };
      }),
      join: classroomEnabledProcedure.input(import_zod5.z.object({ code: import_zod5.z.string().trim().min(4).max(32) })).mutation(async ({ ctx, input }) => {
        const database = await requireDatabase();
        const code = normalizeJoinCode(input.code);
        const ipAddress = getClientIp2(ctx.req);
        await enforceJoinRateLimit(database, ctx.user.id, ipAddress);
        const classroom = code.length === JOIN_CODE_LENGTH ? await findClassByJoinCode(database, code) : null;
        if (!classroom) {
          await recordJoinAttempt(
            database,
            ctx.user.id,
            ipAddress,
            code,
            "join_failed"
          );
          throw new import_server3.TRPCError({ code: "NOT_FOUND", message: CLASS_CODE_ERROR });
        }
        const existingRows = await database.select().from(classroomMembers).where(
          (0, import_drizzle_orm6.and)(
            (0, import_drizzle_orm6.eq)(classroomMembers.classroomId, classroom.id),
            (0, import_drizzle_orm6.eq)(classroomMembers.userId, ctx.user.id)
          )
        ).limit(1);
        if (existingRows[0]) {
          await recordJoinAttempt(
            database,
            ctx.user.id,
            ipAddress,
            code,
            "already_member"
          );
          return classProjection(
            classroom,
            existingRows[0].role,
            await countLearners(database, classroom.id)
          );
        }
        if (await countLearners(database, classroom.id) >= MAX_ACTIVE_LEARNERS) {
          await recordJoinAttempt(
            database,
            ctx.user.id,
            ipAddress,
            code,
            "class_full"
          );
          throw new import_server3.TRPCError({ code: "FORBIDDEN", message: CLASS_CODE_ERROR });
        }
        try {
          await database.insert(classroomMembers).values({
            classroomId: classroom.id,
            userId: ctx.user.id,
            role: "learner"
          });
        } catch (error) {
          if (!isDuplicateEntry(error)) throw error;
        }
        await recordJoinAttempt(
          database,
          ctx.user.id,
          ipAddress,
          code,
          "join_success"
        );
        return classProjection(
          classroom,
          "learner",
          await countLearners(database, classroom.id)
        );
      }),
      leave: classroomMemberProcedure.mutation(async ({ ctx }) => {
        requireLearner(ctx.classroomAccess.membership.role);
        await ctx.database.delete(classroomMembers).where((0, import_drizzle_orm6.eq)(classroomMembers.id, ctx.classroomAccess.membership.id));
        return { success: true };
      }),
      listMembers: classroomTeacherProcedure.input(import_zod5.z.object({ cursor: CURSOR_SCHEMA, limit: PAGE_SIZE_SCHEMA })).query(async ({ ctx, input }) => {
        const cursorId = decodeCursor(input.cursor);
        const condition = (0, import_drizzle_orm6.and)(
          (0, import_drizzle_orm6.eq)(classroomMembers.classroomId, ctx.classroomAccess.classroom.id),
          cursorId === null ? void 0 : (0, import_drizzle_orm6.gt)(classroomMembers.id, cursorId)
        );
        const rows = await ctx.database.select({ membership: classroomMembers, name: users.name }).from(classroomMembers).innerJoin(users, (0, import_drizzle_orm6.eq)(users.id, classroomMembers.userId)).where(condition).orderBy((0, import_drizzle_orm6.asc)(classroomMembers.id)).limit(input.limit + 1);
        const page = rows.slice(0, input.limit);
        const learnerIds = page.filter((row) => row.membership.role === "learner").map((row) => row.membership.userId);
        const publishedRows = await ctx.database.select({ id: assignments.id }).from(assignments).where(
          (0, import_drizzle_orm6.and)(
            (0, import_drizzle_orm6.eq)(assignments.classroomId, ctx.classroomAccess.classroom.id),
            (0, import_drizzle_orm6.eq)(assignments.status, "published")
          )
        );
        const completionRows = learnerIds.length > 0 && publishedRows.length > 0 ? await ctx.database.select({
          userId: assignmentSubmissions.userId,
          count: import_drizzle_orm6.sql`COUNT(*)`
        }).from(assignmentSubmissions).where(
          (0, import_drizzle_orm6.and)(
            (0, import_drizzle_orm6.inArray)(assignmentSubmissions.userId, learnerIds),
            (0, import_drizzle_orm6.inArray)(
              assignmentSubmissions.assignmentId,
              publishedRows.map((row) => row.id)
            ),
            (0, import_drizzle_orm6.eq)(assignmentSubmissions.status, "complete")
          )
        ).groupBy(assignmentSubmissions.userId) : [];
        const completionByUser = new Map(
          completionRows.map((row) => [row.userId, Number(row.count) || 0])
        );
        return {
          items: page.map((row) => ({
            name: safeDisplayName(row.name, row.membership.role),
            role: row.membership.role,
            joinedAt: row.membership.joinedAt,
            completedAssignments: completionByUser.get(row.membership.userId) ?? 0,
            totalPublishedAssignments: publishedRows.length
          })),
          nextCursor: rows.length > input.limit ? encodeCursor(page.at(-1).membership.id) : null
        };
      }),
      rotateJoinCode: classroomTeacherProcedure.mutation(async ({ ctx }) => {
        for (let attempt = 0; attempt < MAX_JOIN_CODE_GENERATION_ATTEMPTS; attempt += 1) {
          const joinCode = generateJoinCode();
          try {
            await ctx.database.update(classrooms).set({ joinCode, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm6.eq)(classrooms.id, ctx.classroomAccess.classroom.id));
            return { joinCode };
          } catch (error) {
            if (isDuplicateEntry(error) && attempt < MAX_JOIN_CODE_GENERATION_ATTEMPTS - 1)
              continue;
            throw error;
          }
        }
        throw new import_server3.TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to rotate the class code."
        });
      }),
      archive: classroomTeacherProcedure.mutation(async ({ ctx }) => {
        await ctx.database.update(classrooms).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm6.eq)(classrooms.id, ctx.classroomAccess.classroom.id));
        return { success: true, isActive: false };
      }),
      restore: classroomTeacherProcedure.mutation(async ({ ctx }) => {
        await ctx.database.update(classrooms).set({ isActive: true, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm6.eq)(classrooms.id, ctx.classroomAccess.classroom.id));
        return { success: true, isActive: true };
      }),
      delete: classroomTeacherProcedure.input(import_zod5.z.object({ confirmationName: CLASS_NAME_SCHEMA })).mutation(async ({ ctx, input }) => {
        if (input.confirmationName !== ctx.classroomAccess.classroom.name) {
          throw new import_server3.TRPCError({
            code: "BAD_REQUEST",
            message: "The class name confirmation does not match."
          });
        }
        await ctx.database.delete(classrooms).where((0, import_drizzle_orm6.eq)(classrooms.id, ctx.classroomAccess.classroom.id));
        return { success: true };
      }),
      assignment: router({
        create: classroomTeacherProcedure.input(
          import_zod5.z.object({
            title: ASSIGNMENT_TITLE_SCHEMA,
            instructions: ASSIGNMENT_INSTRUCTIONS_SCHEMA,
            subject: SUBJECT_SCHEMA,
            dueAt: import_zod5.z.coerce.date().nullable().optional()
          })
        ).mutation(async ({ ctx, input }) => {
          requireActiveClass(ctx.classroomAccess.classroom);
          const publicId = (0, import_node_crypto3.randomUUID)();
          await ctx.database.insert(assignments).values({
            publicId,
            classroomId: ctx.classroomAccess.classroom.id,
            createdByUserId: ctx.user.id,
            title: input.title,
            instructions: input.instructions,
            subject: input.subject,
            dueAt: input.dueAt ?? null,
            status: "draft"
          });
          const rows = await ctx.database.select().from(assignments).where((0, import_drizzle_orm6.eq)(assignments.publicId, publicId)).limit(1);
          return assignmentProjection(rows[0]);
        }),
        publish: assignmentTeacherProcedure.mutation(async ({ ctx }) => {
          requireActiveClass(ctx.assignmentAccess.classroom);
          const publishedAt = ctx.assignmentAccess.assignment.publishedAt ?? /* @__PURE__ */ new Date();
          await ctx.database.update(assignments).set({ status: "published", publishedAt, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm6.eq)(assignments.id, ctx.assignmentAccess.assignment.id));
          return assignmentProjection({
            ...ctx.assignmentAccess.assignment,
            status: "published",
            publishedAt,
            updatedAt: /* @__PURE__ */ new Date()
          });
        }),
        list: classroomMemberProcedure.input(
          import_zod5.z.object({
            status: import_zod5.z.enum(["draft", "published"]).optional(),
            cursor: CURSOR_SCHEMA,
            limit: PAGE_SIZE_SCHEMA
          })
        ).query(async ({ ctx, input }) => {
          const cursorId = decodeCursor(input.cursor);
          const requestedStatus = ctx.classroomAccess.membership.role === "learner" ? "published" : input.status;
          const conditions = [
            (0, import_drizzle_orm6.eq)(assignments.classroomId, ctx.classroomAccess.classroom.id),
            cursorId === null ? void 0 : (0, import_drizzle_orm6.lt)(assignments.id, cursorId),
            requestedStatus ? (0, import_drizzle_orm6.eq)(assignments.status, requestedStatus) : void 0
          ].filter(Boolean);
          const rows = await ctx.database.select().from(assignments).where((0, import_drizzle_orm6.and)(...conditions)).orderBy((0, import_drizzle_orm6.desc)(assignments.id)).limit(input.limit + 1);
          const page = rows.slice(0, input.limit);
          let completionByAssignment = /* @__PURE__ */ new Map();
          let submissionCountByAssignment = /* @__PURE__ */ new Map();
          if (page.length > 0 && ctx.classroomAccess.membership.role === "learner") {
            const submissionRows = await ctx.database.select({
              assignmentId: assignmentSubmissions.assignmentId,
              status: assignmentSubmissions.status
            }).from(assignmentSubmissions).where(
              (0, import_drizzle_orm6.and)(
                (0, import_drizzle_orm6.eq)(assignmentSubmissions.userId, ctx.user.id),
                (0, import_drizzle_orm6.inArray)(
                  assignmentSubmissions.assignmentId,
                  page.map((assignment) => assignment.id)
                )
              )
            );
            completionByAssignment = new Map(
              submissionRows.map((row) => [
                row.assignmentId,
                row.status === "complete"
              ])
            );
          } else if (page.length > 0) {
            const countRows = await ctx.database.select({
              assignmentId: assignmentSubmissions.assignmentId,
              count: import_drizzle_orm6.sql`COUNT(*)`
            }).from(assignmentSubmissions).where(
              (0, import_drizzle_orm6.and)(
                (0, import_drizzle_orm6.inArray)(
                  assignmentSubmissions.assignmentId,
                  page.map((assignment) => assignment.id)
                ),
                (0, import_drizzle_orm6.eq)(assignmentSubmissions.status, "complete")
              )
            ).groupBy(assignmentSubmissions.assignmentId);
            submissionCountByAssignment = new Map(
              countRows.map((row) => [row.assignmentId, Number(row.count) || 0])
            );
          }
          const learnerCount = ctx.classroomAccess.membership.role === "teacher" ? await countLearners(
            ctx.database,
            ctx.classroomAccess.classroom.id
          ) : void 0;
          return {
            items: page.map((assignment) => ({
              ...assignmentProjection(assignment),
              ...ctx.classroomAccess.membership.role === "learner" ? {
                submissionStatus: completionByAssignment.get(assignment.id) ? "complete" : "pending"
              } : {
                completedSubmissions: submissionCountByAssignment.get(assignment.id) ?? 0,
                totalLearners: learnerCount ?? 0
              }
            })),
            nextCursor: rows.length > input.limit ? encodeCursor(page.at(-1).id) : null
          };
        }),
        get: assignmentMemberProcedure.query(async ({ ctx }) => {
          const base = assignmentProjection(ctx.assignmentAccess.assignment);
          if (ctx.assignmentAccess.membership.role === "learner") {
            const submissionRows = await ctx.database.select().from(assignmentSubmissions).where(
              (0, import_drizzle_orm6.and)(
                (0, import_drizzle_orm6.eq)(
                  assignmentSubmissions.assignmentId,
                  ctx.assignmentAccess.assignment.id
                ),
                (0, import_drizzle_orm6.eq)(assignmentSubmissions.userId, ctx.user.id)
              )
            ).limit(1);
            const submission = submissionRows[0];
            return {
              ...base,
              role: "learner",
              submission: submission ? {
                id: submission.publicId,
                status: submission.status,
                responseText: submission.responseText,
                submittedAt: submission.submittedAt,
                updatedAt: submission.updatedAt
              } : {
                id: null,
                status: "pending",
                responseText: null,
                submittedAt: null,
                updatedAt: null
              }
            };
          }
          const learnerCount = await countLearners(
            ctx.database,
            ctx.assignmentAccess.classroom.id
          );
          const completeRows = await ctx.database.select({ count: import_drizzle_orm6.sql`COUNT(*)` }).from(assignmentSubmissions).where(
            (0, import_drizzle_orm6.and)(
              (0, import_drizzle_orm6.eq)(
                assignmentSubmissions.assignmentId,
                ctx.assignmentAccess.assignment.id
              ),
              (0, import_drizzle_orm6.eq)(assignmentSubmissions.status, "complete")
            )
          );
          return {
            ...base,
            role: "teacher",
            completedSubmissions: Number(completeRows[0]?.count) || 0,
            totalLearners: learnerCount
          };
        }),
        update: assignmentTeacherProcedure.input(
          import_zod5.z.object({
            title: ASSIGNMENT_TITLE_SCHEMA.optional(),
            instructions: ASSIGNMENT_INSTRUCTIONS_SCHEMA.optional(),
            subject: SUBJECT_SCHEMA.optional(),
            dueAt: import_zod5.z.coerce.date().nullable().optional()
          }).refine(
            (value) => Object.keys(value).some((key) => key !== "assignmentId"),
            { message: "Provide at least one field to update." }
          )
        ).mutation(async ({ ctx, input }) => {
          requireActiveClass(ctx.assignmentAccess.classroom);
          const values = {
            updatedAt: /* @__PURE__ */ new Date()
          };
          if (input.title !== void 0) values.title = input.title;
          if (input.instructions !== void 0)
            values.instructions = input.instructions;
          if (input.subject !== void 0) values.subject = input.subject;
          if (input.dueAt !== void 0) values.dueAt = input.dueAt;
          await ctx.database.update(assignments).set(values).where((0, import_drizzle_orm6.eq)(assignments.id, ctx.assignmentAccess.assignment.id));
          const rows = await ctx.database.select().from(assignments).where((0, import_drizzle_orm6.eq)(assignments.id, ctx.assignmentAccess.assignment.id)).limit(1);
          return assignmentProjection(rows[0]);
        }),
        delete: assignmentTeacherProcedure.input(import_zod5.z.object({ confirmationTitle: ASSIGNMENT_TITLE_SCHEMA })).mutation(async ({ ctx, input }) => {
          if (input.confirmationTitle !== ctx.assignmentAccess.assignment.title) {
            throw new import_server3.TRPCError({
              code: "BAD_REQUEST",
              message: "The assignment title confirmation does not match."
            });
          }
          await ctx.database.delete(assignments).where((0, import_drizzle_orm6.eq)(assignments.id, ctx.assignmentAccess.assignment.id));
          return { success: true };
        })
      }),
      submission: router({
        upsert: assignmentMemberProcedure.input(
          import_zod5.z.object({
            status: import_zod5.z.enum(["pending", "complete"]),
            responseText: RESPONSE_TEXT_SCHEMA
          })
        ).mutation(async ({ ctx, input }) => {
          requireLearner(ctx.assignmentAccess.membership.role);
          requireActiveClass(ctx.assignmentAccess.classroom);
          if (ctx.assignmentAccess.assignment.status !== "published") {
            throw new import_server3.TRPCError({
              code: "NOT_FOUND",
              message: "Assignment not found."
            });
          }
          const submittedAt = input.status === "complete" ? /* @__PURE__ */ new Date() : null;
          const publicId = (0, import_node_crypto3.randomUUID)();
          await ctx.database.insert(assignmentSubmissions).values({
            publicId,
            assignmentId: ctx.assignmentAccess.assignment.id,
            userId: ctx.user.id,
            status: input.status,
            responseText: input.responseText ?? null,
            submittedAt
          }).onConflictDoUpdate({
            target: [assignmentSubmissions.assignmentId, assignmentSubmissions.userId],
            set: {
              status: input.status,
              responseText: input.responseText ?? null,
              submittedAt,
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
          const rows = await ctx.database.select().from(assignmentSubmissions).where(
            (0, import_drizzle_orm6.and)(
              (0, import_drizzle_orm6.eq)(
                assignmentSubmissions.assignmentId,
                ctx.assignmentAccess.assignment.id
              ),
              (0, import_drizzle_orm6.eq)(assignmentSubmissions.userId, ctx.user.id)
            )
          ).limit(1);
          const submission = rows[0];
          return {
            id: submission.publicId,
            status: submission.status,
            responseText: submission.responseText,
            submittedAt: submission.submittedAt,
            updatedAt: submission.updatedAt
          };
        }),
        getMine: assignmentMemberProcedure.query(async ({ ctx }) => {
          requireLearner(ctx.assignmentAccess.membership.role);
          const rows = await ctx.database.select().from(assignmentSubmissions).where(
            (0, import_drizzle_orm6.and)(
              (0, import_drizzle_orm6.eq)(
                assignmentSubmissions.assignmentId,
                ctx.assignmentAccess.assignment.id
              ),
              (0, import_drizzle_orm6.eq)(assignmentSubmissions.userId, ctx.user.id)
            )
          ).limit(1);
          const submission = rows[0];
          return submission ? {
            id: submission.publicId,
            status: submission.status,
            responseText: submission.responseText,
            submittedAt: submission.submittedAt,
            updatedAt: submission.updatedAt
          } : {
            id: null,
            status: "pending",
            responseText: null,
            submittedAt: null,
            updatedAt: null
          };
        }),
        listForAssignment: assignmentTeacherProcedure.input(import_zod5.z.object({ cursor: CURSOR_SCHEMA, limit: PAGE_SIZE_SCHEMA })).query(async ({ ctx, input }) => {
          const cursorId = decodeCursor(input.cursor);
          const rows = await ctx.database.select({
            membership: classroomMembers,
            name: users.name,
            submission: assignmentSubmissions
          }).from(classroomMembers).innerJoin(users, (0, import_drizzle_orm6.eq)(users.id, classroomMembers.userId)).leftJoin(
            assignmentSubmissions,
            (0, import_drizzle_orm6.and)(
              (0, import_drizzle_orm6.eq)(
                assignmentSubmissions.assignmentId,
                ctx.assignmentAccess.assignment.id
              ),
              (0, import_drizzle_orm6.eq)(assignmentSubmissions.userId, classroomMembers.userId)
            )
          ).where(
            (0, import_drizzle_orm6.and)(
              (0, import_drizzle_orm6.eq)(
                classroomMembers.classroomId,
                ctx.assignmentAccess.classroom.id
              ),
              (0, import_drizzle_orm6.eq)(classroomMembers.role, "learner"),
              cursorId === null ? void 0 : (0, import_drizzle_orm6.gt)(classroomMembers.id, cursorId)
            )
          ).orderBy((0, import_drizzle_orm6.asc)(classroomMembers.id)).limit(input.limit + 1);
          const page = rows.slice(0, input.limit);
          return {
            items: page.map((row) => ({
              learnerName: safeDisplayName(row.name, "learner"),
              joinedAt: row.membership.joinedAt,
              status: row.submission?.status ?? "pending",
              responseText: row.submission?.responseText ?? null,
              submittedAt: row.submission?.submittedAt ?? null,
              updatedAt: row.submission?.updatedAt ?? null
            })),
            nextCursor: rows.length > input.limit ? encodeCursor(page.at(-1).membership.id) : null
          };
        })
      }),
      comment: router({
        list: assignmentMemberProcedure.input(import_zod5.z.object({ cursor: CURSOR_SCHEMA, limit: PAGE_SIZE_SCHEMA })).query(async ({ ctx, input }) => {
          const cursorId = decodeCursor(input.cursor);
          const rows = await ctx.database.select({ comment: assignmentComments, authorName: users.name }).from(assignmentComments).innerJoin(users, (0, import_drizzle_orm6.eq)(users.id, assignmentComments.authorUserId)).where(
            (0, import_drizzle_orm6.and)(
              (0, import_drizzle_orm6.eq)(
                assignmentComments.assignmentId,
                ctx.assignmentAccess.assignment.id
              ),
              cursorId === null ? void 0 : (0, import_drizzle_orm6.gt)(assignmentComments.id, cursorId)
            )
          ).orderBy((0, import_drizzle_orm6.asc)(assignmentComments.id)).limit(input.limit + 1);
          const page = rows.slice(0, input.limit);
          return {
            items: page.map((row) => ({
              id: row.comment.publicId,
              authorName: safeDisplayName(
                row.authorName,
                row.comment.authorUserId === ctx.assignmentAccess.classroom.teacherId ? "teacher" : "learner"
              ),
              isMine: row.comment.authorUserId === ctx.user.id,
              isDeleted: row.comment.isDeleted,
              body: row.comment.isDeleted ? null : row.comment.body,
              moderationReason: row.comment.isDeleted ? row.comment.moderationReason : null,
              createdAt: row.comment.createdAt,
              updatedAt: row.comment.updatedAt
            })),
            nextCursor: rows.length > input.limit ? encodeCursor(page.at(-1).comment.id) : null
          };
        }),
        add: assignmentMemberProcedure.input(import_zod5.z.object({ body: COMMENT_BODY_SCHEMA })).mutation(async ({ ctx, input }) => {
          requireActiveClass(ctx.assignmentAccess.classroom);
          if (ctx.assignmentAccess.assignment.status !== "published") {
            throw new import_server3.TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Publish the assignment before starting a discussion."
            });
          }
          await enforceCommentRateLimit(ctx.database, ctx.user.id);
          const publicId = (0, import_node_crypto3.randomUUID)();
          await ctx.database.insert(assignmentComments).values({
            publicId,
            assignmentId: ctx.assignmentAccess.assignment.id,
            authorUserId: ctx.user.id,
            body: input.body
          });
          const rows = await ctx.database.select().from(assignmentComments).where((0, import_drizzle_orm6.eq)(assignmentComments.publicId, publicId)).limit(1);
          const comment = rows[0];
          return {
            id: comment.publicId,
            authorName: safeDisplayName(
              ctx.user.name,
              ctx.assignmentAccess.membership.role
            ),
            isMine: true,
            isDeleted: false,
            body: comment.body,
            moderationReason: null,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt
          };
        }),
        delete: commentMemberProcedure.mutation(async ({ ctx }) => {
          if (ctx.commentAccess.comment.authorUserId !== ctx.user.id) {
            throw new import_server3.TRPCError({
              code: "FORBIDDEN",
              message: "You can remove only your own comment."
            });
          }
          if (!ctx.commentAccess.comment.isDeleted) {
            await ctx.database.update(assignmentComments).set({
              body: "",
              isDeleted: true,
              deletedAt: /* @__PURE__ */ new Date(),
              deletedByUserId: ctx.user.id,
              moderationReason: "author_removed",
              updatedAt: /* @__PURE__ */ new Date()
            }).where((0, import_drizzle_orm6.eq)(assignmentComments.id, ctx.commentAccess.comment.id));
          }
          return { success: true };
        }),
        moderate: commentMemberProcedure.input(import_zod5.z.object({ reason: MODERATION_REASON_SCHEMA })).mutation(async ({ ctx, input }) => {
          requireTeacher(ctx.commentAccess.membership.role);
          if (!ctx.commentAccess.comment.isDeleted) {
            await ctx.database.update(assignmentComments).set({
              body: "",
              isDeleted: true,
              deletedAt: /* @__PURE__ */ new Date(),
              deletedByUserId: ctx.user.id,
              moderationReason: input.reason,
              updatedAt: /* @__PURE__ */ new Date()
            }).where((0, import_drizzle_orm6.eq)(assignmentComments.id, ctx.commentAccess.comment.id));
          }
          return { success: true };
        })
      }),
      progress: router({
        getClassSummary: classroomTeacherProcedure.query(async ({ ctx }) => {
          const learnerRows = await ctx.database.select({ userId: classroomMembers.userId }).from(classroomMembers).where(
            (0, import_drizzle_orm6.and)(
              (0, import_drizzle_orm6.eq)(classroomMembers.classroomId, ctx.classroomAccess.classroom.id),
              (0, import_drizzle_orm6.eq)(classroomMembers.role, "learner")
            )
          );
          const assignmentRows = await ctx.database.select({
            id: assignments.id,
            publicId: assignments.publicId,
            title: assignments.title,
            dueAt: assignments.dueAt
          }).from(assignments).where(
            (0, import_drizzle_orm6.and)(
              (0, import_drizzle_orm6.eq)(assignments.classroomId, ctx.classroomAccess.classroom.id),
              (0, import_drizzle_orm6.eq)(assignments.status, "published")
            )
          ).orderBy((0, import_drizzle_orm6.asc)(assignments.dueAt), (0, import_drizzle_orm6.asc)(assignments.id));
          const submissionRows = learnerRows.length > 0 && assignmentRows.length > 0 ? await ctx.database.select({
            assignmentId: assignmentSubmissions.assignmentId,
            userId: assignmentSubmissions.userId,
            status: assignmentSubmissions.status
          }).from(assignmentSubmissions).where(
            (0, import_drizzle_orm6.and)(
              (0, import_drizzle_orm6.inArray)(
                assignmentSubmissions.assignmentId,
                assignmentRows.map((assignment) => assignment.id)
              ),
              (0, import_drizzle_orm6.inArray)(
                assignmentSubmissions.userId,
                learnerRows.map((learner) => learner.userId)
              )
            )
          ) : [];
          const completedPairs = new Set(
            submissionRows.filter((row) => row.status === "complete").map((row) => `${row.assignmentId}:${row.userId}`)
          );
          const expected = learnerRows.length * assignmentRows.length;
          const completed = completedPairs.size;
          const now = Date.now();
          const overdue = assignmentRows.reduce((total, assignment) => {
            if (!assignment.dueAt || assignment.dueAt.getTime() >= now)
              return total;
            return total + learnerRows.filter(
              (learner) => !completedPairs.has(`${assignment.id}:${learner.userId}`)
            ).length;
          }, 0);
          return {
            learnerCount: learnerRows.length,
            publishedAssignmentCount: assignmentRows.length,
            expectedSubmissions: expected,
            completedSubmissions: completed,
            pendingSubmissions: Math.max(0, expected - completed),
            overdueSubmissions: overdue,
            completionPercent: expected === 0 ? 0 : Math.round(completed / expected * 100),
            assignments: assignmentRows.map((assignment) => {
              const completeCount = learnerRows.filter(
                (learner) => completedPairs.has(`${assignment.id}:${learner.userId}`)
              ).length;
              return {
                id: assignment.publicId,
                title: assignment.title,
                dueAt: assignment.dueAt,
                completed: completeCount,
                pending: Math.max(0, learnerRows.length - completeCount),
                overdue: Boolean(
                  assignment.dueAt && assignment.dueAt.getTime() < now
                ) ? Math.max(0, learnerRows.length - completeCount) : 0
              };
            })
          };
        }),
        getMine: classroomMemberProcedure.query(async ({ ctx }) => {
          requireLearner(ctx.classroomAccess.membership.role);
          const assignmentRows = await ctx.database.select({
            id: assignments.id,
            publicId: assignments.publicId,
            title: assignments.title,
            dueAt: assignments.dueAt
          }).from(assignments).where(
            (0, import_drizzle_orm6.and)(
              (0, import_drizzle_orm6.eq)(assignments.classroomId, ctx.classroomAccess.classroom.id),
              (0, import_drizzle_orm6.eq)(assignments.status, "published")
            )
          ).orderBy((0, import_drizzle_orm6.asc)(assignments.dueAt), (0, import_drizzle_orm6.asc)(assignments.id));
          const submissionRows = assignmentRows.length > 0 ? await ctx.database.select({
            assignmentId: assignmentSubmissions.assignmentId,
            status: assignmentSubmissions.status
          }).from(assignmentSubmissions).where(
            (0, import_drizzle_orm6.and)(
              (0, import_drizzle_orm6.eq)(assignmentSubmissions.userId, ctx.user.id),
              (0, import_drizzle_orm6.inArray)(
                assignmentSubmissions.assignmentId,
                assignmentRows.map((assignment) => assignment.id)
              )
            )
          ) : [];
          const completeIds = new Set(
            submissionRows.filter((row) => row.status === "complete").map((row) => row.assignmentId)
          );
          const now = Date.now();
          const items = assignmentRows.map((assignment) => {
            const status = completeIds.has(assignment.id) ? "complete" : "pending";
            return {
              id: assignment.publicId,
              title: assignment.title,
              dueAt: assignment.dueAt,
              status,
              isOverdue: status === "pending" && Boolean(assignment.dueAt && assignment.dueAt.getTime() < now)
            };
          });
          const completed = items.filter(
            (item) => item.status === "complete"
          ).length;
          const pending = items.length - completed;
          const overdue = items.filter((item) => item.isOverdue).length;
          const nextDue = items.find(
            (item) => item.status === "pending" && item.dueAt && item.dueAt.getTime() >= now
          ) ?? null;
          return {
            completed,
            pending,
            overdue,
            completionPercent: items.length === 0 ? 0 : Math.round(completed / items.length * 100),
            nextDue,
            assignments: items
          };
        })
      })
    });
    CLEANUP_INTERVAL_MS2 = 30 * 60 * 1e3;
    LOCK_TTL_MS2 = 35 * 60 * 1e3;
    JOIN_AUDIT_RETENTION_MS = 24 * 60 * 60 * 1e3;
    CLEANUP_INSTANCE_ID = `${(0, import_node_os.hostname)()}-${process.pid}`;
    cleanupStarted = false;
    classroomInternals = {
      normalizeJoinCode,
      hashJoinCode,
      generateJoinCode,
      encodeCursor,
      decodeCursor,
      isClassroomEnabled
    };
  }
});

// server/_core/index.ts
var import_config = require("dotenv/config");

// server/_core/sentry-server.ts
var Sentry = __toESM(require("@sentry/node"));
init_env();
var DSN = process.env.SENTRY_DSN ?? process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";
function resolveSentryEnvironment(env = process.env) {
  return env.SENTRY_ENVIRONMENT?.trim() || env.RAILWAY_ENVIRONMENT_NAME?.trim() || (env.NODE_ENV === "production" ? "production" : "development");
}
function resolveSentryRelease(env = process.env) {
  const version = env.APP_VERSION?.trim() || env.RELEASE_VERSION?.trim();
  return version ? `tutorsnap-api@${version}` : void 0;
}
function initSentryServer() {
  if (!DSN) {
    if (!ENV.isProduction) {
      console.log("[Sentry Server] SENTRY_DSN not set \u2014 Sentry server disabled");
    }
    return;
  }
  Sentry.init({
    dsn: DSN,
    environment: resolveSentryEnvironment(),
    release: resolveSentryRelease(),
    enabled: ENV.isProduction,
    tracesSampleRate: ENV.isProduction ? 0.1 : 1
  });
}
function captureServerError(error, context) {
  if (!DSN) return;
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

// server/_core/index.ts
var import_express = __toESM(require("express"));
var import_http = require("http");
var import_express2 = require("@trpc/server/adapters/express");

// server/_core/oauth.ts
init_const();
init_db();

// server/_core/cookies.ts
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1"]);
function isIpAddress(host) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getParentDomain(hostname3) {
  if (LOCAL_HOSTS.has(hostname3) || isIpAddress(hostname3)) {
    return void 0;
  }
  const parts = hostname3.split(".");
  if (parts.length < 3) {
    return void 0;
  }
  return "." + parts.slice(-2).join(".");
}
function getSessionCookieOptions(req) {
  const hostname3 = req.hostname;
  const domain = getParentDomain(hostname3);
  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/oauth.ts
init_sdk();
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
async function syncUser(userInfo) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }
  const lastSignedIn = /* @__PURE__ */ new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return saved ?? {
    openId: userInfo.openId,
    name: userInfo.name,
    email: userInfo.email,
    loginMethod: userInfo.loginMethod ?? null,
    lastSignedIn
  };
}
function buildUserResponse(user) {
  return {
    id: user?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? /* @__PURE__ */ new Date()).toISOString()
  };
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      let frontendUrl = "http://localhost:8081";
      if (process.env.NODE_ENV === "production") {
        frontendUrl = "https://tutorsnapai.tech";
      } else {
        frontendUrl = process.env.EXPO_WEB_PREVIEW_URL || process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081";
      }
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
  app.get("/api/oauth/mobile", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user)
      });
    } catch (error) {
      console.error("[OAuth] Mobile exchange failed", error);
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });
  app.post("/api/auth/session", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}

// server/_core/storageProxy.ts
init_env();
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/storage.ts
init_env();
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}

// server/_core/voiceUpload.ts
function registerVoiceUploadRoute(app) {
  app.post("/api/voice/upload", async (req, res) => {
    try {
      const { base64, mimeType = "audio/m4a" } = req.body;
      if (!base64) {
        return res.status(400).json({ error: "Missing base64 audio data" });
      }
      const buffer = Buffer.from(base64, "base64");
      const ext = mimeType.split("/")[1]?.split(";")[0] || "m4a";
      const filename = `voice_${Date.now()}.${ext}`;
      const { url } = await storagePut(`voice/${filename}`, buffer, mimeType);
      const host = req.headers.host || "localhost:3000";
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const absoluteUrl = `${protocol}://${host}${url}`;
      return res.json({ url: absoluteUrl });
    } catch (err) {
      console.error("[voice/upload]", err);
      return res.status(500).json({ error: err?.message || "Upload failed" });
    }
  });
}

// server/_core/index.ts
init_chatStream();

// server/_core/mathRender.ts
var mjReady = false;
var mjInitPromise = null;
function getMathJax() {
  const mj = require("mathjax-node");
  if (mjReady) return Promise.resolve(mj);
  if (!mjInitPromise) {
    mjInitPromise = new Promise((resolve, reject) => {
      mj.config({
        MathJax: {
          SVG: { font: "TeX", blacker: 0, matchFontHeight: false },
          tex2jax: { processEscapes: true }
        }
      });
      mj.start();
      mjReady = true;
      resolve();
    });
  }
  return mjInitPromise.then(() => mj);
}
var CACHE_MAX = 500;
var cache = /* @__PURE__ */ new Map();
function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== void 0) cache.delete(firstKey);
  }
  cache.set(key, value);
}
function registerMathRenderRoute(app) {
  app.get("/api/math/svg", async (req, res) => {
    const latex = req.query.latex ?? "";
    const display = req.query.display === "1" || req.query.display === "true";
    if (!latex.trim()) {
      return res.status(400).json({ error: "Missing latex parameter" });
    }
    const cacheKey = `${display ? "D" : "I"}:${latex}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader("X-Math-Cache", "hit");
      return res.json(cached);
    }
    try {
      const mj = await getMathJax();
      const result = await new Promise((resolve, reject) => {
        mj.typeset(
          {
            math: latex,
            format: display ? "TeX" : "inline-TeX",
            svg: true,
            speakText: false
          },
          (data) => {
            if (data.errors) reject(new Error(data.errors.join(", ")));
            else resolve(data);
          }
        );
      });
      const svgStr = result.svg ?? "";
      const wMatch = svgStr.match(/width="([^"]+)ex"/);
      const hMatch = svgStr.match(/height="([^"]+)ex"/);
      const exPx = 8;
      const width = wMatch ? Math.ceil(parseFloat(wMatch[1]) * exPx) : 200;
      const height = hMatch ? Math.ceil(parseFloat(hMatch[1]) * exPx) : 40;
      const payload = { svg: svgStr, width, height };
      cacheSet(cacheKey, payload);
      res.setHeader("X-Math-Cache", "miss");
      return res.json(payload);
    } catch (err) {
      console.error("[MathRender] Error:", err.message);
      return res.status(422).json({ error: err.message ?? "Render failed" });
    }
  });
}

// server/_core/classroomAcceptanceRoute.ts
var import_node_crypto2 = require("node:crypto");

// server/_core/classroom-acceptance-core.ts
var import_node_crypto = require("node:crypto");
var import_client = require("@trpc/client");
var import_pg2 = require("pg");
var import_superjson = __toESM(require("superjson"));
init_sdk();
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
  await pool.query(
    `INSERT INTO users ("openId", name, email, "loginMethod", role, "lastSignedIn")
     VALUES ($1, $2, $3, 'email', 'user', CURRENT_TIMESTAMP)
     ON CONFLICT ("openId") DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       "loginMethod" = 'email',
       role = 'user',
       "lastSignedIn" = CURRENT_TIMESTAMP`,
    [identity.openId, identity.name, identity.email]
  );
}
async function removeIdentities(pool, identities) {
  const placeholders = identities.map((_, index2) => `$${index2 + 1}`).join(", ");
  await pool.query(
    `DELETE FROM users WHERE "openId" IN (${placeholders})`,
    identities.map((identity) => identity.openId)
  );
}
async function runClassroomAcceptance() {
  const target = process.env.CLASSROOM_ACCEPTANCE_TARGET;
  assert(
    target === "staging",
    "Refusing to run outside an explicit staging target"
  );
  assert(
    process.env.CLASSROOM_MVP_ENABLED === "true",
    "CLASSROOM_MVP_ENABLED must be true in staging before acceptance"
  );
  const databaseUrl = process.env.CLASSROOM_ACCEPTANCE_DATABASE_URL || process.env.DATABASE_URL;
  assert(
    databaseUrl,
    "A staging database URL is required for isolated test identities"
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
  const pool = new import_pg2.Pool({
    connectionString: databaseUrl,
    max: 2,
    connectionTimeoutMillis: 15e3,
    ssl: process.env.DATABASE_SSL === "false" ? void 0 : { rejectUnauthorized: false }
  });
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
    return evidence;
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

// server/_core/classroomAcceptanceRoute.ts
var acceptanceStarted = false;
function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return (0, import_node_crypto2.timingSafeEqual)(leftBuffer, rightBuffer);
}
function readBearerToken(req) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}
function isStagingAcceptanceWindowOpen() {
  if (process.env.CLASSROOM_ACCEPTANCE_ENDPOINT_ENABLED !== "true")
    return false;
  if (process.env.CLASSROOM_ACCEPTANCE_TARGET !== "staging") return false;
  if (process.env.CLASSROOM_MVP_ENABLED !== "true") return false;
  const railwayEnvironment = process.env.RAILWAY_ENVIRONMENT_NAME?.trim().toLowerCase();
  if (railwayEnvironment && railwayEnvironment !== "staging") return false;
  const apiBaseUrl = process.env.CLASSROOM_ACCEPTANCE_API_BASE_URL?.trim() ?? "";
  if (!apiBaseUrl.includes("api-staging")) return false;
  const expiresAt = Date.parse(
    process.env.CLASSROOM_ACCEPTANCE_EXPIRES_AT ?? ""
  );
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  const secret = process.env.CLASSROOM_ACCEPTANCE_SECRET?.trim() ?? "";
  return secret.length >= 32;
}
function registerClassroomAcceptanceRoute(app) {
  app.post("/api/internal/classroom-acceptance", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isStagingAcceptanceWindowOpen()) {
      res.status(404).json({ ok: false, error: "Not found" });
      return;
    }
    const expectedSecret = process.env.CLASSROOM_ACCEPTANCE_SECRET.trim();
    const providedSecret = readBearerToken(req);
    if (!providedSecret || !safeEqual(providedSecret, expectedSecret)) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    if (acceptanceStarted) {
      res.status(409).json({
        ok: false,
        error: "The staging acceptance flow has already been started on this deployment"
      });
      return;
    }
    acceptanceStarted = true;
    try {
      const evidence = await runClassroomAcceptance();
      res.json({ ok: true, evidence });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Classroom Acceptance] Staging flow failed:", message);
      res.status(500).json({ ok: false, error: message });
    }
  });
}

// server/routers.ts
var import_zod6 = require("zod");
init_trpc();
init_db();
init_schema();
var import_drizzle_orm7 = require("drizzle-orm");

// server/_core/llm.ts
init_env();
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error("tool_choice 'required' was provided but no tools were configured");
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl2 = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error("responseFormat json_schema requires a defined schema object");
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init2) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init2);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    temperature,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  if (typeof temperature === "number") {
    payload.temperature = temperature;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl2(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`);
  }
  return await response.json();
}

// server/_core/systemRouter.ts
var import_zod = require("zod");
init_notification();
init_trpc();
var systemRouter = router({
  health: publicProcedure.input(
    import_zod.z.object({
      timestamp: import_zod.z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    import_zod.z.object({
      title: import_zod.z.string().min(1, "title is required"),
      content: import_zod.z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/referrals.ts
init_trpc();
var import_zod2 = require("zod");
init_db();
init_schema();
var import_drizzle_orm3 = require("drizzle-orm");

// server/services/fraud-detection.ts
init_db();
init_schema();
var import_drizzle_orm2 = require("drizzle-orm");
async function checkRapidRedemption(userId) {
  const db2 = await getDb();
  if (!db2) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1e3);
  const recentRedemptions = await db2.select().from(redemptionHistory).where(
    (0, import_drizzle_orm2.and)(
      (0, import_drizzle_orm2.eq)(redemptionHistory.userId, userId),
      (0, import_drizzle_orm2.gte)(redemptionHistory.createdAt, fiveMinutesAgo),
      (0, import_drizzle_orm2.eq)(redemptionHistory.success, true)
    )
  );
  return recentRedemptions.length > 3;
}
async function checkMultipleIPs(userId, currentIP) {
  if (!currentIP) return false;
  const db2 = await getDb();
  if (!db2) return false;
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1e3);
  const redemptions = await db2.select().from(redemptionHistory).where(
    (0, import_drizzle_orm2.and)(
      (0, import_drizzle_orm2.eq)(redemptionHistory.userId, userId),
      (0, import_drizzle_orm2.gte)(redemptionHistory.createdAt, last24Hours)
    )
  );
  const uniqueIPs = new Set(
    redemptions.filter((r) => r.ipAddress).map((r) => r.ipAddress)
  );
  return uniqueIPs.size > 5;
}
async function checkSuspiciousDevices(userId) {
  const db2 = await getDb();
  if (!db2) return false;
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1e3);
  const redemptions = await db2.select().from(redemptionHistory).where(
    (0, import_drizzle_orm2.and)(
      (0, import_drizzle_orm2.eq)(redemptionHistory.userId, userId),
      (0, import_drizzle_orm2.gte)(redemptionHistory.createdAt, last24Hours)
    )
  );
  const uniqueDevices = new Set(
    redemptions.filter((r) => r.deviceId).map((r) => r.deviceId)
  );
  return uniqueDevices.size > 10;
}
async function checkHighValueCodeAbuse(code, userId) {
  const db2 = await getDb();
  if (!db2) return false;
  const last1Hour = new Date(Date.now() - 60 * 60 * 1e3);
  const recentAttempts = await db2.select().from(redemptionHistory).where(
    (0, import_drizzle_orm2.and)(
      (0, import_drizzle_orm2.eq)(redemptionHistory.code, code),
      (0, import_drizzle_orm2.gte)(redemptionHistory.createdAt, last1Hour)
    )
  );
  return recentAttempts.length > 10;
}
async function checkFraud(context) {
  const alerts = [];
  let severity = "low";
  if (await checkRapidRedemption(context.userId)) {
    alerts.push("rapid_redemption");
    severity = "high";
  }
  if (await checkMultipleIPs(context.userId, context.ipAddress)) {
    alerts.push("multiple_ips");
    severity = "high";
  }
  if (await checkSuspiciousDevices(context.userId)) {
    alerts.push("suspicious_devices");
    severity = "critical";
  }
  if (await checkHighValueCodeAbuse(context.code, context.userId)) {
    alerts.push("high_value_code_abuse");
    severity = "critical";
  }
  const shouldBlock = severity === "critical" || alerts.length > 2;
  if (alerts.length > 0) {
    await logFraudAlert({
      userId: context.userId,
      alertType: alerts.join(","),
      ipAddress: context.ipAddress,
      deviceId: context.deviceId,
      severity,
      description: `Fraud detected: ${alerts.join(", ")}`
    });
  }
  return {
    isFraudulent: alerts.length > 0,
    severity,
    alerts,
    shouldBlock
  };
}
async function logFraudAlert(alert) {
  try {
    const db2 = await getDb();
    if (!db2) return;
    await db2.insert(fraudAlerts).values({
      userId: alert.userId,
      alertType: alert.alertType,
      ipAddress: alert.ipAddress,
      deviceId: alert.deviceId,
      severity: alert.severity,
      description: alert.description,
      resolved: false
    });
  } catch (error) {
    console.error("Failed to log fraud alert:", error);
  }
}
async function logRedemptionAttempt(context) {
  try {
    const db2 = await getDb();
    if (!db2) return;
    await db2.insert(redemptionHistory).values({
      userId: context.userId,
      code: context.code,
      ipAddress: context.ipAddress,
      deviceId: context.deviceId,
      userAgent: context.userAgent,
      success: context.success,
      failureReason: context.failureReason
    });
  } catch (error) {
    console.error("Failed to log redemption attempt:", error);
  }
}

// server/routers/referrals.ts
var referralRouter = router({
  /**
   * Validate a referral code
   */
  validateCode: publicProcedure.input(import_zod2.z.object({ code: import_zod2.z.string().min(5).max(20), userId: import_zod2.z.number(), ipAddress: import_zod2.z.string().optional(), deviceId: import_zod2.z.string().optional() })).mutation(async ({ input }) => {
    try {
      const db2 = await getDb();
      if (!db2) {
        return {
          valid: false,
          message: "Database unavailable. Please try again later.",
          freeDaysReward: 0
        };
      }
      const codeUpper = input.code.toUpperCase().trim();
      const fraudCheck = await checkFraud({
        userId: input.userId,
        code: codeUpper,
        ipAddress: input.ipAddress,
        deviceId: input.deviceId
      });
      if (fraudCheck.shouldBlock) {
        await logRedemptionAttempt({
          userId: input.userId,
          code: codeUpper,
          ipAddress: input.ipAddress,
          deviceId: input.deviceId,
          success: false,
          failureReason: "Fraud detected"
        });
        return {
          valid: false,
          message: "This account has been flagged for suspicious activity. Please contact support.",
          freeDaysReward: 0
        };
      }
      const codeData = await db2.select().from(referralCodes).where((0, import_drizzle_orm3.eq)(referralCodes.code, codeUpper)).limit(1);
      if (codeData.length === 0) {
        return {
          valid: false,
          message: "Invalid referral code",
          freeDaysReward: 0
        };
      }
      const code = codeData[0];
      if (/* @__PURE__ */ new Date() > code.expiresAt) {
        return {
          valid: false,
          message: "Referral code has expired",
          freeDaysReward: 0
        };
      }
      if (code.uses >= code.maxUses) {
        return {
          valid: false,
          message: "Referral code has reached maximum uses",
          freeDaysReward: 0
        };
      }
      await db2.update(referralCodes).set({ uses: code.uses + 1 }).where((0, import_drizzle_orm3.eq)(referralCodes.id, code.id));
      await logRedemptionAttempt({
        userId: input.userId,
        code: codeUpper,
        ipAddress: input.ipAddress,
        deviceId: input.deviceId,
        success: true
      });
      return {
        valid: true,
        message: "Referral code validated successfully",
        freeDaysReward: 7
      };
    } catch (error) {
      console.error("Referral code validation error:", error);
      return {
        valid: false,
        message: "Error validating referral code",
        freeDaysReward: 0
      };
    }
  }),
  /**
   * Generate a new referral code for a user
   */
  generateCode: publicProcedure.input(import_zod2.z.object({ userId: import_zod2.z.number() })).mutation(async ({ input }) => {
    try {
      const db2 = await getDb();
      if (!db2) {
        return {
          success: false,
          code: null,
          message: "Database unavailable"
        };
      }
      const timestamp2 = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `${timestamp2}${random}`;
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3);
      await db2.insert(referralCodes).values({
        code,
        userId: input.userId,
        uses: 0,
        maxUses: 999,
        expiresAt
      });
      return {
        success: true,
        code,
        message: "Referral code generated successfully"
      };
    } catch (error) {
      console.error("Referral code generation error:", error);
      return {
        success: false,
        code: null,
        message: "Error generating referral code"
      };
    }
  }),
  /**
   * Get referral code stats
   */
  getCodeStats: publicProcedure.input(import_zod2.z.object({ code: import_zod2.z.string() })).query(async ({ input }) => {
    try {
      const db2 = await getDb();
      if (!db2) {
        return {
          found: false,
          uses: 0,
          maxUses: 0,
          remaining: 0,
          expiresAt: null
        };
      }
      const codeData = await db2.select().from(referralCodes).where((0, import_drizzle_orm3.eq)(referralCodes.code, input.code.toUpperCase())).limit(1);
      if (codeData.length === 0) {
        return {
          found: false,
          uses: 0,
          maxUses: 0,
          remaining: 0,
          expiresAt: null
        };
      }
      const code = codeData[0];
      return {
        found: true,
        uses: code.uses,
        maxUses: code.maxUses,
        remaining: code.maxUses - code.uses,
        expiresAt: code.expiresAt.toISOString()
      };
    } catch (error) {
      console.error("Referral stats error:", error);
      return {
        found: false,
        uses: 0,
        maxUses: 0,
        remaining: 0,
        expiresAt: null
      };
    }
  }),
  /**
   * Get user's referral codes
   */
  getUserCodes: publicProcedure.input(import_zod2.z.object({ userId: import_zod2.z.number() })).query(async ({ input }) => {
    try {
      const db2 = await getDb();
      if (!db2) {
        return {
          success: false,
          codes: []
        };
      }
      const codes = await db2.select().from(referralCodes).where((0, import_drizzle_orm3.eq)(referralCodes.userId, input.userId));
      return {
        success: true,
        codes: codes.map((c) => ({
          code: c.code,
          uses: c.uses,
          maxUses: c.maxUses,
          remaining: c.maxUses - c.uses,
          expiresAt: c.expiresAt.toISOString(),
          createdAt: c.createdAt.toISOString()
        }))
      };
    } catch (error) {
      console.error("Get user codes error:", error);
      return {
        success: false,
        codes: []
      };
    }
  })
});

// server/routers/oauth.ts
init_trpc();
var import_zod3 = require("zod");
init_db();
init_schema();
var import_drizzle_orm4 = require("drizzle-orm");
init_sdk();
async function verifyGoogleToken(idToken) {
  try {
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload) {
      console.error("[OAuth] Google token payload is empty");
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email || "",
      name: payload.name || "",
      picture: payload.picture
    };
  } catch (error) {
    console.error("[OAuth] Google token verification failed:", error);
    return null;
  }
}
async function verifyAppleToken(idToken, clientId) {
  try {
    const appleSignin = await import("apple-signin-auth");
    const verifyFn = (
      // The library exports either a default object or named exports
      typeof appleSignin.default?.verifyIdToken === "function" ? appleSignin.default.verifyIdToken.bind(appleSignin.default) : typeof appleSignin.verifyIdToken === "function" ? appleSignin.verifyIdToken : null
    );
    if (!verifyFn) {
      console.error("[OAuth] apple-signin-auth: verifyIdToken not found");
      return null;
    }
    const audience = clientId || process.env.APPLE_BUNDLE_ID || void 0;
    if (!audience) {
      console.error(
        "[OAuth] APPLE_BUNDLE_ID is not set. Set it to your iOS bundle ID (e.g. com.tutorsnap.app) to verify Apple tokens."
      );
      return null;
    }
    const payload = await verifyFn(idToken, {
      audience,
      ignoreExpiration: false
    });
    if (!payload || !payload.sub) {
      console.error("[OAuth] Apple token payload missing 'sub'");
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email || "",
      name: ""
      // Apple only sends name on first sign-in (passed separately by client)
    };
  } catch (error) {
    console.error("[OAuth] Apple token verification failed:", error);
    return null;
  }
}
async function validateOAuthToken(provider, idToken, clientId) {
  try {
    if (!idToken || idToken.length < 10) {
      console.error(`[OAuth] Invalid token format for ${provider}`);
      return null;
    }
    if (provider === "google") {
      return await verifyGoogleToken(idToken);
    } else if (provider === "apple") {
      return await verifyAppleToken(idToken, clientId);
    } else {
      console.error(`[OAuth] Unknown provider: ${provider}`);
      return null;
    }
  } catch (error) {
    console.error(`[OAuth] Token validation failed:`, error);
    return null;
  }
}
var oauthRouter = router({
  /**
   * Validate OAuth credentials and create/update user
   */
  validate: publicProcedure.input(
    import_zod3.z.object({
      provider: import_zod3.z.enum(["google", "apple"]),
      idToken: import_zod3.z.string().min(10),
      accessToken: import_zod3.z.string().optional(),
      email: import_zod3.z.string().email().optional(),
      name: import_zod3.z.string().optional(),
      photoUrl: import_zod3.z.string().url().optional(),
      // For Apple: pass the iOS bundle ID so the audience check passes
      clientId: import_zod3.z.string().optional()
    })
  ).mutation(async ({ input }) => {
    try {
      const db2 = await getDb();
      if (!db2) {
        return {
          success: false,
          error: "Database unavailable"
        };
      }
      const oauthUser = await validateOAuthToken(input.provider, input.idToken, input.clientId);
      if (!oauthUser) {
        return {
          success: false,
          error: "Invalid OAuth token"
        };
      }
      const email = input.email || oauthUser.email;
      const name = input.name || oauthUser.name;
      const openId = `${input.provider}:${oauthUser.id}`;
      let existingUser = await db2.select().from(users).where((0, import_drizzle_orm4.eq)(users.openId, openId)).limit(1);
      let user;
      if (existingUser.length > 0) {
        user = existingUser[0];
      } else {
        const result = await db2.insert(users).values({
          openId,
          email: email || null,
          name: name || null,
          loginMethod: input.provider,
          lastSignedIn: /* @__PURE__ */ new Date()
        });
        const newUser = await db2.select().from(users).where((0, import_drizzle_orm4.eq)(users.openId, openId)).limit(1);
        user = newUser[0];
      }
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || ""
      });
      return {
        success: true,
        token: sessionToken,
        user: {
          id: user.id,
          openId: user.openId,
          name: user.name,
          email: user.email,
          profilePhoto: user.profilePhoto,
          loginMethod: user.loginMethod
        }
      };
    } catch (error) {
      console.error("[OAuth] Validation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "OAuth validation failed"
      };
    }
  }),
  /**
   * Revoke OAuth tokens on logout.
   * For Google: calls https://oauth2.googleapis.com/revoke with the access token.
   * For Apple: Apple does not provide a public token revocation endpoint for native apps;
   *   the token expires naturally after 10 minutes (access) / 6 months (refresh).
   *   Revocation is handled client-side by calling GoogleSignin.signOut() / AppleAuthentication.
   */
  revoke: publicProcedure.input(import_zod3.z.object({ provider: import_zod3.z.enum(["google", "apple"]), token: import_zod3.z.string().optional() })).mutation(async ({ input }) => {
    if (input.provider === "google" && input.token) {
      try {
        const resp = await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(input.token)}`,
          { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        if (!resp.ok) {
          const body = await resp.text();
          if (resp.status !== 400) {
            console.warn(`[OAuth] Google revocation returned ${resp.status}: ${body}`);
          }
        }
      } catch (err) {
        console.warn("[OAuth] Google revocation network error (non-fatal):", err);
      }
    }
    return { success: true, message: "Tokens revoked" };
  }),
  /**
   * Get user profile
   */
  getProfile: publicProcedure.input(import_zod3.z.object({ userId: import_zod3.z.number() })).query(async ({ input }) => {
    try {
      const db2 = await getDb();
      if (!db2) {
        return {
          success: false,
          error: "Database unavailable"
        };
      }
      const user = await db2.select().from(users).where((0, import_drizzle_orm4.eq)(users.id, input.userId)).limit(1);
      if (user.length === 0) {
        return {
          success: false,
          error: "User not found"
        };
      }
      return {
        success: true,
        user: {
          id: user[0].id,
          openId: user[0].openId,
          name: user[0].name,
          email: user[0].email,
          profilePhoto: user[0].profilePhoto,
          loginMethod: user[0].loginMethod,
          lastSignedIn: user[0].lastSignedIn
        }
      };
    } catch (error) {
      console.error("[OAuth] Profile fetch failed:", error);
      return {
        success: false,
        error: "Failed to fetch profile"
      };
    }
  }),
  /**
   * Update user profile
   */
  updateProfile: publicProcedure.input(
    import_zod3.z.object({
      userId: import_zod3.z.number(),
      name: import_zod3.z.string().optional(),
      email: import_zod3.z.string().email().optional(),
      photoUrl: import_zod3.z.string().url().optional()
    })
  ).mutation(async ({ input }) => {
    try {
      const db2 = await getDb();
      if (!db2) {
        return {
          success: false,
          error: "Database unavailable"
        };
      }
      const updates = {};
      if (input.name) updates.name = input.name;
      if (input.email) updates.email = input.email;
      if (input.photoUrl) updates.profilePhoto = input.photoUrl;
      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          error: "No updates provided"
        };
      }
      await db2.update(users).set(updates).where((0, import_drizzle_orm4.eq)(users.id, input.userId));
      return {
        success: true,
        message: "Profile updated successfully"
      };
    } catch (error) {
      console.error("[OAuth] Profile update failed:", error);
      return {
        success: false,
        error: "Failed to update profile"
      };
    }
  })
});

// server/routers.ts
init_email_auth();
init_classroom();
init_const();

// server/_core/voiceTranscription.ts
init_env();
async function transcribeAudio(options) {
  try {
    if (!ENV.forgeApiUrl) {
      return {
        error: "Voice transcription service is not configured",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_URL is not set"
      };
    }
    if (!ENV.forgeApiKey) {
      return {
        error: "Voice transcription service authentication is missing",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_KEY is not set"
      };
    }
    let audioBuffer;
    let mimeType;
    try {
      const response2 = await fetch(options.audioUrl);
      if (!response2.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response2.status}: ${response2.statusText}`
        };
      }
      audioBuffer = Buffer.from(await response2.arrayBuffer());
      mimeType = response2.headers.get("content-type") || "audio/mpeg";
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
    const formData = new FormData();
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    const prompt = options.prompt || (options.language ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}` : "Transcribe the user's voice to text");
    formData.append("prompt", prompt);
    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL("v1/audio/transcriptions", baseUrl).toString();
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "Accept-Encoding": "identity"
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      };
    }
    const whisperResponse = await response.json();
    if (!whisperResponse.text || typeof whisperResponse.text !== "string") {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an invalid response format"
      };
    }
    return whisperResponse;
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}
function getFileExtension(mimeType) {
  const mimeToExt = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a"
  };
  return mimeToExt[mimeType] || "audio";
}
function getLanguageName(langCode) {
  const langMap = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    ar: "Arabic",
    hi: "Hindi",
    nl: "Dutch",
    pl: "Polish",
    tr: "Turkish",
    sv: "Swedish",
    da: "Danish",
    no: "Norwegian",
    fi: "Finnish"
  };
  return langMap[langCode] || langCode;
}

// server/routers.ts
var import_server4 = require("@trpc/server");
var IMAGE_SOLVE_SYSTEM_PROMPT = `You are TutorSnap, an expert academic tutor and professor covering ALL subjects at ALL difficulty levels.
Analyze the image and identify any question, problem, or text in it.
Determine the subject area automatically, then solve or answer it COMPLETELY and COMPREHENSIVELY.

CRITICAL RULES:
- NEVER refuse to answer or say a problem is too hard. Solve EVERYTHING.
- Produce a rigorous solution sized for a mobile screen: 6-10 steps for genuinely complex work, fewer when fewer are sufficient.
- Keep each step explanation to 2-4 focused sentences covering the action, reason, and rule used.
- Include one concise worked example only when it materially improves understanding.
- Keep conceptExplained to 6-10 sentences covering the core theory, when it applies, and common pitfalls.
- Keep the answer field to 3-5 sentences stating and interpreting the result.
- Include exactly 3 short, actionable tips.
- Keep workedExample.solution between 120 and 220 words.

PLAIN TEXT FORMATTING RULES (CRITICAL - FOLLOW EXACTLY):
- NEVER use dollar signs ($) for any purpose. Write math in plain text: x^2 + 3x = 0, not $x^2 + 3x = 0$.
- NEVER use LaTeX commands: no \\frac, \\sqrt, \\int, \\sum, no backslashes at all.
- NEVER use Markdown formatting: no **bold**, no *italic*, no ## headings, no --- rules, no backticks.
- NEVER use em dashes or en dashes. Use a plain comma or hyphen instead.
- Write all math in plain readable text: use ^ for powers (x^2), / for fractions (a/b), sqrt() for roots.
- The "expression" field: write the formula in plain text only, e.g. 'x = (-b + sqrt(b^2 - 4ac)) / (2a)'.
- All text fields must be clean plain text with no special formatting characters.

Always respond with valid JSON in this exact format:
{
  "problem": "the question or problem you found in the image",
  "subject": "the detected subject id (e.g. algebra, calculus, biology, us_history, etc.)",
  "answer": "A FULL PARAGRAPH (5-8 sentences): state the result, interpret it, note units, explain any special cases or caveats, and summarise what was learned.",
  "submissionReady": "[INDEPENDENTLY GENERATED \u2014 not a summary of the above] Complete worked solution as a student would write for submission. Maths/science: numbered calculation lines, all substitutions, units, final answer on last line. Programming: final code only. Essays: complete polished prose. Definitions: concise precise definition. Multiple choice: correct option + essential supporting work only. NO explanatory prose, NO commentary, NO preamble.",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Descriptive step title",
      "explanation": "DETAILED explanation (5-8 sentences): what you are doing, why, the rule/theorem that justifies it, any edge cases, and how it leads to the next step.",
      "expression": "The key formula, equation, or expression"
    }
  ],
  "workedExample": {
    "title": "Worked Example: [brief description]",
    "problem": "A similar but distinct example problem",
    "solution": "LONG narrative solution (at least 300 words): walk through every single step, explain every operation, state every rule used, and interpret the final result."
  },
  "conceptExplained": "A LONG, RICH paragraph (10-15 sentences): underlying theory, historical context or motivation, formal definition, intuitive explanation, when the concept applies, common pitfalls, and connections to at least 3 related topics.",
  "tips": ["Detailed tip 1: 4-6 sentences", "Detailed tip 2: 4-6 sentences", "Detailed tip 3: 4-6 sentences", "Detailed tip 4: 4-6 sentences"],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]
}`;
function estimateSolveTokens(problem, subject) {
  const p = problem.toLowerCase().trim();
  const isSimpleArithmetic = /^[\d\s+\-*/^().=?]+$/.test(p) || /^what is \d+\s*[+\-×÷*/]\s*\d+/.test(p) || /^(calculate|compute|find|evaluate)\s+\d+\s*[+\-×÷*/]\s*\d+/.test(p) || p.split(" ").length <= 8 && ["arithmetic", "basic_math"].includes(subject);
  const isSimpleAlgebra = /^solve\s+(for\s+)?[a-z]:\s*[\d\w\s+\-*/^=().]+$/.test(p) && !p.includes("system") && !p.includes("matrix") && !p.includes("quadratic");
  const isComplex = /integral|derivative|limit|eigenvalue|differential|proof|theorem|series|transform|vector|matrix|determinant|gradient|divergence|curl|laplace|fourier|taylor|maclaurin|lagrangian|hamiltonian/.test(p) || ["calculus", "linear_algebra", "differential_equations", "number_theory"].includes(subject) || p.split(" ").length > 40;
  const isMedium = /quadratic|polynomial|system of|simultaneous|inequality|function|graph|slope|intercept|probability|statistics|hypothesis|confidence/.test(p) || p.split(" ").length > 20;
  if (isComplex) return 2500;
  if (isSimpleArithmetic || isSimpleAlgebra) return 800;
  if (isMedium) return 1400;
  return 1400;
}
function buildSolveSystemPromptScaled(subject, problem) {
  const tokens = estimateSolveTokens(problem, subject);
  const subjectGuides = {
    algebra: "Solve algebraically with full rigor. Show every algebraic manipulation.",
    calculus: "Apply calculus rules with full rigor. State every theorem used. Show all intermediate steps.",
    geometry: "Use geometric theorems and formulas. Show all angle, length, and area calculations.",
    trigonometry: "Apply trig identities, the unit circle, and inverse functions. Show all algebraic simplifications.",
    statistics: "Apply statistical formulas step by step. Show all arithmetic. Interpret the result in plain language.",
    arithmetic: "Compute step by step with full order-of-operations detail. Explain each arithmetic rule applied.",
    precalculus: "Analyze functions, transformations, asymptotes, limits, and sequences. Show all algebraic steps.",
    linear_algebra: "Use matrix operations, determinants, eigenvalues, and vector space properties. Show every row operation.",
    differential_equations: "Identify the ODE/PDE type. Show the complete solution method. Verify by substitution.",
    number_theory: "Apply number theory theorems (divisibility, primes, GCD, modular arithmetic). Prove each step.",
    biology: "Apply biological concepts with mechanistic detail. Explain underlying molecular or physiological mechanisms.",
    chemistry: "Balance equations, apply stoichiometry. Show all unit conversions, mole calculations. Verify with dimensional analysis.",
    physics: "Apply physics laws and formulas with derivations. Define all variables. Show full unit analysis.",
    us_history: "Provide rich historical context, key figures, causes and effects. Connect events to broader themes.",
    world_history: "Provide global historical context, compare civilizations, analyze cause and effect.",
    economics: "Apply economic theories and models. Use supply/demand, fiscal/monetary policy, and quantitative reasoning."
  };
  const guide = subjectGuides[subject] ?? "Provide a thorough, accurate, and educational answer. Never refuse a hard question; always attempt a complete solution.";
  const FORMATTING = `PLAIN TEXT FORMATTING RULES (CRITICAL - FOLLOW EXACTLY):
- NEVER use dollar signs ($) for any purpose. Write math in plain text: x^2 + 3x = 0, not $x^2 + 3x = 0$.
- NEVER use LaTeX commands: no \\frac, \\sqrt, \\int, \\sum, no backslashes at all.
- NEVER use Markdown formatting: no **bold**, no *italic*, no ## headings, no --- rules, no backticks.
- NEVER use em dashes or en dashes. Use a plain comma or hyphen instead.
- Write all math in plain readable text: use ^ for powers (x^2), / for fractions (a/b), sqrt() for roots.
- The "expression" field: write the formula in plain text only, e.g. 'x = (-b + sqrt(b^2 - 4ac)) / (2a)'.`;
  const SUBMISSION_READY_RULES = `The submissionReady field is a COMPLETELY INDEPENDENT second output. Generate it fresh from scratch as if writing only the answer a student would hand in:
  * Mathematics/Physics/Chemistry/Statistics: Complete worked solution. Every calculation on its own numbered line. All formula substitutions shown. Final answer on last line. No prose.
  * Programming/Computer Science: Final production-ready code only. No explanation.
  * Essays/English/History/Social Studies: Complete, polished final response. Full sentences and paragraphs.
  * Definitions/Vocabulary: Concise, precise final definition only.
  * Multiple Choice: State the correct option letter and answer, then include only the essential supporting calculation or one-line justification.`;
  if (tokens <= 800) {
    return `You are TutorSnap, an expert academic tutor.
Subject: ${subject}
Guidance: ${guide}

This is a SIMPLE, DIRECT question. Give a short, direct answer.
- NEVER refuse to answer. Solve everything.
- ${SUBMISSION_READY_RULES}

${FORMATTING}

Respond with valid JSON in EXACTLY this format (no extra fields, no extra steps):
{
  "problem": "the original question reproduced exactly",
  "subject": "${subject}",
  "answer": "One sentence stating the result. Example for '2+2': '2 + 2 = 4.'",
  "submissionReady": "The direct answer only. Example: '2 + 2 = 4'",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Set up",
      "explanation": "One sentence identifying what to calculate.",
      "expression": "the starting expression"
    },
    {
      "stepNumber": 2,
      "title": "Calculate",
      "explanation": "One sentence showing the calculation and result.",
      "expression": "the result expression"
    }
  ],
  "workedExample": {
    "title": "Worked Example",
    "problem": "A similar single-step problem",
    "solution": "One sentence solution."
  },
  "conceptExplained": "One sentence defining the concept.",
  "tips": ["One practical tip.", "One common mistake to avoid."],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3"]
}`;
  }
  if (tokens <= 1400) {
    return `You are TutorSnap, an expert academic tutor and professor.
Subject: ${subject}
Guidance: ${guide}

CRITICAL RULES:
- NEVER refuse to answer. Solve everything.
- Use 3-6 focused steps. Each step explanation must be 1-2 sentences covering what to do and why.
- Keep the answer field to 2-3 sentences stating and interpreting the result.
- Keep conceptExplained to 3-5 sentences covering the concept, when it applies, and one common pitfall.
- Include a 60-100 word worked example only when useful.
- Include exactly 3 practical one-sentence tips.
- ${SUBMISSION_READY_RULES}

${FORMATTING}

Always respond with valid JSON in this exact format:
{
  "problem": "the original question or problem, reproduced exactly",
  "subject": "${subject}",
  "answer": "3-4 sentences: state the result, interpret it, and note any important caveats.",
  "submissionReady": "[INDEPENDENTLY GENERATED] Complete worked solution as a student would write for submission.",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Descriptive step title",
      "explanation": "3-4 sentences: what you are doing, why, and the rule that justifies it.",
      "expression": "The key formula, equation, or expression for this step"
    }
  ],
  "workedExample": {
    "title": "Worked Example: [brief description]",
    "problem": "A similar but distinct example problem",
    "solution": "Clear narrative solution (100-150 words): walk through every step."
  },
  "conceptExplained": "5-7 sentences: the concept, when it applies, common pitfalls, and connections to related topics.",
  "tips": ["Practical tip 1 (2-3 sentences)", "Practical tip 2 (2-3 sentences)", "Practical tip 3 (2-3 sentences)"],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]
}`;
  }
  return `You are TutorSnap, an expert academic tutor and professor covering ALL school and university subjects at ALL difficulty levels.
Subject: ${subject}
Guidance: ${guide}

CRITICAL RULES:
- NEVER refuse to answer or say a problem is too hard. Solve EVERYTHING: basic arithmetic, advanced calculus, differential equations, abstract algebra, graduate-level physics, etc.
- If a problem is advanced, apply the appropriate advanced techniques (L'Hopital, eigenvalues, Green's theorem, Fourier series, Lagrangians, etc.).
- Produce a rigorous solution sized for a mobile screen: 6-10 steps for genuinely complex work, fewer when fewer are sufficient.
- Keep each step explanation to 2-4 focused sentences covering the action, reason, and rule used.
- Include one concise worked example only when it materially improves understanding.
- Keep conceptExplained to 6-10 sentences covering the core theory, when it applies, and common pitfalls.
- Keep the answer field to 3-5 sentences stating and interpreting the result.
- Include exactly 3 short, actionable tips.
- Keep workedExample.solution between 120 and 220 words.
- ${SUBMISSION_READY_RULES}

${FORMATTING}

Always respond with valid JSON in this exact format:
{
  "problem": "the original question or problem, reproduced exactly",
  "subject": "${subject}",
  "answer": "A FULL PARAGRAPH (7-10 sentences): state the result, interpret it, note units, explain any special cases or caveats, and summarise what was learned.",
  "submissionReady": "[INDEPENDENTLY GENERATED] Complete worked solution as a student would write for submission. Maths/science: numbered calculation lines, all substitutions, units, final answer on last line. Programming: final code only. Essays: complete polished prose. Definitions: concise precise definition. Multiple choice: correct option + essential supporting work only.",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Descriptive step title",
      "explanation": "DETAILED explanation (7-10 sentences): what you are doing, why, the rule/theorem that justifies it, any edge cases, and how it leads to the next step.",
      "expression": "The key formula, equation, or expression for this step"
    }
  ],
  "workedExample": {
    "title": "Worked Example: [brief description of the example problem]",
    "problem": "A similar but distinct example problem",
    "solution": "LONG narrative solution (at least 450 words): walk through every single step, explain every operation, state every rule used, and interpret the final result."
  },
  "conceptExplained": "A LONG, RICH paragraph (15-20 sentences): underlying theory, historical context or motivation, formal definition, intuitive explanation, when the concept applies, common pitfalls, and connections to at least 5 related topics.",
  "tips": [
    "Detailed tip 1: specific, actionable, 6-8 sentences",
    "Detailed tip 2: specific, actionable, 6-8 sentences",
    "Detailed tip 3: specific, actionable, 6-8 sentences",
    "Detailed tip 4: specific, actionable, 6-8 sentences",
    "Detailed tip 5: specific, actionable, 6-8 sentences",
    "Detailed tip 6: specific, actionable, 6-8 sentences"
  ],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5", "Topic 6"]
}`;
}
var CHAT_SYSTEM_PROMPT2 = `You are TutorSnap, a friendly and expert academic tutor covering all school subjects.
You help students understand concepts across Mathematics, English/Language Arts, Science, and Social Studies.
Be encouraging, clear, and pedagogical. Use examples when helpful.
Format mathematical expressions clearly. Keep responses concise but complete.
Adapt your tone and vocabulary to the subject: precise for math/science, analytical for literature/history.

MOBILE OUTPUT RULES (CRITICAL):
- Use clean, concise prose and short paragraphs.
- Never use dollar signs or LaTeX commands. Write math in plain text using ^ for powers, / for fractions, and sqrt() for roots.
- Use numbered steps only when they improve clarity.
- Do not use decorative Markdown, headings, rules, or code fences.
- The approved interactive component blocks below are the only structured markup allowed, and should be used sparingly.
- Prefer one clear explanation over repeated summaries.

INTERACTIVE COMPONENTS - AUTO-INSERT RULES:
You MUST automatically decide when to insert the following components. Do NOT wait for the student to ask.

Checklist (use for steps, requirements, things to remember):
:::checklist
- Item one
- Item two
:::

Flashcard (use for key terms, formulas, theorems worth memorising):
:::flashcard
front: The term or question
back: The definition or answer
:::

Comparison (use when contrasting two or more concepts):
:::comparison
Feature | Option A | Option B
Row 1 | Val A | Val B
:::

Timeline (use for history, ordered sequences, chronological processes):
:::timeline
1687: Newton publishes Principia Mathematica
1905: Einstein publishes special relativity
:::

Mermaid diagram (use for flowcharts, decision trees, mind maps, process flows):
\`\`\`mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action]
  B -->|No| D[End]
\`\`\`

Use components only when they genuinely improve understanding. One well-placed component beats three unnecessary ones.`;
var GRADE_LEVEL_DESCRIPTIONS2 = {
  grade1: "Grade 1 (age 6-7): Use very simple words, very short sentences, and fun real-world examples a young child would understand. Avoid all jargon.",
  grade2: "Grade 2 (age 7-8): Use simple words and short sentences. Relate concepts to everyday objects and activities a child knows.",
  grade3: "Grade 3 (age 8-9): Use clear, simple language. Introduce basic subject vocabulary with immediate plain-English definitions.",
  grade4: "Grade 4 (age 9-10): Use friendly, clear language. Introduce subject terms with definitions and simple examples.",
  grade5: "Grade 5 (age 10-11): Use clear language with some subject-specific terms. Provide step-by-step explanations with relatable examples.",
  grade6: "Grade 6 (age 11-12): Use very simple language, short sentences, relatable real-world examples. Avoid jargon.",
  grade7: "Grade 7 (age 12-13): Simple language, concrete examples, introduce basic terminology with clear definitions.",
  grade8: "Grade 8 (age 13-14): Moderate complexity, introduce subject-specific terms, use step-by-step explanations.",
  grade9: "Grade 9 (age 14-15): High school level, standard academic vocabulary, structured explanations.",
  grade10: "Grade 10 (age 15-16): GCSE / sophomore level, precise academic language, multi-step reasoning.",
  gcse: "GCSE / Grade 10-11: UK secondary school level, exam-focused explanations, mark-scheme style answers.",
  alevel: "A-Level / Grade 11-12: Advanced pre-university level, rigorous explanations, introduce university concepts.",
  university: "University / Degree level: Assume strong subject knowledge, use technical terminology freely, provide rigorous academic-level explanations."
};
function gradeContext(gradeLevel) {
  if (!gradeLevel) return "";
  const desc3 = GRADE_LEVEL_DESCRIPTIONS2[gradeLevel];
  return desc3 ? `
ADAPT YOUR RESPONSE to this student's level: ${desc3}` : "";
}
function buildPracticePrompt(subject, difficulty) {
  const isEnglish = ["american_literature", "british_literature", "world_literature", "composition", "creative_writing", "debate", "journalism", "grammar", "poetry"].includes(subject);
  const isSocial = ["us_history", "world_history", "government", "economics", "geography", "psychology", "sociology", "civics"].includes(subject);
  let taskType = "problem";
  if (isEnglish) taskType = "question or short writing prompt";
  if (isSocial) taskType = "question or analysis prompt";
  return `You are TutorSnap, an expert academic tutor. Generate ONE ${difficulty} ${taskType} for: ${subject}.
The "answer" field must use 2-4 concise sentences explaining the result.
The "steps" array must contain 3-6 focused steps, each with a 1-2 sentence explanation. Use fewer steps when the task is simple.
The "hints" array MUST contain EXACTLY 3 short hints that progressively reveal the solution approach. This field is REQUIRED.
The "submissionReady" field is a COMPLETELY INDEPENDENT second output. Do NOT summarise or extract from the explanation. Generate it fresh as if writing only the answer a student would hand in. Maths/science: numbered calculation lines, all substitutions, units, final answer on last line. Programming: final code only. Essays: complete polished prose. Definitions: concise precise definition. Multiple choice: correct option + essential supporting work only. NO prose commentary, NO preamble.
Respond ONLY with this JSON (no extra text):
{"id":"p1","subject":"${subject}","difficulty":"${difficulty}","problem":"<question>","answer":"<concise answer, 2-4 sentences>","steps":[{"stepNumber":1,"title":"<descriptive title>","explanation":"<focused explanation, 1-2 sentences>","expression":"<plain-text formula if any>"}],"hints":["<short hint 1>","<short hint 2>","<short hint 3>"],"submissionReady":"<independently generated submission answer>"}`;
}
function extractJsonFromContent(content) {
  let cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return cleaned;
}
function repairTruncatedJson(raw) {
  let s = raw.trim();
  const quoteCount = (s.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    s = s + '"';
  }
  s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*"?$/, "");
  s = s.replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, "");
  s = s.replace(/,\s*$/, "");
  const stack = [];
  let inStr = false;
  let escape = false;
  for (const ch of s) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inStr) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  return s + stack.reverse().join("");
}
async function invokeLLMJsonCompatible(params) {
  try {
    return await invokeLLM(params);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Web Search cannot be used with JSON mode")) throw error;
    const {
      response_format: _responseFormat,
      responseFormat: _responseFormatCamel,
      output_schema: _outputSchema,
      outputSchema: _outputSchemaCamel,
      ...textParams
    } = params;
    return await invokeLLM(textParams);
  }
}
async function invokeLLMWithFallback(primaryModel, fallbackModel, params) {
  try {
    const result = await invokeLLMJsonCompatible({ ...params, model: primaryModel });
    const text2 = extractLLMContent(result);
    const jsonStr = extractJsonFromContent(text2);
    JSON.parse(jsonStr);
    return jsonStr;
  } catch {
    const result2 = await invokeLLMJsonCompatible({ ...params, model: fallbackModel, max_tokens: Math.min((params.max_tokens ?? 4e3) + 1e3, 6e3) });
    const text2 = extractLLMContent(result2);
    const raw2 = extractJsonFromContent(text2);
    try {
      JSON.parse(raw2);
      return raw2;
    } catch {
      const repaired = repairTruncatedJson(raw2);
      JSON.parse(repaired);
      return repaired;
    }
  }
}
function extractLLMContent(result) {
  if (result?.error) {
    const msg = result.error?.message ?? JSON.stringify(result.error);
    throw new import_server4.TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI service error: ${msg}` });
  }
  const raw = result?.choices?.[0]?.message?.content ?? "";
  return typeof raw === "string" ? raw : JSON.stringify(raw);
}
function firstNSentences(text2, n) {
  if (!text2) return text2;
  const sentenceEnd = /[.!?](?:\s|$)/g;
  let count = 0;
  let lastIndex = 0;
  let match;
  while ((match = sentenceEnd.exec(text2)) !== null) {
    count++;
    lastIndex = match.index + match[0].length;
    if (count >= n) break;
  }
  return count >= n ? text2.slice(0, lastIndex).trim() : text2.trim();
}
function truncateForSimpleTier(parsed, tokenBudget) {
  if (tokenBudget > 800) return parsed;
  const out = { ...parsed };
  if (typeof out.answer === "string") {
    out.answer = firstNSentences(out.answer, 2);
  }
  if (Array.isArray(out.steps)) {
    out.steps = out.steps.slice(0, 3).map((step) => ({
      ...step,
      explanation: typeof step.explanation === "string" ? firstNSentences(step.explanation, 2) : step.explanation
    }));
  }
  if (typeof out.conceptExplained === "string") {
    out.conceptExplained = firstNSentences(out.conceptExplained, 1);
  }
  if (out.workedExample?.solution && typeof out.workedExample.solution === "string") {
    out.workedExample = { ...out.workedExample, solution: firstNSentences(out.workedExample.solution, 2) };
  }
  if (Array.isArray(out.tips)) {
    out.tips = out.tips.slice(0, 2).map(
      (tip) => typeof tip === "string" ? firstNSentences(tip, 1) : tip
    );
  }
  return out;
}
var academicRouter = router({
  solve: protectedProcedure.input(import_zod6.z.object({
    problem: import_zod6.z.string().min(1),
    subject: import_zod6.z.string().default("other"),
    gradeLevel: import_zod6.z.string().nullable().optional()
  })).mutation(async ({ ctx, input }) => {
    try {
      let tokenBudget = estimateSolveTokens(input.problem, input.subject);
      if (ctx.user) {
        try {
          const db2 = await getDb();
          if (db2) {
            const cacheRows = await db2.select({ multiplier: aireSubjectCalibration.multiplier }).from(aireSubjectCalibration).where((0, import_drizzle_orm7.and)(
              (0, import_drizzle_orm7.eq)(aireSubjectCalibration.userId, ctx.user.id),
              (0, import_drizzle_orm7.eq)(aireSubjectCalibration.subject, input.subject)
            )).limit(1);
            if (cacheRows.length > 0) {
              const m = parseFloat(cacheRows[0].multiplier);
              if (!isNaN(m) && m !== 1) {
                tokenBudget = Math.round(tokenBudget * m);
              }
            } else {
              const m = await computeSubjectMultiplier(db2, ctx.user.id, input.subject);
              if (m !== 1) tokenBudget = Math.round(tokenBudget * m);
            }
          }
        } catch {
        }
      }
      if (tokenBudget <= 800) {
        const fastResult = await invokeLLM({
          model: "gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: "You are a concise math tutor. Answer the question in 1-2 sentences maximum. Give the direct answer first, then one brief explanation sentence. Do NOT use LaTeX dollar signs. Do NOT give examples, tips, or extra context."
            },
            { role: "user", content: input.problem }
          ],
          max_tokens: 120,
          temperature: 0.3
        });
        const fastText = extractLLMContent(fastResult).trim();
        return {
          problem: input.problem,
          subject: input.subject,
          answer: fastText,
          submissionReady: fastText.split(".")[0]?.trim() ?? fastText,
          steps: [
            {
              stepNumber: 1,
              title: "Solution",
              explanation: fastText,
              expression: ""
            }
          ],
          _fastPath: true
          // flag so client can skip "Show Steps" UI
        };
      }
      const systemPrompt = buildSolveSystemPromptScaled(input.subject, input.problem) + gradeContext(input.gradeLevel ?? void 0);
      const params = {
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.problem }
        ],
        max_tokens: tokenBudget,
        temperature: 0.3,
        response_format: { type: "json_object" }
      };
      const jsonStr = await invokeLLMWithFallback("gemini-3-flash-preview", "claude-haiku-4-5", params);
      const parsed = JSON.parse(jsonStr);
      return truncateForSimpleTier(parsed, tokenBudget);
    } catch (err) {
      if (err instanceof import_server4.TRPCError) throw err;
      captureServerError(err, { route: "academic.solve" });
      throw new import_server4.TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : "Failed to solve problem. Please try again." });
    }
  }),
  solveExplanation: protectedProcedure.input(import_zod6.z.object({
    problem: import_zod6.z.string().min(1, "problem is required"),
    correctAnswer: import_zod6.z.string().min(1, "correctAnswer is required"),
    selectedAnswer: import_zod6.z.string().min(1, "selectedAnswer is required"),
    // Full option texts - required so the AI never has to infer or hallucinate option content
    options: import_zod6.z.object({
      A: import_zod6.z.string().min(1),
      B: import_zod6.z.string().min(1),
      C: import_zod6.z.string().min(1),
      D: import_zod6.z.string().min(1)
    }).optional(),
    difficulty: import_zod6.z.enum(["easy", "medium", "hard"]).optional(),
    subject: import_zod6.z.string().default("other"),
    gradeLevel: import_zod6.z.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const optionsBlock = input.options ? `Answer choices:
  A) ${input.options.A}
  B) ${input.options.B}
  C) ${input.options.C}
  D) ${input.options.D}
` : "";
    const difficultyHint = input.difficulty ? ` This was a ${input.difficulty} difficulty question.` : "";
    const correctText = input.options ? ` ("${input.options[input.correctAnswer]}")` : "";
    const selectedText = input.options && input.selectedAnswer in input.options ? ` ("${input.options[input.selectedAnswer]}")` : "";
    const prompt = `You are TutorSnap, an expert academic tutor.${gradeContext(input.gradeLevel)}${difficultyHint}
A student answered a multiple-choice question.
Question: "${input.problem}"
${optionsBlock}Correct answer: ${input.correctAnswer}${correctText}
Student selected: ${input.selectedAnswer}${selectedText}
${input.selectedAnswer === input.correctAnswer ? "The student got it RIGHT." : "The student got it WRONG."}

Respond ONLY with this JSON (no extra text):
{
  "explanation": "Use 4-7 concise sentences: state the correct option and full text, explain why it is correct, show the essential reasoning, briefly explain why the selected option was wrong when applicable, and end with one useful memory tip. Use plain text only, with no Markdown, LaTeX, dollar signs, or backslashes.",
  "submissionReady": "INDEPENDENTLY GENERATED - not a summary of the explanation above. Write only what a student would hand in. State the correct option letter and its full answer text, then show only the essential supporting work or one-line justification (2-4 lines max). No prose commentary, no preamble."
}`;
    const result = await invokeLLMJsonCompatible({
      model: "claude-haiku-4-5",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Explain the answer fully." }
      ],
      max_tokens: 700,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    const text2 = extractLLMContent(result);
    try {
      const parsed = JSON.parse(extractJsonFromContent(text2));
      return { explanation: (parsed.explanation ?? text2).trim(), submissionReady: (parsed.submissionReady ?? "").trim() };
    } catch {
      return { explanation: text2.trim(), submissionReady: "" };
    }
  }),
  solveFromImage: protectedProcedure.input(import_zod6.z.object({
    imageBase64: import_zod6.z.string(),
    mimeType: import_zod6.z.string().default("image/jpeg"),
    subject: import_zod6.z.string().default("other"),
    gradeLevel: import_zod6.z.string().optional()
  })).mutation(async ({ ctx, input }) => {
    try {
      const messages = [
        { role: "system", content: IMAGE_SOLVE_SYSTEM_PROMPT + gradeContext(input.gradeLevel) },
        {
          role: "user",
          content: [
            { type: "text", text: `Please identify and answer the question in this image. Subject hint: ${input.subject}` },
            {
              type: "image_url",
              image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` }
            }
          ]
        }
      ];
      const params = {
        model: "gemini-3-flash-preview",
        messages,
        max_tokens: 1800,
        temperature: 0.3,
        response_format: { type: "json_object" }
      };
      const jsonStr = await invokeLLMWithFallback("gemini-3-flash-preview", "claude-haiku-4-5", params);
      return JSON.parse(jsonStr);
    } catch (err) {
      if (err instanceof import_server4.TRPCError) throw err;
      captureServerError(err, { route: "academic.solveFromImage" });
      throw new import_server4.TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err instanceof Error ? err.message : "Failed to process image. Please try again." });
    }
  }),
  generatePractice: protectedProcedure.input(import_zod6.z.object({
    subject: import_zod6.z.string(),
    difficulty: import_zod6.z.enum(["easy", "medium", "hard"]),
    gradeLevel: import_zod6.z.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const practiceTokens = input.difficulty === "easy" ? 700 : input.difficulty === "medium" ? 1100 : 1600;
    const practicePrompt = buildPracticePrompt(input.subject, input.difficulty) + gradeContext(input.gradeLevel);
    const result = await invokeLLMJsonCompatible({
      model: "claude-haiku-4-5",
      messages: [
        { role: "system", content: practicePrompt },
        { role: "user", content: `Generate a ${input.difficulty} ${input.subject} practice question.` }
      ],
      max_tokens: practiceTokens,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    const text2 = extractLLMContent(result);
    const jsonStr = extractJsonFromContent(text2);
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      try {
        const repaired = repairTruncatedJson(jsonStr);
        parsed = JSON.parse(repaired);
      } catch (repairErr) {
        captureServerError(repairErr, { route: "academic.generatePractice", reason: "invalid JSON from AI" });
        throw new import_server4.TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON. Please try again." });
      }
    }
    const requiredPracticeFields = ["problem", "answer"];
    const missingPracticeFields = requiredPracticeFields.filter((f) => !parsed[f]);
    if (missingPracticeFields.length > 0) {
      throw new import_server4.TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `AI response missing required fields: ${missingPracticeFields.join(", ")}. Please try again.`
      });
    }
    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      parsed.steps = [{ stepNumber: 1, title: "Solution", explanation: String(parsed.answer ?? ""), expression: "" }];
    }
    if (!Array.isArray(parsed.hints)) {
      parsed.hints = [];
    }
    if (!parsed.subject) parsed.subject = input.subject;
    if (!parsed.difficulty) parsed.difficulty = input.difficulty;
    if (!parsed.id) parsed.id = `p-${Date.now()}`;
    return parsed;
  }),
  generateQuiz: protectedProcedure.input(import_zod6.z.object({
    subject: import_zod6.z.string(),
    difficulty: import_zod6.z.enum(["easy", "medium", "hard"]),
    count: import_zod6.z.number().min(3).max(10).default(5),
    gradeLevel: import_zod6.z.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const quizPrompt = `You are TutorSnap, an expert academic tutor.${gradeContext(input.gradeLevel)}
Generate exactly ${input.count} ${input.difficulty} multiple-choice questions for: ${input.subject}.
Each question has 4 distinct options (A-D), exactly one correct answer, and a brief one-sentence explanation.
Use plain text only. Do not use Markdown, LaTeX commands, dollar signs, backslashes, or decorative symbols.
Respond ONLY with this JSON and no surrounding prose:
{"questions":[{"id":"q1","problem":"<question>","options":{"A":"<a>","B":"<b>","C":"<c>","D":"<d>"},"correctAnswer":"A","explanation":"<1 sentence>"}]}`;
    const result = await invokeLLMJsonCompatible({
      model: "claude-haiku-4-5",
      messages: [
        { role: "system", content: quizPrompt },
        { role: "user", content: `Generate ${input.count} ${input.difficulty} multiple-choice questions for ${input.subject}.` }
      ],
      // Scale per-question token budget while keeping the payload mobile-sized.
      max_tokens: Math.min(input.count * (input.difficulty === "easy" ? 140 : input.difficulty === "medium" ? 200 : 260), 1800),
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    const rawContent = extractLLMContent(result);
    const text2 = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const jsonStr = extractJsonFromContent(text2);
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new import_server4.TRPCError({ code: "BAD_REQUEST", message: "Invalid JSON in AI response" });
    }
    return parsed.questions ?? [];
  }),
  studyTip: publicProcedure.input(import_zod6.z.object({
    subject: import_zod6.z.string(),
    gradeLevel: import_zod6.z.string().optional()
  })).mutation(async ({ input }) => {
    const gradeHint = input.gradeLevel && GRADE_LEVEL_DESCRIPTIONS2[input.gradeLevel] ? ` Tailor the tip for a ${GRADE_LEVEL_DESCRIPTIONS2[input.gradeLevel].split(":")[0]} student.` : "";
    const tipPrompt = `You are TutorSnap, a friendly academic tutor. Generate a single, practical, actionable study tip for a student studying ${input.subject}.${gradeHint} The tip should be specific, encouraging, and 1-2 sentences long. Respond with ONLY the tip text, no preamble, no quotes.`;
    const result = await invokeLLM({
      model: "claude-haiku-4-5",
      messages: [
        { role: "system", content: tipPrompt },
        { role: "user", content: `Give me a study tip for ${input.subject}.` }
      ],
      max_tokens: 120,
      temperature: 0.3
    });
    const rawTip = result?.error ? "" : result.choices?.[0]?.message?.content ?? "";
    const tip = typeof rawTip === "string" ? rawTip.trim() : "";
    return { tip: tip || `Practice ${input.subject} problems daily. Consistency is the key to mastery!` };
  }),
  chat: publicProcedure.input(import_zod6.z.object({
    messages: import_zod6.z.array(import_zod6.z.object({
      role: import_zod6.z.enum(["user", "assistant"]),
      content: import_zod6.z.string()
    })),
    subject: import_zod6.z.string().optional(),
    gradeLevel: import_zod6.z.string().optional(),
    detailedMode: import_zod6.z.boolean().optional()
    // When true, use doubled token budgets
  })).mutation(async ({ input }) => {
    const subjectContext = input.subject ? `
The student is currently focused on: ${input.subject}. Tailor your explanations to this subject when relevant.` : "";
    const gradeContext2 = input.gradeLevel && GRADE_LEVEL_DESCRIPTIONS2[input.gradeLevel] ? `
ADAPT YOUR RESPONSE to this student's level: ${GRADE_LEVEL_DESCRIPTIONS2[input.gradeLevel]}` : "";
    const isDetailed = input.detailedMode !== false;
    const detailedCtx = isDetailed ? "\n\nDETAILED MODE is ON: Match depth to the question. Use 2-4 sentences for simple questions, 4-8 sentences plus one useful example for medium questions, and clearly numbered working with a brief verification for complex questions. Add a pro tip or common mistake only when it materially helps." : "\n\nCONCISE MODE is ON: Answer directly, show only essential reasoning, and avoid repetition.";
    const systemPrompt = CHAT_SYSTEM_PROMPT2 + subjectContext + gradeContext2 + detailedCtx;
    const lastMsgContent = input.messages[input.messages.length - 1]?.content ?? "";
    const { detectUserOverride: detectUserOverride2, classifyQuestion: classifyQuestion2, computeTokenBudget: computeTokenBudget2 } = await Promise.resolve().then(() => (init_chatStream(), chatStream_exports));
    const nsFallbackOverride = detectUserOverride2(lastMsgContent);
    const nsFallbackClass = classifyQuestion2(lastMsgContent, input.subject);
    const chatMaxTokens = computeTokenBudget2(nsFallbackClass, nsFallbackOverride, isDetailed);
    const result = await invokeLLM({
      model: "claude-haiku-4-5",
      messages: [
        { role: "system", content: systemPrompt },
        ...input.messages.map((m) => ({
          role: m.role,
          content: m.content
        }))
      ],
      max_tokens: chatMaxTokens,
      temperature: 0.3
    });
    const rawContent = result?.error ? "" : result.choices?.[0]?.message?.content ?? "";
    const text2 = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    return { content: text2 || "I apologize, I couldn't process your request." };
  }),
  suggestFollowUps: publicProcedure.input(import_zod6.z.object({
    aiResponse: import_zod6.z.string(),
    subject: import_zod6.z.string().optional()
  })).mutation(async ({ input }) => {
    const prompt = `You are a helpful academic tutor assistant. Based on the following AI tutor response, generate exactly 3 short follow-up questions or prompts a student might want to ask next. Each should be 3-7 words, specific to the content of the response, and help deepen understanding.

AI response:
"${input.aiResponse.slice(0, 800)}"

Respond ONLY with valid JSON in this exact format:
{"chips": ["Question 1", "Question 2", "Question 3"]}`;
    const result = await invokeLLM({
      model: "claude-haiku-4-5",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Generate the 3 follow-up chips now." }
      ],
      max_tokens: 120,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    const text2 = result?.error ? "" : extractLLMContent(result);
    try {
      const parsed = JSON.parse(extractJsonFromContent(text2));
      return { chips: (parsed.chips || []).slice(0, 3) };
    } catch {
      return { chips: ["Give me an example", "Explain differently", "Quiz me on this"] };
    }
  }),
  explainDifferently: publicProcedure.input(import_zod6.z.object({
    problem: import_zod6.z.string().min(1),
    answer: import_zod6.z.string(),
    subject: import_zod6.z.string().default("other"),
    gradeLevel: import_zod6.z.string().optional(),
    style: import_zod6.z.enum(["analogy", "step-by-step", "visual"]).default("analogy")
  })).mutation(async ({ input }) => {
    const gradeCtx = gradeContext(input.gradeLevel);
    const styleGuide = {
      "analogy": "Use a real-world analogy or story that makes the concept click. Connect the math/concept to something the student already knows from everyday life.",
      "step-by-step": "Break the solution into the smallest possible numbered steps. Each step should be one atomic action with a brief reason why.",
      "visual": "Describe the concept visually: imagine drawing it, plotting it on a graph, or building it physically. Use spatial and visual language throughout."
    }[input.style];
    const gradeCtx2 = gradeContext(input.gradeLevel);
    const systemPrompt = `You are TutorSnap, an expert academic tutor.${gradeCtx2}
Your job is to re-explain a solved problem using a DIFFERENT approach than the standard method.
Style: ${styleGuide}
Rules:
- Be concise: 4-6 sentences total.
- Use plain, student-friendly language.
- Do NOT repeat the original solution method verbatim.
- NEVER use dollar signs or LaTeX. Write math in plain text: x^2 + 3x = 0, use ^ for powers, / for fractions.
- NEVER use Markdown: no **bold**, no *italic*, no ## headings, no backticks.
- NEVER use em dashes or en dashes. Use a plain comma or hyphen instead.
- Output plain text only, no JSON.`;
    const userMsg = `Problem: ${input.problem.slice(0, 400)}
Original answer: ${input.answer.slice(0, 300)}

Now re-explain this using the ${input.style} style.`;
    const result = await invokeLLM({
      model: "claude-haiku-4-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg }
      ],
      max_tokens: 450,
      temperature: 0.3
    });
    const text2 = result?.error ? "" : result.choices?.[0]?.message?.content ?? "";
    const explanation = typeof text2 === "string" ? text2.trim() : JSON.stringify(text2);
    return { explanation: explanation || "Could not generate an alternative explanation. Please try again." };
  }),
  generateSimilar: publicProcedure.input(import_zod6.z.object({
    problem: import_zod6.z.string(),
    subject: import_zod6.z.string(),
    difficulty: import_zod6.z.enum(["easy", "medium", "hard"]).default("medium"),
    count: import_zod6.z.number().min(1).max(5).default(3),
    gradeLevel: import_zod6.z.string().optional()
  })).mutation(async ({ input }) => {
    const prompt = `You are TutorSnap, an expert academic tutor.${gradeContext(input.gradeLevel)}
The student solved: "${input.problem.slice(0, 200)}"
Generate exactly ${input.count} similar ${input.difficulty} problems for "${input.subject}" testing the same concept.
Each has a 1-sentence hint (point to the concept, no answer).
Respond ONLY with this JSON:
{"problems":[{"id":"p1","problem":"<problem>","hint":"<1-sentence hint>"}]}`;
    const result = await invokeLLM({
      model: "claude-haiku-4-5",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Generate the similar problems now." }
      ],
      // Scale per-problem token budget by difficulty
      max_tokens: Math.min(input.count * (input.difficulty === "easy" ? 120 : input.difficulty === "medium" ? 180 : 250), 1e3),
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    const text2 = extractLLMContent(result);
    const jsonStr = extractJsonFromContent(text2);
    try {
      return JSON.parse(jsonStr);
    } catch {
      const repaired = repairTruncatedJson(jsonStr);
      return JSON.parse(repaired);
    }
  }),
  generateStudyBlocks: publicProcedure.input(import_zod6.z.object({
    problem: import_zod6.z.string(),
    answer: import_zod6.z.string(),
    steps: import_zod6.z.array(import_zod6.z.object({
      stepNumber: import_zod6.z.number(),
      title: import_zod6.z.string(),
      explanation: import_zod6.z.string(),
      expression: import_zod6.z.string().optional()
    })).optional(),
    conceptExplained: import_zod6.z.string().optional(),
    tips: import_zod6.z.array(import_zod6.z.string()).optional(),
    subject: import_zod6.z.string(),
    gradeLevel: import_zod6.z.string().optional()
  })).mutation(async ({ input }) => {
    const stepsText = (input.steps ?? []).map(
      (s) => `Step ${s.stepNumber}: ${s.title}${s.expression ? ` [${s.expression}]` : ""} - ${s.explanation}`
    ).join("\n");
    const tipsText = (input.tips ?? []).join("; ");
    const prompt = `You are TutorSnap, an expert academic tutor.${gradeContext(input.gradeLevel)}
Convert this solution into 4-7 study blocks for a student to review.

Problem: "${input.problem.slice(0, 300)}"
Answer: "${input.answer.slice(0, 200)}"
${stepsText ? `Steps:
${stepsText.slice(0, 800)}` : ""}
${input.conceptExplained ? `Key concept: ${input.conceptExplained.slice(0, 200)}` : ""}
${tipsText ? `Tips: ${tipsText.slice(0, 200)}` : ""}

Block types available: core_answer, key_concept, worked_example, formula, definition, tip, analogy, summary, step_breakdown, visual_note.
Choose the most useful types for this specific problem. Always include core_answer as the first block.
Respond ONLY with this JSON:
{"blocks":[{"id":"b1","type":"core_answer","title":"Direct Answer","content":"..."}]}`;
    const result = await invokeLLM({
      model: "claude-haiku-4-5",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Generate the study blocks now." }
      ],
      max_tokens: 1200,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    const text2 = extractLLMContent(result);
    const jsonStr = extractJsonFromContent(text2);
    try {
      const parsed = JSON.parse(jsonStr);
      return { blocks: parsed.blocks ?? [] };
    } catch {
      try {
        const repaired = repairTruncatedJson(jsonStr);
        const parsed = JSON.parse(repaired);
        return { blocks: parsed.blocks ?? [] };
      } catch {
        return { blocks: [] };
      }
    }
  })
});
var voiceRouter = router({
  /** Get a presigned PUT URL to upload audio directly from the client */
  getUploadUrl: publicProcedure.input(import_zod6.z.object({ filename: import_zod6.z.string(), contentType: import_zod6.z.string() })).mutation(async ({ input }) => {
    const { key, url } = await storagePut(
      `voice/${input.filename}`,
      Buffer.alloc(0),
      input.contentType
    );
    return { key };
  }),
  /** Transcribe audio from a storage key */
  transcribe: publicProcedure.input(
    import_zod6.z.object({
      audioUrl: import_zod6.z.string(),
      language: import_zod6.z.string().optional()
    })
  ).mutation(async ({ input }) => {
    const result = await transcribeAudio({
      audioUrl: input.audioUrl,
      language: input.language,
      prompt: "Transcribe the student's spoken academic question accurately."
    });
    if ("error" in result) {
      throw new import_server4.TRPCError({
        code: "BAD_REQUEST",
        message: result.error
      });
    }
    return { text: result.text, language: result.language };
  })
});
var mathRouter = academicRouter;
var userRouter = router({
  getAppearanceSettings: protectedProcedure.query(async ({ ctx }) => {
    const { getAppearanceSettings: getAppearanceSettings2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const raw = await getAppearanceSettings2(ctx.user.id);
    return { settings: raw ?? null };
  }),
  saveAppearanceSettings: protectedProcedure.input(import_zod6.z.object({ settings: import_zod6.z.string().max(65535) })).mutation(async ({ ctx, input }) => {
    const { saveAppearanceSettings: saveAppearanceSettings2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    await saveAppearanceSettings2(ctx.user.id, input.settings);
    return { success: true };
  })
});
async function computeSubjectMultiplier(db2, userId, subject) {
  if (!db2) return 1;
  const rows = await db2.select({ rating: aireFeedback.rating }).from(aireFeedback).where((0, import_drizzle_orm7.and)((0, import_drizzle_orm7.eq)(aireFeedback.userId, userId), (0, import_drizzle_orm7.eq)(aireFeedback.subject, subject))).orderBy((0, import_drizzle_orm7.desc)(aireFeedback.createdAt)).limit(20);
  if (rows.length < 3) return 1;
  const tooLong = rows.filter((r) => r.rating === 1).length;
  const tooShort = rows.filter((r) => r.rating === -1).length;
  const ratio = rows.length;
  if (tooLong / ratio > 0.6) return 0.7;
  if (tooShort / ratio > 0.6) return 1.3;
  return 1;
}
async function refreshSubjectCalibration(db2, userId, subject) {
  if (!db2) return;
  const multiplier = await computeSubjectMultiplier(db2, userId, subject);
  const rows = await db2.select({ id: aireSubjectCalibration.id }).from(aireSubjectCalibration).where((0, import_drizzle_orm7.and)((0, import_drizzle_orm7.eq)(aireSubjectCalibration.userId, userId), (0, import_drizzle_orm7.eq)(aireSubjectCalibration.subject, subject))).limit(1);
  const countRows = await db2.select({ cnt: import_drizzle_orm7.sql`count(*)` }).from(aireFeedback).where((0, import_drizzle_orm7.and)((0, import_drizzle_orm7.eq)(aireFeedback.userId, userId), (0, import_drizzle_orm7.eq)(aireFeedback.subject, subject)));
  const sampleCount = Number(countRows[0]?.cnt ?? 0);
  if (rows.length > 0) {
    await db2.update(aireSubjectCalibration).set({ multiplier: String(multiplier), sampleCount }).where((0, import_drizzle_orm7.and)((0, import_drizzle_orm7.eq)(aireSubjectCalibration.userId, userId), (0, import_drizzle_orm7.eq)(aireSubjectCalibration.subject, subject)));
  } else {
    await db2.insert(aireSubjectCalibration).values({ userId, subject, multiplier: String(multiplier), sampleCount });
  }
}
var aireRouter = router({
  /**
   * Log a user's feedback rating for an AI response.
   * Stores up to 10 ratings per user; older ones are pruned.
   * rating: -1 = too short, 0 = just right, 1 = too long
   */
  logFeedback: publicProcedure.input(import_zod6.z.object({
    difficulty: import_zod6.z.number().int().min(1).max(5),
    subject: import_zod6.z.string().default("other"),
    steps: import_zod6.z.number().int().min(0).default(1),
    rating: import_zod6.z.number().int().min(-1).max(1)
  })).mutation(async ({ ctx, input }) => {
    const userId = ctx.user?.id ?? null;
    try {
      const db2 = await getDb();
      if (!db2) return { ok: false, reason: "db_unavailable" };
      await db2.insert(aireFeedback).values({
        userId,
        difficulty: input.difficulty,
        subject: input.subject,
        steps: input.steps,
        rating: input.rating
      });
      if (userId) {
        const rows = await db2.select({ id: aireFeedback.id }).from(aireFeedback).where((0, import_drizzle_orm7.eq)(aireFeedback.userId, userId)).orderBy((0, import_drizzle_orm7.desc)(aireFeedback.createdAt)).limit(30);
        if (rows.length > 20) {
          const idsToDelete = rows.slice(20).map((r) => r.id);
          for (const id of idsToDelete) {
            await db2.delete(aireFeedback).where((0, import_drizzle_orm7.eq)(aireFeedback.id, id));
          }
        }
        try {
          await refreshSubjectCalibration(db2, userId, input.subject);
        } catch {
        }
      }
      return { ok: true };
    } catch (err) {
      console.error("[AIRE] logFeedback error:", err);
      return { ok: false, reason: "error" };
    }
  }),
  /**
   * Returns per-subject calibration multipliers for the authenticated user.
   * Used by the AIRE Analytics screen to show calibration badges.
   */
  getSubjectCalibrations: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { calibrations: [] };
      const rows = await db2.select({
        subject: aireSubjectCalibration.subject,
        multiplier: aireSubjectCalibration.multiplier,
        sampleCount: aireSubjectCalibration.sampleCount,
        updatedAt: aireSubjectCalibration.updatedAt
      }).from(aireSubjectCalibration).where((0, import_drizzle_orm7.eq)(aireSubjectCalibration.userId, ctx.user.id)).orderBy((0, import_drizzle_orm7.desc)(aireSubjectCalibration.sampleCount));
      return { calibrations: rows };
    } catch (err) {
      console.error("[AIRE] getSubjectCalibrations error:", err);
      return { calibrations: [] };
    }
  }),
  /**
   * Returns per-user adjusted token budget multipliers based on their
   * last 10 feedback ratings. A net positive score (too long) reduces
   * budgets; net negative (too short) increases budgets.
   */
  getThresholds: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { multiplier: 1, sampleSize: 0 };
      const userId = ctx.user.id;
      const rows = await db2.select({ rating: aireFeedback.rating }).from(aireFeedback).where((0, import_drizzle_orm7.eq)(aireFeedback.userId, userId)).orderBy((0, import_drizzle_orm7.desc)(aireFeedback.createdAt)).limit(10);
      if (rows.length < 3) {
        return { multiplier: 1, sampleSize: rows.length };
      }
      const netScore = rows.reduce((sum, r) => sum + r.rating, 0);
      const normalised = netScore / rows.length;
      const multiplier = 1 - normalised * 0.3;
      const clamped = Math.max(0.6, Math.min(1.5, multiplier));
      return { multiplier: parseFloat(clamped.toFixed(2)), sampleSize: rows.length };
    } catch (err) {
      console.error("[AIRE] getThresholds error:", err);
      return { multiplier: 1, sampleSize: 0 };
    }
  })
});
var cloudSyncRouter = router({
  pushSolveHistory: protectedProcedure.input(import_zod6.z.object({
    items: import_zod6.z.array(import_zod6.z.object({
      problem: import_zod6.z.string(),
      answer: import_zod6.z.string().optional(),
      subject: import_zod6.z.string().optional(),
      solutionJson: import_zod6.z.string().optional(),
      bookmarked: import_zod6.z.boolean().optional(),
      solvedAt: import_zod6.z.number()
    })).max(200)
  })).mutation(async ({ ctx, input }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { ok: false };
      const userId = ctx.user.id;
      for (const item of input.items) {
        await db2.insert(solveHistory).values({
          userId,
          problem: item.problem,
          answer: item.answer ?? null,
          subject: item.subject ?? null,
          solutionJson: item.solutionJson ?? null,
          bookmarked: item.bookmarked ?? false,
          solvedAt: new Date(item.solvedAt)
        });
      }
      return { ok: true };
    } catch (err) {
      console.error("[cloudSync] pushSolveHistory error:", err);
      return { ok: false };
    }
  }),
  pullSolveHistory: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { items: [] };
      const rows = await db2.select().from(solveHistory).where((0, import_drizzle_orm7.eq)(solveHistory.userId, ctx.user.id)).orderBy((0, import_drizzle_orm7.desc)(solveHistory.solvedAt)).limit(200);
      return {
        items: rows.map((r) => ({
          problem: r.problem,
          answer: r.answer ?? "",
          subject: r.subject ?? "",
          solutionJson: r.solutionJson ?? null,
          bookmarked: r.bookmarked,
          solvedAt: r.solvedAt.getTime()
        }))
      };
    } catch (err) {
      console.error("[cloudSync] pullSolveHistory error:", err);
      return { items: [] };
    }
  }),
  pushChatSession: protectedProcedure.input(import_zod6.z.object({
    sessionId: import_zod6.z.string().max(64),
    title: import_zod6.z.string().max(255).optional(),
    subject: import_zod6.z.string().max(64).optional(),
    gradeLevel: import_zod6.z.string().max(32).optional(),
    messagesJson: import_zod6.z.string(),
    tags: import_zod6.z.string().optional(),
    pinned: import_zod6.z.boolean().optional(),
    messageCount: import_zod6.z.number().int().optional(),
    sessionCreatedAt: import_zod6.z.number(),
    sessionUpdatedAt: import_zod6.z.number()
  })).mutation(async ({ ctx, input }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { ok: false };
      const userId = ctx.user.id;
      const existing = await db2.select({ id: chatSessions.id }).from(chatSessions).where((0, import_drizzle_orm7.and)((0, import_drizzle_orm7.eq)(chatSessions.userId, userId), (0, import_drizzle_orm7.eq)(chatSessions.sessionId, input.sessionId))).limit(1);
      if (existing.length > 0) {
        await db2.update(chatSessions).set({
          title: input.title ?? null,
          subject: input.subject ?? null,
          gradeLevel: input.gradeLevel ?? null,
          messagesJson: input.messagesJson,
          tags: input.tags ?? null,
          pinned: input.pinned ?? false,
          messageCount: input.messageCount ?? 0,
          sessionUpdatedAt: new Date(input.sessionUpdatedAt)
        }).where((0, import_drizzle_orm7.and)((0, import_drizzle_orm7.eq)(chatSessions.userId, userId), (0, import_drizzle_orm7.eq)(chatSessions.sessionId, input.sessionId)));
      } else {
        await db2.insert(chatSessions).values({
          userId,
          sessionId: input.sessionId,
          title: input.title ?? null,
          subject: input.subject ?? null,
          gradeLevel: input.gradeLevel ?? null,
          messagesJson: input.messagesJson,
          tags: input.tags ?? null,
          pinned: input.pinned ?? false,
          messageCount: input.messageCount ?? 0,
          sessionCreatedAt: new Date(input.sessionCreatedAt),
          sessionUpdatedAt: new Date(input.sessionUpdatedAt)
        });
      }
      return { ok: true };
    } catch (err) {
      console.error("[cloudSync] pushChatSession error:", err);
      return { ok: false };
    }
  }),
  deleteChatSession: protectedProcedure.input(import_zod6.z.object({ sessionId: import_zod6.z.string().max(64) })).mutation(async ({ ctx, input }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { ok: false };
      await db2.delete(chatSessions).where((0, import_drizzle_orm7.and)((0, import_drizzle_orm7.eq)(chatSessions.userId, ctx.user.id), (0, import_drizzle_orm7.eq)(chatSessions.sessionId, input.sessionId)));
      return { ok: true };
    } catch (err) {
      console.error("[cloudSync] deleteChatSession error:", err);
      return { ok: false };
    }
  }),
  pullChatSessions: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { sessions: [] };
      const rows = await db2.select().from(chatSessions).where((0, import_drizzle_orm7.eq)(chatSessions.userId, ctx.user.id)).orderBy((0, import_drizzle_orm7.desc)(chatSessions.sessionUpdatedAt)).limit(100);
      return {
        sessions: rows.map((r) => ({
          sessionId: r.sessionId,
          title: r.title ?? "",
          subject: r.subject ?? null,
          gradeLevel: r.gradeLevel ?? null,
          messagesJson: r.messagesJson,
          tags: r.tags ?? "",
          pinned: r.pinned,
          messageCount: r.messageCount,
          sessionCreatedAt: r.sessionCreatedAt.getTime(),
          sessionUpdatedAt: r.sessionUpdatedAt.getTime()
        }))
      };
    } catch (err) {
      console.error("[cloudSync] pullChatSessions error:", err);
      return { sessions: [] };
    }
  }),
  pushProgress: protectedProcedure.input(import_zod6.z.object({ progressJson: import_zod6.z.string() })).mutation(async ({ ctx, input }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { ok: false };
      const userId = ctx.user.id;
      const existing = await db2.select({ id: userProgress.id }).from(userProgress).where((0, import_drizzle_orm7.eq)(userProgress.userId, userId)).limit(1);
      if (existing.length > 0) {
        await db2.update(userProgress).set({ progressJson: input.progressJson }).where((0, import_drizzle_orm7.eq)(userProgress.userId, userId));
      } else {
        await db2.insert(userProgress).values({ userId, progressJson: input.progressJson });
      }
      return { ok: true };
    } catch (err) {
      console.error("[cloudSync] pushProgress error:", err);
      return { ok: false };
    }
  }),
  pullProgress: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { progressJson: null };
      const rows = await db2.select({ progressJson: userProgress.progressJson }).from(userProgress).where((0, import_drizzle_orm7.eq)(userProgress.userId, ctx.user.id)).limit(1);
      return { progressJson: rows[0]?.progressJson ?? null };
    } catch (err) {
      console.error("[cloudSync] pullProgress error:", err);
      return { progressJson: null };
    }
  }),
  pushBookmarks: protectedProcedure.input(import_zod6.z.object({
    bookmarks: import_zod6.z.array(import_zod6.z.object({
      bookmarkId: import_zod6.z.string().max(64),
      itemJson: import_zod6.z.string(),
      subject: import_zod6.z.string().max(64).optional()
    })).max(200)
  })).mutation(async ({ ctx, input }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { ok: false };
      const userId = ctx.user.id;
      await db2.delete(userBookmarks).where((0, import_drizzle_orm7.eq)(userBookmarks.userId, userId));
      if (input.bookmarks.length > 0) {
        await db2.insert(userBookmarks).values(
          input.bookmarks.map((b) => ({
            userId,
            bookmarkId: b.bookmarkId,
            itemJson: b.itemJson,
            subject: b.subject ?? null
          }))
        );
      }
      return { ok: true };
    } catch (err) {
      console.error("[cloudSync] pushBookmarks error:", err);
      return { ok: false };
    }
  }),
  pullBookmarks: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { bookmarks: [] };
      const rows = await db2.select().from(userBookmarks).where((0, import_drizzle_orm7.eq)(userBookmarks.userId, ctx.user.id)).orderBy((0, import_drizzle_orm7.desc)(userBookmarks.createdAt)).limit(200);
      return {
        bookmarks: rows.map((r) => ({
          bookmarkId: r.bookmarkId,
          itemJson: r.itemJson,
          subject: r.subject ?? null
        }))
      };
    } catch (err) {
      console.error("[cloudSync] pullBookmarks error:", err);
      return { bookmarks: [] };
    }
  }),
  pushNotes: protectedProcedure.input(import_zod6.z.object({
    notes: import_zod6.z.array(import_zod6.z.object({
      noteId: import_zod6.z.string().max(64),
      noteJson: import_zod6.z.string()
    })).max(500)
  })).mutation(async ({ ctx, input }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { ok: false };
      const userId = ctx.user.id;
      await db2.delete(userNotes).where((0, import_drizzle_orm7.eq)(userNotes.userId, userId));
      if (input.notes.length > 0) {
        await db2.insert(userNotes).values(
          input.notes.map((n) => ({
            userId,
            noteId: n.noteId,
            noteJson: n.noteJson
          }))
        );
      }
      return { ok: true };
    } catch (err) {
      console.error("[cloudSync] pushNotes error:", err);
      return { ok: false };
    }
  }),
  pullNotes: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { notes: [] };
      const rows = await db2.select().from(userNotes).where((0, import_drizzle_orm7.eq)(userNotes.userId, ctx.user.id)).orderBy((0, import_drizzle_orm7.desc)(userNotes.updatedAt)).limit(500);
      return {
        notes: rows.map((r) => ({
          noteId: r.noteId,
          noteJson: r.noteJson
        }))
      };
    } catch (err) {
      console.error("[cloudSync] pullNotes error:", err);
      return { notes: [] };
    }
  }),
  /**
   * Single round-trip to restore all user data after sign-in.
   */
  pullAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { solveHistory: [], chatSessions: [], progressJson: null, bookmarks: [], notes: [] };
      const userId = ctx.user.id;
      const [historyRows, chatRows, progressRows, bookmarkRows, noteRows] = await Promise.all([
        db2.select().from(solveHistory).where((0, import_drizzle_orm7.eq)(solveHistory.userId, userId)).orderBy((0, import_drizzle_orm7.desc)(solveHistory.solvedAt)).limit(200),
        db2.select().from(chatSessions).where((0, import_drizzle_orm7.eq)(chatSessions.userId, userId)).orderBy((0, import_drizzle_orm7.desc)(chatSessions.sessionUpdatedAt)).limit(100),
        db2.select({ progressJson: userProgress.progressJson }).from(userProgress).where((0, import_drizzle_orm7.eq)(userProgress.userId, userId)).limit(1),
        db2.select().from(userBookmarks).where((0, import_drizzle_orm7.eq)(userBookmarks.userId, userId)).orderBy((0, import_drizzle_orm7.desc)(userBookmarks.createdAt)).limit(200),
        db2.select().from(userNotes).where((0, import_drizzle_orm7.eq)(userNotes.userId, userId)).orderBy((0, import_drizzle_orm7.desc)(userNotes.updatedAt)).limit(500)
      ]);
      return {
        solveHistory: historyRows.map((r) => ({
          problem: r.problem,
          answer: r.answer ?? "",
          subject: r.subject ?? "",
          solutionJson: r.solutionJson ?? null,
          bookmarked: r.bookmarked,
          solvedAt: r.solvedAt.getTime()
        })),
        chatSessions: chatRows.map((r) => ({
          sessionId: r.sessionId,
          title: r.title ?? "",
          subject: r.subject ?? null,
          gradeLevel: r.gradeLevel ?? null,
          messagesJson: r.messagesJson,
          tags: r.tags ?? "",
          pinned: r.pinned,
          messageCount: r.messageCount,
          sessionCreatedAt: r.sessionCreatedAt.getTime(),
          sessionUpdatedAt: r.sessionUpdatedAt.getTime()
        })),
        progressJson: progressRows[0]?.progressJson ?? null,
        bookmarks: bookmarkRows.map((r) => ({
          bookmarkId: r.bookmarkId,
          itemJson: r.itemJson,
          subject: r.subject ?? null
        })),
        notes: noteRows.map((r) => ({
          noteId: r.noteId,
          noteJson: r.noteJson
        }))
      };
    } catch (err) {
      console.error("[cloudSync] pullAll error:", err);
      return { solveHistory: [], chatSessions: [], progressJson: null, bookmarks: [], notes: [] };
    }
  })
});
var subscriptionRouter = router({
  /**
   * Returns the server-side subscription status for the signed-in user.
   * Reads the `subscriptions` table populated by the RevenueCat webhook.
   * Use this to verify premium status server-side (cannot be spoofed by client).
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db2 = await getDb();
      if (!db2) return { isPremium: false, status: null, productId: null, expiresAt: null, isInGracePeriod: false, cancelledButActive: false };
      const rows = await db2.select().from(subscriptions).where((0, import_drizzle_orm7.eq)(subscriptions.userId, ctx.user.id)).orderBy((0, import_drizzle_orm7.desc)(subscriptions.updatedAt)).limit(1);
      if (rows.length === 0) {
        return { isPremium: false, status: null, productId: null, expiresAt: null, isInGracePeriod: false, cancelledButActive: false };
      }
      const row = rows[0];
      const now = Date.now();
      const expiresAtMs = row.expiresAt ? row.expiresAt.getTime() : null;
      const cancelledButActive = row.status === "cancelled" && expiresAtMs !== null && expiresAtMs > now;
      const isInGracePeriod = row.isInGracePeriod ?? false;
      const isPremium = row.status === "active" || cancelledButActive;
      return {
        isPremium,
        status: row.status,
        productId: row.productId ?? null,
        expiresAt: expiresAtMs,
        isInGracePeriod,
        cancelledButActive
      };
    } catch (err) {
      console.error("[subscriptionRouter] getStatus error:", err);
      return { isPremium: false, status: null, productId: null, expiresAt: null, isInGracePeriod: false, cancelledButActive: false };
    }
  }),
  /**
   * Returns the full subscription history for the signed-in user.
   * All rows from the `subscriptions` table ordered by updatedAt DESC, limit 50.
   */
  history: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db2 = await getDb();
      if (!db2) return [];
      const rows = await db2.select({
        id: subscriptions.id,
        productId: subscriptions.productId,
        status: subscriptions.status,
        expiresAt: subscriptions.expiresAt,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt
      }).from(subscriptions).where((0, import_drizzle_orm7.eq)(subscriptions.userId, ctx.user.id)).orderBy((0, import_drizzle_orm7.desc)(subscriptions.updatedAt)).limit(50);
      return rows.map((r) => {
        const pid = (r.productId ?? "").toLowerCase();
        const platform = pid.includes("android") || pid.includes("google") || pid.includes("play") ? "android" : pid.includes("ios") || pid.includes("apple") ? "ios" : "unknown";
        return {
          id: r.id,
          productId: r.productId,
          status: r.status,
          expiresAt: r.expiresAt ? r.expiresAt.getTime() : null,
          createdAt: r.createdAt.getTime(),
          updatedAt: r.updatedAt.getTime(),
          platform
        };
      });
    } catch (err) {
      console.error("[subscriptionRouter] history error:", err);
      return [];
    }
  })
});
var authRouter = router({
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, {
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/"
    });
    return { success: true };
  })
});
var appRouter = router({
  math: mathRouter,
  cloudSync: cloudSyncRouter,
  academic: academicRouter,
  auth: authRouter,
  user: userRouter,
  system: systemRouter,
  voice: voiceRouter,
  referral: referralRouter,
  oauth: oauthRouter,
  emailAuth: emailAuthRouter,
  aire: aireRouter,
  subscription: subscriptionRouter,
  classroom: classroomRouter
});

// server/_core/context.ts
init_sdk();
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/index.ts
initSentryServer();
var DEFAULT_ALLOWED_ORIGINS = [
  "https://tutorsnapai.tech",
  "https://www.tutorsnapai.tech",
  "http://localhost:8081",
  "http://localhost:19006"
];
function getAllowedOrigins() {
  const configured = (process.env.CORS_ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
  return /* @__PURE__ */ new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}
function getReleaseVersion() {
  return process.env.APP_VERSION?.trim() || "2.3.0";
}
async function startServer() {
  const app = (0, import_express.default)();
  const server = (0, import_http.createServer)(app);
  const allowedOrigins = getAllowedOrigins();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isAllowedOrigin = !origin || allowedOrigins.has(origin);
    if (!isAllowedOrigin) {
      res.status(403).json({ ok: false, error: "Origin not allowed" });
      return;
    }
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Id, X-Cron-Secret"
    );
    res.header("X-Content-Type-Options", "nosniff");
    res.header("Referrer-Policy", "no-referrer");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerVoiceUploadRoute(app);
  registerChatStreamRoute(app);
  registerMathRenderRoute(app);
  registerClassroomAcceptanceRoute(app);
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "tutorsnap-api",
      version: getReleaseVersion(),
      commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 12) || null,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/ready", async (_req, res) => {
    try {
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { sql: sql4 } = await import("drizzle-orm");
      const db2 = await getDb2();
      if (!db2) {
        res.status(503).json({ ok: false, database: "unavailable" });
        return;
      }
      await db2.execute(sql4`select 1`);
      res.json({
        ok: true,
        database: "ready",
        version: getReleaseVersion(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("[Readiness] Database check failed:", error);
      res.status(503).json({ ok: false, database: "unavailable" });
    }
  });
  app.post("/api/scheduled/otp-cleanup", async (req, res) => {
    const scheduleSecret = process.env.SCHEDULE_SECRET?.trim();
    if (!scheduleSecret) {
      res.status(503).json({ ok: false, error: "Scheduled operation is not configured" });
      return;
    }
    const authorization = req.headers.authorization;
    const headerSecret = req.headers["x-cron-secret"];
    if (authorization !== `Bearer ${scheduleSecret}` && headerSecret !== scheduleSecret) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    try {
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { otpCodes: otpCodes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { lt: lt3 } = await import("drizzle-orm");
      const db2 = await getDb2();
      if (!db2) {
        res.status(503).json({ ok: false, error: "DB unavailable" });
        return;
      }
      const deletedRows = await db2.delete(otpCodes2).where(lt3(otpCodes2.expiresAt, /* @__PURE__ */ new Date())).returning({ id: otpCodes2.id });
      const deleted = deletedRows.length;
      res.json({ ok: true, deleted });
    } catch (err) {
      console.error("[OTP Cleanup] Error:", err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });
  app.get("/version.json", (_req, res) => {
    const latestVersion = getReleaseVersion();
    res.json({
      latestVersion,
      minVersion: process.env.MIN_SUPPORTED_VERSION?.trim() || latestVersion,
      releaseNotes: (process.env.RELEASE_NOTES ?? "").split("|").map((note) => note.trim()).filter(Boolean),
      iosStoreUrl: process.env.IOS_STORE_URL?.trim() || "https://apps.apple.com/app/tutorsnap/id6748752791",
      androidStoreUrl: process.env.ANDROID_STORE_URL?.trim() || "https://play.google.com/store/apps/details?id=com.tutorsnap.app",
      forceUpdate: process.env.FORCE_UPDATE === "true"
    });
  });
  app.post(
    "/api/webhooks/revenuecat",
    import_express.default.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
        const isProduction = process.env.NODE_ENV === "production";
        if (!secret) {
          if (isProduction) {
            console.error(
              "[RC Webhook] CRITICAL: REVENUECAT_WEBHOOK_SECRET is not set in production. All webhook requests are rejected to prevent unauthorized subscription grants."
            );
            res.status(500).json({ ok: false, error: "Webhook secret not configured" });
            return;
          }
          console.warn("[RC Webhook] REVENUECAT_WEBHOOK_SECRET not set \u2014 skipping auth check (dev mode)");
        } else {
          const authHeader = req.headers["authorization"];
          if (authHeader !== secret) {
            console.warn("[RC Webhook] Unauthorized request \u2014 Authorization header mismatch");
            res.status(401).json({ ok: false, error: "Unauthorized" });
            return;
          }
        }
        let payload;
        try {
          const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
          payload = JSON.parse(raw);
        } catch {
          console.warn("[RC Webhook] Invalid JSON body");
          res.status(400).json({ ok: false, error: "Invalid JSON" });
          return;
        }
        const event = payload?.event;
        if (!event) {
          console.warn("[RC Webhook] Missing event object in payload");
          res.status(400).json({ ok: false, error: "Missing event" });
          return;
        }
        const eventType = event.type ?? "";
        const rcUserId = eventType === "TRANSFER" && event.transferred_to ? event.transferred_to : event.app_user_id ?? "";
        const productId = event.product_id ?? "";
        const expiresAtMs = event.expiration_at_ms ?? null;
        console.log(`[RC Webhook] event=${eventType} rcUser=${rcUserId} product=${productId}`);
        const NO_OP_EVENTS = /* @__PURE__ */ new Set(["SUBSCRIBER_ALIAS"]);
        const GRACE_PERIOD_EVENTS = /* @__PURE__ */ new Set(["BILLING_ISSUE", "GRACE_PERIOD_START"]);
        const STATUS_MAP = {
          // Purchase / renewal events → active
          INITIAL_PURCHASE: "active",
          RENEWAL: "active",
          PRODUCT_CHANGE: "active",
          UNCANCELLATION: "active",
          NON_RENEWING_PURCHASE: "active",
          TRANSFER: "active",
          // Refund reversed → re-activate (RC claws back the refund; access restored)
          REFUND_REVERSED: "active",
          // Subscription extended → still active with new expiry
          SUBSCRIPTION_EXTENDED: "active",
          // Grace-period events — user still has entitlement
          BILLING_ISSUE: "active",
          // RC keeps access during grace period
          GRACE_PERIOD_START: "active",
          // billing failed; grace period begins
          // Termination events
          GRACE_PERIOD_END: "expired",
          // grace period ended; access revoked
          EXPIRATION: "expired",
          CANCELLATION: "cancelled",
          // still active until expiresAt
          REFUND: "refunded"
        };
        if (NO_OP_EVENTS.has(eventType)) {
          console.log(`[RC Webhook] No-op event: ${eventType} \u2014 acknowledged`);
          res.json({ ok: true, handled: false, reason: "no-op event" });
          return;
        }
        const newStatus = STATUS_MAP[eventType];
        if (!newStatus) {
          console.log(`[RC Webhook] Unknown event type: ${eventType} \u2014 acknowledged`);
          res.json({ ok: true, handled: false, reason: "unknown event type" });
          return;
        }
        const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { subscriptions: subscriptions2, users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq8, and: and6 } = await import("drizzle-orm");
        const db2 = await getDb2();
        if (!db2) {
          console.warn("[RC Webhook] DB unavailable \u2014 cannot persist subscription event");
          res.json({ ok: true, persisted: false });
          return;
        }
        let localUserId = null;
        if (rcUserId) {
          const userRows = await db2.select({ id: users2.id }).from(users2).where(eq8(users2.openId, rcUserId)).limit(1);
          if (userRows.length > 0) {
            localUserId = userRows[0].id;
          }
        }
        const MYSQL_TIMESTAMP_MAX = /* @__PURE__ */ new Date("2038-01-19T03:14:07.000Z");
        const expiresAt = expiresAtMs ? new Date(Math.min(expiresAtMs, MYSQL_TIMESTAMP_MAX.getTime())) : null;
        const eventTimestampMs = event.purchased_at_ms ?? event.event_timestamp_ms ?? (expiresAtMs ?? null);
        const existing = await db2.select({
          id: subscriptions2.id,
          status: subscriptions2.status,
          expiresAt: subscriptions2.expiresAt,
          updatedAt: subscriptions2.updatedAt
        }).from(subscriptions2).where(
          and6(
            eq8(subscriptions2.revenueCatUserId, rcUserId),
            eq8(subscriptions2.productId, productId)
          )
        ).limit(1);
        if (existing.length > 0) {
          const existingRow = existing[0];
          const existingUpdatedMs = existingRow.updatedAt.getTime();
          if (eventTimestampMs !== null && existingUpdatedMs > eventTimestampMs + 5e3) {
            console.log(
              `[RC Webhook] Skipping out-of-order event: ${eventType} (existing updatedAt=${existingUpdatedMs} > event ts=${eventTimestampMs})`
            );
            res.json({ ok: true, handled: false, reason: "out-of-order event skipped" });
            return;
          }
          const existingExpiresMs = existingRow.expiresAt ? existingRow.expiresAt.getTime() : null;
          const incomingExpiresMs = expiresAt ? expiresAt.getTime() : null;
          const sameStatus = existingRow.status === newStatus;
          const sameExpiry = existingExpiresMs === incomingExpiresMs;
          const sameTimestamp = eventTimestampMs !== null && Math.abs(existingUpdatedMs - eventTimestampMs) <= 5e3;
          if (sameStatus && sameExpiry && sameTimestamp) {
            console.log(`[RC Webhook] Exact duplicate skipped: ${eventType} for rcUser=${rcUserId}`);
            res.json({ ok: true, handled: false, reason: "exact duplicate skipped" });
            return;
          }
          await db2.update(subscriptions2).set({
            status: newStatus,
            isInGracePeriod: GRACE_PERIOD_EVENTS.has(eventType),
            ...localUserId !== null ? { userId: localUserId } : {},
            ...expiresAt !== null ? { expiresAt } : {}
          }).where(eq8(subscriptions2.id, existingRow.id));
        } else {
          await db2.insert(subscriptions2).values({
            revenueCatUserId: rcUserId,
            productId,
            status: newStatus,
            isInGracePeriod: GRACE_PERIOD_EVENTS.has(eventType),
            ...localUserId !== null ? { userId: localUserId } : {},
            ...expiresAt !== null ? { expiresAt } : {}
          });
        }
        console.log(`[RC Webhook] Persisted: ${eventType} \u2192 ${newStatus} for rcUser=${rcUserId}`);
        if (eventType === "INITIAL_PURCHASE" || eventType === "RENEWAL") {
          const { notifyOwner: notifyOwner2 } = await Promise.resolve().then(() => (init_notification(), notification_exports));
          notifyOwner2({
            title: eventType === "INITIAL_PURCHASE" ? "\u{1F389} New Subscription!" : "\u{1F504} Subscription Renewed",
            content: `Product: ${productId || "unknown"}
RC User: ${rcUserId || "anonymous"}
Status: ${newStatus}`
          }).catch((err) => {
            console.warn("[RC Webhook] Owner notification failed (non-fatal):", err);
          });
        }
        res.json({ ok: true, handled: true, status: newStatus });
      } catch (err) {
        console.error("[RC Webhook] Unexpected error:", err);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );
  app.use(
    "/api/trpc",
    (0, import_express2.createExpressMiddleware)({
      router: appRouter,
      createContext
    })
  );
  const port = Number.parseInt(process.env.PORT || "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
  }
  server.keepAliveTimeout = 65e3;
  server.headersTimeout = 66e3;
  await new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(port, "0.0.0.0", () => {
      server.off("error", onError);
      console.log(`[API] TutorSnap ${getReleaseVersion()} listening on port ${port}`);
      resolve();
    });
  });
  await startCleanupScheduler();
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[API] ${signal} received; draining connections`);
    const forceExitTimer = setTimeout(() => {
      console.error("[API] Graceful shutdown timed out");
      process.exit(1);
    }, 1e4);
    forceExitTimer.unref();
    server.close((error) => {
      clearTimeout(forceExitTimer);
      if (error) {
        console.error("[API] Shutdown failed:", error);
        process.exit(1);
      }
      console.log("[API] Shutdown complete");
      process.exit(0);
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}
startServer().catch((error) => {
  console.error("[API] Failed to start:", error);
  process.exitCode = 1;
});
async function startCleanupScheduler() {
  try {
    const [{ startOtpCleanupScheduler: startOtpCleanupScheduler2 }, { startClassroomCleanupScheduler: startClassroomCleanupScheduler2 }] = await Promise.all([
      Promise.resolve().then(() => (init_email_auth(), email_auth_exports)),
      Promise.resolve().then(() => (init_classroom(), classroom_exports))
    ]);
    await Promise.all([
      startOtpCleanupScheduler2(),
      startClassroomCleanupScheduler2()
    ]);
  } catch (err) {
    console.warn("[Cleanup] Could not start a scheduler (non-fatal):", err?.message ?? err);
  }
}
