/**
 * WASM-based thumbnail extractor using FFmpeg
 * Note: In library mode, the worker is not bundled. Users need to set up
 * SharedArrayBuffer headers and ensure CORS is properly configured.
 */

import type { ThumbnailData } from '../core/types';
import type { WorkerResponse, ExtractCompleteMessage } from './worker/messages';
import { generateMessageId } from './worker/messages';

export interface WasmExtractorOptions {
  /** Thumbnail width */
  width?: number;
  /** Thumbnail height */
  height?: number;
  /** Custom worker URL (optional) */
  workerUrl?: string;
}

interface PendingRequest {
  resolve: (data: ThumbnailData) => void;
  reject: (error: Error) => void;
  time: number;
}

// Inline worker code as a blob for library compatibility
function createWorkerBlob(): Blob {
  const workerCode = `
    let ffmpeg = null;
    let isLoaded = false;
    let lastActiveTime = Date.now();
    const INACTIVITY_TIMEOUT = 30000;

    function postMessage(message) {
      self.postMessage(message);
    }

    async function initFFmpeg(messageId) {
      if (isLoaded && ffmpeg) {
        postMessage({ type: 'INIT_COMPLETE', id: messageId });
        return;
      }

      try {
        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
        ffmpeg = new FFmpeg();
        ffmpeg.on('log', (data) => console.debug('[FFmpeg]', data.message));
        await ffmpeg.load();
        isLoaded = true;
        lastActiveTime = Date.now();
        postMessage({ type: 'INIT_COMPLETE', id: messageId });
        startInactivityTimer();
      } catch (error) {
        postMessage({
          type: 'INIT_ERROR',
          id: messageId,
          payload: { error: error.message || 'Failed to initialize FFmpeg' },
        });
      }
    }

    async function extractThumbnail(messageId, payload) {
      const { videoUrl, time, width, height } = payload;
      lastActiveTime = Date.now();

      if (!ffmpeg || !isLoaded) {
        postMessage({
          type: 'EXTRACT_ERROR',
          id: messageId,
          payload: { time, error: 'FFmpeg not initialized' },
        });
        return;
      }

      try {
        const { fetchFile } = await import('@ffmpeg/util');
        const videoData = await fetchFile(videoUrl);
        const inputFileName = 'input.mp4';
        const outputFileName = 'thumbnail.jpg';

        await ffmpeg.writeFile(inputFileName, videoData);
        await ffmpeg.exec([
          '-ss', time.toString(),
          '-i', inputFileName,
          '-vframes', '1',
          '-vf', 'scale=' + width + ':' + height + ':force_original_aspect_ratio=decrease',
          '-f', 'image2',
          '-q:v', '2',
          outputFileName,
        ]);

        const thumbnailData = await ffmpeg.readFile(outputFileName);
        await ffmpeg.deleteFile(inputFileName);
        await ffmpeg.deleteFile(outputFileName);

        postMessage({
          type: 'EXTRACT_COMPLETE',
          id: messageId,
          payload: { time, imageData: thumbnailData.buffer, width, height },
        });
      } catch (error) {
        postMessage({
          type: 'EXTRACT_ERROR',
          id: messageId,
          payload: { time, error: error.message || 'Failed to extract thumbnail' },
        });
      }
    }

    function releaseFFmpeg(id) {
      if (ffmpeg) {
        ffmpeg.terminate();
        ffmpeg = null;
      }
      isLoaded = false;
      postMessage({ type: 'RELEASE_COMPLETE', id });
    }

    function startInactivityTimer() {
      const checkInactivity = () => {
        if (isLoaded && Date.now() - lastActiveTime > INACTIVITY_TIMEOUT) {
          releaseFFmpeg('auto');
        } else if (isLoaded) {
          setTimeout(checkInactivity, 10000);
        }
      };
      setTimeout(checkInactivity, INACTIVITY_TIMEOUT);
    }

    self.onmessage = async (event) => {
      const message = event.data;
      switch (message.type) {
        case 'INIT':
          await initFFmpeg(message.id);
          break;
        case 'EXTRACT':
          await extractThumbnail(message.id, message.payload);
          break;
        case 'RELEASE':
          releaseFFmpeg(message.id);
          break;
      }
    };
  `;

  return new Blob([workerCode], { type: 'application/javascript' });
}

export class WasmExtractor {
  private worker: Worker | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private initPromise: Promise<void> | null = null;
  private options: Required<Omit<WasmExtractorOptions, 'workerUrl'>> & { workerUrl?: string };
  private videoUrl: string = '';

  constructor(options: WasmExtractorOptions = {}) {
    this.options = {
      width: options.width ?? 160,
      height: options.height ?? 90,
      workerUrl: options.workerUrl,
    };
  }

  /**
   * Check if WASM extraction is supported
   */
  static isSupported(): boolean {
    return (
      typeof Worker !== 'undefined' &&
      typeof WebAssembly !== 'undefined'
    );
  }

  /**
   * Initialize the WASM extractor
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        // Create worker from blob or URL
        if (this.options.workerUrl) {
          this.worker = new Worker(this.options.workerUrl, { type: 'module' });
        } else {
          const blob = createWorkerBlob();
          const url = URL.createObjectURL(blob);
          this.worker = new Worker(url, { type: 'module' });
        }

        // Handle worker messages
        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (error) => {
          console.error('[WasmExtractor] Worker error:', error);
          reject(new Error('Worker initialization failed'));
        };

        // Send init message
        const initId = generateMessageId();

        const handleInit = (message: WorkerResponse) => {
          if (message.id !== initId) return;

          if (message.type === 'INIT_COMPLETE') {
            this.isInitialized = true;
            this.isInitializing = false;
            resolve();
          } else if (message.type === 'INIT_ERROR') {
            this.isInitializing = false;
            reject(new Error(message.payload?.error || 'Initialization failed'));
          }
        };

        // Temporarily override message handler for init
        const originalHandler = this.worker.onmessage;
        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          handleInit(event.data);
          if (this.isInitialized && originalHandler) {
            this.worker!.onmessage = originalHandler;
          }
        };

        this.worker.postMessage({
          type: 'INIT',
          id: initId,
          payload: {},
        });
      } catch (error) {
        this.isInitializing = false;
        reject(error);
      }
    });

    return this.initPromise;
  }

  /**
   * Set the video URL to extract thumbnails from
   */
  setVideoUrl(url: string): void {
    this.videoUrl = url;
  }

  /**
   * Extract a thumbnail at the specified time
   */
  async extract(time: number): Promise<ThumbnailData> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    if (!this.videoUrl) {
      throw new Error('Video URL not set');
    }

    return new Promise((resolve, reject) => {
      const id = generateMessageId();

      this.pendingRequests.set(id, { resolve, reject, time });

      this.worker!.postMessage({
        type: 'EXTRACT',
        id,
        payload: {
          videoUrl: this.videoUrl,
          time,
          width: this.options.width,
          height: this.options.height,
        },
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          pending.reject(new Error('Thumbnail extraction timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(message: WorkerResponse): void {
    const pending = this.pendingRequests.get(message.id);
    if (!pending) return;

    switch (message.type) {
      case 'EXTRACT_COMPLETE': {
        const payload = (message as ExtractCompleteMessage).payload;
        const blob = new Blob([payload.imageData], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);

        pending.resolve({
          url,
          time: payload.time,
          width: payload.width,
          height: payload.height,
        });
        this.pendingRequests.delete(message.id);
        break;
      }

      case 'EXTRACT_ERROR': {
        pending.reject(new Error(message.payload?.error || 'Extraction failed'));
        this.pendingRequests.delete(message.id);
        break;
      }

      case 'EXTRACT_PROGRESS': {
        // Could emit progress events here
        break;
      }
    }
  }

  /**
   * Release resources
   */
  destroy(): void {
    // Reject all pending requests
    this.pendingRequests.forEach((pending) => {
      pending.reject(new Error('Extractor destroyed'));
    });
    this.pendingRequests.clear();

    // Terminate worker
    if (this.worker) {
      this.worker.postMessage({
        type: 'RELEASE',
        id: generateMessageId(),
      });
      this.worker.terminate();
      this.worker = null;
    }

    this.isInitialized = false;
    this.isInitializing = false;
    this.initPromise = null;
  }
}
