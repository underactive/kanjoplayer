/**
 * Plugin system types
 */

import type { KimochiPlayerAPI, KimochiPlugin } from '../core/types';

/**
 * Context passed to plugins during installation
 */
export interface PluginContext {
  /** Player API instance */
  player: KimochiPlayerAPI;
  /** Access to the video element */
  videoElement: HTMLVideoElement;
  /** Access to the container element */
  containerElement: HTMLElement;
}

/**
 * Base class for creating plugins with common functionality
 */
export abstract class BasePlugin implements KimochiPlugin {
  abstract name: string;
  version = '1.0.0';

  protected player: KimochiPlayerAPI | null = null;
  protected video: HTMLVideoElement | null = null;
  protected container: HTMLElement | null = null;

  install(player: KimochiPlayerAPI): void | Promise<void> {
    this.player = player;
    this.video = player.getVideoElement();
    this.container = player.getContainerElement();
    return this.onInstall();
  }

  /**
   * Override this method to implement plugin initialization
   */
  protected abstract onInstall(): void | Promise<void>;

  destroy(): void {
    this.onDestroy();
    this.player = null;
    this.video = null;
    this.container = null;
  }

  /**
   * Override this method to implement plugin cleanup
   */
  protected onDestroy(): void {
    // Override in subclass
  }
}

/**
 * Plugin registration entry
 */
export interface PluginRegistration {
  plugin: KimochiPlugin;
  priority: number;
  enabled: boolean;
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  beforeInstall?: (player: KimochiPlayerAPI) => boolean | Promise<boolean>;
  afterInstall?: (player: KimochiPlayerAPI) => void;
  beforeDestroy?: () => void;
  afterDestroy?: () => void;
}
