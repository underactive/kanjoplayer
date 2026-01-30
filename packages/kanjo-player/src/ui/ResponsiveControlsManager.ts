/**
 * ResponsiveControlsManager - Manages visibility of controls based on player width
 *
 * Uses ResizeObserver to watch the player container and toggles control visibility
 * based on priority tiers. Controls with higher priority (lower number) stay visible
 * at smaller widths.
 */

import type {
  ControlPriority,
  ControlId,
  ResponsiveControlsConfig,
  ResponsiveBreakpoints,
} from '../core/types';

/** Default breakpoints for responsive tiers */
const DEFAULT_BREAKPOINTS: Required<ResponsiveBreakpoints> = {
  tier3: 640,
  tier2: 360,
};

/** Default priority assignments for controls */
const DEFAULT_PRIORITIES: Record<ControlId, ControlPriority> = {
  // Tier 1 - Always visible
  playButton: 1,
  volumeControl: 1,
  fullscreenButton: 1,
  // Tier 2 - Hidden below 360px
  timeDisplay: 2,
  settingsMenu: 2,
  // Tier 3 - Hidden below 480px
  skipBack: 3,
  skipForward: 3,
  loopStart: 3,
  loopEnd: 3,
  loopToggle: 3,
  airPlayButton: 3,
  castButton: 3,
};

/** CSS class applied to hidden controls */
const HIDDEN_CLASS = 'kanjo-responsive-hidden';

/** CSS class applied to container in compact mode */
const COMPACT_CLASS = 'kanjo-responsive-compact';

/** CSS class applied to container in minimal mode */
const MINIMAL_CLASS = 'kanjo-responsive-minimal';

interface RegisteredControl {
  element: HTMLElement;
  priority: ControlPriority;
}

export class ResponsiveControlsManager {
  private container: HTMLElement;
  private controlsContainer: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;
  private controls: Map<ControlId, RegisteredControl> = new Map();
  private breakpoints: Required<ResponsiveBreakpoints>;
  private priorities: Record<ControlId, ControlPriority>;
  private enabled: boolean;
  private rafId: number | null = null;
  private lastWidth: number = 0;

  constructor(container: HTMLElement, controlsContainer: HTMLElement, config?: ResponsiveControlsConfig) {
    this.container = container;
    this.controlsContainer = controlsContainer;
    this.enabled = config?.enabled !== false;

    // Merge breakpoints with defaults
    this.breakpoints = {
      ...DEFAULT_BREAKPOINTS,
      ...config?.breakpoints,
    };

    // Merge priorities with defaults
    this.priorities = {
      ...DEFAULT_PRIORITIES,
      ...config?.priorities,
    };

    if (this.enabled) {
      this.init();
    }
  }

  private init(): void {
    // Create ResizeObserver to watch container width
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;

        // Skip if width hasn't changed meaningfully (avoid unnecessary work)
        if (Math.abs(width - this.lastWidth) < 1) {
          continue;
        }

        this.lastWidth = width;

        // Debounce with requestAnimationFrame
        if (this.rafId !== null) {
          cancelAnimationFrame(this.rafId);
        }

        this.rafId = requestAnimationFrame(() => {
          this.updateVisibility(width);
          this.rafId = null;
        });
      }
    });

    this.resizeObserver.observe(this.container);
  }

  /**
   * Register a control element with its priority
   */
  registerControl(id: ControlId, element: HTMLElement): void {
    const priority = this.priorities[id];
    this.controls.set(id, { element, priority });

    // Set data attribute for debugging
    element.setAttribute('data-kanjo-priority', String(priority));

    // Apply initial visibility if we have a known width
    if (this.enabled && this.lastWidth > 0) {
      this.updateControlVisibility(element, priority, this.lastWidth);
    }
  }

  /**
   * Unregister a control element
   */
  unregisterControl(id: ControlId): void {
    const control = this.controls.get(id);
    if (control) {
      control.element.classList.remove(HIDDEN_CLASS);
      control.element.removeAttribute('data-kanjo-priority');
      this.controls.delete(id);
    }
  }

  /**
   * Update visibility of all registered controls based on container width
   */
  private updateVisibility(width: number): void {
    // Update container mode classes
    this.updateContainerMode(width);

    // Update each control's visibility
    for (const [, control] of this.controls) {
      this.updateControlVisibility(control.element, control.priority, width);
    }
  }

  /**
   * Update visibility of a single control
   */
  private updateControlVisibility(
    element: HTMLElement,
    priority: ControlPriority,
    width: number
  ): void {
    const maxVisiblePriority = this.getMaxVisiblePriority(width);

    if (priority <= maxVisiblePriority) {
      element.classList.remove(HIDDEN_CLASS);
    } else {
      element.classList.add(HIDDEN_CLASS);
    }
  }

  /**
   * Get the maximum priority level that should be visible at a given width
   */
  private getMaxVisiblePriority(width: number): ControlPriority {
    if (width < this.breakpoints.tier2) {
      // Minimal mode: only tier 1
      return 1;
    } else if (width < this.breakpoints.tier3) {
      // Compact mode: tier 1 and 2
      return 2;
    }
    // Normal mode: all tiers
    return 3;
  }

  /**
   * Update container mode classes based on width
   */
  private updateContainerMode(width: number): void {
    if (width < this.breakpoints.tier2) {
      // Minimal mode
      this.controlsContainer.classList.add(MINIMAL_CLASS);
      this.controlsContainer.classList.add(COMPACT_CLASS);
    } else if (width < this.breakpoints.tier3) {
      // Compact mode
      this.controlsContainer.classList.remove(MINIMAL_CLASS);
      this.controlsContainer.classList.add(COMPACT_CLASS);
    } else {
      // Normal mode
      this.controlsContainer.classList.remove(MINIMAL_CLASS);
      this.controlsContainer.classList.remove(COMPACT_CLASS);
    }
  }

  /**
   * Check if responsive mode is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current breakpoints
   */
  getBreakpoints(): Required<ResponsiveBreakpoints> {
    return { ...this.breakpoints };
  }

  /**
   * Get priority for a control
   */
  getPriority(id: ControlId): ControlPriority {
    return this.priorities[id];
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove classes from all controls
    for (const [, control] of this.controls) {
      control.element.classList.remove(HIDDEN_CLASS);
      control.element.removeAttribute('data-kanjo-priority');
    }

    this.controls.clear();

    // Remove container mode classes
    this.controlsContainer.classList.remove(COMPACT_CLASS);
    this.controlsContainer.classList.remove(MINIMAL_CLASS);
  }
}
