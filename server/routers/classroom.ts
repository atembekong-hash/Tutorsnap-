import { createHash, randomInt, randomUUID } from "node:crypto";
import { hostname } from "node:os";

import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import type { Request } from "express";
import { z } from "zod";

import {
  assignmentComments,
  assignmentSubmissions,
  assignments,
  classroomJoinAttempts,
  classroomMembers,
  classrooms,
  schedulerLocks,
  users,
  type AssignmentRow,
  type ClassroomMemberRow,
  type ClassroomRow,
} from "@/drizzle/schema";
import { getDb } from "@/server/db";
import { protectedProcedure, router } from "@/server/_core/trpc";

const PUBLIC_ID_SCHEMA = z.string().uuid();
const CLASSROOM_ID_INPUT = z.object({ classroomId: PUBLIC_ID_SCHEMA });
const ASSIGNMENT_ID_INPUT = z.object({ assignmentId: PUBLIC_ID_SCHEMA });
const COMMENT_ID_INPUT = z.object({ commentId: PUBLIC_ID_SCHEMA });
const CURSOR_SCHEMA = z.string().max(64).optional();
const PAGE_SIZE_SCHEMA = z.number().int().min(1).max(50).default(25);

const CLASS_NAME_SCHEMA = z.string().trim().min(1).max(120);
const SUBJECT_SCHEMA = z.string().trim().min(1).max(64);
const GRADE_LEVEL_SCHEMA = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .nullable()
  .optional();
const ASSIGNMENT_TITLE_SCHEMA = z.string().trim().min(1).max(160);
const ASSIGNMENT_INSTRUCTIONS_SCHEMA = z.string().trim().min(1).max(20_000);
const RESPONSE_TEXT_SCHEMA = z.string().trim().max(4_000).nullable().optional();
const COMMENT_BODY_SCHEMA = z.string().trim().min(1).max(1_000);
const MODERATION_REASON_SCHEMA = z.enum([
  "inappropriate",
  "harassment",
  "spam",
  "personal_information",
  "other",
]);

const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const JOIN_CODE_LENGTH = 8;
const MAX_JOIN_CODE_GENERATION_ATTEMPTS = 8;
const MAX_TEACHER_CLASSES = 20;
const MAX_ACTIVE_LEARNERS = 100;
const JOIN_RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_JOIN_ATTEMPTS_PER_USER = 10;
const MAX_JOIN_ATTEMPTS_PER_IP = 100;
const COMMENT_MINUTE_WINDOW_MS = 60 * 1000;
const COMMENT_HOUR_WINDOW_MS = 60 * 60 * 1000;
const MAX_COMMENTS_PER_MINUTE = 10;
const MAX_COMMENTS_PER_HOUR = 50;
const CLASS_CODE_ERROR = "That class code is invalid or unavailable.";

const DEFAULT_TRUSTED_CIDRS = [
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
  "::1/128",
];

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type ClassroomRole = ClassroomMemberRow["role"];

type ClassroomAccess = {
  classroom: ClassroomRow;
  membership: ClassroomMemberRow;
};

type AssignmentAccess = ClassroomAccess & {
  assignment: AssignmentRow;
};

function isClassroomEnabled(): boolean {
  const value = process.env.CLASSROOM_MVP_ENABLED?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

async function requireDatabase(): Promise<Database> {
  const database = await getDb();
  if (!database) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Classroom data is temporarily unavailable.",
    });
  }
  return database;
}

function requireActiveClass(classroom: ClassroomRow): void {
  if (!classroom.isActive) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This class is archived and is currently read-only.",
    });
  }
}

function safeDisplayName(name: string | null, role: ClassroomRole): string {
  const normalized = name?.trim();
  if (normalized) return normalized.slice(0, 120);
  return role === "teacher" ? "Teacher" : "Learner";
}

function normalizeJoinCode(value: string): string {
  return value.toUpperCase().replace(/[\s-]+/g, "");
}

function generateJoinCode(): string {
  let code = "";
  for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
    code += JOIN_CODE_ALPHABET[randomInt(0, JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

function hashJoinCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function isDuplicateEntry(error: unknown): boolean {
  let candidate = error as {
    code?: string;
    errno?: number;
    message?: string;
    cause?: unknown;
  } | null;
  for (let depth = 0; candidate && depth < 4; depth += 1) {
    if (
      candidate.code === "ER_DUP_ENTRY" ||
      candidate.errno === 1062 ||
      candidate.message?.includes("Duplicate entry") === true
    ) {
      return true;
    }
    candidate = candidate.cause as typeof candidate;
  }
  return false;
}

function encodeCursor(id: number): string {
  return Buffer.from(String(id), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined): number | null {
  if (!cursor) return null;
  try {
    const value = Number(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("invalid");
    return value;
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid pagination cursor.",
    });
  }
}

function ipToInt(ip: string): number {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) | Number.parseInt(octet, 10), 0) >>> 0
  );
}

function cidrContains(cidr: string, ip: string): boolean {
  if (cidr === "::1/128") return ip === "::1";
  try {
    const [base, rawBits] = cidr.split("/");
    if (
      !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(base) ||
      !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)
    )
      return false;
    const bits = rawBits ? Number.parseInt(rawBits, 10) : 32;
    if (bits < 0 || bits > 32) return false;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (ipToInt(base) & mask) === (ipToInt(ip) & mask);
  } catch {
    return false;
  }
}

function isTrustedProxy(remoteAddress: string): boolean {
  const cidrs = process.env.TRUSTED_PROXY_CIDRS
    ? process.env.TRUSTED_PROXY_CIDRS.split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : DEFAULT_TRUSTED_CIDRS;
  const normalized = remoteAddress.replace(/^::ffff:/, "");
  return cidrs.some((cidr) => cidrContains(cidr, normalized));
}

function getClientIp(req?: Request): string {
  if (!req) return "unknown";
  const remote = req.socket?.remoteAddress ?? "";
  if (isTrustedProxy(remote)) {
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

async function resolveClassroomAccess(
  database: Database,
  userId: number,
  classroomPublicId: string,
): Promise<ClassroomAccess> {
  const rows = await database
    .select({ classroom: classrooms, membership: classroomMembers })
    .from(classrooms)
    .innerJoin(
      classroomMembers,
      and(
        eq(classroomMembers.classroomId, classrooms.id),
        eq(classroomMembers.userId, userId),
      ),
    )
    .where(eq(classrooms.publicId, classroomPublicId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
  }
  return row;
}

async function resolveAssignmentAccess(
  database: Database,
  userId: number,
  assignmentPublicId: string,
): Promise<AssignmentAccess> {
  const rows = await database
    .select({
      assignment: assignments,
      classroom: classrooms,
      membership: classroomMembers,
    })
    .from(assignments)
    .innerJoin(classrooms, eq(classrooms.id, assignments.classroomId))
    .innerJoin(
      classroomMembers,
      and(
        eq(classroomMembers.classroomId, classrooms.id),
        eq(classroomMembers.userId, userId),
      ),
    )
    .where(eq(assignments.publicId, assignmentPublicId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Assignment not found.",
    });
  }
  if (
    row.membership.role === "learner" &&
    row.assignment.status !== "published"
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Assignment not found.",
    });
  }
  return row;
}

async function resolveCommentAccess(
  database: Database,
  userId: number,
  commentPublicId: string,
): Promise<
  AssignmentAccess & { comment: typeof assignmentComments.$inferSelect }
> {
  const rows = await database
    .select({
      comment: assignmentComments,
      assignment: assignments,
      classroom: classrooms,
      membership: classroomMembers,
    })
    .from(assignmentComments)
    .innerJoin(assignments, eq(assignments.id, assignmentComments.assignmentId))
    .innerJoin(classrooms, eq(classrooms.id, assignments.classroomId))
    .innerJoin(
      classroomMembers,
      and(
        eq(classroomMembers.classroomId, classrooms.id),
        eq(classroomMembers.userId, userId),
      ),
    )
    .where(eq(assignmentComments.publicId, commentPublicId))
    .limit(1);

  const row = rows[0];
  if (
    !row ||
    (row.membership.role === "learner" && row.assignment.status !== "published")
  ) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found." });
  }
  return row;
}

function requireTeacher(role: ClassroomRole): void {
  if (role !== "teacher") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Teacher access is required.",
    });
  }
}

function requireLearner(role: ClassroomRole): void {
  if (role !== "learner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Learner access is required.",
    });
  }
}

function classProjection(
  classroom: ClassroomRow,
  role: ClassroomRole,
  memberCount?: number,
) {
  return {
    id: classroom.publicId,
    name: classroom.name,
    subject: classroom.subject,
    gradeLevel: classroom.gradeLevel,
    role,
    isActive: classroom.isActive,
    ...(typeof memberCount === "number" ? { memberCount } : {}),
    ...(role === "teacher" ? { joinCode: classroom.joinCode } : {}),
    createdAt: classroom.createdAt,
    updatedAt: classroom.updatedAt,
  };
}

function assignmentProjection(assignment: AssignmentRow) {
  return {
    id: assignment.publicId,
    title: assignment.title,
    instructions: assignment.instructions,
    subject: assignment.subject,
    dueAt: assignment.dueAt,
    status: assignment.status,
    publishedAt: assignment.publishedAt,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}

async function enforceJoinRateLimit(
  database: Database,
  userId: number,
  ipAddress: string,
): Promise<void> {
  const windowStart = new Date(Date.now() - JOIN_RATE_WINDOW_MS);
  const [userRows, ipRows] = await Promise.all([
    database
      .select({ count: sql<number>`COUNT(*)` })
      .from(classroomJoinAttempts)
      .where(
        and(
          eq(classroomJoinAttempts.userId, userId),
          gt(classroomJoinAttempts.createdAt, windowStart),
        ),
      ),
    ipAddress === "unknown"
      ? Promise.resolve([{ count: 0 }])
      : database
          .select({ count: sql<number>`COUNT(*)` })
          .from(classroomJoinAttempts)
          .where(
            and(
              eq(classroomJoinAttempts.ipAddress, ipAddress),
              gt(classroomJoinAttempts.createdAt, windowStart),
            ),
          ),
  ]);

  if (
    (Number(userRows[0]?.count) || 0) >= MAX_JOIN_ATTEMPTS_PER_USER ||
    (Number(ipRows[0]?.count) || 0) >= MAX_JOIN_ATTEMPTS_PER_IP
  ) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many class-code attempts. Please wait before trying again.",
    });
  }
}

async function recordJoinAttempt(
  database: Database,
  userId: number,
  ipAddress: string,
  normalizedCode: string,
  outcome: string,
): Promise<void> {
  await database.insert(classroomJoinAttempts).values({
    userId,
    ipAddress: ipAddress === "unknown" ? null : ipAddress,
    codeHash: hashJoinCode(normalizedCode),
    outcome: outcome.slice(0, 32),
  });
}

async function findClassByJoinCode(database: Database, normalizedCode: string) {
  const rows = await database
    .select()
    .from(classrooms)
    .where(
      and(
        eq(classrooms.joinCode, normalizedCode),
        eq(classrooms.isActive, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function countLearners(
  database: Database,
  classroomId: number,
): Promise<number> {
  const rows = await database
    .select({ count: sql<number>`COUNT(*)` })
    .from(classroomMembers)
    .where(
      and(
        eq(classroomMembers.classroomId, classroomId),
        eq(classroomMembers.role, "learner"),
      ),
    );
  return Number(rows[0]?.count) || 0;
}

async function enforceCommentRateLimit(
  database: Database,
  userId: number,
): Promise<void> {
  const now = Date.now();
  const [minuteRows, hourRows] = await Promise.all([
    database
      .select({ count: sql<number>`COUNT(*)` })
      .from(assignmentComments)
      .where(
        and(
          eq(assignmentComments.authorUserId, userId),
          gt(
            assignmentComments.createdAt,
            new Date(now - COMMENT_MINUTE_WINDOW_MS),
          ),
        ),
      ),
    database
      .select({ count: sql<number>`COUNT(*)` })
      .from(assignmentComments)
      .where(
        and(
          eq(assignmentComments.authorUserId, userId),
          gt(
            assignmentComments.createdAt,
            new Date(now - COMMENT_HOUR_WINDOW_MS),
          ),
        ),
      ),
  ]);

  if (
    (Number(minuteRows[0]?.count) || 0) >= MAX_COMMENTS_PER_MINUTE ||
    (Number(hourRows[0]?.count) || 0) >= MAX_COMMENTS_PER_HOUR
  ) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        "You are commenting too quickly. Please wait before posting again.",
    });
  }
}

const classroomEnabledProcedure = protectedProcedure.use(async ({ next }) => {
  if (!isClassroomEnabled()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Guided Classroom is temporarily unavailable.",
    });
  }
  return next();
});

const classroomMemberProcedure = classroomEnabledProcedure
  .input(CLASSROOM_ID_INPUT)
  .use(async ({ ctx, input, next }) => {
    const database = await requireDatabase();
    const access = await resolveClassroomAccess(
      database,
      ctx.user.id,
      input.classroomId,
    );
    return next({ ctx: { ...ctx, database, classroomAccess: access } });
  });

const classroomTeacherProcedure = classroomMemberProcedure.use(
  async ({ ctx, next }) => {
    requireTeacher(ctx.classroomAccess.membership.role);
    return next({ ctx });
  },
);

const assignmentMemberProcedure = classroomEnabledProcedure
  .input(ASSIGNMENT_ID_INPUT)
  .use(async ({ ctx, input, next }) => {
    const database = await requireDatabase();
    const access = await resolveAssignmentAccess(
      database,
      ctx.user.id,
      input.assignmentId,
    );
    return next({ ctx: { ...ctx, database, assignmentAccess: access } });
  });

const assignmentTeacherProcedure = assignmentMemberProcedure.use(
  async ({ ctx, next }) => {
    requireTeacher(ctx.assignmentAccess.membership.role);
    return next({ ctx });
  },
);

const commentMemberProcedure = classroomEnabledProcedure
  .input(COMMENT_ID_INPUT)
  .use(async ({ ctx, input, next }) => {
    const database = await requireDatabase();
    const access = await resolveCommentAccess(
      database,
      ctx.user.id,
      input.commentId,
    );
    return next({ ctx: { ...ctx, database, commentAccess: access } });
  });

async function buildClassCard(
  database: Database,
  classroom: ClassroomRow,
  membership: ClassroomMemberRow,
) {
  const assignmentRows = await database
    .select({
      id: assignments.id,
      publicId: assignments.publicId,
      title: assignments.title,
      dueAt: assignments.dueAt,
      status: assignments.status,
    })
    .from(assignments)
    .where(eq(assignments.classroomId, classroom.id))
    .orderBy(asc(assignments.dueAt), desc(assignments.id));

  const published = assignmentRows.filter(
    (assignment) => assignment.status === "published",
  );
  let completed = 0;
  let completedAssignmentIds = new Set<number>();
  if (membership.role === "learner" && published.length > 0) {
    const submissionRows = await database
      .select({
        assignmentId: assignmentSubmissions.assignmentId,
        status: assignmentSubmissions.status,
      })
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.userId, membership.userId),
          inArray(
            assignmentSubmissions.assignmentId,
            published.map((assignment) => assignment.id),
          ),
          eq(assignmentSubmissions.status, "complete"),
        ),
      );
    completed = submissionRows.length;
    completedAssignmentIds = new Set(
      submissionRows.map((submission) => submission.assignmentId),
    );
  }

  const nextDue =
    published.find(
      (assignment) =>
        assignment.dueAt &&
        assignment.dueAt.getTime() >= Date.now() &&
        (membership.role === "teacher" ||
          !completedAssignmentIds.has(assignment.id)),
    ) ?? null;
  const memberCount =
    membership.role === "teacher"
      ? await countLearners(database, classroom.id)
      : undefined;

  return {
    ...classProjection(classroom, membership.role, memberCount),
    assignmentCounts: {
      draft:
        membership.role === "teacher"
          ? assignmentRows.filter((assignment) => assignment.status === "draft")
              .length
          : 0,
      published: published.length,
      completed,
      pending:
        membership.role === "learner"
          ? Math.max(0, published.length - completed)
          : 0,
    },
    nextDue: nextDue
      ? { id: nextDue.publicId, title: nextDue.title, dueAt: nextDue.dueAt }
      : null,
  };
}

export const classroomRouter = router({
  status: protectedProcedure.query(() => ({ enabled: isClassroomEnabled() })),

  create: classroomEnabledProcedure
    .input(
      z.object({
        name: CLASS_NAME_SCHEMA,
        subject: SUBJECT_SCHEMA,
        gradeLevel: GRADE_LEVEL_SCHEMA,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const database = await requireDatabase();
      const ownedRows = await database
        .select({ count: sql<number>`COUNT(*)` })
        .from(classrooms)
        .where(
          and(
            eq(classrooms.teacherId, ctx.user.id),
            eq(classrooms.isActive, true),
          ),
        );
      if ((Number(ownedRows[0]?.count) || 0) >= MAX_TEACHER_CLASSES) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `You can own up to ${MAX_TEACHER_CLASSES} active classes.`,
        });
      }

      for (
        let attempt = 0;
        attempt < MAX_JOIN_CODE_GENERATION_ATTEMPTS;
        attempt += 1
      ) {
        const publicId = randomUUID();
        const joinCode = generateJoinCode();
        try {
          const created = await database.transaction(async (transaction) => {
            await transaction.insert(classrooms).values({
              publicId,
              teacherId: ctx.user.id,
              name: input.name,
              joinCode,
              subject: input.subject,
              gradeLevel: input.gradeLevel ?? null,
            });
            const rows = await transaction
              .select()
              .from(classrooms)
              .where(eq(classrooms.publicId, publicId))
              .limit(1);
            const classroom = rows[0];
            if (!classroom)
              throw new Error("Classroom creation did not return a record");
            await transaction.insert(classroomMembers).values({
              classroomId: classroom.id,
              userId: ctx.user.id,
              role: "teacher",
            });
            return classroom;
          });
          return classProjection(created, "teacher", 0);
        } catch (error) {
          if (
            isDuplicateEntry(error) &&
            attempt < MAX_JOIN_CODE_GENERATION_ATTEMPTS - 1
          )
            continue;
          throw error;
        }
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to generate a unique class code.",
      });
    }),

  getMyClasses: classroomEnabledProcedure
    .input(z.object({ includeArchived: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      const database = await requireDatabase();
      const where = input?.includeArchived
        ? eq(classroomMembers.userId, ctx.user.id)
        : and(
            eq(classroomMembers.userId, ctx.user.id),
            eq(classrooms.isActive, true),
          );
      const rows = await database
        .select({ classroom: classrooms, membership: classroomMembers })
        .from(classroomMembers)
        .innerJoin(classrooms, eq(classrooms.id, classroomMembers.classroomId))
        .where(where)
        .orderBy(desc(classrooms.updatedAt));
      return Promise.all(
        rows.map((row) =>
          buildClassCard(database, row.classroom, row.membership),
        ),
      );
    }),

  get: classroomMemberProcedure.query(async ({ ctx }) => {
    const memberCount = await countLearners(
      ctx.database,
      ctx.classroomAccess.classroom.id,
    );
    return classProjection(
      ctx.classroomAccess.classroom,
      ctx.classroomAccess.membership.role,
      memberCount,
    );
  }),

  getByCode: classroomEnabledProcedure
    .input(z.object({ code: z.string().trim().min(4).max(32) }))
    .query(async ({ ctx, input }) => {
      const database = await requireDatabase();
      const code = normalizeJoinCode(input.code);
      const ipAddress = getClientIp(ctx.req);
      await enforceJoinRateLimit(database, ctx.user.id, ipAddress);
      const classroom =
        code.length === JOIN_CODE_LENGTH
          ? await findClassByJoinCode(database, code)
          : null;
      await recordJoinAttempt(
        database,
        ctx.user.id,
        ipAddress,
        code,
        classroom ? "preview_success" : "preview_failed",
      );
      if (!classroom)
        throw new TRPCError({ code: "NOT_FOUND", message: CLASS_CODE_ERROR });
      return {
        id: classroom.publicId,
        name: classroom.name,
        subject: classroom.subject,
        gradeLevel: classroom.gradeLevel,
      };
    }),

  join: classroomEnabledProcedure
    .input(z.object({ code: z.string().trim().min(4).max(32) }))
    .mutation(async ({ ctx, input }) => {
      const database = await requireDatabase();
      const code = normalizeJoinCode(input.code);
      const ipAddress = getClientIp(ctx.req);
      await enforceJoinRateLimit(database, ctx.user.id, ipAddress);
      const classroom =
        code.length === JOIN_CODE_LENGTH
          ? await findClassByJoinCode(database, code)
          : null;
      if (!classroom) {
        await recordJoinAttempt(
          database,
          ctx.user.id,
          ipAddress,
          code,
          "join_failed",
        );
        throw new TRPCError({ code: "NOT_FOUND", message: CLASS_CODE_ERROR });
      }

      const existingRows = await database
        .select()
        .from(classroomMembers)
        .where(
          and(
            eq(classroomMembers.classroomId, classroom.id),
            eq(classroomMembers.userId, ctx.user.id),
          ),
        )
        .limit(1);
      if (existingRows[0]) {
        await recordJoinAttempt(
          database,
          ctx.user.id,
          ipAddress,
          code,
          "already_member",
        );
        return classProjection(
          classroom,
          existingRows[0].role,
          await countLearners(database, classroom.id),
        );
      }

      if (
        (await countLearners(database, classroom.id)) >= MAX_ACTIVE_LEARNERS
      ) {
        await recordJoinAttempt(
          database,
          ctx.user.id,
          ipAddress,
          code,
          "class_full",
        );
        throw new TRPCError({ code: "FORBIDDEN", message: CLASS_CODE_ERROR });
      }

      try {
        await database.insert(classroomMembers).values({
          classroomId: classroom.id,
          userId: ctx.user.id,
          role: "learner",
        });
      } catch (error) {
        if (!isDuplicateEntry(error)) throw error;
      }
      await recordJoinAttempt(
        database,
        ctx.user.id,
        ipAddress,
        code,
        "join_success",
      );
      return classProjection(
        classroom,
        "learner",
        await countLearners(database, classroom.id),
      );
    }),

  leave: classroomMemberProcedure.mutation(async ({ ctx }) => {
    requireLearner(ctx.classroomAccess.membership.role);
    await ctx.database
      .delete(classroomMembers)
      .where(eq(classroomMembers.id, ctx.classroomAccess.membership.id));
    return { success: true } as const;
  }),

  listMembers: classroomTeacherProcedure
    .input(z.object({ cursor: CURSOR_SCHEMA, limit: PAGE_SIZE_SCHEMA }))
    .query(async ({ ctx, input }) => {
      const cursorId = decodeCursor(input.cursor);
      const condition = and(
        eq(classroomMembers.classroomId, ctx.classroomAccess.classroom.id),
        cursorId === null ? undefined : gt(classroomMembers.id, cursorId),
      );
      const rows = await ctx.database
        .select({ membership: classroomMembers, name: users.name })
        .from(classroomMembers)
        .innerJoin(users, eq(users.id, classroomMembers.userId))
        .where(condition)
        .orderBy(asc(classroomMembers.id))
        .limit(input.limit + 1);
      const page = rows.slice(0, input.limit);
      const learnerIds = page
        .filter((row) => row.membership.role === "learner")
        .map((row) => row.membership.userId);
      const publishedRows = await ctx.database
        .select({ id: assignments.id })
        .from(assignments)
        .where(
          and(
            eq(assignments.classroomId, ctx.classroomAccess.classroom.id),
            eq(assignments.status, "published"),
          ),
        );
      const completionRows =
        learnerIds.length > 0 && publishedRows.length > 0
          ? await ctx.database
              .select({
                userId: assignmentSubmissions.userId,
                count: sql<number>`COUNT(*)`,
              })
              .from(assignmentSubmissions)
              .where(
                and(
                  inArray(assignmentSubmissions.userId, learnerIds),
                  inArray(
                    assignmentSubmissions.assignmentId,
                    publishedRows.map((row) => row.id),
                  ),
                  eq(assignmentSubmissions.status, "complete"),
                ),
              )
              .groupBy(assignmentSubmissions.userId)
          : [];
      const completionByUser = new Map(
        completionRows.map((row) => [row.userId, Number(row.count) || 0]),
      );
      return {
        items: page.map((row) => ({
          name: safeDisplayName(row.name, row.membership.role),
          role: row.membership.role,
          joinedAt: row.membership.joinedAt,
          completedAssignments:
            completionByUser.get(row.membership.userId) ?? 0,
          totalPublishedAssignments: publishedRows.length,
        })),
        nextCursor:
          rows.length > input.limit
            ? encodeCursor(page.at(-1)!.membership.id)
            : null,
      };
    }),

  rotateJoinCode: classroomTeacherProcedure.mutation(async ({ ctx }) => {
    for (
      let attempt = 0;
      attempt < MAX_JOIN_CODE_GENERATION_ATTEMPTS;
      attempt += 1
    ) {
      const joinCode = generateJoinCode();
      try {
        await ctx.database
          .update(classrooms)
          .set({ joinCode, updatedAt: new Date() })
          .where(eq(classrooms.id, ctx.classroomAccess.classroom.id));
        return { joinCode };
      } catch (error) {
        if (
          isDuplicateEntry(error) &&
          attempt < MAX_JOIN_CODE_GENERATION_ATTEMPTS - 1
        )
          continue;
        throw error;
      }
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Unable to rotate the class code.",
    });
  }),

  archive: classroomTeacherProcedure.mutation(async ({ ctx }) => {
    await ctx.database
      .update(classrooms)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(classrooms.id, ctx.classroomAccess.classroom.id));
    return { success: true, isActive: false } as const;
  }),

  restore: classroomTeacherProcedure.mutation(async ({ ctx }) => {
    await ctx.database
      .update(classrooms)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(classrooms.id, ctx.classroomAccess.classroom.id));
    return { success: true, isActive: true } as const;
  }),

  delete: classroomTeacherProcedure
    .input(z.object({ confirmationName: CLASS_NAME_SCHEMA }))
    .mutation(async ({ ctx, input }) => {
      if (input.confirmationName !== ctx.classroomAccess.classroom.name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The class name confirmation does not match.",
        });
      }
      await ctx.database
        .delete(classrooms)
        .where(eq(classrooms.id, ctx.classroomAccess.classroom.id));
      return { success: true } as const;
    }),

  assignment: router({
    create: classroomTeacherProcedure
      .input(
        z.object({
          title: ASSIGNMENT_TITLE_SCHEMA,
          instructions: ASSIGNMENT_INSTRUCTIONS_SCHEMA,
          subject: SUBJECT_SCHEMA,
          dueAt: z.coerce.date().nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireActiveClass(ctx.classroomAccess.classroom);
        const publicId = randomUUID();
        await ctx.database.insert(assignments).values({
          publicId,
          classroomId: ctx.classroomAccess.classroom.id,
          createdByUserId: ctx.user.id,
          title: input.title,
          instructions: input.instructions,
          subject: input.subject,
          dueAt: input.dueAt ?? null,
          status: "draft",
        });
        const rows = await ctx.database
          .select()
          .from(assignments)
          .where(eq(assignments.publicId, publicId))
          .limit(1);
        return assignmentProjection(rows[0]!);
      }),

    publish: assignmentTeacherProcedure.mutation(async ({ ctx }) => {
      requireActiveClass(ctx.assignmentAccess.classroom);
      const publishedAt =
        ctx.assignmentAccess.assignment.publishedAt ?? new Date();
      await ctx.database
        .update(assignments)
        .set({ status: "published", publishedAt, updatedAt: new Date() })
        .where(eq(assignments.id, ctx.assignmentAccess.assignment.id));
      return assignmentProjection({
        ...ctx.assignmentAccess.assignment,
        status: "published",
        publishedAt,
        updatedAt: new Date(),
      });
    }),

    list: classroomMemberProcedure
      .input(
        z.object({
          status: z.enum(["draft", "published"]).optional(),
          cursor: CURSOR_SCHEMA,
          limit: PAGE_SIZE_SCHEMA,
        }),
      )
      .query(async ({ ctx, input }) => {
        const cursorId = decodeCursor(input.cursor);
        const requestedStatus =
          ctx.classroomAccess.membership.role === "learner"
            ? "published"
            : input.status;
        const conditions = [
          eq(assignments.classroomId, ctx.classroomAccess.classroom.id),
          cursorId === null ? undefined : lt(assignments.id, cursorId),
          requestedStatus ? eq(assignments.status, requestedStatus) : undefined,
        ].filter(Boolean) as any[];
        const rows = await ctx.database
          .select()
          .from(assignments)
          .where(and(...conditions))
          .orderBy(desc(assignments.id))
          .limit(input.limit + 1);
        const page = rows.slice(0, input.limit);

        let completionByAssignment = new Map<number, boolean>();
        let submissionCountByAssignment = new Map<number, number>();
        if (
          page.length > 0 &&
          ctx.classroomAccess.membership.role === "learner"
        ) {
          const submissionRows = await ctx.database
            .select({
              assignmentId: assignmentSubmissions.assignmentId,
              status: assignmentSubmissions.status,
            })
            .from(assignmentSubmissions)
            .where(
              and(
                eq(assignmentSubmissions.userId, ctx.user.id),
                inArray(
                  assignmentSubmissions.assignmentId,
                  page.map((assignment) => assignment.id),
                ),
              ),
            );
          completionByAssignment = new Map(
            submissionRows.map((row) => [
              row.assignmentId,
              row.status === "complete",
            ]),
          );
        } else if (page.length > 0) {
          const countRows = await ctx.database
            .select({
              assignmentId: assignmentSubmissions.assignmentId,
              count: sql<number>`COUNT(*)`,
            })
            .from(assignmentSubmissions)
            .where(
              and(
                inArray(
                  assignmentSubmissions.assignmentId,
                  page.map((assignment) => assignment.id),
                ),
                eq(assignmentSubmissions.status, "complete"),
              ),
            )
            .groupBy(assignmentSubmissions.assignmentId);
          submissionCountByAssignment = new Map(
            countRows.map((row) => [row.assignmentId, Number(row.count) || 0]),
          );
        }

        const learnerCount =
          ctx.classroomAccess.membership.role === "teacher"
            ? await countLearners(
                ctx.database,
                ctx.classroomAccess.classroom.id,
              )
            : undefined;
        return {
          items: page.map((assignment) => ({
            ...assignmentProjection(assignment),
            ...(ctx.classroomAccess.membership.role === "learner"
              ? {
                  submissionStatus: completionByAssignment.get(assignment.id)
                    ? ("complete" as const)
                    : ("pending" as const),
                }
              : {
                  completedSubmissions:
                    submissionCountByAssignment.get(assignment.id) ?? 0,
                  totalLearners: learnerCount ?? 0,
                }),
          })),
          nextCursor:
            rows.length > input.limit ? encodeCursor(page.at(-1)!.id) : null,
        };
      }),

    get: assignmentMemberProcedure.query(async ({ ctx }) => {
      const base = assignmentProjection(ctx.assignmentAccess.assignment);
      if (ctx.assignmentAccess.membership.role === "learner") {
        const submissionRows = await ctx.database
          .select()
          .from(assignmentSubmissions)
          .where(
            and(
              eq(
                assignmentSubmissions.assignmentId,
                ctx.assignmentAccess.assignment.id,
              ),
              eq(assignmentSubmissions.userId, ctx.user.id),
            ),
          )
          .limit(1);
        const submission = submissionRows[0];
        return {
          ...base,
          role: "learner" as const,
          submission: submission
            ? {
                id: submission.publicId,
                status: submission.status,
                responseText: submission.responseText,
                submittedAt: submission.submittedAt,
                updatedAt: submission.updatedAt,
              }
            : {
                id: null,
                status: "pending" as const,
                responseText: null,
                submittedAt: null,
                updatedAt: null,
              },
        };
      }
      const learnerCount = await countLearners(
        ctx.database,
        ctx.assignmentAccess.classroom.id,
      );
      const completeRows = await ctx.database
        .select({ count: sql<number>`COUNT(*)` })
        .from(assignmentSubmissions)
        .where(
          and(
            eq(
              assignmentSubmissions.assignmentId,
              ctx.assignmentAccess.assignment.id,
            ),
            eq(assignmentSubmissions.status, "complete"),
          ),
        );
      return {
        ...base,
        role: "teacher" as const,
        completedSubmissions: Number(completeRows[0]?.count) || 0,
        totalLearners: learnerCount,
      };
    }),

    update: assignmentTeacherProcedure
      .input(
        z
          .object({
            title: ASSIGNMENT_TITLE_SCHEMA.optional(),
            instructions: ASSIGNMENT_INSTRUCTIONS_SCHEMA.optional(),
            subject: SUBJECT_SCHEMA.optional(),
            dueAt: z.coerce.date().nullable().optional(),
          })
          .refine(
            (value) => Object.keys(value).some((key) => key !== "assignmentId"),
            { message: "Provide at least one field to update." },
          ),
      )
      .mutation(async ({ ctx, input }) => {
        requireActiveClass(ctx.assignmentAccess.classroom);
        const values: Partial<typeof assignments.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (input.title !== undefined) values.title = input.title;
        if (input.instructions !== undefined)
          values.instructions = input.instructions;
        if (input.subject !== undefined) values.subject = input.subject;
        if (input.dueAt !== undefined) values.dueAt = input.dueAt;
        await ctx.database
          .update(assignments)
          .set(values)
          .where(eq(assignments.id, ctx.assignmentAccess.assignment.id));
        const rows = await ctx.database
          .select()
          .from(assignments)
          .where(eq(assignments.id, ctx.assignmentAccess.assignment.id))
          .limit(1);
        return assignmentProjection(rows[0]!);
      }),

    delete: assignmentTeacherProcedure
      .input(z.object({ confirmationTitle: ASSIGNMENT_TITLE_SCHEMA }))
      .mutation(async ({ ctx, input }) => {
        if (input.confirmationTitle !== ctx.assignmentAccess.assignment.title) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The assignment title confirmation does not match.",
          });
        }
        await ctx.database
          .delete(assignments)
          .where(eq(assignments.id, ctx.assignmentAccess.assignment.id));
        return { success: true } as const;
      }),
  }),

  submission: router({
    upsert: assignmentMemberProcedure
      .input(
        z.object({
          status: z.enum(["pending", "complete"]),
          responseText: RESPONSE_TEXT_SCHEMA,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireLearner(ctx.assignmentAccess.membership.role);
        requireActiveClass(ctx.assignmentAccess.classroom);
        if (ctx.assignmentAccess.assignment.status !== "published") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Assignment not found.",
          });
        }
        const submittedAt = input.status === "complete" ? new Date() : null;
        const publicId = randomUUID();
        await ctx.database
          .insert(assignmentSubmissions)
          .values({
            publicId,
            assignmentId: ctx.assignmentAccess.assignment.id,
            userId: ctx.user.id,
            status: input.status,
            responseText: input.responseText ?? null,
            submittedAt,
          })
          .onDuplicateKeyUpdate({
            set: {
              status: input.status,
              responseText: input.responseText ?? null,
              submittedAt,
              updatedAt: new Date(),
            },
          });
        const rows = await ctx.database
          .select()
          .from(assignmentSubmissions)
          .where(
            and(
              eq(
                assignmentSubmissions.assignmentId,
                ctx.assignmentAccess.assignment.id,
              ),
              eq(assignmentSubmissions.userId, ctx.user.id),
            ),
          )
          .limit(1);
        const submission = rows[0]!;
        return {
          id: submission.publicId,
          status: submission.status,
          responseText: submission.responseText,
          submittedAt: submission.submittedAt,
          updatedAt: submission.updatedAt,
        };
      }),

    getMine: assignmentMemberProcedure.query(async ({ ctx }) => {
      requireLearner(ctx.assignmentAccess.membership.role);
      const rows = await ctx.database
        .select()
        .from(assignmentSubmissions)
        .where(
          and(
            eq(
              assignmentSubmissions.assignmentId,
              ctx.assignmentAccess.assignment.id,
            ),
            eq(assignmentSubmissions.userId, ctx.user.id),
          ),
        )
        .limit(1);
      const submission = rows[0];
      return submission
        ? {
            id: submission.publicId,
            status: submission.status,
            responseText: submission.responseText,
            submittedAt: submission.submittedAt,
            updatedAt: submission.updatedAt,
          }
        : {
            id: null,
            status: "pending" as const,
            responseText: null,
            submittedAt: null,
            updatedAt: null,
          };
    }),

    listForAssignment: assignmentTeacherProcedure
      .input(z.object({ cursor: CURSOR_SCHEMA, limit: PAGE_SIZE_SCHEMA }))
      .query(async ({ ctx, input }) => {
        const cursorId = decodeCursor(input.cursor);
        const rows = await ctx.database
          .select({
            membership: classroomMembers,
            name: users.name,
            submission: assignmentSubmissions,
          })
          .from(classroomMembers)
          .innerJoin(users, eq(users.id, classroomMembers.userId))
          .leftJoin(
            assignmentSubmissions,
            and(
              eq(
                assignmentSubmissions.assignmentId,
                ctx.assignmentAccess.assignment.id,
              ),
              eq(assignmentSubmissions.userId, classroomMembers.userId),
            ),
          )
          .where(
            and(
              eq(
                classroomMembers.classroomId,
                ctx.assignmentAccess.classroom.id,
              ),
              eq(classroomMembers.role, "learner"),
              cursorId === null ? undefined : gt(classroomMembers.id, cursorId),
            ),
          )
          .orderBy(asc(classroomMembers.id))
          .limit(input.limit + 1);
        const page = rows.slice(0, input.limit);
        return {
          items: page.map((row) => ({
            learnerName: safeDisplayName(row.name, "learner"),
            joinedAt: row.membership.joinedAt,
            status: row.submission?.status ?? "pending",
            responseText: row.submission?.responseText ?? null,
            submittedAt: row.submission?.submittedAt ?? null,
            updatedAt: row.submission?.updatedAt ?? null,
          })),
          nextCursor:
            rows.length > input.limit
              ? encodeCursor(page.at(-1)!.membership.id)
              : null,
        };
      }),
  }),

  comment: router({
    list: assignmentMemberProcedure
      .input(z.object({ cursor: CURSOR_SCHEMA, limit: PAGE_SIZE_SCHEMA }))
      .query(async ({ ctx, input }) => {
        const cursorId = decodeCursor(input.cursor);
        const rows = await ctx.database
          .select({ comment: assignmentComments, authorName: users.name })
          .from(assignmentComments)
          .innerJoin(users, eq(users.id, assignmentComments.authorUserId))
          .where(
            and(
              eq(
                assignmentComments.assignmentId,
                ctx.assignmentAccess.assignment.id,
              ),
              cursorId === null
                ? undefined
                : gt(assignmentComments.id, cursorId),
            ),
          )
          .orderBy(asc(assignmentComments.id))
          .limit(input.limit + 1);
        const page = rows.slice(0, input.limit);
        return {
          items: page.map((row) => ({
            id: row.comment.publicId,
            authorName: safeDisplayName(
              row.authorName,
              row.comment.authorUserId ===
                ctx.assignmentAccess.classroom.teacherId
                ? "teacher"
                : "learner",
            ),
            isMine: row.comment.authorUserId === ctx.user.id,
            isDeleted: row.comment.isDeleted,
            body: row.comment.isDeleted ? null : row.comment.body,
            moderationReason: row.comment.isDeleted
              ? row.comment.moderationReason
              : null,
            createdAt: row.comment.createdAt,
            updatedAt: row.comment.updatedAt,
          })),
          nextCursor:
            rows.length > input.limit
              ? encodeCursor(page.at(-1)!.comment.id)
              : null,
        };
      }),

    add: assignmentMemberProcedure
      .input(z.object({ body: COMMENT_BODY_SCHEMA }))
      .mutation(async ({ ctx, input }) => {
        requireActiveClass(ctx.assignmentAccess.classroom);
        if (ctx.assignmentAccess.assignment.status !== "published") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Publish the assignment before starting a discussion.",
          });
        }
        await enforceCommentRateLimit(ctx.database, ctx.user.id);
        const publicId = randomUUID();
        await ctx.database.insert(assignmentComments).values({
          publicId,
          assignmentId: ctx.assignmentAccess.assignment.id,
          authorUserId: ctx.user.id,
          body: input.body,
        });
        const rows = await ctx.database
          .select()
          .from(assignmentComments)
          .where(eq(assignmentComments.publicId, publicId))
          .limit(1);
        const comment = rows[0]!;
        return {
          id: comment.publicId,
          authorName: safeDisplayName(
            ctx.user.name,
            ctx.assignmentAccess.membership.role,
          ),
          isMine: true,
          isDeleted: false,
          body: comment.body,
          moderationReason: null,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        };
      }),

    delete: commentMemberProcedure.mutation(async ({ ctx }) => {
      if (ctx.commentAccess.comment.authorUserId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can remove only your own comment.",
        });
      }
      if (!ctx.commentAccess.comment.isDeleted) {
        await ctx.database
          .update(assignmentComments)
          .set({
            body: "",
            isDeleted: true,
            deletedAt: new Date(),
            deletedByUserId: ctx.user.id,
            moderationReason: "author_removed",
            updatedAt: new Date(),
          })
          .where(eq(assignmentComments.id, ctx.commentAccess.comment.id));
      }
      return { success: true } as const;
    }),

    moderate: commentMemberProcedure
      .input(z.object({ reason: MODERATION_REASON_SCHEMA }))
      .mutation(async ({ ctx, input }) => {
        requireTeacher(ctx.commentAccess.membership.role);
        if (!ctx.commentAccess.comment.isDeleted) {
          await ctx.database
            .update(assignmentComments)
            .set({
              body: "",
              isDeleted: true,
              deletedAt: new Date(),
              deletedByUserId: ctx.user.id,
              moderationReason: input.reason,
              updatedAt: new Date(),
            })
            .where(eq(assignmentComments.id, ctx.commentAccess.comment.id));
        }
        return { success: true } as const;
      }),
  }),

  progress: router({
    getClassSummary: classroomTeacherProcedure.query(async ({ ctx }) => {
      const learnerRows = await ctx.database
        .select({ userId: classroomMembers.userId })
        .from(classroomMembers)
        .where(
          and(
            eq(classroomMembers.classroomId, ctx.classroomAccess.classroom.id),
            eq(classroomMembers.role, "learner"),
          ),
        );
      const assignmentRows = await ctx.database
        .select({
          id: assignments.id,
          publicId: assignments.publicId,
          title: assignments.title,
          dueAt: assignments.dueAt,
        })
        .from(assignments)
        .where(
          and(
            eq(assignments.classroomId, ctx.classroomAccess.classroom.id),
            eq(assignments.status, "published"),
          ),
        )
        .orderBy(asc(assignments.dueAt), asc(assignments.id));
      const submissionRows =
        learnerRows.length > 0 && assignmentRows.length > 0
          ? await ctx.database
              .select({
                assignmentId: assignmentSubmissions.assignmentId,
                userId: assignmentSubmissions.userId,
                status: assignmentSubmissions.status,
              })
              .from(assignmentSubmissions)
              .where(
                and(
                  inArray(
                    assignmentSubmissions.assignmentId,
                    assignmentRows.map((assignment) => assignment.id),
                  ),
                  inArray(
                    assignmentSubmissions.userId,
                    learnerRows.map((learner) => learner.userId),
                  ),
                ),
              )
          : [];
      const completedPairs = new Set(
        submissionRows
          .filter((row) => row.status === "complete")
          .map((row) => `${row.assignmentId}:${row.userId}`),
      );
      const expected = learnerRows.length * assignmentRows.length;
      const completed = completedPairs.size;
      const now = Date.now();
      const overdue = assignmentRows.reduce((total, assignment) => {
        if (!assignment.dueAt || assignment.dueAt.getTime() >= now)
          return total;
        return (
          total +
          learnerRows.filter(
            (learner) =>
              !completedPairs.has(`${assignment.id}:${learner.userId}`),
          ).length
        );
      }, 0);
      return {
        learnerCount: learnerRows.length,
        publishedAssignmentCount: assignmentRows.length,
        expectedSubmissions: expected,
        completedSubmissions: completed,
        pendingSubmissions: Math.max(0, expected - completed),
        overdueSubmissions: overdue,
        completionPercent:
          expected === 0 ? 0 : Math.round((completed / expected) * 100),
        assignments: assignmentRows.map((assignment) => {
          const completeCount = learnerRows.filter((learner) =>
            completedPairs.has(`${assignment.id}:${learner.userId}`),
          ).length;
          return {
            id: assignment.publicId,
            title: assignment.title,
            dueAt: assignment.dueAt,
            completed: completeCount,
            pending: Math.max(0, learnerRows.length - completeCount),
            overdue: Boolean(
              assignment.dueAt && assignment.dueAt.getTime() < now,
            )
              ? Math.max(0, learnerRows.length - completeCount)
              : 0,
          };
        }),
      };
    }),

    getMine: classroomMemberProcedure.query(async ({ ctx }) => {
      requireLearner(ctx.classroomAccess.membership.role);
      const assignmentRows = await ctx.database
        .select({
          id: assignments.id,
          publicId: assignments.publicId,
          title: assignments.title,
          dueAt: assignments.dueAt,
        })
        .from(assignments)
        .where(
          and(
            eq(assignments.classroomId, ctx.classroomAccess.classroom.id),
            eq(assignments.status, "published"),
          ),
        )
        .orderBy(asc(assignments.dueAt), asc(assignments.id));
      const submissionRows =
        assignmentRows.length > 0
          ? await ctx.database
              .select({
                assignmentId: assignmentSubmissions.assignmentId,
                status: assignmentSubmissions.status,
              })
              .from(assignmentSubmissions)
              .where(
                and(
                  eq(assignmentSubmissions.userId, ctx.user.id),
                  inArray(
                    assignmentSubmissions.assignmentId,
                    assignmentRows.map((assignment) => assignment.id),
                  ),
                ),
              )
          : [];
      const completeIds = new Set(
        submissionRows
          .filter((row) => row.status === "complete")
          .map((row) => row.assignmentId),
      );
      const now = Date.now();
      const items = assignmentRows.map((assignment) => {
        const status = completeIds.has(assignment.id)
          ? ("complete" as const)
          : ("pending" as const);
        return {
          id: assignment.publicId,
          title: assignment.title,
          dueAt: assignment.dueAt,
          status,
          isOverdue:
            status === "pending" &&
            Boolean(assignment.dueAt && assignment.dueAt.getTime() < now),
        };
      });
      const completed = items.filter(
        (item) => item.status === "complete",
      ).length;
      const pending = items.length - completed;
      const overdue = items.filter((item) => item.isOverdue).length;
      const nextDue =
        items.find(
          (item) =>
            item.status === "pending" &&
            item.dueAt &&
            item.dueAt.getTime() >= now,
        ) ?? null;
      return {
        completed,
        pending,
        overdue,
        completionPercent:
          items.length === 0 ? 0 : Math.round((completed / items.length) * 100),
        nextDue,
        assignments: items,
      };
    }),
  }),
});

const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const LOCK_TTL_MS = 35 * 60 * 1000;
const JOIN_AUDIT_RETENTION_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INSTANCE_ID = `${hostname()}-${process.pid}`;
let cleanupStarted = false;

export async function startClassroomCleanupScheduler(): Promise<void> {
  if (cleanupStarted) return;
  cleanupStarted = true;
  await runClassroomCleanupIfLockAcquired();
  const timer = setInterval(
    runClassroomCleanupIfLockAcquired,
    CLEANUP_INTERVAL_MS,
  );
  timer.unref?.();
}

async function runClassroomCleanupIfLockAcquired(): Promise<void> {
  const database = await getDb();
  if (!database) return;
  const now = new Date();
  const lockExpiry = new Date(now.getTime() + LOCK_TTL_MS);
  try {
    await database.execute(sql`INSERT INTO scheduler_locks (jobName, instanceId, expiresAt, acquiredAt)
      VALUES ('classroom-security-cleanup', ${CLEANUP_INSTANCE_ID}, ${lockExpiry}, ${now})
      ON DUPLICATE KEY UPDATE
        instanceId = IF(expiresAt < ${now}, VALUES(instanceId), instanceId),
        expiresAt = IF(expiresAt < ${now}, VALUES(expiresAt), expiresAt),
        acquiredAt = IF(expiresAt < ${now}, VALUES(acquiredAt), acquiredAt)`);
    const lockRows = await database
      .select()
      .from(schedulerLocks)
      .where(eq(schedulerLocks.jobName, "classroom-security-cleanup"))
      .limit(1);
    if (!lockRows[0] || lockRows[0].instanceId !== CLEANUP_INSTANCE_ID) return;
    await database
      .delete(classroomJoinAttempts)
      .where(
        lt(
          classroomJoinAttempts.createdAt,
          new Date(now.getTime() - JOIN_AUDIT_RETENTION_MS),
        ),
      );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Classroom Cleanup] Non-fatal scheduler error: ${message}`);
  }
}

export const classroomInternals = {
  normalizeJoinCode,
  hashJoinCode,
  generateJoinCode,
  encodeCursor,
  decodeCursor,
  isClassroomEnabled,
};
