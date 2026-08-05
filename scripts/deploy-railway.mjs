#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const project = process.env.RAILWAY_PROJECT_ID;
const environment = process.env.RAILWAY_ENVIRONMENT;
const service = process.env.RAILWAY_SERVICE || "api";
const timeoutMs = Number(process.env.RAILWAY_DEPLOY_TIMEOUT_MS || 900_000);
const pollIntervalMs = Number(process.env.RAILWAY_DEPLOY_POLL_MS || 10_000);
const message =
  process.env.RAILWAY_DEPLOY_MESSAGE ||
  (process.env.GITHUB_SHA
    ? `GitHub ${process.env.GITHUB_SHA.slice(0, 12)}`
    : "Automated deployment");

for (const [name, value] of Object.entries({
  RAILWAY_TOKEN: process.env.RAILWAY_TOKEN,
  RAILWAY_PROJECT_ID: project,
  RAILWAY_ENVIRONMENT: environment,
  RAILWAY_SERVICE: service,
})) {
  if (!value) fail(`${name} is required`);
}

function runRailway(args) {
  const result = spawnSync("pnpm", ["dlx", "@railway/cli", ...args], {
    cwd: new URL("..", import.meta.url),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) fail("Unable to run Railway CLI", result.error.message);
  return result;
}

function fail(message, details) {
  console.error(JSON.stringify({ ok: false, message, details }, null, 2));
  process.exit(1);
}

function extractDeploymentId(output) {
  try {
    const parsed = JSON.parse(output);
    const id = parsed.deploymentId || parsed.id;
    if (typeof id === "string") return id;
  } catch {
    // Some CLI versions add a human-readable line around the JSON payload.
  }
  return (
    output.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    )?.[0] || null
  );
}

const upload = runRailway([
  "up",
  "--detach",
  "--yes",
  "--json",
  "--project",
  project,
  "--environment",
  environment,
  "--service",
  service,
  "--message",
  message,
]);

const uploadOutput = `${upload.stdout || ""}\n${upload.stderr || ""}`.trim();
const deploymentId = extractDeploymentId(uploadOutput);
if (upload.status !== 0 || !deploymentId) {
  fail("Railway upload did not return a deployment ID", {
    exitCode: upload.status,
    output: uploadOutput.slice(-2_000),
  });
}

console.log(JSON.stringify({ phase: "uploaded", deploymentId }));

// Railway reports SKIPPED when an upload is deduplicated against an identical
// active deployment. The subsequent live-contract verifier remains the source
// of truth that the expected release is healthy.
const successStates = new Set(["SUCCESS", "SKIPPED"]);
const failureStates = new Set(["FAILED", "CRASHED", "REMOVED"]);
const deadline = Date.now() + timeoutMs;
let lastStatus = "UNKNOWN";

while (Date.now() < deadline) {
  const list = runRailway([
    "deployment",
    "list",
    "--project",
    project,
    "--environment",
    environment,
    "--service",
    service,
    "--limit",
    "50",
    "--json",
  ]);

  if (list.status !== 0) {
    console.warn(
      JSON.stringify({
        phase: "poll",
        warning: "deployment list failed",
        exitCode: list.status,
      }),
    );
  } else {
    try {
      const deployments = JSON.parse(list.stdout);
      const deployment = deployments.find((item) => item.id === deploymentId);
      lastStatus = deployment?.status || "PENDING";
      console.log(
        JSON.stringify({ phase: "poll", deploymentId, status: lastStatus }),
      );

      if (successStates.has(lastStatus)) {
        console.log(
          JSON.stringify({ ok: true, deploymentId, status: lastStatus }),
        );
        process.exit(0);
      }
      if (failureStates.has(lastStatus)) {
        fail("Railway deployment reached a failure state", {
          deploymentId,
          status: lastStatus,
        });
      }
    } catch (error) {
      console.warn(
        JSON.stringify({
          phase: "poll",
          warning: "invalid deployment-list response",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
}

fail("Railway deployment did not complete before timeout", {
  deploymentId,
  status: lastStatus,
});
