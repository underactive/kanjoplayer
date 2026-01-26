/**
 * KimochiPlayer - Framework-agnostic video player library
 *
 * @packageDocumentation
 */

// Core exports
export { KimochiPlayer } from './core/KimochiPlayer';
export { EventEmitter } from './core/EventEmitter';
export { StateManager, createInitialState } from './core/StateManager';
export { MediaController } from './core/MediaController';

// Type exports
export type {
  KimochiPlayerOptions,
  KimochiPlayerState,
  KimochiPlayerEvents,
  KimochiPlayerAPI,
  KimochiPlugin,
  ToolbarButtonConfig,
  MenuItemConfig,
  ThumbnailConfig,
  ThumbnailData,
  TimeRangeInfo,
  HlsLevel,
} from './core/types';

// Plugin types
export type { PluginContext } from './plugins/types';

// UI exports (for advanced usage)
export { ControlsOverlay } from './ui/ControlsOverlay';
export { UIBuilder } from './ui/UIBuilder';

// Built-in plugins
export { HlsPlugin } from './plugins/built-in/HlsPlugin';
export { KeyboardPlugin } from './plugins/built-in/KeyboardPlugin';

// Thumbnail exports (for advanced usage)
export { ThumbnailManager } from './thumbnails/ThumbnailManager';

// Web Component
export { KimochiPlayerElement } from './web-component/KimochiPlayerElement';
