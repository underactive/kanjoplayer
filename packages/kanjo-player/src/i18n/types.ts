/**
 * i18n types for KanjoPlayer
 */

/**
 * All localizable strings in the player.
 * Keys use dot notation to organize strings by component/context.
 */
export interface LocaleStrings {
  // Play/Pause controls
  'play.tooltip': string;
  'play.ariaLabel': string;
  'pause.tooltip': string;
  'pause.ariaLabel': string;
  'replay.ariaLabel': string;

  // Volume controls
  'volume.mute': string;
  'volume.unmute': string;
  'volume.ariaLabel': string;

  // Fullscreen controls
  'fullscreen.enter': string;
  'fullscreen.exit': string;

  // Settings menu
  'settings.title': string;
  'settings.playbackSpeed': string;
  'settings.normal': string;
  'settings.pip': string;
  'settings.download': string;
  'settings.adjustments': string;

  // Video adjustments panel
  'adjustments.title': string;
  'adjustments.brightness': string;
  'adjustments.contrast': string;
  'adjustments.saturation': string;
  'adjustments.gamma': string;
  'adjustments.hue': string;
  'adjustments.resetAll': string;
  'adjustments.reset': string;
  'adjustments.close': string;

  // Skip controls
  'skip.back': string;
  'skip.forward': string;

  // A/B Loop controls
  'loop.setStart': string;
  'loop.setEnd': string;
  'loop.startAt': string;
  'loop.endAt': string;
  'loop.toggle': string;
  'loop.enable': string;
  'loop.disable': string;
  'loop.setPointsFirst': string;
  'loop.downloadClip': string;
  'loop.downloadDuration': string;
  'loop.clearMarkers': string;
  'loop.clearTitle': string;
  'loop.noMarkers': string;
  'loop.tooLong': string;
  'loop.setPointsToDownload': string;
  'loop.markerDragStart': string;
  'loop.markerDragEnd': string;

  // Progress bar
  'progress.ariaLabel': string;
  'progress.fineTuning': string;
  'progress.fineTuningStart': string;
  'progress.fineTuningEnd': string;
  'progress.window': string;

  // Streaming
  'airplay.title': string;
  'airplay.connected': string;
  'cast.title': string;
  'cast.connected': string;

  // Download overlay
  'download.preparing': string;
  'download.ready': string;
  'download.readyMessage': string;
  'download.cancel': string;
  'download.download': string;
  'download.cancelDownload': string;
  'download.notSupported': string;
}

/**
 * Keys that require interpolation values.
 * Maps string keys to their required interpolation parameters.
 */
export interface LocaleInterpolations {
  'skip.back': { duration: number };
  'skip.forward': { duration: number };
  'loop.startAt': { time: string };
  'loop.endAt': { time: string };
  'loop.downloadDuration': { duration: number };
  'loop.tooLong': { duration: number; max: number };
  'download.readyMessage': { size: string };
  'progress.fineTuningStart': never;
  'progress.fineTuningEnd': never;
  'progress.window': { duration: string };
  'adjustments.reset': { name: string };
}

/**
 * Helper type to get keys that don't require interpolation
 */
export type SimpleStringKey = Exclude<keyof LocaleStrings, keyof LocaleInterpolations>;
