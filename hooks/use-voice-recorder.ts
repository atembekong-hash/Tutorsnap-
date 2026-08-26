/**
 * useVoiceRecorder — records audio via expo-audio and uploads to server for transcription.
 *
 * Flow:
 * 1. Request microphone permission
 * 2. Start recording (expo-audio RecordingPresets.HIGH_QUALITY)
 * 3. Stop recording → get local URI
 * 4. Read file as base64 → POST to /api/voice/upload → get public URL
 * 5. Call trpc.voice.transcribe with the URL → get text
 */

import { useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { trpc } from "@/lib/trpc";
import { apiCall } from "@/lib/_core/api";

export type VoiceRecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "processing"
  | "done"
  | "error";

export interface UseVoiceRecorderResult {
  status: VoiceRecorderStatus;
  isRecording: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  reset: () => void;
}

export function useVoiceRecorder(
  onTranscript: (text: string) => void
): UseVoiceRecorderResult {
  const [status, setStatus] = useState<VoiceRecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const transcribeMutation = trpc.voice.transcribe.useMutation({
    onSuccess: (data) => {
      if (data.text?.trim()) {
        onTranscript(data.text.trim());
        setStatus("done");
      } else {
        setError("No speech detected. Please try again.");
        setStatus("error");
      }
    },
    onError: (err) => {
      setError(err.message || "Transcription failed.");
      setStatus("error");
    },
  });

  const startRecording = useCallback(async () => {
    if (Platform.OS === "web") {
      setError("Voice input is not supported on web.");
      setStatus("error");
      return;
    }
    setError(null);
    setStatus("requesting");

    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      setError("Microphone permission denied.");
      setStatus("error");
      return;
    }

    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setStatus("recording");
    } catch (e: any) {
      setError(e?.message || "Failed to start recording.");
      setStatus("error");
    }
  }, [audioRecorder]);

  const stopRecording = useCallback(async () => {
    if (status !== "recording") return;
    setStatus("processing");

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) {
        setError("No audio captured.");
        setStatus("error");
        return;
      }

      // Read file as base64 and upload to server
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload through the shared client so native builds include Bearer auth
      // and web builds preserve cookie-based authentication.
      const { url } = await apiCall<{ url: string }>("/api/voice/upload", {
        method: "POST",
        body: JSON.stringify({ base64, mimeType: "audio/m4a" }),
      });
      transcribeMutation.mutate({ audioUrl: url });
    } catch (e: any) {
      setError(e?.message || "Failed to process recording.");
      setStatus("error");
    }
  }, [status, audioRecorder, transcribeMutation]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return {
    status,
    isRecording: recorderState.isRecording,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}
