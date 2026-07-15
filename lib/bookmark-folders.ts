import AsyncStorage from "@react-native-async-storage/async-storage";

const FOLDERS_KEY = "bookmark_folders";
const FOLDER_ITEMS_PREFIX = "bookmark_folder_items_";

export type BookmarkFolder = {
  id: string;
  name: string;
  emoji: string;
  color: string; // hex colour tag
  createdAt: number;
  itemCount?: number;
};

export const FOLDER_COLORS = [
  "#6366F1", // indigo
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
  "#3B82F6", // blue
  "#EF4444", // red
  "#8B5CF6", // violet
  "#14B8A6", // teal
  "#F97316", // orange
  "#84CC16", // lime
];

export async function getFolders(): Promise<BookmarkFolder[]> {
  try {
    const stored = await AsyncStorage.getItem(FOLDERS_KEY);
    if (stored) return JSON.parse(stored) as BookmarkFolder[];
  } catch { /* ignore */ }
  return [];
}

export async function createFolder(name: string, emoji = "📁", color?: string): Promise<BookmarkFolder> {
  const folders = await getFolders();
  // Auto-assign a colour cycling through FOLDER_COLORS
  const autoColor = FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
  const newFolder: BookmarkFolder = {
    id: `folder-${Date.now()}`,
    name: name.trim(),
    emoji,
    color: color ?? autoColor,
    createdAt: Date.now(),
    itemCount: 0,
  };
  folders.push(newFolder);
  await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  return newFolder;
}

export async function renameFolder(id: string, name: string, emoji?: string, color?: string): Promise<void> {
  const folders = await getFolders();
  const idx = folders.findIndex((f) => f.id === id);
  if (idx >= 0) {
    folders[idx].name = name.trim();
    if (emoji) folders[idx].emoji = emoji;
    if (color) folders[idx].color = color;
    await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  }
}

export async function deleteFolder(id: string): Promise<void> {
  const folders = await getFolders();
  const updated = folders.filter((f) => f.id !== id);
  await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
  await AsyncStorage.removeItem(`${FOLDER_ITEMS_PREFIX}${id}`);
}

export async function getFolderItems(folderId: string): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(`${FOLDER_ITEMS_PREFIX}${folderId}`);
    if (stored) return JSON.parse(stored) as string[];
  } catch { /* ignore */ }
  return [];
}

export async function addToFolder(folderId: string, bookmarkId: string): Promise<void> {
  const items = await getFolderItems(folderId);
  if (!items.includes(bookmarkId)) {
    items.push(bookmarkId);
    await AsyncStorage.setItem(`${FOLDER_ITEMS_PREFIX}${folderId}`, JSON.stringify(items));
    // Update item count
    const folders = await getFolders();
    const idx = folders.findIndex((f) => f.id === folderId);
    if (idx >= 0) {
      folders[idx].itemCount = items.length;
      await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    }
  }
}

export async function removeFromFolder(folderId: string, bookmarkId: string): Promise<void> {
  const items = await getFolderItems(folderId);
  const updated = items.filter((id) => id !== bookmarkId);
  await AsyncStorage.setItem(`${FOLDER_ITEMS_PREFIX}${folderId}`, JSON.stringify(updated));
  // Update item count
  const folders = await getFolders();
  const idx = folders.findIndex((f) => f.id === folderId);
  if (idx >= 0) {
    folders[idx].itemCount = updated.length;
    await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  }
}

export async function getBookmarkFolderIds(bookmarkId: string): Promise<string[]> {
  const folders = await getFolders();
  const result: string[] = [];
  for (const folder of folders) {
    const items = await getFolderItems(folder.id);
    if (items.includes(bookmarkId)) result.push(folder.id);
  }
  return result;
}
