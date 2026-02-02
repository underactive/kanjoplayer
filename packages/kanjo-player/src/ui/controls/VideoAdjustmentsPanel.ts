/**
 * Video Adjustments Panel - Brightness, Contrast, Saturation, Gamma, Hue sliders
 */

import type { KanjoPlayer } from '../../core/KanjoPlayer';
import { UIBuilder } from '../UIBuilder';

/**
 * Generate a cryptographically secure random string for use as unique IDs.
 * Uses crypto.getRandomValues for better uniqueness than Math.random.
 */
function generateSecureId(length: number = 9): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

export interface VideoAdjustments {
  brightness: number; // 0-200, 100 = normal
  contrast: number; // 0-200, 100 = normal
  saturation: number; // 0-200, 100 = normal
  gamma: number; // 0-200, 100 = normal (approximated)
  hue: number; // -180 to 180, 0 = normal
}

const DEFAULT_ADJUSTMENTS: VideoAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  gamma: 100,
  hue: 0,
};

interface SliderConfig {
  key: keyof VideoAdjustments;
  labelKey:
    | 'adjustments.brightness'
    | 'adjustments.contrast'
    | 'adjustments.saturation'
    | 'adjustments.gamma'
    | 'adjustments.hue';
  min: number;
  max: number;
  default: number;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'brightness', labelKey: 'adjustments.brightness', min: 0, max: 200, default: 100 },
  { key: 'contrast', labelKey: 'adjustments.contrast', min: 0, max: 200, default: 100 },
  { key: 'saturation', labelKey: 'adjustments.saturation', min: 0, max: 200, default: 100 },
  { key: 'gamma', labelKey: 'adjustments.gamma', min: 0, max: 200, default: 100 },
  { key: 'hue', labelKey: 'adjustments.hue', min: -180, max: 180, default: 0 },
];

export class VideoAdjustmentsPanel {
  private element: HTMLElement;
  private player: KanjoPlayer;
  private adjustments: VideoAdjustments = { ...DEFAULT_ADJUSTMENTS };
  private sliders: Map<keyof VideoAdjustments, HTMLInputElement> = new Map();
  private labels: Map<keyof VideoAdjustments, HTMLLabelElement> = new Map();
  private resetButtons: Map<keyof VideoAdjustments, HTMLButtonElement> = new Map();
  private isVisible = false;
  private svgFilter: SVGSVGElement | null = null;
  private filterId: string;
  private unsubscribeLocale?: () => void;

  constructor(player: KanjoPlayer, container: HTMLElement) {
    this.player = player;
    this.filterId = `kanjo-gamma-filter-${generateSecureId()}`;
    this.createSvgFilter(container);
    this.element = this.createElement();
    container.appendChild(this.element);
    this.unsubscribeLocale = player.locale.onChange(() => this.updateStrings());
  }

  /**
   * Create an SVG filter for gamma correction (CSS doesn't support gamma natively)
   */
  private createSvgFilter(container: HTMLElement): void {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.pointerEvents = 'none';

    svg.innerHTML = `
      <defs>
        <filter id="${this.filterId}">
          <feComponentTransfer>
            <feFuncR type="gamma" amplitude="1" exponent="1" offset="0"/>
            <feFuncG type="gamma" amplitude="1" exponent="1" offset="0"/>
            <feFuncB type="gamma" amplitude="1" exponent="1" offset="0"/>
          </feComponentTransfer>
        </filter>
      </defs>
    `;

    container.appendChild(svg);
    this.svgFilter = svg;
  }

  private createElement(): HTMLElement {
    const locale = this.player.locale;
    const panel = UIBuilder.create({
      className: 'kanjo-adjustments-panel',
    });

    // Header
    const header = UIBuilder.create({
      className: 'kanjo-adjustments-header',
    });

    const title = document.createElement('span');
    title.className = 'kanjo-adjustments-title';
    title.textContent = locale.get('adjustments.title');
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'kanjo-adjustments-close';
    closeBtn.innerHTML = UIBuilder.icons.close;
    closeBtn.title = locale.get('adjustments.close');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Sliders
    const slidersContainer = UIBuilder.create({
      className: 'kanjo-adjustments-sliders',
    });

    for (const config of SLIDER_CONFIGS) {
      const row = this.createSliderRow(config);
      slidersContainer.appendChild(row);
    }

    panel.appendChild(slidersContainer);

    // Reset all button
    const resetAllBtn = document.createElement('button');
    resetAllBtn.type = 'button';
    resetAllBtn.className = 'kanjo-adjustments-reset-all';
    resetAllBtn.textContent = locale.get('adjustments.resetAll');
    resetAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.resetAll();
    });
    panel.appendChild(resetAllBtn);

    return panel;
  }

  private createSliderRow(config: SliderConfig): HTMLElement {
    const locale = this.player.locale;
    const row = UIBuilder.create({
      className: 'kanjo-adjustments-row',
    });

    // Label
    const label = document.createElement('label');
    label.className = 'kanjo-adjustments-label';
    label.textContent = locale.get(config.labelKey);
    this.labels.set(config.key, label);
    row.appendChild(label);

    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'kanjo-adjustments-slider';
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.value = String(config.default);
    slider.addEventListener('input', () => {
      this.adjustments[config.key] = Number(slider.value);
      this.applyFilters();
    });
    this.sliders.set(config.key, slider);
    row.appendChild(slider);

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'kanjo-adjustments-reset';
    resetBtn.innerHTML = UIBuilder.icons.reset;
    resetBtn.title = locale.t('adjustments.reset', { name: locale.get(config.labelKey) });
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      slider.value = String(config.default);
      this.adjustments[config.key] = config.default;
      this.applyFilters();
    });
    this.resetButtons.set(config.key, resetBtn);
    row.appendChild(resetBtn);

    return row;
  }

  private applyFilters(): void {
    const video = this.player.getVideoElement();

    // Convert values to CSS filter values
    const brightness = this.adjustments.brightness / 100;
    const contrast = this.adjustments.contrast / 100;
    const saturation = this.adjustments.saturation / 100;
    const hue = this.adjustments.hue;

    // Gamma: slider 0-200, center at 100 = no change
    // Map to exponent using exponential curve:
    // 0 → exponent ~2.8 (darker midtones)
    // 100 → exponent 1.0 (no change)
    // 200 → exponent ~0.35 (lighter midtones / lifted shadows)
    const gammaValue = this.adjustments.gamma;
    const gammaExponent = Math.pow(2, (100 - gammaValue) / 70);

    // Update SVG filter for gamma
    this.updateGammaFilter(gammaExponent);

    // Build CSS filters
    const filters = [
      `brightness(${brightness.toFixed(2)})`,
      `contrast(${contrast.toFixed(2)})`,
      `saturate(${saturation.toFixed(2)})`,
      `hue-rotate(${hue}deg)`,
    ];

    // Add SVG filter reference if gamma is not close to 1
    if (Math.abs(gammaExponent - 1) > 0.01) {
      filters.push(`url(#${this.filterId})`);
    }

    video.style.filter = filters.join(' ');
  }

  private updateGammaFilter(exponent: number): void {
    if (!this.svgFilter) return;

    const funcs = this.svgFilter.querySelectorAll('feFuncR, feFuncG, feFuncB');
    funcs.forEach((func) => {
      func.setAttribute('exponent', exponent.toFixed(3));
    });
  }

  private resetAll(): void {
    this.adjustments = { ...DEFAULT_ADJUSTMENTS };

    for (const config of SLIDER_CONFIGS) {
      const slider = this.sliders.get(config.key);
      if (slider) {
        slider.value = String(config.default);
      }
    }

    this.applyFilters();
  }

  private updateStrings(): void {
    const locale = this.player.locale;

    // Update title
    const title = this.element.querySelector('.kanjo-adjustments-title');
    if (title) {
      title.textContent = locale.get('adjustments.title');
    }

    // Update close button title
    const closeBtn = this.element.querySelector('.kanjo-adjustments-close') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.title = locale.get('adjustments.close');
    }

    // Update reset all button
    const resetAllBtn = this.element.querySelector(
      '.kanjo-adjustments-reset-all'
    ) as HTMLButtonElement;
    if (resetAllBtn) {
      resetAllBtn.textContent = locale.get('adjustments.resetAll');
    }

    // Update slider labels and reset button titles
    for (const config of SLIDER_CONFIGS) {
      const label = this.labels.get(config.key);
      if (label) {
        label.textContent = locale.get(config.labelKey);
      }

      const resetBtn = this.resetButtons.get(config.key);
      if (resetBtn) {
        resetBtn.title = locale.t('adjustments.reset', { name: locale.get(config.labelKey) });
      }
    }
  }

  show(): void {
    this.isVisible = true;
    this.element.classList.add('kanjo-visible');
  }

  hide(): void {
    this.isVisible = false;
    this.element.classList.remove('kanjo-visible');
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isOpen(): boolean {
    return this.isVisible;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    this.unsubscribeLocale?.();

    // Reset video filter
    const video = this.player.getVideoElement();
    video.style.filter = '';

    // Remove SVG filter
    if (this.svgFilter) {
      this.svgFilter.remove();
      this.svgFilter = null;
    }

    this.element.remove();
  }
}
