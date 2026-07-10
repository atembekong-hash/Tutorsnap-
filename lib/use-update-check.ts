import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const VERSION_CHECK_URL = "https://tutorsnapai.tech/version.json";
const STORAGE_KEY = "@tutorsnap/lastUpdateCheckDismissed";
// Only show the update prompt once per 24 hours per version
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

export interface UpdateInfo {
  latestVersion: string;
  minVersion: string;
  releaseNotes: string[];
  iosStoreUrl: string;
  androidStoreUrl: string;
  forceUpdate: boolean;
}

interface UpdateCheckState {
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  forceUpdate: boolean;
  dismiss: () => void;
}

/**
 * Compares two semver strings. Returns true if `latest` is newer than `current`.
 */
function isNewer(current: string, latest: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/[^0-9.]/g, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const [cMaj, cMin, cPatch] = parse(current);
  const [lMaj, lMin, lPatch] = parse(latest);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPatch > cPatch;
}

export function useUpdateCheck(): UpdateCheckState {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(async () => {
    setVisible(false);
    if (updateInfo) {
      const key = `${STORAGE_KEY}:${updateInfo.latestVersion}`;
      await AsyncStorage.setItem(key, String(Date.now()));
    }
  }, [updateInfo]);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Skip on web — no native store to redirect to
      if (Platform.OS === "web") return;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(VERSION_CHECK_URL, {
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache" },
        });
        clearTimeout(timeout);

        if (!res.ok || cancelled) return;

        const data = (await res.json()) as UpdateInfo;

        // Get current app version from app.config.ts via Constants
        const currentVersion =
          Constants.expoConfig?.version ?? "1.0.0";

        if (!isNewer(currentVersion, data.latestVersion)) return;

        // Check if we've already dismissed this version recently
        const key = `${STORAGE_KEY}:${data.latestVersion}`;
        const dismissedAt = await AsyncStorage.getItem(key);
        if (dismissedAt && !data.forceUpdate) {
          const elapsed = Date.now() - parseInt(dismissedAt, 10);
          if (elapsed < DISMISS_TTL_MS) return;
        }

        if (!cancelled) {
          setUpdateInfo(data);
          setVisible(true);
        }
      } catch {
        // Network errors are silently ignored — update check is non-critical
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    updateAvailable: visible,
    updateInfo,
    forceUpdate: updateInfo?.forceUpdate ?? false,
    dismiss,
  };
}
