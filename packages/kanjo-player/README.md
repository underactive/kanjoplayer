# KanjoPlayer

[![Netlify Status](https://api.netlify.com/api/v1/badges/618a3080-656b-47a8-acad-b262796b827f/deploy-status)](https://app.netlify.com/projects/kanjo-player/deploys)

A framework-agnostic video player library built with TypeScript. Supports HTML5 video, HLS/DASH streaming, VP9/AV1 codecs, WebAssembly-powered thumbnail generation, A/B loop controls, and video adjustments.

**[Live Demo](https://kanjo-player.netlify.app/)**

## Features

- **Multiple delivery formats**: ES module, UMD bundle, Web Component (`<kanjo-player>`), or Vue 3 component
- **Adaptive streaming**: HLS (via hls.js) and DASH (via dash.js) support
- **Modern codecs**: VP9 and AV1 support with codec detection API
- **Thumbnail previews**: Multi-strategy extraction with automatic fallbacks
- **A/B loop controls**: Set loop points for precise playback regions with clip download
- **Skip controls**: Configurable skip forward/back buttons with duration selection
- **Video adjustments**: Brightness, contrast, saturation controls
- **Custom buttons**: Add your own buttons to the control bar
- **AirPlay & Chromecast**: Stream to external devices (when available)
- **Keyboard shortcuts**: Full keyboard navigation support
- **Theming**: CSS variables for easy customization

## Installation

```bash
npm install kanjo-player
```

## Quick Start

```typescript
import { KanjoPlayer, HlsPlugin } from 'kanjo-player';
import 'kanjo-player/style.css';

const player = new KanjoPlayer({
  container: document.getElementById('player'),
  src: 'https://example.com/video.m3u8',
  sourceType: 'hls',
  controls: true,
  plugins: [new HlsPlugin()],
});
```

---

## Framework Integration

### React

```tsx
import { useState, useEffect, useRef } from 'react';
import { KanjoPlayer, HlsPlugin, DashPlugin } from 'kanjo-player';
import 'kanjo-player/style.css';

function VideoPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<KanjoPlayer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    playerRef.current = new KanjoPlayer({
      container: containerRef.current,
      src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      sourceType: 'hls',
      controls: true,
      theme: 'dark',
      thumbnails: { enabled: true },
      skipControls: { enabled: true },
      airPlay: { enabled: true },
      cast: { enabled: true },
      plugins: [new HlsPlugin(), new DashPlugin()],
    });

    // Listen for events
    playerRef.current.on('play', () => console.log('Playing'));
    playerRef.current.on('pause', () => console.log('Paused'));

    return () => {
      playerRef.current?.destroy();
    };
  }, []);

  const handleSourceChange = (url: string, type: 'mp4' | 'webm' | 'hls' | 'dash') => {
    playerRef.current?.setSrc(url, type);
  };

  return (
    <div>
      <div ref={containerRef} style={{ width: '100%', aspectRatio: '16 / 9' }} />
      <button onClick={() => handleSourceChange('https://example.com/video.m3u8', 'hls')}>
        Load HLS
      </button>
    </div>
  );
}

export default VideoPlayer;
```

### Vue 3

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { KanjoPlayer, HlsPlugin, DashPlugin } from 'kanjo-player';
import 'kanjo-player/style.css';

const containerRef = ref<HTMLDivElement | null>(null);
const player = ref<KanjoPlayer | null>(null);

onMounted(() => {
  if (!containerRef.value) return;

  player.value = new KanjoPlayer({
    container: containerRef.value,
    src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    sourceType: 'hls',
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
          id: 'bookmark',
          iconClass: 'hero-bookmark-solid',
          displayMode: 'icon',
          eventKey: 'bookmark_movie',
          eventValue: 'src',
          tooltip: 'Bookmark this video',
        },
      ],
    },
  });

  // Listen for events
  player.value.on('play', () => console.log('Playing'));
  player.value.on('pause', () => console.log('Paused'));
});

onUnmounted(() => {
  player.value?.destroy();
});
</script>

<template>
  <div ref="containerRef" class="player-wrapper" />
</template>

<style scoped>
.player-wrapper {
  width: 100%;
  aspect-ratio: 16 / 9;
}
</style>
```

### Svelte 5

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { KanjoPlayer, HlsPlugin, DashPlugin } from 'kanjo-player';
  import 'kanjo-player/style.css';

  let containerEl: HTMLDivElement;
  let player: KanjoPlayer | null = null;

  onMount(() => {
    player = new KanjoPlayer({
      container: containerEl,
      src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      sourceType: 'hls',
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

    // Listen for events
    player.on('play', () => console.log('Playing'));
    player.on('pause', () => console.log('Paused'));
  });

  onDestroy(() => {
    player?.destroy();
  });
</script>

<div bind:this={containerEl} class="player-wrapper"></div>

<style>
  .player-wrapper {
    width: 100%;
    aspect-ratio: 16 / 9;
  }
</style>
```

### Web Component

```html
<script type="module">
  import 'kanjo-player';
</script>

<kanjo-player
  src="https://example.com/video.mp4"
  controls
></kanjo-player>
```

---

## Streaming Support

### HLS Streaming

HLS (HTTP Live Streaming) is supported via the `HlsPlugin`. The `hls.js` library is bundled with kanjo-player, so no additional installation is required:

```typescript
import { KanjoPlayer, HlsPlugin } from 'kanjo-player';

const player = new KanjoPlayer({
  container: '#player',
  src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  sourceType: 'hls',
  plugins: [
    new HlsPlugin({
      hlsConfig: {
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        fragLoadingMaxRetry: 3,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
      },
      autoRecover: true,
      qualitySelector: true,
    }),
  ],
});

// HLS-specific events
player.on('hlsmanifestparsed', (data) => {
  console.log('Available HLS levels:', data.levels);
  // levels: [{ bitrate, width, height, name }]
});

player.on('hlslevelswitch', (data) => {
  console.log('Quality switched to level:', data.level, 'Auto:', data.auto);
});

player.on('hlserror', (data) => {
  console.log('HLS error:', data.type, data.details, 'Fatal:', data.fatal);
});
```

### DASH Streaming

DASH (Dynamic Adaptive Streaming over HTTP) is supported via the `DashPlugin`. Install `dashjs` as an optional dependency:

```bash
npm install dashjs
```

```typescript
import { KanjoPlayer, DashPlugin } from 'kanjo-player';

const player = new KanjoPlayer({
  container: '#player',
  src: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
  sourceType: 'dash',
  plugins: [
    new DashPlugin({
      dashConfig: {
        streaming: {
          buffer: {
            bufferTimeAtTopQuality: 30,
            bufferTimeAtTopQualityLongForm: 60,
            initialBufferLevel: 4,
            stableBufferTime: 12,
          },
          abr: {
            autoSwitchBitrate: {
              video: true,
              audio: true,
            },
          },
          retryAttempts: {
            MPD: 3,
            MediaSegment: 3,
            InitializationSegment: 3,
          },
        },
      },
      autoRecover: true,
      qualitySelector: true,
    }),
  ],
});

// DASH-specific events
player.on('dashmanifestparsed', (data) => {
  console.log('Available DASH qualities:', data.qualities);
  // qualities: [{ bitrate, width, height, qualityIndex, mediaType, codec? }]
});

player.on('dashqualitychanged', (data) => {
  console.log('Quality changed:', data.quality, 'Auto:', data.auto);
});

player.on('dasherror', (data) => {
  console.log('DASH error:', data.code, data.message, 'Fatal:', data.fatal);
});
```

### Using Both Plugins

You can register both plugins to support multiple streaming formats:

```typescript
import { KanjoPlayer, HlsPlugin, DashPlugin } from 'kanjo-player';

const player = new KanjoPlayer({
  container: '#player',
  plugins: [new HlsPlugin(), new DashPlugin()],
});

// Switch between sources dynamically
player.setSrc('https://example.com/video.m3u8', 'hls');
// or
player.setSrc('https://example.com/video.mpd', 'dash');
```

---

## VP9 and AV1 Codec Support

KanjoPlayer includes a codec detection API to check browser support for modern video codecs.

### Codec Detection

```typescript
import { CodecCapabilities } from 'kanjo-player';

// Synchronous check for basic support
const h264Supported = CodecCapabilities.isSupported('h264', 'mp4');
const vp9Supported = CodecCapabilities.isSupported('vp9', 'webm');
const av1Supported = CodecCapabilities.isSupported('av1', 'mp4');

console.log('H.264:', h264Supported);
console.log('VP9:', vp9Supported);
console.log('AV1:', av1Supported);
```

### Detailed Support Information

```typescript
import { CodecCapabilities } from 'kanjo-player';

// Get detailed support info including efficiency data
const support = await CodecCapabilities.getDetailedSupport('av1', 'mp4');
console.log(support);
// {
//   codec: 'av1',
//   container: 'mp4',
//   supported: true,
//   smooth: true,        // Can play smoothly
//   powerEfficient: true // Hardware accelerated
// }

// Get all codec capabilities at once
const allCapabilities = await CodecCapabilities.getAllCapabilities();
console.log(allCapabilities.preferredCodec); // 'av1' | 'vp9' | 'h265' | 'h264' | null
console.log(allCapabilities.codecs);         // Array of CodecSupport objects
```

### Supported Codecs

| Codec | Containers | Description |
|-------|-----------|-------------|
| H.264 | MP4, WebM | Baseline profile, universal browser support |
| H.265 | MP4, WebM | HEVC Main profile, efficient for 4K content |
| VP9 | MP4, WebM | Common in DASH/WebM, good compression ratio |
| AV1 | MP4, WebM | Latest codec, best compression and quality |

### Codec Preferences

Configure preferred codec for adaptive streaming:

```typescript
const player = new KanjoPlayer({
  container: '#player',
  codecs: {
    preferredCodec: 'av1', // 'auto' | 'h264' | 'h265' | 'vp9' | 'av1'
  },
  plugins: [new DashPlugin()],
});
```

---

## Configuration Reference

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `container` | `HTMLElement \| string` | Target element or CSS selector for the player |

### Source Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `src` | `string` | - | Video source URL |
| `sourceType` | `'mp4' \| 'webm' \| 'hls' \| 'dash'` | - | Source format type |
| `poster` | `string` | - | Poster image URL |

### Playback Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoplay` | `boolean` | `false` | Auto-start playback |
| `muted` | `boolean` | `false` | Start muted |
| `loop` | `boolean` | `false` | Loop video playback |
| `volume` | `number` | `1` | Initial volume (0-1) |
| `preload` | `'none' \| 'metadata' \| 'auto'` | `'metadata'` | Preload behavior |

### UI Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `controls` | `boolean` | `true` | Show player controls |
| `theme` | `'dark' \| 'light'` | `'dark'` | Player theme |
| `className` | `string` | - | Additional CSS class |
| `controlsTimeout` | `number` | `3000` | Controls auto-hide delay (ms) |
| `keyboardShortcuts` | `boolean` | `true` | Enable keyboard controls |
| `doubleClickFullscreen` | `boolean` | `true` | Double-click for fullscreen |

### Feature Configurations

#### Thumbnails

```typescript
thumbnails: {
  enabled: boolean;       // default: true
  vttUrl?: string;        // WebVTT sprite sheet URL
  spriteUrl?: string;     // Sprite image URL
  useWasm?: boolean;      // Use WASM extraction (default: true if available)
  cacheSize?: number;     // Cache size (default: 50)
  width?: number;         // Thumbnail width (default: 160)
  height?: number;        // Thumbnail height (default: 90)
}
```

#### Settings Menu

```typescript
settings: {
  enabled?: boolean;        // default: true
  showSpeed?: boolean;      // Show playback speed (default: true)
  showPiP?: boolean;        // Show Picture-in-Picture (default: true)
  showDownload?: boolean;   // Show download option (default: false)
  showAdjustments?: boolean; // Show video adjustments (default: true)
}
```

#### Skip Controls

```typescript
skipControls: {
  enabled?: boolean;        // default: false
  durations?: number[];     // Available durations (default: [5, 10, 15, 30, 60])
  defaultDuration?: number; // Default skip duration (default: 10)
}
```

#### AirPlay

```typescript
airPlay: {
  enabled?: boolean;  // default: false (shows when available)
}
```

#### Chromecast

```typescript
cast: {
  enabled?: boolean;             // default: false (shows when available)
  receiverApplicationId?: string; // Custom receiver app ID
}
```

#### Codec Preferences

```typescript
codecs: {
  preferredCodec?: 'auto' | 'h264' | 'h265' | 'vp9' | 'av1'; // default: 'auto'
}
```

#### Watermark (for downloaded clips)

```typescript
watermark: {
  enabled?: boolean;   // default: true
  text?: string;       // Watermark text
  fontSize?: number;   // Font size in pixels (default: 18)
  color?: string;      // Text color (default: 'white')
  opacity?: number;    // Opacity 0-1 (default: 0.5)
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  padding?: number;    // Padding in pixels (default: 10)
}
```

#### Custom Buttons

```typescript
customButtons: {
  enabled?: boolean;
  buttons: [
    {
      id: string;              // Unique button ID
      iconClass?: string;      // CSS class for icon
      text?: string;           // Button text
      displayMode: 'icon' | 'icon-text' | 'text';
      eventKey: string;        // Event name to emit
      eventValue?: string | 'src' | 'currentTime' | 'duration' | 'volume' | 'playbackRate';
      tooltip?: string;        // Tooltip text
    }
  ]
}
```

#### Plugins

```typescript
plugins: KanjoPlugin[];  // Array of plugin instances
```

### Complete Example

```typescript
import { KanjoPlayer, HlsPlugin, DashPlugin } from 'kanjo-player';
import 'kanjo-player/style.css';

const player = new KanjoPlayer({
  // Required
  container: '#video-player',

  // Source
  src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  sourceType: 'hls',
  poster: 'https://example.com/poster.jpg',

  // Playback
  autoplay: false,
  muted: false,
  controls: true,
  volume: 1,
  preload: 'metadata',
  loop: false,

  // UI
  theme: 'dark',
  controlsTimeout: 3000,
  keyboardShortcuts: true,
  doubleClickFullscreen: true,

  // Features
  thumbnails: {
    enabled: true,
    useWasm: true,
    cacheSize: 50,
    width: 160,
    height: 90,
  },

  settings: {
    enabled: true,
    showSpeed: true,
    showPiP: true,
    showDownload: false,
    showAdjustments: true,
  },

  skipControls: {
    enabled: true,
    durations: [5, 10, 15, 30, 60],
    defaultDuration: 10,
  },

  airPlay: { enabled: true },
  cast: { enabled: true },

  codecs: {
    preferredCodec: 'auto',
  },

  watermark: {
    enabled: true,
    text: 'My Channel',
    position: 'bottom-right',
    opacity: 0.5,
  },

  customButtons: {
    enabled: true,
    buttons: [
      {
        id: 'bookmark',
        iconClass: 'hero-bookmark-solid',
        displayMode: 'icon',
        eventKey: 'bookmark_video',
        eventValue: 'currentTime',
        tooltip: 'Bookmark this position',
      },
    ],
  },

  plugins: [new HlsPlugin(), new DashPlugin()],
});
```

---

## Vite Configuration

For basic usage, no special configuration is required. The player works out of the box with automatic fallbacks for all features.

### Optional: WASM Performance Optimization

KanjoPlayer uses WebAssembly for faster thumbnail encoding and clip downloads when available. Without WASM configuration, the library automatically falls back to canvas-based encoding, which works but is slightly slower.

To enable WASM acceleration and eliminate console warnings, add these Vite plugins:

```bash
npm install -D vite-plugin-wasm vite-plugin-top-level-await
npm install @ffmpeg/ffmpeg @ffmpeg/util  # For clip download feature
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  server: {
    headers: {
      // Required for SharedArrayBuffer support
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@jsquash/jpeg'],
  },
  assetsInclude: ['**/*.wasm'],
});
```

> **Note**: If you see WASM-related warnings in the console (e.g., "WASM encode failed, switching to fallback"), the player is still fully functional using canvas-based encoding. The WASM configuration above is optional and only needed for optimal performance.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `K` | Play/Pause |
| `M` | Mute/Unmute |
| `F` | Toggle fullscreen |
| `P` | Toggle Picture-in-Picture |
| `←` | Rewind 10s |
| `→` | Forward 10s |
| `↑` / `↓` | Volume up/down |
| `<` / `>` | Decrease/Increase speed |
| `0-9` | Seek to percentage |
| `Home` | Seek to start |
| `End` | Seek to end |
| `[` | Set loop start (A) |
| `]` | Set loop end (B) |
| `\` | Clear loop |
| `L` | Toggle loop |

### Custom Key Bindings

You can customize key bindings using the `KeyboardPlugin`:

```typescript
import { KanjoPlayer, KeyboardPlugin } from 'kanjo-player';

const player = new KanjoPlayer({
  container: '#player',
  keyboardShortcuts: false, // Disable default keyboard handling
  plugins: [
    new KeyboardPlugin({
      global: true, // Listen globally (not just when player focused)
      bindings: {
        playPause: ['Space', 'k', 'Enter'], // Custom play/pause keys
        mute: ['m', 'M'],
        fullscreen: ['f', 'F11'],
      },
    }),
  ],
});
```

---

## API Reference

### Playback Methods

```typescript
player.play(): Promise<void>;
player.pause(): void;
player.togglePlay(): Promise<void>;
player.seek(time: number): void;
player.seekPercent(percent: number): void;  // 0-100
player.forward(seconds?: number): void;     // default: 10
player.backward(seconds?: number): void;    // default: 10
```

### Volume Methods

```typescript
player.setVolume(volume: number): void;  // 0-1
player.getVolume(): number;
player.mute(): void;
player.unmute(): void;
player.toggleMute(): void;
```

### Playback Rate

```typescript
player.setPlaybackRate(rate: number): void;
player.getPlaybackRate(): number;
```

### Fullscreen & Picture-in-Picture

```typescript
player.enterFullscreen(): Promise<void>;
player.exitFullscreen(): Promise<void>;
player.toggleFullscreen(): Promise<void>;

player.enterPiP(): Promise<void>;
player.exitPiP(): Promise<void>;
player.togglePiP(): Promise<void>;
```

### Source & State

```typescript
player.setSrc(url: string, type?: 'mp4' | 'webm' | 'hls' | 'dash'): void;
player.getSrc(): string;

player.getState(): PlayerState;
player.isPlaying(): boolean;
player.isPaused(): boolean;
player.isEnded(): boolean;
player.getCurrentTime(): number;
player.getDuration(): number;

player.getVideoElement(): HTMLVideoElement;
player.getContainerElement(): HTMLElement;
player.destroy(): void;
```

### Plugins & Extensions

```typescript
// Add plugins dynamically
player.use(plugin: KanjoPlugin): Promise<void>;
player.getPlugin<T>(name: string): T | undefined;

// Thumbnails
player.getThumbnail(time: number): Promise<ThumbnailData | null>;

// Codec capabilities
player.getCodecCapabilities(): Promise<CodecCapabilitiesResult>;
player.isCodecSupported(codec: VideoCodec, container?: VideoContainer): boolean;

// UI customization (advanced)
player.addToolbarButton(config: ToolbarButtonConfig): void;
player.removeToolbarButton(id: string): void;
player.addMenuItem(config: MenuItemConfig): void;
player.removeMenuItem(id: string): void;
```

### Event Subscription

```typescript
// Subscribe to events
player.on('eventName', handler);    // Add event listener
player.off('eventName', handler);   // Remove event listener
player.once('eventName', handler);  // Listen once, then auto-remove
```

### Events

```typescript
// Playback events
player.on('play', () => {});
player.on('pause', () => {});
player.on('ended', () => {});
player.on('timeupdate', ({ currentTime, duration }) => {});
player.on('seeking', ({ time }) => {});
player.on('seeked', ({ time }) => {});
player.on('ratechange', ({ rate }) => {});

// Volume events
player.on('volumechange', ({ volume, muted }) => {});

// Loading events
player.on('loadstart', () => {});
player.on('loadedmetadata', ({ duration, videoWidth, videoHeight }) => {});
player.on('loadeddata', () => {});
player.on('canplay', () => {});
player.on('canplaythrough', () => {});
player.on('waiting', () => {});
player.on('playing', () => {});
player.on('progress', ({ buffered }) => {});
player.on('error', ({ code, message }) => {});

// UI events
player.on('fullscreenchange', ({ isFullscreen }) => {});
player.on('enterpictureinpicture', () => {});
player.on('leavepictureinpicture', () => {});
player.on('controlsshow', () => {});
player.on('controlshide', () => {});

// State events
player.on('statechange', (state) => {}); // Full player state object
player.on('sourcechange', ({ src, type }) => {});

// A/B Loop events
player.on('setloopstart', () => {});
player.on('setloopend', () => {});
player.on('clearloop', () => {});
player.on('toggleloop', () => {});

// HLS-specific events (when using HlsPlugin)
player.on('hlsmanifestparsed', ({ levels }) => {});
player.on('hlslevelswitch', ({ level, auto }) => {});
player.on('hlserror', ({ type, details, fatal }) => {});

// DASH-specific events (when using DashPlugin)
player.on('dashmanifestparsed', ({ qualities }) => {});
player.on('dashqualitychanged', ({ quality, auto }) => {});
player.on('dasherror', ({ code, message, fatal }) => {});

// Plugin events
player.on('pluginloaded', ({ name }) => {});
player.on('pluginerror', ({ name, error }) => {});

// Custom button events
player.on('custombuttonevent', ({ buttonId, eventKey, value }) => {});
```

---

## Thumbnail System

KanjoPlayer uses a multi-strategy approach for thumbnail generation:

1. **Sprite sheets** (fastest): Pre-generated WebVTT sprite sheets
2. **HLS extraction**: Extracts frames from HLS segments
3. **Canvas extraction**: Real-time frame capture for MP4/WebM

The system automatically selects the best available method and falls back gracefully when methods are unavailable.

---

## CSS Customization

KanjoPlayer uses CSS custom properties for theming:

```css
:root {
  --kanjo-primary: #2E82FF;
  --kanjo-bg: rgba(0, 0, 0, 0.8);
  --kanjo-text: #ffffff;
  --kanjo-progress-bg: rgba(255, 255, 255, 0.3);
  --kanjo-progress-buffered: rgba(255, 255, 255, 0.5);
  --kanjo-progress-played: var(--kanjo-primary);
}
```

---

## License

MIT
