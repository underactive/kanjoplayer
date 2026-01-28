/**
 * AirPlay button for streaming to Apple devices
 * Only available in Safari/WebKit browsers
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import { UIBuilder } from '../UIBuilder';

// Extend HTMLVideoElement for WebKit-specific AirPlay methods
interface WebKitVideoElement extends HTMLVideoElement {
  webkitShowPlaybackTargetPicker?: () => void;
  webkitCurrentPlaybackTargetIsWireless?: boolean;
}

// Extend Window for WebKit AirPlay availability event
declare global {
  interface Window {
    WebKitPlaybackTargetAvailabilityEvent?: typeof Event;
  }
  interface HTMLVideoElementEventMap {
    webkitplaybacktargetavailabilitychanged: Event & { availability: string };
    webkitcurrentplaybacktargetiswirelesschanged: Event;
  }
}

export class AirPlayButton {
  private element: HTMLButtonElement;
  private player: KanjoPlayer;
  private isAvailable = false;
  private isActive = false;

  constructor(player: KanjoPlayer) {
    this.player = player;
    this.element = this.createButton();
    this.checkAvailability();
    this.bindEvents();
  }

  private createButton(): HTMLButtonElement {
    const btn = UIBuilder.button({
      className: 'kanjo-airplay-btn',
      icon: UIBuilder.icons.airplay,
      tooltip: 'AirPlay',
      onClick: () => this.showPicker(),
    });

    // Hidden by default until availability is confirmed
    btn.style.display = 'none';

    return btn;
  }

  private checkAvailability(): void {
    // Check if AirPlay is supported (Safari/WebKit only)
    const video = this.player.getVideoElement() as WebKitVideoElement;

    if (typeof video.webkitShowPlaybackTargetPicker === 'function') {
      // AirPlay API is available
      this.isAvailable = true;
      this.element.style.display = '';
    }
  }

  private bindEvents(): void {
    const video = this.player.getVideoElement() as WebKitVideoElement;

    // Listen for AirPlay availability changes
    video.addEventListener(
      'webkitplaybacktargetavailabilitychanged' as keyof HTMLVideoElementEventMap,
      ((e: Event & { availability?: string }) => {
        this.isAvailable = e.availability === 'available';
        this.element.style.display = this.isAvailable ? '' : 'none';
      }) as EventListener
    );

    // Listen for wireless playback state changes
    video.addEventListener(
      'webkitcurrentplaybacktargetiswirelesschanged' as keyof HTMLVideoElementEventMap,
      (() => {
        this.isActive = video.webkitCurrentPlaybackTargetIsWireless || false;
        this.updateActiveState();
      }) as EventListener
    );
  }

  private showPicker(): void {
    const video = this.player.getVideoElement() as WebKitVideoElement;

    if (typeof video.webkitShowPlaybackTargetPicker === 'function') {
      video.webkitShowPlaybackTargetPicker();
    }
  }

  private updateActiveState(): void {
    this.element.classList.toggle('kanjo-active', this.isActive);
    this.element.title = this.isActive ? 'AirPlay (Connected)' : 'AirPlay';
    this.element.setAttribute(
      'aria-label',
      this.isActive ? 'AirPlay (Connected)' : 'AirPlay'
    );
  }

  getElement(): HTMLButtonElement {
    return this.element;
  }

  isSupported(): boolean {
    return this.isAvailable;
  }
}
