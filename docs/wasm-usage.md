# WASM Usage in KanjoPlayer

This document covers WebAssembly usage in KanjoPlayer and potential areas for WASM-based performance improvements.

## Current WASM Components

### 1. WasmExtractor (`src/lib/thumbnails/WasmExtractor.ts`)

Extracts video thumbnails using FFmpeg.wasm.

- Uses a Web Worker (`src/lib/thumbnails/worker/ffmpeg.worker.ts`) to run FFmpeg off the main thread
- Message types defined in `src/lib/thumbnails/worker/messages.ts`
- Currently **not enabled** in ThumbnailManager's fallback chain (config `useWasm` defaults to false)

### 2. LoopDownloader (`src/lib/download/LoopDownloader.ts`)

Downloads A/B loop video segments using FFmpeg.wasm.

- Loads FFmpeg core from CDN via `toBlobURL()`
- Supports both direct video files and HLS streams
- Includes watermark support

## Configuration Files

| File | WASM-related config |
|------|---------------------|
| `vite.config.ts` | COOP/COEP headers for SharedArrayBuffer support |
| `vite.config.lib.ts` | Externalizes `@ffmpeg/ffmpeg` and `@ffmpeg/util` as peer deps |
| `package.json` | Optional peer dependencies for FFmpeg packages |
| `src/lib/vite-env.d.ts` | Type declarations for FFmpeg modules |

## Requirements

- Both WASM features check support via `typeof WebAssembly !== 'undefined'`
- FFmpeg packages are **optional peer dependencies** - not bundled
- Web Workers prevent blocking the main thread during WASM operations
- SharedArrayBuffer requires these headers:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: credentialless`

---

## Potential WASM Performance Improvements

### High Priority

| Area | File | Current Approach | Potential Speedup |
|------|------|------------------|-------------------|
| Frame Capture + JPEG Encoding | `CanvasExtractor.ts` | Canvas API + `toDataURL()` | 2-5x |
| HLS Frame Capture | `HlsExtractor.ts` | Canvas with region extraction | 1.5-3x |

These operations run frequently during thumbnail preview and involve CPU-intensive image encoding.

### Medium Priority

| Area | File | Current Approach | Potential Speedup |
|------|------|------------------|-------------------|
| Watermark Generation | `LoopDownloader.ts:719-765` | Canvas text + Base64 encoding | 2-4x |
| Custom Video Filters | `VideoAdjustmentsPanel.ts` | SVG/CSS filters | 3-8x* |

*CSS filters are already GPU-accelerated. WASM only helps if you need per-pixel processing (LUTs, curves, selective color adjustments).

### Low Priority (Minimal Impact)

| Area | File | Why Low Priority |
|------|------|------------------|
| Array Comparison | `StateManager.ts:160-163` | Uses `JSON.stringify()` but impact is <1% of CPU |
| HLS Playlist Parsing | `LoopDownloader.ts:526-605` | Happens once at load time |
| VTT Sprite Parsing | `SpriteLoader.ts:59-97` | Single parse at startup |

---

## Quick Wins Without Additional WASM

1. **Pre-generate watermarks** - Cache watermark images instead of creating them per-download
2. **Replace `JSON.stringify` array comparison** - Use typed comparison in StateManager for buffered ranges
3. **Enable WasmExtractor** - Set `useWasm: true` in ThumbnailManager config to use the existing FFmpeg-based extraction

---

## Implementation Notes

The codebase already has good patterns for WASM integration:

- `WasmExtractor` uses Web Workers to avoid main thread blocking
- Lazy loading of optional dependencies
- Async/await patterns for heavy operations

Any additional WASM should follow the same pattern with Worker threads to maintain UI responsiveness.
