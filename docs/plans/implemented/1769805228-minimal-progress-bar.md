# Minimal Progress Bar Implementation

**Epoch:** 1769805228
**Date:** 2026-01-30

## Summary

Added a configurable minimal progress bar that appears at the bottom of the player when controls are hidden. The progress bar animates smoothly from its normal position above the controls row down to the bottom edge when controls hide, and reverses when controls reappear.

## Deviations from Original Plan

1. **Thickness changed from 2px to 3px** - The 2px bar was too subtle; 3px provides better visibility
2. **Track background made transparent** - Only the "played" portion shows; unwatched portion is invisible
3. **Added configuration options** - The minimal progress bar is now fully configurable via `minimalProgress` option
4. **Flexbox layout for alignment** - Used `display: flex; flex-direction: column; justify-content: flex-end;` to properly align the progress bar at the bottom of the wrapper
5. **Custom button area spacing** - Added `margin-bottom: 26px` to `.kanjo-custom-button-area` to prevent overlap with the progress bar
6. **Loop markers hidden with !important** - Required `!important` to override the `.kanjo-visible` class on active markers

## Configuration Options Added

New `MinimalProgressConfig` interface in `types.ts`:

```typescript
interface MinimalProgressConfig {
  /** Enable minimal progress bar when controls are hidden (default: true) */
  enabled?: boolean;
  /** Thickness of the minimal progress bar in pixels (default: 3) */
  thickness?: number;
  /** Opacity of the progress bar 0-1 (default: 1, fully opaque) */
  opacity?: number;
}
```

Usage:
```typescript
new KanjoPlayer({
  container: '#player',
  src: 'video.mp4',
  minimalProgress: {
    enabled: true,
    thickness: 4,
    opacity: 0.8,
  },
});
```

## Files Modified

### 1. `packages/kanjo-player/src/core/types.ts`
- Added `MinimalProgressConfig` interface
- Added `minimalProgress` to `KanjoPlayerOptions`
- Added default values in `DEFAULT_OPTIONS`

### 2. `packages/kanjo-player/src/core/KanjoPlayer.ts`
- Added `applyMinimalProgressConfig()` method
- Sets CSS custom properties `--kanjo-progress-minimal-height` and `--kanjo-progress-minimal-opacity`
- Adds `kanjo-minimal-progress-disabled` class when disabled

### 3. `packages/kanjo-player/src/styles/_variables.css`
- Added `--kanjo-progress-minimal-height: 3px;`

### 4. `packages/kanjo-player/src/ui/ControlsOverlay.ts`
- Moved progress bar from inside `.kanjo-controls-bottom` to be a sibling in `.kanjo-controls-overlay`
- Progress bar now animates independently rather than fading with controls

### 5. `packages/kanjo-player/src/styles/kanjo-player.css`

#### Progress wrapper positioning
```css
.kanjo-progress-wrapper {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(var(--kanjo-btn-size) + var(--kanjo-controls-padding) + 8px);
  padding: 8px var(--kanjo-controls-padding);
  z-index: var(--kanjo-z-controls);
  transition: bottom var(--kanjo-transition-normal),
              padding var(--kanjo-transition-normal);
}
```

#### Minimal mode styles
```css
.kanjo-controls-hidden .kanjo-progress-wrapper {
  bottom: 0 !important;
  padding: 0 !important;
  opacity: var(--kanjo-progress-minimal-opacity, 1);
  visibility: visible;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.kanjo-minimal-progress-disabled .kanjo-controls-hidden .kanjo-progress-wrapper {
  display: none !important;
}
```

#### Minimal track (transparent background, only shows played portion)
```css
.kanjo-controls-hidden .kanjo-progress-track {
  height: var(--kanjo-progress-minimal-height);
  border-radius: 0;
  background: transparent;
}
```

#### Hidden interactive elements with !important
```css
.kanjo-controls-hidden .kanjo-progress-scrubber,
.kanjo-controls-hidden .kanjo-progress-hover-time,
.kanjo-controls-hidden .kanjo-progress-buffered,
.kanjo-controls-hidden .kanjo-loop-marker,
.kanjo-controls-hidden .kanjo-loop-region,
.kanjo-controls-hidden .kanjo-thumbnail-preview,
.kanjo-controls-hidden .kanjo-zoom-indicator {
  opacity: 0 !important;
  pointer-events: none !important;
}
```

#### Custom button area spacing
```css
.kanjo-custom-button-area {
  /* ... existing styles ... */
  margin-bottom: 26px;
}
```

## DOM Structure

**New structure:**
```
.kanjo-controls-overlay
├── .kanjo-loading-indicator
├── .kanjo-center-play
├── .kanjo-controls-gradient
├── .kanjo-progress-wrapper  <-- sibling, animates independently
│   ├── .kanjo-thumbnail-preview
│   ├── .kanjo-zoom-indicator
│   └── .kanjo-progress-container
│       └── .kanjo-progress-track
│           ├── .kanjo-progress-buffered
│           ├── .kanjo-loop-region
│           ├── .kanjo-progress-played
│           ├── .kanjo-loop-marker (start)
│           ├── .kanjo-loop-marker (end)
│           └── .kanjo-progress-scrubber
└── .kanjo-controls-bottom
    ├── .kanjo-custom-button-area (optional)
    └── .kanjo-controls-row
```

## Testing Verified

- [x] Play video and let controls auto-hide → progress bar slides down to bottom
- [x] Move mouse → controls appear, progress bar slides back up
- [x] Smooth transition animation
- [x] Works correctly in fullscreen mode
- [x] A/B loop markers hide in minimal mode
- [x] Only played portion visible (no grey track background)
- [x] Custom buttons don't overlap with progress bar
- [x] Configuration options work (enabled, thickness, opacity)
- [x] All lint and type checks pass
