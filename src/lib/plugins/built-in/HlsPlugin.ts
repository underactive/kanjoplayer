/**
 * HLS.js Plugin for HLS streaming support
 */

import type { KanjoPlugin, HlsLevel } from '../../core/types';
import type { KanjoPlayer } from '../../core/KanjoPlayer';

// HLS.js types (minimal)
interface HlsConfig {
  debug?: boolean;
  enableWorker?: boolean;
  lowLatencyMode?: boolean;
  backBufferLength?: number;
  maxBufferLength?: number;
  maxMaxBufferLength?: number;
  autoStartLoad?: boolean;
  startPosition?: number;
  fragLoadingMaxRetry?: number;
  manifestLoadingMaxRetry?: number;
  levelLoadingMaxRetry?: number;
}

interface HlsInstance {
  loadSource(url: string): void;
  attachMedia(media: HTMLMediaElement): void;
  detachMedia(): void;
  destroy(): void;
  startLoad(startPosition?: number): void;
  stopLoad(): void;
  currentLevel: number;
  levels: Array<{
    bitrate: number;
    width: number;
    height: number;
    name: string;
  }>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

interface HlsConstructor {
  new (config?: HlsConfig): HlsInstance;
  isSupported(): boolean;
  Events: Record<string, string>;
  ErrorTypes: Record<string, string>;
  ErrorDetails: Record<string, string>;
}

declare global {
  interface Window {
    Hls?: HlsConstructor;
  }
}

export interface HlsPluginOptions {
  /** HLS.js configuration */
  hlsConfig?: HlsConfig;
  /** Auto-recover from errors */
  autoRecover?: boolean;
  /** Enable quality selector in settings */
  qualitySelector?: boolean;
}

export class HlsPlugin implements KanjoPlugin {
  name = 'hls';
  version = '1.0.0';

  private player: KanjoPlayer | null = null;
  private hls: HlsInstance | null = null;
  private options: HlsPluginOptions;
  private Hls: HlsConstructor | null = null;
  private currentLevels: HlsLevel[] = [];
  private isAutoLevel = true;

  constructor(options: HlsPluginOptions = {}) {
    this.options = {
      autoRecover: true,
      qualitySelector: true,
      ...options,
    };
  }

  async install(player: KanjoPlayer): Promise<void> {
    this.player = player as KanjoPlayer;

    // Try to get HLS.js
    this.Hls = await this.getHls();

    if (!this.Hls) {
      console.warn('HLS.js not available. HLS streams will use native support if available.');
      return;
    }

    if (!this.Hls.isSupported()) {
      console.warn('HLS.js is not supported in this browser.');
      return;
    }

    // Listen for source changes
    this.player.on('sourcechange', this.handleSourceChange.bind(this));

    // Check if current source is HLS
    const state = this.player.getState();
    if (state.sourceType === 'hls' && state.src) {
      this.loadHlsSource(state.src);
    }

    // Add quality selector menu items
    if (this.options.qualitySelector) {
      this.addQualitySelector();
    }
  }

  private async getHls(): Promise<HlsConstructor | null> {
    // Check if already loaded globally
    if (window.Hls) {
      return window.Hls;
    }

    // Try to import from hls.js package
    try {
      const hlsModule = await import('hls.js');
      return hlsModule.default || hlsModule;
    } catch {
      // HLS.js not installed
      return null;
    }
  }

  private handleSourceChange(data: { src: string; type: string }): void {
    if (data.type === 'hls') {
      this.loadHlsSource(data.src);
    } else {
      this.destroyHls();
    }
  }

  private loadHlsSource(src: string): void {
    if (!this.Hls || !this.player) return;

    this.destroyHls();

    const video = this.player.getVideoElement();

    // Check for native HLS support (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    // Ensure video element is clean before HLS.js attaches
    // This helps prevent ORB issues on initial page load
    video.removeAttribute('src');
    video.preload = 'none'; // Prevent browser from prefetching
    video.load();

    // Small delay to ensure video element state is fully reset
    // This helps prevent ORB blocking on initial page load
    requestAnimationFrame(() => {
      if (!this.Hls || !this.player) return;

      // Use HLS.js
      this.hls = new this.Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        fragLoadingMaxRetry: 3,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
        ...this.options.hlsConfig,
      });

      this.bindHlsEvents();

      // Wait for MEDIA_ATTACHED before loading source
      // This ensures proper initialization and prevents segment loading issues
      const Events = this.Hls.Events;
      this.hls.on(Events.MEDIA_ATTACHED, () => {
        if (this.hls) {
          this.hls.loadSource(src);
        }
      });

      this.hls.attachMedia(video);
    });
  }

  private bindHlsEvents(): void {
    if (!this.hls || !this.Hls || !this.player) return;

    const Events = this.Hls.Events;

    // Manifest parsed - HLS is now ready for playback
    this.hls.on(Events.MANIFEST_PARSED, (...args: unknown[]) => {
      const data = args[1] as { levels: Array<{ bitrate: number; width: number; height: number; name: string }> };
      this.currentLevels = data.levels.map((level) => ({
        bitrate: level.bitrate,
        width: level.width,
        height: level.height,
        name: level.name || `${level.height}p`,
      }));

      this.player?.emit('hlsmanifestparsed', { levels: this.currentLevels });
      this.updateQualityMenu();
    });

    // Level switch
    this.hls.on(Events.LEVEL_SWITCHED, (...args: unknown[]) => {
      const data = args[1] as { level: number };
      this.player?.emit('hlslevelswitch', {
        level: data.level,
        auto: this.isAutoLevel,
      });
    });

    // Error handling
    this.hls.on(Events.ERROR, (...args: unknown[]) => {
      const data = args[1] as { type: string; details: string; fatal: boolean };
      this.player?.emit('hlserror', {
        type: data.type,
        details: data.details,
        fatal: data.fatal,
      });

      if (data.fatal && this.options.autoRecover) {
        this.handleFatalError(data);
      }
    });
  }

  private handleFatalError(data: { type: string; details: string }): void {
    if (!this.hls || !this.Hls) return;

    const ErrorTypes = this.Hls.ErrorTypes;

    switch (data.type) {
      case ErrorTypes.NETWORK_ERROR:
        console.warn('HLS: Fatal network error, trying to recover...');
        this.hls.loadSource(this.player?.getSrc() || '');
        break;
      case ErrorTypes.MEDIA_ERROR:
        console.warn('HLS: Fatal media error, trying to recover...');
        // HLS.js has a recoverMediaError method but it's not in our minimal types
        // For now, just reload the source
        this.hls.loadSource(this.player?.getSrc() || '');
        break;
      default:
        console.error('HLS: Fatal error, cannot recover:', data.details);
        this.destroyHls();
        break;
    }
  }

  private addQualitySelector(): void {
    if (!this.player) return;

    this.player.addMenuItem({
      id: 'hls-quality',
      label: 'Quality',
      icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm4-4H6v-2h10v2zm0-4H6V7h10v2z"/></svg>`,
      onClick: () => {
        // Open quality submenu (handled by SettingsMenu)
      },
      submenu: [],
    });
  }

  private updateQualityMenu(): void {
    if (!this.player || this.currentLevels.length === 0) return;

    const submenu = [
      {
        id: 'hls-quality-auto',
        label: 'Auto',
        onClick: () => this.setAutoQuality(),
        isActive: () => this.isAutoLevel,
      },
      ...this.currentLevels.map((level, index) => ({
        id: `hls-quality-${index}`,
        label: `${level.height}p (${Math.round(level.bitrate / 1000)}kbps)`,
        onClick: () => this.setQuality(index),
        isActive: () => !this.isAutoLevel && this.hls?.currentLevel === index,
      })),
    ];

    this.player.addMenuItem({
      id: 'hls-quality',
      label: 'Quality',
      icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm4-4H6v-2h10v2zm0-4H6V7h10v2z"/></svg>`,
      onClick: () => {},
      submenu,
    });
  }

  private setQuality(level: number): void {
    if (!this.hls) return;
    this.isAutoLevel = false;
    this.hls.currentLevel = level;
  }

  private setAutoQuality(): void {
    if (!this.hls) return;
    this.isAutoLevel = true;
    this.hls.currentLevel = -1;
  }

  private destroyHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    this.currentLevels = [];
    this.isAutoLevel = true;
  }

  getLevels(): HlsLevel[] {
    return this.currentLevels;
  }

  getCurrentLevel(): number {
    return this.hls?.currentLevel ?? -1;
  }

  isAuto(): boolean {
    return this.isAutoLevel;
  }

  destroy(): void {
    if (this.player) {
      this.player.removeMenuItem('hls-quality');
    }
    this.destroyHls();
    this.player = null;
  }
}
