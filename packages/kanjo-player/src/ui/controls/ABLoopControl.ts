/**
 * A/B Loop Control - Set start and end points for looped playback
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import type { WatermarkConfig } from '../../core/types';
import { UIBuilder } from '../UIBuilder';
import { LoopDownloader } from '../../download/LoopDownloader';
import type { DownloadOverlay } from '../DownloadOverlay';

export interface ABLoopState {
  enabled: boolean;
  startTime: number | null;
  endTime: number | null;
}

export interface ABLoopControlOptions {
  watermark?: WatermarkConfig;
}

// Maximum loop duration in seconds (applies to both loop points and download)
const MAX_LOOP_DURATION = 30;

export class ABLoopControl {
  private element: HTMLElement;
  private player: KanjoPlayer;
  private options: ABLoopControlOptions;
  private state: ABLoopState = {
    enabled: false,
    startTime: null,
    endTime: null,
  };

  // UI elements
  private startBtn!: HTMLButtonElement;
  private endBtn!: HTMLButtonElement;
  private toggleBtn!: HTMLButtonElement;
  private toggleDropdown!: HTMLElement;
  private toggleContainer!: HTMLElement;
  private clearMenuItem!: HTMLButtonElement;
  private downloadMenuItem!: HTMLButtonElement;
  private dropdownOpen = false;

  // Download functionality
  private loopDownloader: LoopDownloader | null = null;
  private downloadOverlay: DownloadOverlay | null = null;
  private isDownloading = false;

  // Markers on progress bar (managed externally via callbacks)
  private onStateChange: ((state: ABLoopState) => void) | null = null;

  constructor(player: KanjoPlayer, options?: ABLoopControlOptions) {
    this.player = player;
    this.options = options || {};

    // Create buttons with text labels (A [ time) and (time ] B)
    this.startBtn = this.createLoopPointButton('start', 'Set loop start point [', () => this.setStartPoint());
    this.startBtn.classList.add('kanjo-abloop-start');

    this.endBtn = this.createLoopPointButton('end', 'Set loop end point ]', () => this.setEndPoint());
    this.endBtn.classList.add('kanjo-abloop-end');

    // Create toggle button with dropdown
    this.toggleBtn = this.createToggleButton();
    this.toggleDropdown = this.createToggleDropdown();
    this.toggleContainer = this.createToggleContainer();

    this.element = this.createElement();
    this.bindEvents();
    this.updateButtonStates();
  }

  private createLoopPointButton(type: 'start' | 'end', tooltip: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kanjo-btn kanjo-abloop-btn kanjo-abloop-point-btn';

    if (type === 'start') {
      // Format: "A [ time" or "A [" when no time
      const labelSpan = document.createElement('span');
      labelSpan.className = 'kanjo-abloop-label';
      labelSpan.textContent = 'A [';
      btn.appendChild(labelSpan);

      const timeSpan = document.createElement('span');
      timeSpan.className = 'kanjo-abloop-time';
      btn.appendChild(timeSpan);
    } else {
      // Format: "time ] B" or "] B" when no time
      const timeSpan = document.createElement('span');
      timeSpan.className = 'kanjo-abloop-time';
      btn.appendChild(timeSpan);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'kanjo-abloop-label';
      labelSpan.textContent = '] B';
      btn.appendChild(labelSpan);
    }

    btn.title = tooltip;
    btn.setAttribute('aria-label', tooltip);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  private createToggleButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kanjo-btn kanjo-abloop-btn kanjo-abloop-toggle';

    // Loop icon
    const iconSpan = document.createElement('span');
    iconSpan.className = 'kanjo-abloop-toggle-icon';
    iconSpan.innerHTML = UIBuilder.icons.loop;
    btn.appendChild(iconSpan);

    // Dropdown chevron
    const chevronSpan = document.createElement('span');
    chevronSpan.className = 'kanjo-abloop-toggle-chevron';
    chevronSpan.innerHTML = UIBuilder.icons.chevronDown;
    btn.appendChild(chevronSpan);

    btn.title = 'Toggle A/B loop';
    btn.setAttribute('aria-label', 'Toggle A/B loop');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      // If clicking the chevron, toggle dropdown
      if (target.closest('.kanjo-abloop-toggle-chevron')) {
        this.toggleDropdownMenu();
      } else {
        // Main button action: toggle loop
        this.toggleLoop();
      }
    });

    return btn;
  }

  private createToggleDropdown(): HTMLElement {
    const dropdown = UIBuilder.create({
      className: 'kanjo-abloop-dropdown',
    });

    // Download clip option
    this.downloadMenuItem = document.createElement('button');
    this.downloadMenuItem.type = 'button';
    this.downloadMenuItem.className = 'kanjo-abloop-dropdown-item';
    this.downloadMenuItem.innerHTML = `
      <span class="kanjo-abloop-dropdown-icon">${UIBuilder.icons.downloadLoop}</span>
      <span class="kanjo-abloop-dropdown-label">Download clip</span>
    `;
    this.downloadMenuItem.title = 'Download loop clip';
    this.downloadMenuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeDropdown();
      this.downloadLoop();
    });
    dropdown.appendChild(this.downloadMenuItem);

    // Clear markers option
    this.clearMenuItem = document.createElement('button');
    this.clearMenuItem.type = 'button';
    this.clearMenuItem.className = 'kanjo-abloop-dropdown-item';
    this.clearMenuItem.innerHTML = `
      <span class="kanjo-abloop-dropdown-icon">${UIBuilder.icons.clearLoop}</span>
      <span class="kanjo-abloop-dropdown-label">Clear markers</span>
    `;
    this.clearMenuItem.title = 'Clear loop points';
    this.clearMenuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeDropdown();
      this.clearPoints();
    });
    dropdown.appendChild(this.clearMenuItem);

    return dropdown;
  }

  private createToggleContainer(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kanjo-abloop-toggle-container',
    });

    container.appendChild(this.toggleDropdown);
    container.appendChild(this.toggleBtn);

    return container;
  }

  private toggleDropdownMenu(): void {
    this.dropdownOpen = !this.dropdownOpen;
    this.toggleDropdown.classList.toggle('kanjo-open', this.dropdownOpen);
    this.toggleBtn.classList.toggle('kanjo-dropdown-open', this.dropdownOpen);
  }

  private closeDropdown(): void {
    this.dropdownOpen = false;
    this.toggleDropdown.classList.remove('kanjo-open');
    this.toggleBtn.classList.remove('kanjo-dropdown-open');
  }

  private createElement(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kanjo-abloop-control',
    });

    container.appendChild(this.startBtn);
    container.appendChild(this.endBtn);
    container.appendChild(this.toggleContainer);

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

    // Listen for keyboard shortcuts
    this.player.on('setloopstart', () => {
      this.setStartPoint();
    });

    this.player.on('setloopend', () => {
      this.setEndPoint();
    });

    this.player.on('clearloop', () => {
      this.clearPoints();
    });

    this.player.on('toggleloop', () => {
      this.toggleLoop();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.toggleContainer.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });

    // Close dropdown on fullscreen change
    this.player.on('fullscreenchange', () => {
      this.closeDropdown();
    });
  }

  private setStartPoint(): void {
    const currentTime = this.player.getCurrentTime();

    // If end point exists and is before current time, clear it
    if (this.state.endTime !== null && currentTime >= this.state.endTime) {
      this.state.endTime = null;
    }

    // If end point exists and duration would exceed max, clear it
    if (this.state.endTime !== null && (this.state.endTime - currentTime) > MAX_LOOP_DURATION) {
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
      // Enforce max duration - clamp end time if needed
      let endTime = currentTime;
      if (this.state.startTime !== null && (endTime - this.state.startTime) > MAX_LOOP_DURATION) {
        endTime = this.state.startTime + MAX_LOOP_DURATION;
      }
      this.state.endTime = endTime;
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

  /**
   * Set the download overlay for showing progress and confirmation
   */
  setDownloadOverlay(overlay: DownloadOverlay): void {
    this.downloadOverlay = overlay;
  }

  private async downloadLoop(): Promise<void> {
    if (this.state.startTime === null || this.state.endTime === null) {
      return;
    }

    if (this.isDownloading) {
      return;
    }

    const duration = this.state.endTime - this.state.startTime;

    // Check duration limit
    if (duration > MAX_LOOP_DURATION) {
      if (this.downloadOverlay) {
        this.downloadOverlay.showError(`Clip too long (${Math.round(duration)}s). Max: ${MAX_LOOP_DURATION}s`);
      } else {
        alert(`Clip duration (${Math.round(duration)}s) exceeds maximum of ${MAX_LOOP_DURATION} seconds.\n\nPlease set a shorter loop region.`);
      }
      return;
    }

    // Check if downloading is supported
    if (!LoopDownloader.isSupported()) {
      if (this.downloadOverlay) {
        this.downloadOverlay.showError('Download not supported in this browser');
      } else {
        alert('Loop download is not supported in this browser.\n\nPlease use a modern browser with WebAssembly support.');
      }
      return;
    }

    // Initialize downloader lazily
    if (!this.loopDownloader) {
      this.loopDownloader = new LoopDownloader(this.player, {
        maxDuration: MAX_LOOP_DURATION,
        watermark: this.options.watermark,
      });
    }

    this.isDownloading = true;
    this.updateDownloadButtonState('downloading');

    try {
      const { blob, filename } = await this.loopDownloader.prepareDownload(
        this.state.startTime,
        this.state.endTime,
        (progress) => this.onDownloadProgress(progress)
      );

      // Show confirmation dialog
      if (this.downloadOverlay) {
        this.downloadOverlay.showDialog(blob, filename, () => {
          // Cleanup callback - nothing specific needed here
          console.log('[ABLoopControl] Download cancelled, cleaned up');
        });
      }
    } catch (error) {
      // Don't show error for user cancellation
      const isCancelled = error instanceof Error && error.message === 'Download cancelled';
      if (!isCancelled) {
        console.error('[ABLoopControl] Download failed:', error);
        if (this.downloadOverlay) {
          this.downloadOverlay.showError(error instanceof Error ? error.message : 'Download failed');
        } else {
          alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } finally {
      this.isDownloading = false;
      this.updateDownloadButtonState('idle');
    }
  }

  private onDownloadProgress(progress: { phase: string; progress: number; message: string }): void {
    // Show progress in overlay with cancel callback
    if (this.downloadOverlay) {
      this.downloadOverlay.showProgress(progress, () => this.cancelDownload());
    }

    // Also update menu item title as fallback
    this.downloadMenuItem.title = `${progress.message} (${progress.progress}%)`;

    if (progress.phase === 'error') {
      console.error('[ABLoopControl] Download error:', progress.message);
    }
  }

  private cancelDownload(): void {
    if (this.loopDownloader && this.isDownloading) {
      this.loopDownloader.cancel();
      this.isDownloading = false;
      this.updateDownloadButtonState('idle');
      console.log('[ABLoopControl] Download cancelled by user');
    }
  }

  private updateDownloadButtonState(state: 'idle' | 'downloading'): void {
    const iconEl = this.downloadMenuItem.querySelector('.kanjo-abloop-dropdown-icon');

    if (state === 'downloading') {
      if (iconEl) iconEl.innerHTML = UIBuilder.icons.spinner;
      this.downloadMenuItem.classList.add('kanjo-downloading');
      this.downloadMenuItem.disabled = true;
      this.downloadMenuItem.title = 'Preparing...';
    } else {
      if (iconEl) iconEl.innerHTML = UIBuilder.icons.downloadLoop;
      this.downloadMenuItem.classList.remove('kanjo-downloading');
      this.downloadMenuItem.disabled = false;
      this.updateButtonStates(); // Restore proper title

      // Hide progress overlay
      if (this.downloadOverlay) {
        this.downloadOverlay.hideProgress();
      }
    }
  }

  private updateButtonStates(): void {
    const startTimeSpan = this.startBtn.querySelector('.kanjo-abloop-time');
    const endTimeSpan = this.endBtn.querySelector('.kanjo-abloop-time');

    // Update start button - format: "A [ 4:20" or "A [" when no time
    if (this.state.startTime !== null) {
      this.startBtn.classList.add('kanjo-active');
      this.startBtn.title = `Loop start: ${UIBuilder.formatTime(this.state.startTime)} (click to update)`;
      if (startTimeSpan) startTimeSpan.textContent = ' ' + UIBuilder.formatTime(this.state.startTime);
    } else {
      this.startBtn.classList.remove('kanjo-active');
      this.startBtn.title = 'Set loop start point [';
      if (startTimeSpan) startTimeSpan.textContent = '';
    }

    // Update end button - format: "4:33 ] B" or "] B" when no time
    if (this.state.endTime !== null) {
      this.endBtn.classList.add('kanjo-active');
      this.endBtn.title = `Loop end: ${UIBuilder.formatTime(this.state.endTime)} (click to update)`;
      if (endTimeSpan) endTimeSpan.textContent = UIBuilder.formatTime(this.state.endTime) + ' ';
    } else {
      this.endBtn.classList.remove('kanjo-active');
      this.endBtn.title = 'Set loop end point ]';
      if (endTimeSpan) endTimeSpan.textContent = '';
    }

    // Update toggle button and dropdown visibility
    const canToggle = this.state.startTime !== null && this.state.endTime !== null;
    const hasAnyMarker = this.state.startTime !== null || this.state.endTime !== null;

    // Show/hide toggle container based on whether any marker is set
    if (hasAnyMarker) {
      this.toggleContainer.classList.remove('kanjo-hidden');
    } else {
      this.toggleContainer.classList.add('kanjo-hidden');
    }

    this.toggleBtn.disabled = !canToggle;

    if (this.state.enabled) {
      this.toggleBtn.classList.add('kanjo-active');
      this.toggleBtn.title = 'Disable A/B loop';
    } else {
      this.toggleBtn.classList.remove('kanjo-active');
      this.toggleBtn.title = canToggle ? 'Enable A/B loop' : 'Set A and B points first';
    }

    // Update download menu item
    if (!this.isDownloading) {
      this.downloadMenuItem.disabled = !canToggle;

      if (canToggle) {
        const duration = this.state.endTime! - this.state.startTime!;
        if (duration > MAX_LOOP_DURATION) {
          this.downloadMenuItem.classList.add('kanjo-disabled');
          this.downloadMenuItem.title = `Clip too long (${Math.round(duration)}s). Max: ${MAX_LOOP_DURATION}s`;
        } else {
          this.downloadMenuItem.classList.remove('kanjo-disabled');
          this.downloadMenuItem.title = `Download ${Math.round(duration)}s clip`;
        }
      } else {
        this.downloadMenuItem.title = 'Set A and B points to download';
      }
    }

    // Update clear menu item
    this.clearMenuItem.disabled = !hasAnyMarker;
    this.clearMenuItem.title = hasAnyMarker ? 'Clear loop points' : 'No markers to clear';
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
      // Enforce max duration - don't allow if would exceed limit
      if (this.state.endTime !== null && (this.state.endTime - time) > MAX_LOOP_DURATION) {
        time = this.state.endTime - MAX_LOOP_DURATION;
      }
      this.state.startTime = Math.max(0, time);
      this.updateButtonStates();
      this.notifyStateChange();
    }
  }

  updateEndTime(time: number): void {
    if (this.state.startTime === null || time > this.state.startTime) {
      // Enforce max duration - clamp if would exceed limit
      if (this.state.startTime !== null && (time - this.state.startTime) > MAX_LOOP_DURATION) {
        time = this.state.startTime + MAX_LOOP_DURATION;
      }
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

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.loopDownloader) {
      this.loopDownloader.destroy();
      this.loopDownloader = null;
    }
  }
}
