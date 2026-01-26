/**
 * Thumbnail Manager - Coordinates WASM extraction and sprite loading
 */

import type { KimochiPlayer } from '../core/KimochiPlayer';
import type { ThumbnailConfig, ThumbnailData } from '../core/types';
import { ThumbnailCache } from './ThumbnailCache';
import { WasmExtractor } from './WasmExtractor';
import { SpriteLoader } from './SpriteLoader';

export class ThumbnailManager {
  private player: KimochiPlayer;
  private config: ThumbnailConfig;
  private cache: ThumbnailCache;
  private wasmExtractor: WasmExtractor | null = null;
  private spriteLoader: SpriteLoader | null = null;
  private isInitialized = false;
  private pendingInit: Promise<void> | null = null;
  private useSprites = false;

  constructor(player: KimochiPlayer, config: ThumbnailConfig) {
    this.player = player;
    const defaults = {
      useWasm: true,
      cacheSize: 50,
      width: 160,
      height: 90,
    };
    this.config = {
      ...defaults,
      ...config,
    };

    this.cache = new ThumbnailCache(this.config.cacheSize);

    // Listen for source changes
    this.player.on('sourcechange', this.handleSourceChange.bind(this));
  }

  /**
   * Initialize the appropriate thumbnail source
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.pendingInit) return this.pendingInit;

    this.pendingInit = this.doInitialize();
    await this.pendingInit;
    this.pendingInit = null;
  }

  private async doInitialize(): Promise<void> {
    const state = this.player.getState();

    // Clear previous data
    this.cache.clear();
    this.useSprites = false;

    // For HLS with sprite URL, use sprite loader
    if (this.config.vttUrl || (state.sourceType === 'hls' && this.config.spriteUrl)) {
      try {
        this.spriteLoader = new SpriteLoader({
          baseUrl: this.getBaseUrl(state.src),
        });

        const vttUrl = this.config.vttUrl || this.config.spriteUrl!;
        await this.spriteLoader.load(vttUrl);
        this.useSprites = true;
        this.isInitialized = true;
        return;
      } catch (error) {
        console.warn('[ThumbnailManager] Sprite loading failed, falling back to WASM:', error);
      }
    }

    // Use WASM extraction for MP4/WebM
    if (this.config.useWasm && WasmExtractor.isSupported()) {
      try {
        this.wasmExtractor = new WasmExtractor({
          width: this.config.width,
          height: this.config.height,
        });

        // Don't initialize WASM until first use (lazy loading)
        this.wasmExtractor.setVideoUrl(state.src);
        this.isInitialized = true;
      } catch (error) {
        console.warn('[ThumbnailManager] WASM extraction not available:', error);
      }
    }

    this.isInitialized = true;
  }

  /**
   * Handle source change events
   */
  private handleSourceChange(data: { src: string; type: string }): void {
    // Reset state for new source
    this.isInitialized = false;
    this.cache.clear();

    if (this.wasmExtractor) {
      this.wasmExtractor.setVideoUrl(data.src);
    }

    if (this.spriteLoader) {
      this.spriteLoader.clear();
    }
  }

  /**
   * Get thumbnail for a specific time
   */
  async getThumbnail(time: number): Promise<ThumbnailData | null> {
    if (!this.config.enabled) {
      return null;
    }

    // Initialize on first use
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check cache first
    const cached = this.cache.get(time);
    if (cached) {
      return cached;
    }

    // Get from appropriate source
    let thumbnail: ThumbnailData | null = null;

    if (this.useSprites && this.spriteLoader?.isReady()) {
      thumbnail = this.spriteLoader.getThumbnail(time);
    } else if (this.wasmExtractor) {
      try {
        thumbnail = await this.wasmExtractor.extract(time);
      } catch (error) {
        console.warn('[ThumbnailManager] Failed to extract thumbnail:', error);
        return null;
      }
    }

    // Cache the result
    if (thumbnail) {
      this.cache.set(time, thumbnail);
    }

    return thumbnail;
  }

  /**
   * Preload thumbnails for a range of times
   */
  async preload(startTime: number, endTime: number, interval = 10): Promise<void> {
    if (!this.config.enabled) return;

    const times: number[] = [];
    for (let t = startTime; t <= endTime; t += interval) {
      times.push(t);
    }

    // Use cache's preload method
    await this.cache.preload(times, (time) => this.getThumbnail(time) as Promise<ThumbnailData>);
  }

  /**
   * Get base URL from video source
   */
  private getBaseUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      pathParts.pop(); // Remove filename
      urlObj.pathname = pathParts.join('/') + '/';
      return urlObj.href;
    } catch {
      return '';
    }
  }

  /**
   * Clear all cached thumbnails
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size(),
      maxSize: this.config.cacheSize || 50,
    };
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.cache.clear();

    if (this.wasmExtractor) {
      this.wasmExtractor.destroy();
      this.wasmExtractor = null;
    }

    if (this.spriteLoader) {
      this.spriteLoader.clear();
      this.spriteLoader = null;
    }

    this.isInitialized = false;
  }
}
