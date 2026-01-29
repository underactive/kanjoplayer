<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { KanjoPlayer, HlsPlugin, DashPlugin, CodecCapabilities } from 'kanjo-player'
  import 'kanjo-player/style.css'
  import StatsPanel from './StatsPanel.svelte'
  import EventLog from './EventLog.svelte'
  import CustomEventsLog from './CustomEventsLog.svelte'
  import {
    VIDEO_SOURCES,
    NETWORK_STATE_MAP,
    READY_STATE_MAP,
    type VideoState,
    type VideoEvent,
  } from '../types'

  let containerEl: HTMLDivElement
  let player: KanjoPlayer | null = null
  let statsInterval: ReturnType<typeof setInterval> | null = null
  let selectedSourceIndex = $state(0)
  let events = $state<VideoEvent[]>([])
  const maxEvents = 100

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
  }

  let videoState = $state<VideoState>({ ...initialVideoState })

  const selectedSource = $derived(VIDEO_SOURCES[selectedSourceIndex])

  function formatTimeRanges(ranges: TimeRanges): string {
    if (!ranges || ranges.length === 0) return 'none'
    const parts: string[] = []
    for (let i = 0; i < ranges.length; i++) {
      parts.push(`[${ranges.start(i).toFixed(2)}-${ranges.end(i).toFixed(2)}]`)
    }
    return parts.join(', ')
  }

  function logEvent(type: string, detail?: unknown) {
    const newEvent: VideoEvent = {
      timestamp: Date.now(),
      type,
      detail: detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : undefined,
    }
    events = [newEvent, ...events]
    if (events.length > maxEvents) {
      events = events.slice(0, maxEvents)
    }
  }

  function clearEvents() {
    events = []
  }

  function updateVideoState() {
    if (!player) return

    const video = player.getVideoElement()
    videoState = {
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
    }
  }

  function initPlayer() {
    if (!containerEl) return

    // Destroy existing player
    if (player) {
      player.destroy()
    }

    // Clear stats interval
    if (statsInterval) {
      clearInterval(statsInterval)
    }

    const source = VIDEO_SOURCES[selectedSourceIndex]

    // Create new player
    player = new KanjoPlayer({
      container: containerEl,
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
    })

    // Bind events
    const eventTypes = [
      'play', 'pause', 'ended', 'seeking', 'seeked',
      'volumechange', 'ratechange', 'fullscreenchange',
      'loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
      'waiting', 'playing', 'progress', 'error',
      'enterpictureinpicture', 'leavepictureinpicture',
      'hlsmanifestparsed', 'hlslevelswitch', 'hlserror',
      'dashmanifestparsed', 'dashqualitychanged', 'dasherror',
    ] as const

    const currentPlayer = player
    eventTypes.forEach((eventType) => {
      currentPlayer!.on(eventType as Parameters<typeof currentPlayer.on>[0], (data: unknown) => {
        logEvent(eventType, data)
      })
    })

    // Update stats every 250ms
    statsInterval = setInterval(updateVideoState, 250)
    updateVideoState()

    logEvent('source-change', `Loading: ${source.name}`)
  }

  function handleSourceChange(e: Event) {
    const target = e.target as HTMLSelectElement
    selectedSourceIndex = parseInt(target.value)
    const source = VIDEO_SOURCES[selectedSourceIndex]
    if (player) {
      player.setSrc(source.url, source.type)
      logEvent('source-change', `Loading: ${source.name}`)
    }
  }

  onMount(() => {
    initPlayer()
  })

  onDestroy(() => {
    if (player) {
      player.destroy()
    }
    if (statsInterval) {
      clearInterval(statsInterval)
    }
  })
</script>

<div class="video-player-container">
  <div class="controls-bar">
    <label for="source-select">Source:</label>
    <select id="source-select" value={selectedSourceIndex} onchange={handleSourceChange}>
      {#each VIDEO_SOURCES as source, index}
        <option value={index}>{source.name}</option>
      {/each}
    </select>
    <span class="source-type {selectedSource.type}">{selectedSource.type.toUpperCase()}</span>
  </div>

  <div bind:this={containerEl} class="player-wrapper"></div>

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
      <div><kbd>\</kbd> Clear loop</div>
      <div><kbd>L</kbd> Toggle loop</div>
    </div>
  </div>

  <div class="stats-container">
    <StatsPanel state={videoState} />
    <EventLog {events} onClear={clearEvents} />
  </div>

  <CustomEventsLog />
</div>
