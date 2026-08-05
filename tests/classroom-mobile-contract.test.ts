import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

function source(path: string): string {
  return readFileSync(resolve(root, path), "utf8");
}

const REQUIRED_CLASSROOM_ROUTES = [
  "app/(tabs)/classroom/_layout.tsx",
  "app/(tabs)/classroom/index.tsx",
  "app/(tabs)/classroom/create.tsx",
  "app/(tabs)/classroom/join.tsx",
  "app/(tabs)/classroom/[classroomId]/index.tsx",
  "app/(tabs)/classroom/[classroomId]/progress.tsx",
  "app/(tabs)/classroom/[classroomId]/settings.tsx",
  "app/(tabs)/classroom/[classroomId]/assignment/create.tsx",
  "app/(tabs)/classroom/[classroomId]/assignment/[assignmentId].tsx",
] as const;

describe("Guided Classroom mobile integration contract", () => {
  it("ships the complete nested Classroom route tree behind one tab", () => {
    for (const route of REQUIRED_CLASSROOM_ROUTES) {
      expect(existsSync(resolve(root, route)), `${route} must exist`).toBe(
        true,
      );
    }
    expect(existsSync(resolve(root, "app/(tabs)/classroom.tsx"))).toBe(false);
    expect(source("app/(tabs)/_layout.tsx")).toContain('name="classroom"');
  });

  it("routes class-code links and local assignment reminders to precise nested screens", () => {
    const layout = source("app/_layout.tsx");
    expect(layout).toContain('pathname: "/(tabs)/classroom/join"');
    expect(layout).toContain(
      'pathname: "/(tabs)/classroom/[classroomId]/assignment/[assignmentId]"',
    );
    expect(layout).toContain('data?.type === "classroom_assignment_reminder"');
    expect(layout).toContain("assignmentId: data.assignmentId");
    expect(layout).toContain("classroomId: data.classroomId");
  });

  it("uses public assignment IDs in local reminders and never legacy problem IDs", () => {
    const reminders = source("lib/homework-notifications.ts");
    expect(reminders).toContain('type: "classroom_assignment_reminder"');
    expect(reminders).toContain("assignmentId: assignment.id");
    expect(reminders).toContain("classroomId");
    expect(reminders).not.toContain("problemId");
    expect(reminders).toContain("cancelAssignmentReminders");
    expect(reminders).toContain("cancelClassroomAssignmentReminders");
  });

  it("derives the Solve home due-soon card from the Classroom API", () => {
    const home = source("app/(tabs)/index.tsx");
    expect(home).toContain("trpc.classroom.getMyClasses.useQuery");
    expect(home).toContain("nextClassAssignment");
    expect(home).toContain(
      'pathname: "/(tabs)/classroom/[classroomId]/assignment/[assignmentId]"',
    );
    expect(home).not.toContain("getClassroomFeed");
    expect(home).not.toContain("dueSoonHomework");
  });

  it("removes all production callers of the AsyncStorage Classroom prototype and ranking writes", () => {
    expect(existsSync(resolve(root, "lib/classroom.ts"))).toBe(false);
    const chat = source("app/(tabs)/chat.tsx");
    const solution = source("app/solution.tsx");
    const challenge = source("app/challenge.tsx");
    expect(chat).not.toContain("shareToClassroom");
    expect(solution).not.toContain("shareToClassroom");
    expect(challenge).not.toContain("recordChallengeResult");
    expect(chat).toContain("Open Guided Classroom");
    expect(solution).toContain("Open Guided Classroom");
  });

  it("sets assignment-specific AI Tutor context without creating a parallel tutor", () => {
    const assignment = source(
      "app/(tabs)/classroom/[classroomId]/assignment/[assignmentId].tsx",
    );
    expect(assignment).toContain("useAssistantContext");
    expect(assignment).toContain('source: "classroom"');
    expect(assignment).toContain("Assignment instructions:");
    expect(assignment).not.toContain("invokeLLM");
  });
});
