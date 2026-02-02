/**
 * LocaleManager - Manages localized strings with interpolation and runtime switching
 */

import type { LocaleStrings } from './types';
import { en } from './locales/en';

/**
 * Interpolates values into a string template.
 * Replaces {key} placeholders with corresponding values.
 *
 * @example
 * interpolate('Skip back {duration}s', { duration: 10 }) // 'Skip back 10s'
 */
function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

export class LocaleManager {
  private strings: LocaleStrings;
  private listeners: Set<() => void> = new Set();
  private currentLocale: string = 'en';

  constructor(customStrings?: Partial<LocaleStrings>, localeCode?: string) {
    this.strings = customStrings ? { ...en, ...customStrings } : { ...en };
    if (localeCode) {
      this.currentLocale = localeCode;
    }
  }

  /**
   * Get a simple string without interpolation.
   *
   * @param key - The string key to retrieve
   * @returns The localized string
   */
  get<K extends keyof LocaleStrings>(key: K): LocaleStrings[K] {
    return this.strings[key];
  }

  /**
   * Get a string with interpolated values.
   *
   * @param key - The string key to retrieve
   * @param values - Object containing values to interpolate
   * @returns The localized string with values interpolated
   *
   * @example
   * locale.t('skip.back', { duration: 10 }) // 'Skip back 10s'
   */
  t<K extends keyof LocaleStrings>(key: K, values: Record<string, string | number>): string {
    return interpolate(this.strings[key], values);
  }

  /**
   * Update locale strings at runtime.
   * This triggers all subscribed listeners for UI updates.
   *
   * @param newStrings - Partial locale strings to merge (missing keys use English defaults)
   * @param localeCode - Optional locale code (e.g., 'en', 'es', 'ja') for custom button i18n
   */
  update(newStrings: Partial<LocaleStrings>, localeCode?: string): void {
    this.strings = { ...en, ...newStrings };
    if (localeCode) {
      this.currentLocale = localeCode;
    }
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Get the current locale code.
   * Used by custom buttons to resolve localized strings.
   *
   * @returns The current locale code (default: 'en')
   */
  getCurrentLocale(): string {
    return this.currentLocale;
  }

  /**
   * Set the current locale code without changing strings.
   * Useful when you want to signal which locale is active for custom buttons.
   *
   * @param localeCode - The locale code (e.g., 'en', 'es', 'ja')
   */
  setCurrentLocale(localeCode: string): void {
    this.currentLocale = localeCode;
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Subscribe to locale changes for UI re-renders.
   *
   * @param listener - Callback to invoke when locale changes
   * @returns Unsubscribe function
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get all current strings (for debugging or serialization)
   */
  getAll(): LocaleStrings {
    return { ...this.strings };
  }
}
