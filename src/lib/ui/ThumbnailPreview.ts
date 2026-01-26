/**
 * Thumbnail preview popup on progress bar hover
 * Includes debouncing and request cancellation to prevent excessive loading
 */

import type { KimochiPlayer } from '../core/KimochiPlayer';
import { UIBuilder } from './UIBuilder';

export class ThumbnailPreview {
  private element: HTMLElement;
  private imageContainer: HTMLElement;
  private timeLabel: HTMLElement;
  private player: KimochiPlayer;

  // State tracking
  private currentTime = -1;
  private lastLoadedTime = -1;
  private isLoading = false;

  // Debouncing
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceDelay = 150; // ms to wait before loading

  // Request tracking for cancellation
  private requestId = 0;

  // Minimum time difference to trigger a new load (in seconds)
  // Larger values = fewer requests but less precise previews
  private readonly minTimeDelta = 2;

  constructor(player: KimochiPlayer) {
    this.player = player;
    this.imageContainer = UIBuilder.create({ className: 'kimochi-thumbnail-image' });
    this.timeLabel = UIBuilder.create({ className: 'kimochi-thumbnail-time' });
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kimochi-thumbnail-preview',
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
    this.element.classList.add('kimochi-visible');

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
    this.element.classList.remove('kimochi-visible');

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
    this.imageContainer.classList.add('kimochi-loading');

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
        this.imageContainer.classList.remove('kimochi-loading');
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
    this.imageContainer.classList.remove('kimochi-loading');
  }
}
