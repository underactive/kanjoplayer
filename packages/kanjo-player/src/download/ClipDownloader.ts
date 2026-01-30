/**
 * Clip Downloader - Extract and download A/B loop segments
 * Supports both direct video files (MP4/WebM) and HLS streams
 */

import type { KanjoPlayer } from '../core/KanjoPlayer';
import type { WatermarkConfig } from '../core/types';

export type VideoCodecOption = 'auto' | 'h264' | 'vp9' | 'av1';

export interface ClipDownloaderOptions {
  /** Maximum clip duration in seconds (default: 30) */
  maxDuration?: number;
  /** Output format (default: mp4) */
  outputFormat?: 'mp4' | 'webm';
  /** Video quality preset (default: 'medium') */
  quality?: 'low' | 'medium' | 'high';
  /** Video codec for encoding (default: 'auto') */
  videoCodec?: VideoCodecOption;
  /** Watermark configuration */
  watermark?: WatermarkConfig;
}

export interface PrepareDownloadOptions {
  /** For DASH: quality index to download (from DashPlugin.getCurrentQuality()) */
  dashQualityIndex?: number;
}

export interface DownloadProgress {
  phase: 'initializing' | 'downloading' | 'processing' | 'encoding' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

type ProgressCallback = (progress: DownloadProgress) => void;

// Default configuration - easy to adjust
const DEFAULT_MAX_DURATION = 30; // seconds

// FFmpeg types
interface FFmpegInstance {
  load(options?: { coreURL?: string; wasmURL?: string }): Promise<void>;
  writeFile(path: string, data: Uint8Array | string): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  deleteFile(path: string): Promise<void>;
  exec(args: string[]): Promise<number>;
  on(
    event: 'log' | 'progress',
    callback: (data: { message?: string; progress?: number }) => void
  ): void;
  terminate(): void;
}

export class ClipDownloader {
  private player: KanjoPlayer;
  private options: Required<Omit<ClipDownloaderOptions, 'watermark'>> & {
    watermark?: WatermarkConfig;
  };
  private ffmpeg: FFmpegInstance | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private currentProgressCallback: ProgressCallback | null = null;
  private isCancelled = false;
  private isHlsExtraction = false;

  constructor(player: KanjoPlayer, options: ClipDownloaderOptions = {}) {
    this.player = player;
    this.options = {
      maxDuration: options.maxDuration ?? DEFAULT_MAX_DURATION,
      outputFormat: options.outputFormat ?? 'mp4',
      quality: options.quality ?? 'medium',
      videoCodec: options.videoCodec ?? 'auto',
      watermark: options.watermark,
    };
  }

  /**
   * Check if downloading is supported
   */
  static isSupported(): boolean {
    return typeof WebAssembly !== 'undefined' && typeof Blob !== 'undefined';
  }

  /**
   * Get the maximum allowed clip duration
   */
  getMaxDuration(): number {
    return this.options.maxDuration;
  }

  /**
   * Cancel the current download operation
   */
  cancel(): void {
    this.isCancelled = true;
    console.log('[ClipDownloader] Download cancelled by user');
  }

  /**
   * Validate loop duration before download
   */
  validateDuration(startTime: number, endTime: number): { valid: boolean; message: string } {
    const duration = endTime - startTime;

    if (duration <= 0) {
      return { valid: false, message: 'End time must be after start time' };
    }

    if (duration > this.options.maxDuration) {
      return {
        valid: false,
        message: `Clip duration (${Math.round(duration)}s) exceeds maximum of ${this.options.maxDuration}s`,
      };
    }

    return { valid: true, message: 'OK' };
  }

  /**
   * Prepare the loop segment for download (returns blob and filename)
   */
  async prepareDownload(
    startTime: number,
    endTime: number,
    onProgress?: ProgressCallback,
    options?: PrepareDownloadOptions
  ): Promise<{ blob: Blob; filename: string }> {
    // Reset cancel flag
    this.isCancelled = false;

    // Validate duration
    const validation = this.validateDuration(startTime, endTime);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const src = this.player.getSrc();
    if (!src) {
      throw new Error('No video source set');
    }

    const state = this.player.getState();
    const sourceType = state.sourceType || 'mp4';

    this.currentProgressCallback = onProgress || null;
    this.isHlsExtraction = sourceType === 'hls';

    console.log('[ClipDownloader] Starting download...', {
      src,
      sourceType,
      startTime,
      endTime,
      clipDuration: endTime - startTime,
    });

    onProgress?.({
      phase: 'initializing',
      progress: 0,
      message: 'Loading FFmpeg...',
    });

    // Initialize FFmpeg if needed
    console.log('[ClipDownloader] Initializing FFmpeg...');
    await this.initialize();

    if (this.isCancelled) {
      throw new Error('Download cancelled');
    }

    console.log('[ClipDownloader] FFmpeg initialized, starting extraction...');

    onProgress?.({
      phase: 'downloading',
      progress: 10,
      message: sourceType === 'hls' ? 'Downloading HLS segments...' : 'Loading video...',
    });

    try {
      const blob = await this.extractSegment(
        src,
        sourceType,
        startTime,
        endTime,
        onProgress,
        options
      );

      if (this.isCancelled) {
        throw new Error('Download cancelled');
      }

      onProgress?.({
        phase: 'complete',
        progress: 100,
        message: 'Ready to download!',
      });

      // Generate filename
      const filename = this.generateFilename(startTime, endTime);

      return { blob, filename };
    } catch (error) {
      // Don't show error notification for user cancellation
      if (error instanceof Error && error.message === 'Download cancelled') {
        throw error;
      }
      onProgress?.({
        phase: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Download failed',
      });
      throw error;
    } finally {
      this.currentProgressCallback = null;
      this.isCancelled = false;
      this.isHlsExtraction = false;
    }
  }

  /**
   * Generate filename for the clip
   */
  private generateFilename(startTime: number, endTime: number): string {
    const startStr = this.formatTimeForFilename(startTime);
    const endStr = this.formatTimeForFilename(endTime);
    return `clip_${startStr}-${endStr}.${this.options.outputFormat}`;
  }

  /**
   * Initialize FFmpeg
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this.doInitialize();

    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log('[ClipDownloader] Starting FFmpeg initialization...');

      // Dynamically import FFmpeg
      console.log('[ClipDownloader] Importing @ffmpeg/ffmpeg...');
      const ffmpegModule = await import('@ffmpeg/ffmpeg');
      console.log('[ClipDownloader] Importing @ffmpeg/util...');
      const utilModule = (await import('@ffmpeg/util')) as unknown as {
        fetchFile: (file?: string | File | Blob) => Promise<Uint8Array>;
        toBlobURL: (url: string, mimeType: string, progress?: boolean) => Promise<string>;
      };
      const FFmpeg = ffmpegModule.FFmpeg;
      const toBlobURL = utilModule.toBlobURL;

      console.log('[ClipDownloader] Creating FFmpeg instance...');
      this.ffmpeg = new FFmpeg() as FFmpegInstance;

      // Set up logging
      this.ffmpeg.on('log', ({ message }) => {
        if (message) {
          console.debug('[FFmpeg]', message);
        }
      });

      // Set up progress tracking
      this.ffmpeg.on('progress', ({ progress }) => {
        if (progress !== undefined && this.currentProgressCallback) {
          console.log('[ClipDownloader] FFmpeg progress:', progress);

          if (this.isHlsExtraction) {
            // HLS: Progress is relatively accurate since input is already trimmed segments
            const clipProgress = Math.min(1, Math.max(0, progress));
            this.currentProgressCallback({
              phase: 'encoding',
              progress: Math.min(90, 55 + Math.round(clipProgress * 35)),
              message: `Encoding... ${Math.round(clipProgress * 100)}%`,
            });
          } else {
            // MP4: FFmpeg.wasm progress reporting is unreliable/sporadic,
            // so we show an indeterminate encoding state
            this.currentProgressCallback({
              phase: 'encoding',
              progress: -1, // -1 indicates indeterminate
              message: 'Encoding...',
            });
          }
        }
      });

      // Load FFmpeg with CORS-safe URLs
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      console.log('[ClipDownloader] Loading FFmpeg core from:', baseURL);

      console.log('[ClipDownloader] Fetching ffmpeg-core.js...');
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      console.log('[ClipDownloader] Fetching ffmpeg-core.wasm...');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

      console.log('[ClipDownloader] Loading FFmpeg with blob URLs...');
      await this.ffmpeg.load({
        coreURL,
        wasmURL,
      });

      console.log('[ClipDownloader] FFmpeg initialized successfully!');
      this.isInitialized = true;
    } catch (error) {
      console.error('[ClipDownloader] FFmpeg initialization failed:', error);
      throw new Error('Failed to initialize FFmpeg. Please try again.');
    }
  }

  /**
   * Extract video segment using FFmpeg
   * For HLS: downloads segments and processes with FFmpeg
   * For DASH: downloads segments and processes with FFmpeg
   * For MP4/WebM: fetches file and processes with FFmpeg
   */
  private async extractSegment(
    src: string,
    sourceType: string,
    startTime: number,
    endTime: number,
    onProgress?: ProgressCallback,
    options?: PrepareDownloadOptions
  ): Promise<Blob> {
    // For HLS, download segments and process with FFmpeg
    if (sourceType === 'hls') {
      return this.extractHlsSegment(src, startTime, endTime, onProgress);
    }

    // For DASH, download segments and process with FFmpeg
    if (sourceType === 'dash') {
      return this.extractDashSegment(
        src,
        startTime,
        endTime,
        onProgress,
        options?.dashQualityIndex
      );
    }

    // For MP4/WebM, use FFmpeg directly
    return this.extractSegmentWithFFmpeg(src, startTime, endTime, onProgress);
  }

  /**
   * Extract segment using FFmpeg (for MP4/WebM files)
   */
  private async extractSegmentWithFFmpeg(
    src: string,
    startTime: number,
    endTime: number,
    onProgress?: ProgressCallback
  ): Promise<Blob> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    const duration = endTime - startTime;
    const outputFileName = `output.${this.options.outputFormat}`;
    const inputFileName = 'input.mp4';
    const hasWatermark = this.isWatermarkEnabled();

    try {
      onProgress?.({
        phase: 'downloading',
        progress: 15,
        message: 'Fetching video data...',
      });

      const utilModule = (await import('@ffmpeg/util')) as unknown as {
        fetchFile: (file?: string | File | Blob) => Promise<Uint8Array>;
      };
      const fetchFile = utilModule.fetchFile;
      const videoData = await fetchFile(src);
      await this.ffmpeg.writeFile(inputFileName, videoData);

      // Create and write watermark image if enabled
      if (hasWatermark) {
        const watermark = await this.createWatermarkImage();
        await this.ffmpeg.writeFile('watermark.png', watermark.data);
      }

      onProgress?.({
        phase: 'processing',
        progress: 25,
        message: 'Processing video...',
      });

      // Build FFmpeg arguments
      const args = this.buildFFmpegArgs(
        inputFileName,
        outputFileName,
        startTime,
        duration,
        hasWatermark
      );

      onProgress?.({
        phase: 'encoding',
        progress: 30,
        message: 'Encoding clip...',
      });

      // Execute FFmpeg
      console.log('[ClipDownloader] FFmpeg args:', args);
      await this.ffmpeg.exec(args);

      // Read output file
      const outputData = await this.ffmpeg.readFile(outputFileName);

      // Cleanup
      try {
        await this.ffmpeg.deleteFile(inputFileName);
      } catch {
        // Ignore cleanup errors
      }
      try {
        await this.ffmpeg.deleteFile(outputFileName);
      } catch {
        // Ignore cleanup errors
      }
      if (hasWatermark) {
        try {
          await this.ffmpeg.deleteFile('watermark.png');
        } catch {
          // Ignore cleanup errors
        }
      }

      return new Blob([outputData], {
        type: this.options.outputFormat === 'webm' ? 'video/webm' : 'video/mp4',
      });
    } catch (error) {
      console.error('[ClipDownloader] FFmpeg extraction failed:', error);
      throw new Error('Failed to extract video segment. The video may not be accessible.');
    }
  }

  /**
   * Extract segment from HLS by downloading segments and processing with FFmpeg
   */
  private async extractHlsSegment(
    hlsUrl: string,
    startTime: number,
    endTime: number,
    onProgress?: ProgressCallback
  ): Promise<Blob> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    const duration = endTime - startTime;
    console.log('[ClipDownloader] Extracting HLS segment...', {
      hlsUrl,
      startTime,
      endTime,
      duration,
    });

    onProgress?.({
      phase: 'downloading',
      progress: 10,
      message: 'Fetching HLS playlist...',
    });

    try {
      // Fetch and parse the master playlist
      const segments = await this.getHlsSegments(hlsUrl, startTime, endTime, onProgress);

      if (segments.length === 0) {
        throw new Error('No segments found for the specified time range');
      }

      console.log('[ClipDownloader] Found', segments.length, 'segments to download');

      // Download all segments
      onProgress?.({
        phase: 'downloading',
        progress: 20,
        message: `Downloading ${segments.length} segments...`,
      });

      const segmentData: Uint8Array[] = [];
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        console.log('[ClipDownloader] Downloading segment:', segment.url);

        const response = await fetch(segment.url);
        if (!response.ok) {
          throw new Error(`Failed to download segment: ${response.status}`);
        }

        const data = new Uint8Array(await response.arrayBuffer());
        segmentData.push(data);

        onProgress?.({
          phase: 'downloading',
          progress: 20 + Math.round(((i + 1) / segments.length) * 30),
          message: `Downloaded ${i + 1}/${segments.length} segments...`,
        });
      }

      // Concatenate segments
      const totalLength = segmentData.reduce((sum, arr) => sum + arr.length, 0);
      const concatenated = new Uint8Array(totalLength);
      let offset = 0;
      for (const data of segmentData) {
        concatenated.set(data, offset);
        offset += data.length;
      }

      console.log('[ClipDownloader] Total segment data:', totalLength, 'bytes');

      // Write to FFmpeg virtual filesystem
      await this.ffmpeg.writeFile('input.ts', concatenated);

      onProgress?.({
        phase: 'encoding',
        progress: 55,
        message: 'Encoding clip...',
      });

      // Calculate relative start time within the downloaded segments
      const segmentStartTime = segments[0].startTime;
      const relativeStart = startTime - segmentStartTime;
      const hasWatermark = this.isWatermarkEnabled();

      // Create and write watermark image if enabled
      if (hasWatermark) {
        const watermark = await this.createWatermarkImage();
        await this.ffmpeg.writeFile('watermark.png', watermark.data);
      }

      const outputFileName = `output.${this.options.outputFormat}`;
      const args = this.buildFFmpegArgs(
        'input.ts',
        outputFileName,
        relativeStart,
        duration,
        hasWatermark
      );

      console.log('[ClipDownloader] FFmpeg args:', args);
      await this.ffmpeg.exec(args);

      // Read output
      const outputData = await this.ffmpeg.readFile(outputFileName);
      console.log('[ClipDownloader] Output size:', outputData.length, 'bytes');

      // Cleanup
      try {
        await this.ffmpeg.deleteFile('input.ts');
      } catch {}
      try {
        await this.ffmpeg.deleteFile(outputFileName);
      } catch {}
      if (hasWatermark) {
        try {
          await this.ffmpeg.deleteFile('watermark.png');
        } catch {}
      }

      return new Blob([outputData], {
        type: this.options.outputFormat === 'webm' ? 'video/webm' : 'video/mp4',
      });
    } catch (error) {
      console.error('[ClipDownloader] HLS extraction failed:', error);
      throw new Error(
        `Failed to extract HLS segment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract segment from DASH by downloading segments and processing with FFmpeg
   */
  private async extractDashSegment(
    dashUrl: string,
    startTime: number,
    endTime: number,
    onProgress?: ProgressCallback,
    qualityIndex?: number
  ): Promise<Blob> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized');
    }

    const duration = endTime - startTime;
    console.log('[ClipDownloader] Extracting DASH segment...', {
      dashUrl,
      startTime,
      endTime,
      duration,
    });

    onProgress?.({
      phase: 'downloading',
      progress: 10,
      message: 'Fetching DASH manifest...',
    });

    try {
      // Fetch and parse the DASH manifest
      const segments = await this.getDashSegments(
        dashUrl,
        startTime,
        endTime,
        onProgress,
        qualityIndex
      );

      if (segments.length === 0) {
        throw new Error('No segments found for the specified time range');
      }

      console.log('[ClipDownloader] Found', segments.length, 'DASH segments to download');

      // Download all segments
      onProgress?.({
        phase: 'downloading',
        progress: 20,
        message: `Downloading ${segments.length} segments...`,
      });

      const segmentData: Uint8Array[] = [];

      // Download initialization segment first if present
      if (segments[0]?.initUrl) {
        console.log('[ClipDownloader] Downloading initialization segment:', segments[0].initUrl);
        const initResponse = await fetch(segments[0].initUrl);
        if (initResponse.ok) {
          const initData = new Uint8Array(await initResponse.arrayBuffer());
          segmentData.push(initData);
        }
      }

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        console.log('[ClipDownloader] Downloading segment:', segment.url);

        const response = await fetch(segment.url);
        if (!response.ok) {
          throw new Error(`Failed to download segment: ${response.status}`);
        }

        const data = new Uint8Array(await response.arrayBuffer());
        segmentData.push(data);

        onProgress?.({
          phase: 'downloading',
          progress: 20 + Math.round(((i + 1) / segments.length) * 30),
          message: `Downloaded ${i + 1}/${segments.length} segments...`,
        });
      }

      // Concatenate segments
      const totalLength = segmentData.reduce((sum, arr) => sum + arr.length, 0);
      const concatenated = new Uint8Array(totalLength);
      let offset = 0;
      for (const data of segmentData) {
        concatenated.set(data, offset);
        offset += data.length;
      }

      console.log('[ClipDownloader] Total segment data:', totalLength, 'bytes');

      // Write to FFmpeg virtual filesystem (use .mp4 extension for fMP4 segments)
      await this.ffmpeg.writeFile('input.mp4', concatenated);

      onProgress?.({
        phase: 'encoding',
        progress: 55,
        message: 'Encoding clip...',
      });

      // Calculate relative start time within the downloaded segments
      const segmentStartTime = segments[0].startTime;
      const relativeStart = Math.max(0, startTime - segmentStartTime);
      const hasWatermark = this.isWatermarkEnabled();

      // Create and write watermark image if enabled
      if (hasWatermark) {
        const watermark = await this.createWatermarkImage();
        await this.ffmpeg.writeFile('watermark.png', watermark.data);
      }

      const outputFileName = `output.${this.options.outputFormat}`;
      const args = this.buildFFmpegArgs(
        'input.mp4',
        outputFileName,
        relativeStart,
        duration,
        hasWatermark
      );

      console.log('[ClipDownloader] FFmpeg args:', args);
      await this.ffmpeg.exec(args);

      // Read output
      const outputData = await this.ffmpeg.readFile(outputFileName);
      console.log('[ClipDownloader] Output size:', outputData.length, 'bytes');

      // Cleanup
      try {
        await this.ffmpeg.deleteFile('input.mp4');
      } catch {
        /* ignore */
      }
      try {
        await this.ffmpeg.deleteFile(outputFileName);
      } catch {
        /* ignore */
      }
      if (hasWatermark) {
        try {
          await this.ffmpeg.deleteFile('watermark.png');
        } catch {
          /* ignore */
        }
      }

      return new Blob([outputData], {
        type: this.options.outputFormat === 'webm' ? 'video/webm' : 'video/mp4',
      });
    } catch (error) {
      console.error('[ClipDownloader] DASH extraction failed:', error);
      throw new Error(
        `Failed to extract DASH segment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse DASH manifest and get segments for the time range
   * @param qualityIndex - Optional quality index to match (from DashPlugin). If not provided, uses highest quality.
   */
  private async getDashSegments(
    dashUrl: string,
    startTime: number,
    endTime: number,
    _onProgress?: ProgressCallback,
    qualityIndex?: number
  ): Promise<Array<{ url: string; startTime: number; duration: number; initUrl?: string }>> {
    // Fetch the manifest
    const response = await fetch(dashUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch DASH manifest: ${response.status}`);
    }

    const manifestText = await response.text();
    const baseUrl = dashUrl.substring(0, dashUrl.lastIndexOf('/') + 1);

    // Parse XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(manifestText, 'application/xml');

    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Failed to parse DASH manifest');
    }

    // Find video adaptation set (prefer H.264 for compatibility)
    const adaptationSets = doc.querySelectorAll('AdaptationSet');
    let videoAdaptationSet: Element | null = null;

    for (const as of adaptationSets) {
      const mimeType = as.getAttribute('mimeType') || '';
      const contentType = as.getAttribute('contentType') || '';

      if (mimeType.includes('video') || contentType === 'video') {
        videoAdaptationSet = as;
        break;
      }
    }

    if (!videoAdaptationSet) {
      throw new Error('No video adaptation set found in DASH manifest');
    }

    // Get all representations
    const representations = videoAdaptationSet.querySelectorAll('Representation');
    if (representations.length === 0) {
      throw new Error('No video representations found');
    }

    // Select representation based on qualityIndex or default to highest quality
    let selectedRep: Element = representations[0];

    if (qualityIndex !== undefined) {
      // Find representation matching the qualityIndex
      // dash.js qualityIndex corresponds to the index in the sorted-by-bandwidth list
      const repArray = Array.from(representations);
      // Sort by bandwidth ascending (same order as dash.js uses for qualityIndex)
      repArray.sort((a, b) => {
        const bwA = parseInt(a.getAttribute('bandwidth') || '0', 10);
        const bwB = parseInt(b.getAttribute('bandwidth') || '0', 10);
        return bwA - bwB;
      });

      if (qualityIndex >= 0 && qualityIndex < repArray.length) {
        selectedRep = repArray[qualityIndex];
        console.log(
          `[ClipDownloader] Using quality index ${qualityIndex} (${selectedRep.getAttribute('height')}p)`
        );
      } else {
        // Fallback to highest quality if index is out of range
        selectedRep = repArray[repArray.length - 1];
        console.log(
          `[ClipDownloader] Quality index ${qualityIndex} out of range, using highest quality`
        );
      }
    } else {
      // Default to highest bandwidth (best quality) when no quality specified
      let highestBandwidth = 0;
      for (const rep of representations) {
        const bandwidth = parseInt(rep.getAttribute('bandwidth') || '0', 10);
        if (bandwidth > highestBandwidth) {
          highestBandwidth = bandwidth;
          selectedRep = rep;
        }
      }
      console.log(
        `[ClipDownloader] No quality specified, using highest quality (${selectedRep.getAttribute('height')}p)`
      );
    }

    // Get segments from template or list
    const segmentTemplate =
      selectedRep.querySelector('SegmentTemplate') ||
      videoAdaptationSet.querySelector('SegmentTemplate');
    const segmentList =
      selectedRep.querySelector('SegmentList') || videoAdaptationSet.querySelector('SegmentList');

    const segments: Array<{ url: string; startTime: number; duration: number; initUrl?: string }> =
      [];

    if (segmentTemplate) {
      // Handle SegmentTemplate with timeline or number-based addressing
      const templateSegments = this.parseSegmentTemplate(
        segmentTemplate,
        selectedRep,
        videoAdaptationSet,
        baseUrl,
        startTime,
        endTime
      );
      segments.push(...templateSegments);
    } else if (segmentList) {
      // Handle SegmentList
      const listSegments = this.parseSegmentList(segmentList, baseUrl, startTime, endTime);
      segments.push(...listSegments);
    } else {
      // Try BaseURL (single segment)
      const baseUrlElement =
        selectedRep.querySelector('BaseURL') || videoAdaptationSet.querySelector('BaseURL');
      if (baseUrlElement) {
        const segmentUrl = baseUrlElement.textContent?.trim() || '';
        const fullUrl = segmentUrl.startsWith('http') ? segmentUrl : baseUrl + segmentUrl;
        segments.push({
          url: fullUrl,
          startTime: 0,
          duration: endTime - startTime,
        });
      }
    }

    return segments;
  }

  /**
   * Parse SegmentTemplate to get segment URLs
   */
  private parseSegmentTemplate(
    template: Element,
    representation: Element,
    _adaptationSet: Element,
    baseUrl: string,
    startTime: number,
    endTime: number
  ): Array<{ url: string; startTime: number; duration: number; initUrl?: string }> {
    const segments: Array<{ url: string; startTime: number; duration: number; initUrl?: string }> =
      [];

    const media = template.getAttribute('media') || '';
    const initialization = template.getAttribute('initialization') || '';
    const timescale = parseInt(template.getAttribute('timescale') || '1', 10);
    const startNumber = parseInt(template.getAttribute('startNumber') || '1', 10);
    const segmentDuration = parseInt(template.getAttribute('duration') || '0', 10);

    // Get representation ID and bandwidth for template substitution
    const repId = representation.getAttribute('id') || '';
    const bandwidth = representation.getAttribute('bandwidth') || '';

    // Build initialization URL
    let initUrl: string | undefined;
    if (initialization) {
      initUrl = this.substituteTemplate(initialization, {
        RepresentationID: repId,
        Bandwidth: bandwidth,
      });
      initUrl = initUrl.startsWith('http') ? initUrl : baseUrl + initUrl;
    }

    // Check for SegmentTimeline
    const timeline = template.querySelector('SegmentTimeline');
    if (timeline) {
      // Parse SegmentTimeline
      const sElements = timeline.querySelectorAll('S');
      let currentTime = 0;

      for (const s of sElements) {
        const t = parseInt(s.getAttribute('t') || '', 10);
        const d = parseInt(s.getAttribute('d') || '0', 10);
        const r = parseInt(s.getAttribute('r') || '0', 10); // repeat count

        if (!isNaN(t)) {
          currentTime = t;
        }

        const repeatCount = r >= 0 ? r + 1 : 1;

        for (let i = 0; i < repeatCount; i++) {
          const segmentStartTime = currentTime / timescale;
          const segmentEndTime = (currentTime + d) / timescale;

          // Check if this segment overlaps with our time range
          if (segmentEndTime > startTime && segmentStartTime < endTime) {
            const segmentNumber = startNumber + segments.length;
            let url = this.substituteTemplate(media, {
              RepresentationID: repId,
              Bandwidth: bandwidth,
              Number: segmentNumber.toString(),
              Time: currentTime.toString(),
            });
            url = url.startsWith('http') ? url : baseUrl + url;

            segments.push({
              url,
              startTime: segmentStartTime,
              duration: d / timescale,
              initUrl: segments.length === 0 ? initUrl : undefined,
            });
          }

          currentTime += d;

          // Stop if we've passed the end time
          if (segmentStartTime > endTime + 10) {
            break;
          }
        }
      }
    } else if (segmentDuration > 0) {
      // Number-based addressing with fixed segment duration
      const segmentDurationSec = segmentDuration / timescale;
      const startSegment = Math.floor(startTime / segmentDurationSec);
      const endSegment = Math.ceil(endTime / segmentDurationSec);

      for (let i = startSegment; i <= endSegment; i++) {
        const segmentNumber = startNumber + i;
        const segmentStartTime = i * segmentDurationSec;

        let url = this.substituteTemplate(media, {
          RepresentationID: repId,
          Bandwidth: bandwidth,
          Number: segmentNumber.toString(),
          Time: (i * segmentDuration).toString(),
        });
        url = url.startsWith('http') ? url : baseUrl + url;

        segments.push({
          url,
          startTime: segmentStartTime,
          duration: segmentDurationSec,
          initUrl: segments.length === 0 ? initUrl : undefined,
        });
      }
    }

    return segments;
  }

  /**
   * Parse SegmentList to get segment URLs
   */
  private parseSegmentList(
    segmentList: Element,
    baseUrl: string,
    startTime: number,
    endTime: number
  ): Array<{ url: string; startTime: number; duration: number; initUrl?: string }> {
    const segments: Array<{ url: string; startTime: number; duration: number; initUrl?: string }> =
      [];

    const timescale = parseInt(segmentList.getAttribute('timescale') || '1', 10);
    const duration = parseInt(segmentList.getAttribute('duration') || '0', 10);
    const segmentDurationSec = duration / timescale;

    // Get initialization
    const initialization = segmentList.querySelector('Initialization');
    let initUrl: string | undefined;
    if (initialization) {
      const sourceURL = initialization.getAttribute('sourceURL') || '';
      initUrl = sourceURL.startsWith('http') ? sourceURL : baseUrl + sourceURL;
    }

    // Get segment URLs
    const segmentUrls = segmentList.querySelectorAll('SegmentURL');
    let currentTime = 0;

    for (let i = 0; i < segmentUrls.length; i++) {
      const segmentUrl = segmentUrls[i];
      const media = segmentUrl.getAttribute('media') || '';
      const segmentStartTime = currentTime;
      const segmentEndTime = currentTime + segmentDurationSec;

      if (segmentEndTime > startTime && segmentStartTime < endTime) {
        const url = media.startsWith('http') ? media : baseUrl + media;
        segments.push({
          url,
          startTime: segmentStartTime,
          duration: segmentDurationSec,
          initUrl: segments.length === 0 ? initUrl : undefined,
        });
      }

      currentTime += segmentDurationSec;

      if (currentTime > endTime + 10) {
        break;
      }
    }

    return segments;
  }

  /**
   * Substitute template variables in DASH segment URL
   */
  private substituteTemplate(template: string, vars: Record<string, string>): string {
    let result = template;

    for (const [key, value] of Object.entries(vars)) {
      // Handle $Key$ format
      result = result.replace(new RegExp(`\\$${key}\\$`, 'g'), value);

      // Handle $Key%0Nd$ format (padded numbers)
      const paddedRegex = new RegExp(`\\$${key}%(\\d+)d\\$`, 'g');
      result = result.replace(paddedRegex, (_, width) => {
        return value.padStart(parseInt(width, 10), '0');
      });
    }

    return result;
  }

  /**
   * Parse HLS playlist and get segments for the time range
   */
  private async getHlsSegments(
    hlsUrl: string,
    startTime: number,
    endTime: number,
    onProgress?: ProgressCallback
  ): Promise<Array<{ url: string; startTime: number; duration: number }>> {
    // Fetch the playlist
    const response = await fetch(hlsUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch HLS playlist: ${response.status}`);
    }

    const playlistText = await response.text();
    const baseUrl = hlsUrl.substring(0, hlsUrl.lastIndexOf('/') + 1);

    // Check if this is a master playlist (contains other playlists)
    if (playlistText.includes('#EXT-X-STREAM-INF')) {
      // It's a master playlist, get the first variant
      const lines = playlistText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
          const variantUrl = lines[i + 1]?.trim();
          if (variantUrl) {
            const fullUrl = variantUrl.startsWith('http') ? variantUrl : baseUrl + variantUrl;
            console.log('[ClipDownloader] Found variant playlist:', fullUrl);
            return this.getHlsSegments(fullUrl, startTime, endTime, onProgress);
          }
        }
      }
      throw new Error('No variant playlist found in master playlist');
    }

    // Parse media playlist
    const segments: Array<{ url: string; startTime: number; duration: number }> = [];
    const lines = playlistText.split('\n');
    let currentTime = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        // Extract duration
        const durationMatch = line.match(/#EXTINF:([\d.]+)/);
        const segmentDuration = durationMatch ? parseFloat(durationMatch[1]) : 0;

        // Get the segment URL (next non-comment line)
        let segmentUrl = '';
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !nextLine.startsWith('#')) {
            segmentUrl = nextLine;
            break;
          }
        }

        if (segmentUrl) {
          const fullUrl = segmentUrl.startsWith('http') ? segmentUrl : baseUrl + segmentUrl;
          const segmentEnd = currentTime + segmentDuration;

          // Check if this segment overlaps with our time range
          if (segmentEnd > startTime && currentTime < endTime) {
            segments.push({
              url: fullUrl,
              startTime: currentTime,
              duration: segmentDuration,
            });
          }

          currentTime = segmentEnd;

          // Stop if we've passed the end time
          if (currentTime > endTime + 10) {
            break;
          }
        }
      }
    }

    return segments;
  }

  /**
   * Determine the effective codec based on output format and user preference
   */
  private getEffectiveCodec(): 'h264' | 'vp9' | 'av1' {
    const codec = this.options.videoCodec;
    const format = this.options.outputFormat;

    if (codec === 'auto') {
      // Default codec based on format
      return format === 'webm' ? 'vp9' : 'h264';
    }

    // Validate codec/format compatibility
    if (format === 'mp4') {
      // MP4 supports h264, h265, vp9 (via codec box), av1
      // For simplicity, we support h264, vp9, av1 in MP4
      if (codec === 'vp9' || codec === 'av1') {
        console.warn(
          `[ClipDownloader] ${codec} in MP4 container may have limited playback support`
        );
      }
      return codec === 'h264' ? 'h264' : codec;
    } else {
      // WebM supports vp9 and av1
      if (codec === 'h264') {
        console.warn('[ClipDownloader] H.264 not supported in WebM, falling back to VP9');
        return 'vp9';
      }
      return codec;
    }
  }

  /**
   * Build FFmpeg command arguments
   */
  private buildFFmpegArgs(
    inputFileName: string,
    outputFileName: string,
    startTime: number,
    duration: number,
    hasWatermark: boolean
  ): string[] {
    const args: string[] = [];
    const effectiveCodec = this.getEffectiveCodec();

    // Input file first
    args.push('-i', inputFileName);

    // Watermark image input (if enabled)
    if (hasWatermark) {
      args.push('-i', 'watermark.png');
    }

    // Accurate seeking (after input for frame-accurate start)
    // Placing -ss after -i decodes frame-by-frame for precise timing
    // Use toFixed(6) for microsecond precision to avoid truncation errors
    args.push('-ss', startTime.toFixed(6));

    // Duration - add small buffer (1ms) to ensure last frame is fully included
    // FFmpeg's -t is exclusive, so without buffer we may cut the final frame short
    args.push('-t', (duration + 0.001).toFixed(6));

    // Add watermark overlay filter if enabled
    if (hasWatermark) {
      const wm = this.options.watermark!;
      const position = wm.position ?? 'bottom-right';
      const padding = wm.padding ?? 10;

      let overlayPos: string;
      switch (position) {
        case 'top-left':
          overlayPos = `${padding}:${padding}`;
          break;
        case 'top-right':
          overlayPos = `main_w-overlay_w-${padding}:${padding}`;
          break;
        case 'bottom-left':
          overlayPos = `${padding}:main_h-overlay_h-${padding}`;
          break;
        case 'bottom-right':
        default:
          overlayPos = `main_w-overlay_w-${padding}:main_h-overlay_h-${padding}`;
          break;
      }

      args.push('-filter_complex', `[0:v][1:v]overlay=${overlayPos}`);
    }

    // Video codec and quality settings based on effective codec
    this.addVideoCodecArgs(args, effectiveCodec);

    // Audio codec based on output format
    if (this.options.outputFormat === 'webm') {
      args.push('-c:a', 'libopus', '-b:a', '128k');
    } else {
      args.push('-c:a', 'aac', '-b:a', '128k');
    }

    // Avoid issues with variable frame rate
    args.push('-vsync', 'cfr');

    // Fast start for MP4 (allows playback before fully downloaded)
    if (this.options.outputFormat === 'mp4') {
      args.push('-movflags', '+faststart');
    }

    // Output file
    args.push(outputFileName);

    return args;
  }

  /**
   * Add video codec arguments based on codec type
   */
  private addVideoCodecArgs(args: string[], codec: 'h264' | 'vp9' | 'av1'): void {
    switch (codec) {
      case 'h264':
        args.push('-c:v', 'libx264');
        switch (this.options.quality) {
          case 'low':
            args.push('-crf', '28', '-preset', 'ultrafast');
            break;
          case 'high':
            args.push('-crf', '18', '-preset', 'slow');
            break;
          default: // medium
            args.push('-crf', '23', '-preset', 'fast');
        }
        break;

      case 'vp9':
        args.push('-c:v', 'libvpx-vp9');
        switch (this.options.quality) {
          case 'low':
            args.push('-crf', '35', '-b:v', '0', '-cpu-used', '5');
            break;
          case 'high':
            args.push('-crf', '25', '-b:v', '0', '-cpu-used', '1');
            break;
          default: // medium
            args.push('-crf', '30', '-b:v', '0', '-cpu-used', '3');
        }
        // VP9 row-based multithreading for better performance
        args.push('-row-mt', '1');
        break;

      case 'av1':
        // Note: AV1 encoding is very slow in FFmpeg.wasm
        // This is marked as experimental
        args.push('-c:v', 'libaom-av1');
        switch (this.options.quality) {
          case 'low':
            // Fastest AV1 encoding (still slow)
            args.push('-crf', '45', '-cpu-used', '8');
            break;
          case 'high':
            args.push('-crf', '25', '-cpu-used', '4');
            break;
          default: // medium
            args.push('-crf', '35', '-cpu-used', '6');
        }
        // AV1 specific settings for reasonable encode times
        args.push('-strict', 'experimental');
        args.push('-row-mt', '1');
        args.push('-tiles', '2x2');
        console.warn('[ClipDownloader] AV1 encoding is experimental and may be slow');
        break;
    }
  }

  /**
   * Check if watermark is enabled
   */
  private isWatermarkEnabled(): boolean {
    const wm = this.options.watermark;
    return !!(wm && wm.enabled !== false && wm.text);
  }

  /**
   * Create watermark image using Canvas API
   * Returns the image data as Uint8Array (PNG format)
   */
  private async createWatermarkImage(): Promise<{
    data: Uint8Array;
    width: number;
    height: number;
  }> {
    const wm = this.options.watermark!;
    const text = wm.text || 'Downloaded from KanjoPlayer PoC';
    const fontSize = wm.fontSize ?? 18;
    const color = wm.color ?? 'white';
    const opacity = wm.opacity ?? 0.5;

    // Create canvas to measure and render text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Set font to measure text
    ctx.font = `${fontSize}px sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = fontSize + 4; // Add some padding

    // Set canvas size
    canvas.width = textWidth + 20; // Padding
    canvas.height = textHeight + 10;

    // Clear with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw semi-transparent background for better readability
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
    ctx.roundRect(0, 0, canvas.width, canvas.height, 4);
    ctx.fill();

    // Draw text
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 10, canvas.height / 2 + 1);

    // Convert canvas to PNG using toBlob (faster than toDataURL + base64 decode)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to create watermark blob'))),
        'image/png'
      );
    });

    const bytes = new Uint8Array(await blob.arrayBuffer());
    return { data: bytes, width: canvas.width, height: canvas.height };
  }

  /**
   * Format time for filename (e.g., "1m30s")
   */
  private formatTimeForFilename(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m${s}s`;
  }

  /**
   * Release resources
   */
  destroy(): void {
    if (this.ffmpeg) {
      try {
        this.ffmpeg.terminate();
      } catch {
        // Ignore termination errors
      }
      this.ffmpeg = null;
    }
    this.isInitialized = false;
    this.isInitializing = false;
    this.initPromise = null;
  }
}
