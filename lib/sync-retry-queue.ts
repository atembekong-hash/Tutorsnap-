/**
 * sync-retry-queue.ts
 *
 * Lightweight offline-sync retry mechanism.
 *
 * Strategy:
 *  - Any push function that fails offline calls `markSyncDirty()` to set a
 *    persistent "dirty" flag in AsyncStorage.
 *  - When the device reconnects, `flushSyncQueueIfDirty()` is called once.
 *    It calls `pushAllLocalDataToCloud()` which re-pushes every data type.
 *  - On success the dirty flag is cleared; on failure it stays set so the
 *    next reconnect event will retry again.
 *
 * Usage:
 *  1. In any push function's catch block: `markSyncDirty().catch(() => {})`.
 *  2. In _layout.tsx, call `flushSyncQueueIfDirty()` when `wasJustReconnected` is true.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const DIRTY_KEY = "@sync_retry_dirty";

/**
 * Mark the sync queue as dirty. Call this when a push fails because the
 * device is offline or the server is unreachable.
 */
export async function markSyncDirty(): Promise<void> {
  try {
    await AsyncStorage.setItem(DIRTY_KEY, "1");
  } catch {
    /* non-critical */
  }
}

/**
 * Clear the dirty flag after a successful full sync.
 */
export async function clearSyncDirty(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DIRTY_KEY);
  } catch {
    /* non-critical */
  }
}

/**
 * Returns true if there are pending pushes that failed while offline.
 */
export async function isSyncDirty(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(DIRTY_KEY);
    return val === "1";
  } catch {
    return false;
  }
}

/**
 * If the sync queue is dirty, run a full push of all local data to the cloud.
 * Call this whenever the device transitions from offline → online.
 *
 * Lazy-imports pushAllLocalDataToCloud to avoid circular dependency issues.
 */
export async function flushSyncQueueIfDirty(): Promise<void> {
  try {
    const dirty = await isSyncDirty();
    if (!dirty) return;
    const { pushAllLocalDataToCloud } = await import("@/lib/cloud-sync");
    await pushAllLocalDataToCloud();
    await clearSyncDirty();
    console.log("[syncRetryQueue] Flushed pending offline sync successfully.");
  } catch (err) {
    // Leave the dirty flag set so we retry on the next reconnect
    console.warn("[syncRetryQueue] Flush failed, will retry on next reconnect:", err);
  }
}
