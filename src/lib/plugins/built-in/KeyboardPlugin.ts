/**
 * Keyboard shortcuts plugin
 */

import type { KimochiPlayerAPI, KimochiPlugin } from '../../core/types';

export interface KeyboardPluginOptions {
  /** Enable global keyboard shortcuts (outside player focus) */
  global?: boolean;
  /** Custom key bindings */
  bindings?: Partial<KeyBindings>;
}

export interface KeyBindings {
  playPause: string[];
  mute: string[];
  fullscreen: string[];
  forward: string[];
  backward: string[];
  volumeUp: string[];
  volumeDown: string[];
  speedUp: string[];
  speedDown: string[];
  pip: string[];
  seekStart: string[];
  seekEnd: string[];
}

const DEFAULT_BINDINGS: KeyBindings = {
  playPause: ['Space', 'k'],
  mute: ['m'],
  fullscreen: ['f'],
  forward: ['ArrowRight', 'l'],
  backward: ['ArrowLeft', 'j'],
  volumeUp: ['ArrowUp'],
  volumeDown: ['ArrowDown'],
  speedUp: ['>'],
  speedDown: ['<'],
  pip: ['p'],
  seekStart: ['Home', '0'],
  seekEnd: ['End'],
};

const SPEED_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export class KeyboardPlugin implements KimochiPlugin {
  name = 'keyboard';
  version = '1.0.0';

  private player: KimochiPlayerAPI | null = null;
  private options: KeyboardPluginOptions;
  private bindings: KeyBindings;
  private handleKeyDown: ((e: KeyboardEvent) => void) | null = null;

  constructor(options: KeyboardPluginOptions = {}) {
    this.options = {
      global: false,
      ...options,
    };
    this.bindings = { ...DEFAULT_BINDINGS, ...options.bindings };
  }

  install(player: KimochiPlayerAPI): void {
    this.player = player;

    this.handleKeyDown = this.onKeyDown.bind(this);

    if (this.options.global) {
      document.addEventListener('keydown', this.handleKeyDown);
    } else {
      const container = player.getContainerElement();
      container.setAttribute('tabindex', '0');
      container.addEventListener('keydown', this.handleKeyDown);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.player) return;

    // Ignore if typing in an input
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    const key = e.key;
    const action = this.getActionForKey(key);

    if (!action) {
      // Handle number keys for seeking
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        const percent = parseInt(key) * 10;
        this.player.seekPercent(percent);
        return;
      }
      return;
    }

    e.preventDefault();
    this.executeAction(action);
  }

  private getActionForKey(key: string): keyof KeyBindings | null {
    for (const [action, keys] of Object.entries(this.bindings)) {
      if (keys.includes(key)) {
        return action as keyof KeyBindings;
      }
    }
    return null;
  }

  private executeAction(action: keyof KeyBindings): void {
    if (!this.player) return;

    switch (action) {
      case 'playPause':
        this.player.togglePlay();
        break;

      case 'mute':
        this.player.toggleMute();
        break;

      case 'fullscreen':
        this.player.toggleFullscreen();
        break;

      case 'forward':
        this.player.forward(10);
        break;

      case 'backward':
        this.player.backward(10);
        break;

      case 'volumeUp':
        this.adjustVolume(0.1);
        break;

      case 'volumeDown':
        this.adjustVolume(-0.1);
        break;

      case 'speedUp':
        this.adjustSpeed(1);
        break;

      case 'speedDown':
        this.adjustSpeed(-1);
        break;

      case 'pip':
        this.player.togglePiP();
        break;

      case 'seekStart':
        this.player.seek(0);
        break;

      case 'seekEnd':
        this.player.seek(this.player.getDuration());
        break;
    }
  }

  private adjustVolume(delta: number): void {
    if (!this.player) return;
    const currentVolume = this.player.getVolume();
    const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
    this.player.setVolume(newVolume);

    // Unmute if adjusting volume up while muted
    if (delta > 0 && this.player.getState().muted) {
      this.player.unmute();
    }
  }

  private adjustSpeed(direction: number): void {
    if (!this.player) return;
    const currentRate = this.player.getPlaybackRate();
    const currentIndex = SPEED_STEPS.findIndex((s) => s === currentRate);

    let newIndex: number;
    if (currentIndex === -1) {
      // Find closest step
      newIndex = SPEED_STEPS.findIndex((s) => s >= currentRate) || SPEED_STEPS.length - 1;
    } else {
      newIndex = currentIndex + direction;
    }

    newIndex = Math.max(0, Math.min(SPEED_STEPS.length - 1, newIndex));
    this.player.setPlaybackRate(SPEED_STEPS[newIndex]);
  }

  /**
   * Update key bindings
   */
  setBindings(bindings: Partial<KeyBindings>): void {
    this.bindings = { ...this.bindings, ...bindings };
  }

  /**
   * Get current key bindings
   */
  getBindings(): KeyBindings {
    return { ...this.bindings };
  }

  destroy(): void {
    if (this.handleKeyDown) {
      if (this.options.global) {
        document.removeEventListener('keydown', this.handleKeyDown);
      } else if (this.player) {
        const container = this.player.getContainerElement();
        container.removeEventListener('keydown', this.handleKeyDown);
      }
      this.handleKeyDown = null;
    }
    this.player = null;
  }
}
