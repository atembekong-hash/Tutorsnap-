import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { TrpcContext } from "../server/_core/context";

const databaseUrl = process.env.CLASSROOM_TEST_DATABASE_URL?.trim();
const describeWithDatabase = databaseUrl ? describe.sequential : describe.skip;

type User = NonNullable<TrpcContext["user"]>;
type RouterModule = typeof import("../server/routers");

function assertDedicatedLocalDatabase(url: string): void {
  const parsed = new URL(url);
  const localHosts = new Set(["127.0.0.1", "localhost", "postgres"]);
  if (!localHosts.has(parsed.hostname) || !/test/i.test(parsed.pathname)) {
    throw new Error(
      "Classroom integration tests require a dedicated local database whose name contains 'test'.",
    );
  }
}

function createContext(user: User): TrpcContext {
  return {
    user,
    req: {
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function makeUser(id: number, openId: string, name: string): User {
  const now = new Date();
  return {
    id,
    openId,
    name,
    email: `${openId}@example.test`,
    loginMethod: "test",
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    appearanceSettings: null,
  };
}

describeWithDatabase(
  "Guided Classroom real-database authorization and concurrency",
  () => {
    let pool: Pool;
    let appRouter: RouterModule["appRouter"];
    let teacherA: User;
    let teacherB: User;
    let learnerA: User;
    let learnerB: User;
    let learnerC: User;
    let outsider: User;
    let rateLimitUser: User;

    let classAId = "";
    let classAJoinCode = "";
    let classBId = "";
    let assignmentId = "";
    let learnerACommentId = "";
    let learnerBCommentId = "";

    const caller = (user: User) => appRouter.createCaller(createContext(user));

    beforeAll(async () => {
      assertDedicatedLocalDatabase(databaseUrl!);
      process.env.DATABASE_URL = databaseUrl;
      process.env.CLASSROOM_MVP_ENABLED = "true";
      process.env.NODE_ENV = "test";

      pool = new Pool({
        connectionString: databaseUrl!,
        max: 4,
        connectionTimeoutMillis: 15_000,
        ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
      });
      await pool.query("SELECT 1");

      for (const table of [
        "assignment_comments",
        "assignment_submissions",
        "assignments",
        "classroom_join_attempts",
        "classroom_members",
        "classrooms",
      ]) {
        await pool.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      }
      await pool.query(
        "DELETE FROM users WHERE \"openId\" LIKE 'classroom-test-%'",
      );

      const identities = [
        ["classroom-test-teacher-a", "Teacher Ada"],
        ["classroom-test-teacher-b", "Teacher Bruno"],
        ["classroom-test-learner-a", "Learner Amina"],
        ["classroom-test-learner-b", "Learner Ben"],
        ["classroom-test-learner-c", "Learner Chen"],
        ["classroom-test-outsider", "Outside User"],
        ["classroom-test-rate-limit", "Rate Limit User"],
      ] as const;

      for (const [openId, name] of identities) {
        await pool.query(
          "INSERT INTO users (\"openId\", name, email, \"loginMethod\", role, \"createdAt\", \"updatedAt\", \"lastSignedIn\") VALUES ($1, $2, $3, 'test', 'user', NOW(), NOW(), NOW())",
          [openId, name, `${openId}@example.test`],
        );
      }

      const { rows } = await pool.query<{ id: number; openId: string; name: string }>(
        "SELECT id, \"openId\", name FROM users WHERE \"openId\" LIKE 'classroom-test-%'",
      );
      const idByOpenId = new Map(
        rows.map((row) => [String(row.openId), Number(row.id)]),
      );
      teacherA = makeUser(
        idByOpenId.get("classroom-test-teacher-a")!,
        "classroom-test-teacher-a",
        "Teacher Ada",
      );
      teacherB = makeUser(
        idByOpenId.get("classroom-test-teacher-b")!,
        "classroom-test-teacher-b",
        "Teacher Bruno",
      );
      learnerA = makeUser(
        idByOpenId.get("classroom-test-learner-a")!,
        "classroom-test-learner-a",
        "Learner Amina",
      );
      learnerB = makeUser(
        idByOpenId.get("classroom-test-learner-b")!,
        "classroom-test-learner-b",
        "Learner Ben",
      );
      learnerC = makeUser(
        idByOpenId.get("classroom-test-learner-c")!,
        "classroom-test-learner-c",
        "Learner Chen",
      );
      outsider = makeUser(
        idByOpenId.get("classroom-test-outsider")!,
        "classroom-test-outsider",
        "Outside User",
      );
      rateLimitUser = makeUser(
        idByOpenId.get("classroom-test-rate-limit")!,
        "classroom-test-rate-limit",
        "Rate Limit User",
      );

      ({ appRouter } = await import("../server/routers"));
    }, 30_000);

    afterAll(async () => {
      if (!pool) return;
      for (const table of [
        "assignment_comments",
        "assignment_submissions",
        "assignments",
        "classroom_join_attempts",
        "classroom_members",
        "classrooms",
      ]) {
        await pool.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      }
      await pool.query(
        "DELETE FROM users WHERE \"openId\" LIKE 'classroom-test-%'",
      );
      await pool.end();
    });

    it("creates separate teacher-owned classes and never changes the global account role", async () => {
      const classA = await caller(teacherA).classroom.create({
        name: "Algebra Foundations",
        subject: "algebra",
        gradeLevel: "Grade 8",
      });
      const classB = await caller(teacherB).classroom.create({
        name: "Geometry Lab",
        subject: "geometry",
        gradeLevel: "Grade 9",
      });

      classAId = classA.id;
      expect(classA.joinCode).toBeDefined();
      classAJoinCode = classA.joinCode!;
      classBId = classB.id;
      expect(classA.role).toBe("teacher");
      expect(classAJoinCode).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);

      const { rows } = await pool.query<{ role: string }>(
        "SELECT role FROM users WHERE id IN ($1, $2)",
        [teacherA.id, teacherB.id],
      );
      expect(rows.map((row) => row.role)).toEqual(["user", "user"]);
    });

    it("joins two learners and handles duplicate concurrent joins idempotently", async () => {
      await Promise.all([
        caller(learnerA).classroom.join({ code: classAJoinCode }),
        caller(learnerB).classroom.join({ code: classAJoinCode }),
      ]);
      const duplicateResults = await Promise.all([
        caller(learnerC).classroom.join({ code: classAJoinCode }),
        caller(learnerC).classroom.join({ code: classAJoinCode }),
      ]);
      expect(
        duplicateResults.every((result) => result.role === "learner"),
      ).toBe(true);

      const { rows } = await pool.query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM classroom_members cm INNER JOIN classrooms c ON c.id = cm.\"classroomId\" WHERE c.\"publicId\" = $1 AND cm.role = 'learner'",
        [classAId],
      );
      expect(Number(rows[0].count)).toBe(3);
    });

    it("returns role-aware class projections and denies outsiders", async () => {
      const teacherView = await caller(teacherA).classroom.get({
        classroomId: classAId,
      });
      const learnerView = await caller(learnerA).classroom.get({
        classroomId: classAId,
      });
      expect(teacherView).toMatchObject({
        role: "teacher",
        joinCode: classAJoinCode,
        memberCount: 3,
      });
      expect(learnerView).toMatchObject({ role: "learner", memberCount: 3 });
      expect("joinCode" in learnerView).toBe(false);

      await expect(
        caller(outsider).classroom.get({ classroomId: classAId }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        caller({ ...outsider, role: "admin" }).classroom.get({
          classroomId: classAId,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("keeps drafts invisible to learners and blocks a teacher from another class", async () => {
      const assignment = await caller(teacherA).classroom.assignment.create({
        classroomId: classAId,
        title: "Solve linear equations",
        instructions: "Solve 3x + 5 = 20 and explain each inverse operation.",
        subject: "algebra",
        dueAt: new Date(Date.now() + 86_400_000),
      });
      assignmentId = assignment.id;

      const learnerList = await caller(learnerA).classroom.assignment.list({
        classroomId: classAId,
        limit: 25,
      });
      expect(learnerList.items).toHaveLength(0);
      await expect(
        caller(learnerA).classroom.assignment.get({ assignmentId }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        caller(teacherB).classroom.assignment.get({ assignmentId }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        caller(teacherB).classroom.assignment.list({
          classroomId: classAId,
          limit: 25,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await caller(teacherA).classroom.assignment.publish({ assignmentId });
      const publishedList = await caller(learnerA).classroom.assignment.list({
        classroomId: classAId,
        limit: 25,
      });
      expect(publishedList.items).toHaveLength(1);
      expect(publishedList.items[0]).toMatchObject({
        id: assignmentId,
        status: "published",
        submissionStatus: "pending",
      });
    });

    it("enforces one submission per learner under concurrent upserts", async () => {
      await Promise.all([
        caller(learnerA).classroom.submission.upsert({
          assignmentId,
          status: "complete",
          responseText: "x = 5 using inverse operations.",
        }),
        caller(learnerA).classroom.submission.upsert({
          assignmentId,
          status: "complete",
          responseText: "Subtract 5, then divide by 3; x = 5.",
        }),
      ]);
      await caller(learnerB).classroom.submission.upsert({
        assignmentId,
        status: "complete",
        responseText: "3x = 15, so x = 5.",
      });

      const { rows } = await pool.query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM assignment_submissions s INNER JOIN assignments a ON a.id = s.\"assignmentId\" WHERE a.\"publicId\" = $1 AND s.\"userId\" = $2",
        [assignmentId, learnerA.id],
      );
      expect(Number(rows[0].count)).toBe(1);

      const mineA = await caller(learnerA).classroom.submission.getMine({
        assignmentId,
      });
      const mineB = await caller(learnerB).classroom.submission.getMine({
        assignmentId,
      });
      expect(mineA.status).toBe("complete");
      expect(mineB.responseText).toContain("x = 5");

      const learnerClasses = await caller(learnerA).classroom.getMyClasses({
        includeArchived: false,
      });
      expect(
        learnerClasses.find((classroom) => classroom.id === classAId)?.nextDue,
      ).toBeNull();

      await expect(
        caller(learnerA).classroom.submission.listForAssignment({
          assignmentId,
          limit: 25,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller(teacherB).classroom.submission.listForAssignment({
          assignmentId,
          limit: 25,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      const teacherList = await caller(
        teacherA,
      ).classroom.submission.listForAssignment({ assignmentId, limit: 25 });
      expect(teacherList.items).toHaveLength(3);
      expect(
        teacherList.items.filter((item) => item.status === "complete"),
      ).toHaveLength(2);
    });

    it("supports author deletion and teacher moderation while denying learner moderation", async () => {
      const commentA = await caller(learnerA).classroom.comment.add({
        assignmentId,
        body: "Can someone explain why we subtract 5 first?",
      });
      const commentB = await caller(learnerB).classroom.comment.add({
        assignmentId,
        body: "Because inverse operations isolate the variable.",
      });
      learnerACommentId = commentA.id;
      learnerBCommentId = commentB.id;

      await expect(
        caller(learnerA).classroom.comment.moderate({
          commentId: learnerBCommentId,
          reason: "other",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller(outsider).classroom.comment.delete({
          commentId: learnerACommentId,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await caller(learnerA).classroom.comment.delete({
        commentId: learnerACommentId,
      });
      await caller(teacherA).classroom.comment.moderate({
        commentId: learnerBCommentId,
        reason: "other",
      });

      const comments = await caller(learnerB).classroom.comment.list({
        assignmentId,
        limit: 25,
      });
      expect(comments.items).toHaveLength(2);
      expect(
        comments.items.every(
          (comment) => comment.isDeleted && comment.body === null,
        ),
      ).toBe(true);
      expect(
        comments.items.map((comment) => comment.moderationReason).sort(),
      ).toEqual(["author_removed", "other"]);
    });

    it("calculates teacher aggregate and learner-private progress without ranking", async () => {
      const summary = await caller(teacherA).classroom.progress.getClassSummary(
        { classroomId: classAId },
      );
      expect(summary).toMatchObject({
        learnerCount: 3,
        publishedAssignmentCount: 1,
        expectedSubmissions: 3,
        completedSubmissions: 2,
        pendingSubmissions: 1,
        completionPercent: 67,
      });

      const progressA = await caller(learnerA).classroom.progress.getMine({
        classroomId: classAId,
      });
      const progressC = await caller(learnerC).classroom.progress.getMine({
        classroomId: classAId,
      });
      expect(progressA).toMatchObject({
        completed: 1,
        pending: 0,
        completionPercent: 100,
      });
      expect(progressC).toMatchObject({
        completed: 0,
        pending: 1,
        completionPercent: 0,
      });
      expect(progressC).not.toHaveProperty("learnerCount");
    });

    it("durably rate-limits class-code enumeration and stores only hashes", async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await expect(
          caller(rateLimitUser).classroom.getByCode({ code: `NOPE${attempt}` }),
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
      }
      await expect(
        caller(rateLimitUser).classroom.getByCode({ code: "NOPE99" }),
      ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

      const { rows } = await pool.query<{ codeHash: string }>(
        "SELECT \"codeHash\" FROM classroom_join_attempts WHERE \"userId\" = $1",
        [rateLimitUser.id],
      );
      expect(rows).toHaveLength(10);
      expect(
        rows.every((row) => /^[a-f0-9]{64}$/.test(String(row.codeHash))),
      ).toBe(true);
      expect(rows.every((row) => !String(row.codeHash).includes("NOPE"))).toBe(
        true,
      );
    });

    it("rotates join codes, makes archived classes read-only, and preserves cross-class denial", async () => {
      const rotated = await caller(teacherA).classroom.rotateJoinCode({
        classroomId: classAId,
      });
      expect(rotated.joinCode).not.toBe(classAJoinCode);
      await expect(
        caller(outsider).classroom.getByCode({ code: classAJoinCode }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await caller(teacherA).classroom.archive({ classroomId: classAId });
      await expect(
        caller(learnerC).classroom.submission.upsert({
          assignmentId,
          status: "complete",
          responseText: "Late response",
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      await expect(
        caller(learnerC).classroom.comment.add({
          assignmentId,
          body: "Archived class comment",
        }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      await expect(
        caller(teacherB).classroom.progress.getClassSummary({
          classroomId: classAId,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      const classB = await caller(teacherB).classroom.get({
        classroomId: classBId,
      });
      expect(classB.name).toBe("Geometry Lab");
    });
  },
);
