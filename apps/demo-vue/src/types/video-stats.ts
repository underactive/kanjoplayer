export interface VideoSource {
  name: string
  url: string
  type: 'mp4' | 'hls' | 'webm' | 'dash'
}

export interface VideoState {
  // Playback state
  currentTime: number
  duration: number
  paused: boolean
  ended: boolean
  seeking: boolean

  // Buffering
  buffered: string
  seekable: string

  // Volume
  volume: number
  muted: boolean

  // Dimensions
  videoWidth: number
  videoHeight: number

  // Network state
  networkState: number
  networkStateText: string
  readyState: number
  readyStateText: string

  // Playback quality
  playbackRate: number
  defaultPlaybackRate: number

  // Source info
  currentSrc: string
  src: string

  // Timing
  played: string

  // Error state
  error: string | null

  // Additional properties
  autoplay: boolean
  controls: boolean
  loop: boolean
  preload: string
  crossOrigin: string | null

  // Media capabilities
  canPlayType_mp4: string
  canPlayType_webm: string
  canPlayType_hls: string

  // Codec capabilities
  codec_h264: boolean
  codec_h265: boolean
  codec_vp9: boolean
  codec_av1: boolean
}

export interface VideoEvent {
  timestamp: number
  type: string
  detail?: string
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

export const VIDEO_EVENTS = [
  'abort',
  'canplay',
  'canplaythrough',
  'durationchange',
  'emptied',
  'ended',
  'error',
  'loadeddata',
  'loadedmetadata',
  'loadstart',
  'pause',
  'play',
  'playing',
  'progress',
  'ratechange',
  'resize',
  'seeked',
  'seeking',
  'stalled',
  'suspend',
  'timeupdate',
  'volumechange',
  'waiting',
] as const

export type VideoEventType = typeof VIDEO_EVENTS[number]
