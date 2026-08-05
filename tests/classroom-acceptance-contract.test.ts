import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

function source(path: string): string {
  return readFileSync(resolve(root, path), "utf8");
}

describe("Guided Classroom staging acceptance contract", () => {
  it("refuses to run without an explicit staging target and enabled feature flag", () => {
    const core = source("server/_core/classroom-acceptance-core.ts");
    expect(core).toContain('target === "staging"');
    expect(core).toContain('process.env.CLASSROOM_MVP_ENABLED === "true"');
    expect(core).toContain(
      "Refusing to run outside an explicit staging target",
    );
    expect(core).toContain('apiBaseUrl.includes("api-staging")');
  });

  it("runs a teacher and two learners concurrently through joins, submissions, and discussion", () => {
    const core = source("server/_core/classroom-acceptance-core.ts");
    expect(core).toContain("concurrentAuthenticatedSessions = 3");
    expect(core).toContain("concurrentTeacherAndLearnerJoinFlow");
    expect(core).toContain("concurrentSubmissions = 2");
    expect(core).toContain("Promise.all([");
    expect(core).toContain("crossStudentMutationDenied");
    expect(core).toContain("teacherAggregateCompletionPercent");
  });

  it("tests outsider and cross-learner denials plus archived read-only behavior", () => {
    const core = source("server/_core/classroom-acceptance-core.ts");
    expect(core).toContain('"outsider class access"');
    expect(core).toContain('"cross-learner comment deletion"');
    expect(core).toContain('"learner moderation"');
    expect(core).toContain('"archived learner submission"');
    expect(core).toContain('"archived learner comment"');
  });

  it("always deletes the temporary staging identities and their cascading class data", () => {
    const core = source("server/_core/classroom-acceptance-core.ts");
    expect(core).toContain("finally {");
    expect(core).toContain("await removeIdentities(pool, identities)");
    expect(core).toContain("await pool.end()");
  });

  it("keeps the HTTP trigger staging-only, expiring, authenticated, one-shot, and uncached", () => {
    const route = source("server/_core/classroomAcceptanceRoute.ts");
    expect(route).toContain("CLASSROOM_ACCEPTANCE_ENDPOINT_ENABLED");
    expect(route).toContain('CLASSROOM_ACCEPTANCE_TARGET !== "staging"');
    expect(route).toContain('railwayEnvironment !== "staging"');
    expect(route).toContain('apiBaseUrl.includes("api-staging")');
    expect(route).toContain("CLASSROOM_ACCEPTANCE_EXPIRES_AT");
    expect(route).toContain("secret.length >= 32");
    expect(route).toContain("timingSafeEqual");
    expect(route).toContain("acceptanceStarted");
    expect(route).toContain('res.setHeader("Cache-Control", "no-store")');
    expect(route).toContain("res.status(404)");
    expect(route).toContain("res.status(401)");
    expect(route).toContain("res.status(409)");
  });

  it("configures before deployment and runs after live verification with a masked secret", () => {
    const packageJson = source("package.json");
    const workflow = source(".github/workflows/ci.yml");
    const wrapper = source("scripts/run-classroom-staging-acceptance.sh");
    const server = source("server/_core/index.ts");
    const dockerfile = source("Dockerfile");

    expect(packageJson).toContain("server/_core/classroom-acceptance.ts");
    expect(dockerfile).toContain("/app/dist ./dist");
    expect(server).toContain("registerClassroomAcceptanceRoute(app)");
    expect(workflow).toContain("pnpm install --frozen-lockfile");
    expect(workflow).toContain(
      "bash scripts/run-classroom-staging-acceptance.sh configure",
    );
    expect(workflow).toContain(
      "bash scripts/run-classroom-staging-acceptance.sh run",
    );
    expect(
      workflow.indexOf("Configure expiring Classroom acceptance window"),
    ).toBeLessThan(workflow.indexOf("Upload and monitor Railway deployment"));
    expect(workflow.indexOf("Verify live staging contract")).toBeLessThan(
      workflow.indexOf("Run concurrent teacher and two-learner acceptance"),
    );

    expect(wrapper).toContain("openssl rand -hex 32");
    expect(wrapper).toContain("::add-mask::${secret}");
    expect(wrapper).toContain("CLASSROOM_ACCEPTANCE_SECRET");
    expect(wrapper).toContain("CLASSROOM_ACCEPTANCE_EXPIRES_AT");
    expect(wrapper).toContain("CLASSROOM_ACCEPTANCE_ENDPOINT_ENABLED=true");
    expect(wrapper).toContain("CLASSROOM_MVP_ENABLED=true");
    expect(wrapper).toContain("Authorization: Bearer");
    expect(wrapper).toContain("CLASSROOM_ACCEPTANCE_ENDPOINT_ENABLED=false");
    expect(wrapper).toContain("concurrentAuthenticatedSessions == 3");
    expect(wrapper).toContain("concurrentSubmissions == 2");
  });
});
