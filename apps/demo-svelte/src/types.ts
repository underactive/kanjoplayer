export interface VideoSource {
  name: string
  url: string
  type: 'mp4' | 'hls' | 'webm' | 'dash'
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
]
