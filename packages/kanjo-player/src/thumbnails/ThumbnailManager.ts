/**
 * Thumbnail Manager - Coordinates extraction methods
 * - Canvas extraction for MP4/WebM
 * - HLS segment extraction for HLS streams
 * - Sprite sheets for pre-generated thumbnails
 */

import type { KanjoPlayer } from '../core/KanjoPlayer';
import type { ThumbnailConfig, ThumbnailData } from '../core/types';
import { ThumbnailCache } from './ThumbnailCache';
import { CanvasExtractor } from './CanvasExtractor';
import { SpriteLoader } from './SpriteLoader';

export class ThumbnailManager {
  private player: KanjoPlayer;
  private config: ThumbnailConfig;
  private cache: ThumbnailCache;
  private canvasExtractor: CanvasExtractor | null = null;
  private hlsExtractor: unknown = null; // Lazy loaded
  private spriteLoader: SpriteLoader | null = null;
  private isInitialized = false;
  private pendingInit: Promise<void> | null = null;
  private useSprites = false;
  private useHls = false;

  constructor(player: KanjoPlayer, config: ThumbnailConfig) {
    this.player = player;
    const defaults = {
      useWasm: false,
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
    this.useHls = false;

    // For HLS with sprite URL, use sprite loader (preferred)
    if (this.config.vttUrl || this.config.spriteUrl) {
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
        console.warn('[ThumbnailManager] Sprite loading failed, trying other methods:', error);
      }
    }

    // For HLS streams without sprites, use HLS segment extraction
    if (state.sourceType === 'hls') {
      try {
        const { HlsExtractor } = await import('./HlsExtractor');

        if (HlsExtractor.isSupported()) {
          this.hlsExtractor = new HlsExtractor({
            width: this.config.width,
            height: this.config.height,
          });

          (this.hlsExtractor as { setVideoUrl: (url: string) => void }).setVideoUrl(state.src);
          this.useHls = true;
          this.isInitialized = true;
          return;
        }
      } catch (error) {
        console.warn('[ThumbnailManager] HLS extraction not available:', error);
      }
    }

    // Use Canvas extraction for MP4/WebM
    if (CanvasExtractor.isSupported()) {
      try {
        this.canvasExtractor = new CanvasExtractor({
          width: this.config.width,
          height: this.config.height,
        });

        this.canvasExtractor.setVideoUrl(state.src);
        this.isInitialized = true;
      } catch (error) {
        console.warn('[ThumbnailManager] Canvas extraction not available:', error);
      }
    }

    this.isInitialized = true;
  }

  /**
   * Handle source change events
   */
  private handleSourceChange(_data: { src: string; type: string }): void {
    // Reset state for new source
    this.isInitialized = false;
    this.useSprites = false;
    this.useHls = false;
    this.cache.clear();

    // Cleanup extractors
    if (this.canvasExtractor) {
      this.canvasExtractor.destroy();
      this.canvasExtractor = null;
    }

    if (this.hlsExtractor) {
      (this.hlsExtractor as { destroy: () => void }).destroy();
      this.hlsExtractor = null;
    }

    if (this.spriteLoader) {
      this.spriteLoader.clear();
      this.spriteLoader = null;
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

    try {
      if (this.useSprites && this.spriteLoader?.isReady()) {
        thumbnail = this.spriteLoader.getThumbnail(time);
      } else if (this.useHls && this.hlsExtractor) {
        thumbnail = await (this.hlsExtractor as { extract: (time: number) => Promise<ThumbnailData> }).extract(time);
      } else if (this.canvasExtractor) {
        thumbnail = await this.canvasExtractor.extract(time);
      }
    } catch (error) {
      console.warn('[ThumbnailManager] Failed to extract thumbnail:', error);
      return null;
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

    if (this.canvasExtractor) {
      this.canvasExtractor.destroy();
      this.canvasExtractor = null;
    }

    if (this.hlsExtractor) {
      (this.hlsExtractor as { destroy: () => void }).destroy();
      this.hlsExtractor = null;
    }

    if (this.spriteLoader) {
      this.spriteLoader.clear();
      this.spriteLoader = null;
    }

    this.isInitialized = false;
  }
}
