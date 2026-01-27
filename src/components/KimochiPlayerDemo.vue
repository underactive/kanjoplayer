<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { KimochiPlayer } from '../lib/core/KimochiPlayer';
import { HlsPlugin } from '../lib/plugins/built-in/HlsPlugin';
import StatsPanel from './StatsPanel.vue';
import EventLog from './EventLog.vue';
import {
  type VideoSource,
  type VideoState,
  type VideoEvent,
  NETWORK_STATE_MAP,
  READY_STATE_MAP,
} from '../types/video-stats';

// Import styles
import '../lib/styles/kimochi-player.css';

const VIDEO_SOURCES: VideoSource[] = [
  // HLS Sources
  {
    name: 'Big Buck Bunny (HLS)',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    type: 'hls',
  },
  {
    name: 'Sintel (HLS)',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    type: 'hls',
  },
  {
    name: 'Tears of Steel (HLS)',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    type: 'hls',
  },
  {
    name: 'Cosmos Laundromat (HLS)',
    url: 'https://bitmovin-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
    type: 'hls',
  },
  {
    name: 'Apple HLS Test (HLS)',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    type: 'hls',
  },
  // MP4 Sources
  {
    name: 'Big Buck Bunny (MP4)',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'mp4',
  },
  {
    name: 'Sintel (MP4)',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    type: 'mp4',
  },
  {
    name: 'Tears of Steel (MP4)',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    type: 'mp4',
  },
];

const containerRef = ref<HTMLDivElement | null>(null);
const player = ref<KimochiPlayer | null>(null);
const selectedSourceIndex = ref(0);
const selectedSource = ref(VIDEO_SOURCES[0]);

const videoState = ref<VideoState>({
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
});

const events = ref<VideoEvent[]>([]);
const maxEvents = 100;
let statsInterval: ReturnType<typeof setInterval> | null = null;

function formatTimeRanges(ranges: TimeRanges): string {
  if (!ranges || ranges.length === 0) return 'none';
  const parts: string[] = [];
  for (let i = 0; i < ranges.length; i++) {
    parts.push(`[${ranges.start(i).toFixed(2)}-${ranges.end(i).toFixed(2)}]`);
  }
  return parts.join(', ');
}

function updateVideoState() {
  if (!player.value) return;

  const video = player.value.getVideoElement();

  videoState.value = {
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
}

function logEvent(type: string, detail?: unknown) {
  events.value.unshift({
    timestamp: Date.now(),
    type,
    detail: detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : undefined,
  });
  if (events.value.length > maxEvents) {
    events.value.pop();
  }
}

function clearEvents() {
  events.value = [];
}

function initPlayer() {
  if (!containerRef.value) return;

  // Destroy existing player
  if (player.value) {
    player.value.destroy();
  }

  // Clear stats interval
  if (statsInterval) {
    clearInterval(statsInterval);
  }

  // Create new player
  player.value = new KimochiPlayer({
    container: containerRef.value,
    src: selectedSource.value.url,
    sourceType: selectedSource.value.type,
    controls: true,
    theme: 'dark',
    autoplay: false,
    muted: false,
    thumbnails: { enabled: true },
    plugins: [new HlsPlugin()],
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

  eventTypes.forEach((eventType) => {
    player.value!.on(eventType as any, (data: any) => {
      logEvent(eventType, data);
    });
  });

  // Update stats every 250ms
  statsInterval = setInterval(updateVideoState, 250);
  updateVideoState();

  logEvent('source-change', `Loading: ${selectedSource.value.name}`);
}

function changeSource() {
  selectedSource.value = VIDEO_SOURCES[selectedSourceIndex.value];
  if (player.value) {
    player.value.setSrc(selectedSource.value.url, selectedSource.value.type);
    logEvent('source-change', `Loading: ${selectedSource.value.name}`);
  }
}

watch(selectedSourceIndex, changeSource);

onMounted(() => {
  initPlayer();
});

onUnmounted(() => {
  if (player.value) {
    player.value.destroy();
  }
  if (statsInterval) {
    clearInterval(statsInterval);
  }
});
</script>

<template>
  <div class="video-player-container">
    <div class="controls-bar">
      <label for="kimochi-source-select">Source:</label>
      <select id="kimochi-source-select" v-model="selectedSourceIndex">
        <option v-for="(source, index) in VIDEO_SOURCES" :key="source.url" :value="index">
          {{ source.name }}
        </option>
      </select>
      <span class="source-type" :class="selectedSource.type">{{ selectedSource.type.toUpperCase() }}</span>
    </div>

    <div ref="containerRef" class="player-wrapper"></div>

    <!-- Keyboard Shortcuts -->
    <div class="shortcuts-panel">
      <h4>Keyboard Shortcuts</h4>
      <div class="shortcuts-grid">
        <div><kbd>Space</kbd> / <kbd>K</kbd> Play/Pause</div>
        <div><kbd>M</kbd> Mute</div>
        <div><kbd>F</kbd> Fullscreen</div>
        <div><kbd>←</kbd> Rewind 10s</div>
        <div><kbd>→</kbd> Forward 10s</div>
        <div><kbd>↑</kbd> / <kbd>↓</kbd> Volume</div>
        <div><kbd>&lt;</kbd> / <kbd>&gt;</kbd> Speed</div>
        <div><kbd>0-9</kbd> Seek to %</div>
        <div><kbd>[</kbd> Set loop start (A)</div>
        <div><kbd>]</kbd> Set loop end (B)</div>
        <div><kbd>\</kbd> Clear loop</div>
        <div><kbd>L</kbd> Toggle loop</div>
      </div>
    </div>

    <div class="stats-container">
      <StatsPanel :state="videoState" />
      <EventLog :events="events" @clear="clearEvents" />
    </div>
  </div>
</template>

<style scoped>
.video-player-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.controls-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.controls-bar label {
  font-weight: 500;
  color: var(--text-secondary);
}

.controls-bar select {
  flex: 1;
  max-width: 400px;
  padding: 10px 15px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.95rem;
  cursor: pointer;
}

.controls-bar select:focus {
  outline: none;
  border-color: var(--accent);
}

.source-type {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.source-type.mp4 {
  background: var(--accent-secondary);
  color: var(--accent);
}

.source-type.hls {
  background: #d1fae5;
  color: #047857;
}

.source-type.webm {
  background: #ede9fe;
  color: #6d28d9;
}

.player-wrapper {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  max-height: 500px;
}

.shortcuts-panel {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 15px 20px;
  border: 1px solid var(--border);
}

.shortcuts-panel h4 {
  font-size: 0.9rem;
  margin-bottom: 10px;
  color: var(--text-secondary);
}

.shortcuts-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  font-size: 0.85rem;
}

.shortcuts-grid kbd {
  display: inline-block;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8rem;
}

.stats-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 900px) {
  .stats-container {
    grid-template-columns: 1fr;
  }
}
</style>
