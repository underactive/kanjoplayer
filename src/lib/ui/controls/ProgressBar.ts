/**
 * Progress bar with scrubber, buffered indicator, and thumbnail preview
 */

import type { KimochiPlayer } from '../../core/KimochiPlayer';
import { UIBuilder } from '../UIBuilder';
import { ThumbnailPreview } from '../ThumbnailPreview';

export class ProgressBar {
  private element: HTMLElement;
  private progressContainer: HTMLElement;
  private playedBar: HTMLElement;
  private bufferedBar: HTMLElement;
  private scrubber: HTMLElement;
  private hoverTime: HTMLElement;
  private thumbnailPreview: ThumbnailPreview;
  private player: KimochiPlayer;
  private isDragging = false;

  constructor(player: KimochiPlayer) {
    this.player = player;
    this.thumbnailPreview = new ThumbnailPreview(player);
    this.playedBar = UIBuilder.create({ className: 'kimochi-progress-played' });
    this.bufferedBar = UIBuilder.create({ className: 'kimochi-progress-buffered' });
    this.scrubber = UIBuilder.create({ className: 'kimochi-progress-scrubber' });
    this.hoverTime = UIBuilder.create({ className: 'kimochi-progress-hover-time' });
    this.progressContainer = this.createProgressContainer();
    this.element = this.createElement();
    this.bindEvents();
  }

  private createProgressContainer(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kimochi-progress-container',
      attrs: {
        role: 'slider',
        'aria-label': 'Video progress',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': '0',
        tabindex: '0',
      },
    });

    // Track background
    const track = UIBuilder.create({ className: 'kimochi-progress-track' });
    track.appendChild(this.bufferedBar);
    track.appendChild(this.playedBar);
    track.appendChild(this.scrubber);

    container.appendChild(track);
    container.appendChild(this.hoverTime);

    return container;
  }

  private createElement(): HTMLElement {
    const wrapper = UIBuilder.create({ className: 'kimochi-progress-wrapper' });
    wrapper.appendChild(this.thumbnailPreview.getElement());
    wrapper.appendChild(this.progressContainer);
    return wrapper;
  }

  private bindEvents(): void {
    // Update progress on timeupdate
    this.player.on('timeupdate', ({ currentTime, duration }) => {
      if (!this.isDragging && duration > 0) {
        const percent = (currentTime / duration) * 100;
        this.updateProgress(percent);
      }
    });

    // Update buffered on progress
    this.player.on('progress', ({ buffered }) => {
      const duration = this.player.getDuration();
      if (duration > 0 && buffered.length > 0) {
        const lastBuffered = buffered[buffered.length - 1];
        const percent = (lastBuffered.end / duration) * 100;
        this.bufferedBar.style.width = `${percent}%`;
      }
    });

    // Mouse events for seeking
    this.progressContainer.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.progressContainer.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.progressContainer.addEventListener('mouseleave', this.onMouseLeave.bind(this));

    // Touch events
    this.progressContainer.addEventListener('touchstart', this.onTouchStart.bind(this));

    // Keyboard events
    this.progressContainer.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private updateProgress(percent: number): void {
    this.playedBar.style.width = `${percent}%`;
    this.scrubber.style.left = `${percent}%`;
    this.progressContainer.setAttribute('aria-valuenow', String(Math.round(percent)));
  }

  private getPercentFromEvent(e: MouseEvent | Touch): number {
    const rect = this.progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return UIBuilder.clamp((x / rect.width) * 100, 0, 100);
  }

  private getTimeFromPercent(percent: number): number {
    return (percent / 100) * this.player.getDuration();
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return; // Left click only

    this.isDragging = true;
    this.progressContainer.classList.add('kimochi-dragging');

    const percent = this.getPercentFromEvent(e);
    this.updateProgress(percent);
    this.player.seekPercent(percent);

    const onMouseMove = (e: MouseEvent) => {
      const percent = this.getPercentFromEvent(e);
      this.updateProgress(percent);
      this.player.seekPercent(percent);
    };

    const onMouseUp = () => {
      this.isDragging = false;
      this.progressContainer.classList.remove('kimochi-dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) return;

    const percent = this.getPercentFromEvent(e);
    const time = this.getTimeFromPercent(percent);
    const rect = this.progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Update hover time display
    this.hoverTime.textContent = UIBuilder.formatTime(time);
    this.hoverTime.style.left = `${x}px`;
    this.hoverTime.classList.add('kimochi-visible');

    // Update thumbnail preview
    this.thumbnailPreview.show(time, x, rect.width);
  }

  private onMouseLeave(): void {
    if (!this.isDragging) {
      this.hoverTime.classList.remove('kimochi-visible');
      this.thumbnailPreview.hide();
    }
  }

  private onTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    const percent = this.getPercentFromEvent(touch);
    this.player.seekPercent(percent);
    this.updateProgress(percent);

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const percent = this.getPercentFromEvent(touch);
      this.updateProgress(percent);
    };

    const onTouchEnd = () => {
      const touch = e.changedTouches[0];
      const percent = this.getPercentFromEvent(touch);
      this.player.seekPercent(percent);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
  }

  private onKeyDown(e: KeyboardEvent): void {
    const duration = this.player.getDuration();
    if (duration <= 0) return;

    let seek = 0;
    switch (e.key) {
      case 'ArrowLeft':
        seek = -5;
        break;
      case 'ArrowRight':
        seek = 5;
        break;
      case 'ArrowUp':
        seek = 10;
        break;
      case 'ArrowDown':
        seek = -10;
        break;
      default:
        return;
    }

    e.preventDefault();
    this.player.seek(this.player.getCurrentTime() + seek);
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
