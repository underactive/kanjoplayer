/**
 * Time display component (current / duration)
 * Shows only current time by default, expands on hover to show duration
 * For live streams, shows a "LIVE" badge instead
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import type { HlsPlugin } from '../../plugins/built-in/HlsPlugin';
import { UIBuilder } from '../UIBuilder';

export class TimeDisplay {
  private element: HTMLElement;
  private currentTimeEl: HTMLSpanElement;
  private durationEl: HTMLSpanElement;
  private durationWrapper: HTMLSpanElement;
  private liveBadge: HTMLSpanElement;
  private player: KanjoPlayer;
  private showHours = false;
  private isLive = false;

  constructor(player: KanjoPlayer) {
    this.player = player;
    this.currentTimeEl = document.createElement('span');
    this.currentTimeEl.className = 'kanjo-time-current';
    this.currentTimeEl.textContent = '0:00';

    this.durationEl = document.createElement('span');
    this.durationEl.className = 'kanjo-time-duration-text';
    this.durationEl.textContent = '0:00';

    this.durationWrapper = document.createElement('span');
    this.durationWrapper.className = 'kanjo-time-duration';

    this.liveBadge = this.createLiveBadge();

    this.element = this.createElement();
    this.bindEvents();
  }

  private createLiveBadge(): HTMLSpanElement {
    const locale = this.player.locale;
    const badge = document.createElement('span');
    badge.className = 'kanjo-time-live-badge';
    badge.textContent = locale.get('live.badge');
    badge.title = locale.get('live.jumpToLive');
    badge.setAttribute('role', 'button');
    badge.setAttribute('tabindex', '0');

    // Click to jump to live edge
    badge.addEventListener('click', () => this.jumpToLive());
    badge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.jumpToLive();
      }
    });

    return badge;
  }

  private jumpToLive(): void {
    // Try HLS plugin first
    const hlsPlugin = this.player.getPlugin<HlsPlugin>('hls');
    if (hlsPlugin && typeof hlsPlugin.jumpToLive === 'function') {
      hlsPlugin.jumpToLive();
      return;
    }

    // Fallback: seek to end of seekable range
    const video = this.player.getVideoElement();
    if (video.seekable.length > 0) {
      video.currentTime = video.seekable.end(video.seekable.length - 1);
    }
  }

  private createElement(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kanjo-time-display',
    });

    // Separator and duration are wrapped for animated expansion
    const separator = document.createElement('span');
    separator.className = 'kanjo-time-separator';
    separator.textContent = ' / ';

    this.durationWrapper.appendChild(separator);
    this.durationWrapper.appendChild(this.durationEl);

    container.appendChild(this.currentTimeEl);
    container.appendChild(this.durationWrapper);
    container.appendChild(this.liveBadge);

    return container;
  }

  private updateLiveState(isLive: boolean): void {
    this.isLive = isLive;

    if (isLive) {
      this.element.classList.add('kanjo-live');
      this.currentTimeEl.style.display = 'none';
      this.durationWrapper.style.display = 'none';
      this.liveBadge.style.display = 'inline-flex';
    } else {
      this.element.classList.remove('kanjo-live');
      this.currentTimeEl.style.display = '';
      this.durationWrapper.style.display = '';
      this.liveBadge.style.display = 'none';
    }
  }

  private bindEvents(): void {
    this.player.on('timeupdate', ({ currentTime, duration }) => {
      if (!this.isLive) {
        this.currentTimeEl.textContent = UIBuilder.formatTime(currentTime, this.showHours);
        this.durationEl.textContent = UIBuilder.formatTime(duration, this.showHours);
      }
    });

    this.player.on('loadedmetadata', ({ duration }) => {
      this.showHours = UIBuilder.needsHours(duration);
      this.durationEl.textContent = UIBuilder.formatTime(duration, this.showHours);
      // Update current time format as well
      this.currentTimeEl.textContent = UIBuilder.formatTime(
        this.player.getCurrentTime(),
        this.showHours
      );
    });

    // Listen for live state changes
    this.player.on('livestatechange', ({ isLive }) => {
      this.updateLiveState(isLive);
    });

    // Also check initial state
    const state = this.player.getState();
    if (state.isLive) {
      this.updateLiveState(true);
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
