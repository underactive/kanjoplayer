/**
 * Thumbnail preview popup on progress bar hover
 * Includes debouncing and request cancellation to prevent excessive loading
 */

import type { KanjoPlayer } from '../core/KanjoPlayer';
import { UIBuilder } from './UIBuilder';

export class ThumbnailPreview {
  private element: HTMLElement;
  private imageContainer: HTMLElement;
  private timeLabel: HTMLElement;
  private player: KanjoPlayer;

  // State tracking
  private currentTime = -1;
  private lastLoadedTime = -1;
  private isLoading = false;

  // Debouncing - very short, just to batch rapid mousemove events
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceDelay = 30; // ms - minimal debounce for batching

  // Request tracking for cancellation
  private requestId = 0;

  // Minimum time difference to trigger a new load (in seconds)
  private readonly minTimeDelta = 0.5;

  constructor(player: KanjoPlayer) {
    this.player = player;
    this.imageContainer = UIBuilder.create({ className: 'kanjo-thumbnail-image' });
    this.timeLabel = UIBuilder.create({ className: 'kanjo-thumbnail-time' });
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kanjo-thumbnail-preview',
    });

    container.appendChild(this.imageContainer);
    container.appendChild(this.timeLabel);

    return container;
  }

  async show(time: number, xPosition: number, containerWidth: number): Promise<void> {
    // Always update time label immediately (this is cheap)
    this.timeLabel.textContent = UIBuilder.formatTime(time);

    // Position the preview
    const previewWidth = 160;
    const halfWidth = previewWidth / 2;
    let left = xPosition - halfWidth;

    // Keep within bounds
    left = Math.max(0, Math.min(left, containerWidth - previewWidth));
    this.element.style.left = `${left}px`;

    // Show the preview
    this.element.classList.add('kanjo-visible');

    // Update current target time
    this.currentTime = time;

    // Check if we need to load a new thumbnail
    const timeDelta = Math.abs(time - this.lastLoadedTime);

    if (timeDelta > this.minTimeDelta) {
      // Cancel any pending debounced request
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Debounce the thumbnail load
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        // Only load if we're still showing and time hasn't changed much
        if (Math.abs(this.currentTime - time) < 1) {
          this.loadThumbnail(time);
        }
      }, this.debounceDelay);
    }
  }

  hide(): void {
    this.element.classList.remove('kanjo-visible');

    // Cancel any pending request
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private async loadThumbnail(time: number): Promise<void> {
    // Don't start new load if already loading
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.imageContainer.classList.add('kanjo-loading');

    // Track this request
    const thisRequestId = ++this.requestId;

    try {
      const thumbnail = await this.player.getThumbnail(time);

      // Check if this request is still relevant
      // (user might have moved to a different time while we were loading)
      if (thisRequestId !== this.requestId) {
        return; // Stale request, ignore result
      }

      if (thumbnail) {
        this.lastLoadedTime = time;

        if (thumbnail.sprite) {
          // Sprite-based thumbnail
          this.imageContainer.style.backgroundImage = `url(${thumbnail.url})`;
          this.imageContainer.style.backgroundPosition = `-${thumbnail.sprite.x}px -${thumbnail.sprite.y}px`;
          this.imageContainer.style.width = `${thumbnail.sprite.width}px`;
          this.imageContainer.style.height = `${thumbnail.sprite.height}px`;
        } else {
          // Direct image thumbnail
          this.imageContainer.style.backgroundImage = `url(${thumbnail.url})`;
          this.imageContainer.style.backgroundPosition = 'center';
          this.imageContainer.style.backgroundSize = 'cover';
          this.imageContainer.style.width = `${thumbnail.width}px`;
          this.imageContainer.style.height = `${thumbnail.height}px`;
        }
      }
    } catch (error) {
      // Only log if this is still the current request
      if (thisRequestId === this.requestId) {
        console.warn('Failed to load thumbnail:', error);
      }
    } finally {
      // Only clear loading state if this is still the current request
      if (thisRequestId === this.requestId) {
        this.isLoading = false;
        this.imageContainer.classList.remove('kanjo-loading');
      }
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Reset state (e.g., when source changes)
   */
  reset(): void {
    this.currentTime = -1;
    this.lastLoadedTime = -1;
    this.isLoading = false;
    this.requestId = 0;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.imageContainer.style.backgroundImage = '';
    this.imageContainer.classList.remove('kanjo-loading');
  }
}
