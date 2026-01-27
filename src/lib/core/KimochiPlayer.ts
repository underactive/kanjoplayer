/**
 * KimochiPlayer - Main player engine
 */

import { EventEmitter } from './EventEmitter';
import { MediaController } from './MediaController';
import { StateManager } from './StateManager';
import type {
  KimochiPlayerOptions,
  KimochiPlayerState,
  KimochiPlayerEvents,
  KimochiPlayerAPI,
  KimochiPlugin,
  ToolbarButtonConfig,
  MenuItemConfig,
  ThumbnailData,
} from './types';

export class KimochiPlayer extends EventEmitter<KimochiPlayerEvents> implements KimochiPlayerAPI {
  private container: HTMLElement;
  private video: HTMLVideoElement;
  private mediaController: MediaController;
  private stateManager: StateManager;
  private plugins: Map<string, KimochiPlugin> = new Map();
  private options: Required<KimochiPlayerOptions>;
  private controlsOverlay: HTMLElement | null = null;
  private controlsTimeout: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  // UI extension points
  private toolbarButtons: Map<string, ToolbarButtonConfig> = new Map();
  private menuItems: Map<string, MenuItemConfig> = new Map();

  // Thumbnail manager (lazy loaded)
  private thumbnailManager: unknown = null;

  constructor(options: KimochiPlayerOptions) {
    super();

    // Merge with defaults
    this.options = this.mergeOptions(options);

    // Get or create container
    this.container = this.resolveContainer(options.container);
    this.container.classList.add('kimochi-player');
    if (this.options.theme) {
      this.container.classList.add(`kimochi-theme-${this.options.theme}`);
    }
    if (this.options.className) {
      this.container.classList.add(this.options.className);
    }

    // Create video element
    this.video = this.createVideoElement();
    this.container.appendChild(this.video);

    // Initialize state manager
    this.stateManager = new StateManager({
      src: this.options.src || '',
      volume: this.options.volume,
      muted: this.options.muted,
    });

    // Initialize media controller
    this.mediaController = new MediaController(this.video, this.stateManager);
    this.bindMediaEvents();

    // Subscribe to state changes
    this.stateManager.subscribe((state) => {
      this.emit('statechange', state);
    });

    // Initialize controls overlay
    if (this.options.controls) {
      this.initControls();
    }

    // Initialize fullscreen handlers
    this.initFullscreen();

    // Load plugins first, then set initial source
    // This ensures HLS plugin is ready before HLS sources are set
    this.loadPlugins().then(() => {
      if (this.options.src) {
        this.setSrc(this.options.src, this.options.sourceType);
      }
    });
  }

  // ============================================================================
  // Initialization Helpers
  // ============================================================================

  private mergeOptions(options: KimochiPlayerOptions): Required<KimochiPlayerOptions> {
    const defaults: Omit<Required<KimochiPlayerOptions>, 'container'> = {
      src: '',
      sourceType: 'mp4',
      autoplay: false,
      muted: false,
      controls: true,
      volume: 1,
      poster: '',
      loop: false,
      preload: 'metadata',
      theme: 'dark',
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
        text: 'Downloaded from KimochiPlayer PoC',
        fontSize: 18,
        color: 'white',
        opacity: 0.5,
        position: 'bottom-right',
        padding: 10,
      },
      customButtons: {
        enabled: false,
        buttons: [],
      },
      plugins: [],
      className: '',
      keyboardShortcuts: true,
      doubleClickFullscreen: true,
      controlsTimeout: 3000,
    };

    return {
      ...defaults,
      ...options,
      thumbnails: {
        ...defaults.thumbnails,
        ...options.thumbnails,
      },
      settings: {
        ...defaults.settings,
        ...options.settings,
      },
      watermark: {
        ...defaults.watermark,
        ...options.watermark,
      },
      customButtons: {
        ...defaults.customButtons,
        ...options.customButtons,
      },
    } as Required<KimochiPlayerOptions>;
  }

  private resolveContainer(container: HTMLElement | string): HTMLElement {
    if (typeof container === 'string') {
      const el = document.querySelector<HTMLElement>(container);
      if (!el) {
        throw new Error(`Container element not found: ${container}`);
      }
      return el;
    }
    return container;
  }

  private createVideoElement(): HTMLVideoElement {
    const video = document.createElement('video');
    video.className = 'kimochi-video';
    video.playsInline = true;
    video.preload = this.options.preload;
    // Enable CORS for cross-origin HLS streams
    video.crossOrigin = 'anonymous';

    if (this.options.poster) {
      video.poster = this.options.poster;
    }
    if (this.options.loop) {
      video.loop = true;
    }
    if (this.options.muted) {
      video.muted = true;
    }
    if (this.options.autoplay) {
      video.autoplay = true;
    }

    video.volume = this.options.volume;

    return video;
  }

  private bindMediaEvents(): void {
    // Forward media controller events
    const forwardEvents: (keyof KimochiPlayerEvents)[] = [
      'play', 'pause', 'ended', 'timeupdate', 'seeking', 'seeked',
      'ratechange', 'loadstart', 'loadedmetadata', 'loadeddata',
      'canplay', 'canplaythrough', 'waiting', 'playing', 'progress',
      'volumechange', 'error', 'enterpictureinpicture', 'leavepictureinpicture',
    ];

    forwardEvents.forEach((event) => {
      this.mediaController.on(event as keyof typeof this.mediaController extends EventEmitter<infer E> ? keyof E : never, (data: unknown) => {
        this.emit(event, data as KimochiPlayerEvents[typeof event]);
      });
    });
  }

  private async initControls(): Promise<void> {
    // Dynamically import ControlsOverlay to avoid circular dependencies
    const { ControlsOverlay } = await import('../ui/ControlsOverlay');
    this.controlsOverlay = new ControlsOverlay(this, this.container, {
      settings: this.options.settings,
      watermark: this.options.watermark,
      customButtons: this.options.customButtons,
    }).getElement();

    // Setup controls visibility
    this.setupControlsVisibility();
  }

  private setupControlsVisibility(): void {
    let isMouseInside = false;

    const showControls = () => {
      if (this.controlsTimeout) {
        clearTimeout(this.controlsTimeout);
        this.controlsTimeout = null;
      }

      this.stateManager.setState({ controlsVisible: true });
      this.emit('controlsshow', undefined);
    };

    const hideControls = () => {
      // Never hide if mouse is inside or video is paused
      if (isMouseInside || this.stateManager.get('paused')) {
        return;
      }

      this.stateManager.setState({ controlsVisible: false });
      this.emit('controlshide', undefined);
    };

    const scheduleHide = () => {
      if (this.controlsTimeout) {
        clearTimeout(this.controlsTimeout);
      }

      if (!isMouseInside && !this.stateManager.get('paused')) {
        this.controlsTimeout = setTimeout(hideControls, this.options.controlsTimeout);
      }
    };

    this.container.addEventListener('mousemove', () => {
      showControls();
      // Reset hide timer on mouse move, but only if mouse will eventually leave
    });

    this.container.addEventListener('mouseenter', () => {
      isMouseInside = true;
      showControls();
    });

    this.container.addEventListener('mouseleave', () => {
      isMouseInside = false;
      scheduleHide();
    });

    // Keep controls visible when paused
    this.on('pause', () => {
      if (this.controlsTimeout) {
        clearTimeout(this.controlsTimeout);
        this.controlsTimeout = null;
      }
      this.stateManager.setState({ controlsVisible: true });
    });

    // Schedule hide when playback starts (if mouse is outside)
    this.on('play', () => {
      scheduleHide();
    });

    // Double-click fullscreen
    if (this.options.doubleClickFullscreen) {
      this.video.addEventListener('dblclick', () => {
        this.toggleFullscreen();
      });
    }

    // Single click play/pause
    this.video.addEventListener('click', () => {
      this.togglePlay();
    });
  }

  private initFullscreen(): void {
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      this.stateManager.setState({ isFullscreen });
      this.emit('fullscreenchange', { isFullscreen });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  }

  private async loadPlugins(): Promise<void> {
    // Load built-in keyboard plugin if enabled
    if (this.options.keyboardShortcuts) {
      const { KeyboardPlugin } = await import('../plugins/built-in/KeyboardPlugin');
      await this.use(new KeyboardPlugin());
    }

    // Load user-provided plugins
    for (const plugin of this.options.plugins || []) {
      await this.use(plugin);
    }
  }

  // ============================================================================
  // Playback Control (KimochiPlayerAPI)
  // ============================================================================

  async play(): Promise<void> {
    return this.mediaController.play();
  }

  pause(): void {
    this.mediaController.pause();
  }

  async togglePlay(): Promise<void> {
    return this.mediaController.togglePlay();
  }

  seek(time: number): void {
    this.mediaController.seek(time);
  }

  seekPercent(percent: number): void {
    this.mediaController.seekPercent(percent);
  }

  forward(seconds = 10): void {
    this.mediaController.forward(seconds);
  }

  backward(seconds = 10): void {
    this.mediaController.backward(seconds);
  }

  // ============================================================================
  // Volume Control (KimochiPlayerAPI)
  // ============================================================================

  setVolume(volume: number): void {
    this.mediaController.setVolume(volume);
  }

  getVolume(): number {
    return this.mediaController.getVolume();
  }

  mute(): void {
    this.mediaController.mute();
  }

  unmute(): void {
    this.mediaController.unmute();
  }

  toggleMute(): void {
    this.mediaController.toggleMute();
  }

  // ============================================================================
  // Playback Rate (KimochiPlayerAPI)
  // ============================================================================

  setPlaybackRate(rate: number): void {
    this.mediaController.setPlaybackRate(rate);
  }

  getPlaybackRate(): number {
    return this.mediaController.getPlaybackRate();
  }

  // ============================================================================
  // Fullscreen (KimochiPlayerAPI)
  // ============================================================================

  async enterFullscreen(): Promise<void> {
    const container = this.container as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };

    if (container.requestFullscreen) {
      await container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      await container.webkitRequestFullscreen();
    }
  }

  async exitFullscreen(): Promise<void> {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void>;
    };

    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    }
  }

  async toggleFullscreen(): Promise<void> {
    if (this.stateManager.get('isFullscreen')) {
      await this.exitFullscreen();
    } else {
      await this.enterFullscreen();
    }
  }

  // ============================================================================
  // Picture-in-Picture (KimochiPlayerAPI)
  // ============================================================================

  async enterPiP(): Promise<void> {
    return this.mediaController.enterPiP();
  }

  async exitPiP(): Promise<void> {
    return this.mediaController.exitPiP();
  }

  async togglePiP(): Promise<void> {
    return this.mediaController.togglePiP();
  }

  // ============================================================================
  // Source (KimochiPlayerAPI)
  // ============================================================================

  setSrc(src: string, type?: 'mp4' | 'webm' | 'hls'): void {
    const sourceType = type || this.detectSourceType(src);
    this.stateManager.setState({ src, sourceType });

    if (sourceType === 'hls') {
      // HLS will be handled by HlsPlugin
      this.emit('sourcechange', { src, type: 'hls' });
    } else {
      this.video.src = src;
      this.emit('sourcechange', { src, type: sourceType });
    }
  }

  getSrc(): string {
    return this.stateManager.get('src');
  }

  private detectSourceType(src: string): 'mp4' | 'webm' | 'hls' {
    const url = src.toLowerCase();
    if (url.includes('.m3u8') || url.includes('m3u8')) {
      return 'hls';
    }
    if (url.includes('.webm')) {
      return 'webm';
    }
    return 'mp4';
  }

  // ============================================================================
  // State (KimochiPlayerAPI)
  // ============================================================================

  getState(): KimochiPlayerState {
    return this.stateManager.getState();
  }

  isPlaying(): boolean {
    return this.mediaController.isPlaying();
  }

  isPaused(): boolean {
    return this.mediaController.isPaused();
  }

  isEnded(): boolean {
    return this.mediaController.isEnded();
  }

  getCurrentTime(): number {
    return this.mediaController.getCurrentTime();
  }

  getDuration(): number {
    return this.mediaController.getDuration();
  }

  // ============================================================================
  // UI Customization (KimochiPlayerAPI)
  // ============================================================================

  addToolbarButton(config: ToolbarButtonConfig): void {
    this.toolbarButtons.set(config.id, config);
    // Notify controls overlay to update
    this.emit('statechange', this.getState());
  }

  removeToolbarButton(id: string): void {
    this.toolbarButtons.delete(id);
    this.emit('statechange', this.getState());
  }

  addMenuItem(config: MenuItemConfig): void {
    this.menuItems.set(config.id, config);
    this.emit('statechange', this.getState());
  }

  removeMenuItem(id: string): void {
    this.menuItems.delete(id);
    this.emit('statechange', this.getState());
  }

  getToolbarButtons(): ToolbarButtonConfig[] {
    return Array.from(this.toolbarButtons.values());
  }

  getMenuItems(): MenuItemConfig[] {
    return Array.from(this.menuItems.values());
  }

  // ============================================================================
  // Plugins (KimochiPlayerAPI)
  // ============================================================================

  async use(plugin: KimochiPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already installed`);
      return;
    }

    try {
      await plugin.install(this);
      this.plugins.set(plugin.name, plugin);

      // Register UI extensions
      if (plugin.ui?.toolbarButtons) {
        plugin.ui.toolbarButtons.forEach((btn) => this.addToolbarButton(btn));
      }
      if (plugin.ui?.menuItems) {
        plugin.ui.menuItems.forEach((item) => this.addMenuItem(item));
      }

      this.emit('pluginloaded', { name: plugin.name });
    } catch (error) {
      this.emit('pluginerror', { name: plugin.name, error: error as Error });
      throw error;
    }
  }

  getPlugin<T extends KimochiPlugin>(name: string): T | undefined {
    return this.plugins.get(name) as T | undefined;
  }

  // ============================================================================
  // Thumbnails (KimochiPlayerAPI)
  // ============================================================================

  async getThumbnail(time: number): Promise<ThumbnailData | null> {
    if (!this.options.thumbnails?.enabled) {
      return null;
    }

    // Lazy load thumbnail manager
    if (!this.thumbnailManager) {
      const { ThumbnailManager } = await import('../thumbnails/ThumbnailManager');
      this.thumbnailManager = new ThumbnailManager(this, this.options.thumbnails);
    }

    return (this.thumbnailManager as { getThumbnail: (time: number) => Promise<ThumbnailData | null> }).getThumbnail(time);
  }

  // ============================================================================
  // Internal Access (KimochiPlayerAPI)
  // ============================================================================

  getVideoElement(): HTMLVideoElement {
    return this.video;
  }

  getContainerElement(): HTMLElement {
    return this.container;
  }

  getStateManager(): StateManager {
    return this.stateManager;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Clear controls timeout
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }

    // Destroy plugins
    this.plugins.forEach((plugin) => {
      if (plugin.destroy) {
        plugin.destroy();
      }
    });
    this.plugins.clear();

    // Destroy media controller
    this.mediaController.destroy();

    // Remove video element
    this.video.pause();
    this.video.src = '';
    this.video.remove();

    // Remove controls overlay
    if (this.controlsOverlay) {
      this.controlsOverlay.remove();
    }

    // Clear container
    this.container.innerHTML = '';
    this.container.classList.remove('kimochi-player');

    // Clear event listeners
    this.removeAllListeners();

    // Clear UI extensions
    this.toolbarButtons.clear();
    this.menuItems.clear();
  }
}
