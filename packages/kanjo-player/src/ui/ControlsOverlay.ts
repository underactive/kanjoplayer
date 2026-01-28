/**
 * Main controls overlay container
 */

import type { KanjoPlayer } from '../core/KanjoPlayer';
import type { SettingsMenuConfig, WatermarkConfig, CustomButtonsConfig, SkipControlConfig } from '../core/types';
import { UIBuilder } from './UIBuilder';
import { PlayButton, CenterPlayButton } from './controls/PlayButton';
import { TimeDisplay } from './controls/TimeDisplay';
import { ProgressBar } from './controls/ProgressBar';
import { VolumeControl } from './controls/VolumeControl';
import { FullscreenButton } from './controls/FullscreenButton';
import { SettingsMenu } from './controls/SettingsMenu';
import { ABLoopControl } from './controls/ABLoopControl';
import { DownloadOverlay } from './DownloadOverlay';
import { VideoAdjustmentsPanel } from './controls/VideoAdjustmentsPanel';
import { CustomButtonArea } from './controls/CustomButtonArea';
import { SkipControl } from './controls/SkipControl';

export interface ControlsOverlayOptions {
  settings?: SettingsMenuConfig;
  watermark?: WatermarkConfig;
  customButtons?: CustomButtonsConfig;
  skipControls?: SkipControlConfig;
}

export class ControlsOverlay {
  private element: HTMLElement;
  private player: KanjoPlayer;
  private bottomBar: HTMLElement;
  private options: ControlsOverlayOptions;

  // Control components
  private centerPlayButton: CenterPlayButton;
  private playButton: PlayButton;
  private timeDisplay: TimeDisplay;
  private progressBar: ProgressBar;
  private volumeControl: VolumeControl;
  private fullscreenButton: FullscreenButton;
  private settingsMenu: SettingsMenu | null = null;
  private abLoopControl: ABLoopControl;
  private downloadOverlay: DownloadOverlay;
  private videoAdjustmentsPanel: VideoAdjustmentsPanel;
  private skipControl: SkipControl | null = null;
  // Custom button area (kept as reference for potential future use/cleanup)
  private _customButtonArea: CustomButtonArea | null = null;

  constructor(player: KanjoPlayer, container: HTMLElement, options?: ControlsOverlayOptions) {
    this.player = player;
    this.options = options || {};

    // Create control components
    this.centerPlayButton = new CenterPlayButton(player);
    this.playButton = new PlayButton(player);
    this.timeDisplay = new TimeDisplay(player);
    this.progressBar = new ProgressBar(player);
    this.volumeControl = new VolumeControl(player);
    this.fullscreenButton = new FullscreenButton(player);

    // Settings menu (conditionally created based on enabled flag)
    const settingsEnabled = this.options.settings?.enabled !== false;
    if (settingsEnabled) {
      this.settingsMenu = new SettingsMenu(player, this.options.settings);
    }

    // Skip controls (conditionally created based on enabled flag)
    if (this.options.skipControls?.enabled) {
      this.skipControl = new SkipControl(player, this.options.skipControls);
    }

    this.abLoopControl = new ABLoopControl(player, { watermark: this.options.watermark });
    this.downloadOverlay = new DownloadOverlay(container);
    this.videoAdjustmentsPanel = new VideoAdjustmentsPanel(player, container);

    // Wire up settings menu with video adjustments panel
    if (this.settingsMenu) {
      this.settingsMenu.setAdjustmentsCallback(() => {
        this.videoAdjustmentsPanel.toggle();
      });
    }

    // Wire up A/B loop control with progress bar
    this.abLoopControl.setStateChangeCallback((state) => {
      this.progressBar.updateLoopState(state);
    });
    this.progressBar.setLoopMarkerDragCallback((type, time) => {
      if (type === 'start') {
        this.abLoopControl.updateStartTime(time);
      } else {
        this.abLoopControl.updateEndTime(time);
      }
    });

    // Wire up A/B loop control with download overlay
    this.abLoopControl.setDownloadOverlay(this.downloadOverlay);

    // Build the overlay
    this.bottomBar = this.createBottomBar();
    this.element = this.createElement();

    // Append to container
    container.appendChild(this.element);

    // Bind visibility events
    this.bindVisibilityEvents();
  }

  private createElement(): HTMLElement {
    const overlay = UIBuilder.create({
      className: 'kanjo-controls-overlay',
    });

    // Loading indicator
    const loading = UIBuilder.create({
      className: 'kanjo-loading-indicator',
      html: `<div class="kanjo-spinner"></div>`,
    });
    overlay.appendChild(loading);

    // Center play button
    overlay.appendChild(this.centerPlayButton.getElement());

    // Gradient overlay at bottom
    const gradient = UIBuilder.create({ className: 'kanjo-controls-gradient' });
    overlay.appendChild(gradient);

    // Bottom bar
    overlay.appendChild(this.bottomBar);

    return overlay;
  }

  private createBottomBar(): HTMLElement {
    const bottomBar = UIBuilder.create({
      className: 'kanjo-controls-bottom',
    });

    // Custom button area (above progress bar)
    if (this.options.customButtons?.enabled && this.options.customButtons.buttons.length > 0) {
      this._customButtonArea = new CustomButtonArea(
        this.player,
        bottomBar,
        this.options.customButtons
      );
    }

    // Progress bar row
    bottomBar.appendChild(this.progressBar.getElement());

    // Controls row
    const controlsRow = UIBuilder.create({
      className: 'kanjo-controls-row',
    });

    // Left controls
    const leftControls = UIBuilder.create({
      className: 'kanjo-controls-left',
    });
    leftControls.appendChild(this.playButton.getElement());
    if (this.skipControl) {
      leftControls.appendChild(this.skipControl.getElement());
    }
    leftControls.appendChild(this.volumeControl.getElement());
    leftControls.appendChild(this.timeDisplay.getElement());

    // Right controls
    const rightControls = UIBuilder.create({
      className: 'kanjo-controls-right',
    });
    rightControls.appendChild(this.abLoopControl.getElement());
    if (this.settingsMenu) {
      rightControls.appendChild(this.settingsMenu.getElement());
    }
    rightControls.appendChild(this.fullscreenButton.getElement());

    controlsRow.appendChild(leftControls);
    controlsRow.appendChild(rightControls);
    bottomBar.appendChild(controlsRow);

    return bottomBar;
  }

  private bindVisibilityEvents(): void {
    // Show/hide loading indicator
    this.player.on('waiting', () => {
      this.element.classList.add('kanjo-loading');
    });

    this.player.on('playing', () => {
      this.element.classList.remove('kanjo-loading');
    });

    this.player.on('canplay', () => {
      this.element.classList.remove('kanjo-loading');
    });

    // Show/hide controls based on state
    this.player.on('statechange', (state) => {
      if (state.controlsVisible) {
        this.element.classList.remove('kanjo-controls-hidden');
      } else {
        this.element.classList.add('kanjo-controls-hidden');
      }
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this._customButtonArea) {
      this._customButtonArea.destroy();
    }
  }
}
