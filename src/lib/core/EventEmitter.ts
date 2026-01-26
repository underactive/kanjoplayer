/**
 * Type-safe event emitter for KimochiPlayer
 */

import type { EventHandler } from './types';

export class EventEmitter<Events extends { [K in keyof Events]: Events[K] }> {
  private handlers: Map<keyof Events, Set<EventHandler<unknown>>> = new Map();

  /**
   * Subscribe to an event
   */
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): this {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);
    return this;
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): this {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler as EventHandler<unknown>);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    }
    return this;
  }

  /**
   * Subscribe to an event once
   */
  once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): this {
    const onceHandler: EventHandler<Events[K]> = (data) => {
      this.off(event, onceHandler);
      handler(data);
    };
    return this.on(event, onceHandler);
  }

  /**
   * Emit an event with data
   */
  emit<K extends keyof Events>(event: K, data: Events[K]): this {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for "${String(event)}":`, error);
        }
      });
    }
    return this;
  }

  /**
   * Remove all handlers for an event or all events
   */
  removeAllListeners(event?: keyof Events): this {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
    return this;
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: keyof Events): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners(event: keyof Events): boolean {
    return this.listenerCount(event) > 0;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): (keyof Events)[] {
    return Array.from(this.handlers.keys());
  }
}
