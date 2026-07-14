/**
 * useChatBadge
 *
 * Returns the total number of AI Tutor chat sessions for the tab badge.
 * Reads the session index from AsyncStorage and refreshes whenever the
 * app comes to the foreground (via AppState) or when `refresh()` is called.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INDEX_KEY = "@tutorsnap/chatSessions/index";

export function useChatBadge() {
  const [sessionCount, setSessionCount] = useState<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const refresh = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(INDEX_KEY);
      if (!raw) { setSessionCount(0); return; }
      const ids: string[] = JSON.parse(raw);
      setSessionCount(Array.isArray(ids) ? ids.length : 0);
    } catch {
      setSessionCount(0);
    }
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && next === "active") {
        refresh();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [refresh]);

  return { sessionCount, refresh };
}
