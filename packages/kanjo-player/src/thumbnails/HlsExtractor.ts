/**
 * HLS-aware thumbnail extractor
 * Uses a separate HLS.js instance optimized for fast thumbnail extraction
 */

import type { ThumbnailData } from '../core/types';
import { JpegEncoder } from './encoder/JpegEncoder';

export interface HlsExtractorOptions {
  width?: number;
  height?: number;
  /** Number of thumbnails to pre-buffer (distributed evenly across duration) */
  prebufferCount?: number;
}

interface PendingExtraction {
  time: number;
  resolve: (data: ThumbnailData) => void;
  reject: (error: Error) => void;
}

export class HlsExtractor {
  private options: Required<HlsExtractorOptions>;
  private hlsUrl: string = '';
  private hls: unknown = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private pendingExtractions: PendingExtraction[] = [];
  private isProcessing = false;
  private lastExtractedTime = -1;
  private duration = 0;

  // Pre-buffered thumbnails cache
  private thumbnailCache: Map<number, ThumbnailData> = new Map();
  private isPrebuffering = false;

  constructor(options: HlsExtractorOptions = {}) {
    this.options = {
      width: options.width ?? 160,
      height: options.height ?? 90,
      prebufferCount: options.prebufferCount ?? 10, // Pre-buffer 10 thumbnails evenly distributed
    };
  }

  /**
   * Check if HLS extraction is supported
   */
  static isSupported(): boolean {
    return typeof document !== 'undefined' &&
           typeof HTMLCanvasElement !== 'undefined' &&
           typeof HTMLVideoElement !== 'undefined';
  }

  /**
   * Set the HLS URL and optionally pre-initialize
   */
  setVideoUrl(url: string, preInit = true): void {
    if (this.hlsUrl !== url) {
      this.destroy();
      this.hlsUrl = url;
      this.isInitialized = false;

      // Pre-initialize in background
      if (preInit) {
        this.initialize().catch(() => {
          // Silently fail pre-init, will retry on first extract
        });
      }
    }
  }

  /**
   * Initialize HLS.js and video element
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.isInitializing && this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = this.doInitialize();

    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  private async doInitialize(): Promise<void> {
    if (!this.hlsUrl) {
      throw new Error('HLS URL not set');
    }

    // Dynamically import HLS.js
    const Hls = (await import('hls.js')).default;

    if (!Hls.isSupported()) {
      throw new Error('HLS.js not supported');
    }

    // Create hidden video element
    this.video = document.createElement('video');
    this.video.crossOrigin = 'anonymous';
    this.video.preload = 'auto';
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.style.position = 'absolute';
    this.video.style.left = '-9999px';
    this.video.style.width = '320px';
    this.video.style.height = '180px';
    this.video.style.opacity = '0';
    this.video.style.pointerEvents = 'none';
    document.body.appendChild(this.video);

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    // Create HLS instance optimized for thumbnails
    this.hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      // Use smallest buffer for faster startup
      maxBufferLength: 5,
      maxMaxBufferLength: 10,
      maxBufferSize: 5 * 1024 * 1024, // 5MB
      maxBufferHole: 0.5,
      // Start with lowest quality for faster loading
      startLevel: 0,
      // Prefer lower quality for thumbnails
      capLevelToPlayerSize: true,
      // Faster ABR switching
      abrEwmaDefaultEstimate: 500000, // 500kbps default
    });

    const hlsInstance = this.hls as {
      loadSource: (url: string) => void;
      attachMedia: (el: HTMLVideoElement) => void;
      on: (event: string, handler: (event: string, data: unknown) => void) => void;
      off: (event: string, handler: (event: string, data: unknown) => void) => void;
      destroy: () => void;
      currentLevel: number;
      levels: Array<{ height: number; bitrate: number }>;
    };

    return new Promise<void>((resolve, reject) => {
      const onManifestParsed = () => {
        hlsInstance.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
        hlsInstance.off(Hls.Events.ERROR, onError);

        // Force lowest quality level for thumbnails
        if (hlsInstance.levels && hlsInstance.levels.length > 0) {
          // Find the lowest quality level
          let lowestIdx = 0;
          let lowestBitrate = Infinity;
          hlsInstance.levels.forEach((level, idx) => {
            if (level.bitrate < lowestBitrate) {
              lowestBitrate = level.bitrate;
              lowestIdx = idx;
            }
          });
          hlsInstance.currentLevel = lowestIdx;
        }

        this.isInitialized = true;
        resolve();

        // Get duration and start pre-buffering
        if (this.video) {
          this.video.addEventListener('loadedmetadata', () => {
            this.duration = this.video?.duration || 0;
            this.startPrebuffering();
          }, { once: true });
        }
      };

      const onError = (_event: string, data: unknown) => {
        const errorData = data as { fatal?: boolean; details?: string };
        if (errorData.fatal) {
          hlsInstance.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
          hlsInstance.off(Hls.Events.ERROR, onError);
          reject(new Error(`HLS error: ${errorData.details}`));
        }
      };

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
      hlsInstance.on(Hls.Events.ERROR, onError);

      // Wait for MEDIA_ATTACHED before loading source to prevent ORB issues
      hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
        hlsInstance.loadSource(this.hlsUrl);
      });
      hlsInstance.attachMedia(this.video!);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.isInitialized) {
          hlsInstance.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
          hlsInstance.off(Hls.Events.ERROR, onError);
          reject(new Error('HLS manifest loading timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Pre-buffer thumbnails distributed evenly across the video
   */
  private async startPrebuffering(): Promise<void> {
    if (this.isPrebuffering || this.duration <= 0) return;
    this.isPrebuffering = true;

    const count = this.options.prebufferCount;

    // Calculate interval to distribute thumbnails evenly across duration
    // For 90min video with 10 thumbnails = one every 9 minutes
    const interval = this.duration / (count + 1);

    // Generate evenly distributed timestamps
    const times: number[] = [];
    for (let i = 1; i <= count; i++) {
      const time = Math.floor(interval * i);
      if (time < this.duration) {
        times.push(time);
      }
    }

    // Also add the start (0s) as it's commonly requested
    times.unshift(0);

    // Pre-buffer in background with low priority
    for (const time of times) {
      // Stop if extractor was destroyed
      if (!this.video) break;

      try {
        // Use requestIdleCallback if available for non-blocking prebuffer
        if ('requestIdleCallback' in window) {
          await new Promise<void>(resolve => {
            (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
              .requestIdleCallback(async () => {
                if (!this.thumbnailCache.has(time) && this.video) {
                  try {
                    const thumb = await this.extractFrameInternal(time);
                    this.thumbnailCache.set(time, thumb);
                  } catch {
                    // Ignore prebuffer errors
                  }
                }
                resolve();
              }, { timeout: 5000 }); // Don't wait forever
          });
        } else {
          // Fallback: small delay between prebuffers
          await new Promise(r => setTimeout(r, 200));
          if (!this.thumbnailCache.has(time) && this.video) {
            const thumb = await this.extractFrameInternal(time);
            this.thumbnailCache.set(time, thumb);
          }
        }
      } catch {
        // Continue with next position on error
      }
    }

    this.isPrebuffering = false;
  }

  /**
   * Extract a thumbnail at the specified time
   */
  async extract(time: number): Promise<ThumbnailData> {
    if (!this.hlsUrl) {
      throw new Error('HLS URL not set');
    }

    // Check cache first (including nearby cached thumbnails)
    const cached = this.findCachedThumbnail(time);
    if (cached) {
      return cached;
    }

    // Queue the extraction
    return new Promise((resolve, reject) => {
      this.pendingExtractions.push({ time, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Find a cached thumbnail near the requested time
   */
  private findCachedThumbnail(time: number): ThumbnailData | null {
    // Exact match
    if (this.thumbnailCache.has(time)) {
      return this.thumbnailCache.get(time)!;
    }

    // Find closest cached thumbnail within 5 seconds
    let closest: ThumbnailData | null = null;
    let closestDelta = 5;

    this.thumbnailCache.forEach((thumb, cachedTime) => {
      const delta = Math.abs(cachedTime - time);
      if (delta < closestDelta) {
        closestDelta = delta;
        closest = thumb;
      }
    });

    return closest;
  }

  /**
   * Process extractions sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.pendingExtractions.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.pendingExtractions.length > 0) {
      const extraction = this.pendingExtractions.shift()!;

      try {
        // Initialize if needed
        if (!this.isInitialized) {
          await this.initialize();
        }

        const result = await this.extractFrameInternal(extraction.time);

        // Cache the result
        this.thumbnailCache.set(extraction.time, result);

        extraction.resolve(result);
      } catch (error) {
        extraction.reject(error as Error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Internal frame extraction
   */
  private async extractFrameInternal(time: number): Promise<ThumbnailData> {
    if (!this.video || !this.canvas || !this.ctx) {
      throw new Error('Extractor not properly initialized');
    }

    const video = this.video;
    const canvas = this.canvas;
    const ctx = this.ctx;

    // Skip if we just extracted this time
    if (Math.abs(time - this.lastExtractedTime) < 0.5) {
      return await this.captureFrame(video, canvas, ctx, time);
    }

    return new Promise((resolve, reject) => {
      let resolved = false;

      const cleanup = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
      };

      const attemptCapture = () => {
        if (resolved) return;

        // Check if video has data
        if (video.readyState >= 2 && video.videoWidth > 0) {
          resolved = true;
          cleanup();

          requestAnimationFrame(async () => {
            try {
              this.lastExtractedTime = time;
              const result = await this.captureFrame(video, canvas, ctx, time);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });
        }
      };

      const onSeeked = () => attemptCapture();
      const onCanPlay = () => attemptCapture();

      const onError = (e: Event) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(new Error(`Video seek error: ${(e as ErrorEvent).message || 'unknown'}`));
      };

      // Timeout - but try to capture anyway
      const timeout = setTimeout(async () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          try {
            if (video.videoWidth > 0) {
              const result = await this.captureFrame(video, canvas, ctx, time);
              resolve(result);
            } else {
              reject(new Error('Thumbnail extraction timeout'));
            }
          } catch {
            reject(new Error('Thumbnail extraction timeout'));
          }
        }
      }, 3000); // Reduced timeout

      video.addEventListener('seeked', () => {
        clearTimeout(timeout);
        onSeeked();
      });
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onError);

      // Seek to target time
      video.currentTime = Math.max(0, time);
    });
  }

  /**
   * Capture current frame to canvas
   */
  private async captureFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    time: number
  ): Promise<ThumbnailData> {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error('Video has no valid dimensions');
    }

    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = canvas.width / canvas.height;

    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;

    if (videoAspect > canvasAspect) {
      sw = video.videoHeight * canvasAspect;
      sx = (video.videoWidth - sw) / 2;
    } else {
      sh = video.videoWidth / canvasAspect;
      sy = (video.videoHeight - sh) / 2;
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    // Get image data and encode with WASM (falls back to toDataURL if unavailable)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const url = await JpegEncoder.getInstance().encode(imageData, 70);

    return {
      url,
      time,
      width: canvas.width,
      height: canvas.height,
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; times: number[] } {
    return {
      size: this.thumbnailCache.size,
      times: Array.from(this.thumbnailCache.keys()).sort((a, b) => a - b),
    };
  }

  /**
   * Destroy and release all resources
   */
  destroy(): void {
    this.pendingExtractions.forEach(p => {
      p.reject(new Error('Extractor destroyed'));
    });
    this.pendingExtractions = [];
    this.thumbnailCache.clear();

    if (this.hls) {
      (this.hls as { destroy: () => void }).destroy();
      this.hls = null;
    }

    if (this.video) {
      this.video.pause();
      this.video.src = '';
      this.video.remove();
      this.video = null;
    }

    this.canvas = null;
    this.ctx = null;
    this.isInitialized = false;
    this.isInitializing = false;
    this.isPrebuffering = false;
    this.lastExtractedTime = -1;
    this.duration = 0;
  }
}
