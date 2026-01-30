/**
 * DASH.js Plugin for DASH streaming support
 */

import type { KanjoPlugin, DashQuality } from '../../core/types';
import type { KanjoPlayer } from '../../core/KanjoPlayer';
import type { DashConfig, MediaPlayerClass } from 'dashjs';

// Re-export for internal use
type DashInstance = MediaPlayerClass;

interface DashJsStatic {
  MediaPlayer(): {
    create(): DashInstance;
  };
  Debug?: {
    LOG_LEVEL_NONE: number;
    LOG_LEVEL_FATAL: number;
    LOG_LEVEL_ERROR: number;
    LOG_LEVEL_WARNING: number;
    LOG_LEVEL_INFO: number;
    LOG_LEVEL_DEBUG: number;
  };
}

declare global {
  interface Window {
    dashjs?: DashJsStatic;
  }
}

export interface DashPluginOptions {
  /** dash.js configuration */
  dashConfig?: DashConfig;
  /** Auto-recover from errors */
  autoRecover?: boolean;
  /** Enable quality selector in settings */
  qualitySelector?: boolean;
}

export class DashPlugin implements KanjoPlugin {
  name = 'dash';
  version = '1.0.0';

  private player: KanjoPlayer | null = null;
  private dash: DashInstance | null = null;
  private options: DashPluginOptions;
  private dashjs: DashJsStatic | null = null;
  private currentQualities: DashQuality[] = [];
  private isAutoQuality = true;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 3;

  constructor(options: DashPluginOptions = {}) {
    this.options = {
      autoRecover: true,
      qualitySelector: true,
      ...options,
    };
  }

  async install(player: KanjoPlayer): Promise<void> {
    this.player = player as KanjoPlayer;

    // Try to get dash.js
    this.dashjs = await this.getDashJs();

    if (!this.dashjs) {
      console.warn('dash.js not available. DASH streams will not work.');
      return;
    }

    // Listen for source changes
    this.player.on('sourcechange', this.handleSourceChange.bind(this));

    // Check if current source is DASH
    const state = this.player.getState();
    if (state.sourceType === 'dash' && state.src) {
      this.loadDashSource(state.src);
    }

    // Add quality selector menu items
    if (this.options.qualitySelector) {
      this.addQualitySelector();
    }
  }

  private async getDashJs(): Promise<DashJsStatic | null> {
    // Check if already loaded globally
    if (window.dashjs) {
      return window.dashjs;
    }

    // Try to import from dashjs package
    try {
      const dashjsModule = await import('dashjs');
      const moduleAny = dashjsModule as Record<string, unknown>;

      // Debug: log the actual structure
      // console.log('dashjs module structure:', Object.keys(moduleAny), 'default keys:', moduleAny.default ? Object.keys(moduleAny.default as object) : 'N/A');

      // Handle different export structures from various bundlers:

      // 1. Standard ES module: { default: { MediaPlayer: fn, ... } }
      if (
        moduleAny.default &&
        typeof (moduleAny.default as DashJsStatic).MediaPlayer === 'function'
      ) {
        return moduleAny.default as DashJsStatic;
      }

      // 2. Named export: { MediaPlayer: fn, ... }
      if (typeof (moduleAny as unknown as DashJsStatic).MediaPlayer === 'function') {
        return moduleAny as unknown as DashJsStatic;
      }

      // 3. Vite wraps UMD as { default: <the whole module> } but the module itself
      //    might have __esModule flag or be structured differently
      if (moduleAny.default) {
        const defaultExport = moduleAny.default as Record<string, unknown>;

        // Check for nested structure: { default: { default: { MediaPlayer: fn } } }
        if (
          defaultExport.default &&
          typeof (defaultExport.default as DashJsStatic).MediaPlayer === 'function'
        ) {
          return defaultExport.default as DashJsStatic;
        }

        // Check if default has MediaPlayer directly (some bundler configs)
        if (typeof defaultExport.MediaPlayer === 'function') {
          return defaultExport as unknown as DashJsStatic;
        }

        // The UMD bundle might export the MediaPlayer factory result directly
        // In this case, we need to wrap it to match our interface
        if (typeof defaultExport.create === 'function') {
          // This is the MediaPlayer() factory result, not the dashjs object
          // We need to return a wrapper that provides the expected interface
          return {
            MediaPlayer: () => defaultExport as unknown as { create(): MediaPlayerClass },
            Debug: {
              LOG_LEVEL_NONE: 0,
              LOG_LEVEL_FATAL: 1,
              LOG_LEVEL_ERROR: 2,
              LOG_LEVEL_WARNING: 3,
              LOG_LEVEL_INFO: 4,
              LOG_LEVEL_DEBUG: 5,
            },
          } as DashJsStatic;
        }
      }

      console.warn('dashjs module found but MediaPlayer not accessible:', Object.keys(moduleAny));
      return null;
    } catch (e) {
      // dashjs not installed
      console.debug('dashjs not available:', e);
      return null;
    }
  }

  private handleSourceChange(data: { src: string; type: string }): void {
    if (data.type === 'dash') {
      this.loadDashSource(data.src);
    } else {
      this.destroyDash();
    }
  }

  private loadDashSource(src: string): void {
    if (!this.dashjs || !this.player) return;

    this.destroyDash();

    const video = this.player.getVideoElement();

    // Create dash.js MediaPlayer instance
    this.dash = this.dashjs.MediaPlayer().create();

    // Configure dash.js
    const defaultSettings: DashConfig = {
      debug: {
        logLevel: this.dashjs.Debug?.LOG_LEVEL_WARNING ?? 2,
      },
      streaming: {
        buffer: {
          bufferTimeAtTopQuality: 30,
          bufferTimeAtTopQualityLongForm: 60,
          initialBufferLevel: 4,
          stableBufferTime: 12,
        },
        abr: {
          autoSwitchBitrate: {
            video: true,
            audio: true,
          },
        },
        retryAttempts: {
          MPD: 3,
          MediaSegment: 3,
          InitializationSegment: 3,
        },
      },
    };

    const mergedSettings = this.mergeSettings(defaultSettings, this.options.dashConfig || {});
    this.dash.updateSettings(mergedSettings);

    this.bindDashEvents();

    // Initialize player with source
    this.dash.initialize(video, src, false);
  }

  private mergeSettings(base: DashConfig, override: DashConfig): DashConfig {
    return {
      debug: { ...base.debug, ...override.debug },
      streaming: {
        buffer: { ...base.streaming?.buffer, ...override.streaming?.buffer },
        abr: { ...base.streaming?.abr, ...override.streaming?.abr },
        retryAttempts: { ...base.streaming?.retryAttempts, ...override.streaming?.retryAttempts },
      },
    };
  }

  private bindDashEvents(): void {
    if (!this.dash || !this.player) return;

    // Manifest loaded
    this.dash.on('streamInitialized', () => {
      if (!this.dash || !this.player) return;

      const videoQualities = this.dash.getBitrateInfoListFor('video');
      this.currentQualities = videoQualities.map((q) => ({
        bitrate: q.bitrate,
        width: q.width,
        height: q.height,
        qualityIndex: q.qualityIndex,
        mediaType: 'video' as const,
      }));

      this.player.emit('dashmanifestparsed', { qualities: this.currentQualities });
      this.updateQualityMenu();
      this.recoveryAttempts = 0;
    });

    // Quality change
    this.dash.on('qualityChangeRendered', (...args: unknown[]) => {
      if (!this.player) return;
      const data = args[0] as { mediaType: string; newQuality: number };

      if (data.mediaType === 'video') {
        const quality = this.currentQualities.find((q) => q.qualityIndex === data.newQuality);
        if (quality) {
          this.player.emit('dashqualitychanged', {
            quality,
            auto: this.isAutoQuality,
          });
        }
      }
    });

    // Error handling
    this.dash.on('error', (...args: unknown[]) => {
      if (!this.player) return;
      const data = args[0] as { error?: { code?: number; message?: string } };
      const error = data.error || {};

      this.player.emit('dasherror', {
        code: error.code || 0,
        message: error.message || 'Unknown DASH error',
        fatal: true,
      });

      if (this.options.autoRecover) {
        this.handleError(error);
      }
    });
  }

  private handleError(error: { code?: number; message?: string }): void {
    if (!this.dash || !this.player) return;

    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      console.error('DASH: Max recovery attempts reached, giving up:', error.message);
      return;
    }

    this.recoveryAttempts++;
    console.warn(
      `DASH: Error occurred, attempting recovery (${this.recoveryAttempts}/${this.maxRecoveryAttempts}):`,
      error.message
    );

    // Try to reload the source
    const src = this.player.getSrc();
    if (src) {
      setTimeout(() => {
        if (this.dash && this.player) {
          this.dash.attachSource(src);
        }
      }, 1000 * this.recoveryAttempts); // Exponential backoff
    }
  }

  private addQualitySelector(): void {
    if (!this.player) return;

    this.player.addMenuItem({
      id: 'dash-quality',
      label: 'Quality',
      icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm4-4H6v-2h10v2zm0-4H6V7h10v2z"/></svg>`,
      onClick: () => {
        // Open quality submenu (handled by SettingsMenu)
      },
      submenu: [],
    });
  }

  private updateQualityMenu(): void {
    if (!this.player || this.currentQualities.length === 0) return;

    const submenu = [
      {
        id: 'dash-quality-auto',
        label: 'Auto',
        onClick: () => this.setAutoQuality(),
        isActive: () => this.isAutoQuality,
      },
      ...this.currentQualities
        .sort((a, b) => b.height - a.height) // Sort by resolution descending
        .map((quality) => ({
          id: `dash-quality-${quality.qualityIndex}`,
          label: `${quality.height}p (${Math.round(quality.bitrate / 1000)}kbps)`,
          onClick: () => this.setQuality(quality.qualityIndex),
          isActive: () =>
            !this.isAutoQuality && this.dash?.getQualityFor('video') === quality.qualityIndex,
        })),
    ];

    this.player.addMenuItem({
      id: 'dash-quality',
      label: 'Quality',
      icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm4-4H6v-2h10v2zm0-4H6V7h10v2z"/></svg>`,
      onClick: () => {},
      submenu,
    });
  }

  private setQuality(qualityIndex: number): void {
    if (!this.dash) return;
    this.isAutoQuality = false;
    this.dash.setAutoSwitchQualityFor('video', false);
    this.dash.setQualityFor('video', qualityIndex);
  }

  private setAutoQuality(): void {
    if (!this.dash) return;
    this.isAutoQuality = true;
    this.dash.setAutoSwitchQualityFor('video', true);
  }

  private destroyDash(): void {
    if (this.dash) {
      try {
        this.dash.reset();
        this.dash.destroy();
      } catch {
        // Ignore destroy errors
      }
      this.dash = null;
    }
    this.currentQualities = [];
    this.isAutoQuality = true;
    this.recoveryAttempts = 0;
  }

  getQualities(): DashQuality[] {
    return this.currentQualities;
  }

  getCurrentQuality(): number {
    return this.dash?.getQualityFor('video') ?? -1;
  }

  isAuto(): boolean {
    return this.isAutoQuality;
  }

  /**
   * Get the dash.js instance for advanced usage
   */
  getDashInstance(): DashInstance | null {
    return this.dash;
  }

  destroy(): void {
    if (this.player) {
      this.player.removeMenuItem('dash-quality');
    }
    this.destroyDash();
    this.player = null;
  }
}
