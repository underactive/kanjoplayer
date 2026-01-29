<script setup lang="ts">
import { computed } from 'vue'
import type { VideoState } from '../types/video-stats'

const props = defineProps<{
  state: VideoState
}>()

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`
}

const playbackStats = computed(() => [
  { label: 'Current Time', value: formatTime(props.state.currentTime), raw: props.state.currentTime.toFixed(3) },
  { label: 'Duration', value: formatTime(props.state.duration), raw: props.state.duration.toFixed(3) },
  { label: 'Paused', value: props.state.paused ? 'Yes' : 'No', status: props.state.paused ? 'warning' : 'success' },
  { label: 'Ended', value: props.state.ended ? 'Yes' : 'No', status: props.state.ended ? 'warning' : 'neutral' },
  { label: 'Seeking', value: props.state.seeking ? 'Yes' : 'No', status: props.state.seeking ? 'warning' : 'neutral' },
  { label: 'Playback Rate', value: `${props.state.playbackRate}x` },
])

const bufferStats = computed(() => [
  { label: 'Buffered', value: props.state.buffered },
  { label: 'Seekable', value: props.state.seekable },
  { label: 'Played', value: props.state.played },
])

const volumeStats = computed(() => [
  { label: 'Volume', value: formatPercentage(props.state.volume) },
  { label: 'Muted', value: props.state.muted ? 'Yes' : 'No', status: props.state.muted ? 'warning' : 'neutral' },
])

const dimensionStats = computed(() => [
  { label: 'Video Width', value: `${props.state.videoWidth}px` },
  { label: 'Video Height', value: `${props.state.videoHeight}px` },
  { label: 'Aspect Ratio', value: props.state.videoWidth && props.state.videoHeight
    ? (props.state.videoWidth / props.state.videoHeight).toFixed(3)
    : 'N/A' },
])

const networkStats = computed(() => [
  { label: 'Network State', value: props.state.networkStateText, raw: props.state.networkState.toString() },
  { label: 'Ready State', value: props.state.readyStateText, raw: props.state.readyState.toString() },
  { label: 'Current Src', value: props.state.currentSrc ? truncateUrl(props.state.currentSrc) : 'none', title: props.state.currentSrc },
])

const configStats = computed(() => [
  { label: 'Autoplay', value: props.state.autoplay ? 'Yes' : 'No' },
  { label: 'Controls', value: props.state.controls ? 'Yes' : 'No' },
  { label: 'Loop', value: props.state.loop ? 'Yes' : 'No' },
  { label: 'Preload', value: props.state.preload },
  { label: 'Cross Origin', value: props.state.crossOrigin || 'null' },
])

const capabilityStats = computed(() => [
  { label: 'Can Play MP4', value: props.state.canPlayType_mp4 || 'no', status: getCanPlayStatus(props.state.canPlayType_mp4) },
  { label: 'Can Play WebM', value: props.state.canPlayType_webm || 'no', status: getCanPlayStatus(props.state.canPlayType_webm) },
  { label: 'Can Play HLS', value: props.state.canPlayType_hls || 'no', status: getCanPlayStatus(props.state.canPlayType_hls) },
])

const codecStats = computed(() => [
  { label: 'H.264 (AVC)', value: props.state.codec_h264 ? 'Yes' : 'No', status: props.state.codec_h264 ? 'success' : 'error' },
  { label: 'H.265 (HEVC)', value: props.state.codec_h265 ? 'Yes' : 'No', status: props.state.codec_h265 ? 'success' : 'warning' },
  { label: 'VP9', value: props.state.codec_vp9 ? 'Yes' : 'No', status: props.state.codec_vp9 ? 'success' : 'warning' },
  { label: 'AV1', value: props.state.codec_av1 ? 'Yes' : 'No', status: props.state.codec_av1 ? 'success' : 'warning' },
])

const errorStats = computed(() => [
  { label: 'Error', value: props.state.error || 'none', status: props.state.error ? 'error' : 'success' },
])

function truncateUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength - 3) + '...'
}

function getCanPlayStatus(value: string): string {
  if (value === 'probably') return 'success'
  if (value === 'maybe') return 'warning'
  return 'error'
}
</script>

<template>
  <div class="stats-panel">
    <h2>Stats for Nerds</h2>

    <div class="stats-section">
      <h3>Playback</h3>
      <table>
        <tr v-for="stat in playbackStats" :key="stat.label">
          <td class="stat-label">{{ stat.label }}</td>
          <td class="stat-value" :class="stat.status">
            {{ stat.value }}
            <span v-if="stat.raw" class="raw-value">({{ stat.raw }})</span>
          </td>
        </tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Buffering</h3>
      <table>
        <tr v-for="stat in bufferStats" :key="stat.label">
          <td class="stat-label">{{ stat.label }}</td>
          <td class="stat-value mono">{{ stat.value }}</td>
        </tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Volume</h3>
      <table>
        <tr v-for="stat in volumeStats" :key="stat.label">
          <td class="stat-label">{{ stat.label }}</td>
          <td class="stat-value" :class="stat.status">{{ stat.value }}</td>
        </tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Dimensions</h3>
      <table>
        <tr v-for="stat in dimensionStats" :key="stat.label">
          <td class="stat-label">{{ stat.label }}</td>
          <td class="stat-value">{{ stat.value }}</td>
        </tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Network</h3>
      <table>
        <tr v-for="stat in networkStats" :key="stat.label">
          <td class="stat-label">{{ stat.label }}</td>
          <td class="stat-value" :title="stat.title">
            {{ stat.value }}
            <span v-if="stat.raw" class="raw-value">({{ stat.raw }})</span>
          </td>
        </tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Configuration</h3>
      <table>
        <tr v-for="stat in configStats" :key="stat.label">
          <td class="stat-label">{{ stat.label }}</td>
          <td class="stat-value">{{ stat.value }}</td>
        </tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Capabilities</h3>
      <table>
        <tr v-for="stat in capabilityStats" :key="stat.label">
          <td class="stat-label">{{ stat.label }}</td>
          <td class="stat-value" :class="stat.status">{{ stat.value }}</td>
        </tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Codec Support</h3>
      <table>
        <tr v-for="stat in codecStats" :key="stat.label">
          <td class="stat-label">{{ stat.label }}</td>
          <td class="stat-value" :class="stat.status">{{ stat.value }}</td>
        </tr>
      </table>
    </div>

    <div class="stats-section">
      <h3>Error</h3>
      <table>
        <tr v-for="stat in errorStats" :key="stat.label">
          <td class="stat-label">{{ stat.label }}</td>
          <td class="stat-value" :class="stat.status">{{ stat.value }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<style scoped>
.stats-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  max-height: 600px;
  overflow-y: auto;
}

.stats-panel h2 {
  margin-bottom: 20px;
  font-size: 1.1rem;
  color: var(--accent);
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}

.stats-section {
  margin-bottom: 20px;
}

.stats-section:last-child {
  margin-bottom: 0;
}

.stats-section h3 {
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

tr {
  border-bottom: 1px solid var(--bg-tertiary);
}

tr:last-child {
  border-bottom: none;
}

td {
  padding: 6px 0;
}

.stat-label {
  color: var(--text-secondary);
  width: 45%;
}

.stat-value {
  color: var(--text-primary);
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.stat-value.mono {
  font-size: 0.8rem;
}

.raw-value {
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-left: 5px;
}

.stat-value.success {
  color: var(--success);
}

.stat-value.warning {
  color: var(--warning);
}

.stat-value.error {
  color: var(--error);
}

.stat-value.neutral {
  color: var(--text-primary);
}
</style>
