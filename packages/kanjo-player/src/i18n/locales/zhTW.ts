/**
 * Chinese (Traditional) locale
 */

import type { LocaleStrings } from '../types';

export const zhTW: LocaleStrings = {
  // Play/Pause controls
  'play.tooltip': '播放 (空格)',
  'play.ariaLabel': '播放',
  'pause.tooltip': '暫停 (空格)',
  'pause.ariaLabel': '暫停',
  'replay.ariaLabel': '重播',

  // Volume controls
  'volume.mute': '靜音 (M)',
  'volume.unmute': '取消靜音 (M)',
  'volume.ariaLabel': '音量',

  // Fullscreen controls
  'fullscreen.enter': '全螢幕 (F)',
  'fullscreen.exit': '退出全螢幕 (F)',

  // Settings menu
  'settings.title': '設定',
  'settings.playbackSpeed': '播放速度',
  'settings.normal': '正常',
  'settings.pip': '子母畫面',
  'settings.download': '下載',
  'settings.adjustments': '影片調整',

  // Video adjustments panel
  'adjustments.title': '影片調整',
  'adjustments.brightness': '亮度',
  'adjustments.contrast': '對比度',
  'adjustments.saturation': '飽和度',
  'adjustments.gamma': '伽瑪',
  'adjustments.hue': '色調',
  'adjustments.resetAll': '全部重設',
  'adjustments.reset': '重設{name}',
  'adjustments.close': '關閉',

  // Skip controls
  'skip.back': '倒退 {duration} 秒',
  'skip.forward': '快進 {duration} 秒',

  // A/B Loop controls
  'loop.setStart': '設定剪輯起點',
  'loop.setEnd': '設定剪輯終點',
  'loop.startAt': '循環起點: {time} (點擊更新)',
  'loop.endAt': '循環終點: {time} (點擊更新)',
  'loop.toggle': '切換 A/B 循環',
  'loop.enable': '啟用 A/B 循環',
  'loop.disable': '停用 A/B 循環',
  'loop.setPointsFirst': '請先設定 A 和 B 點',
  'loop.downloadClip': '下載剪輯',
  'loop.downloadDuration': '下載 {duration} 秒剪輯',
  'loop.clearMarkers': '清除標記',
  'loop.clearTitle': '清除循環點',
  'loop.noMarkers': '沒有可清除的標記',
  'loop.tooLong': '剪輯太長 ({duration}秒)。最大: {max}秒',
  'loop.setPointsToDownload': '設定 A 和 B 點以下載',
  'loop.markerDragStart': '剪輯起點 (拖曳移動)',
  'loop.markerDragEnd': '剪輯終點 (拖曳移動)',

  // Progress bar
  'progress.ariaLabel': '影片進度',
  'progress.fineTuning': '微調',
  'progress.fineTuningStart': '起點',
  'progress.fineTuningEnd': '終點',
  'progress.window': '{duration} 視窗',

  // Streaming
  'airplay.title': 'AirPlay',
  'airplay.connected': 'AirPlay (已連線)',
  'cast.title': '投放',
  'cast.connected': '投放 (已連線)',

  // Download overlay
  'download.preparing': '正在準備下載...',
  'download.ready': '下載準備就緒',
  'download.readyMessage': '您的剪輯 ({size}) 已準備好。是否下載？',
  'download.cancel': '取消',
  'download.download': '下載',
  'download.cancelDownload': '取消下載',
  'download.notSupported': '此瀏覽器不支援下載',
};
