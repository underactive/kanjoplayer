# Plan: Add DASH, VP9, and AV1 Support

## Overview

Add DASH streaming protocol support and comprehensive VP9/AV1 codec support including detection, streaming preference, and download encoding.

---

## Part 1: DASH Streaming Support

### 1.1 New Files

**`packages/kanjo-player/src/plugins/built-in/DashPlugin.ts`**
- Mirror HlsPlugin architecture using dash.js library
- Dynamic import of dash.js with fallback
- Handle `sourcechange` events for `type === 'dash'`
- Quality selection UI via settings menu
- Emit events: `dashmanifestparsed`, `dashqualitychanged`, `dasherror`
- Error recovery with auto-reload

**`packages/kanjo-player/src/thumbnails/DashExtractor.ts`**
- Mirror HlsExtractor for DASH streams
- Create separate dash.js instance for thumbnail extraction
- Force lowest quality for bandwidth efficiency

### 1.2 Modifications

**`packages/kanjo-player/src/core/types.ts`**
- Add `'dash'` to `sourceType` union
- Add DASH event types and interfaces (`DashQuality`, `DashPeriod`)

**`packages/kanjo-player/src/core/KanjoPlayer.ts`**
- Update `detectSourceType()` to recognize `.mpd` URLs
- Update `setSrc()` to route DASH to plugin (like HLS)

**`packages/kanjo-player/src/thumbnails/ThumbnailManager.ts`**
- Add DASH extraction strategy with DashExtractor

**`packages/kanjo-player/src/index.ts`**
- Export `DashPlugin` and DASH types

**`packages/kanjo-player/package.json`**
- Add `dashjs` as optional peer dependency

---

## Part 2: Codec Capability Detection

### 2.1 New File

**`packages/kanjo-player/src/core/CodecCapabilities.ts`**
```typescript
// Key exports:
- CodecCapabilities.isSupported(codec, container) // sync check
- CodecCapabilities.getDetailedSupport(codec, container) // async with MediaCapabilities API
- CodecCapabilities.getAllCapabilities() // cached full report
```

Supported codecs: `vp9`, `av1`, `h264`, `h265`
Supported containers: `mp4`, `webm`

### 2.2 Player API Extensions

**`packages/kanjo-player/src/core/KanjoPlayer.ts`**
```typescript
// New methods:
getCodecCapabilities(): Promise<CodecCapabilitiesResult>
isCodecSupported(codec: string, container?: string): boolean
```

---

## Part 3: Adaptive Streaming Codec Preference

### 3.1 Configuration

**`packages/kanjo-player/src/core/types.ts`**
```typescript
interface KanjoPlayerOptions {
  codecs?: {
    preferredCodec?: 'auto' | 'h264' | 'h265' | 'vp9' | 'av1';
  };
}
```

### 3.2 Plugin Integration

**HlsPlugin.ts & DashPlugin.ts**
- Filter/sort quality levels by preferred codec when available
- Fall back gracefully if preferred codec not in manifest

---

## Part 4: Download Encoding Support

### 4.1 Modifications

**`packages/kanjo-player/src/download/LoopDownloader.ts`**
```typescript
interface LoopDownloaderOptions {
  videoCodec?: 'auto' | 'h264' | 'vp9' | 'av1';
}
```

- Add VP9 encoding for WebM output (libvpx-vp9)
- Add AV1 encoding option (libaom-av1) - mark experimental
- Update FFmpeg args builder for codec selection

---

## File Changes Summary

| File | Action |
|------|--------|
| `src/plugins/built-in/DashPlugin.ts` | Create |
| `src/thumbnails/DashExtractor.ts` | Create |
| `src/core/CodecCapabilities.ts` | Create |
| `src/core/types.ts` | Modify - add DASH types, codec config |
| `src/core/KanjoPlayer.ts` | Modify - DASH detection, codec API |
| `src/thumbnails/ThumbnailManager.ts` | Modify - add DASH strategy |
| `src/download/LoopDownloader.ts` | Modify - codec selection |
| `src/index.ts` | Modify - exports |
| `package.json` | Modify - dashjs peer dep |

---

## Demo App Updates

- Add DASH test sources (Big Buck Bunny MPD, etc.)
- Display codec capabilities in stats panel
- Show current codec in quality selector

---

## Verification

1. **DASH playback**: Load `.mpd` stream, verify quality switching works
2. **Codec detection**: Call `player.getCodecCapabilities()`, verify results match browser
3. **Codec preference**: Set preferred codec, verify correct track selected
4. **VP9 download**: Download clip as WebM, verify VP9 encoding
5. **Thumbnails**: Hover progress bar on DASH stream, verify thumbnails load
6. **Cross-browser**: Test Chrome, Firefox, Safari, Edge

---

## Browser Support Notes

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| DASH.js | ✅ | ✅ | ✅ | ✅ |
| VP9 | ✅ | ✅ | macOS 11+ only | ✅ |
| AV1 | ✅ | ✅ | ❌ | ✅ |
| H.265 | ❌ | ❌ | ✅ | ❌ |
