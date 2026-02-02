/**
 * Chinese (Simplified) locale
 */

import type { LocaleStrings } from '../types';

export const zh: LocaleStrings = {
  // Play/Pause controls
  'play.tooltip': '播放 (空格)',
  'play.ariaLabel': '播放',
  'pause.tooltip': '暂停 (空格)',
  'pause.ariaLabel': '暂停',
  'replay.ariaLabel': '重播',

  // Volume controls
  'volume.mute': '静音 (M)',
  'volume.unmute': '取消静音 (M)',
  'volume.ariaLabel': '音量',

  // Fullscreen controls
  'fullscreen.enter': '全屏 (F)',
  'fullscreen.exit': '退出全屏 (F)',

  // Settings menu
  'settings.title': '设置',
  'settings.playbackSpeed': '播放速度',
  'settings.normal': '正常',
  'settings.pip': '画中画',
  'settings.download': '下载',
  'settings.adjustments': '视频调整',

  // Video adjustments panel
  'adjustments.title': '视频调整',
  'adjustments.brightness': '亮度',
  'adjustments.contrast': '对比度',
  'adjustments.saturation': '饱和度',
  'adjustments.gamma': '伽马',
  'adjustments.hue': '色调',
  'adjustments.resetAll': '全部重置',
  'adjustments.reset': '重置{name}',
  'adjustments.close': '关闭',

  // Skip controls
  'skip.back': '后退 {duration} 秒',
  'skip.forward': '前进 {duration} 秒',

  // A/B Loop controls
  'loop.setStart': '设置剪辑起点',
  'loop.setEnd': '设置剪辑终点',
  'loop.startAt': '循环起点: {time} (点击更新)',
  'loop.endAt': '循环终点: {time} (点击更新)',
  'loop.toggle': '切换 A/B 循环',
  'loop.enable': '启用 A/B 循环',
  'loop.disable': '禁用 A/B 循环',
  'loop.setPointsFirst': '请先设置 A 和 B 点',
  'loop.downloadClip': '下载剪辑',
  'loop.downloadDuration': '下载 {duration} 秒剪辑',
  'loop.clearMarkers': '清除标记',
  'loop.clearTitle': '清除循环点',
  'loop.noMarkers': '没有可清除的标记',
  'loop.tooLong': '剪辑太长 ({duration}秒)。最大: {max}秒',
  'loop.setPointsToDownload': '设置 A 和 B 点以下载',
  'loop.markerDragStart': '剪辑起点 (拖动移动)',
  'loop.markerDragEnd': '剪辑终点 (拖动移动)',

  // Progress bar
  'progress.ariaLabel': '视频进度',
  'progress.fineTuning': '微调',
  'progress.fineTuningStart': '起点',
  'progress.fineTuningEnd': '终点',
  'progress.window': '{duration} 窗口',

  // Streaming
  'airplay.title': 'AirPlay',
  'airplay.connected': 'AirPlay (已连接)',
  'cast.title': '投屏',
  'cast.connected': '投屏 (已连接)',

  // Download overlay
  'download.preparing': '正在准备下载...',
  'download.ready': '下载准备就绪',
  'download.readyMessage': '您的剪辑 ({size}) 已准备好。是否下载？',
  'download.cancel': '取消',
  'download.download': '下载',
  'download.cancelDownload': '取消下载',
  'download.notSupported': '此浏览器不支持下载',
};
