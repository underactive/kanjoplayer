/**
 * Spanish locale
 */

import type { LocaleStrings } from '../types';

export const es: LocaleStrings = {
  // Play/Pause controls
  'play.tooltip': 'Reproducir (Espacio)',
  'play.ariaLabel': 'Reproducir',
  'pause.tooltip': 'Pausar (Espacio)',
  'pause.ariaLabel': 'Pausar',
  'replay.ariaLabel': 'Repetir',

  // Volume controls
  'volume.mute': 'Silenciar (M)',
  'volume.unmute': 'Activar sonido (M)',
  'volume.ariaLabel': 'Volumen',

  // Fullscreen controls
  'fullscreen.enter': 'Pantalla completa (F)',
  'fullscreen.exit': 'Salir de pantalla completa (F)',

  // Settings menu
  'settings.title': 'Configuración',
  'settings.playbackSpeed': 'Velocidad de reproducción',
  'settings.normal': 'Normal',
  'settings.pip': 'Imagen en imagen',
  'settings.download': 'Descargar',
  'settings.adjustments': 'Ajustes de video',

  // Video adjustments panel
  'adjustments.title': 'Ajustes de Video',
  'adjustments.brightness': 'Brillo',
  'adjustments.contrast': 'Contraste',
  'adjustments.saturation': 'Saturación',
  'adjustments.gamma': 'Gamma',
  'adjustments.hue': 'Matiz',
  'adjustments.resetAll': 'Restablecer todo',
  'adjustments.reset': 'Restablecer {name}',
  'adjustments.close': 'Cerrar',

  // Skip controls
  'skip.back': 'Retroceder {duration}s',
  'skip.forward': 'Avanzar {duration}s',

  // A/B Loop controls
  'loop.setStart': 'Establecer punto de inicio del clip',
  'loop.setEnd': 'Establecer punto final del clip',
  'loop.startAt': 'Inicio del bucle: {time} (clic para actualizar)',
  'loop.endAt': 'Fin del bucle: {time} (clic para actualizar)',
  'loop.toggle': 'Alternar bucle A/B',
  'loop.enable': 'Activar bucle A/B',
  'loop.disable': 'Desactivar bucle A/B',
  'loop.setPointsFirst': 'Establece los puntos A y B primero',
  'loop.downloadClip': 'Descargar clip',
  'loop.downloadDuration': 'Descargar clip de {duration}s',
  'loop.clearMarkers': 'Borrar marcadores',
  'loop.clearTitle': 'Borrar puntos del bucle',
  'loop.noMarkers': 'No hay marcadores para borrar',
  'loop.tooLong': 'Clip demasiado largo ({duration}s). Máximo: {max}s',
  'loop.setPointsToDownload': 'Establece los puntos A y B para descargar',
  'loop.markerDragStart': 'Inicio del clip (arrastra para mover)',
  'loop.markerDragEnd': 'Fin del clip (arrastra para mover)',

  // Progress bar
  'progress.ariaLabel': 'Progreso del video',
  'progress.fineTuning': 'Ajuste fino',
  'progress.fineTuningStart': 'Punto de inicio',
  'progress.fineTuningEnd': 'Punto final',
  'progress.window': 'ventana de {duration}',

  // Streaming
  'airplay.title': 'AirPlay',
  'airplay.connected': 'AirPlay (Conectado)',
  'cast.title': 'Enviar',
  'cast.connected': 'Enviar (Conectado)',

  // Live stream
  'live.badge': 'EN VIVO',
  'live.jumpToLive': 'Ir a la transmisión en vivo',
  'loop.notAvailableLive': 'El bucle no está disponible para transmisiones en vivo',

  // Download overlay
  'download.preparing': 'Preparando descarga...',
  'download.ready': 'Descarga lista',
  'download.readyMessage': 'Tu clip ({size}) está listo. ¿Quieres descargarlo?',
  'download.cancel': 'Cancelar',
  'download.download': 'Descargar',
  'download.cancelDownload': 'Cancelar descarga',
  'download.notSupported': 'Descarga no compatible con este navegador',
};
