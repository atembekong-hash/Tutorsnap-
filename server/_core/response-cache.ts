/**
 * Response caching layer for solver responses.
 * Uses in-memory cache with hash-based keys to avoid reprocessing identical questions.
 * Cache key: SHA256(imageBase64 + subject + gradeLevel)
 */

import crypto from "crypto";

export interface CacheEntry {
  response: any;
  timestamp: number;
  hits: number;
}

// In-memory cache (could be replaced with Redis for production)
const responseCache = new Map<string, CacheEntry>();

// Cache statistics
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Generate a cache key from image, subject, and grade level.
 * Uses SHA256 hash to keep keys manageable.
 */
export function generateCacheKey(imageBase64: string, subject: string, gradeLevel?: string): string {
  const combined = `${imageBase64}|${subject}|${gradeLevel || "none"}`;
  return crypto.createHash("sha256").update(combined).digest("hex");
}

/**
 * Get a response from cache if it exists.
 * Returns null if not found or if cache entry is stale (>24 hours).
 */
export function getCachedResponse(cacheKey: string): any | null {
  const entry = responseCache.get(cacheKey);
  if (!entry) {
    cacheMisses++;
    return null;
  }

  // Check if cache entry is stale (24 hours)
  const ageMs = Date.now() - entry.timestamp;
  const maxAgeMs = 24 * 60 * 60 * 1000;

  if (ageMs > maxAgeMs) {
    responseCache.delete(cacheKey);
    cacheMisses++;
    console.log(`[Cache] Entry expired after ${Math.round(ageMs / 1000 / 60)} minutes`);
    return null;
  }

  cacheHits++;
  entry.hits++;
  console.log(`[Cache] HIT (${cacheHits} total hits, ${entry.hits} hits for this entry)`);
  return entry.response;
}

/**
 * Store a response in cache.
 */
export function setCachedResponse(cacheKey: string, response: any): void {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now(),
    hits: 0,
  });
  console.log(`[Cache] Stored response (cache size: ${responseCache.size})`);
}

/**
 * Clear the entire cache (useful for testing or maintenance).
 */
export function clearCache(): void {
  responseCache.clear();
  console.log("[Cache] Cleared entire cache");
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
} {
  const total = cacheHits + cacheMisses;
  return {
    size: responseCache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? Math.round((cacheHits / total) * 100) : 0,
  };
}

/**
 * Get detailed cache contents (for debugging).
 */
export function getCacheContents(): Array<{
  key: string;
  ageMinutes: number;
  hits: number;
  responseSize: number;
}> {
  return Array.from(responseCache.entries()).map(([key, entry]) => ({
    key: key.substring(0, 16) + "...",
    ageMinutes: Math.round((Date.now() - entry.timestamp) / 1000 / 60),
    hits: entry.hits,
    responseSize: JSON.stringify(entry.response).length,
  }));
}

/**
 * Prune cache to keep it under max size (removes least-hit entries).
 * Call this periodically to prevent unbounded memory growth.
 */
export function pruneCache(maxSize: number = 1000): void {
  if (responseCache.size <= maxSize) return;

  // Sort entries by hits (ascending) and remove least-hit ones
  const entries = Array.from(responseCache.entries())
    .sort((a, b) => a[1].hits - b[1].hits)
    .slice(0, responseCache.size - maxSize);

  entries.forEach(([key]) => responseCache.delete(key));
  console.log(`[Cache] Pruned ${entries.length} entries (new size: ${responseCache.size})`);
}
