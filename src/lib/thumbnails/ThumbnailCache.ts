/**
 * LRU Cache for thumbnails
 */

import type { ThumbnailData } from '../core/types';

interface CacheEntry {
  data: ThumbnailData;
  lastAccess: number;
}

export class ThumbnailCache {
  private cache: Map<number, CacheEntry> = new Map();
  private maxSize: number;
  private tolerance: number;

  /**
   * @param maxSize Maximum number of thumbnails to cache
   * @param tolerance Time tolerance in seconds for cache hits
   */
  constructor(maxSize = 50, tolerance = 0.5) {
    this.maxSize = maxSize;
    this.tolerance = tolerance;
  }

  /**
   * Get a thumbnail from cache
   * @param time Time in seconds to look up
   * @returns Cached thumbnail or null if not found
   */
  get(time: number): ThumbnailData | null {
    // Look for exact or close match
    for (const [cachedTime, entry] of this.cache.entries()) {
      if (Math.abs(cachedTime - time) <= this.tolerance) {
        // Update last access time
        entry.lastAccess = Date.now();
        return entry.data;
      }
    }
    return null;
  }

  /**
   * Store a thumbnail in cache
   * @param time Time in seconds
   * @param data Thumbnail data
   */
  set(time: number, data: ThumbnailData): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(time, {
      data,
      lastAccess: Date.now(),
    });
  }

  /**
   * Check if a thumbnail is cached
   */
  has(time: number): boolean {
    return this.get(time) !== null;
  }

  /**
   * Remove a specific entry
   */
  delete(time: number): boolean {
    const entry = this.cache.get(time);
    if (entry) {
      // Revoke object URL if it's a blob URL
      if (entry.data.url.startsWith('blob:')) {
        URL.revokeObjectURL(entry.data.url);
      }
      return this.cache.delete(time);
    }
    return false;
  }

  /**
   * Clear all cached thumbnails
   */
  clear(): void {
    // Revoke all blob URLs
    for (const entry of this.cache.values()) {
      if (entry.data.url.startsWith('blob:')) {
        URL.revokeObjectURL(entry.data.url);
      }
    }
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Evict the least recently used entry
   */
  private evictOldest(): void {
    let oldestTime = Infinity;
    let oldestKey: number | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.delete(oldestKey);
    }
  }

  /**
   * Preload thumbnails for a range of times
   */
  async preload(
    times: number[],
    loader: (time: number) => Promise<ThumbnailData>
  ): Promise<void> {
    const uncached = times.filter((time) => !this.has(time));

    await Promise.allSettled(
      uncached.map(async (time) => {
        try {
          const data = await loader(time);
          this.set(time, data);
        } catch {
          // Ignore preload errors
        }
      })
    );
  }
}
