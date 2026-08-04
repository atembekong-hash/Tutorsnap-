#!/usr/bin/env node

import fs from "node:fs";

const baseUrl = (process.env.API_BASE_URL || "").replace(/\/+$/, "");
const expectedVersion = process.env.EXPECTED_VERSION || readPackageVersion();
const timeoutMs = Number(process.env.VERIFY_TIMEOUT_MS || 300_000);
const pollIntervalMs = Number(process.env.VERIFY_POLL_INTERVAL_MS || 5_000);

if (!baseUrl) {
  fail("API_BASE_URL is required");
}

function readPackageVersion() {
  const pkg = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  return pkg.version;
}

function fail(message, details) {
  console.error(JSON.stringify({ ok: false, message, details }, null, 2));
  process.exit(1);
}

async function request(path, init = {}, requestTimeoutMs = 20_000) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

async function waitUntilReady() {
  const deadline = Date.now() + timeoutMs;
  let last = null;

  while (Date.now() < deadline) {
    try {
      const health = await request("/api/health");
      const ready = await request("/api/ready");
      last = {
        healthStatus: health.response.status,
        health: health.body,
        readyStatus: ready.response.status,
        ready: ready.body,
      };
      if (
        health.response.ok &&
        health.body?.ok === true &&
        ready.response.ok &&
        ready.body?.ok === true &&
        ready.body?.database === "ready"
      ) {
        return last;
      }
    } catch (error) {
      last = { error: error instanceof Error ? error.message : String(error) };
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  fail("API did not become ready before the verification deadline", last);
}

function compareSemver(left, right) {
  const parse = (value) =>
    String(value)
      .split(".")
      .slice(0, 3)
      .map((part) => Number.parseInt(part.replace(/\D.*$/, ""), 10) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

const readiness = await waitUntilReady();
const version = await request("/version.json");
if (!version.response.ok || version.body?.latestVersion !== expectedVersion) {
  fail("Unexpected release metadata", {
    status: version.response.status,
    expectedVersion,
    body: version.body,
  });
}
if (compareSemver(version.body.minVersion, version.body.latestVersion) > 0) {
  fail("Minimum supported version exceeds the latest release", version.body);
}

const allowedOrigin = "https://tutorsnapai.tech";
const allowedCors = await request("/api/health", {
  headers: { Origin: allowedOrigin },
});
if (
  allowedCors.response.status !== 200 ||
  allowedCors.response.headers.get("access-control-allow-origin") !==
    allowedOrigin
) {
  fail("Allowed-origin CORS verification failed", {
    status: allowedCors.response.status,
    allowOrigin: allowedCors.response.headers.get(
      "access-control-allow-origin",
    ),
  });
}

const blockedCors = await request("/api/health", {
  headers: { Origin: "https://not-allowed.invalid" },
});
if (
  blockedCors.response.status !== 403 ||
  blockedCors.body?.error !== "Origin not allowed"
) {
  fail("Disallowed-origin CORS verification failed", {
    status: blockedCors.response.status,
    body: blockedCors.body,
  });
}

const webhookAuth = await request("/api/webhooks/revenuecat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event: {
      type: "DEPLOYMENT_VALIDATION",
      app_user_id: "deployment-validation",
      product_id: "deployment-validation",
    },
  }),
});
if (
  webhookAuth.response.status !== 401 ||
  webhookAuth.body?.error !== "Unauthorized"
) {
  fail("RevenueCat webhook authentication verification failed", {
    status: webhookAuth.response.status,
    body: webhookAuth.body,
  });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      baseUrl,
      version: version.body.latestVersion,
      minVersion: version.body.minVersion,
      database: readiness.ready.database,
      cors: "verified",
      revenueCatWebhookAuth: "verified",
    },
    null,
    2,
  ),
);
