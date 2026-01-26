/**
 * Thumbnail preview popup on progress bar hover
 */

import type { KimochiPlayer } from '../core/KimochiPlayer';
import { UIBuilder } from './UIBuilder';

export class ThumbnailPreview {
  private element: HTMLElement;
  private imageContainer: HTMLElement;
  private timeLabel: HTMLElement;
  private player: KimochiPlayer;
  private currentTime = -1;
  private isLoading = false;

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
    // Update time label
    this.timeLabel.textContent = UIBuilder.formatTime(time);

    // Position the preview
    const previewWidth = 160; // Match thumbnail width
    const halfWidth = previewWidth / 2;
    let left = xPosition - halfWidth;

    // Keep within bounds
    left = Math.max(0, Math.min(left, containerWidth - previewWidth));
    this.element.style.left = `${left}px`;

    // Show the preview
    this.element.classList.add('kimochi-visible');

    // Load thumbnail if time changed significantly
    if (Math.abs(time - this.currentTime) > 0.5 && !this.isLoading) {
      this.currentTime = time;
      await this.loadThumbnail(time);
    }
  }

  hide(): void {
    this.element.classList.remove('kimochi-visible');
  }

  private async loadThumbnail(time: number): Promise<void> {
    this.isLoading = true;
    this.imageContainer.classList.add('kimochi-loading');

    try {
      const thumbnail = await this.player.getThumbnail(time);

      if (thumbnail && Math.abs(time - this.currentTime) < 0.5) {
        // Still showing the same time
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
      console.warn('Failed to load thumbnail:', error);
    } finally {
      this.isLoading = false;
      this.imageContainer.classList.remove('kimochi-loading');
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
