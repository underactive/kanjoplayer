/**
 * Volume control with mute button and slider
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import { UIBuilder } from '../UIBuilder';

export class VolumeControl {
  private element: HTMLElement;
  private muteBtn: HTMLButtonElement;
  private slider: HTMLInputElement;
  private sliderContainer: HTMLElement;
  private player: KanjoPlayer;

  constructor(player: KanjoPlayer) {
    this.player = player;
    this.muteBtn = this.createMuteButton();
    this.slider = this.createSlider();
    this.sliderContainer = this.createSliderContainer();
    this.element = this.createElement();
    this.bindEvents();
  }

  private createMuteButton(): HTMLButtonElement {
    return UIBuilder.button({
      className: 'kanjo-volume-btn',
      icon: UIBuilder.icons.volumeHigh,
      tooltip: 'Mute (M)',
      onClick: () => this.player.toggleMute(),
    });
  }

  private createSlider(): HTMLInputElement {
    const slider = UIBuilder.slider({
      className: 'kanjo-volume-slider',
      min: 0,
      max: 100,
      step: 1,
      value: 100,
      onInput: (value) => {
        this.player.setVolume(value / 100);
        if (value > 0 && this.player.getState().muted) {
          this.player.unmute();
        }
      },
    });
    return slider;
  }

  private createSliderContainer(): HTMLElement {
    const container = UIBuilder.create({ className: 'kanjo-volume-slider-container' });
    container.appendChild(this.slider);
    return container;
  }

  private createElement(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kanjo-volume-control',
    });

    container.appendChild(this.muteBtn);
    container.appendChild(this.sliderContainer);

    return container;
  }

  private bindEvents(): void {
    this.player.on('volumechange', ({ volume, muted }) => {
      this.updateIcon(volume, muted);
      this.slider.value = String(muted ? 0 : volume * 100);
      this.updateSliderBackground(muted ? 0 : volume * 100);
    });

    // Initialize slider background
    const state = this.player.getState();
    this.updateSliderBackground(state.muted ? 0 : state.volume * 100);
  }

  private updateIcon(volume: number, muted: boolean): void {
    let icon = UIBuilder.icons.volumeHigh;
    let tooltip = 'Mute (M)';

    if (muted || volume === 0) {
      icon = UIBuilder.icons.volumeMuted;
      tooltip = 'Unmute (M)';
    } else if (volume < 0.5) {
      icon = UIBuilder.icons.volumeLow;
    }

    this.muteBtn.innerHTML = icon;
    this.muteBtn.title = tooltip;
  }

  private updateSliderBackground(percent: number): void {
    const gradient = `linear-gradient(to right, var(--kanjo-primary) ${percent}%, var(--kanjo-progress-bg) ${percent}%)`;
    this.slider.style.background = gradient;
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
