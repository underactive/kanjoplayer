/**
 * Time display component (current / duration)
 */

import type { KimochiPlayer } from '../../core/KimochiPlayer';
import { UIBuilder } from '../UIBuilder';

export class TimeDisplay {
  private element: HTMLElement;
  private currentTimeEl: HTMLSpanElement;
  private durationEl: HTMLSpanElement;
  private player: KimochiPlayer;

  constructor(player: KimochiPlayer) {
    this.player = player;
    this.currentTimeEl = document.createElement('span');
    this.currentTimeEl.className = 'kimochi-time-current';
    this.currentTimeEl.textContent = '0:00';

    this.durationEl = document.createElement('span');
    this.durationEl.className = 'kimochi-time-duration';
    this.durationEl.textContent = '0:00';

    this.element = this.createElement();
    this.bindEvents();
  }

  private createElement(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kimochi-time-display',
    });

    container.appendChild(this.currentTimeEl);
    container.appendChild(document.createTextNode(' / '));
    container.appendChild(this.durationEl);

    return container;
  }

  private bindEvents(): void {
    this.player.on('timeupdate', ({ currentTime, duration }) => {
      this.currentTimeEl.textContent = UIBuilder.formatTime(currentTime);
      this.durationEl.textContent = UIBuilder.formatTime(duration);
    });

    this.player.on('loadedmetadata', ({ duration }) => {
      this.durationEl.textContent = UIBuilder.formatTime(duration);
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
