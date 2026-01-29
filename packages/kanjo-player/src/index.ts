/**
 * KanjoPlayer - Framework-agnostic video player library
 *
 * @packageDocumentation
 */

// Import styles so they get bundled
import './styles/kanjo-player.css';

// Core exports
export { KanjoPlayer } from './core/KanjoPlayer';
export { EventEmitter } from './core/EventEmitter';
export { StateManager, createInitialState } from './core/StateManager';
export { MediaController } from './core/MediaController';
export { CodecCapabilities } from './core/CodecCapabilities';

// Type exports
export type {
  KanjoPlayerOptions,
  KanjoPlayerState,
  KanjoPlayerEvents,
  KanjoPlayerAPI,
  KanjoPlugin,
  ToolbarButtonConfig,
  MenuItemConfig,
  ThumbnailConfig,
  ThumbnailData,
  TimeRangeInfo,
  HlsLevel,
  DashQuality,
  VideoCodec,
  VideoContainer,
  CodecSupport,
  CodecCapabilitiesResult,
  CodecsConfig,
} from './core/types';

// Plugin types
export type { PluginContext } from './plugins/types';

// UI exports (for advanced usage)
export { ControlsOverlay } from './ui/ControlsOverlay';
export { UIBuilder } from './ui/UIBuilder';

// Built-in plugins
export { HlsPlugin } from './plugins/built-in/HlsPlugin';
export { DashPlugin } from './plugins/built-in/DashPlugin';
export { KeyboardPlugin } from './plugins/built-in/KeyboardPlugin';

// Thumbnail exports (for advanced usage)
export { ThumbnailManager } from './thumbnails/ThumbnailManager';

// Web Component
export { KanjoPlayerElement } from './web-component/KanjoPlayerElement';
