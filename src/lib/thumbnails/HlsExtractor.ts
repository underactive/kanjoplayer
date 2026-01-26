/**
 * HLS-aware thumbnail extractor
 * Uses a separate HLS.js instance to seek and extract frames
 */

import type { ThumbnailData } from '../core/types';

export interface HlsExtractorOptions {
  width?: number;
  height?: number;
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

  constructor(options: HlsExtractorOptions = {}) {
    this.options = {
      width: options.width ?? 160,
      height: options.height ?? 90,
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
   * Set the HLS URL
   */
  setVideoUrl(url: string): void {
    if (this.hlsUrl !== url) {
      this.destroy();
      this.hlsUrl = url;
      this.isInitialized = false;
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
    this.ctx = this.canvas.getContext('2d');

    // Create HLS instance
    this.hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      // Optimize for seeking/thumbnails
      maxBufferLength: 10,
      maxMaxBufferLength: 30,
      maxBufferSize: 10 * 1024 * 1024, // 10MB
      maxBufferHole: 0.5,
    });

    const hlsInstance = this.hls as {
      loadSource: (url: string) => void;
      attachMedia: (el: HTMLVideoElement) => void;
      on: (event: string, handler: (event: string, data: unknown) => void) => void;
      off: (event: string, handler: (event: string, data: unknown) => void) => void;
      destroy: () => void;
    };

    return new Promise<void>((resolve, reject) => {
      const onManifestParsed = () => {
        hlsInstance.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
        hlsInstance.off(Hls.Events.ERROR, onError);
        this.isInitialized = true;
        resolve();
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

      hlsInstance.loadSource(this.hlsUrl);
      hlsInstance.attachMedia(this.video!);

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!this.isInitialized) {
          hlsInstance.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
          hlsInstance.off(Hls.Events.ERROR, onError);
          reject(new Error('HLS manifest loading timeout'));
        }
      }, 15000);
    });
  }

  /**
   * Extract a thumbnail at the specified time
   */
  async extract(time: number): Promise<ThumbnailData> {
    if (!this.hlsUrl) {
      throw new Error('HLS URL not set');
    }

    // Queue the extraction
    return new Promise((resolve, reject) => {
      this.pendingExtractions.push({ time, resolve, reject });
      this.processQueue();
    });
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

        const result = await this.extractFrame(extraction.time);
        extraction.resolve(result);
      } catch (error) {
        extraction.reject(error as Error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Extract a frame at the given time
   */
  private async extractFrame(time: number): Promise<ThumbnailData> {
    if (!this.video || !this.canvas || !this.ctx) {
      throw new Error('Extractor not properly initialized');
    }

    const video = this.video;
    const canvas = this.canvas;
    const ctx = this.ctx;

    // Skip if we just extracted this time
    if (Math.abs(time - this.lastExtractedTime) < 0.5) {
      // Return cached-ish result by just capturing current frame
      return this.captureFrame(video, canvas, ctx, time);
    }

    return new Promise((resolve, reject) => {
      let resolved = false;

      const cleanup = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
      };

      const onSeeked = () => {
        if (resolved) return;
        resolved = true;
        cleanup();

        // Small delay to ensure frame is rendered
        requestAnimationFrame(() => {
          try {
            this.lastExtractedTime = time;
            const result = this.captureFrame(video, canvas, ctx, time);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      };

      const onError = (e: Event) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(new Error(`Video seek error: ${(e as ErrorEvent).message || 'unknown'}`));
      };

      // Timeout
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          // Try to capture current frame anyway
          try {
            const result = this.captureFrame(video, canvas, ctx, time);
            resolve(result);
          } catch {
            reject(new Error('Thumbnail extraction timeout'));
          }
        }
      }, 5000);

      video.addEventListener('seeked', () => {
        clearTimeout(timeout);
        onSeeked();
      });
      video.addEventListener('error', onError);

      // Seek to target time
      video.currentTime = Math.max(0, time);
    });
  }

  /**
   * Capture current frame to canvas
   */
  private captureFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    time: number
  ): ThumbnailData {
    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error('Video has no valid dimensions');
    }

    // Calculate dimensions maintaining aspect ratio
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = canvas.width / canvas.height;

    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;

    if (videoAspect > canvasAspect) {
      // Video is wider - crop sides
      sw = video.videoHeight * canvasAspect;
      sx = (video.videoWidth - sw) / 2;
    } else {
      // Video is taller - crop top/bottom
      sh = video.videoWidth / canvasAspect;
      sy = (video.videoHeight - sh) / 2;
    }

    // Draw frame to canvas
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    // Get data URL
    const url = canvas.toDataURL('image/jpeg', 0.7);

    return {
      url,
      time,
      width: canvas.width,
      height: canvas.height,
    };
  }

  /**
   * Destroy and release all resources
   */
  destroy(): void {
    // Reject pending extractions
    this.pendingExtractions.forEach(p => {
      p.reject(new Error('Extractor destroyed'));
    });
    this.pendingExtractions = [];

    // Destroy HLS instance
    if (this.hls) {
      (this.hls as { destroy: () => void }).destroy();
      this.hls = null;
    }

    // Remove video element
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
    this.lastExtractedTime = -1;
  }
}
