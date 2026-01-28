/**
 * Play/Pause button component
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import { UIBuilder } from '../UIBuilder';

export class PlayButton {
  private element: HTMLButtonElement;
  private player: KanjoPlayer;

  constructor(player: KanjoPlayer) {
    this.player = player;
    this.element = this.createButton();
    this.bindEvents();
  }

  private createButton(): HTMLButtonElement {
    const btn = UIBuilder.button({
      className: 'kanjo-play-btn',
      icon: UIBuilder.icons.play,
      tooltip: 'Play (Space)',
      onClick: () => this.player.togglePlay(),
    });
    return btn;
  }

  private bindEvents(): void {
    this.player.on('play', () => this.updateIcon(false));
    this.player.on('pause', () => this.updateIcon(true));
    this.player.on('ended', () => this.updateIcon(true));
    this.player.on('sourcechange', () => this.updateIcon(true));
  }

  private updateIcon(paused: boolean): void {
    this.element.innerHTML = paused ? UIBuilder.icons.play : UIBuilder.icons.pause;
    this.element.title = paused ? 'Play (Space)' : 'Pause (Space)';
    this.element.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  }

  getElement(): HTMLButtonElement {
    return this.element;
  }
}

export class CenterPlayButton {
  private element: HTMLElement;
  private player: KanjoPlayer;

  constructor(player: KanjoPlayer) {
    this.player = player;
    this.element = this.createElement();
    this.bindEvents();
  }

  private createElement(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kanjo-center-play',
      children: [
        {
          tag: 'button',
          className: 'kanjo-center-play-btn',
          html: UIBuilder.icons.play,
          attrs: {
            type: 'button',
            'aria-label': 'Play',
          },
          events: {
            click: (e) => {
              e.stopPropagation();
              this.player.togglePlay();
            },
          },
        },
      ],
    });
    return container;
  }

  private bindEvents(): void {
    const btn = this.element.querySelector('.kanjo-center-play-btn')!;

    this.player.on('play', () => {
      btn.innerHTML = UIBuilder.icons.pause;
      this.element.classList.add('kanjo-hidden');
    });

    this.player.on('pause', () => {
      btn.innerHTML = UIBuilder.icons.play;
      this.element.classList.remove('kanjo-hidden');
    });

    this.player.on('ended', () => {
      btn.innerHTML = UIBuilder.icons.replay;
      this.element.classList.remove('kanjo-hidden');
    });

    this.player.on('sourcechange', () => {
      btn.innerHTML = UIBuilder.icons.play;
      this.element.classList.remove('kanjo-hidden');
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
