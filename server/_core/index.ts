import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerVoiceUploadRoute } from "./voiceUpload";
import { registerChatStreamRoute } from "./chatStream";
import { registerMathRenderRoute } from "./mathRender";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes.
  // Native Android/iOS fetch calls do NOT send an Origin header, so we must
  // always set Access-Control-Allow-Origin regardless of whether Origin is present.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Reflect origin if present (needed for web + credentials); otherwise allow all
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    // Only send Allow-Credentials when we have a specific origin (wildcard + credentials is invalid)
    if (origin) {
      res.header("Access-Control-Allow-Credentials", "true");
    }

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerVoiceUploadRoute(app);
  registerChatStreamRoute(app);
  registerMathRenderRoute(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Version metadata endpoint — used by the in-app update check hook.
  // The live tutorsnapai.tech/version.json is the canonical source for production.
  // This endpoint serves the same data from the local API server so the update
  // prompt can be tested in development without a deployed domain.
  app.get("/version.json", (_req, res) => {
    res.json({
      latestVersion: "1.1.0",
      minVersion: "1.0.0",
      releaseNotes: [
        "Flashcard PDF export — share your entire deck as a printable PDF",
        "Classroom leaderboard and homework assignment tools",
        "153 accessibility improvements for screen readers",
        "App Store privacy manifest and NSUsageDescription strings",
        "Pomodoro focus timer for Study Planner sessions",
        "Streak freeze mechanic and badge unlock animations",
      ],
      iosStoreUrl: "https://apps.apple.com/app/tutorsnap/id0000000000",
      androidStoreUrl: "https://play.google.com/store/apps/details?id=com.tutorsnap.app",
      forceUpdate: false,
    });
  });

  // Add request logging middleware
  app.use("/api/trpc", (req, res, next) => {
    console.log(`[tRPC] ${req.method} ${req.path}`);
    console.log(`[tRPC] Headers:`, req.headers);
    if (req.body) {
      console.log(`[tRPC] Body:`, JSON.stringify(req.body).substring(0, 500));
    }
    next();
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
