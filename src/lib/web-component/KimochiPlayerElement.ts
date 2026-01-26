/**
 * KimochiPlayer Web Component
 * <kimochi-player src="video.mp4" controls></kimochi-player>
 */

/// <reference path="../vite-env.d.ts" />

import { KimochiPlayer } from '../core/KimochiPlayer';
import type { KimochiPlayerOptions, KimochiPlayerAPI } from '../core/types';

// Import styles - will be inlined by bundler
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - CSS imports handled by bundler
import styles from '../styles/kimochi-player.css?inline';

const OBSERVED_ATTRIBUTES = [
  'src',
  'autoplay',
  'muted',
  'controls',
  'loop',
  'poster',
  'preload',
  'theme',
  'volume',
  'playback-rate',
] as const;

type ObservedAttribute = (typeof OBSERVED_ATTRIBUTES)[number];

export class KimochiPlayerElement extends HTMLElement {
  static observedAttributes = OBSERVED_ATTRIBUTES;

  private player: KimochiPlayer | null = null;
  private container: HTMLDivElement | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.initializePlayer();
  }

  disconnectedCallback(): void {
    this.destroyPlayer();
  }

  attributeChangedCallback(
    name: ObservedAttribute,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue === newValue) return;
    if (!this.player) return;

    switch (name) {
      case 'src':
        if (newValue) {
          this.player.setSrc(newValue);
        }
        break;

      case 'muted':
        if (newValue !== null) {
          this.player.mute();
        } else {
          this.player.unmute();
        }
        break;

      case 'volume':
        if (newValue !== null) {
          const volume = parseFloat(newValue);
          if (!isNaN(volume)) {
            this.player.setVolume(volume);
          }
        }
        break;

      case 'playback-rate':
        if (newValue !== null) {
          const rate = parseFloat(newValue);
          if (!isNaN(rate)) {
            this.player.setPlaybackRate(rate);
          }
        }
        break;

      // Other attributes require re-initialization
      case 'autoplay':
      case 'controls':
      case 'loop':
      case 'poster':
      case 'preload':
      case 'theme':
        this.reinitializePlayer();
        break;
    }
  }

  private initializePlayer(): void {
    if (this.player) return;

    // Create style element
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = styles;
    this.shadowRoot!.appendChild(this.styleElement);

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'kimochi-player-wrapper';
    this.container.style.cssText = 'width: 100%; height: 100%;';
    this.shadowRoot!.appendChild(this.container);

    // Get options from attributes
    const options = this.getOptionsFromAttributes();

    // Create player
    this.player = new KimochiPlayer({
      ...options,
      container: this.container,
    });

    // Dispatch ready event
    this.dispatchEvent(
      new CustomEvent('ready', {
        detail: { player: this.player },
        bubbles: true,
      })
    );
  }

  private destroyPlayer(): void {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  private reinitializePlayer(): void {
    const wasPlaying = this.player ? !this.player.isPaused() : false;
    const currentTime = this.player?.getCurrentTime() ?? 0;

    this.destroyPlayer();
    this.initializePlayer();

    // Restore state
    if (this.player && currentTime > 0) {
      this.player.seek(currentTime);
      if (wasPlaying) {
        this.player.play();
      }
    }
  }

  private getOptionsFromAttributes(): Partial<KimochiPlayerOptions> {
    const options: Partial<KimochiPlayerOptions> = {};

    // Source
    const src = this.getAttribute('src');
    if (src) {
      options.src = src;
    }

    // Boolean attributes
    if (this.hasAttribute('autoplay')) {
      options.autoplay = true;
    }

    if (this.hasAttribute('muted')) {
      options.muted = true;
    }

    if (this.hasAttribute('controls')) {
      options.controls = true;
    } else if (this.getAttribute('controls') === 'false') {
      options.controls = false;
    }

    if (this.hasAttribute('loop')) {
      options.loop = true;
    }

    // String attributes
    const poster = this.getAttribute('poster');
    if (poster) {
      options.poster = poster;
    }

    const preload = this.getAttribute('preload');
    if (preload === 'none' || preload === 'metadata' || preload === 'auto') {
      options.preload = preload;
    }

    const theme = this.getAttribute('theme');
    if (theme === 'dark' || theme === 'light') {
      options.theme = theme;
    }

    // Number attributes
    const volume = this.getAttribute('volume');
    if (volume !== null) {
      const volumeNum = parseFloat(volume);
      if (!isNaN(volumeNum)) {
        options.volume = volumeNum;
      }
    }

    // Thumbnail configuration
    const thumbnails = this.getAttribute('thumbnails');
    if (thumbnails === 'false') {
      options.thumbnails = { enabled: false };
    } else if (thumbnails === 'true' || this.hasAttribute('thumbnails')) {
      options.thumbnails = { enabled: true };
    }

    const thumbnailVtt = this.getAttribute('thumbnail-vtt');
    if (thumbnailVtt) {
      options.thumbnails = {
        enabled: true,
        vttUrl: thumbnailVtt,
      };
    }

    return options;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get the underlying player instance
   */
  getPlayer(): KimochiPlayerAPI | null {
    return this.player;
  }

  /**
   * Play the video
   */
  play(): Promise<void> {
    return this.player?.play() ?? Promise.resolve();
  }

  /**
   * Pause the video
   */
  pause(): void {
    this.player?.pause();
  }

  /**
   * Toggle play/pause
   */
  togglePlay(): Promise<void> {
    return this.player?.togglePlay() ?? Promise.resolve();
  }

  /**
   * Seek to a specific time
   */
  seek(time: number): void {
    this.player?.seek(time);
  }

  /**
   * Get current time
   */
  get currentTime(): number {
    return this.player?.getCurrentTime() ?? 0;
  }

  /**
   * Set current time
   */
  set currentTime(time: number) {
    this.player?.seek(time);
  }

  /**
   * Get duration
   */
  get duration(): number {
    return this.player?.getDuration() ?? 0;
  }

  /**
   * Get/set paused state
   */
  get paused(): boolean {
    return this.player?.isPaused() ?? true;
  }

  /**
   * Get/set volume
   */
  get volume(): number {
    return this.player?.getVolume() ?? 1;
  }

  set volume(value: number) {
    this.player?.setVolume(value);
  }

  /**
   * Get/set muted state
   */
  get muted(): boolean {
    return this.player?.getState().muted ?? false;
  }

  set muted(value: boolean) {
    if (value) {
      this.player?.mute();
    } else {
      this.player?.unmute();
    }
  }

  /**
   * Get/set playback rate
   */
  get playbackRate(): number {
    return this.player?.getPlaybackRate() ?? 1;
  }

  set playbackRate(rate: number) {
    this.player?.setPlaybackRate(rate);
  }

  /**
   * Enter fullscreen
   */
  enterFullscreen(): Promise<void> {
    return this.player?.enterFullscreen() ?? Promise.resolve();
  }

  /**
   * Exit fullscreen
   */
  exitFullscreen(): Promise<void> {
    return this.player?.exitFullscreen() ?? Promise.resolve();
  }

  /**
   * Toggle fullscreen
   */
  toggleFullscreen(): Promise<void> {
    return this.player?.toggleFullscreen() ?? Promise.resolve();
  }
}

// Register the custom element
if (typeof customElements !== 'undefined' && !customElements.get('kimochi-player')) {
  customElements.define('kimochi-player', KimochiPlayerElement);
}

// Export for manual registration
export function registerKimochiPlayerElement(tagName = 'kimochi-player'): void {
  if (typeof customElements !== 'undefined' && !customElements.get(tagName)) {
    customElements.define(tagName, KimochiPlayerElement);
  }
}
