/**
 * Fullscreen toggle button
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import { UIBuilder } from '../UIBuilder';

export class FullscreenButton {
  private element: HTMLButtonElement;
  private player: KanjoPlayer;

  constructor(player: KanjoPlayer) {
    this.player = player;
    this.element = this.createButton();
    this.bindEvents();
  }

  private createButton(): HTMLButtonElement {
    return UIBuilder.button({
      className: 'kanjo-fullscreen-btn',
      icon: UIBuilder.icons.fullscreen,
      tooltip: 'Fullscreen (F)',
      onClick: () => this.player.toggleFullscreen(),
    });
  }

  private bindEvents(): void {
    this.player.on('fullscreenchange', ({ isFullscreen }) => {
      this.updateIcon(isFullscreen);
    });
  }

  private updateIcon(isFullscreen: boolean): void {
    const icon = isFullscreen ? UIBuilder.icons.exitFullscreen : UIBuilder.icons.fullscreen;
    const tooltip = isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)';

    this.element.innerHTML = icon;
    this.element.title = tooltip;
    this.element.setAttribute('aria-label', tooltip);
  }

  getElement(): HTMLButtonElement {
    return this.element;
  }
}
