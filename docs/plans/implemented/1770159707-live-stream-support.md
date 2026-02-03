# Live Stream Support Implementation

## Summary
Added live HLS stream detection with "LIVE" badge display in the control bar instead of elapsed time. Updated demo apps with a live stream example.

## Changes Made

### Core Types (`packages/kanjo-player/src/core/types.ts`)
- Added `isLive: boolean` to `KanjoPlayerState` interface
- Added `livestatechange: { isLive: boolean }` to `KanjoPlayerEvents` interface

### State Manager (`packages/kanjo-player/src/core/StateManager.ts`)
- Added `isLive: false` to initial state

### i18n Types (`packages/kanjo-player/src/i18n/types.ts`)
- Added locale keys: `'live.badge'`, `'live.jumpToLive'`, `'loop.notAvailableLive'`

### HLS Plugin (`packages/kanjo-player/src/plugins/built-in/HlsPlugin.ts`)
- Added `HlsLevelDetails` interface for level details type
- Extended `HlsInstance` interface with `liveSyncPosition` and level `details` property
- Added private `isLive` and `useNativeHls` tracking properties
- Added `LEVEL_LOADED` event listener to detect `details.live` boolean
- Added `setLiveState()` method to emit `livestatechange` event and update state
- Added `setupNativeHlsLiveDetection()` for Safari native HLS (duration === Infinity)
- Added `jumpToLive()` method using `hls.liveSyncPosition` or seekable end
- Added `isLiveStream()` public method
- Reset live state on source change

### TimeDisplay (`packages/kanjo-player/src/ui/controls/TimeDisplay.ts`)
- Added `liveBadge: HTMLSpanElement` element with red background and pulsing dot
- Added `isLive` tracking property
- Subscribe to `livestatechange` event
- When live: hide time elements, show clickable red "LIVE" badge
- Click on badge calls `jumpToLive()` on HlsPlugin or seeks to seekable end

### ProgressBar (`packages/kanjo-player/src/ui/controls/ProgressBar.ts`)
- Added `liveMode` tracking property
- Subscribe to `livestatechange` event
- Adds `kanjo-live` class when live (CSS hides scrubber and loop elements)
- Reset live state on source change

### ABLoopControl (`packages/kanjo-player/src/ui/controls/ABLoopControl.ts`)
- Added `liveMode` tracking property
- Subscribe to `livestatechange` event
- Disables all loop buttons for live streams
- Adds `kanjo-live-disabled` class with tooltip explaining unavailability

### SkipControl (`packages/kanjo-player/src/ui/controls/SkipControl.ts`)
- Added `liveMode` tracking property
- Subscribe to `livestatechange` event
- Hides skip forward/back buttons for live streams via `kanjo-live-hidden` class

### SettingsMenu (`packages/kanjo-player/src/ui/controls/SettingsMenu.ts`)
- Added `liveMode` tracking property and references to speed item/submenu
- Subscribe to `livestatechange` event
- Hides playback speed option and submenu for live streams
- Resets playback rate to 1x when entering live mode

### CSS (`packages/kanjo-player/src/styles/kanjo-player.css`)
Added styles for:
- `.kanjo-time-live-badge` - Red badge with pulsing white dot animation
- `@keyframes kanjo-live-pulse` - 1.5s opacity animation
- `.kanjo-time-display.kanjo-live` - Adjusted padding for live mode
- `.kanjo-progress-wrapper.kanjo-live` - Hides scrubber and loop elements
- `.kanjo-abloop-control.kanjo-live-disabled` - Opacity 0.5 and pointer-events none
- `.kanjo-skip-control.kanjo-live-hidden` - display: none for live streams

### i18n Locales
Added translations for live stream strings in all supported locales:
- **en.ts**: LIVE, Jump to live, Loop not available for live streams
- **ja.ts**: ライブ, ライブに移動, ライブ配信ではループ機能は利用できません
- **de.ts**: LIVE, Zum Live-Punkt springen, Schleife nicht verfügbar für Live-Streams
- **es.ts**: EN VIVO, Ir a la transmisión en vivo, El bucle no está disponible...
- **fr.ts**: EN DIRECT, Aller au direct, La boucle n'est pas disponible...
- **ko.ts**: 실시간, 실시간으로 이동, 라이브 스트림에서는 구간 반복을 사용할 수 없습니다
- **zh.ts**: 直播, 跳转到直播, 直播中无法使用循环功能
- **zhTW.ts**: 直播, 跳轉到直播, 直播中無法使用循環功能

### Demo Apps
Added live HLS test stream as first source in:
- `apps/demo-react/src/types.ts`
- `apps/demo-svelte/src/types.ts`
- `apps/demo-vue/src/components/KanjoPlayerDemo.vue`

Live source used: Unified Streaming Live Demo (`https://demo.unified-streaming.com/k8s/live/stable/live.isml/.m3u8`)

## Testing
1. Run `npm run dev` and select the live HLS source (first in list)
2. Verify "LIVE" badge appears instead of time display
3. Verify progress bar hides scrubber for live streams
4. Verify A/B loop controls are disabled with tooltip
5. Verify skip forward/back buttons are hidden
6. Verify playback speed option is hidden in settings menu
7. Click LIVE badge to jump to live edge
8. Switch to VOD source - verify time display returns
9. Verify skip controls and playback speed return for VOD
10. Test in Safari (native HLS) and Chrome (hls.js)

## Notes
- Live detection works for both hls.js (`LEVEL_LOADED` event with `details.live`) and Safari native HLS (`duration === Infinity`)
- The NASA TV live stream URL from the original plan was removed as it may not always be available. Using the more reliable HLS.js test stream instead.
