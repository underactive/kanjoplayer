import { useState, useEffect, useRef, useCallback } from 'react';
import { KanjoPlayer, HlsPlugin, DashPlugin, CodecCapabilities, locales } from 'kanjo-player';
import 'kanjo-player/style.css';
import StatsPanel from './StatsPanel';
import EventLog from './EventLog';
import CustomEventsLog from './CustomEventsLog';
import {
  VIDEO_SOURCES,
  NETWORK_STATE_MAP,
  READY_STATE_MAP,
  type VideoState,
  type VideoEvent,
} from '../types';

function formatTimeRanges(ranges: TimeRanges): string {
  if (!ranges || ranges.length === 0) return 'none';
  const parts: string[] = [];
  for (let i = 0; i < ranges.length; i++) {
    parts.push(`[${ranges.start(i).toFixed(2)}-${ranges.end(i).toFixed(2)}]`);
  }
  return parts.join(', ');
}

const initialVideoState: VideoState = {
  currentTime: 0,
  duration: 0,
  paused: true,
  ended: false,
  seeking: false,
  buffered: '',
  seekable: '',
  volume: 1,
  muted: false,
  videoWidth: 0,
  videoHeight: 0,
  networkState: 0,
  networkStateText: 'NETWORK_EMPTY',
  readyState: 0,
  readyStateText: 'HAVE_NOTHING',
  playbackRate: 1,
  defaultPlaybackRate: 1,
  currentSrc: '',
  src: '',
  played: '',
  error: null,
  autoplay: false,
  controls: true,
  loop: false,
  preload: 'auto',
  crossOrigin: null,
  canPlayType_mp4: '',
  canPlayType_webm: '',
  canPlayType_hls: '',
  codec_h264: false,
  codec_h265: false,
  codec_vp9: false,
  codec_av1: false,
};

function KanjoPlayerDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<KanjoPlayer | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [videoState, setVideoState] = useState<VideoState>(initialVideoState);
  const [events, setEvents] = useState<VideoEvent[]>([]);

  const selectedSource = VIDEO_SOURCES[selectedSourceIndex];
  const maxEvents = 100;

  const logEvent = useCallback((type: string, detail?: unknown) => {
    setEvents((prev) => {
      const newEvent: VideoEvent = {
        timestamp: Date.now(),
        type,
        detail: detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : undefined,
      };
      const updated = [newEvent, ...prev];
      if (updated.length > maxEvents) {
        updated.pop();
      }
      return updated;
    });
  }, []);

  const updateVideoState = useCallback(() => {
    if (!playerRef.current) return;

    const video = playerRef.current.getVideoElement();
    setVideoState({
      currentTime: video.currentTime,
      duration: video.duration || 0,
      paused: video.paused,
      ended: video.ended,
      seeking: video.seeking,
      buffered: formatTimeRanges(video.buffered),
      seekable: formatTimeRanges(video.seekable),
      volume: video.volume,
      muted: video.muted,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      networkState: video.networkState,
      networkStateText: NETWORK_STATE_MAP[video.networkState] || 'UNKNOWN',
      readyState: video.readyState,
      readyStateText: READY_STATE_MAP[video.readyState] || 'UNKNOWN',
      playbackRate: video.playbackRate,
      defaultPlaybackRate: video.defaultPlaybackRate,
      currentSrc: video.currentSrc,
      src: video.src,
      played: formatTimeRanges(video.played),
      error: video.error ? `${video.error.code}: ${video.error.message}` : null,
      autoplay: video.autoplay,
      controls: video.controls,
      loop: video.loop,
      preload: video.preload,
      crossOrigin: video.crossOrigin,
      canPlayType_mp4: video.canPlayType('video/mp4'),
      canPlayType_webm: video.canPlayType('video/webm'),
      canPlayType_hls: video.canPlayType('application/vnd.apple.mpegurl'),
      codec_h264: CodecCapabilities.isSupported('h264', 'mp4'),
      codec_h265: CodecCapabilities.isSupported('h265', 'mp4'),
      codec_vp9: CodecCapabilities.isSupported('vp9', 'webm'),
      codec_av1: CodecCapabilities.isSupported('av1', 'mp4'),
    });
  }, []);

  const initPlayer = useCallback(() => {
    if (!containerRef.current) return;

    // Destroy existing player
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    // Clear stats interval
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    const source = VIDEO_SOURCES[selectedSourceIndex];

    // Create new player
    playerRef.current = new KanjoPlayer({
      container: containerRef.current,
      src: source.url,
      sourceType: source.type,
      controls: true,
      theme: 'dark',
      autoplay: false,
      muted: false,
      thumbnails: { enabled: true },
      skipControls: { enabled: true },
      airPlay: { enabled: true },
      cast: { enabled: true },
      plugins: [new HlsPlugin(), new DashPlugin()],
      customButtons: {
        enabled: true,
        buttons: [
          {
            id: 'light-mode',
            iconClass: 'hero-sun-solid',
            displayMode: 'icon',
            eventKey: 'set_light_mode',
            tooltip: {
              en: 'Turn on the lights',
              es: 'Encender las luces',
              fr: 'Allumer les lumières',
              de: 'Licht einschalten',
              ja: 'ライトをオンにする',
              zh: '开灯',
              zhTW: '開燈',
              ko: '불 켜기',
            },
          },
          {
            id: 'dark-mode',
            iconClass: 'hero-moon-solid',
            displayMode: 'icon',
            eventKey: 'set_dark_mode',
            tooltip: {
              en: 'Turn off the lights',
              es: 'Apagar las luces',
              fr: 'Éteindre les lumières',
              de: 'Licht ausschalten',
              ja: 'ライトをオフにする',
              zh: '关灯',
              zhTW: '關燈',
              ko: '불 끄기',
            },
          },
          {
            id: 'bookmark',
            iconClass: 'hero-bookmark-solid',
            displayMode: 'icon',
            eventKey: 'bookmark_movie',
            eventValue: 'src',
            tooltip: {
              en: 'Bookmark this video',
              es: 'Marcar este video',
              fr: 'Ajouter aux favoris',
              de: 'Video merken',
              ja: 'この動画をブックマーク',
              zh: '收藏此视频',
              zhTW: '收藏此影片',
              ko: '이 동영상 북마크',
            },
          },
          {
            id: 'share-time',
            iconClass: 'hero-share-solid',
            text: {
              en: 'Share',
              es: 'Compartir',
              fr: 'Partager',
              de: 'Teilen',
              ja: '共有',
              zh: '分享',
              zhTW: '分享',
              ko: '공유',
            },
            displayMode: 'icon-text',
            eventKey: 'share_at_time',
            eventValue: 'currentTime',
            tooltip: {
              en: 'Share at current time',
              es: 'Compartir en el tiempo actual',
              fr: 'Partager au temps actuel',
              de: 'Zum aktuellen Zeitpunkt teilen',
              ja: '現在の時間で共有',
              zh: '在当前时间分享',
              zhTW: '在目前時間分享',
              ko: '현재 시간에서 공유',
            },
          },
        ],
      },
    });

    // Bind events
    const eventTypes = [
      'play',
      'pause',
      'ended',
      'seeking',
      'seeked',
      'volumechange',
      'ratechange',
      'fullscreenchange',
      'loadstart',
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'canplaythrough',
      'waiting',
      'playing',
      'progress',
      'error',
      'enterpictureinpicture',
      'leavepictureinpicture',
      'hlsmanifestparsed',
      'hlslevelswitch',
      'hlserror',
      'dashmanifestparsed',
      'dashqualitychanged',
      'dasherror',
    ] as const;

    eventTypes.forEach((eventType) => {
      playerRef.current!.on(
        eventType as Parameters<typeof playerRef.current.on>[0],
        (data: unknown) => {
          logEvent(eventType, data);
        }
      );
    });

    // Update stats every 250ms
    statsIntervalRef.current = setInterval(updateVideoState, 250);
    updateVideoState();

    logEvent('source-change', `Loading: ${source.name}`);
  }, [selectedSourceIndex, logEvent, updateVideoState]);

  // Initialize player on mount
  useEffect(() => {
    initPlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  // Handle source change
  const handleSourceChange = useCallback(
    (index: number) => {
      setSelectedSourceIndex(index);
      const source = VIDEO_SOURCES[index];
      if (playerRef.current) {
        playerRef.current.setSrc(source.url, source.type);
        logEvent('source-change', `Loading: ${source.name}`);
      }
    },
    [logEvent]
  );

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const handleLanguageChange = useCallback((lang: string) => {
    setSelectedLanguage(lang);
    const locale = locales[lang as keyof typeof locales];
    if (playerRef.current && locale) {
      playerRef.current.locale.update(locale, lang);
    }
  }, []);

  return (
    <div className="video-player-container">
      <div className="controls-bar">
        <label htmlFor="source-select">Source:</label>
        <select
          id="source-select"
          value={selectedSourceIndex}
          onChange={(e) => handleSourceChange(parseInt(e.target.value))}
        >
          {VIDEO_SOURCES.map((source, index) => (
            <option key={source.url} value={index}>
              {source.name}
            </option>
          ))}
        </select>
        <span className={`source-type ${selectedSource.type}`}>
          {selectedSource.type.toUpperCase()}
        </span>
        <div className="language-selector">
          <label htmlFor="language-select">Player Language:</label>
          <select
            id="language-select"
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ja">日本語</option>
            <option value="zh">简体中文</option>
            <option value="zhTW">繁體中文</option>
            <option value="ko">한국어</option>
          </select>
        </div>
      </div>

      <div ref={containerRef} className="player-wrapper"></div>

      <div className="shortcuts-panel">
        <h4>Keyboard Shortcuts</h4>
        <div className="shortcuts-grid">
          <div>
            <kbd>Space</kbd> / <kbd>K</kbd> Play/Pause
          </div>
          <div>
            <kbd>M</kbd> Mute
          </div>
          <div>
            <kbd>F</kbd> Fullscreen
          </div>
          <div>
            <kbd>&larr;</kbd> Rewind 10s
          </div>
          <div>
            <kbd>&rarr;</kbd> Forward 10s
          </div>
          <div>
            <kbd>&uarr;</kbd> / <kbd>&darr;</kbd> Volume
          </div>
          <div>
            <kbd>&lt;</kbd> / <kbd>&gt;</kbd> Speed
          </div>
          <div>
            <kbd>0-9</kbd> Seek to %
          </div>
          <div>
            <kbd>[</kbd> Set loop start (A)
          </div>
          <div>
            <kbd>]</kbd> Set loop end (B)
          </div>
          <div>
            <kbd>\</kbd> Clear loop
          </div>
          <div>
            <kbd>L</kbd> Toggle loop
          </div>
        </div>
      </div>

      <div className="stats-container">
        <StatsPanel state={videoState} />
        <EventLog events={events} onClear={clearEvents} />
      </div>

      <CustomEventsLog />
    </div>
  );
}

export default KanjoPlayerDemo;
