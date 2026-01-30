# DASH, VP9, and AV1 Support Implementation

**Date:** 2025-01-29
**Status:** Completed

## Overview

Added DASH streaming protocol support and comprehensive VP9/AV1 codec support including detection, streaming preference, and download encoding.

---

## New Files Created

### 1. `packages/kanjo-player/src/plugins/built-in/DashPlugin.ts`

Full DASH.js plugin mirroring HlsPlugin architecture:
- Dynamic import of dash.js with fallback to global `window.dashjs`
- Handles `sourcechange` events for `type === 'dash'`
- Quality selection UI via settings menu submenu
- Emits events: `dashmanifestparsed`, `dashqualitychanged`, `dasherror`
- Error recovery with exponential backoff (max 3 attempts)

### 2. `packages/kanjo-player/src/thumbnails/DashExtractor.ts`

DASH-aware thumbnail extractor:
- Creates separate dash.js instance for thumbnail extraction
- Forces lowest quality for bandwidth efficiency
- Pre-buffers thumbnails distributed evenly across video duration
- Caches thumbnails with 5-second proximity matching

### 3. `packages/kanjo-player/src/core/CodecCapabilities.ts`

Codec capability detection module:
- `isSupported(codec, container)` - sync check via `MediaSource.isTypeSupported()`
- `getDetailedSupport(codec, container)` - async with MediaCapabilities API (includes smooth/powerEfficient flags)
- `getAllCapabilities()` - cached full report with preferred codec determination
- Supports: VP9, AV1, H264, H265 with MP4/WebM containers
- Priority order for preferred codec: AV1 > VP9 > H265 > H264

### 4. `packages/kanjo-player/src/types/dashjs.d.ts`

Type declarations for dashjs (optional peer dependency):
- `DashConfig` interface
- `BitrateInfo` interface
- `MediaPlayerClass` interface
- `MediaPlayerFactory` interface
- `Debug` constants

### 5. `docs/plans/dash-vp9-av1-support.md`

Complete implementation plan document.

---

## Modified Files

### 1. `packages/kanjo-player/src/core/types.ts`

**Added types:**
```typescript
// Source type union
sourceType?: 'mp4' | 'webm' | 'hls' | 'dash';

// DASH quality info
interface DashQuality {
  bitrate: number;
  width: number;
  height: number;
  qualityIndex: number;
  mediaType: 'video' | 'audio';
  codec?: string;
}

// Codec types
type VideoCodec = 'h264' | 'h265' | 'vp9' | 'av1';
type VideoContainer = 'mp4' | 'webm';

interface CodecSupport {
  codec: VideoCodec;
  container: VideoContainer;
  supported: boolean;
  smooth?: boolean;
  powerEfficient?: boolean;
}

interface CodecCapabilitiesResult {
  codecs: CodecSupport[];
  preferredCodec: VideoCodec | null;
}

interface CodecsConfig {
  preferredCodec?: 'auto' | 'h264' | 'h265' | 'vp9' | 'av1';
}
```

**Added events:**
```typescript
dashmanifestparsed: { qualities: DashQuality[] };
dashqualitychanged: { quality: DashQuality; auto: boolean };
dasherror: { code: number; message: string; fatal: boolean };
```

**Updated API:**
```typescript
setSrc(src: string, type?: 'mp4' | 'webm' | 'hls' | 'dash'): void;
getCodecCapabilities(): Promise<CodecCapabilitiesResult>;
isCodecSupported(codec: VideoCodec, container?: VideoContainer): boolean;
```

### 2. `packages/kanjo-player/src/core/KanjoPlayer.ts`

- Updated `detectSourceType()` to recognize `.mpd` URLs
- Updated `setSrc()` to route DASH streams to DashPlugin
- Added `getCodecCapabilities()` method
- Added `isCodecSupported()` method
- Added `codecs` config to merged options

### 3. `packages/kanjo-player/src/thumbnails/ThumbnailManager.ts`

- Added `dashExtractor` property
- Added `useDash` flag
- Added DASH extraction strategy in `doInitialize()`
- Added DASH extractor cleanup in `handleSourceChange()` and `destroy()`
- Added DASH extraction path in `getThumbnail()`

### 4. `packages/kanjo-player/src/download/LoopDownloader.ts`

**Added type:**
```typescript
type VideoCodecOption = 'auto' | 'h264' | 'vp9' | 'av1';
```

**Added option:**
```typescript
interface LoopDownloaderOptions {
  videoCodec?: VideoCodecOption;
}
```

**New methods:**
- `getEffectiveCodec()` - determines codec based on format and preference
- `addVideoCodecArgs()` - adds codec-specific FFmpeg arguments

**Codec configurations:**
- **H.264**: libx264 with CRF 18-28, presets ultrafast/fast/slow
- **VP9**: libvpx-vp9 with CRF 25-35, row-mt enabled
- **AV1**: libaom-av1 with CRF 25-45, tiles 2x2, marked experimental

### 5. `packages/kanjo-player/src/index.ts`

**New exports:**
```typescript
export { CodecCapabilities } from './core/CodecCapabilities';
export { DashPlugin } from './plugins/built-in/DashPlugin';

export type {
  DashQuality,
  VideoCodec,
  VideoContainer,
  CodecSupport,
  CodecCapabilitiesResult,
  CodecsConfig,
} from './core/types';
```

### 6. `packages/kanjo-player/package.json`

**Added peer dependency:**
```json
"peerDependencies": {
  "dashjs": "^4.7.0"
},
"peerDependenciesMeta": {
  "dashjs": {
    "optional": true
  }
}
```

**Added keywords:** `dash`, `vp9`, `av1`

---

## Usage Examples

### DASH Playback

```typescript
import { KanjoPlayer, DashPlugin } from 'kanjo-player';
import 'kanjo-player/style.css';

const player = new KanjoPlayer({
  container: '#player',
  plugins: [new DashPlugin()],
});

// Auto-detect DASH from .mpd extension
player.setSrc('https://example.com/video.mpd');

// Or explicitly specify type
player.setSrc('https://example.com/manifest', 'dash');

// Listen for DASH events
player.on('dashmanifestparsed', ({ qualities }) => {
  console.log('Available qualities:', qualities);
});

player.on('dashqualitychanged', ({ quality, auto }) => {
  console.log(`Quality changed to ${quality.height}p (auto: ${auto})`);
});
```

### Codec Capabilities Detection

```typescript
// Async detailed capabilities
const capabilities = await player.getCodecCapabilities();
console.log('Preferred codec:', capabilities.preferredCodec);
console.log('All codecs:', capabilities.codecs);

// Sync basic check
if (player.isCodecSupported('vp9', 'webm')) {
  console.log('VP9/WebM supported!');
}

if (player.isCodecSupported('av1', 'mp4')) {
  console.log('AV1/MP4 supported!');
}

// Using CodecCapabilities directly
import { CodecCapabilities } from 'kanjo-player';

const vp9Support = await CodecCapabilities.getDetailedSupport('vp9', 'webm');
console.log('VP9 smooth:', vp9Support.smooth);
console.log('VP9 power efficient:', vp9Support.powerEfficient);
```

### Download with VP9/AV1 Encoding

```typescript
import { LoopDownloader } from 'kanjo-player';

// VP9 encoding (recommended for WebM)
const vp9Downloader = new LoopDownloader(player, {
  videoCodec: 'vp9',
  outputFormat: 'webm',
  quality: 'medium',
});

// AV1 encoding (experimental, slow)
const av1Downloader = new LoopDownloader(player, {
  videoCodec: 'av1',
  outputFormat: 'webm',
  quality: 'low', // Use low for faster encoding
});

// H.264 for MP4 (default)
const h264Downloader = new LoopDownloader(player, {
  videoCodec: 'h264',
  outputFormat: 'mp4',
  quality: 'high',
});

// Download clip
const { blob, filename } = await vp9Downloader.prepareDownload(
  startTime,
  endTime,
  (progress) => console.log(progress.message)
);
```

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| DASH.js | ✅ | ✅ | ✅ | ✅ |
| VP9 Playback | ✅ | ✅ | macOS 11+ | ✅ |
| AV1 Playback | ✅ | ✅ | ❌ | ✅ |
| H.265 Playback | ❌ | ❌ | ✅ | ❌ |
| VP9 Encoding | ✅ | ✅ | ✅ | ✅ |
| AV1 Encoding | ✅ (slow) | ✅ (slow) | ✅ (slow) | ✅ (slow) |

---

## Notes

1. **AV1 encoding is experimental** - libaom-av1 in FFmpeg.wasm is very slow. Use VP9 for better performance.

2. **dashjs is optional** - If not installed, DashPlugin will log a warning and DASH streams won't work.

3. **Codec preference** - The `CodecCapabilities.getAllCapabilities()` determines preferred codec based on support and power efficiency.

4. **Quality selection** - Both HLS and DASH plugins add quality selectors to the settings menu automatically.

---

## File Changes Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `src/plugins/built-in/DashPlugin.ts` | Created | ~280 |
| `src/thumbnails/DashExtractor.ts` | Created | ~350 |
| `src/core/CodecCapabilities.ts` | Created | ~150 |
| `src/types/dashjs.d.ts` | Created | ~70 |
| `src/core/types.ts` | Modified | +50 |
| `src/core/KanjoPlayer.ts` | Modified | +25 |
| `src/thumbnails/ThumbnailManager.ts` | Modified | +30 |
| `src/download/LoopDownloader.ts` | Modified | +80 |
| `src/index.ts` | Modified | +10 |
| `package.json` | Modified | +10 |
| `docs/plans/dash-vp9-av1-support.md` | Created | ~100 |
