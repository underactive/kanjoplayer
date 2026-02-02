/**
 * Fullscreen toggle button
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import { UIBuilder } from '../UIBuilder';

export class FullscreenButton {
  private element: HTMLButtonElement;
  private player: KanjoPlayer;
  private unsubscribeLocale?: () => void;

  constructor(player: KanjoPlayer) {
    this.player = player;
    this.element = this.createButton();
    this.bindEvents();
    this.unsubscribeLocale = player.locale.onChange(() => this.updateStrings());
  }

  private createButton(): HTMLButtonElement {
    const locale = this.player.locale;
    const btn = UIBuilder.button({
      className: 'kanjo-fullscreen-btn',
      icon: UIBuilder.icons.fullscreen,
      tooltip: locale.get('fullscreen.enter'),
      onClick: () => this.player.toggleFullscreen(),
    });
    btn.setAttribute('aria-label', locale.get('fullscreen.enter'));
    return btn;
  }

  private bindEvents(): void {
    this.player.on('fullscreenchange', ({ isFullscreen }) => {
      this.updateIcon(isFullscreen);
    });
  }

  private updateIcon(isFullscreen: boolean): void {
    const locale = this.player.locale;
    const icon = isFullscreen ? UIBuilder.icons.exitFullscreen : UIBuilder.icons.fullscreen;
    const tooltip = isFullscreen ? locale.get('fullscreen.exit') : locale.get('fullscreen.enter');

    this.element.innerHTML = icon;
    this.element.title = tooltip;
    this.element.setAttribute('aria-label', tooltip);
  }

  private updateStrings(): void {
    const isFullscreen = this.player.getState().isFullscreen;
    this.updateIcon(isFullscreen);
  }

  getElement(): HTMLButtonElement {
    return this.element;
  }

  destroy(): void {
    this.unsubscribeLocale?.();
  }
}
