import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HistoryItem } from "@/shared/types";

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

export async function addBookmark(item: HistoryItem): Promise<void> {
  const bookmarks = await getBookmarks();
  // Avoid duplicates by problem text
  const exists = bookmarks.some((b) => b.id === item.id || b.problem === item.problem);
  if (!exists) {
    bookmarks.unshift({ ...item, id: `bookmark-${Date.now()}` });
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks.slice(0, 200)));
  }
}

export async function removeBookmark(id: string): Promise<void> {
  const bookmarks = await getBookmarks();
  const updated = bookmarks.filter((b) => b.id !== id);
  await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
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
    return false; // removed
  } else {
    bookmarks.unshift({ ...item, id: `bookmark-${Date.now()}` });
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks.slice(0, 200)));
    return true; // added
  }
}
