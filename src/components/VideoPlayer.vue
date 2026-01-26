<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import Hls from 'hls.js'
import StatsPanel from './StatsPanel.vue'
import EventLog from './EventLog.vue'
import {
  type VideoSource,
  type VideoState,
  type VideoEvent,
  VIDEO_EVENTS,
  NETWORK_STATE_MAP,
  READY_STATE_MAP,
} from '../types/video-stats'

const VIDEO_SOURCES: VideoSource[] = [
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
    name: 'Elephants Dream (HLS)',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/elephants-dream/elephants-dream.ism/.m3u8',
    type: 'hls',
  },
  // WebM Source
  {
    name: 'Sintel (WebM)',
    url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/f/f1/Sintel_movie_4K.webm/Sintel_movie_4K.webm.720p.webm',
    type: 'webm',
  },
]

const videoRef = ref<HTMLVideoElement | null>(null)
const selectedSourceIndex = ref(0)
const hlsInstance = ref<Hls | null>(null)

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
})

const events = ref<VideoEvent[]>([])
const maxEvents = 100

const selectedSource = computed(() => VIDEO_SOURCES[selectedSourceIndex.value])

function formatTimeRanges(ranges: TimeRanges): string {
  if (!ranges || ranges.length === 0) return 'none'
  const parts: string[] = []
  for (let i = 0; i < ranges.length; i++) {
    parts.push(`[${ranges.start(i).toFixed(2)}-${ranges.end(i).toFixed(2)}]`)
  }
  return parts.join(', ')
}

function updateVideoState() {
  const video = videoRef.value
  if (!video) return

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
  }
}

function logEvent(type: string, detail?: string) {
  events.value.unshift({
    timestamp: Date.now(),
    type,
    detail,
  })
  if (events.value.length > maxEvents) {
    events.value.pop()
  }
}

function setupEventListeners() {
  const video = videoRef.value
  if (!video) return

  VIDEO_EVENTS.forEach((eventType) => {
    video.addEventListener(eventType, () => {
      updateVideoState()
      logEvent(eventType)
    })
  })
}

function destroyHls() {
  if (hlsInstance.value) {
    hlsInstance.value.destroy()
    hlsInstance.value = null
  }
}

function loadSource(source: VideoSource) {
  const video = videoRef.value
  if (!video) return

  destroyHls()
  logEvent('source-change', `Loading: ${source.name}`)

  if (source.type === 'hls') {
    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
      })
      hlsInstance.value = hls

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        logEvent('hls-manifest-parsed', `Levels: ${hls.levels.length}`)
        updateVideoState()
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level]
        logEvent('hls-level-switched', `${level.width}x${level.height} @ ${level.bitrate}bps`)
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        logEvent('hls-error', `${data.type}: ${data.details}`)
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              break
            default:
              destroyHls()
              break
          }
        }
      })

      hls.loadSource(source.url)
      hls.attachMedia(video)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = source.url
    }
  } else {
    video.src = source.url
  }

  updateVideoState()
}

function clearEvents() {
  events.value = []
}

watch(selectedSourceIndex, () => {
  loadSource(selectedSource.value)
})

let stateUpdateInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  setupEventListeners()
  loadSource(selectedSource.value)

  // Update state periodically for smooth stats display
  stateUpdateInterval = setInterval(updateVideoState, 250)
})

onUnmounted(() => {
  destroyHls()
  if (stateUpdateInterval) {
    clearInterval(stateUpdateInterval)
  }
})
</script>

<template>
  <div class="video-player-container">
    <div class="controls-bar">
      <label for="source-select">Source:</label>
      <select id="source-select" v-model="selectedSourceIndex">
        <option v-for="(source, index) in VIDEO_SOURCES" :key="source.url" :value="index">
          {{ source.name }}
        </option>
      </select>
      <span class="source-type" :class="selectedSource.type">{{ selectedSource.type.toUpperCase() }}</span>
    </div>

    <div class="player-wrapper">
      <video
        ref="videoRef"
        controls
        playsinline
        preload="auto"
        crossorigin="anonymous"
      >
        Your browser does not support the video tag.
      </video>
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
  color: #60a5fa;
}

.source-type.hls {
  background: #064e3b;
  color: #34d399;
}

.source-type.webm {
  background: #4c1d95;
  color: #a78bfa;
}

.player-wrapper {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  max-height: 500px;
}

.player-wrapper video {
  width: 100%;
  height: 100%;
  object-fit: contain;
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
