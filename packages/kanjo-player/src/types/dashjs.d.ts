/**
 * Type declarations for dashjs (optional peer dependency)
 */

declare module 'dashjs' {
  interface DashConfig {
    debug?: {
      logLevel?: number;
    };
    streaming?: {
      buffer?: {
        bufferTimeAtTopQuality?: number;
        bufferTimeAtTopQualityLongForm?: number;
        initialBufferLevel?: number;
        stableBufferTime?: number;
      };
      abr?: {
        autoSwitchBitrate?: {
          video?: boolean;
          audio?: boolean;
        };
        initialBitrate?: {
          video?: number;
          audio?: number;
        };
      };
      retryAttempts?: {
        MPD?: number;
        MediaSegment?: number;
        InitializationSegment?: number;
      };
    };
  }

  interface BitrateInfo {
    bitrate: number;
    width: number;
    height: number;
    qualityIndex: number;
    mediaType: 'video' | 'audio';
  }

  interface MediaPlayerClass {
    initialize(video: HTMLVideoElement, url: string, autoPlay?: boolean): void;
    attachView(video: HTMLVideoElement): void;
    attachSource(url: string): void;
    reset(): void;
    destroy(): void;
    updateSettings(settings: DashConfig): void;
    getBitrateInfoListFor(type: 'video' | 'audio'): BitrateInfo[];
    getQualityFor(type: 'video' | 'audio'): number;
    setQualityFor(type: 'video' | 'audio', quality: number, replace?: boolean): void;
    getAutoSwitchQualityFor(type: 'video' | 'audio'): boolean;
    setAutoSwitchQualityFor(type: 'video' | 'audio', value: boolean): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
    getSettings(): DashConfig;
  }

  interface MediaPlayerFactory {
    create(): MediaPlayerClass;
  }

  interface Debug {
    LOG_LEVEL_NONE: number;
    LOG_LEVEL_FATAL: number;
    LOG_LEVEL_ERROR: number;
    LOG_LEVEL_WARNING: number;
    LOG_LEVEL_INFO: number;
    LOG_LEVEL_DEBUG: number;
  }

  interface DashJsModule {
    MediaPlayer(): MediaPlayerFactory;
    Debug: Debug;
  }

  const dashjs: DashJsModule;
  export default dashjs;
  export { DashConfig, BitrateInfo, MediaPlayerClass, MediaPlayerFactory, Debug };
}
