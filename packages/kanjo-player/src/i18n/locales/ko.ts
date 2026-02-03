/**
 * Korean locale
 */

import type { LocaleStrings } from '../types';

export const ko: LocaleStrings = {
  // Play/Pause controls
  'play.tooltip': '재생 (스페이스)',
  'play.ariaLabel': '재생',
  'pause.tooltip': '일시정지 (스페이스)',
  'pause.ariaLabel': '일시정지',
  'replay.ariaLabel': '다시 재생',

  // Volume controls
  'volume.mute': '음소거 (M)',
  'volume.unmute': '음소거 해제 (M)',
  'volume.ariaLabel': '음량',

  // Fullscreen controls
  'fullscreen.enter': '전체화면 (F)',
  'fullscreen.exit': '전체화면 종료 (F)',

  // Settings menu
  'settings.title': '설정',
  'settings.playbackSpeed': '재생 속도',
  'settings.normal': '보통',
  'settings.pip': 'PIP 모드',
  'settings.download': '다운로드',
  'settings.adjustments': '비디오 조정',

  // Video adjustments panel
  'adjustments.title': '비디오 조정',
  'adjustments.brightness': '밝기',
  'adjustments.contrast': '대비',
  'adjustments.saturation': '채도',
  'adjustments.gamma': '감마',
  'adjustments.hue': '색조',
  'adjustments.resetAll': '모두 초기화',
  'adjustments.reset': '{name} 초기화',
  'adjustments.close': '닫기',

  // Skip controls
  'skip.back': '{duration}초 뒤로',
  'skip.forward': '{duration}초 앞으로',

  // A/B Loop controls
  'loop.setStart': '클립 시작점 설정',
  'loop.setEnd': '클립 종료점 설정',
  'loop.startAt': '구간 시작: {time} (클릭하여 업데이트)',
  'loop.endAt': '구간 종료: {time} (클릭하여 업데이트)',
  'loop.toggle': 'A/B 구간 반복 전환',
  'loop.enable': 'A/B 구간 반복 활성화',
  'loop.disable': 'A/B 구간 반복 비활성화',
  'loop.setPointsFirst': '먼저 A와 B 지점을 설정하세요',
  'loop.downloadClip': '클립 다운로드',
  'loop.downloadDuration': '{duration}초 클립 다운로드',
  'loop.clearMarkers': '마커 지우기',
  'loop.clearTitle': '구간 지점 지우기',
  'loop.noMarkers': '지울 마커가 없습니다',
  'loop.tooLong': '클립이 너무 깁니다 ({duration}초). 최대: {max}초',
  'loop.setPointsToDownload': '다운로드하려면 A와 B 지점을 설정하세요',
  'loop.markerDragStart': '클립 시작 (드래그하여 이동)',
  'loop.markerDragEnd': '클립 종료 (드래그하여 이동)',

  // Progress bar
  'progress.ariaLabel': '비디오 진행률',
  'progress.fineTuning': '미세 조정',
  'progress.fineTuningStart': '시작 지점',
  'progress.fineTuningEnd': '종료 지점',
  'progress.window': '{duration} 구간',

  // Streaming
  'airplay.title': 'AirPlay',
  'airplay.connected': 'AirPlay (연결됨)',
  'cast.title': '전송',
  'cast.connected': '전송 (연결됨)',

  // Live stream
  'live.badge': '실시간',
  'live.jumpToLive': '실시간으로 이동',
  'loop.notAvailableLive': '라이브 스트림에서는 구간 반복을 사용할 수 없습니다',

  // Download overlay
  'download.preparing': '다운로드 준비 중...',
  'download.ready': '다운로드 준비 완료',
  'download.readyMessage': '클립({size})이 준비되었습니다. 다운로드하시겠습니까?',
  'download.cancel': '취소',
  'download.download': '다운로드',
  'download.cancelDownload': '다운로드 취소',
  'download.notSupported': '이 브라우저에서는 다운로드가 지원되지 않습니다',
};
