/**
 * Settings menu with speed, download, and PiP options
 */

import type { KimochiPlayer } from '../../core/KimochiPlayer';
import type { SettingsMenuConfig } from '../../core/types';
import { UIBuilder } from '../UIBuilder';

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export interface SettingsMenuOptions {
  showSpeed: boolean;
  showPiP: boolean;
  showDownload: boolean;
}

const DEFAULT_SETTINGS_OPTIONS: SettingsMenuOptions = {
  showSpeed: true,
  showPiP: true,
  showDownload: false,
};

export class SettingsMenu {
  private element: HTMLElement;
  private toggleBtn: HTMLButtonElement;
  private menuPanel: HTMLElement;
  private player: KimochiPlayer;
  private options: SettingsMenuOptions;
  private isOpen = false;

  constructor(player: KimochiPlayer, config?: SettingsMenuConfig) {
    this.player = player;
    this.options = {
      ...DEFAULT_SETTINGS_OPTIONS,
      showSpeed: config?.showSpeed ?? DEFAULT_SETTINGS_OPTIONS.showSpeed,
      showPiP: config?.showPiP ?? DEFAULT_SETTINGS_OPTIONS.showPiP,
      showDownload: config?.showDownload ?? DEFAULT_SETTINGS_OPTIONS.showDownload,
    };
    this.toggleBtn = this.createToggleButton();
    this.menuPanel = this.createMenuPanel();
    this.element = this.createElement();
    this.bindEvents();
  }

  private createToggleButton(): HTMLButtonElement {
    return UIBuilder.button({
      className: 'kimochi-settings-btn',
      icon: UIBuilder.icons.settings,
      tooltip: 'Settings',
      onClick: () => this.toggle(),
    });
  }

  private createMenuPanel(): HTMLElement {
    const panel = UIBuilder.create({
      className: 'kimochi-settings-menu',
    });

    // Main menu items
    const mainMenu = UIBuilder.create({ className: 'kimochi-settings-main' });

    // Speed option
    if (this.options.showSpeed) {
      const speedItem = this.createMenuItem({
        icon: UIBuilder.icons.speed,
        label: 'Playback speed',
        value: '1x',
        hasSubmenu: true,
        onClick: () => this.showSubmenu('speed'),
      });
      speedItem.id = 'kimochi-speed-item';
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
      className: 'kimochi-settings-item',
      attrs: { type: 'button' },
      events: {
        click: (e) => {
          e.stopPropagation();
          options.onClick();
        },
      },
    });

    const iconEl = UIBuilder.create({
      className: 'kimochi-settings-item-icon',
      html: options.icon,
    });

    const labelEl = UIBuilder.create({
      className: 'kimochi-settings-item-label',
      text: options.label,
    });

    item.appendChild(iconEl);
    item.appendChild(labelEl);

    if (options.value) {
      const valueEl = UIBuilder.create({
        className: 'kimochi-settings-item-value',
        text: options.value,
      });
      item.appendChild(valueEl);
    }

    if (options.hasSubmenu) {
      const chevron = UIBuilder.create({
        className: 'kimochi-settings-item-chevron',
        html: UIBuilder.icons.chevronRight,
      });
      item.appendChild(chevron);
    }

    return item;
  }

  private createSpeedSubmenu(): HTMLElement {
    const submenu = UIBuilder.create({
      className: 'kimochi-settings-submenu',
      attrs: { 'data-submenu': 'speed' },
    });

    // Back button
    const backBtn = UIBuilder.create({
      tag: 'button',
      className: 'kimochi-settings-back',
      attrs: { type: 'button' },
      events: {
        click: (e) => {
          e.stopPropagation();
          this.hideSubmenu();
        },
      },
    });
    backBtn.innerHTML = `
      <span class="kimochi-settings-back-icon">${UIBuilder.icons.chevronRight}</span>
      <span>Playback speed</span>
    `;
    submenu.appendChild(backBtn);

    // Speed options
    PLAYBACK_RATES.forEach((rate) => {
      const option = UIBuilder.create({
        tag: 'button',
        className: 'kimochi-settings-option',
        attrs: { type: 'button', 'data-rate': String(rate) },
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
        className: 'kimochi-settings-option-check',
        html: UIBuilder.icons.check,
      });

      const label = UIBuilder.create({
        className: 'kimochi-settings-option-label',
        text: rate === 1 ? 'Normal' : `${rate}x`,
      });

      option.appendChild(checkIcon);
      option.appendChild(label);

      if (rate === 1) {
        option.classList.add('kimochi-active');
      }

      submenu.appendChild(option);
    });

    return submenu;
  }

  private createElement(): HTMLElement {
    const container = UIBuilder.create({
      className: 'kimochi-settings-container',
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
    this.menuPanel.classList.add('kimochi-open');
    this.toggleBtn.classList.add('kimochi-active');
  }

  private close(): void {
    this.isOpen = false;
    this.menuPanel.classList.remove('kimochi-open');
    this.toggleBtn.classList.remove('kimochi-active');
    this.hideSubmenu();
  }

  private showSubmenu(name: string): void {
    this.menuPanel.classList.add('kimochi-submenu-open');
    const submenu = this.menuPanel.querySelector(`[data-submenu="${name}"]`);
    if (submenu) {
      submenu.classList.add('kimochi-visible');
    }
  }

  private hideSubmenu(): void {
    this.menuPanel.classList.remove('kimochi-submenu-open');
    const submenus = this.menuPanel.querySelectorAll('.kimochi-settings-submenu');
    submenus.forEach((sm) => sm.classList.remove('kimochi-visible'));
  }

  private updateSpeedDisplay(rate: number): void {
    // Update value in main menu
    const speedItem = this.element.querySelector('#kimochi-speed-item .kimochi-settings-item-value');
    if (speedItem) {
      speedItem.textContent = rate === 1 ? 'Normal' : `${rate}x`;
    }

    // Update active state in submenu
    const options = this.menuPanel.querySelectorAll('.kimochi-settings-option');
    options.forEach((opt) => {
      const optRate = parseFloat((opt as HTMLElement).dataset.rate || '1');
      opt.classList.toggle('kimochi-active', optRate === rate);
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
}
