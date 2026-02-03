/**
 * English locale (default)
 */

import type { LocaleStrings } from '../types';

export const en: LocaleStrings = {
  // Play/Pause controls
  'play.tooltip': 'Play (Space)',
  'play.ariaLabel': 'Play',
  'pause.tooltip': 'Pause (Space)',
  'pause.ariaLabel': 'Pause',
  'replay.ariaLabel': 'Replay',

  // Volume controls
  'volume.mute': 'Mute (M)',
  'volume.unmute': 'Unmute (M)',
  'volume.ariaLabel': 'Volume',

  // Fullscreen controls
  'fullscreen.enter': 'Fullscreen (F)',
  'fullscreen.exit': 'Exit Fullscreen (F)',

  // Settings menu
  'settings.title': 'Settings',
  'settings.playbackSpeed': 'Playback speed',
  'settings.normal': 'Normal',
  'settings.pip': 'Picture-in-Picture',
  'settings.download': 'Download',
  'settings.adjustments': 'Video adjustments',

  // Video adjustments panel
  'adjustments.title': 'Video Adjustments',
  'adjustments.brightness': 'Brightness',
  'adjustments.contrast': 'Contrast',
  'adjustments.saturation': 'Saturation',
  'adjustments.gamma': 'Gamma',
  'adjustments.hue': 'Hue',
  'adjustments.resetAll': 'Reset All',
  'adjustments.reset': 'Reset {name}',
  'adjustments.close': 'Close',

  // Skip controls
  'skip.back': 'Skip back {duration}s',
  'skip.forward': 'Skip forward {duration}s',

  // A/B Loop controls
  'loop.setStart': 'Set clip start point',
  'loop.setEnd': 'Set clip end point',
  'loop.startAt': 'Loop start: {time} (click to update)',
  'loop.endAt': 'Loop end: {time} (click to update)',
  'loop.toggle': 'Toggle A/B loop',
  'loop.enable': 'Enable A/B loop',
  'loop.disable': 'Disable A/B loop',
  'loop.setPointsFirst': 'Set A and B points first',
  'loop.downloadClip': 'Download clip',
  'loop.downloadDuration': 'Download {duration}s clip',
  'loop.clearMarkers': 'Clear markers',
  'loop.clearTitle': 'Clear loop points',
  'loop.noMarkers': 'No markers to clear',
  'loop.tooLong': 'Clip too long ({duration}s). Max: {max}s',
  'loop.setPointsToDownload': 'Set A and B points to download',
  'loop.markerDragStart': 'Clip start (drag to move)',
  'loop.markerDragEnd': 'Clip end (drag to move)',

  // Progress bar
  'progress.ariaLabel': 'Video progress',
  'progress.fineTuning': 'Fine Tuning',
  'progress.fineTuningStart': 'Start Point',
  'progress.fineTuningEnd': 'End Point',
  'progress.window': '{duration} window',

  // Streaming
  'airplay.title': 'AirPlay',
  'airplay.connected': 'AirPlay (Connected)',
  'cast.title': 'Cast',
  'cast.connected': 'Cast (Connected)',

  // Live stream
  'live.badge': 'LIVE',
  'live.jumpToLive': 'Jump to live',
  'loop.notAvailableLive': 'Loop not available for live streams',

  // Download overlay
  'download.preparing': 'Preparing download...',
  'download.ready': 'Download Ready',
  'download.readyMessage': 'Your clip ({size}) is ready. Do you want to download it?',
  'download.cancel': 'Cancel',
  'download.download': 'Download',
  'download.cancelDownload': 'Cancel download',
  'download.notSupported': 'Download not supported in this browser',
};
