/**
 * WebVTT sprite loader for HLS thumbnail support
 */

import type { ThumbnailData } from '../core/types';

interface SpriteCue {
  startTime: number;
  endTime: number;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteLoaderOptions {
  /** Base URL for resolving relative paths in VTT */
  baseUrl?: string;
}

export class SpriteLoader {
  private cues: SpriteCue[] = [];
  private spriteImages: Map<string, HTMLImageElement> = new Map();
  private isLoaded = false;
  private options: SpriteLoaderOptions;
  private vttUrl: string = '';

  constructor(options: SpriteLoaderOptions = {}) {
    this.options = options;
  }

  /**
   * Load thumbnails from a WebVTT file
   */
  async load(vttUrl: string): Promise<void> {
    this.vttUrl = vttUrl;
    this.cues = [];

    try {
      const response = await fetch(vttUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch VTT: ${response.status}`);
      }

      const vttText = await response.text();
      this.parseVTT(vttText);
      await this.preloadSprites();
      this.isLoaded = true;
    } catch (error) {
      console.error('[SpriteLoader] Failed to load VTT:', error);
      throw error;
    }
  }

  /**
   * Parse WebVTT content
   */
  private parseVTT(vttText: string): void {
    const lines = vttText.split('\n');
    let i = 0;

    // Skip header
    while (i < lines.length && !lines[i].includes('-->')) {
      i++;
    }

    while (i < lines.length) {
      const line = lines[i].trim();

      // Look for timing line
      if (line.includes('-->')) {
        const timeParts = line.split('-->');
        const startTime = this.parseTimestamp(timeParts[0].trim());
        const endTime = this.parseTimestamp(timeParts[1].trim());

        // Get the cue content (next non-empty line)
        i++;
        while (i < lines.length && lines[i].trim() === '') {
          i++;
        }

        if (i < lines.length) {
          const cueContent = lines[i].trim();
          const cue = this.parseCueContent(cueContent, startTime, endTime);
          if (cue) {
            this.cues.push(cue);
          }
        }
      }

      i++;
    }

    // Sort cues by start time
    this.cues.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Parse timestamp (00:00:00.000 or 00:00.000)
   */
  private parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(':');
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (parts.length === 3) {
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      seconds = parseFloat(parts[2]);
    } else if (parts.length === 2) {
      minutes = parseInt(parts[0], 10);
      seconds = parseFloat(parts[1]);
    }

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Parse cue content (URL with optional sprite coordinates)
   * Format: image.jpg#xywh=x,y,w,h
   */
  private parseCueContent(content: string, startTime: number, endTime: number): SpriteCue | null {
    const match = content.match(/^([^#]+)(?:#xywh=(\d+),(\d+),(\d+),(\d+))?$/);
    if (!match) return null;

    let imageUrl = match[1];

    // Resolve relative URLs
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      const baseUrl = this.options.baseUrl || this.getBaseUrl(this.vttUrl);
      imageUrl = new URL(imageUrl, baseUrl).href;
    }

    return {
      startTime,
      endTime,
      imageUrl,
      x: match[2] ? parseInt(match[2], 10) : 0,
      y: match[3] ? parseInt(match[3], 10) : 0,
      width: match[4] ? parseInt(match[4], 10) : 0,
      height: match[5] ? parseInt(match[5], 10) : 0,
    };
  }

  /**
   * Get base URL from VTT URL
   */
  private getBaseUrl(url: string): string {
    const lastSlash = url.lastIndexOf('/');
    return lastSlash > 0 ? url.substring(0, lastSlash + 1) : '';
  }

  /**
   * Preload sprite images
   */
  private async preloadSprites(): Promise<void> {
    const uniqueUrls = new Set(this.cues.map((cue) => cue.imageUrl));

    await Promise.all(
      Array.from(uniqueUrls).map(async (url) => {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load sprite: ${url}`));
            img.src = url;
          });

          this.spriteImages.set(url, img);
        } catch (error) {
          console.warn('[SpriteLoader] Failed to preload sprite:', url, error);
        }
      })
    );
  }

  /**
   * Get thumbnail for a specific time
   */
  getThumbnail(time: number): ThumbnailData | null {
    if (!this.isLoaded || this.cues.length === 0) {
      return null;
    }

    // Find the cue that contains this time
    const cue = this.cues.find((c) => time >= c.startTime && time < c.endTime);

    if (!cue) {
      // Find the closest cue
      const closest = this.cues.reduce((prev, curr) => {
        const prevDiff = Math.abs(prev.startTime - time);
        const currDiff = Math.abs(curr.startTime - time);
        return currDiff < prevDiff ? curr : prev;
      });
      return this.cueToThumbnail(closest, time);
    }

    return this.cueToThumbnail(cue, time);
  }

  /**
   * Convert cue to thumbnail data
   */
  private cueToThumbnail(cue: SpriteCue, time: number): ThumbnailData {
    // If sprite coordinates are provided
    if (cue.width > 0 && cue.height > 0) {
      return {
        url: cue.imageUrl,
        time,
        width: cue.width,
        height: cue.height,
        sprite: {
          x: cue.x,
          y: cue.y,
          width: cue.width,
          height: cue.height,
        },
      };
    }

    // Full image thumbnail
    const img = this.spriteImages.get(cue.imageUrl);
    return {
      url: cue.imageUrl,
      time,
      width: img?.naturalWidth || 160,
      height: img?.naturalHeight || 90,
    };
  }

  /**
   * Check if thumbnails are loaded
   */
  isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Get all cue times for preloading
   */
  getCueTimes(): number[] {
    return this.cues.map((cue) => cue.startTime);
  }

  /**
   * Clear loaded data
   */
  clear(): void {
    this.cues = [];
    this.spriteImages.clear();
    this.isLoaded = false;
  }
}
