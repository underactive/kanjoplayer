/**
 * Japanese locale
 */

import type { LocaleStrings } from '../types';

export const ja: LocaleStrings = {
  // Play/Pause controls
  'play.tooltip': '再生 (スペース)',
  'play.ariaLabel': '再生',
  'pause.tooltip': '一時停止 (スペース)',
  'pause.ariaLabel': '一時停止',
  'replay.ariaLabel': 'リプレイ',

  // Volume controls
  'volume.mute': 'ミュート (M)',
  'volume.unmute': 'ミュート解除 (M)',
  'volume.ariaLabel': '音量',

  // Fullscreen controls
  'fullscreen.enter': '全画面表示 (F)',
  'fullscreen.exit': '全画面表示を終了 (F)',

  // Settings menu
  'settings.title': '設定',
  'settings.playbackSpeed': '再生速度',
  'settings.normal': '標準',
  'settings.pip': 'ピクチャーインピクチャー',
  'settings.download': 'ダウンロード',
  'settings.adjustments': 'ビデオ調整',

  // Video adjustments panel
  'adjustments.title': 'ビデオ調整',
  'adjustments.brightness': '明るさ',
  'adjustments.contrast': 'コントラスト',
  'adjustments.saturation': '彩度',
  'adjustments.gamma': 'ガンマ',
  'adjustments.hue': '色相',
  'adjustments.resetAll': 'すべてリセット',
  'adjustments.reset': '{name}をリセット',
  'adjustments.close': '閉じる',

  // Skip controls
  'skip.back': '{duration}秒戻る',
  'skip.forward': '{duration}秒進む',

  // A/B Loop controls
  'loop.setStart': 'クリップ開始点を設定',
  'loop.setEnd': 'クリップ終了点を設定',
  'loop.startAt': 'ループ開始: {time} (クリックで更新)',
  'loop.endAt': 'ループ終了: {time} (クリックで更新)',
  'loop.toggle': 'A/Bループを切替',
  'loop.enable': 'A/Bループを有効化',
  'loop.disable': 'A/Bループを無効化',
  'loop.setPointsFirst': '先にAとBの点を設定してください',
  'loop.downloadClip': 'クリップをダウンロード',
  'loop.downloadDuration': '{duration}秒のクリップをダウンロード',
  'loop.clearMarkers': 'マーカーをクリア',
  'loop.clearTitle': 'ループポイントをクリア',
  'loop.noMarkers': 'クリアするマーカーがありません',
  'loop.tooLong': 'クリップが長すぎます ({duration}秒)。最大: {max}秒',
  'loop.setPointsToDownload': 'ダウンロードするにはAとBの点を設定',
  'loop.markerDragStart': 'クリップ開始 (ドラッグで移動)',
  'loop.markerDragEnd': 'クリップ終了 (ドラッグで移動)',

  // Progress bar
  'progress.ariaLabel': 'ビデオの進行状況',
  'progress.fineTuning': '微調整',
  'progress.fineTuningStart': '開始点',
  'progress.fineTuningEnd': '終了点',
  'progress.window': '{duration}のウィンドウ',

  // Streaming
  'airplay.title': 'AirPlay',
  'airplay.connected': 'AirPlay (接続済み)',
  'cast.title': 'キャスト',
  'cast.connected': 'キャスト (接続済み)',

  // Live stream
  'live.badge': 'ライブ',
  'live.jumpToLive': 'ライブに移動',
  'loop.notAvailableLive': 'ライブ配信ではループ機能は利用できません',

  // Download overlay
  'download.preparing': 'ダウンロードを準備中...',
  'download.ready': 'ダウンロード準備完了',
  'download.readyMessage': 'クリップ ({size}) の準備ができました。ダウンロードしますか？',
  'download.cancel': 'キャンセル',
  'download.download': 'ダウンロード',
  'download.cancelDownload': 'ダウンロードをキャンセル',
  'download.notSupported': 'このブラウザではダウンロードがサポートされていません',
};
