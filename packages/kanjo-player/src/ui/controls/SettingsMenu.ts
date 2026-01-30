/**
 * Settings menu with speed, download, and PiP options
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import type { SettingsMenuConfig } from '../../core/types';
import { UIBuilder } from '../UIBuilder';

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export interface SettingsMenuOptions {
  showSpeed: boolean;
  showPiP: boolean;
  showDownload: boolean;
  showAdjustments: boolean;
}

const DEFAULT_SETTINGS_OPTIONS: SettingsMenuOptions = {
  showSpeed: true,
  showPiP: true,
  showDownload: false,
  showAdjustments: true,
};

export class SettingsMenu {
  private element: HTMLElement;
  private toggleBtn: HTMLButtonElement;
  private menuPanel: HTMLElement;
  private player: KanjoPlayer;
  private options: SettingsMenuOptions;
  private isOpen = false;
  private onAdjustmentsClick: (() => void) | null = null;

  constructor(player: KanjoPlayer, config?: SettingsMenuConfig) {
    this.player = player;
    this.options = {
      ...DEFAULT_SETTINGS_OPTIONS,
      showSpeed: config?.showSpeed ?? DEFAULT_SETTINGS_OPTIONS.showSpeed,
      showPiP: config?.showPiP ?? DEFAULT_SETTINGS_OPTIONS.showPiP,
      showDownload: config?.showDownload ?? DEFAULT_SETTINGS_OPTIONS.showDownload,
      showAdjustments: config?.showAdjustments ?? DEFAULT_SETTINGS_OPTIONS.showAdjustments,
    };
    this.toggleBtn = this.createToggleButton();
    this.menuPanel = this.createMenuPanel();
    this.element = this.createElement();
    this.bindEvents();
  }

  private createToggleButton(): HTMLButtonElement {
    return UIBuilder.button({
      className: 'kanjo-settings-btn',
      icon: UIBuilder.icons.settings,
      tooltip: 'Settings',
      onClick: () => this.toggle(),
    });
  }

  private createMenuPanel(): HTMLElement {
    const panel = UIBuilder.create({
      className: 'kanjo-settings-menu',
    });

    // Main menu items
    const mainMenu = UIBuilder.create({ className: 'kanjo-settings-main' });

    // Speed option
    if (this.options.showSpeed) {
      const speedItem = this.createMenuItem({
        icon: UIBuilder.icons.speed,
        label: 'Playback speed',
        value: '1x',
        hasSubmenu: true,
        onClick: () => this.showSubmenu('speed'),
      });
      speedItem.id = 'kanjo-speed-item';
      mainMenu.appendChild(speedItem);
    }

    // Picture-in-Picture option
    if (this.options.showPiP && document.pictureInPictureEnabled) {
      const pipItem = this.createMenuItem({
        icon: UIBuilder.icons.pip,
        label: 'Picture-in-Picture',
        onClick: () => {
          this.player.togglePiP();
          this.close();
        },
      });
      mainMenu.appendChild(pipItem);
    }

    // Download option
    if (this.options.showDownload) {
      const downloadItem = this.createMenuItem({
        icon: UIBuilder.icons.download,
        label: 'Download',
        onClick: () => {
          this.downloadVideo();
          this.close();
        },
      });
      mainMenu.appendChild(downloadItem);
    }

    // Video Adjustments option
    if (this.options.showAdjustments) {
      const adjustmentsItem = this.createMenuItem({
        icon: UIBuilder.icons.adjustments,
        label: 'Video adjustments',
        onClick: () => {
          if (this.onAdjustmentsClick) {
            this.onAdjustmentsClick();
          }
          this.close();
        },
      });
      mainMenu.appendChild(adjustmentsItem);
    }

    panel.appendChild(mainMenu);

    // Speed submenu (only if speed option is enabled)
    if (this.options.showSpeed) {
      const speedSubmenu = this.createSpeedSubmenu();
      panel.appendChild(speedSubmenu);
    }

    return panel;
  }

  private createMenuItem(options: {
    icon: string;
    label: string;
    value?: string;
    hasSubmenu?: boolean;
    onClick: () => void;
  }): HTMLElement {
    const item = UIBuilder.create({
      tag: 'button',
      className: 'kanjo-settings-item',
      attrs: { type: 'button' },
      events: {
        click: (e) => {
          e.stopPropagation();
          options.onClick();
        },
      },
    });

    const iconEl = UIBuilder.create({
      className: 'kanjo-settings-item-icon',
      html: options.icon,
    });

    const labelEl = UIBuilder.create({
      className: 'kanjo-settings-item-label',
      text: options.label,
    });

    item.appendChild(iconEl);
    item.appendChild(labelEl);

    if (options.value) {
      const valueEl = UIBuilder.create({
        className: 'kanjo-settings-item-value',
        text: options.value,
      });
      item.appendChild(valueEl);
    }

    if (options.hasSubmenu) {
      const chevron = UIBuilder.create({
        className: 'kanjo-settings-item-chevron',
        html: UIBuilder.icons.chevronRight,
      });
      item.appendChild(chevron);
    }

    return item;
  }

  private createSpeedSubmenu(): HTMLElement {
    const submenu = UIBuilder.create({
      className: 'kanjo-settings-submenu',
      attrs: { 'data-submenu': 'speed' },
    });

    // Back button
    const backBtn = UIBuilder.create({
      tag: 'button',
      className: 'kanjo-settings-back',
      attrs: { type: 'button' },
      events: {
        click: (e) => {
          e.stopPropagation();
          this.hideSubmenu();
        },
      },
    });
    backBtn.innerHTML = `
      <span class="kanjo-settings-back-icon">${UIBuilder.icons.chevronRight}</span>
      <span>Playback speed</span>
    `;
    submenu.appendChild(backBtn);

    // Speed options
    PLAYBACK_RATES.forEach((rate) => {
      const option = UIBuilder.create({
        tag: 'button',
        className: 'kanjo-settings-option',
        attrs: { 'type': 'button', 'data-rate': String(rate) },
        events: {
          click: (e) => {
            e.stopPropagation();
            this.player.setPlaybackRate(rate);
            this.updateSpeedDisplay(rate);
            this.hideSubmenu();
          },
        },
      });

      const checkIcon = UIBuilder.create({
        className: 'kanjo-settings-option-check',
        html: UIBuilder.icons.check,
      });

      const label = UIBuilder.create({
        className: 'kanjo-settings-option-label',
        text: rate === 1 ? 'Normal' : `${rate}x`,
      });

      option.appendChild(checkIcon);
      option.appendChild(label);

      if (rate === 1) {
        option.classList.add('kanjo-active');
      }

      submenu.appendChild(option);
    });

    return submenu;
  }

  private createElement(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kanjo-settings-container',
    });

    container.appendChild(this.menuPanel);
    container.appendChild(this.toggleBtn);

    return container;
  }

  private bindEvents(): void {
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.element.contains(e.target as Node)) {
        this.close();
      }
    });

    // Update speed display when rate changes
    this.player.on('ratechange', ({ rate }) => {
      this.updateSpeedDisplay(rate);
    });

    // Close menu on fullscreen change
    this.player.on('fullscreenchange', () => {
      this.close();
    });
  }

  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    this.isOpen = true;
    this.menuPanel.classList.add('kanjo-open');
    this.toggleBtn.classList.add('kanjo-active');
  }

  private close(): void {
    this.isOpen = false;
    this.menuPanel.classList.remove('kanjo-open');
    this.toggleBtn.classList.remove('kanjo-active');
    this.hideSubmenu();
  }

  private showSubmenu(name: string): void {
    this.menuPanel.classList.add('kanjo-submenu-open');
    const submenu = this.menuPanel.querySelector(`[data-submenu="${name}"]`);
    if (submenu) {
      submenu.classList.add('kanjo-visible');
    }
  }

  private hideSubmenu(): void {
    this.menuPanel.classList.remove('kanjo-submenu-open');
    const submenus = this.menuPanel.querySelectorAll('.kanjo-settings-submenu');
    submenus.forEach((sm) => sm.classList.remove('kanjo-visible'));
  }

  private updateSpeedDisplay(rate: number): void {
    // Update value in main menu
    const speedItem = this.element.querySelector('#kanjo-speed-item .kanjo-settings-item-value');
    if (speedItem) {
      speedItem.textContent = rate === 1 ? 'Normal' : `${rate}x`;
    }

    // Update active state in submenu
    const options = this.menuPanel.querySelectorAll('.kanjo-settings-option');
    options.forEach((opt) => {
      const optRate = parseFloat((opt as HTMLElement).dataset.rate || '1');
      opt.classList.toggle('kanjo-active', optRate === rate);
    });
  }

  private downloadVideo(): void {
    const src = this.player.getSrc();
    if (!src) return;

    const a = document.createElement('a');
    a.href = src;
    a.download = this.getFilenameFromUrl(src);
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      return filename || 'video.mp4';
    } catch {
      return 'video.mp4';
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Set callback for when Video Adjustments is clicked
   */
  setAdjustmentsCallback(callback: () => void): void {
    this.onAdjustmentsClick = callback;
  }
}
