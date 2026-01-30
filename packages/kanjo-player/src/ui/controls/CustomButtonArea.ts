/**
 * Custom Button Area - Configurable buttons that emit framework-agnostic events
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import type { CustomButtonsConfig, CustomButtonConfig, PlayerProperty } from '../../core/types';
import { UIBuilder } from '../UIBuilder';

export interface CustomButtonEventDetail {
  buttonId: string;
  eventKey: string;
  value: unknown;
  timestamp: number;
}

export class CustomButtonArea {
  private element: HTMLElement;
  private player: KanjoPlayer;
  private config: CustomButtonsConfig;
  private overflowMenuBtn: HTMLButtonElement | null = null;
  private overflowDropdown: HTMLElement | null = null;
  private resizeObserver!: ResizeObserver;
  private buttons: HTMLButtonElement[] = [];
  private overflowButtons: CustomButtonConfig[] = [];
  private isOverflowOpen = false;

  constructor(player: KanjoPlayer, container: HTMLElement, config: CustomButtonsConfig) {
    this.player = player;
    this.config = config;
    this.element = this.createElement();
    container.appendChild(this.element);
    this.setupResizeObserver();
    this.bindDocumentClick();
  }

  private createElement(): HTMLElement {
    const area = UIBuilder.create({ className: 'kanjo-custom-button-area' });

    // Overflow menu button (hidden by default)
    this.overflowMenuBtn = this.createOverflowButton();
    area.appendChild(this.overflowMenuBtn);

    // Create overflow dropdown
    this.overflowDropdown = UIBuilder.create({ className: 'kanjo-custom-overflow-menu' });
    area.appendChild(this.overflowDropdown);

    // Create buttons (in order from config - they'll display right-to-left due to flex-direction)
    for (const btnConfig of this.config.buttons) {
      const btn = this.createButton(btnConfig);
      this.buttons.push(btn);
      area.appendChild(btn);
    }

    return area;
  }

  private createOverflowButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kanjo-btn kanjo-custom-overflow-btn';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;
    btn.title = 'More actions';
    btn.setAttribute('aria-label', 'More actions');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleOverflowMenu();
    });
    return btn;
  }

  private createButton(config: CustomButtonConfig): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kanjo-btn kanjo-custom-btn';
    btn.dataset.buttonId = config.id;

    if (config.tooltip) {
      btn.title = config.tooltip;
      btn.setAttribute('aria-label', config.tooltip);
    }

    // Build content based on displayMode
    if (config.displayMode === 'icon' || config.displayMode === 'icon-text') {
      if (config.iconClass) {
        const icon = document.createElement('i');
        icon.className = config.iconClass;
        btn.appendChild(icon);
      }
    }

    if (config.displayMode === 'text' || config.displayMode === 'icon-text') {
      if (config.text) {
        const text = document.createElement('span');
        text.className = 'kanjo-custom-btn-text';
        text.textContent = config.text;
        btn.appendChild(text);
      }
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.emitCustomEvent(config);
    });

    return btn;
  }

  private createOverflowItem(config: CustomButtonConfig): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kanjo-custom-overflow-item';
    btn.dataset.buttonId = config.id;

    // Icon (if present)
    if (config.iconClass) {
      const icon = document.createElement('i');
      icon.className = config.iconClass;
      btn.appendChild(icon);
    }

    // Text label (use text or tooltip as fallback)
    const text = document.createElement('span');
    text.textContent = config.text || config.tooltip || config.id;
    btn.appendChild(text);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.emitCustomEvent(config);
      this.closeOverflowMenu();
    });

    return btn;
  }

  private emitCustomEvent(config: CustomButtonConfig): void {
    // Resolve value (player property or static value)
    let value: unknown = config.eventValue;

    if (typeof config.eventValue === 'string') {
      const propertyMap: Record<PlayerProperty, () => unknown> = {
        src: () => this.player.getVideoElement().currentSrc,
        currentTime: () => this.player.getCurrentTime(),
        duration: () => this.player.getDuration(),
        volume: () => this.player.getVolume(),
        playbackRate: () => this.player.getPlaybackRate(),
      };

      if (config.eventValue in propertyMap) {
        value = propertyMap[config.eventValue as PlayerProperty]();
      }
    }

    const eventDetail: CustomButtonEventDetail = {
      buttonId: config.id,
      eventKey: config.eventKey,
      value,
      timestamp: Date.now(),
    };

    // Emit CustomEvent on player container (framework-agnostic)
    const event = new CustomEvent('kanjo-custom-event', {
      detail: eventDetail,
      bubbles: true,
      composed: true, // Penetrates shadow DOM
    });

    this.player.getContainerElement().dispatchEvent(event);

    // Also emit on the internal EventEmitter for plugins
    this.player.emit('custombuttonevent', {
      buttonId: config.id,
      eventKey: config.eventKey,
      value,
    });
  }

  private toggleOverflowMenu(): void {
    if (this.isOverflowOpen) {
      this.closeOverflowMenu();
    } else {
      this.openOverflowMenu();
    }
  }

  private openOverflowMenu(): void {
    if (!this.overflowDropdown || this.overflowButtons.length === 0) return;

    // Clear and rebuild overflow menu
    this.overflowDropdown.innerHTML = '';
    for (const config of this.overflowButtons) {
      const item = this.createOverflowItem(config);
      this.overflowDropdown.appendChild(item);
    }

    this.overflowDropdown.classList.add('kanjo-visible');
    this.overflowMenuBtn?.classList.add('kanjo-active');
    this.isOverflowOpen = true;
  }

  private closeOverflowMenu(): void {
    this.overflowDropdown?.classList.remove('kanjo-visible');
    this.overflowMenuBtn?.classList.remove('kanjo-active');
    this.isOverflowOpen = false;
  }

  private bindDocumentClick(): void {
    document.addEventListener('click', (e) => {
      // Close overflow menu if clicking outside
      if (this.isOverflowOpen && !this.element.contains(e.target as Node)) {
        this.closeOverflowMenu();
      }
    });
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.handleOverflow();
    });
    this.resizeObserver.observe(this.element);

    // Initial check
    requestAnimationFrame(() => {
      this.handleOverflow();
    });
  }

  private handleOverflow(): void {
    const areaWidth = this.element.clientWidth;
    const overflowMenuWidth = 48; // Reserved for overflow button
    const gap = 8; // Gap between buttons
    let usedWidth = 0;

    this.overflowButtons = [];

    // First pass: show all buttons and measure
    for (const btn of this.buttons) {
      btn.style.display = '';
    }

    // Second pass: hide buttons that don't fit
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const btnWidth = btn.offsetWidth;

      // Account for gap if not the first button
      const widthNeeded = usedWidth + btnWidth + (usedWidth > 0 ? gap : 0);

      // Check if this button fits (leaving room for overflow menu if needed)
      const remainingButtons = this.buttons.length - i - 1;
      const needsOverflowSpace =
        remainingButtons > 0 && widthNeeded + overflowMenuWidth > areaWidth;

      if (widthNeeded > areaWidth - (needsOverflowSpace ? overflowMenuWidth : 0)) {
        btn.style.display = 'none';
        const config = this.config.buttons.find((c) => c.id === btn.dataset.buttonId);
        if (config) this.overflowButtons.push(config);
      } else {
        usedWidth = widthNeeded;
      }
    }

    // Show/hide overflow menu button
    if (this.overflowMenuBtn) {
      if (this.overflowButtons.length > 0) {
        this.overflowMenuBtn.style.display = '';
      } else {
        this.overflowMenuBtn.style.display = 'none';
        this.closeOverflowMenu();
      }
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.element.remove();
  }
}
