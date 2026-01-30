# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KanjoPlayer is a framework-agnostic video player library built with TypeScript. It supports HTML5 video, HLS streaming (via hls.js plugin), WebAssembly-powered thumbnail generation, A/B loop controls, skip controls, AirPlay/Chromecast streaming, and video adjustments. The library can be used as an ES module, UMD bundle, Web Component, or Vue 3 component.

## Monorepo Structure

This project uses npm workspaces with the following structure:

```
kanjoplayer/
├── packages/
│   └── kanjo-player/        # Library package (publishable to npm)
│       ├── src/             # Library source code
│       └── dist/            # Built library output
└── apps/
    ├── demo/                # Vanilla JS demo (serves static files)
    ├── demo-react/          # React demo app
    ├── demo-vue/            # Vue 3 demo app
    └── demo-svelte/         # Svelte 5 demo app
```

## Commands

```bash
# Development servers
npm run dev              # Start vanilla demo
npm run dev:react        # Start React demo
npm run dev:vue          # Start Vue demo
npm run dev:svelte       # Start Svelte demo

# Build library only (outputs to packages/kanjo-player/dist/)
npm run build

# Build for Netlify deployment (all demos)
npm run build:netlify

# Type checking across all workspaces
npm run typecheck

# Linting and formatting
npm run lint             # Check for lint errors
npm run lint:fix         # Auto-fix lint errors
npm run format           # Format code with Prettier
```

## Code Style

This project uses ESLint 9 (flat config) and Prettier for code quality and formatting. **All code must pass linting and follow formatting rules.**

### When writing or modifying code:
- Use single quotes for strings
- Use semicolons at end of statements
- Use 2-space indentation
- Max line width is 100 characters
- Use trailing commas in ES5-compatible contexts
- Always use arrow function parentheses: `(x) => x` not `x => x`

### ESLint rules to follow:
- No unused variables (prefix with `_` only if truly required by a callback signature)
- No explicit `any` types - use `unknown` and type guards instead
- Vue components: use `<script>`, `<template>`, `<style>` order
- Prefer `const` over `let` when variables aren't reassigned

### Before completing work:
1. Run `npm run lint` to check for errors
2. Run `npm run lint:fix` to auto-fix what's possible
3. Run `npm run format` to ensure consistent formatting
4. Run `npm run typecheck` to verify TypeScript types

## Planning & Documentation

When working on non-trivial tasks that require planning:

1. **Plans** must be written to `docs/plans/` with the filename format `{epoch}-{descriptive-name}.md`
   - Example: `docs/plans/1738262400-add-subtitle-support.md`
   - The epoch is the Unix timestamp when the plan is created

2. **Implementation output** from a planned task must be documented in `docs/plans/implemented/` with the same naming convention: `{epoch}-{descriptive-name}.md`
   - Example: `docs/plans/implemented/1738262400-add-subtitle-support.md`
   - This documents what was actually implemented, decisions made, and any deviations from the plan

## Architecture

### Core Layer (`packages/kanjo-player/src/core/`)
- **KanjoPlayer.ts**: Main orchestrator that wires together state, media, plugins, and UI
- **StateManager.ts**: Reactive state with batched updates and subscriptions
- **MediaController.ts**: Wrapper around HTMLVideoElement with unified API
- **EventEmitter.ts**: Type-safe event system for player events
- **types.ts**: All TypeScript interfaces and configuration types

### UI Layer (`packages/kanjo-player/src/ui/`)
- **UIBuilder.ts**: Declarative DOM construction via `ElementConfig` objects, includes SVG icons
- **ControlsOverlay.ts**: Manages overlay visibility with auto-hide timeout, orchestrates all controls
- **DownloadOverlay.ts**: Progress overlay for clip downloads
- **controls/**: Individual control components:
  - `PlayButton.ts`, `CenterPlayButton` - Play/pause controls
  - `ProgressBar.ts` - Scrubber with thumbnail preview and loop markers
  - `VolumeControl.ts` - Volume slider with mute button
  - `TimeDisplay.ts` - Current time / duration (expandable on hover)
  - `FullscreenButton.ts` - Fullscreen toggle
  - `SettingsMenu.ts` - Speed, PiP, adjustments menu
  - `VideoAdjustmentsPanel.ts` - Brightness, contrast, saturation sliders
  - `ABLoopControl.ts` - A/B loop markers with dropdown for download/clear
  - `SkipControl.ts` - Skip forward/back buttons with duration dropdown
  - `AirPlayButton.ts` - AirPlay streaming (Safari only)
  - `CastButton.ts` - Google Cast/Chromecast streaming
  - `CustomButtonArea.ts` - User-defined custom buttons

### Download System (`packages/kanjo-player/src/download/`)
- **LoopDownloader.ts**: FFmpeg.wasm-powered clip extraction from A/B loop regions

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
- Controls with dropdowns follow consistent pattern (button + chevron + dropdown menu)

## Build Configuration

- Vite dev server runs with COOP/COEP headers (required for SharedArrayBuffer/FFmpeg)
- Library build externalizes `hls.js`, `@ffmpeg/ffmpeg`, `@ffmpeg/util`, `vue` as peer dependencies
- TypeScript strict mode enabled with ES2020 target
- Demo apps include `@ffmpeg/ffmpeg` and `@ffmpeg/util` as dependencies for clip download

## Demo Apps

All demo apps import from the `kanjo-player` package:

```typescript
import { KanjoPlayer, HlsPlugin } from 'kanjo-player';
import 'kanjo-player/style.css';
```

Each demo showcases:
- Multiple video sources (HLS and MP4)
- Custom buttons with event handling
- Skip controls, AirPlay, and Cast enabled
- Video stats panel and event log
- Keyboard shortcuts reference

This validates that the library exports work correctly before publishing.
