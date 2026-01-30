# Minimal Progress Bar Implementation Plan

**Epoch:** 1769805228
**Date:** 2026-01-30

## Summary

Add a minimal 2-pixel progress bar that appears at the bottom of the player when controls are hidden. The main scrubber bar will animate smoothly down and transform into the minimal bar when controls hide, and reverse when controls reappear.

## Approach

Move the progress bar outside of `.kanjo-controls-bottom` so it can animate independently (rather than fading out with the controls). Use CSS transitions to animate:
- Position from above controls row → bottom edge
- Height from 4px → 2px
- Hide non-essential elements (scrubber, markers, buffered bar)

## Files to Modify

1. **`packages/kanjo-player/src/ui/ControlsOverlay.ts`** - Restructure DOM
2. **`packages/kanjo-player/src/styles/_variables.css`** - Add new CSS variable
3. **`packages/kanjo-player/src/styles/kanjo-player.css`** - Add minimal state CSS

## Implementation Details

### 1. DOM Restructure (ControlsOverlay.ts)

**Current:**
```
.kanjo-controls-overlay
├── .kanjo-center-play
├── .kanjo-controls-gradient
└── .kanjo-controls-bottom
    ├── .kanjo-progress-wrapper  <-- fades with controls
    └── .kanjo-controls-row
```

**New:**
```
.kanjo-controls-overlay
├── .kanjo-center-play
├── .kanjo-controls-gradient
├── .kanjo-progress-wrapper  <-- sibling, animates independently
└── .kanjo-controls-bottom
    └── .kanjo-controls-row
```

Changes in `createElement()`:
- Insert progress bar before bottomBar in overlay

Changes in `createBottomBar()`:
- Remove the line that appends progress bar to bottomBar (line 184)

### 2. CSS Variables (_variables.css)

Add:
```css
--kanjo-progress-minimal-height: 2px;
```

### 3. CSS Changes (kanjo-player.css)

**Update `.kanjo-progress-wrapper`** - absolute positioning with animation:
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

/* Minimal mode when controls hidden */
.kanjo-controls-hidden .kanjo-progress-wrapper {
  bottom: 0;
  padding: 0;
}
```

**Update `.kanjo-progress-track`** - height animation:
```css
.kanjo-progress-track {
  /* existing styles... */
  transition: height var(--kanjo-transition-normal),
              border-radius var(--kanjo-transition-normal);
}

.kanjo-controls-hidden .kanjo-progress-track {
  height: var(--kanjo-progress-minimal-height);
  border-radius: 0;
}

/* Disable hover growth in minimal mode */
.kanjo-controls-hidden .kanjo-progress-container:hover .kanjo-progress-track {
  height: var(--kanjo-progress-minimal-height);
}
```

**Hide interactive elements in minimal mode:**
```css
.kanjo-controls-hidden .kanjo-progress-scrubber,
.kanjo-controls-hidden .kanjo-progress-hover-time,
.kanjo-controls-hidden .kanjo-progress-buffered,
.kanjo-controls-hidden .kanjo-loop-marker,
.kanjo-controls-hidden .kanjo-loop-region,
.kanjo-controls-hidden .kanjo-thumbnail-preview,
.kanjo-controls-hidden .kanjo-zoom-indicator {
  opacity: 0;
  pointer-events: none;
}

.kanjo-controls-hidden .kanjo-progress-container {
  pointer-events: none;
  cursor: default;
}

.kanjo-controls-hidden .kanjo-progress-played {
  border-radius: 0;
}
```

**Fullscreen adjustments:**
```css
.kanjo-player:fullscreen .kanjo-progress-wrapper,
.kanjo-player:-webkit-full-screen .kanjo-progress-wrapper {
  bottom: calc(var(--kanjo-btn-size) + 16px + 8px);
  padding: 8px 24px;
}

.kanjo-player:fullscreen .kanjo-controls-hidden .kanjo-progress-wrapper,
.kanjo-player:-webkit-full-screen .kanjo-controls-hidden .kanjo-progress-wrapper {
  bottom: 0;
  padding: 0;
}
```

## Verification

1. Run `npm run dev` to start the vanilla demo
2. Test scenarios:
   - Play video and let controls auto-hide → progress bar should slide down and become 2px
   - Move mouse → controls appear, progress bar slides back up
   - Verify smooth 250ms transition
   - Test in fullscreen mode
   - Test with A/B loop markers active (they should hide in minimal mode)
   - Test on mobile viewport (browser dev tools)
3. Run `npm run lint` and `npm run typecheck`
