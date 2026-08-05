import { timingSafeEqual } from "node:crypto";
import type { Application, Request } from "express";

import { runClassroomAcceptance } from "./classroom-acceptance-core";

let acceptanceStarted = false;

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function readBearerToken(req: Request): string | null {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

function isStagingAcceptanceWindowOpen(): boolean {
  if (process.env.CLASSROOM_ACCEPTANCE_ENDPOINT_ENABLED !== "true")
    return false;
  if (process.env.CLASSROOM_ACCEPTANCE_TARGET !== "staging") return false;
  if (process.env.CLASSROOM_MVP_ENABLED !== "true") return false;

  const railwayEnvironment =
    process.env.RAILWAY_ENVIRONMENT_NAME?.trim().toLowerCase();
  if (railwayEnvironment && railwayEnvironment !== "staging") return false;

  const apiBaseUrl =
    process.env.CLASSROOM_ACCEPTANCE_API_BASE_URL?.trim() ?? "";
  if (!apiBaseUrl.includes("api-staging")) return false;

  const expiresAt = Date.parse(
    process.env.CLASSROOM_ACCEPTANCE_EXPIRES_AT ?? "",
  );
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  const secret = process.env.CLASSROOM_ACCEPTANCE_SECRET?.trim() ?? "";
  return secret.length >= 32;
}

export function registerClassroomAcceptanceRoute(app: Application): void {
  app.post("/api/internal/classroom-acceptance", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");

    if (!isStagingAcceptanceWindowOpen()) {
      res.status(404).json({ ok: false, error: "Not found" });
      return;
    }

    const expectedSecret = process.env.CLASSROOM_ACCEPTANCE_SECRET!.trim();
    const providedSecret = readBearerToken(req);
    if (!providedSecret || !safeEqual(providedSecret, expectedSecret)) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    if (acceptanceStarted) {
      res.status(409).json({
        ok: false,
        error:
          "The staging acceptance flow has already been started on this deployment",
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

export const classroomAcceptanceRouteInternals = {
  isStagingAcceptanceWindowOpen,
  safeEqual,
};
