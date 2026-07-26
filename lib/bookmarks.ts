import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HistoryItem } from "@/shared/types";
import { pushBookmarks } from "@/lib/cloud-sync";

const BOOKMARKS_KEY = "math_bookmarks";

export async function getBookmarks(): Promise<HistoryItem[]> {
  try {
    const stored = await AsyncStorage.getItem(BOOKMARKS_KEY);
    if (stored) {
      return JSON.parse(stored) as HistoryItem[];
    }
  } catch (_) {
    // ignore
  }
  return [];
}

/** Sync the current bookmarks list to the cloud (fire-and-forget). */
function syncToCloud(bookmarks: HistoryItem[]): void {
  pushBookmarks(
    bookmarks.map((item) => ({
      bookmarkId: String(item.id ?? item.solvedAt ?? Math.random()),
      itemJson: JSON.stringify(item),
      subject: typeof item.subject === "string" ? item.subject : undefined,
    }))
  ).catch(() => {});
}

export async function addBookmark(item: HistoryItem): Promise<void> {
  const bookmarks = await getBookmarks();
  // Avoid duplicates by problem text
  const exists = bookmarks.some((b) => b.id === item.id || b.problem === item.problem);
  if (!exists) {
    const updated = [{ ...item, id: `bookmark-${Date.now()}` }, ...bookmarks].slice(0, 200);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
    syncToCloud(updated);
  }
}

export async function removeBookmark(id: string): Promise<void> {
  const bookmarks = await getBookmarks();
  const updated = bookmarks.filter((b) => b.id !== id);
  await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  syncToCloud(updated);
}

export async function isBookmarked(problem: string): Promise<boolean> {
  const bookmarks = await getBookmarks();
  return bookmarks.some((b) => b.problem === problem);
}

export async function toggleBookmark(item: HistoryItem): Promise<boolean> {
  const bookmarks = await getBookmarks();
  const existingIndex = bookmarks.findIndex(
    (b) => b.id === item.id || b.problem === item.problem
  );
  if (existingIndex >= 0) {
    bookmarks.splice(existingIndex, 1);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    syncToCloud(bookmarks);
    return false; // removed
  } else {
    const updated = [{ ...item, id: `bookmark-${Date.now()}` }, ...bookmarks].slice(0, 200);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
    syncToCloud(updated);
    return true; // added
  }
}
