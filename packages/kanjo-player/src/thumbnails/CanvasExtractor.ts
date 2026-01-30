/**
 * Canvas-based thumbnail extractor
 * Uses a hidden video element + canvas to extract frames
 * Works without ffmpeg.wasm or special server headers
 */

import type { ThumbnailData } from '../core/types';
import { JpegEncoder } from './encoder/JpegEncoder';

export interface CanvasExtractorOptions {
  /** Thumbnail width */
  width?: number;
  /** Thumbnail height */
  height?: number;
}

interface PendingExtraction {
  time: number;
  resolve: (data: ThumbnailData) => void;
  reject: (error: Error) => void;
}

export class CanvasExtractor {
  private options: Required<CanvasExtractorOptions>;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private videoUrl: string = '';
  private isReady = false;
  private pendingExtractions: PendingExtraction[] = [];
  private isProcessing = false;

  constructor(options: CanvasExtractorOptions = {}) {
    this.options = {
      width: options.width ?? 160,
      height: options.height ?? 90,
    };
  }

  /**
   * Check if canvas extraction is supported
   */
  static isSupported(): boolean {
    return (
      typeof document !== 'undefined' &&
      typeof HTMLCanvasElement !== 'undefined' &&
      typeof HTMLVideoElement !== 'undefined'
    );
  }

  /**
   * Set the video URL to extract thumbnails from
   */
  setVideoUrl(url: string): void {
    // Reset if URL changed
    if (this.videoUrl !== url) {
      this.cleanup();
      this.videoUrl = url;
      this.isReady = false;
    }
  }

  /**
   * Initialize the extractor with a video
   */
  private async initialize(): Promise<void> {
    if (this.isReady && this.video) return;

    return new Promise((resolve, reject) => {
      // Create hidden video element
      this.video = document.createElement('video');
      this.video.crossOrigin = 'anonymous';
      this.video.preload = 'metadata';
      this.video.muted = true;
      this.video.playsInline = true;

      // Hide it
      this.video.style.position = 'absolute';
      this.video.style.left = '-9999px';
      this.video.style.width = '1px';
      this.video.style.height = '1px';
      document.body.appendChild(this.video);

      // Create canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.options.width;
      this.canvas.height = this.options.height;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

      const onLoadedMetadata = () => {
        this.isReady = true;
        this.video?.removeEventListener('loadedmetadata', onLoadedMetadata);
        this.video?.removeEventListener('error', onError);
        resolve();
      };

      const onError = () => {
        this.video?.removeEventListener('loadedmetadata', onLoadedMetadata);
        this.video?.removeEventListener('error', onError);
        reject(new Error('Failed to load video for thumbnail extraction'));
      };

      this.video.addEventListener('loadedmetadata', onLoadedMetadata);
      this.video.addEventListener('error', onError);

      this.video.src = this.videoUrl;
    });
  }

  /**
   * Extract a thumbnail at the specified time
   */
  async extract(time: number): Promise<ThumbnailData> {
    if (!this.videoUrl) {
      throw new Error('Video URL not set');
    }

    // Queue the extraction
    return new Promise((resolve, reject) => {
      this.pendingExtractions.push({ time, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the extraction queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.pendingExtractions.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.pendingExtractions.length > 0) {
      const extraction = this.pendingExtractions.shift()!;

      try {
        const result = await this.extractFrame(extraction.time);
        extraction.resolve(result);
      } catch (error) {
        extraction.reject(error as Error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Capture the current frame to a data URL
   */
  private async captureFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    time: number
  ): Promise<ThumbnailData> {
    // Calculate dimensions maintaining aspect ratio
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = canvas.width / canvas.height;

    let sx = 0,
      sy = 0,
      sw = video.videoWidth,
      sh = video.videoHeight;

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
   * Extract a single frame
   */
  private async extractFrame(time: number): Promise<ThumbnailData> {
    // Initialize if needed
    if (!this.isReady) {
      await this.initialize();
    }

    if (!this.video || !this.canvas || !this.ctx) {
      throw new Error('Extractor not initialized');
    }

    const video = this.video;
    const canvas = this.canvas;
    const ctx = this.ctx;

    // Clamp time to valid range
    const seekTime = Math.max(0, Math.min(time, video.duration || 0));

    return new Promise((resolve, reject) => {
      const onSeeked = async () => {
        video.removeEventListener('seeked', wrappedOnSeeked);
        video.removeEventListener('error', onError);

        try {
          const result = await this.captureFrame(video, canvas, ctx, seekTime);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to capture frame: ${error}`));
        }
      };

      const onError = () => {
        video.removeEventListener('seeked', wrappedOnSeeked);
        video.removeEventListener('error', onError);
        reject(new Error('Failed to seek video'));
      };

      // Timeout in case seek doesn't complete
      const timeout = setTimeout(() => {
        video.removeEventListener('seeked', wrappedOnSeeked);
        video.removeEventListener('error', onError);
        reject(new Error('Thumbnail extraction timeout'));
      }, 5000);

      const wrappedOnSeeked = () => {
        clearTimeout(timeout);
        onSeeked();
      };

      video.addEventListener('seeked', wrappedOnSeeked);
      video.addEventListener('error', onError);

      // Seek to the target time
      video.currentTime = seekTime;
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.video) {
      this.video.pause();
      this.video.src = '';
      this.video.remove();
      this.video = null;
    }
    this.canvas = null;
    this.ctx = null;
    this.isReady = false;
  }

  /**
   * Destroy and release all resources
   */
  destroy(): void {
    // Reject pending extractions
    this.pendingExtractions.forEach((p) => {
      p.reject(new Error('Extractor destroyed'));
    });
    this.pendingExtractions = [];

    this.cleanup();
  }
}
