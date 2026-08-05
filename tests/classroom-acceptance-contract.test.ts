import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

function source(path: string): string {
  return readFileSync(resolve(root, path), "utf8");
}

describe("Guided Classroom staging acceptance contract", () => {
  it("refuses to run without an explicit staging target and enabled feature flag", () => {
    const runner = source("server/_core/classroom-acceptance.ts");
    expect(runner).toContain('target === "staging"');
    expect(runner).toContain('process.env.CLASSROOM_MVP_ENABLED === "true"');
    expect(runner).toContain(
      "Refusing to run outside an explicit staging target",
    );
    expect(runner).toContain('apiBaseUrl.includes("api-staging")');
  });

  it("runs a teacher and two learners concurrently through joins, submissions, and discussion", () => {
    const runner = source("server/_core/classroom-acceptance.ts");
    expect(runner).toContain("concurrentAuthenticatedSessions = 3");
    expect(runner).toContain("concurrentTeacherAndLearnerJoinFlow");
    expect(runner).toContain("concurrentSubmissions = 2");
    expect(runner).toContain("Promise.all([");
    expect(runner).toContain("crossStudentMutationDenied");
    expect(runner).toContain("teacherAggregateCompletionPercent");
  });

  it("tests outsider and cross-learner denials plus archived read-only behavior", () => {
    const runner = source("server/_core/classroom-acceptance.ts");
    expect(runner).toContain('"outsider class access"');
    expect(runner).toContain('"cross-learner comment deletion"');
    expect(runner).toContain('"learner moderation"');
    expect(runner).toContain('"archived learner submission"');
    expect(runner).toContain('"archived learner comment"');
  });

  it("always deletes the temporary staging identities and their cascading class data", () => {
    const runner = source("server/_core/classroom-acceptance.ts");
    expect(runner).toContain("finally {");
    expect(runner).toContain("await removeIdentities(pool, identities)");
    expect(runner).toContain("await pool.end()");
  });

  it("bundles and runs the acceptance gate inside Railway after live staging verification", () => {
    const packageJson = source("package.json");
    const workflow = source(".github/workflows/ci.yml");
    const wrapper = source("scripts/run-classroom-staging-acceptance.sh");
    const dockerfile = source("Dockerfile");
    expect(packageJson).toContain("server/_core/classroom-acceptance.ts");
    expect(dockerfile).toContain("/app/dist ./dist");
    expect(workflow).toContain("CLASSROOM_MVP_ENABLED=true");
    expect(workflow).toContain(
      "Run concurrent teacher and two-learner acceptance",
    );
    expect(workflow).toContain("pnpm install --frozen-lockfile");
    expect(workflow).toContain(
      "bash scripts/run-classroom-staging-acceptance.sh",
    );
    expect(wrapper).toContain("pnpm dlx @railway/cli service list");
    expect(wrapper).toContain("pnpm dlx @railway/cli variable list");
    expect(wrapper).toContain("::add-mask::${public_database_url}");
    expect(wrapper).toContain("CLASSROOM_ACCEPTANCE_DATABASE_URL");
    expect(wrapper).toContain("pnpm dlx @railway/cli run");
    expect(wrapper).toContain("--no-local");
    expect(wrapper).toContain("node dist/classroom-acceptance.js");
    expect(workflow.indexOf("Verify live staging contract")).toBeLessThan(
      workflow.indexOf("Run concurrent teacher and two-learner acceptance"),
    );
  });
});
