/**
 * useChatBadge
 *
 * Returns the number of *unread* AI Tutor chat sessions for the tab badge.
 * "Unread" = sessions created since the user last tapped the badge.
 *
 * - `unreadCount`: number to show on the badge (0 = hide badge)
 * - `markAsRead()`: call when user taps the badge; persists the current total
 *   so new sessions created after this point show as unread again
 * - `refresh()`: re-read from AsyncStorage (called on foreground resume)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INDEX_KEY = "@tutorsnap/chatSessions/index";
const READ_KEY = "@tutorsnap/chatSessions/readCount";

export function useChatBadge() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const refresh = useCallback(async () => {
    try {
      const [rawIndex, rawRead] = await Promise.all([
        AsyncStorage.getItem(INDEX_KEY),
        AsyncStorage.getItem(READ_KEY),
      ]);
      const total = rawIndex ? (JSON.parse(rawIndex) as string[]).length : 0;
      const read = rawRead ? parseInt(rawRead, 10) : 0;
      setUnreadCount(Math.max(0, total - read));
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const markAsRead = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(INDEX_KEY);
      const total = raw ? (JSON.parse(raw) as string[]).length : 0;
      await AsyncStorage.setItem(READ_KEY, String(total));
      setUnreadCount(0);
    } catch {
      // ignore
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

  return { unreadCount, markAsRead, refresh };
}
