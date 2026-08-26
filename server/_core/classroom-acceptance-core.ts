import { randomBytes } from "node:crypto";
import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import { Pool } from "pg";
import superjson from "superjson";

import type { AppRouter } from "../routers";
import { sdk } from "./sdk";

type Client = ReturnType<typeof createTRPCClient<AppRouter>>;

type TestIdentity = {
  openId: string;
  name: string;
  email: string;
};

type AcceptanceEvidence = {
  target: string;
  apiBaseUrl: string;
  runId: string;
  startedAt: string;
  completedAt?: string;
  elapsedMs?: number;
  checks: Record<string, boolean | number | string>;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function makeClient(apiBaseUrl: string, token: string): Client {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${apiBaseUrl}/api/trpc`,
        transformer: superjson,
        headers: () => ({ Authorization: `Bearer ${token}` }),
      }),
    ],
  });
}

async function expectCode(
  operation: () => Promise<unknown>,
  expectedCode: string,
  label: string,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if (
      error instanceof TRPCClientError &&
      typeof error.data === "object" &&
      error.data &&
      "code" in error.data &&
      error.data.code === expectedCode
    ) {
      return;
    }
    throw new Error(
      `${label}: expected ${expectedCode}, received ${String(error)}`,
    );
  }
  throw new Error(
    `${label}: expected ${expectedCode}, but the operation succeeded`,
  );
}

async function seedIdentity(pool: Pool, identity: TestIdentity): Promise<void> {
  await pool.query(
    `INSERT INTO users ("openId", name, email, "loginMethod", role, "lastSignedIn")
     VALUES ($1, $2, $3, 'email', 'user', CURRENT_TIMESTAMP)
     ON CONFLICT ("openId") DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       "loginMethod" = 'email',
       role = 'user',
       "lastSignedIn" = CURRENT_TIMESTAMP`,
    [identity.openId, identity.name, identity.email],
  );
}

async function removeIdentities(
  pool: Pool,
  identities: TestIdentity[],
): Promise<void> {
  const placeholders = identities.map((_, index) => `$${index + 1}`).join(", ");
  await pool.query(
    `DELETE FROM users WHERE "openId" IN (${placeholders})`,
    identities.map((identity) => identity.openId),
  );
}

export async function runClassroomAcceptance(): Promise<AcceptanceEvidence> {
  const target = process.env.CLASSROOM_ACCEPTANCE_TARGET;
  assert(
    target === "staging",
    "Refusing to run outside an explicit staging target",
  );
  assert(
    process.env.CLASSROOM_MVP_ENABLED === "true",
    "CLASSROOM_MVP_ENABLED must be true in staging before acceptance",
  );

  const databaseUrl =
    process.env.CLASSROOM_ACCEPTANCE_DATABASE_URL || process.env.DATABASE_URL;
  assert(
    databaseUrl,
    "A staging database URL is required for isolated test identities",
  );
  const apiBaseUrl =
    process.env.CLASSROOM_ACCEPTANCE_API_BASE_URL ||
    `http://127.0.0.1:${process.env.PORT || "3000"}`;
  assert(
    apiBaseUrl.includes("127.0.0.1") || apiBaseUrl.includes("api-staging"),
    "Acceptance API target must be the local staging service or staging hostname",
  );

  const started = Date.now();
  const runId = `${started.toString(36)}-${randomBytes(4).toString("hex")}`;
  const className = `E2E Guided Classroom ${runId}`;
  const identities: TestIdentity[] = [
    {
      openId: `classroom-e2e-${runId}-teacher`,
      name: "E2E Teacher",
      email: `teacher-${runId}@staging.tutorsnap.test`,
    },
    {
      openId: `classroom-e2e-${runId}-learner-a`,
      name: "E2E Learner A",
      email: `learner-a-${runId}@staging.tutorsnap.test`,
    },
    {
      openId: `classroom-e2e-${runId}-learner-b`,
      name: "E2E Learner B",
      email: `learner-b-${runId}@staging.tutorsnap.test`,
    },
    {
      openId: `classroom-e2e-${runId}-outsider`,
      name: "E2E Outsider",
      email: `outsider-${runId}@staging.tutorsnap.test`,
    },
  ];

  const evidence: AcceptanceEvidence = {
    target,
    apiBaseUrl,
    runId,
    startedAt: new Date(started).toISOString(),
    checks: {},
  };

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 2,
    connectionTimeoutMillis: 15_000,
    ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
  });
  let teacher: Client | null = null;
  let classroomId: string | null = null;

  try {
    await removeIdentities(pool, identities);
    await Promise.all(
      identities.map((identity) => seedIdentity(pool, identity)),
    );

    const tokens = await Promise.all(
      identities.map((identity) =>
        sdk.createSessionToken(identity.openId, {
          name: identity.name,
          expiresInMs: 60 * 60 * 1000,
        }),
      ),
    );
    const [teacherClient, learnerA, learnerB, outsider] = tokens.map((token) =>
      makeClient(apiBaseUrl, token),
    );
    teacher = teacherClient;

    const statuses = await Promise.all([
      teacher.classroom.status.query(),
      learnerA.classroom.status.query(),
      learnerB.classroom.status.query(),
    ]);
    assert(
      statuses.every((status) => status.enabled),
      "Classroom flag is not enabled for every session",
    );
    evidence.checks.concurrentAuthenticatedSessions = 3;

    const classroom = await teacher.classroom.create.mutate({
      name: className,
      subject: "algebra",
      gradeLevel: "Grade 8",
    });
    classroomId = classroom.id;
    assert(
      classroom.role === "teacher",
      "Creator did not receive the teacher role",
    );
    assert(
      classroom.joinCode,
      "Teacher projection did not include a join code",
    );

    const [teacherDuringJoin, joinedA, joinedB] = await Promise.all([
      teacher.classroom.get.query({ classroomId }),
      learnerA.classroom.join.mutate({ code: classroom.joinCode }),
      learnerB.classroom.join.mutate({ code: classroom.joinCode }),
    ]);
    assert(
      teacherDuringJoin.role === "teacher",
      "Teacher session lost its class role",
    );
    assert(
      joinedA.role === "learner" && joinedB.role === "learner",
      "Concurrent learner joins failed",
    );
    evidence.checks.concurrentTeacherAndLearnerJoinFlow = true;

    const memberList = await teacher.classroom.listMembers.query({
      classroomId,
      limit: 25,
    });
    assert(
      memberList.items.filter((member) => member.role === "learner").length ===
        2,
      "Teacher did not see both learners",
    );
    await Promise.all([
      expectCode(
        () =>
          learnerA.classroom.listMembers.query({
            classroomId: classroom.id,
            limit: 25,
          }),
        "FORBIDDEN",
        "learner roster access",
      ),
      expectCode(
        () => outsider.classroom.get.query({ classroomId: classroom.id }),
        "NOT_FOUND",
        "outsider class access",
      ),
    ]);
    evidence.checks.relationshipAuthorization = true;

    const assignment = await teacher.classroom.assignment.create.mutate({
      classroomId,
      title: `Concurrent equations ${runId}`,
      instructions: "Solve 3x + 5 = 20 and explain each inverse operation.",
      subject: "algebra",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await Promise.all([
      expectCode(
        () =>
          learnerA.classroom.assignment.get.query({
            assignmentId: assignment.id,
          }),
        "NOT_FOUND",
        "learner draft access",
      ),
      expectCode(
        () =>
          outsider.classroom.assignment.get.query({
            assignmentId: assignment.id,
          }),
        "NOT_FOUND",
        "outsider assignment access",
      ),
    ]);
    await teacher.classroom.assignment.publish.mutate({
      assignmentId: assignment.id,
    });

    const [learnerAssignmentA, learnerAssignmentB] = await Promise.all([
      learnerA.classroom.assignment.get.query({ assignmentId: assignment.id }),
      learnerB.classroom.assignment.get.query({ assignmentId: assignment.id }),
    ]);
    assert(
      learnerAssignmentA.role === "learner" &&
        learnerAssignmentB.role === "learner",
      "Published assignment was not visible to both learners",
    );
    evidence.checks.draftHiddenThenPublished = true;

    const [submissionA, submissionB, teacherConcurrentView] = await Promise.all(
      [
        learnerA.classroom.submission.upsert.mutate({
          assignmentId: assignment.id,
          status: "complete",
          responseText: "Subtract 5, divide by 3, so x = 5.",
        }),
        learnerB.classroom.submission.upsert.mutate({
          assignmentId: assignment.id,
          status: "complete",
          responseText: "3x = 15, therefore x = 5.",
        }),
        teacher.classroom.assignment.get.query({ assignmentId: assignment.id }),
      ],
    );
    assert(
      submissionA.status === "complete" && submissionB.status === "complete",
      "Concurrent submissions did not complete",
    );
    assert(
      teacherConcurrentView.role === "teacher",
      "Teacher could not view the assignment during submissions",
    );
    const teacherSubmissions =
      await teacher.classroom.submission.listForAssignment.query({
        assignmentId: assignment.id,
        limit: 25,
      });
    assert(
      teacherSubmissions.items.filter((item) => item.status === "complete")
        .length === 2,
      "Teacher did not receive both completed submissions",
    );
    evidence.checks.concurrentSubmissions = 2;

    const [commentA, commentB, teacherComment] = await Promise.all([
      learnerA.classroom.comment.add.mutate({
        assignmentId: assignment.id,
        body: "I used inverse operations in two steps.",
      }),
      learnerB.classroom.comment.add.mutate({
        assignmentId: assignment.id,
        body: "Remember to check the solution by substitution.",
      }),
      teacher.classroom.comment.add.mutate({
        assignmentId: assignment.id,
        body: "Good explanations. Keep the reasoning visible.",
      }),
    ]);
    assert(
      commentA.body && commentB.body && teacherComment.body,
      "Concurrent discussion posts failed",
    );
    await Promise.all([
      expectCode(
        () =>
          learnerA.classroom.comment.delete.mutate({ commentId: commentB.id }),
        "FORBIDDEN",
        "cross-learner comment deletion",
      ),
      expectCode(
        () =>
          learnerA.classroom.comment.moderate.mutate({
            commentId: commentB.id,
            reason: "spam",
          }),
        "FORBIDDEN",
        "learner moderation",
      ),
      expectCode(
        () =>
          learnerB.classroom.progress.getClassSummary.query({
            classroomId: classroom.id,
          }),
        "FORBIDDEN",
        "learner aggregate progress",
      ),
    ]);
    await Promise.all([
      teacher.classroom.comment.moderate.mutate({
        commentId: commentB.id,
        reason: "inappropriate",
      }),
      learnerA.classroom.comment.delete.mutate({ commentId: commentA.id }),
    ]);
    const discussion = await learnerB.classroom.comment.list.query({
      assignmentId: assignment.id,
      limit: 25,
    });
    assert(
      discussion.items.filter((comment) => comment.isDeleted).length === 2,
      "Deleted and moderated comments did not render as tombstones",
    );
    evidence.checks.moderatedDiscussion = true;
    evidence.checks.crossStudentMutationDenied = true;

    const [teacherProgress, learnerAProgress, learnerBProgress] =
      await Promise.all([
        teacher.classroom.progress.getClassSummary.query({ classroomId }),
        learnerA.classroom.progress.getMine.query({ classroomId }),
        learnerB.classroom.progress.getMine.query({ classroomId }),
      ]);
    assert(
      teacherProgress.learnerCount === 2 &&
        teacherProgress.completedSubmissions === 2 &&
        teacherProgress.completionPercent === 100,
      "Teacher aggregate progress is incorrect",
    );
    assert(
      learnerAProgress.completed === 1 && learnerBProgress.completed === 1,
      "Learner-private progress is incorrect",
    );
    evidence.checks.teacherAggregateCompletionPercent =
      teacherProgress.completionPercent;
    evidence.checks.eachLearnerPrivateCompleted = 1;

    await teacher.classroom.archive.mutate({ classroomId });
    await Promise.all([
      expectCode(
        () =>
          learnerA.classroom.submission.upsert.mutate({
            assignmentId: assignment.id,
            status: "pending",
            responseText: "Attempt after archive",
          }),
        "PRECONDITION_FAILED",
        "archived learner submission",
      ),
      expectCode(
        () =>
          learnerB.classroom.comment.add.mutate({
            assignmentId: assignment.id,
            body: "Attempt after archive",
          }),
        "PRECONDITION_FAILED",
        "archived learner comment",
      ),
    ]);
    await teacher.classroom.restore.mutate({ classroomId });
    evidence.checks.archiveReadOnlyAndRestore = true;

    await teacher.classroom.delete.mutate({
      classroomId,
      confirmationName: className,
    });
    classroomId = null;
    evidence.checks.teacherConfirmedDeletion = true;

    evidence.completedAt = new Date().toISOString();
    evidence.elapsedMs = Date.now() - started;
    return evidence;
  } finally {
    if (classroomId && teacher) {
      try {
        await teacher.classroom.delete.mutate({
          classroomId,
          confirmationName: className,
        });
      } catch {
        // Direct user deletion below cascades any remaining test classroom rows.
      }
    }
    await removeIdentities(pool, identities);
    await pool.end();
  }
}
