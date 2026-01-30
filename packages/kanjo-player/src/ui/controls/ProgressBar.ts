/**
 * Progress bar with scrubber, buffered indicator, and thumbnail preview
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import { UIBuilder } from '../UIBuilder';
import { ThumbnailPreview } from '../ThumbnailPreview';
import type { ABLoopState } from './ABLoopControl';

export class ProgressBar {
  private element: HTMLElement;
  private progressContainer: HTMLElement;
  private track: HTMLElement;
  private playedBar: HTMLElement;
  private bufferedBar: HTMLElement;
  private scrubber: HTMLElement;
  private hoverTime: HTMLElement;
  private thumbnailPreview: ThumbnailPreview;
  private player: KanjoPlayer;
  private isDragging = false;

  // Loop markers
  private loopStartMarker: HTMLElement;
  private loopEndMarker: HTMLElement;
  private loopRegion: HTMLElement;
  private onLoopMarkerDrag: ((type: 'start' | 'end', time: number) => void) | null = null;

  // Zoom mode for fine-tuning markers
  private zoomIndicator: HTMLElement;
  private isZoomed = false;
  private zoomStartTime = 0;
  private zoomEndTime = 0;
  private zoomHoldTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly zoomHoldDelay = 800; // 0.8 second hold to trigger zoom
  private currentLoopStart: number | null = null;
  private currentLoopEnd: number | null = null;
  private isDraggingMarker = false;

  constructor(player: KanjoPlayer) {
    this.player = player;
    this.thumbnailPreview = new ThumbnailPreview(player);
    this.playedBar = UIBuilder.create({ className: 'kanjo-progress-played' });
    this.bufferedBar = UIBuilder.create({ className: 'kanjo-progress-buffered' });
    this.scrubber = UIBuilder.create({ className: 'kanjo-progress-scrubber' });
    this.hoverTime = UIBuilder.create({ className: 'kanjo-progress-hover-time' });

    // Loop markers
    this.loopRegion = UIBuilder.create({ className: 'kanjo-loop-region' });
    this.loopStartMarker = this.createLoopMarker('start');
    this.loopEndMarker = this.createLoopMarker('end');

    // Zoom indicator for fine-tuning
    this.zoomIndicator = UIBuilder.create({ className: 'kanjo-zoom-indicator' });

    this.track = UIBuilder.create({ className: 'kanjo-progress-track' });
    this.progressContainer = this.createProgressContainer();
    this.element = this.createElement();
    this.bindEvents();
  }

  private createLoopMarker(type: 'start' | 'end'): HTMLElement {
    const marker = UIBuilder.create({
      className: `kanjo-loop-marker kanjo-loop-marker-${type}`,
      attrs: {
        'data-type': type,
        'title': type === 'start' ? 'Clip start (drag to move)' : 'Clip end (drag to move)',
      },
    });

    // Inner handle for better visibility
    const handle = UIBuilder.create({ className: 'kanjo-loop-marker-handle' });
    handle.textContent = type === 'start' ? '[' : ']';
    marker.appendChild(handle);

    return marker;
  }

  private createProgressContainer(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kanjo-progress-container',
      attrs: {
        'role': 'slider',
        'aria-label': 'Video progress',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': '0',
        'tabindex': '0',
      },
    });

    // Track background
    this.track.appendChild(this.bufferedBar);
    this.track.appendChild(this.loopRegion);
    this.track.appendChild(this.playedBar);
    this.track.appendChild(this.loopStartMarker);
    this.track.appendChild(this.loopEndMarker);
    this.track.appendChild(this.scrubber);

    container.appendChild(this.track);
    container.appendChild(this.hoverTime);

    return container;
  }

  private createElement(): HTMLElement {
    const wrapper = UIBuilder.create({ className: 'kanjo-progress-wrapper' });
    wrapper.appendChild(this.thumbnailPreview.getElement());
    wrapper.appendChild(this.zoomIndicator);
    wrapper.appendChild(this.progressContainer);
    return wrapper;
  }

  private bindEvents(): void {
    // Reset on source change
    this.player.on('sourcechange', () => {
      this.reset();
    });

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

    // Check if clicking on a loop marker
    const target = e.target as HTMLElement;
    const markerType = this.getMarkerType(target);

    if (markerType) {
      this.startMarkerDrag(markerType, e);
      return;
    }

    this.isDragging = true;
    this.progressContainer.classList.add('kanjo-dragging');

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
      this.progressContainer.classList.remove('kanjo-dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  private getMarkerType(target: HTMLElement): 'start' | 'end' | null {
    const marker = target.closest('.kanjo-loop-marker') as HTMLElement;
    if (marker) {
      return marker.dataset.type as 'start' | 'end';
    }
    return null;
  }

  private startMarkerDrag(type: 'start' | 'end', e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    // Track that we're dragging a marker (prevents hover time display)
    this.isDraggingMarker = true;

    // Track which marker is being dragged
    const draggingMarkerType = type;

    // Start hold timer for zoom mode
    this.zoomHoldTimer = setTimeout(() => {
      this.enterZoomMode(draggingMarkerType);
    }, this.zoomHoldDelay);

    const onMouseMove = (e: MouseEvent) => {
      let time: number;

      if (this.isZoomed) {
        // In zoom mode, map mouse position to zoomed time range
        time = this.getTimeFromZoomedPosition(e);

        // Clamp time to valid range for this marker
        if (draggingMarkerType === 'start' && this.currentLoopEnd !== null) {
          time = Math.min(time, this.currentLoopEnd - 0.1);
        } else if (draggingMarkerType === 'end' && this.currentLoopStart !== null) {
          time = Math.max(time, this.currentLoopStart + 0.1);
        }
        time = Math.max(0, Math.min(time, this.player.getDuration()));
      } else {
        const percent = this.getPercentFromEvent(e);
        time = this.getTimeFromPercent(percent);
      }

      // Reset zoom hold timer on significant movement
      if (this.zoomHoldTimer) {
        clearTimeout(this.zoomHoldTimer);
        this.zoomHoldTimer = setTimeout(() => {
          if (!this.isZoomed) {
            this.enterZoomMode(draggingMarkerType);
          }
        }, this.zoomHoldDelay);
      }

      if (this.onLoopMarkerDrag) {
        this.onLoopMarkerDrag(type, time);
      }

      // Show thumbnail preview at marker time during drag (includes time label)
      // Use precise time formatting when dragging markers for fine-tuning
      const rect = this.progressContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      this.thumbnailPreview.show(time, x, rect.width, true);

      // Update zoomed view if in zoom mode
      if (this.isZoomed) {
        this.updateZoomedView();
      }
    };

    const onMouseUp = () => {
      // Clear marker dragging state
      this.isDraggingMarker = false;

      // Clear hold timer
      if (this.zoomHoldTimer) {
        clearTimeout(this.zoomHoldTimer);
        this.zoomHoldTimer = null;
      }

      // Exit zoom mode
      if (this.isZoomed) {
        this.exitZoomMode();
      }

      // Hide hover time display
      this.hoverTime.classList.remove('kanjo-visible');

      // Hide thumbnail preview
      this.thumbnailPreview.hide();

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  private enterZoomMode(draggingMarker: 'start' | 'end'): void {
    if (this.currentLoopStart === null || this.currentLoopEnd === null) {
      return; // Need both markers to zoom
    }

    this.isZoomed = true;

    const duration = this.player.getDuration();
    const loopDuration = this.currentLoopEnd - this.currentLoopStart;

    // Zoom window size: enough to see the loop plus room to adjust
    // Scale based on loop duration - smaller loops get more zoomed in
    const zoomWindowSize = Math.max(
      loopDuration * 3, // 3x the loop duration
      15 // Minimum 15 seconds window
    );

    // Center the zoom on the marker being dragged
    const centerTime = draggingMarker === 'start' ? this.currentLoopStart : this.currentLoopEnd;

    this.zoomStartTime = Math.max(0, centerTime - zoomWindowSize / 2);
    this.zoomEndTime = Math.min(duration, centerTime + zoomWindowSize / 2);

    // Ensure we can see both markers
    if (this.currentLoopStart < this.zoomStartTime) {
      this.zoomStartTime = Math.max(0, this.currentLoopStart - 2);
    }
    if (this.currentLoopEnd > this.zoomEndTime) {
      this.zoomEndTime = Math.min(duration, this.currentLoopEnd + 2);
    }

    // Update zoom indicator
    this.zoomIndicator.innerHTML = `
      <div class="kanjo-zoom-label">Fine Tuning: ${draggingMarker === 'start' ? 'Start' : 'End'} Point</div>
      <div class="kanjo-zoom-range">
        <span class="kanjo-zoom-time-start">${UIBuilder.formatTime(this.zoomStartTime)}</span>
        <span class="kanjo-zoom-time-center">${UIBuilder.formatTime(this.zoomEndTime - this.zoomStartTime)} window</span>
        <span class="kanjo-zoom-time-end">${UIBuilder.formatTime(this.zoomEndTime)}</span>
      </div>
    `;

    this.progressContainer.classList.add('kanjo-zoomed');
    this.zoomIndicator.classList.add('kanjo-visible');

    // Update the view to show zoomed state
    this.updateZoomedView();
  }

  private exitZoomMode(): void {
    this.isZoomed = false;
    this.progressContainer.classList.remove('kanjo-zoomed');
    this.zoomIndicator.classList.remove('kanjo-visible');

    // Restore normal view
    this.updateNormalView();
  }

  private getTimeFromZoomedPosition(e: MouseEvent): number {
    const rect = this.progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = UIBuilder.clamp(x / rect.width, 0, 1);

    // Map 0-1 to zoom range
    return this.zoomStartTime + percent * (this.zoomEndTime - this.zoomStartTime);
  }

  private getZoomedPercent(time: number): number {
    if (this.zoomEndTime === this.zoomStartTime) return 0;
    return ((time - this.zoomStartTime) / (this.zoomEndTime - this.zoomStartTime)) * 100;
  }

  private updateZoomedView(): void {
    const currentTime = this.player.getCurrentTime();

    // Update played bar position in zoomed view
    const playedPercent = UIBuilder.clamp(this.getZoomedPercent(currentTime), 0, 100);
    this.playedBar.style.width = `${playedPercent}%`;
    this.scrubber.style.left = `${playedPercent}%`;

    // Update loop markers in zoomed view
    if (this.currentLoopStart !== null) {
      const startPercent = this.getZoomedPercent(this.currentLoopStart);
      this.loopStartMarker.style.left = `${startPercent}%`;
    }

    if (this.currentLoopEnd !== null) {
      const endPercent = this.getZoomedPercent(this.currentLoopEnd);
      this.loopEndMarker.style.left = `${endPercent}%`;
    }

    // Update loop region in zoomed view
    if (this.currentLoopStart !== null && this.currentLoopEnd !== null) {
      const startPercent = this.getZoomedPercent(this.currentLoopStart);
      const endPercent = this.getZoomedPercent(this.currentLoopEnd);
      this.loopRegion.style.left = `${startPercent}%`;
      this.loopRegion.style.width = `${endPercent - startPercent}%`;
    }

    // Hide buffered bar in zoomed view (too complex to recalculate)
    this.bufferedBar.style.opacity = '0';
  }

  private updateNormalView(): void {
    const duration = this.player.getDuration();
    const currentTime = this.player.getCurrentTime();

    // Restore played bar
    if (duration > 0) {
      const percent = (currentTime / duration) * 100;
      this.playedBar.style.width = `${percent}%`;
      this.scrubber.style.left = `${percent}%`;
    }

    // Restore loop markers
    if (this.currentLoopStart !== null && duration > 0) {
      const startPercent = (this.currentLoopStart / duration) * 100;
      this.loopStartMarker.style.left = `${startPercent}%`;
    }

    if (this.currentLoopEnd !== null && duration > 0) {
      const endPercent = (this.currentLoopEnd / duration) * 100;
      this.loopEndMarker.style.left = `${endPercent}%`;
    }

    // Restore loop region
    if (this.currentLoopStart !== null && this.currentLoopEnd !== null && duration > 0) {
      const startPercent = (this.currentLoopStart / duration) * 100;
      const endPercent = (this.currentLoopEnd / duration) * 100;
      this.loopRegion.style.left = `${startPercent}%`;
      this.loopRegion.style.width = `${endPercent - startPercent}%`;
    }

    // Restore buffered bar
    this.bufferedBar.style.opacity = '1';
  }

  private onMouseMove(e: MouseEvent): void {
    // Skip if dragging scrubber or marker
    if (this.isDragging || this.isDraggingMarker) return;

    const rect = this.progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Calculate time based on zoom state
    let time: number;
    if (this.isZoomed) {
      time = this.getTimeFromZoomedPosition(e);
    } else {
      const percent = this.getPercentFromEvent(e);
      time = this.getTimeFromPercent(percent);
    }

    // Update thumbnail preview (includes time label, so no need for separate hoverTime)
    this.thumbnailPreview.show(time, x, rect.width);
  }

  private onMouseLeave(): void {
    if (!this.isDragging && !this.isDraggingMarker) {
      this.hoverTime.classList.remove('kanjo-visible');
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

  /**
   * Reset progress bar to initial state (e.g., on source change)
   */
  private reset(): void {
    this.updateProgress(0);
    this.bufferedBar.style.width = '0%';
    this.thumbnailPreview.reset();
    this.resetLoopMarkers();
  }

  private resetLoopMarkers(): void {
    this.loopStartMarker.classList.remove('kanjo-visible');
    this.loopEndMarker.classList.remove('kanjo-visible');
    this.loopRegion.classList.remove('kanjo-visible', 'kanjo-active');
    this.loopRegion.style.left = '0%';
    this.loopRegion.style.width = '0%';
  }

  /**
   * Update loop state from ABLoopControl
   */
  updateLoopState(state: ABLoopState): void {
    // Store current loop times for zoom mode
    this.currentLoopStart = state.startTime;
    this.currentLoopEnd = state.endTime;

    // If in zoom mode, update zoomed view instead
    if (this.isZoomed) {
      this.updateZoomedView();
      return;
    }

    const duration = this.player.getDuration();

    if (duration <= 0) return;

    // Update start marker
    if (state.startTime !== null) {
      const startPercent = (state.startTime / duration) * 100;
      this.loopStartMarker.style.left = `${startPercent}%`;
      this.loopStartMarker.classList.add('kanjo-visible');
    } else {
      this.loopStartMarker.classList.remove('kanjo-visible');
    }

    // Update end marker
    if (state.endTime !== null) {
      const endPercent = (state.endTime / duration) * 100;
      this.loopEndMarker.style.left = `${endPercent}%`;
      this.loopEndMarker.classList.add('kanjo-visible');
    } else {
      this.loopEndMarker.classList.remove('kanjo-visible');
    }

    // Update loop region highlight
    if (state.startTime !== null && state.endTime !== null) {
      const startPercent = (state.startTime / duration) * 100;
      const endPercent = (state.endTime / duration) * 100;
      this.loopRegion.style.left = `${startPercent}%`;
      this.loopRegion.style.width = `${endPercent - startPercent}%`;
      this.loopRegion.classList.add('kanjo-visible');

      if (state.enabled) {
        this.loopRegion.classList.add('kanjo-active');
      } else {
        this.loopRegion.classList.remove('kanjo-active');
      }
    } else {
      this.loopRegion.classList.remove('kanjo-visible', 'kanjo-active');
    }
  }

  /**
   * Set callback for when loop markers are dragged
   */
  setLoopMarkerDragCallback(callback: (type: 'start' | 'end', time: number) => void): void {
    this.onLoopMarkerDrag = callback;
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
