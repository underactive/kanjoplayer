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
export { KanjoPlayerElement } from './web-component/KanjoPlayerElement';

// Vue Component
export { default as KanjoPlayerVue } from './vue/KanjoPlayerVue.vue';
