/**
 * Offline queue manager for persisting pending solve requests.
 * Uses AsyncStorage to queue images when offline, auto-submits when online.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface QueuedSolveRequest {
  id: string;
  imageBase64: string;
  mimeType: string;
  subject: string;
  gradeLevel?: string;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = "@mathgenius_offline_queue";
const MAX_RETRIES = 3;

/**
 * Add a solve request to the offline queue.
 */
export async function queueSolveRequest(
  imageBase64: string,
  mimeType: string,
  subject: string,
  gradeLevel?: string
): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const request: QueuedSolveRequest = {
    id,
    imageBase64,
    mimeType,
    subject,
    gradeLevel,
    timestamp: Date.now(),
    retries: 0,
  };

  try {
    const queue = await getQueue();
    queue.push(request);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[OfflineQueue] Queued request ${id} (queue size: ${queue.length})`);
    return id;
  } catch (err) {
    console.error("[OfflineQueue] Failed to queue request:", err);
    throw err;
  }
}

/**
 * Get all queued requests.
 */
export async function getQueue(): Promise<QueuedSolveRequest[]> {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("[OfflineQueue] Failed to read queue:", err);
    return [];
  }
}

/**
 * Remove a request from the queue after successful submission.
 */
export async function removeFromQueue(id: string): Promise<void> {
  try {
    const queue = await getQueue();
    const filtered = queue.filter((req) => req.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    console.log(`[OfflineQueue] Removed ${id} (queue size: ${filtered.length})`);
  } catch (err) {
    console.error("[OfflineQueue] Failed to remove from queue:", err);
  }
}

/**
 * Mark a request as retried (increment retry count).
 */
export async function incrementRetry(id: string): Promise<void> {
  try {
    const queue = await getQueue();
    const req = queue.find((r) => r.id === id);
    if (req) {
      req.retries++;
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      console.log(`[OfflineQueue] Retry ${req.retries} for ${id}`);
    }
  } catch (err) {
    console.error("[OfflineQueue] Failed to increment retry:", err);
  }
}

/**
 * Get stale requests (older than 1 hour, max retries exceeded).
 */
export async function getStaleRequests(): Promise<QueuedSolveRequest[]> {
  try {
    const queue = await getQueue();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return queue.filter((req) => req.timestamp < oneHourAgo || req.retries >= MAX_RETRIES);
  } catch (err) {
    console.error("[OfflineQueue] Failed to get stale requests:", err);
    return [];
  }
}

/**
 * Clear stale requests from the queue.
 */
export async function clearStaleRequests(): Promise<void> {
  try {
    const stale = await getStaleRequests();
    const queue = await getQueue();
    const filtered = queue.filter((req) => !stale.find((s) => s.id === req.id));
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    console.log(`[OfflineQueue] Cleared ${stale.length} stale requests`);
  } catch (err) {
    console.error("[OfflineQueue] Failed to clear stale requests:", err);
  }
}

/**
 * Get queue statistics.
 */
export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  retrying: number;
}> {
  try {
    const queue = await getQueue();
    return {
      total: queue.length,
      pending: queue.filter((r) => r.retries === 0).length,
      retrying: queue.filter((r) => r.retries > 0).length,
    };
  } catch (err) {
    console.error("[OfflineQueue] Failed to get stats:", err);
    return { total: 0, pending: 0, retrying: 0 };
  }
}
