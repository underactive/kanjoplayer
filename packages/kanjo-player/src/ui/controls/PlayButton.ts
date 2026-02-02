/**
 * Play/Pause button component
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import { UIBuilder } from '../UIBuilder';

export class PlayButton {
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
      className: 'kanjo-play-btn',
      icon: UIBuilder.icons.play,
      tooltip: locale.get('play.tooltip'),
      onClick: () => this.player.togglePlay(),
    });
    btn.setAttribute('aria-label', locale.get('play.ariaLabel'));
    return btn;
  }

  private bindEvents(): void {
    this.player.on('play', () => this.updateIcon(false));
    this.player.on('pause', () => this.updateIcon(true));
    this.player.on('ended', () => this.updateIcon(true));
    this.player.on('sourcechange', () => this.updateIcon(true));
  }

  private updateIcon(paused: boolean): void {
    const locale = this.player.locale;
    this.element.innerHTML = paused ? UIBuilder.icons.play : UIBuilder.icons.pause;
    this.element.title = paused ? locale.get('play.tooltip') : locale.get('pause.tooltip');
    this.element.setAttribute(
      'aria-label',
      paused ? locale.get('play.ariaLabel') : locale.get('pause.ariaLabel')
    );
  }

  private updateStrings(): void {
    const paused = this.player.isPaused();
    this.updateIcon(paused);
  }

  getElement(): HTMLButtonElement {
    return this.element;
  }

  destroy(): void {
    this.unsubscribeLocale?.();
  }
}

export class CenterPlayButton {
  private element: HTMLElement;
  private player: KanjoPlayer;
  private unsubscribeLocale?: () => void;

  constructor(player: KanjoPlayer) {
    this.player = player;
    this.element = this.createElement();
    this.bindEvents();
    this.unsubscribeLocale = player.locale.onChange(() => this.updateStrings());
  }

  private createElement(): HTMLElement {
    const locale = this.player.locale;
    const container = UIBuilder.create({
      className: 'kanjo-center-play',
      children: [
        {
          tag: 'button',
          className: 'kanjo-center-play-btn',
          html: UIBuilder.icons.play,
          attrs: {
            'type': 'button',
            'aria-label': locale.get('play.ariaLabel'),
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
    const locale = this.player.locale;

    this.player.on('play', () => {
      btn.innerHTML = UIBuilder.icons.pause;
      btn.setAttribute('aria-label', locale.get('pause.ariaLabel'));
      this.element.classList.add('kanjo-hidden');
    });

    this.player.on('pause', () => {
      btn.innerHTML = UIBuilder.icons.play;
      btn.setAttribute('aria-label', locale.get('play.ariaLabel'));
      this.element.classList.remove('kanjo-hidden');
    });

    this.player.on('ended', () => {
      btn.innerHTML = UIBuilder.icons.replay;
      btn.setAttribute('aria-label', locale.get('replay.ariaLabel'));
      this.element.classList.remove('kanjo-hidden');
    });

    this.player.on('sourcechange', () => {
      btn.innerHTML = UIBuilder.icons.play;
      btn.setAttribute('aria-label', locale.get('play.ariaLabel'));
      this.element.classList.remove('kanjo-hidden');
    });
  }

  private updateStrings(): void {
    const btn = this.element.querySelector('.kanjo-center-play-btn');
    if (!btn) return;

    const locale = this.player.locale;
    const state = this.player.getState();

    if (state.ended) {
      btn.setAttribute('aria-label', locale.get('replay.ariaLabel'));
    } else if (state.paused) {
      btn.setAttribute('aria-label', locale.get('play.ariaLabel'));
    } else {
      btn.setAttribute('aria-label', locale.get('pause.ariaLabel'));
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.unsubscribeLocale?.();
  }
}
