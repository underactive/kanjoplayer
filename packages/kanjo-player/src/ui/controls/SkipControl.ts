/**
 * Skip forward/backward controls with duration dropdown
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import type { SkipControlConfig } from '../../core/types';
import { UIBuilder } from '../UIBuilder';

const DEFAULT_DURATIONS = [5, 10, 15, 30, 60];
const DEFAULT_DURATION = 10;

export interface SkipControlOptions {
  durations: number[];
  defaultDuration: number;
}

const DEFAULT_OPTIONS: SkipControlOptions = {
  durations: DEFAULT_DURATIONS,
  defaultDuration: DEFAULT_DURATION,
};

export class SkipControl {
  private element: HTMLElement;
  private player: KanjoPlayer;
  private options: SkipControlOptions;

  // Skip back elements
  private skipBackBtn: HTMLButtonElement;
  private skipBackDropdown: HTMLElement;
  private skipBackDuration: number;
  private skipBackOpen = false;

  // Skip forward elements
  private skipForwardBtn: HTMLButtonElement;
  private skipForwardDropdown: HTMLElement;
  private skipForwardDuration: number;
  private skipForwardOpen = false;

  constructor(player: KanjoPlayer, config?: SkipControlConfig) {
    this.player = player;
    this.options = {
      ...DEFAULT_OPTIONS,
      durations: config?.durations ?? DEFAULT_OPTIONS.durations,
      defaultDuration: config?.defaultDuration ?? DEFAULT_OPTIONS.defaultDuration,
    };

    this.skipBackDuration = this.options.defaultDuration;
    this.skipForwardDuration = this.options.defaultDuration;

    // Create skip back elements
    this.skipBackBtn = this.createSkipButton('back');
    this.skipBackDropdown = this.createDropdown('back');

    // Create skip forward elements
    this.skipForwardBtn = this.createSkipButton('forward');
    this.skipForwardDropdown = this.createDropdown('forward');

    this.element = this.createElement();
    this.bindEvents();
  }

  private createSkipButton(direction: 'back' | 'forward'): HTMLButtonElement {
    const icon = direction === 'back' ? UIBuilder.icons.skipBack : UIBuilder.icons.skipForward;
    const tooltip = direction === 'back' ? 'Skip back' : 'Skip forward';
    const duration = direction === 'back' ? this.skipBackDuration : this.skipForwardDuration;

    const btn = UIBuilder.create<HTMLButtonElement>({
      tag: 'button',
      className: `kanjo-btn kanjo-skip-btn kanjo-skip-${direction}`,
      attrs: { type: 'button', title: `${tooltip} ${duration}s` },
    });

    // Icon container
    const iconEl = UIBuilder.create({
      className: 'kanjo-skip-icon',
      html: icon,
    });

    // Duration label
    const labelEl = UIBuilder.create({
      tag: 'span',
      className: 'kanjo-skip-label',
      text: `${duration}`,
    });

    // Dropdown chevron
    const chevronEl = UIBuilder.create({
      className: 'kanjo-skip-chevron',
      html: UIBuilder.icons.chevronDown,
    });

    btn.appendChild(iconEl);
    btn.appendChild(labelEl);
    btn.appendChild(chevronEl);

    return btn;
  }

  private createDropdown(direction: 'back' | 'forward'): HTMLElement {
    const dropdown = UIBuilder.create({
      className: `kanjo-skip-dropdown kanjo-skip-dropdown-${direction}`,
    });

    this.options.durations.forEach((duration) => {
      const option = UIBuilder.create({
        tag: 'button',
        className: 'kanjo-skip-option',
        attrs: { 'type': 'button', 'data-duration': String(duration) },
        text: `${duration}s`,
        events: {
          click: (e) => {
            e.stopPropagation();
            this.selectDuration(direction, duration);
          },
        },
      });

      const currentDuration =
        direction === 'back' ? this.skipBackDuration : this.skipForwardDuration;
      if (duration === currentDuration) {
        option.classList.add('kanjo-active');
      }

      dropdown.appendChild(option);
    });

    return dropdown;
  }

  private createElement(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kanjo-skip-control',
    });

    // Skip back container
    const skipBackContainer = UIBuilder.create({
      className: 'kanjo-skip-container kanjo-skip-back-container',
    });
    skipBackContainer.appendChild(this.skipBackDropdown);
    skipBackContainer.appendChild(this.skipBackBtn);

    // Skip forward container
    const skipForwardContainer = UIBuilder.create({
      className: 'kanjo-skip-container kanjo-skip-forward-container',
    });
    skipForwardContainer.appendChild(this.skipForwardDropdown);
    skipForwardContainer.appendChild(this.skipForwardBtn);

    container.appendChild(skipBackContainer);
    container.appendChild(skipForwardContainer);

    return container;
  }

  private bindEvents(): void {
    // Skip back button - main click
    this.skipBackBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      // Check if click was on chevron
      if (target.closest('.kanjo-skip-chevron')) {
        this.toggleDropdown('back');
      } else {
        this.skip('back');
      }
    });

    // Skip forward button - main click
    this.skipForwardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      // Check if click was on chevron
      if (target.closest('.kanjo-skip-chevron')) {
        this.toggleDropdown('forward');
      } else {
        this.skip('forward');
      }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target as Node)) {
        this.closeAllDropdowns();
      }
    });

    // Close dropdowns on fullscreen change
    this.player.on('fullscreenchange', () => {
      this.closeAllDropdowns();
    });
  }

  private skip(direction: 'back' | 'forward'): void {
    const duration = direction === 'back' ? this.skipBackDuration : this.skipForwardDuration;
    if (direction === 'back') {
      this.player.backward(duration);
    } else {
      this.player.forward(duration);
    }
    this.closeAllDropdowns();
  }

  private toggleDropdown(direction: 'back' | 'forward'): void {
    if (direction === 'back') {
      this.skipBackOpen = !this.skipBackOpen;
      this.skipBackDropdown.classList.toggle('kanjo-open', this.skipBackOpen);
      this.skipBackBtn.classList.toggle('kanjo-dropdown-open', this.skipBackOpen);
      // Close other dropdown
      if (this.skipBackOpen) {
        this.skipForwardOpen = false;
        this.skipForwardDropdown.classList.remove('kanjo-open');
        this.skipForwardBtn.classList.remove('kanjo-dropdown-open');
      }
    } else {
      this.skipForwardOpen = !this.skipForwardOpen;
      this.skipForwardDropdown.classList.toggle('kanjo-open', this.skipForwardOpen);
      this.skipForwardBtn.classList.toggle('kanjo-dropdown-open', this.skipForwardOpen);
      // Close other dropdown
      if (this.skipForwardOpen) {
        this.skipBackOpen = false;
        this.skipBackDropdown.classList.remove('kanjo-open');
        this.skipBackBtn.classList.remove('kanjo-dropdown-open');
      }
    }
  }

  private closeAllDropdowns(): void {
    this.skipBackOpen = false;
    this.skipForwardOpen = false;
    this.skipBackDropdown.classList.remove('kanjo-open');
    this.skipForwardDropdown.classList.remove('kanjo-open');
    this.skipBackBtn.classList.remove('kanjo-dropdown-open');
    this.skipForwardBtn.classList.remove('kanjo-dropdown-open');
  }

  private selectDuration(direction: 'back' | 'forward', duration: number): void {
    if (direction === 'back') {
      this.skipBackDuration = duration;
      this.updateButtonLabel('back', duration);
      this.updateDropdownSelection('back', duration);
    } else {
      this.skipForwardDuration = duration;
      this.updateButtonLabel('forward', duration);
      this.updateDropdownSelection('forward', duration);
    }
    this.closeAllDropdowns();
  }

  private updateButtonLabel(direction: 'back' | 'forward', duration: number): void {
    const btn = direction === 'back' ? this.skipBackBtn : this.skipForwardBtn;
    const label = btn.querySelector('.kanjo-skip-label');
    if (label) {
      label.textContent = `${duration}`;
    }
    const tooltip = direction === 'back' ? 'Skip back' : 'Skip forward';
    btn.title = `${tooltip} ${duration}s`;
  }

  private updateDropdownSelection(direction: 'back' | 'forward', duration: number): void {
    const dropdown = direction === 'back' ? this.skipBackDropdown : this.skipForwardDropdown;
    const options = dropdown.querySelectorAll('.kanjo-skip-option');
    options.forEach((opt) => {
      const optDuration = parseInt((opt as HTMLElement).dataset.duration || '0');
      opt.classList.toggle('kanjo-active', optDuration === duration);
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
