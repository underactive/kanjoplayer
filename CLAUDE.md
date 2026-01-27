# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KimochiPlayer is a framework-agnostic video player library built with TypeScript. It supports HTML5 video, HLS streaming (via hls.js plugin), WebAssembly-powered thumbnail generation, A/B loop controls, and video adjustments. The library can be used as an ES module, UMD bundle, Web Component, or Vue 3 component.

## Commands

```bash
# Development server (includes demo app)
npm run dev

# Build library only (outputs to dist/)
npm run build:lib

# Build demo + library
npm run build:all

# Type checking
npm run typecheck
```

## Architecture

### Core Layer (`src/lib/core/`)
- **KimochiPlayer.ts**: Main orchestrator that wires together state, media, plugins, and UI
- **StateManager.ts**: Reactive state with batched updates and subscriptions
- **MediaController.ts**: Wrapper around HTMLVideoElement with unified API
- **EventEmitter.ts**: Type-safe event system for player events

### UI Layer (`src/lib/ui/`)
- **UIBuilder.ts**: Declarative DOM construction via `ElementConfig` objects
- **ControlsOverlay.ts**: Manages overlay visibility with auto-hide timeout
- **controls/**: Individual control components (ProgressBar, ABLoopControl, VolumeControl, VideoAdjustmentsPanel, SettingsMenu, etc.)

### Thumbnail System (`src/lib/thumbnails/`)
Multi-strategy extraction with fallback chain:
1. **SpriteLoader**: Pre-generated WebVTT sprite sheets (fastest)
2. **HlsExtractor**: Extract from HLS segments (works without CORS)
3. **CanvasExtractor**: Real-time frame capture for MP4/WebM
4. **WasmExtractor**: FFmpeg.wasm via Web Worker (optional peer dependency)

The ThumbnailManager coordinates strategies and uses LRU caching (ThumbnailCache).

### Plugin System (`src/lib/plugins/`)
- **PluginManager.ts**: Manages plugin lifecycle (install/destroy)
- **types.ts**: `KimochiPlugin` interface and `BasePlugin` class
- **built-in/HlsPlugin.ts**: HLS.js integration
- **built-in/KeyboardPlugin.ts**: Keyboard shortcuts

### Delivery Formats
- **ES/UMD Library**: `src/lib/index.ts` exports public API
- **Web Component**: `src/lib/web-component/KimochiPlayerElement.ts` (`<kimochi-player>`)
- **Vue Wrapper**: `src/vue/KimochiPlayerVue.vue`

## Key Patterns

- State changes flow through StateManager with batching for performance
- UI controls receive player instance and subscribe to state changes
- Plugins implement `install(player)` and `destroy()` lifecycle methods
- Thumbnail extraction uses strategy pattern with automatic fallback
- CSS variables enable theming (`--kimochi-*` custom properties)

## Build Configuration

- Vite dev server runs with COOP/COEP headers (required for SharedArrayBuffer/FFmpeg)
- Library build externalizes `hls.js`, `@ffmpeg/ffmpeg`, `@ffmpeg/util` as peer dependencies
- TypeScript strict mode enabled with ES2020 target
