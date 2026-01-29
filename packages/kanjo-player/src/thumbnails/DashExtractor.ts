/**
 * DASH-aware thumbnail extractor
 * Uses a separate dash.js instance optimized for fast thumbnail extraction
 */

import type { ThumbnailData } from '../core/types';
import type { MediaPlayerClass } from 'dashjs';
import { JpegEncoder } from './encoder/JpegEncoder';

export interface DashExtractorOptions {
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

// Re-export for internal use
type DashInstance = MediaPlayerClass;

interface DashJsStatic {
  MediaPlayer(): {
    create(): DashInstance;
  };
  Debug?: {
    LOG_LEVEL_NONE: number;
  };
}

export class DashExtractor {
  private options: Required<DashExtractorOptions>;
  private dashUrl: string = '';
  private dash: DashInstance | null = null;
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

  constructor(options: DashExtractorOptions = {}) {
    this.options = {
      width: options.width ?? 160,
      height: options.height ?? 90,
      prebufferCount: options.prebufferCount ?? 10,
    };
  }

  /**
   * Check if DASH extraction is supported
   */
  static isSupported(): boolean {
    return typeof document !== 'undefined' &&
           typeof HTMLCanvasElement !== 'undefined' &&
           typeof HTMLVideoElement !== 'undefined';
  }

  /**
   * Set the DASH URL and optionally pre-initialize
   */
  setVideoUrl(url: string, preInit = true): void {
    if (this.dashUrl !== url) {
      this.destroy();
      this.dashUrl = url;
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
   * Initialize dash.js and video element
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
    if (!this.dashUrl) {
      throw new Error('DASH URL not set');
    }

    // Dynamically import dash.js
    let dashjs: DashJsStatic;
    try {
      const dashjsModule = await import('dashjs');
      const moduleAny = dashjsModule as Record<string, unknown>;

      // Handle different export structures from various bundlers:
      // 1. Standard ES module: { default: { MediaPlayer: fn } }
      if (moduleAny.default && typeof (moduleAny.default as DashJsStatic).MediaPlayer === 'function') {
        dashjs = moduleAny.default as DashJsStatic;
      }
      // 2. Named export: { MediaPlayer: fn }
      else if (typeof (moduleAny as unknown as DashJsStatic).MediaPlayer === 'function') {
        dashjs = moduleAny as unknown as DashJsStatic;
      }
      // 3. UMD bundle returns factory result directly: { default: { create: fn } }
      else if (moduleAny.default && typeof (moduleAny.default as { create?: () => unknown }).create === 'function') {
        // Wrap the factory result to match expected interface
        dashjs = {
          MediaPlayer: () => moduleAny.default as unknown as { create(): DashInstance },
          Debug: { LOG_LEVEL_NONE: 0 },
        } as DashJsStatic;
      }
      else {
        throw new Error('dashjs module structure not recognized');
      }
    } catch (e) {
      throw new Error(`dash.js not available: ${e instanceof Error ? e.message : 'Unknown error'}`);
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

    // Create dash.js instance optimized for thumbnails
    const factory = dashjs.MediaPlayer();
    this.dash = factory.create();

    // Verify we have a proper MediaPlayer instance
    if (!this.dash || typeof this.dash.initialize !== 'function') {
      throw new Error('Failed to create dash.js MediaPlayer instance');
    }

    // Configure for thumbnail extraction (minimal buffering, lowest quality)
    if (typeof this.dash.updateSettings === 'function') {
      this.dash.updateSettings({
        debug: {
          logLevel: dashjs.Debug?.LOG_LEVEL_NONE ?? 0,
        },
        streaming: {
          buffer: {
            bufferTimeAtTopQuality: 5,
            bufferTimeAtTopQualityLongForm: 5,
            initialBufferLevel: 1,
            stableBufferTime: 2,
          },
          abr: {
            autoSwitchBitrate: {
              video: false,
              audio: false,
            },
          },
        },
      });
    }

    return new Promise<void>((resolve, reject) => {
      if (!this.dash || !this.video) {
        reject(new Error('DASH player not initialized'));
        return;
      }

      const onStreamInitialized = () => {
        if (!this.dash) return;
        this.dash.off('streamInitialized', onStreamInitialized);
        this.dash.off('error', onError);

        // Force lowest quality level for thumbnails
        if (typeof this.dash.getBitrateInfoListFor === 'function') {
          const qualities = this.dash.getBitrateInfoListFor('video');
          if (qualities && qualities.length > 0) {
            let lowestIdx = 0;
            let lowestBitrate = Infinity;
            qualities.forEach((q) => {
              if (q.bitrate < lowestBitrate) {
                lowestBitrate = q.bitrate;
                lowestIdx = q.qualityIndex;
              }
            });
            if (typeof this.dash.setAutoSwitchQualityFor === 'function') {
              this.dash.setAutoSwitchQualityFor('video', false);
            }
            if (typeof this.dash.setQualityFor === 'function') {
              this.dash.setQualityFor('video', lowestIdx);
            }
          }
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

      const onError = (...args: unknown[]) => {
        const data = args[0] as { error?: { message?: string } };
        if (this.dash) {
          this.dash.off('streamInitialized', onStreamInitialized);
          this.dash.off('error', onError);
        }
        reject(new Error(`DASH error: ${data.error?.message || 'Unknown'}`));
      };

      this.dash.on('streamInitialized', onStreamInitialized);
      this.dash.on('error', onError);

      // Initialize player
      this.dash.initialize(this.video, this.dashUrl, false);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.isInitialized) {
          if (this.dash) {
            this.dash.off('streamInitialized', onStreamInitialized);
            this.dash.off('error', onError);
          }
          reject(new Error('DASH manifest loading timeout'));
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
    const interval = this.duration / (count + 1);

    const times: number[] = [0]; // Start with 0
    for (let i = 1; i <= count; i++) {
      const time = Math.floor(interval * i);
      if (time < this.duration) {
        times.push(time);
      }
    }

    // Pre-buffer in background with low priority
    for (const time of times) {
      if (!this.video) break;

      try {
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
              }, { timeout: 5000 });
          });
        } else {
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
    if (!this.dashUrl) {
      throw new Error('DASH URL not set');
    }

    // Check cache first
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
        if (!this.isInitialized) {
          await this.initialize();
        }

        const result = await this.extractFrameInternal(extraction.time);
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
      }, 3000);

      video.addEventListener('seeked', () => {
        clearTimeout(timeout);
        onSeeked();
      });
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onError);

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

    if (this.dash) {
      try {
        this.dash.reset();
        this.dash.destroy();
      } catch {
        // Ignore destroy errors
      }
      this.dash = null;
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
