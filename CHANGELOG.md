# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-02-02

### Added
- **Internationalization (i18n) support**: Full localization with 8 bundled locales (en, es, fr, de, ja, zh, zhTW, ko)
  - LocaleManager class with type-safe string keys (~70 translatable strings)
  - Runtime locale switching without player recreation
  - Partial locale overrides support
  - String interpolation for dynamic values
  - Language selector in all demo apps
- **Mobile custom button toggle**: Collapsible custom button area on mobile screens (≤480px)
  - Hidden by default, revealed via chevron toggle
  - Smooth slide-in animation with opacity/transform transitions
- **Precise time formatting**: Decimal precision in thumbnail preview when dragging A/B loop markers
- **Pre-commit security audit hook**: Automated security analysis on staged changes using Husky
- **npm publish automation**: `publish.sh` script with quality checks and interactive version bumping

### Fixed
- Volume slider container vertical positioning alignment

### Security
- Add Content Security Policy headers to all demo app Vite configs
- Add Subresource Integrity to hls.js CDN script in vanilla demo
- Implement `escapeHtml` utility for safe HTML string interpolation
- Replace innerHTML with safe DOM methods in ProgressBar and SettingsMenu
- Replace Math.random() with crypto.getRandomValues() for secure ID generation

## [0.20260130.3] - 2026-01-30

### Added
- Cross-demo navigation links (Plain HTML, Vue, React, Svelte) to all demo pages
- GitHub and npm external links in top-right corner of all demo pages

### Changed
- Renamed clip marker tooltips from "loop" to "clip" terminology:
  - "Set loop start point [" → "Set clip start point"
  - "Set loop end point ]" → "Set clip end point"
  - "Loop start (drag to move)" → "Clip start (drag to move)"
  - "Loop end (drag to move)" → "Clip end (drag to move)"

### Fixed
- Duplicate timestamp display in thumbnail preview (removed redundant hover time element)

### Removed
- HTML5 `<video>` tab switcher from Vue demo
- Unused `VideoPlayer.vue` component

## [0.20260130.2] - 2026-01-30

### Added
- Minimal progress bar that appears at the bottom of the player when controls are hidden
  - Configurable via `minimalProgress` option: `enabled`, `thickness`, `opacity`
  - Smooth animation between normal and minimal states
  - Only shows the played portion (transparent track background)

### Fixed
- Loop toggle dropdown menu now correctly appears above the progress bar

## [0.20260130.0] - 2026-01-30

### Added
- initial release