/**
 * French locale
 */

import type { LocaleStrings } from '../types';

export const fr: LocaleStrings = {
  // Play/Pause controls
  'play.tooltip': 'Lecture (Espace)',
  'play.ariaLabel': 'Lecture',
  'pause.tooltip': 'Pause (Espace)',
  'pause.ariaLabel': 'Pause',
  'replay.ariaLabel': 'Relire',

  // Volume controls
  'volume.mute': 'Couper le son (M)',
  'volume.unmute': 'Activer le son (M)',
  'volume.ariaLabel': 'Volume',

  // Fullscreen controls
  'fullscreen.enter': 'Plein écran (F)',
  'fullscreen.exit': 'Quitter le plein écran (F)',

  // Settings menu
  'settings.title': 'Paramètres',
  'settings.playbackSpeed': 'Vitesse de lecture',
  'settings.normal': 'Normale',
  'settings.pip': "Image dans l'image",
  'settings.download': 'Télécharger',
  'settings.adjustments': 'Réglages vidéo',

  // Video adjustments panel
  'adjustments.title': 'Réglages Vidéo',
  'adjustments.brightness': 'Luminosité',
  'adjustments.contrast': 'Contraste',
  'adjustments.saturation': 'Saturation',
  'adjustments.gamma': 'Gamma',
  'adjustments.hue': 'Teinte',
  'adjustments.resetAll': 'Tout réinitialiser',
  'adjustments.reset': 'Réinitialiser {name}',
  'adjustments.close': 'Fermer',

  // Skip controls
  'skip.back': 'Reculer de {duration}s',
  'skip.forward': 'Avancer de {duration}s',

  // A/B Loop controls
  'loop.setStart': 'Définir le point de départ du clip',
  'loop.setEnd': 'Définir le point final du clip',
  'loop.startAt': 'Début de la boucle : {time} (cliquer pour mettre à jour)',
  'loop.endAt': 'Fin de la boucle : {time} (cliquer pour mettre à jour)',
  'loop.toggle': 'Basculer la boucle A/B',
  'loop.enable': 'Activer la boucle A/B',
  'loop.disable': 'Désactiver la boucle A/B',
  'loop.setPointsFirst': "Définir les points A et B d'abord",
  'loop.downloadClip': 'Télécharger le clip',
  'loop.downloadDuration': 'Télécharger le clip de {duration}s',
  'loop.clearMarkers': 'Effacer les marqueurs',
  'loop.clearTitle': 'Effacer les points de boucle',
  'loop.noMarkers': 'Aucun marqueur à effacer',
  'loop.tooLong': 'Clip trop long ({duration}s). Maximum : {max}s',
  'loop.setPointsToDownload': 'Définir les points A et B pour télécharger',
  'loop.markerDragStart': 'Début du clip (glisser pour déplacer)',
  'loop.markerDragEnd': 'Fin du clip (glisser pour déplacer)',

  // Progress bar
  'progress.ariaLabel': 'Progression de la vidéo',
  'progress.fineTuning': 'Réglage fin',
  'progress.fineTuningStart': 'Point de départ',
  'progress.fineTuningEnd': 'Point final',
  'progress.window': 'fenêtre de {duration}',

  // Streaming
  'airplay.title': 'AirPlay',
  'airplay.connected': 'AirPlay (Connecté)',
  'cast.title': 'Caster',
  'cast.connected': 'Caster (Connecté)',

  // Live stream
  'live.badge': 'EN DIRECT',
  'live.jumpToLive': 'Aller au direct',
  'loop.notAvailableLive': "La boucle n'est pas disponible pour les diffusions en direct",

  // Download overlay
  'download.preparing': 'Préparation du téléchargement...',
  'download.ready': 'Téléchargement prêt',
  'download.readyMessage': 'Votre clip ({size}) est prêt. Voulez-vous le télécharger ?',
  'download.cancel': 'Annuler',
  'download.download': 'Télécharger',
  'download.cancelDownload': 'Annuler le téléchargement',
  'download.notSupported': 'Téléchargement non pris en charge par ce navigateur',
};
