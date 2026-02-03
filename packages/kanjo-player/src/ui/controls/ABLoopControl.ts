/**
 * A/B Loop Control - Set start and end points for looped playback
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import type { WatermarkConfig } from '../../core/types';
import { UIBuilder } from '../UIBuilder';
import { ClipDownloader, type PrepareDownloadOptions } from '../../download/ClipDownloader';
import type { DashPlugin } from '../../plugins/built-in/DashPlugin';
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
  private clipDownloader: ClipDownloader | null = null;
  private downloadOverlay: DownloadOverlay | null = null;
  private isDownloading = false;

  // Markers on progress bar (managed externally via callbacks)
  private onStateChange: ((state: ABLoopState) => void) | null = null;

  // Locale subscription
  private unsubscribeLocale?: () => void;

  // Live stream state - used to track disabled state for live streams
  private liveMode = false;

  constructor(player: KanjoPlayer, options?: ABLoopControlOptions) {
    this.player = player;
    this.options = options || {};

    const locale = this.player.locale;

    // Create buttons with text labels (A [ time) and (time ] B)
    this.startBtn = this.createLoopPointButton('start', locale.get('loop.setStart'), () =>
      this.setStartPoint()
    );
    this.startBtn.classList.add('kanjo-abloop-start');

    this.endBtn = this.createLoopPointButton('end', locale.get('loop.setEnd'), () =>
      this.setEndPoint()
    );
    this.endBtn.classList.add('kanjo-abloop-end');

    // Create toggle button with dropdown
    this.toggleBtn = this.createToggleButton();
    this.toggleDropdown = this.createToggleDropdown();
    this.toggleContainer = this.createToggleContainer();

    this.element = this.createElement();
    this.bindEvents();
    this.updateButtonStates();

    this.unsubscribeLocale = player.locale.onChange(() => this.updateStrings());
  }

  private createLoopPointButton(
    type: 'start' | 'end',
    tooltip: string,
    onClick: () => void
  ): HTMLButtonElement {
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
    const locale = this.player.locale;
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

    btn.title = locale.get('loop.toggle');
    btn.setAttribute('aria-label', locale.get('loop.toggle'));

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
    const locale = this.player.locale;
    const dropdown = UIBuilder.create({
      className: 'kanjo-abloop-dropdown',
    });

    // Download clip option
    this.downloadMenuItem = document.createElement('button');
    this.downloadMenuItem.type = 'button';
    this.downloadMenuItem.className = 'kanjo-abloop-dropdown-item';
    this.downloadMenuItem.innerHTML = `
      <span class="kanjo-abloop-dropdown-icon">${UIBuilder.icons.downloadLoop}</span>
      <span class="kanjo-abloop-dropdown-label">${locale.get('loop.downloadClip')}</span>
    `;
    this.downloadMenuItem.title = locale.get('loop.downloadClip');
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
      <span class="kanjo-abloop-dropdown-label">${locale.get('loop.clearMarkers')}</span>
    `;
    this.clearMenuItem.title = locale.get('loop.clearTitle');
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
      if (this.state.enabled && this.state.startTime !== null && this.state.endTime !== null) {
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

    // Listen for live state changes
    this.player.on('livestatechange', ({ isLive }) => {
      this.setLiveState(isLive);
    });
  }

  private setLiveState(isLive: boolean): void {
    this.liveMode = isLive;
    const locale = this.player.locale;

    this.element.classList.toggle('kanjo-live-disabled', this.liveMode);

    if (this.liveMode) {
      this.element.title = locale.get('loop.notAvailableLive');
      this.startBtn.disabled = true;
      this.endBtn.disabled = true;
      this.toggleBtn.disabled = true;
    } else {
      this.element.title = '';
      this.startBtn.disabled = false;
      this.endBtn.disabled = false;
      this.updateButtonStates();
    }
  }

  private setStartPoint(): void {
    const currentTime = this.player.getCurrentTime();

    // If end point exists and is before current time, clear it
    if (this.state.endTime !== null && currentTime >= this.state.endTime) {
      this.state.endTime = null;
    }

    // If end point exists and duration would exceed max, clear it
    if (this.state.endTime !== null && this.state.endTime - currentTime > MAX_LOOP_DURATION) {
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
      if (this.state.startTime !== null && endTime - this.state.startTime > MAX_LOOP_DURATION) {
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

    const locale = this.player.locale;
    const duration = this.state.endTime - this.state.startTime;

    // Check duration limit
    if (duration > MAX_LOOP_DURATION) {
      if (this.downloadOverlay) {
        this.downloadOverlay.showError(
          locale.t('loop.tooLong', { duration: Math.round(duration), max: MAX_LOOP_DURATION })
        );
      } else {
        alert(
          `Clip duration (${Math.round(duration)}s) exceeds maximum of ${MAX_LOOP_DURATION} seconds.\n\nPlease set a shorter loop region.`
        );
      }
      return;
    }

    // Check if downloading is supported
    if (!ClipDownloader.isSupported()) {
      if (this.downloadOverlay) {
        this.downloadOverlay.showError(locale.get('download.notSupported'));
      } else {
        alert(
          'Loop download is not supported in this browser.\n\nPlease use a modern browser with WebAssembly support.'
        );
      }
      return;
    }

    // Initialize downloader lazily
    if (!this.clipDownloader) {
      this.clipDownloader = new ClipDownloader(this.player, {
        maxDuration: MAX_LOOP_DURATION,
        watermark: this.options.watermark,
      });
    }

    this.isDownloading = true;
    this.updateDownloadButtonState('downloading');

    try {
      // Get current quality from DashPlugin if available (for DASH sources)
      const downloadOptions: PrepareDownloadOptions = {};
      const state = this.player.getState();
      if (state.sourceType === 'dash') {
        const dashPlugin = this.player.getPlugin<DashPlugin>('dash');
        if (dashPlugin) {
          const currentQuality = dashPlugin.getCurrentQuality();
          if (currentQuality >= 0) {
            downloadOptions.dashQualityIndex = currentQuality;
            console.log(`[ABLoopControl] Using DASH quality index: ${currentQuality}`);
          }
        }
      }

      const { blob, filename } = await this.clipDownloader.prepareDownload(
        this.state.startTime,
        this.state.endTime,
        (progress) => this.onDownloadProgress(progress),
        downloadOptions
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
          this.downloadOverlay.showError(
            error instanceof Error ? error.message : 'Download failed'
          );
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
    if (this.clipDownloader && this.isDownloading) {
      this.clipDownloader.cancel();
      this.isDownloading = false;
      this.updateDownloadButtonState('idle');
      console.log('[ABLoopControl] Download cancelled by user');
    }
  }

  private updateDownloadButtonState(state: 'idle' | 'downloading'): void {
    const locale = this.player.locale;
    const iconEl = this.downloadMenuItem.querySelector('.kanjo-abloop-dropdown-icon');

    if (state === 'downloading') {
      if (iconEl) iconEl.innerHTML = UIBuilder.icons.spinner;
      this.downloadMenuItem.classList.add('kanjo-downloading');
      this.downloadMenuItem.disabled = true;
      this.downloadMenuItem.title = locale.get('download.preparing');
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
    const locale = this.player.locale;
    const startTimeSpan = this.startBtn.querySelector('.kanjo-abloop-time');
    const endTimeSpan = this.endBtn.querySelector('.kanjo-abloop-time');

    // Check if video duration requires showing hours
    const showHours = UIBuilder.needsHours(this.player.getDuration());

    // Update start button - format: "A [ 00:04:20.123" or "A [" when no time
    if (this.state.startTime !== null) {
      this.startBtn.classList.add('kanjo-active');
      const timeStr = UIBuilder.formatTimePrecise(this.state.startTime, showHours);
      this.startBtn.title = locale.t('loop.startAt', { time: timeStr });
      if (startTimeSpan) startTimeSpan.textContent = ' ' + timeStr;
    } else {
      this.startBtn.classList.remove('kanjo-active');
      this.startBtn.title = locale.get('loop.setStart');
      if (startTimeSpan) startTimeSpan.textContent = '';
    }

    // Update end button - format: "00:04:33.456 ] B" or "] B" when no time
    if (this.state.endTime !== null) {
      this.endBtn.classList.add('kanjo-active');
      const timeStr = UIBuilder.formatTimePrecise(this.state.endTime, showHours);
      this.endBtn.title = locale.t('loop.endAt', { time: timeStr });
      if (endTimeSpan) endTimeSpan.textContent = timeStr + ' ';
    } else {
      this.endBtn.classList.remove('kanjo-active');
      this.endBtn.title = locale.get('loop.setEnd');
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
      this.toggleBtn.title = locale.get('loop.disable');
    } else {
      this.toggleBtn.classList.remove('kanjo-active');
      this.toggleBtn.title = canToggle
        ? locale.get('loop.enable')
        : locale.get('loop.setPointsFirst');
    }

    // Update download menu item
    if (!this.isDownloading) {
      this.downloadMenuItem.disabled = !canToggle;

      if (canToggle) {
        const duration = this.state.endTime! - this.state.startTime!;
        if (duration > MAX_LOOP_DURATION) {
          this.downloadMenuItem.classList.add('kanjo-disabled');
          this.downloadMenuItem.title = locale.t('loop.tooLong', {
            duration: Math.round(duration),
            max: MAX_LOOP_DURATION,
          });
        } else {
          this.downloadMenuItem.classList.remove('kanjo-disabled');
          this.downloadMenuItem.title = locale.t('loop.downloadDuration', {
            duration: Math.round(duration),
          });
        }
      } else {
        this.downloadMenuItem.title = locale.get('loop.setPointsToDownload');
      }
    }

    // Update clear menu item
    this.clearMenuItem.disabled = !hasAnyMarker;
    this.clearMenuItem.title = hasAnyMarker
      ? locale.get('loop.clearTitle')
      : locale.get('loop.noMarkers');
  }

  private updateStrings(): void {
    const locale = this.player.locale;

    // Update dropdown labels
    const downloadLabel = this.downloadMenuItem.querySelector('.kanjo-abloop-dropdown-label');
    if (downloadLabel) {
      downloadLabel.textContent = locale.get('loop.downloadClip');
    }

    const clearLabel = this.clearMenuItem.querySelector('.kanjo-abloop-dropdown-label');
    if (clearLabel) {
      clearLabel.textContent = locale.get('loop.clearMarkers');
    }

    // Re-update all button states with new locale
    this.updateButtonStates();
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
      if (this.state.endTime !== null && this.state.endTime - time > MAX_LOOP_DURATION) {
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
      if (this.state.startTime !== null && time - this.state.startTime > MAX_LOOP_DURATION) {
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
    this.unsubscribeLocale?.();
    if (this.clipDownloader) {
      this.clipDownloader.destroy();
      this.clipDownloader = null;
    }
  }
}
