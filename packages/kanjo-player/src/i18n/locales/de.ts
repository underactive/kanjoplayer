/**
 * German locale
 */

import type { LocaleStrings } from '../types';

export const de: LocaleStrings = {
  // Play/Pause controls
  'play.tooltip': 'Abspielen (Leertaste)',
  'play.ariaLabel': 'Abspielen',
  'pause.tooltip': 'Pause (Leertaste)',
  'pause.ariaLabel': 'Pause',
  'replay.ariaLabel': 'Wiederholen',

  // Volume controls
  'volume.mute': 'Stumm (M)',
  'volume.unmute': 'Ton an (M)',
  'volume.ariaLabel': 'Lautstärke',

  // Fullscreen controls
  'fullscreen.enter': 'Vollbild (F)',
  'fullscreen.exit': 'Vollbild beenden (F)',

  // Settings menu
  'settings.title': 'Einstellungen',
  'settings.playbackSpeed': 'Wiedergabegeschwindigkeit',
  'settings.normal': 'Normal',
  'settings.pip': 'Bild-in-Bild',
  'settings.download': 'Herunterladen',
  'settings.adjustments': 'Videoanpassungen',

  // Video adjustments panel
  'adjustments.title': 'Videoanpassungen',
  'adjustments.brightness': 'Helligkeit',
  'adjustments.contrast': 'Kontrast',
  'adjustments.saturation': 'Sättigung',
  'adjustments.gamma': 'Gamma',
  'adjustments.hue': 'Farbton',
  'adjustments.resetAll': 'Alles zurücksetzen',
  'adjustments.reset': '{name} zurücksetzen',
  'adjustments.close': 'Schließen',

  // Skip controls
  'skip.back': '{duration}s zurückspringen',
  'skip.forward': '{duration}s vorspringen',

  // A/B Loop controls
  'loop.setStart': 'Clip-Startpunkt setzen',
  'loop.setEnd': 'Clip-Endpunkt setzen',
  'loop.startAt': 'Schleifenanfang: {time} (zum Aktualisieren klicken)',
  'loop.endAt': 'Schleifenende: {time} (zum Aktualisieren klicken)',
  'loop.toggle': 'A/B-Schleife umschalten',
  'loop.enable': 'A/B-Schleife aktivieren',
  'loop.disable': 'A/B-Schleife deaktivieren',
  'loop.setPointsFirst': 'Zuerst A- und B-Punkte setzen',
  'loop.downloadClip': 'Clip herunterladen',
  'loop.downloadDuration': '{duration}s Clip herunterladen',
  'loop.clearMarkers': 'Markierungen löschen',
  'loop.clearTitle': 'Schleifenpunkte löschen',
  'loop.noMarkers': 'Keine Markierungen zum Löschen',
  'loop.tooLong': 'Clip zu lang ({duration}s). Maximum: {max}s',
  'loop.setPointsToDownload': 'A- und B-Punkte zum Herunterladen setzen',
  'loop.markerDragStart': 'Clip-Anfang (ziehen zum Verschieben)',
  'loop.markerDragEnd': 'Clip-Ende (ziehen zum Verschieben)',

  // Progress bar
  'progress.ariaLabel': 'Videofortschritt',
  'progress.fineTuning': 'Feineinstellung',
  'progress.fineTuningStart': 'Startpunkt',
  'progress.fineTuningEnd': 'Endpunkt',
  'progress.window': '{duration} Fenster',

  // Streaming
  'airplay.title': 'AirPlay',
  'airplay.connected': 'AirPlay (Verbunden)',
  'cast.title': 'Übertragen',
  'cast.connected': 'Übertragen (Verbunden)',

  // Live stream
  'live.badge': 'LIVE',
  'live.jumpToLive': 'Zum Live-Punkt springen',
  'loop.notAvailableLive': 'Schleife nicht verfügbar für Live-Streams',

  // Download overlay
  'download.preparing': 'Download wird vorbereitet...',
  'download.ready': 'Download bereit',
  'download.readyMessage': 'Ihr Clip ({size}) ist bereit. Möchten Sie ihn herunterladen?',
  'download.cancel': 'Abbrechen',
  'download.download': 'Herunterladen',
  'download.cancelDownload': 'Download abbrechen',
  'download.notSupported': 'Download wird in diesem Browser nicht unterstützt',
};
