/**
 * A/B Loop Control - Set start and end points for looped playback
 */

import type { KimochiPlayer } from '../../core/KimochiPlayer';
import { UIBuilder } from '../UIBuilder';

export interface ABLoopState {
  enabled: boolean;
  startTime: number | null;
  endTime: number | null;
}

export class ABLoopControl {
  private element: HTMLElement;
  private player: KimochiPlayer;
  private state: ABLoopState = {
    enabled: false,
    startTime: null,
    endTime: null,
  };

  // UI elements
  private startBtn: HTMLButtonElement;
  private endBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private toggleBtn: HTMLButtonElement;

  // Markers on progress bar (managed externally via callbacks)
  private onStateChange: ((state: ABLoopState) => void) | null = null;

  constructor(player: KimochiPlayer) {
    this.player = player;

    // Create buttons with icons and time labels
    this.startBtn = this.createIconButton(UIBuilder.icons.loopStart, 'Set loop start point [', () => this.setStartPoint(), true);
    this.startBtn.classList.add('kimochi-abloop-start');

    this.endBtn = this.createIconButton(UIBuilder.icons.loopEnd, 'Set loop end point ]', () => this.setEndPoint(), true);
    this.endBtn.classList.add('kimochi-abloop-end');

    this.clearBtn = this.createIconButton(UIBuilder.icons.clearLoop, 'Clear loop points', () => this.clearPoints());
    this.clearBtn.classList.add('kimochi-abloop-clear');

    this.toggleBtn = this.createIconButton(UIBuilder.icons.loop, 'Toggle A/B loop', () => this.toggleLoop());
    this.toggleBtn.classList.add('kimochi-abloop-toggle');

    this.element = this.createElement();
    this.bindEvents();
    this.updateButtonStates();
  }

  private createIconButton(icon: string, tooltip: string, onClick: () => void, withTimeLabel = false): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kimochi-btn kimochi-abloop-btn';
    btn.innerHTML = icon;
    if (withTimeLabel) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'kimochi-abloop-time';
      btn.appendChild(timeSpan);
    }
    btn.title = tooltip;
    btn.setAttribute('aria-label', tooltip);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  private createElement(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kimochi-abloop-control',
    });

    container.appendChild(this.startBtn);
    container.appendChild(this.endBtn);
    container.appendChild(this.clearBtn);
    container.appendChild(this.toggleBtn);

    return container;
  }

  private bindEvents(): void {
    // Handle timeupdate for looping
    this.player.on('timeupdate', ({ currentTime }) => {
      if (this.state.enabled &&
          this.state.startTime !== null &&
          this.state.endTime !== null) {
        // Loop back to start when reaching end
        if (currentTime >= this.state.endTime) {
          this.player.seek(this.state.startTime);
        }
      }
    });

    // Reset on source change
    this.player.on('sourcechange', () => {
      this.clearPoints();
    });
  }

  private setStartPoint(): void {
    const currentTime = this.player.getCurrentTime();

    // If end point exists and is before current time, clear it
    if (this.state.endTime !== null && currentTime >= this.state.endTime) {
      this.state.endTime = null;
    }

    this.state.startTime = currentTime;
    this.updateButtonStates();
    this.notifyStateChange();
  }

  private setEndPoint(): void {
    const currentTime = this.player.getCurrentTime();

    // Only set end if it's after start (or no start set)
    if (this.state.startTime === null || currentTime > this.state.startTime) {
      this.state.endTime = currentTime;
      this.updateButtonStates();
      this.notifyStateChange();
    }
  }

  private clearPoints(): void {
    this.state.startTime = null;
    this.state.endTime = null;
    this.state.enabled = false;
    this.updateButtonStates();
    this.notifyStateChange();
  }

  private toggleLoop(): void {
    // Can only enable if both points are set
    if (this.state.startTime !== null && this.state.endTime !== null) {
      this.state.enabled = !this.state.enabled;

      // If enabling, jump to start point
      if (this.state.enabled) {
        const currentTime = this.player.getCurrentTime();
        if (currentTime < this.state.startTime || currentTime > this.state.endTime) {
          this.player.seek(this.state.startTime);
        }
      }

      this.updateButtonStates();
      this.notifyStateChange();
    }
  }

  private updateButtonStates(): void {
    const startTimeSpan = this.startBtn.querySelector('.kimochi-abloop-time');
    const endTimeSpan = this.endBtn.querySelector('.kimochi-abloop-time');

    // Update start button
    if (this.state.startTime !== null) {
      this.startBtn.classList.add('kimochi-active');
      this.startBtn.title = `Loop start: ${UIBuilder.formatTime(this.state.startTime)} (click to update)`;
      if (startTimeSpan) startTimeSpan.textContent = UIBuilder.formatTime(this.state.startTime);
    } else {
      this.startBtn.classList.remove('kimochi-active');
      this.startBtn.title = 'Set loop start point [';
      if (startTimeSpan) startTimeSpan.textContent = '';
    }

    // Update end button
    if (this.state.endTime !== null) {
      this.endBtn.classList.add('kimochi-active');
      this.endBtn.title = `Loop end: ${UIBuilder.formatTime(this.state.endTime)} (click to update)`;
      if (endTimeSpan) endTimeSpan.textContent = UIBuilder.formatTime(this.state.endTime);
    } else {
      this.endBtn.classList.remove('kimochi-active');
      this.endBtn.title = 'Set loop end point ]';
      if (endTimeSpan) endTimeSpan.textContent = '';
    }

    // Update clear button visibility
    if (this.state.startTime !== null || this.state.endTime !== null) {
      this.clearBtn.classList.remove('kimochi-hidden');
    } else {
      this.clearBtn.classList.add('kimochi-hidden');
    }

    // Update toggle button
    const canToggle = this.state.startTime !== null && this.state.endTime !== null;
    this.toggleBtn.disabled = !canToggle;

    if (this.state.enabled) {
      this.toggleBtn.classList.add('kimochi-active');
      this.toggleBtn.title = 'Disable A/B loop';
    } else {
      this.toggleBtn.classList.remove('kimochi-active');
      this.toggleBtn.title = canToggle ? 'Enable A/B loop' : 'Set A and B points first';
    }
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  /**
   * Set callback for state changes (used by ProgressBar to update markers)
   */
  setStateChangeCallback(callback: (state: ABLoopState) => void): void {
    this.onStateChange = callback;
    // Notify immediately with current state
    callback({ ...this.state });
  }

  /**
   * Update loop point from marker drag
   */
  updateStartTime(time: number): void {
    if (this.state.endTime === null || time < this.state.endTime) {
      this.state.startTime = time;
      this.updateButtonStates();
      this.notifyStateChange();
    }
  }

  updateEndTime(time: number): void {
    if (this.state.startTime === null || time > this.state.startTime) {
      this.state.endTime = time;
      this.updateButtonStates();
      this.notifyStateChange();
    }
  }

  getState(): ABLoopState {
    return { ...this.state };
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
