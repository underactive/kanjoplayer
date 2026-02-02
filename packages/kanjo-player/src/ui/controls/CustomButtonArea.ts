/**
 * Custom Button Area - Configurable buttons that emit framework-agnostic events
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import type {
  CustomButtonsConfig,
  CustomButtonConfig,
  PlayerProperty,
  LocalizedString,
} from '../../core/types';
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
  private mobileToggleBtn: HTMLButtonElement | null = null;
  private isMobileExpanded = false;
  private unsubscribeLocale?: () => void;

  constructor(player: KanjoPlayer, container: HTMLElement, config: CustomButtonsConfig) {
    this.player = player;
    this.config = config;
    this.element = this.createElement();
    container.appendChild(this.element);
    this.setupResizeObserver();
    this.bindDocumentClick();

    // Subscribe to locale changes
    this.unsubscribeLocale = player.locale.onChange(() => this.updateButtonStrings());
  }

  /**
   * Resolve a localized string based on current locale
   */
  private resolveLocalizedString(value: LocalizedString | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'string') return value;

    // Get current locale code from LocaleManager
    const currentLocale = this.player.locale.getCurrentLocale();

    // Try exact match first, then fallback to 'en', then first available
    if (currentLocale && value[currentLocale]) {
      return value[currentLocale];
    }
    if (value['en']) {
      return value['en'];
    }
    // Return first available value as last resort
    const keys = Object.keys(value);
    return keys.length > 0 ? value[keys[0]] : undefined;
  }

  /**
   * Update all button strings when locale changes
   */
  private updateButtonStrings(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const config = this.config.buttons[i];

      // Update tooltip
      const tooltip = this.resolveLocalizedString(config.tooltip);
      if (tooltip) {
        btn.title = tooltip;
        btn.setAttribute('aria-label', tooltip);
      }

      // Update text content
      if (config.displayMode === 'text' || config.displayMode === 'icon-text') {
        const textSpan = btn.querySelector('.kanjo-custom-btn-text');
        if (textSpan) {
          const text = this.resolveLocalizedString(config.text);
          textSpan.textContent = text || '';
        }
      }
    }
  }

  private createElement(): HTMLElement {
    const area = UIBuilder.create({ className: 'kanjo-custom-button-area' });

    // Mobile toggle button (hidden on desktop via CSS)
    this.mobileToggleBtn = this.createMobileToggleButton();
    area.appendChild(this.mobileToggleBtn);

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

  private createMobileToggleButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kanjo-btn kanjo-custom-mobile-toggle';
    // Use chevronRight rotated 180deg to show as chevronLeft (pointing left, meaning "show more")
    btn.innerHTML = UIBuilder.icons.chevronRight;
    btn.title = 'Show custom buttons';
    btn.setAttribute('aria-label', 'Show custom buttons');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMobileExpanded();
    });
    return btn;
  }

  private toggleMobileExpanded(): void {
    this.isMobileExpanded = !this.isMobileExpanded;

    if (this.mobileToggleBtn) {
      // Update icon: chevronRight (pointing right) when expanded, rotated for left when collapsed
      this.mobileToggleBtn.innerHTML = UIBuilder.icons.chevronRight;
      this.mobileToggleBtn.setAttribute('aria-expanded', this.isMobileExpanded.toString());
      this.mobileToggleBtn.title = this.isMobileExpanded
        ? 'Hide custom buttons'
        : 'Show custom buttons';
      this.mobileToggleBtn.setAttribute(
        'aria-label',
        this.isMobileExpanded ? 'Hide custom buttons' : 'Show custom buttons'
      );
    }

    // Toggle expanded class on container
    if (this.isMobileExpanded) {
      this.element.classList.add('kanjo-mobile-expanded');
    } else {
      this.element.classList.remove('kanjo-mobile-expanded');
    }
  }

  private createButton(config: CustomButtonConfig): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kanjo-btn kanjo-custom-btn';
    btn.dataset.buttonId = config.id;

    const tooltip = this.resolveLocalizedString(config.tooltip);
    if (tooltip) {
      btn.title = tooltip;
      btn.setAttribute('aria-label', tooltip);
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
      const textValue = this.resolveLocalizedString(config.text);
      if (textValue) {
        const text = document.createElement('span');
        text.className = 'kanjo-custom-btn-text';
        text.textContent = textValue;
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
    const textValue =
      this.resolveLocalizedString(config.text) ||
      this.resolveLocalizedString(config.tooltip) ||
      config.id;
    const text = document.createElement('span');
    text.textContent = textValue;
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
    this.unsubscribeLocale?.();
    this.resizeObserver.disconnect();
    this.element.remove();
  }
}
