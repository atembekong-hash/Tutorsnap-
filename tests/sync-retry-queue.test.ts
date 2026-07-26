/**
 * sync-retry-queue.test.ts
 *
 * Unit tests for lib/sync-retry-queue.ts
 *
 * Strategy: mock AsyncStorage with an in-memory store so tests run in Node
 * without native modules. Also mock the cloud-sync dynamic import so we can
 * verify flushSyncQueueIfDirty calls pushAllLocalDataToCloud.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── In-memory AsyncStorage mock ─────────────────────────────────────────────
const store: Record<string, string> = {};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    setItem: vi.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    removeItem: vi.fn(async (key: string) => {
      delete store[key];
    }),
  },
}));

// ─── Mock cloud-sync dynamic import ──────────────────────────────────────────
const mockPushAll = vi.fn(async () => {});
vi.mock("@/lib/cloud-sync", () => ({
  pushAllLocalDataToCloud: mockPushAll,
}));

// ─── Import after mocks are registered ───────────────────────────────────────
import {
  markSyncDirty,
  clearSyncDirty,
  isSyncDirty,
  flushSyncQueueIfDirty,
} from "@/lib/sync-retry-queue";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("sync-retry-queue", () => {
  beforeEach(() => {
    // Clear in-memory store and reset mock call counts before each test
    for (const key of Object.keys(store)) delete store[key];
    mockPushAll.mockClear();
  });

  describe("markSyncDirty", () => {
    it("sets the dirty flag in AsyncStorage", async () => {
      await markSyncDirty();
      expect(store["@sync_retry_dirty"]).toBe("1");
    });

    it("is idempotent — calling twice leaves flag set", async () => {
      await markSyncDirty();
      await markSyncDirty();
      expect(store["@sync_retry_dirty"]).toBe("1");
    });
  });

  describe("clearSyncDirty", () => {
    it("removes the dirty flag from AsyncStorage", async () => {
      store["@sync_retry_dirty"] = "1";
      await clearSyncDirty();
      expect(store["@sync_retry_dirty"]).toBeUndefined();
    });

    it("does not throw if flag was not set", async () => {
      await expect(clearSyncDirty()).resolves.toBeUndefined();
    });
  });

  describe("isSyncDirty", () => {
    it("returns true when dirty flag is set", async () => {
      store["@sync_retry_dirty"] = "1";
      expect(await isSyncDirty()).toBe(true);
    });

    it("returns false when dirty flag is absent", async () => {
      expect(await isSyncDirty()).toBe(false);
    });

    it("returns false when dirty flag has unexpected value", async () => {
      store["@sync_retry_dirty"] = "0";
      expect(await isSyncDirty()).toBe(false);
    });
  });

  describe("flushSyncQueueIfDirty", () => {
    it("does NOT call pushAllLocalDataToCloud when queue is clean", async () => {
      await flushSyncQueueIfDirty();
      expect(mockPushAll).not.toHaveBeenCalled();
    });

    it("calls pushAllLocalDataToCloud when queue is dirty", async () => {
      store["@sync_retry_dirty"] = "1";
      await flushSyncQueueIfDirty();
      expect(mockPushAll).toHaveBeenCalledOnce();
    });

    it("clears the dirty flag after a successful flush", async () => {
      store["@sync_retry_dirty"] = "1";
      await flushSyncQueueIfDirty();
      expect(store["@sync_retry_dirty"]).toBeUndefined();
    });

    it("leaves the dirty flag set if pushAllLocalDataToCloud throws", async () => {
      store["@sync_retry_dirty"] = "1";
      mockPushAll.mockRejectedValueOnce(new Error("network error"));
      await flushSyncQueueIfDirty(); // should not throw
      // Flag stays set so next reconnect retries
      expect(store["@sync_retry_dirty"]).toBe("1");
    });

    it("does not throw even if AsyncStorage throws", async () => {
      // Simulate AsyncStorage failure
      const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
      vi.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error("storage error"));
      await expect(flushSyncQueueIfDirty()).resolves.toBeUndefined();
    });
  });

  describe("full offline → reconnect cycle", () => {
    it("marks dirty on failure, flushes on reconnect, clears flag", async () => {
      // Step 1: push fails offline → mark dirty
      await markSyncDirty();
      expect(await isSyncDirty()).toBe(true);

      // Step 2: device reconnects → flush
      await flushSyncQueueIfDirty();
      expect(mockPushAll).toHaveBeenCalledOnce();

      // Step 3: flag is cleared
      expect(await isSyncDirty()).toBe(false);

      // Step 4: second reconnect event does nothing (already clean)
      await flushSyncQueueIfDirty();
      expect(mockPushAll).toHaveBeenCalledOnce(); // still only 1 call
    });
  });
});
