# KanjoPlayer

A framework-agnostic video player library built with TypeScript. Supports HTML5 video, HLS streaming (via hls.js), WebAssembly-powered thumbnail generation, A/B loop controls, and video adjustments.

## Features

- **Multiple delivery formats**: ES module, UMD bundle, Web Component (`<kanjo-player>`), or Vue 3 component
- **HLS streaming**: Built-in support via hls.js plugin
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

## Getting Started

### Basic Usage

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

### Vue 3

```vue
<script setup>
import { KanjoPlayerVue } from 'kanjo-player/vue';
import 'kanjo-player/style.css';
</script>

<template>
  <KanjoPlayerVue
    src="https://example.com/video.mp4"
    :controls="true"
  />
</template>
```

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

## Configuration Options

```typescript
interface KanjoPlayerOptions {
  // Required
  container: HTMLElement | string;

  // Source
  src?: string;
  sourceType?: 'mp4' | 'webm' | 'hls';

  // Playback
  autoplay?: boolean;        // default: false
  muted?: boolean;           // default: false
  loop?: boolean;            // default: false
  volume?: number;           // default: 1 (0-1)
  preload?: 'none' | 'metadata' | 'auto';  // default: 'metadata'

  // UI
  controls?: boolean;        // default: true
  theme?: 'dark' | 'light';  // default: 'dark'
  poster?: string;
  className?: string;
  controlsTimeout?: number;  // default: 3000 (ms)

  // Features
  keyboardShortcuts?: boolean;      // default: true
  doubleClickFullscreen?: boolean;  // default: true

  // Thumbnails
  thumbnails?: {
    enabled?: boolean;       // default: true
    vttUrl?: string;         // Pre-generated sprite sheet
    width?: number;          // default: 160
    height?: number;         // default: 90
  };

  // Settings menu
  settings?: {
    enabled?: boolean;       // default: true
    showSpeed?: boolean;     // default: true
    showPiP?: boolean;       // default: true
    showDownload?: boolean;  // default: false
    showAdjustments?: boolean;  // default: true
  };

  // Skip controls
  skipControls?: {
    enabled?: boolean;       // default: false
    durations?: number[];    // default: [5, 10, 15, 30, 60]
    defaultDuration?: number;  // default: 10
  };

  // Streaming (requires device availability)
  airPlay?: {
    enabled?: boolean;       // default: false
  };
  cast?: {
    enabled?: boolean;       // default: false
    receiverApplicationId?: string;  // default: uses default receiver
  };

  // Custom buttons
  customButtons?: {
    enabled?: boolean;
    buttons: CustomButtonConfig[];
  };

  // Watermark for downloaded clips
  watermark?: {
    enabled?: boolean;       // default: true
    text?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };

  // Plugins
  plugins?: KanjoPlugin[];
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `K` | Play/Pause |
| `M` | Mute/Unmute |
| `F` | Toggle fullscreen |
| `←` | Rewind 10s |
| `→` | Forward 10s |
| `↑` / `↓` | Volume up/down |
| `<` / `>` | Decrease/Increase speed |
| `0-9` | Seek to percentage |
| `[` | Set loop start (A) |
| `]` | Set loop end (B) |
| `\` | Clear loop |
| `L` | Toggle loop |

## Thumbnail System

KanjoPlayer uses a multi-strategy approach for thumbnail generation:

1. **Sprite sheets** (fastest): Pre-generated WebVTT sprite sheets
2. **HLS extraction**: Extracts frames from HLS segments
3. **Canvas extraction**: Real-time frame capture for MP4/WebM

The system automatically selects the best available method and falls back gracefully when methods are unavailable.

## Custom Buttons

Add custom buttons to the control bar:

```typescript
new KanjoPlayer({
  // ...other options
  customButtons: {
    enabled: true,
    buttons: [
      {
        id: 'bookmark',
        iconClass: 'my-bookmark-icon',
        displayMode: 'icon',
        eventKey: 'bookmark_video',
        eventValue: 'currentTime',
        tooltip: 'Bookmark this position',
      },
    ],
  },
});

// Listen for custom button events
document.addEventListener('kanjo-custom-event', (e) => {
  const { buttonId, eventKey, value } = e.detail;
  console.log(`Button ${buttonId} clicked:`, eventKey, value);
});
```

## API

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
player.setSrc(url: string, type?: 'mp4' | 'webm' | 'hls'): void;
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
player.on('canplay', () => {});
player.on('waiting', () => {});
player.on('playing', () => {});
player.on('progress', ({ buffered }) => {});
player.on('error', ({ code, message }) => {});

// UI events
player.on('fullscreenchange', ({ isFullscreen }) => {});
player.on('enterpictureinpicture', () => {});
player.on('leavepictureinpicture', () => {});

// HLS-specific events (when using HlsPlugin)
player.on('hlsmanifestparsed', ({ levels }) => {});
player.on('hlslevelswitch', ({ level, auto }) => {});
player.on('hlserror', ({ type, details, fatal }) => {});

// Custom button events
player.on('custombuttonevent', ({ buttonId, eventKey, value }) => {});
```

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

## License

MIT
