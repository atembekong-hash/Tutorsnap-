/**
 * Voice upload route — accepts base64 audio from the client, uploads to storage,
 * and returns a public URL for the transcription service.
 */
import type { Express } from "express";
import { storagePut } from "../storage";

export function registerVoiceUploadRoute(app: Express) {
  app.post("/api/voice/upload", async (req, res) => {
    try {
      const { base64, mimeType = "audio/m4a" } = req.body as {
        base64: string;
        mimeType?: string;
      };

      if (!base64) {
        return res.status(400).json({ error: "Missing base64 audio data" });
      }

      const buffer = Buffer.from(base64, "base64");
      const ext = mimeType.split("/")[1]?.split(";")[0] || "m4a";
      const filename = `voice_${Date.now()}.${ext}`;

      const { url } = await storagePut(`voice/${filename}`, buffer, mimeType);

      // Build absolute URL for the transcription service
      const host = req.headers.host || "localhost:3000";
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const absoluteUrl = `${protocol}://${host}${url}`;

      return res.json({ url: absoluteUrl });
    } catch (err: any) {
      console.error("[voice/upload]", err);
      return res.status(500).json({ error: err?.message || "Upload failed" });
    }
  });
}
