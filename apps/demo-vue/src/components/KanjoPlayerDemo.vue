<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { KanjoPlayer, HlsPlugin, DashPlugin, CodecCapabilities } from 'kanjo-player';
import 'kanjo-player/style.css';
import StatsPanel from './StatsPanel.vue';
import EventLog from './EventLog.vue';
import CustomEventsLog from './CustomEventsLog.vue';
import {
  type VideoSource,
  type VideoState,
  type VideoEvent,
  NETWORK_STATE_MAP,
  READY_STATE_MAP,
} from '../types/video-stats';

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
  // DASH Sources
  {
    name: 'Big Buck Bunny (DASH)',
    url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
    type: 'dash',
  },
  {
    name: 'Sintel (DASH)',
    url: 'https://bitmovin-a.akamaihd.net/content/sintel/sintel.mpd',
    type: 'dash',
  },
  {
    name: 'Tears of Steel (DASH)',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.mpd',
    type: 'dash',
  },
  {
    name: 'Elephants Dream (DASH)',
    url: 'https://rdmedia.bbc.co.uk/elephants_dream/1/client_manifest-all.mpd',
    type: 'dash',
  },
  // MP4 Sources (H.264)
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
  // WebM Sources (VP9)
  {
    name: 'Big Buck Bunny (WebM/VP9)',
    url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.720p.vp9.webm',
    type: 'webm',
  },
  {
    name: 'Sintel Trailer (WebM/VP9)',
    url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/5/52/Sintel_%28Original_Version%29.webm/Sintel_%28Original_Version%29.webm.720p.vp9.webm',
    type: 'webm',
  },
  // DASH VP9 Sources
  {
    name: 'Tears of Steel (DASH/VP9)',
    url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
    type: 'dash',
  },
  // DASH AV1 Sources
  {
    name: 'Big Buck Bunny (DASH/AV1)',
    url: 'https://storage.googleapis.com/shaka-demo-assets/bbb-dark-truths-hls/dash.mpd',
    type: 'dash',
  },
  {
    name: 'Sintel (DASH/AV1)',
    url: 'https://storage.googleapis.com/shaka-demo-assets/sintel/dash.mpd',
    type: 'dash',
  },
];

const containerRef = ref<HTMLDivElement | null>(null);
const player = ref<KanjoPlayer | null>(null);
const selectedSourceIndex = ref(0);
const selectedSource = ref(VIDEO_SOURCES[0]);
const isCodeExpanded = ref(false);

const playerCode = `player.value = new KanjoPlayer({
  container: containerRef.value,
  src: selectedSource.value.url,
  sourceType: selectedSource.value.type,
  controls: true,
  theme: 'dark',
  autoplay: false,
  muted: false,
  thumbnails: { enabled: true },
  skipControls: { enabled: true },
  airPlay: { enabled: true },
  cast: { enabled: true },
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
});`;

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
  codec_h264: false,
  codec_h265: false,
  codec_vp9: false,
  codec_av1: false,
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
    codec_h264: CodecCapabilities.isSupported('h264', 'mp4'),
    codec_h265: CodecCapabilities.isSupported('h265', 'mp4'),
    codec_vp9: CodecCapabilities.isSupported('vp9', 'webm'),
    codec_av1: CodecCapabilities.isSupported('av1', 'mp4'),
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
  player.value = new KanjoPlayer({
    container: containerRef.value,
    src: selectedSource.value.url,
    sourceType: selectedSource.value.type,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    player.value!.on(eventType as any, (data: unknown) => {
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
      <label for="kanjo-source-select">Source:</label>
      <select id="kanjo-source-select" v-model="selectedSourceIndex">
        <option v-for="(source, index) in VIDEO_SOURCES" :key="source.url" :value="index">
          {{ source.name }}
        </option>
      </select>
      <span class="source-type" :class="selectedSource.type">{{
        selectedSource.type.toUpperCase()
      }}</span>
    </div>

    <!-- Collapsible Code Block -->
    <div class="code-block-panel">
      <button class="code-block-toggle" @click="isCodeExpanded = !isCodeExpanded">
        <span class="toggle-icon" :class="{ expanded: isCodeExpanded }">&#9658;</span>
        <span>Code Example</span>
      </button>
      <div class="code-block-content" :class="{ expanded: isCodeExpanded }">
        <div class="terminal">
          <pre><code>{{ playerCode }}</code></pre>
        </div>
      </div>
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

    <!-- Custom Events Log -->
    <CustomEventsLog />
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

.source-type.dash {
  background: #fef3c7;
  color: #d97706;
}

/* Collapsible Code Block */
.code-block-panel {
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
}

.code-block-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 15px;
  background: transparent;
  border: none;
  color: var(--accent);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.code-block-toggle:hover {
  background: var(--bg-tertiary);
}

.toggle-icon {
  display: inline-block;
  font-size: 0.7rem;
  transition: transform 0.2s ease;
}

.toggle-icon.expanded {
  transform: rotate(90deg);
}

.code-block-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.code-block-content.expanded {
  max-height: 600px;
}

.code-block-content pre {
  margin: 0;
  padding: 0;
  background: transparent;
}

.code-block-content code {
  display: block;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  white-space: pre;
}

/* Terminal styling */
.terminal {
  background: #0d0d0d;
  border-radius: 6px;
  margin: 12px;
  padding: 15px;
  height: calc(20 * 1.4 * 0.8rem + 30px);
  overflow-y: auto;
  overflow-x: auto;
}

.terminal code {
  color: #e0e0e0;
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
