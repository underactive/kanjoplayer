/**
 * Reactive state manager for KimochiPlayer
 */

import type { KimochiPlayerState, StateSubscriber, TimeRangeInfo } from './types';

export function createInitialState(): KimochiPlayerState {
  return {
    currentTime: 0,
    duration: 0,
    paused: true,
    ended: false,
    volume: 1,
    muted: false,
    playbackRate: 1,
    isFullscreen: false,
    isLoading: false,
    isWaiting: false,
    isSeeking: false,
    isReady: false,
    src: '',
    sourceType: null,
    buffered: [],
    seekable: [],
    videoWidth: 0,
    videoHeight: 0,
    error: null,
    isPiP: false,
    controlsVisible: true,
  };
}

export class StateManager {
  private state: KimochiPlayerState;
  private subscribers: Set<StateSubscriber> = new Set();
  private batchUpdates: Partial<KimochiPlayerState>[] = [];
  private isBatching = false;

  constructor(initialState?: Partial<KimochiPlayerState>) {
    this.state = { ...createInitialState(), ...initialState };
  }

  /**
   * Get current state (returns a shallow copy)
   */
  getState(): KimochiPlayerState {
    return { ...this.state };
  }

  /**
   * Get a specific state value
   */
  get<K extends keyof KimochiPlayerState>(key: K): KimochiPlayerState[K] {
    return this.state[key];
  }

  /**
   * Update state with partial changes
   */
  setState(updates: Partial<KimochiPlayerState>): void {
    if (this.isBatching) {
      this.batchUpdates.push(updates);
      return;
    }

    const prevState = this.state;
    const hasChanges = this.applyUpdates(updates);

    if (hasChanges) {
      this.notifySubscribers(prevState);
    }
  }

  /**
   * Batch multiple state updates into a single notification
   */
  batch(fn: () => void): void {
    this.isBatching = true;
    this.batchUpdates = [];

    try {
      fn();
    } finally {
      this.isBatching = false;

      if (this.batchUpdates.length > 0) {
        const prevState = this.state;
        const mergedUpdates = Object.assign({}, ...this.batchUpdates);
        const hasChanges = this.applyUpdates(mergedUpdates);

        if (hasChanges) {
          this.notifySubscribers(prevState);
        }
      }

      this.batchUpdates = [];
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(subscriber: StateSubscriber): () => void {
    this.subscribers.add(subscriber);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * Reset state to initial values
   */
  reset(): void {
    const prevState = this.state;
    this.state = createInitialState();
    this.notifySubscribers(prevState);
  }

  /**
   * Convert TimeRanges to TimeRangeInfo array
   */
  static timeRangesToArray(ranges: TimeRanges): TimeRangeInfo[] {
    const result: TimeRangeInfo[] = [];
    for (let i = 0; i < ranges.length; i++) {
      result.push({
        start: ranges.start(i),
        end: ranges.end(i),
      });
    }
    return result;
  }

  private applyUpdates(updates: Partial<KimochiPlayerState>): boolean {
    let hasChanges = false;

    for (const key in updates) {
      const k = key as keyof KimochiPlayerState;
      const newValue = updates[k];
      const oldValue = this.state[k];

      // Deep equality check for arrays
      if (Array.isArray(newValue) && Array.isArray(oldValue)) {
        if (!this.arraysEqual(newValue, oldValue)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.state as any)[k] = newValue;
          hasChanges = true;
        }
      } else if (newValue !== oldValue) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.state as any)[k] = newValue;
        hasChanges = true;
      }
    }

    return hasChanges;
  }

  private arraysEqual(a: unknown[], b: unknown[]): boolean {
    if (a.length !== b.length) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private notifySubscribers(_prevState: KimochiPlayerState): void {
    const currentState = this.getState();
    this.subscribers.forEach((subscriber) => {
      try {
        subscriber(currentState);
      } catch (error) {
        console.error('Error in state subscriber:', error);
      }
    });
  }
}
