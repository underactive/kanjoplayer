# WASM Usage in KanjoPlayer

This document covers WebAssembly usage in KanjoPlayer and potential areas for WASM-based performance improvements.

## Current WASM Components

### 1. JpegEncoder (`src/lib/thumbnails/encoder/JpegEncoder.ts`)

**NEW** - WASM-based JPEG encoding for thumbnail generation.

- Uses `@jsquash/jpeg` (MozJPEG compiled to WASM) for fast JPEG encoding
- Singleton pattern with lazy initialization
- Auto-releases after 30 seconds of inactivity
- Automatic fallback to `canvas.toDataURL()` if WASM fails
- Integrated into both `CanvasExtractor` and `HlsExtractor`

```typescript
// Usage (internal)
const encoder = JpegEncoder.getInstance();
const dataUrl = await encoder.encode(imageData, 70); // quality 1-100
```

### 2. WasmExtractor (`src/lib/thumbnails/WasmExtractor.ts`)

Extracts video thumbnails using FFmpeg.wasm.

- Uses a Web Worker (`src/lib/thumbnails/worker/ffmpeg.worker.ts`) to run FFmpeg off the main thread
- Message types defined in `src/lib/thumbnails/worker/messages.ts`
- Currently **not enabled** in ThumbnailManager's fallback chain (config `useWasm` defaults to false)

### 3. LoopDownloader (`src/lib/download/LoopDownloader.ts`)

Downloads A/B loop video segments using FFmpeg.wasm.

- Loads FFmpeg core from CDN via `toBlobURL()`
- Supports both direct video files and HLS streams
- Includes watermark support (optimized with `canvas.toBlob()`)

## Configuration Files

| File | WASM-related config |
|------|---------------------|
| `vite.config.ts` | COOP/COEP headers, `vite-plugin-wasm`, `vite-plugin-top-level-await` |
| `vite.config.lib.ts` | Externalizes `@ffmpeg/ffmpeg`, `@ffmpeg/util`, `@jsquash/jpeg` as peer deps |
| `package.json` | Optional peer dependencies for FFmpeg and jSquash packages |
| `src/lib/vite-env.d.ts` | Type declarations for FFmpeg modules |

## Requirements

- WASM features check support via `typeof WebAssembly !== 'undefined'`
- FFmpeg and jSquash packages are **optional peer dependencies** - not bundled
- SharedArrayBuffer requires these headers:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: credentialless`

---

## Implementation Status

### High Priority - IMPLEMENTED

| Area | File | Implementation | Status |
|------|------|----------------|--------|
| JPEG Encoding | `CanvasExtractor.ts` | Uses `JpegEncoder` with MozJPEG WASM | Done |
| JPEG Encoding | `HlsExtractor.ts` | Uses `JpegEncoder` with MozJPEG WASM | Done |

Both extractors now use WASM-accelerated JPEG encoding via `@jsquash/jpeg`, with automatic fallback to `canvas.toDataURL()` when WASM is unavailable.

### Medium Priority - PARTIALLY IMPLEMENTED

| Area | File | Implementation | Status |
|------|------|----------------|--------|
| Watermark Generation | `LoopDownloader.ts` | Optimized with `canvas.toBlob()` (no base64 round-trip) | Done (non-WASM) |
| Custom Video Filters | `VideoAdjustmentsPanel.ts` | CSS/SVG filters (GPU-accelerated) | No change needed* |

*CSS filters are already GPU-accelerated. WASM only helps if you need per-pixel processing (LUTs, curves, selective color adjustments).

### Low Priority (Minimal Impact)

| Area | File | Why Low Priority |
|------|------|------------------|
| Array Comparison | `StateManager.ts` | Uses `JSON.stringify()` but impact is <1% of CPU |
| HLS Playlist Parsing | `LoopDownloader.ts` | Happens once at load time |
| VTT Sprite Parsing | `SpriteLoader.ts` | Single parse at startup |

---

## Future Enhancements

### LUT (Look-Up Table) Support

For advanced color grading, WASM-based LUT application could be added to `VideoAdjustmentsPanel`:

- Load `.cube` or `.3dl` LUT files
- Apply per-pixel color transformations via WebGL or WASM
- Would require frame-by-frame processing or WebGL shader approach

### Custom Curves

Photoshop-style RGB curves for fine-grained color control:

- WASM would process pixel data in real-time
- Could use canvas + ImageData or WebGL for GPU acceleration

---

## Fallback Behavior

All WASM components implement graceful fallback:

```
JpegEncoder:
  1. Try @jsquash/jpeg WASM encoding
  2. On failure → switch to canvas.toDataURL() permanently

WasmExtractor:
  1. Try FFmpeg.wasm extraction
  2. On failure → extraction fails (other extractors used instead)

LoopDownloader:
  1. Requires FFmpeg.wasm (no fallback - feature requires it)
```

---

## Troubleshooting

### WASM encode fails immediately

Check browser console for:
- `[JpegEncoder] WASM encoder loaded` - Success
- `[JpegEncoder] Failed to load WASM encoder` - Module load failed
- `[JpegEncoder] WASM encode failed, switching to fallback` - Encoding failed

Common causes:
1. Missing `@jsquash/jpeg` peer dependency
2. MIME type issues with dev server (should be fixed with `vite-plugin-wasm`)
3. Browser doesn't support WebAssembly

### SharedArrayBuffer errors

Ensure your server sends these headers:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

For Vite dev server, these are configured in `vite.config.ts`.
