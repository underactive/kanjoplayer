/**
 * Core types for KanjoPlayer
 */

// ============================================================================
// Player Configuration
// ============================================================================

export interface ThumbnailConfig {
  /** Enable thumbnail previews on scrubber hover */
  enabled: boolean;
  /** WebVTT file URL for sprite-based thumbnails (HLS fallback) */
  vttUrl?: string;
  /** Sprite image URL for WebVTT thumbnails */
  spriteUrl?: string;
  /** Use WASM extraction for MP4/WebM (default: true if available) */
  useWasm?: boolean;
  /** Number of thumbnails to cache (default: 50) */
  cacheSize?: number;
  /** Thumbnail width in pixels (default: 160) */
  width?: number;
  /** Thumbnail height in pixels (default: 90) */
  height?: number;
}

export interface SettingsMenuConfig {
  /** Show settings button (default: true) */
  enabled?: boolean;
  /** Show playback speed option (default: true) */
  showSpeed?: boolean;
  /** Show Picture-in-Picture option (default: true) */
  showPiP?: boolean;
  /** Show download option (default: false) */
  showDownload?: boolean;
  /** Show video adjustments option (default: true) */
  showAdjustments?: boolean;
}

// ============================================================================
// Custom Buttons Configuration
// ============================================================================

/** Player properties that can be used as event values */
export type PlayerProperty =
  | 'src'
  | 'currentTime'
  | 'duration'
  | 'volume'
  | 'playbackRate';

export interface CustomButtonConfig {
  /** Unique identifier for the button */
  id: string;
  /** CSS class for icon (e.g., "hero-bookmark-solid") */
  iconClass?: string;
  /** Button text label */
  text?: string;
  /** How to display the button content */
  displayMode: 'icon' | 'icon-text' | 'text';
  /** Event name to emit when clicked (e.g., "bookmark_movie") */
  eventKey: string;
  /** Static value or player property name to include in event */
  eventValue?: string | PlayerProperty;
  /** Optional hover tooltip */
  tooltip?: string;
}

export interface CustomButtonsConfig {
  /** Enable custom button area (default: false) */
  enabled?: boolean;
  /** Array of button configurations */
  buttons: CustomButtonConfig[];
}

export interface WatermarkConfig {
  /** Enable watermark on downloaded clips (default: true) */
  enabled?: boolean;
  /** Watermark text */
  text?: string;
  /** Font size in pixels (default: 18) */
  fontSize?: number;
  /** Text color (default: 'white') */
  color?: string;
  /** Text opacity 0-1 (default: 0.5) */
  opacity?: number;
  /** Position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' (default: 'bottom-right') */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Padding from edge in pixels (default: 10) */
  padding?: number;
}

export interface SkipControlConfig {
  /** Enable skip controls (default: false) */
  enabled?: boolean;
  /** Available skip durations in seconds (default: [5, 10, 15, 30, 60]) */
  durations?: number[];
  /** Default skip duration in seconds (default: 10) */
  defaultDuration?: number;
}

export interface AirPlayConfig {
  /** Enable AirPlay button (default: false, shows only when available) */
  enabled?: boolean;
}

export interface CastConfig {
  /** Enable Cast button (default: false, shows only when available) */
  enabled?: boolean;
  /** Cast receiver application ID (default: uses default media receiver) */
  receiverApplicationId?: string;
}

export interface KanjoPlayerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Video source URL */
  src?: string;
  /** Video source type (auto-detected if not specified) */
  sourceType?: 'mp4' | 'webm' | 'hls';
  /** Autoplay video (muted required for most browsers) */
  autoplay?: boolean;
  /** Start muted */
  muted?: boolean;
  /** Show controls overlay */
  controls?: boolean;
  /** Initial volume (0-1) */
  volume?: number;
  /** Poster image URL */
  poster?: string;
  /** Loop video playback */
  loop?: boolean;
  /** Preload behavior */
  preload?: 'none' | 'metadata' | 'auto';
  /** UI theme */
  theme?: 'dark' | 'light';
  /** Thumbnail preview configuration */
  thumbnails?: ThumbnailConfig;
  /** Settings menu configuration */
  settings?: SettingsMenuConfig;
  /** Watermark configuration for downloaded clips */
  watermark?: WatermarkConfig;
  /** Custom buttons configuration */
  customButtons?: CustomButtonsConfig;
  /** Skip controls configuration */
  skipControls?: SkipControlConfig;
  /** AirPlay configuration (Safari only) */
  airPlay?: AirPlayConfig;
  /** Google Cast configuration */
  cast?: CastConfig;
  /** Plugins to load */
  plugins?: KanjoPlugin[];
  /** Custom CSS class for container */
  className?: string;
  /** Keyboard shortcuts enabled */
  keyboardShortcuts?: boolean;
  /** Double-click to toggle fullscreen */
  doubleClickFullscreen?: boolean;
  /** Hide controls timeout in ms (default: 3000) */
  controlsTimeout?: number;
}

// ============================================================================
// Player State
// ============================================================================

export interface KanjoPlayerState {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Video is paused */
  paused: boolean;
  /** Video has ended */
  ended: boolean;
  /** Current volume (0-1) */
  volume: number;
  /** Audio is muted */
  muted: boolean;
  /** Playback rate (1 = normal) */
  playbackRate: number;
  /** Player is in fullscreen mode */
  isFullscreen: boolean;
  /** Video is loading/buffering */
  isLoading: boolean;
  /** Video is waiting for data */
  isWaiting: boolean;
  /** Video is seeking */
  isSeeking: boolean;
  /** Video is ready to play */
  isReady: boolean;
  /** Current source URL */
  src: string;
  /** Current source type */
  sourceType: 'mp4' | 'webm' | 'hls' | null;
  /** Buffered time ranges */
  buffered: TimeRangeInfo[];
  /** Seekable time ranges */
  seekable: TimeRangeInfo[];
  /** Video width */
  videoWidth: number;
  /** Video height */
  videoHeight: number;
  /** Error state */
  error: MediaError | null;
  /** Picture-in-Picture active */
  isPiP: boolean;
  /** Controls are visible */
  controlsVisible: boolean;
}

export interface TimeRangeInfo {
  start: number;
  end: number;
}

// ============================================================================
// Events
// ============================================================================

export interface KanjoPlayerEvents {
  // Playback events
  play: void;
  pause: void;
  ended: void;
  timeupdate: { currentTime: number; duration: number };
  seeking: { time: number };
  seeked: { time: number };
  ratechange: { rate: number };

  // Loading events
  loadstart: void;
  loadedmetadata: { duration: number; videoWidth: number; videoHeight: number };
  loadeddata: void;
  canplay: void;
  canplaythrough: void;
  waiting: void;
  playing: void;
  progress: { buffered: TimeRangeInfo[] };

  // Volume events
  volumechange: { volume: number; muted: boolean };

  // State events
  statechange: KanjoPlayerState;
  fullscreenchange: { isFullscreen: boolean };
  enterpictureinpicture: void;
  leavepictureinpicture: void;

  // Error events
  error: { code: number; message: string };

  // UI events
  controlsshow: void;
  controlshide: void;

  // Source events
  sourcechange: { src: string; type: string };

  // Plugin events
  pluginloaded: { name: string };
  pluginerror: { name: string; error: Error };

  // HLS-specific events (from HlsPlugin)
  hlsmanifestparsed: { levels: HlsLevel[] };
  hlslevelswitch: { level: number; auto: boolean };
  hlserror: { type: string; details: string; fatal: boolean };

  // A/B Loop events
  setloopstart: void;
  setloopend: void;
  clearloop: void;
  toggleloop: void;

  // Custom button events
  custombuttonevent: {
    buttonId: string;
    eventKey: string;
    value: unknown;
  };
}

export interface HlsLevel {
  bitrate: number;
  width: number;
  height: number;
  name: string;
}

// ============================================================================
// Plugin System
// ============================================================================

export interface KanjoPlugin {
  /** Unique plugin name */
  name: string;
  /** Plugin version */
  version?: string;
  /** Install plugin (called when player initializes) */
  install(player: KanjoPlayerAPI): void | Promise<void>;
  /** Cleanup plugin (called when player destroys) */
  destroy?(): void;
  /** UI extensions */
  ui?: {
    toolbarButtons?: ToolbarButtonConfig[];
    menuItems?: MenuItemConfig[];
  };
}

export interface ToolbarButtonConfig {
  /** Unique button ID */
  id: string;
  /** Position in toolbar */
  position: 'left' | 'right';
  /** Button icon (SVG string or element) */
  icon: string | HTMLElement;
  /** Tooltip text */
  tooltip?: string;
  /** Click handler */
  onClick: () => void;
  /** Dynamic icon update function */
  getIcon?: () => string | HTMLElement;
  /** Whether button is active/pressed */
  isActive?: () => boolean;
  /** Order within position group (lower = first) */
  order?: number;
}

export interface MenuItemConfig {
  /** Unique item ID */
  id: string;
  /** Display label */
  label: string;
  /** Item icon (optional) */
  icon?: string | HTMLElement;
  /** Click handler */
  onClick: () => void;
  /** Whether item is currently selected/active */
  isActive?: () => boolean;
  /** Submenu items */
  submenu?: MenuItemConfig[];
  /** Divider before this item */
  divider?: boolean;
}

// ============================================================================
// Public API Interface
// ============================================================================

export interface KanjoPlayerAPI {
  // Playback control
  play(): Promise<void>;
  pause(): void;
  togglePlay(): Promise<void>;
  seek(time: number): void;
  seekPercent(percent: number): void;
  forward(seconds?: number): void;
  backward(seconds?: number): void;

  // Volume control
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unmute(): void;
  toggleMute(): void;

  // Playback rate
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;

  // Fullscreen
  enterFullscreen(): Promise<void>;
  exitFullscreen(): Promise<void>;
  toggleFullscreen(): Promise<void>;

  // Picture-in-Picture
  enterPiP(): Promise<void>;
  exitPiP(): Promise<void>;
  togglePiP(): Promise<void>;

  // Source
  setSrc(src: string, type?: 'mp4' | 'webm' | 'hls'): void;
  getSrc(): string;

  // State
  getState(): KanjoPlayerState;
  isPlaying(): boolean;
  isPaused(): boolean;
  isEnded(): boolean;

  // Time
  getCurrentTime(): number;
  getDuration(): number;

  // Events
  on<K extends keyof KanjoPlayerEvents>(
    event: K,
    handler: (data: KanjoPlayerEvents[K]) => void
  ): void;
  off<K extends keyof KanjoPlayerEvents>(
    event: K,
    handler: (data: KanjoPlayerEvents[K]) => void
  ): void;
  once<K extends keyof KanjoPlayerEvents>(
    event: K,
    handler: (data: KanjoPlayerEvents[K]) => void
  ): void;

  // UI customization
  addToolbarButton(config: ToolbarButtonConfig): void;
  removeToolbarButton(id: string): void;
  addMenuItem(config: MenuItemConfig): void;
  removeMenuItem(id: string): void;

  // Plugins
  use(plugin: KanjoPlugin): Promise<void>;
  getPlugin<T extends KanjoPlugin>(name: string): T | undefined;

  // Thumbnails
  getThumbnail(time: number): Promise<ThumbnailData | null>;

  // Lifecycle
  destroy(): void;

  // Internal access
  getVideoElement(): HTMLVideoElement;
  getContainerElement(): HTMLElement;
}

export interface ThumbnailData {
  /** Image URL or data URI */
  url: string;
  /** Time this thumbnail represents */
  time: number;
  /** Thumbnail width */
  width: number;
  /** Thumbnail height */
  height: number;
  /** Sprite coordinates (if from sprite sheet) */
  sprite?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ============================================================================
// Internal Types
// ============================================================================

export type EventHandler<T> = (data: T) => void;

export interface StateSubscriber {
  (state: KanjoPlayerState): void;
}

export const DEFAULT_OPTIONS: Partial<KanjoPlayerOptions> = {
  autoplay: false,
  muted: false,
  controls: true,
  volume: 1,
  loop: false,
  preload: 'metadata',
  theme: 'dark',
  keyboardShortcuts: true,
  doubleClickFullscreen: true,
  controlsTimeout: 3000,
  thumbnails: {
    enabled: true,
    useWasm: true,
    cacheSize: 50,
    width: 160,
    height: 90,
  },
  settings: {
    enabled: true,
    showSpeed: true,
    showPiP: true,
    showDownload: false,
  },
  watermark: {
    enabled: true,
    text: 'Downloaded from KanjoPlayer PoC',
    fontSize: 18,
    color: 'white',
    opacity: 0.5,
    position: 'bottom-right',
    padding: 10,
  },
  skipControls: {
    enabled: false,
    durations: [5, 10, 15, 30, 60],
    defaultDuration: 10,
  },
  airPlay: {
    enabled: false,
  },
  cast: {
    enabled: false,
  },
};
