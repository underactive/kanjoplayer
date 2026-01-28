export interface VideoSource {
  name: string
  url: string
  type: 'mp4' | 'hls' | 'webm'
}

export interface VideoState {
  currentTime: number
  duration: number
  paused: boolean
  ended: boolean
  seeking: boolean
  buffered: string
  seekable: string
  volume: number
  muted: boolean
  videoWidth: number
  videoHeight: number
  networkState: number
  networkStateText: string
  readyState: number
  readyStateText: string
  playbackRate: number
  defaultPlaybackRate: number
  currentSrc: string
  src: string
  played: string
  error: string | null
  autoplay: boolean
  controls: boolean
  loop: boolean
  preload: string
  crossOrigin: string | null
  canPlayType_mp4: string
  canPlayType_webm: string
  canPlayType_hls: string
}

export interface VideoEvent {
  timestamp: number
  type: string
  detail?: string
}

export interface CustomEventEntry {
  timestamp: number
  buttonId: string
  eventKey: string
  value: unknown
}

export const NETWORK_STATE_MAP: Record<number, string> = {
  0: 'NETWORK_EMPTY',
  1: 'NETWORK_IDLE',
  2: 'NETWORK_LOADING',
  3: 'NETWORK_NO_SOURCE',
}

export const READY_STATE_MAP: Record<number, string> = {
  0: 'HAVE_NOTHING',
  1: 'HAVE_METADATA',
  2: 'HAVE_CURRENT_DATA',
  3: 'HAVE_FUTURE_DATA',
  4: 'HAVE_ENOUGH_DATA',
}

export const VIDEO_SOURCES: VideoSource[] = [
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
]
