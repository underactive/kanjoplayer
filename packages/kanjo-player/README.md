# KanjoPlayer

A framework-agnostic video player library built with TypeScript. Supports HTML5 video, HLS streaming (via hls.js), WebAssembly-powered thumbnail generation, A/B loop controls, and video adjustments.

## Features

- **Multiple delivery formats**: ES module, UMD bundle, Web Component (`<kanjo-player>`), or Vue 3 component
- **HLS streaming**: Built-in support via hls.js plugin
- **Thumbnail previews**: Multi-strategy extraction with automatic fallbacks
- **A/B loop controls**: Set loop points for precise playback regions
- **Video adjustments**: Brightness, contrast, saturation controls
- **Custom buttons**: Add your own buttons to the control bar
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

KanjoPlayer uses WebAssembly for faster thumbnail encoding when available. Without WASM configuration, the library automatically falls back to canvas-based encoding, which works but is slightly slower.

To enable WASM acceleration and eliminate console warnings, add these Vite plugins:

```bash
npm install -D vite-plugin-wasm vite-plugin-top-level-await
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
  container: HTMLElement;
  src: string;
  sourceType?: 'mp4' | 'hls' | 'webm';
  controls?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  theme?: 'dark' | 'light';
  thumbnails?: {
    enabled?: boolean;
    vttUrl?: string;      // Pre-generated sprite sheet
    width?: number;
    height?: number;
  };
  plugins?: KanjoPlugin[];
  customButtons?: {
    enabled: boolean;
    buttons: CustomButton[];
  };
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

### Methods

```typescript
player.play();
player.pause();
player.seek(time: number);
player.setVolume(volume: number);  // 0-1
player.setMuted(muted: boolean);
player.setSrc(url: string, type?: string);
player.setPlaybackRate(rate: number);
player.enterFullscreen();
player.exitFullscreen();
player.getVideoElement(): HTMLVideoElement;
player.getState(): PlayerState;
player.destroy();
```

### Events

```typescript
player.on('play', () => {});
player.on('pause', () => {});
player.on('ended', () => {});
player.on('timeupdate', (time: number) => {});
player.on('volumechange', (data: { volume: number; muted: boolean }) => {});
player.on('fullscreenchange', (isFullscreen: boolean) => {});
player.on('ratechange', (rate: number) => {});
player.on('error', (error: Error) => {});

// HLS-specific events (when using HlsPlugin)
player.on('hlsmanifestparsed', (data) => {});
player.on('hlslevelswitch', (data) => {});
player.on('hlserror', (error) => {});
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
