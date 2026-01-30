/**
 * Time display component (current / duration)
 * Shows only current time by default, expands on hover to show duration
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import { UIBuilder } from '../UIBuilder';

export class TimeDisplay {
  private element: HTMLElement;
  private currentTimeEl: HTMLSpanElement;
  private durationEl: HTMLSpanElement;
  private durationWrapper: HTMLSpanElement;
  private player: KanjoPlayer;
  private showHours = false;

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

    this.element = this.createElement();
    this.bindEvents();
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

    return container;
  }

  private bindEvents(): void {
    this.player.on('timeupdate', ({ currentTime, duration }) => {
      this.currentTimeEl.textContent = UIBuilder.formatTime(currentTime, this.showHours);
      this.durationEl.textContent = UIBuilder.formatTime(duration, this.showHours);
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
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
