/**
 * Voice upload route — accepts base64 audio from the client, uploads it to
 * storage, and returns a URL for the authenticated user’s transcription flow.
 */
import type { Express, Request } from "express";
import { sdk } from "./sdk";
import { storagePut } from "../storage";

const MAX_AUDIO_BYTES = 16 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_AUDIO_BYTES * 4 / 3) + 16;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/ogg",
  "audio/webm",
]);

function parseAudioType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const mimeType = value.split(";", 1)[0]?.trim().toLowerCase();
  return mimeType && ALLOWED_AUDIO_TYPES.has(mimeType) ? mimeType : null;
}

function decodeBase64(value: string): Buffer | null {
  const payload = value.replace(/^data:[^;]+;base64,/, "").trim();
  if (!payload || payload.length > MAX_BASE64_LENGTH || payload.length % 4 === 1) {
    return null;
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(payload)) return null;
  const buffer = Buffer.from(payload, "base64");
  return buffer.length > 0 && buffer.length <= MAX_AUDIO_BYTES ? buffer : null;
}

function getExtension(mimeType: string): string {
  if (mimeType === "audio/mpeg" || mimeType === "audio/mp3") return "mp3";
  if (mimeType === "audio/mp4" || mimeType === "audio/m4a") return "m4a";
  if (mimeType === "audio/wav" || mimeType === "audio/wave") return "wav";
  if (mimeType === "audio/ogg") return "ogg";
  return "webm";
}

function getPublicOrigin(req: Request): string {
  const configuredOrigin = process.env.PUBLIC_API_URL?.trim() || process.env.API_BASE_URL?.trim();
  if (configuredOrigin) return configuredOrigin.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("PUBLIC_API_URL is required in production");
  }
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0]?.trim();
  const protocol = forwardedProto === "http" ? "http" : "https";
  return `${protocol}://${req.get("host") || "localhost:3000"}`;
}

export function registerVoiceUploadRoute(app: Express) {
  app.post("/api/voice/upload", async (req, res) => {
    try {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        return res.status(401).json({ error: "Authentication required" });
      }

      const body = req.body as { base64?: unknown; mimeType?: unknown };
      if (typeof body?.base64 !== "string") {
        return res.status(400).json({ error: "Missing base64 audio data" });
      }
      if (body.base64.length > MAX_BASE64_LENGTH) {
        return res.status(413).json({ error: "Audio file exceeds maximum size limit" });
      }

      const mimeType = parseAudioType(body.mimeType ?? "audio/m4a");
      if (!mimeType) {
        return res.status(415).json({ error: "Unsupported audio format" });
      }

      const buffer = decodeBase64(body.base64);
      if (!buffer) {
        return res.status(400).json({ error: "Invalid or oversized base64 audio data" });
      }

      const filename = `voice_${crypto.randomUUID()}.${getExtension(mimeType)}`;
      const { url } = await storagePut(`voice/${user.id}/${filename}`, buffer, mimeType);
      return res.json({ url: `${getPublicOrigin(req)}${url}` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      console.error("[voice/upload]", message);
      return res.status(500).json({ error: "Upload failed" });
    }
  });
}
