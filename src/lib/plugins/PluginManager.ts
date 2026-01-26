/**
 * Plugin Manager - Handles plugin registration and lifecycle
 */

import type { KimochiPlayerAPI, KimochiPlugin } from '../core/types';
import type { PluginRegistration } from './types';

export class PluginManager {
  private plugins: Map<string, PluginRegistration> = new Map();
  private player: KimochiPlayerAPI;

  constructor(player: KimochiPlayerAPI) {
    this.player = player;
  }

  /**
   * Register and install a plugin
   */
  async register(plugin: KimochiPlugin, priority = 0): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered`);
      return;
    }

    const registration: PluginRegistration = {
      plugin,
      priority,
      enabled: true,
    };

    this.plugins.set(plugin.name, registration);

    try {
      await plugin.install(this.player);
    } catch (error) {
      this.plugins.delete(plugin.name);
      throw error;
    }
  }

  /**
   * Unregister and destroy a plugin
   */
  unregister(name: string): void {
    const registration = this.plugins.get(name);
    if (!registration) {
      return;
    }

    if (registration.plugin.destroy) {
      registration.plugin.destroy();
    }

    this.plugins.delete(name);
  }

  /**
   * Get a plugin by name
   */
  get<T extends KimochiPlugin>(name: string): T | undefined {
    const registration = this.plugins.get(name);
    return registration?.plugin as T | undefined;
  }

  /**
   * Check if a plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Get all registered plugins sorted by priority
   */
  getAll(): KimochiPlugin[] {
    return Array.from(this.plugins.values())
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.plugin);
  }

  /**
   * Enable a plugin
   */
  enable(name: string): void {
    const registration = this.plugins.get(name);
    if (registration) {
      registration.enabled = true;
    }
  }

  /**
   * Disable a plugin
   */
  disable(name: string): void {
    const registration = this.plugins.get(name);
    if (registration) {
      registration.enabled = false;
    }
  }

  /**
   * Check if a plugin is enabled
   */
  isEnabled(name: string): boolean {
    const registration = this.plugins.get(name);
    return registration?.enabled ?? false;
  }

  /**
   * Destroy all plugins
   */
  destroyAll(): void {
    this.plugins.forEach((registration) => {
      if (registration.plugin.destroy) {
        registration.plugin.destroy();
      }
    });
    this.plugins.clear();
  }
}
