# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KanjoPlayer is a framework-agnostic video player library built with TypeScript. It supports HTML5 video, HLS streaming (via hls.js plugin), WebAssembly-powered thumbnail generation, A/B loop controls, and video adjustments. The library can be used as an ES module, UMD bundle, Web Component, or Vue 3 component.

## Monorepo Structure

This project uses npm workspaces with the following structure:

```
kanjoplayer/
├── packages/
│   └── kanjo-player/     # Library package (publishable to npm)
│       ├── src/          # Library source code
│       └── dist/         # Built library output
└── apps/
    └── demo/             # Demo application (private)
        └── src/          # Demo source code
```

## Commands

```bash
# Development server (starts demo app)
npm run dev

# Build library only (outputs to packages/kanjo-player/dist/)
npm run build

# Build library + demo
npm run build:all

# Type checking across all workspaces
npm run typecheck
```

## Architecture

### Core Layer (`packages/kanjo-player/src/core/`)
- **KanjoPlayer.ts**: Main orchestrator that wires together state, media, plugins, and UI
- **StateManager.ts**: Reactive state with batched updates and subscriptions
- **MediaController.ts**: Wrapper around HTMLVideoElement with unified API
- **EventEmitter.ts**: Type-safe event system for player events

### UI Layer (`packages/kanjo-player/src/ui/`)
- **UIBuilder.ts**: Declarative DOM construction via `ElementConfig` objects
- **ControlsOverlay.ts**: Manages overlay visibility with auto-hide timeout
- **controls/**: Individual control components (ProgressBar, ABLoopControl, VolumeControl, VideoAdjustmentsPanel, SettingsMenu, etc.)

### Thumbnail System (`packages/kanjo-player/src/thumbnails/`)
Multi-strategy extraction with fallback chain:
1. **SpriteLoader**: Pre-generated WebVTT sprite sheets (fastest)
2. **HlsExtractor**: Extract from HLS segments (works without CORS)
3. **CanvasExtractor**: Real-time frame capture for MP4/WebM
4. **WasmExtractor**: FFmpeg.wasm via Web Worker (optional peer dependency)

The ThumbnailManager coordinates strategies and uses LRU caching (ThumbnailCache).

### Plugin System (`packages/kanjo-player/src/plugins/`)
- **PluginManager.ts**: Manages plugin lifecycle (install/destroy)
- **types.ts**: `KanjoPlugin` interface and `BasePlugin` class
- **built-in/HlsPlugin.ts**: HLS.js integration
- **built-in/KeyboardPlugin.ts**: Keyboard shortcuts

### Delivery Formats
- **ES/UMD Library**: `packages/kanjo-player/src/index.ts` exports public API
- **Web Component**: `packages/kanjo-player/src/web-component/KanjoPlayerElement.ts` (`<kanjo-player>`)
- **Vue Wrapper**: `packages/kanjo-player/src/vue/KanjoPlayerVue.vue`

## Key Patterns

- State changes flow through StateManager with batching for performance
- UI controls receive player instance and subscribe to state changes
- Plugins implement `install(player)` and `destroy()` lifecycle methods
- Thumbnail extraction uses strategy pattern with automatic fallback
- CSS variables enable theming (`--kanjo-*` custom properties)

## Build Configuration

- Vite dev server runs with COOP/COEP headers (required for SharedArrayBuffer/FFmpeg)
- Library build externalizes `hls.js`, `@ffmpeg/ffmpeg`, `@ffmpeg/util`, `vue` as peer dependencies
- TypeScript strict mode enabled with ES2020 target

## Demo App

The demo app in `apps/demo/` imports from the `kanjo-player` package:

```typescript
import { KanjoPlayer, HlsPlugin } from 'kanjo-player';
import 'kanjo-player/style.css';
```

This validates that the library exports work correctly before publishing.
