import { KanjoPlayer, HlsPlugin } from 'kanjo-player';
import 'kanjo-player/style.css';
import './styles.css';
import {
  VIDEO_SOURCES,
  NETWORK_STATE_MAP,
  READY_STATE_MAP,
  type VideoState,
  type VideoEvent,
  type CustomEventEntry,
} from './types';

// State
let player: KanjoPlayer | null = null;
let selectedSourceIndex = 0;
let statsInterval: ReturnType<typeof setInterval> | null = null;
const events: VideoEvent[] = [];
const customEvents: CustomEventEntry[] = [];
const maxEvents = 100;
const maxCustomEvents = 50;

// DOM elements
const app = document.getElementById('app')!;

// Format helpers
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeRanges(ranges: TimeRanges): string {
  if (!ranges || ranges.length === 0) return 'none';
  const parts: string[] = [];
  for (let i = 0; i < ranges.length; i++) {
    parts.push(`[${ranges.start(i).toFixed(2)}-${ranges.end(i).toFixed(2)}]`);
  }
  return parts.join(', ');
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions);
}

function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function truncateUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '(none)';
  if (typeof value === 'string') {
    if (value.length > 40) return value.substring(0, 37) + '...';
    return value;
  }
  if (typeof value === 'number') return value.toFixed(2);
  return JSON.stringify(value);
}

function getEventClass(type: string): string {
  if (type.includes('error')) return 'error';
  if (type.includes('waiting') || type.includes('stalled')) return 'warning';
  if (type === 'play' || type === 'playing' || type === 'canplaythrough') return 'success';
  if (type.includes('hls-')) return 'hls';
  if (type === 'source-change') return 'info';
  return '';
}

function getCanPlayStatus(value: string): string {
  if (value === 'probably') return 'success';
  if (value === 'maybe') return 'warning';
  return 'error';
}

// Render functions
function render() {
  app.innerHTML = `
    <div class="app">
      <header>
        <h1>KanjoPlayer Demo</h1>
        <p class="subtitle">Vanilla JS Implementation</p>
      </header>
      <main>
        <div class="video-player-container">
          <div class="controls-bar">
            <label for="source-select">Source:</label>
            <select id="source-select">
              ${VIDEO_SOURCES.map((source, index) =>
                `<option value="${index}" ${index === selectedSourceIndex ? 'selected' : ''}>${source.name}</option>`
              ).join('')}
            </select>
            <span class="source-type ${VIDEO_SOURCES[selectedSourceIndex].type}">${VIDEO_SOURCES[selectedSourceIndex].type.toUpperCase()}</span>
          </div>

          <div id="player-container" class="player-wrapper"></div>

          <div class="shortcuts-panel">
            <h4>Keyboard Shortcuts</h4>
            <div class="shortcuts-grid">
              <div><kbd>Space</kbd> / <kbd>K</kbd> Play/Pause</div>
              <div><kbd>M</kbd> Mute</div>
              <div><kbd>F</kbd> Fullscreen</div>
              <div><kbd>&larr;</kbd> Rewind 10s</div>
              <div><kbd>&rarr;</kbd> Forward 10s</div>
              <div><kbd>&uarr;</kbd> / <kbd>&darr;</kbd> Volume</div>
              <div><kbd>&lt;</kbd> / <kbd>&gt;</kbd> Speed</div>
              <div><kbd>0-9</kbd> Seek to %</div>
              <div><kbd>[</kbd> Set loop start (A)</div>
              <div><kbd>]</kbd> Set loop end (B)</div>
              <div><kbd>\\</kbd> Clear loop</div>
              <div><kbd>L</kbd> Toggle loop</div>
            </div>
          </div>

          <div class="stats-container">
            <div id="stats-panel" class="stats-panel"></div>
            <div id="event-log" class="event-log"></div>
          </div>

          <div id="custom-events-log" class="custom-events-log"></div>
        </div>
      </main>
    </div>
  `;

  // Setup event listeners
  const select = document.getElementById('source-select') as HTMLSelectElement;
  select.addEventListener('change', (e) => {
    selectedSourceIndex = parseInt((e.target as HTMLSelectElement).value);
    changeSource();
  });

  // Initialize player
  initPlayer();
}

function renderStats(state: VideoState) {
  const statsPanel = document.getElementById('stats-panel');
  if (!statsPanel) return;

  statsPanel.innerHTML = `
    <h2>Stats for Nerds</h2>

    <div class="stats-section">
      <h3>Playback</h3>
      <table>
        <tr><td class="stat-label">Current Time</td><td class="stat-value">${formatTime(state.currentTime)} <span class="raw-value">(${state.currentTime.toFixed(3)})</span></td></tr>
        <tr><td class="stat-label">Duration</td><td class="stat-value">${formatTime(state.duration)} <span class="raw-value">(${state.duration.toFixed(3)})</span></td></tr>
        <tr><td class="stat-label">Paused</td><td class="stat-value ${state.paused ? 'warning' : 'success'}">${state.paused ? 'Yes' : 'No'}</td></tr>
        <tr><td class="stat-label">Ended</td><td class="stat-value ${state.ended ? 'warning' : ''}">${state.ended ? 'Yes' : 'No'}</td></tr>
        <tr><td class="stat-label">Seeking</td><td class="stat-value ${state.seeking ? 'warning' : ''}">${state.seeking ? 'Yes' : 'No'}</td></tr>
        <tr><td class="stat-label">Playback Rate</td><td class="stat-value">${state.playbackRate}x</td></tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Buffering</h3>
      <table>
        <tr><td class="stat-label">Buffered</td><td class="stat-value mono">${state.buffered}</td></tr>
        <tr><td class="stat-label">Seekable</td><td class="stat-value mono">${state.seekable}</td></tr>
        <tr><td class="stat-label">Played</td><td class="stat-value mono">${state.played}</td></tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Volume</h3>
      <table>
        <tr><td class="stat-label">Volume</td><td class="stat-value">${formatPercentage(state.volume)}</td></tr>
        <tr><td class="stat-label">Muted</td><td class="stat-value ${state.muted ? 'warning' : ''}">${state.muted ? 'Yes' : 'No'}</td></tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Dimensions</h3>
      <table>
        <tr><td class="stat-label">Video Width</td><td class="stat-value">${state.videoWidth}px</td></tr>
        <tr><td class="stat-label">Video Height</td><td class="stat-value">${state.videoHeight}px</td></tr>
        <tr><td class="stat-label">Aspect Ratio</td><td class="stat-value">${state.videoWidth && state.videoHeight ? (state.videoWidth / state.videoHeight).toFixed(3) : 'N/A'}</td></tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Network</h3>
      <table>
        <tr><td class="stat-label">Network State</td><td class="stat-value">${state.networkStateText} <span class="raw-value">(${state.networkState})</span></td></tr>
        <tr><td class="stat-label">Ready State</td><td class="stat-value">${state.readyStateText} <span class="raw-value">(${state.readyState})</span></td></tr>
        <tr><td class="stat-label">Current Src</td><td class="stat-value" title="${state.currentSrc}">${state.currentSrc ? truncateUrl(state.currentSrc) : 'none'}</td></tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Configuration</h3>
      <table>
        <tr><td class="stat-label">Autoplay</td><td class="stat-value">${state.autoplay ? 'Yes' : 'No'}</td></tr>
        <tr><td class="stat-label">Controls</td><td class="stat-value">${state.controls ? 'Yes' : 'No'}</td></tr>
        <tr><td class="stat-label">Loop</td><td class="stat-value">${state.loop ? 'Yes' : 'No'}</td></tr>
        <tr><td class="stat-label">Preload</td><td class="stat-value">${state.preload}</td></tr>
        <tr><td class="stat-label">Cross Origin</td><td class="stat-value">${state.crossOrigin || 'null'}</td></tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Capabilities</h3>
      <table>
        <tr><td class="stat-label">Can Play MP4</td><td class="stat-value ${getCanPlayStatus(state.canPlayType_mp4)}">${state.canPlayType_mp4 || 'no'}</td></tr>
        <tr><td class="stat-label">Can Play WebM</td><td class="stat-value ${getCanPlayStatus(state.canPlayType_webm)}">${state.canPlayType_webm || 'no'}</td></tr>
        <tr><td class="stat-label">Can Play HLS</td><td class="stat-value ${getCanPlayStatus(state.canPlayType_hls)}">${state.canPlayType_hls || 'no'}</td></tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Error</h3>
      <table>
        <tr><td class="stat-label">Error</td><td class="stat-value ${state.error ? 'error' : 'success'}">${state.error || 'none'}</td></tr>
      </table>
    </div>
  `;
}

function renderEventLog() {
  const eventLog = document.getElementById('event-log');
  if (!eventLog) return;

  const counts: Record<string, number> = {};
  events.forEach((e) => {
    counts[e.type] = (counts[e.type] || 0) + 1;
  });
  const eventCounts = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  eventLog.innerHTML = `
    <div class="log-header">
      <h2>Event Log</h2>
      <div class="log-actions">
        <span class="event-count">${events.length} events</span>
        <button class="clear-btn" id="clear-events">Clear</button>
      </div>
    </div>

    <div class="event-summary">
      ${eventCounts.map(([type, count]) =>
        `<span class="event-badge ${getEventClass(type)}">${type}: ${count}</span>`
      ).join('')}
    </div>

    <div class="log-entries">
      ${events.length === 0
        ? '<div class="no-events">No events recorded yet. Interact with the player to see events.</div>'
        : events.map((event) => `
          <div class="log-entry ${getEventClass(event.type)}">
            <span class="timestamp">${formatTimestamp(event.timestamp)}</span>
            <span class="event-type">${event.type}</span>
            ${event.detail ? `<span class="event-detail">${event.detail}</span>` : ''}
          </div>
        `).join('')
      }
    </div>
  `;

  const clearBtn = document.getElementById('clear-events');
  clearBtn?.addEventListener('click', () => {
    events.length = 0;
    renderEventLog();
  });
}

function renderCustomEventsLog() {
  const customEventsLog = document.getElementById('custom-events-log');
  if (!customEventsLog) return;

  customEventsLog.innerHTML = `
    <div class="log-header">
      <h3>Custom Events Log</h3>
      <div class="log-actions">
        <span class="event-count">${customEvents.length} events</span>
        <button class="clear-btn" id="clear-custom-events">Clear</button>
      </div>
    </div>
    <div class="log-entries">
      ${customEvents.length === 0
        ? '<div class="no-events">No custom events yet. Click a custom button to see events.</div>'
        : customEvents.map((event) => `
          <div class="log-entry">
            <span class="timestamp">${formatTimestamp(event.timestamp)}</span>
            <span class="event-key">${event.eventKey}</span>
            <span class="event-value" title="${String(event.value)}">${formatValue(event.value)}</span>
          </div>
        `).join('')
      }
    </div>
  `;

  const clearBtn = document.getElementById('clear-custom-events');
  clearBtn?.addEventListener('click', () => {
    customEvents.length = 0;
    renderCustomEventsLog();
  });
}

function updateVideoState() {
  if (!player) return;

  const video = player.getVideoElement();
  const state: VideoState = {
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
  };

  renderStats(state);
}

function logEvent(type: string, detail?: unknown) {
  events.unshift({
    timestamp: Date.now(),
    type,
    detail: detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : undefined,
  });
  if (events.length > maxEvents) {
    events.pop();
  }
  renderEventLog();
}

function handleCustomEvent(e: Event) {
  const detail = (e as CustomEvent).detail;
  customEvents.unshift({
    timestamp: Date.now(),
    buttonId: detail.buttonId,
    eventKey: detail.eventKey,
    value: detail.value,
  });
  if (customEvents.length > maxCustomEvents) {
    customEvents.pop();
  }
  renderCustomEventsLog();

  // Handle dark/light mode
  if (detail.eventKey === 'set_dark_mode') {
    document.documentElement.classList.add('dark-mode');
  } else if (detail.eventKey === 'set_light_mode') {
    document.documentElement.classList.remove('dark-mode');
  }
}

function initPlayer() {
  const container = document.getElementById('player-container');
  if (!container) return;

  // Destroy existing player
  if (player) {
    player.destroy();
  }

  // Clear stats interval
  if (statsInterval) {
    clearInterval(statsInterval);
  }

  const source = VIDEO_SOURCES[selectedSourceIndex];

  // Create new player
  player = new KanjoPlayer({
    container,
    src: source.url,
    sourceType: source.type,
    controls: true,
    theme: 'dark',
    autoplay: false,
    muted: false,
    thumbnails: { enabled: true },
    plugins: [new HlsPlugin()],
    customButtons: {
      enabled: true,
      buttons: [
        {
          id: 'light-mode',
          iconClass: 'hero-sun-solid',
          displayMode: 'icon',
          eventKey: 'set_light_mode',
          tooltip: 'Turn on the lights',
        },
        {
          id: 'dark-mode',
          iconClass: 'hero-moon-solid',
          displayMode: 'icon',
          eventKey: 'set_dark_mode',
          tooltip: 'Turn off the lights',
        },
        {
          id: 'bookmark',
          iconClass: 'hero-bookmark-solid',
          displayMode: 'icon',
          eventKey: 'bookmark_movie',
          eventValue: 'src',
          tooltip: 'Bookmark this video',
        },
        {
          id: 'share-time',
          iconClass: 'hero-share-solid',
          text: 'Share',
          displayMode: 'icon-text',
          eventKey: 'share_at_time',
          eventValue: 'currentTime',
          tooltip: 'Share at current time',
        },
      ],
    },
  });

  // Bind events
  const eventTypes = [
    'play', 'pause', 'ended', 'seeking', 'seeked',
    'volumechange', 'ratechange', 'fullscreenchange',
    'loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
    'waiting', 'playing', 'progress', 'error',
    'enterpictureinpicture', 'leavepictureinpicture',
    'hlsmanifestparsed', 'hlslevelswitch', 'hlserror',
  ] as const;

  const currentPlayer = player;
  eventTypes.forEach((eventType) => {
    currentPlayer!.on(eventType as Parameters<typeof currentPlayer.on>[0], (data: unknown) => {
      logEvent(eventType, data);
    });
  });

  // Update stats every 250ms
  statsInterval = setInterval(updateVideoState, 250);
  updateVideoState();

  logEvent('source-change', `Loading: ${source.name}`);
}

function changeSource() {
  const source = VIDEO_SOURCES[selectedSourceIndex];

  // Update the source type badge
  const sourceTypeSpan = document.querySelector('.source-type');
  if (sourceTypeSpan) {
    sourceTypeSpan.className = `source-type ${source.type}`;
    sourceTypeSpan.textContent = source.type.toUpperCase();
  }

  if (player) {
    player.setSrc(source.url, source.type);
    logEvent('source-change', `Loading: ${source.name}`);
  }
}

// Custom events listener
document.addEventListener('kanjo-custom-event', handleCustomEvent);

// Initialize app
render();
