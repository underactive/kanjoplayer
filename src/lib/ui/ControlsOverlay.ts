/**
 * Main controls overlay container
 */

import type { KimochiPlayer } from '../core/KimochiPlayer';
import { UIBuilder } from './UIBuilder';
import { PlayButton, CenterPlayButton } from './controls/PlayButton';
import { TimeDisplay } from './controls/TimeDisplay';
import { ProgressBar } from './controls/ProgressBar';
import { VolumeControl } from './controls/VolumeControl';
import { FullscreenButton } from './controls/FullscreenButton';
import { SettingsMenu } from './controls/SettingsMenu';

export class ControlsOverlay {
  private element: HTMLElement;
  private player: KimochiPlayer;
  private bottomBar: HTMLElement;

  // Control components
  private centerPlayButton: CenterPlayButton;
  private playButton: PlayButton;
  private timeDisplay: TimeDisplay;
  private progressBar: ProgressBar;
  private volumeControl: VolumeControl;
  private fullscreenButton: FullscreenButton;
  private settingsMenu: SettingsMenu;

  constructor(player: KimochiPlayer, container: HTMLElement) {
    this.player = player;

    // Create control components
    this.centerPlayButton = new CenterPlayButton(player);
    this.playButton = new PlayButton(player);
    this.timeDisplay = new TimeDisplay(player);
    this.progressBar = new ProgressBar(player);
    this.volumeControl = new VolumeControl(player);
    this.fullscreenButton = new FullscreenButton(player);
    this.settingsMenu = new SettingsMenu(player);

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
      className: 'kimochi-controls-overlay',
    });

    // Loading indicator
    const loading = UIBuilder.create({
      className: 'kimochi-loading-indicator',
      html: `<div class="kimochi-spinner"></div>`,
    });
    overlay.appendChild(loading);

    // Center play button
    overlay.appendChild(this.centerPlayButton.getElement());

    // Gradient overlay at bottom
    const gradient = UIBuilder.create({ className: 'kimochi-controls-gradient' });
    overlay.appendChild(gradient);

    // Bottom bar
    overlay.appendChild(this.bottomBar);

    return overlay;
  }

  private createBottomBar(): HTMLElement {
    const bottomBar = UIBuilder.create({
      className: 'kimochi-controls-bottom',
    });

    // Progress bar row
    bottomBar.appendChild(this.progressBar.getElement());

    // Controls row
    const controlsRow = UIBuilder.create({
      className: 'kimochi-controls-row',
    });

    // Left controls
    const leftControls = UIBuilder.create({
      className: 'kimochi-controls-left',
    });
    leftControls.appendChild(this.playButton.getElement());
    leftControls.appendChild(this.volumeControl.getElement());
    leftControls.appendChild(this.timeDisplay.getElement());

    // Right controls
    const rightControls = UIBuilder.create({
      className: 'kimochi-controls-right',
    });
    rightControls.appendChild(this.settingsMenu.getElement());
    rightControls.appendChild(this.fullscreenButton.getElement());

    controlsRow.appendChild(leftControls);
    controlsRow.appendChild(rightControls);
    bottomBar.appendChild(controlsRow);

    return bottomBar;
  }

  private bindVisibilityEvents(): void {
    // Show/hide loading indicator
    this.player.on('waiting', () => {
      this.element.classList.add('kimochi-loading');
    });

    this.player.on('playing', () => {
      this.element.classList.remove('kimochi-loading');
    });

    this.player.on('canplay', () => {
      this.element.classList.remove('kimochi-loading');
    });

    // Show/hide controls based on state
    this.player.on('statechange', (state) => {
      if (state.controlsVisible) {
        this.element.classList.remove('kimochi-controls-hidden');
      } else {
        this.element.classList.add('kimochi-controls-hidden');
      }
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
