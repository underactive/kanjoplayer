<script lang="ts">
  import type { VideoState } from '../types'

  interface Props {
    state: VideoState
  }

  let { state }: Props = $props()

  function formatTime(seconds: number): string {
    if (!isFinite(seconds) || isNaN(seconds)) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  function formatPercentage(value: number): string {
    return `${Math.round(value * 100)}%`
  }

  function truncateUrl(url: string, maxLength = 50): string {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength - 3) + '...'
  }

  function getCanPlayStatus(value: string): string {
    if (value === 'probably') return 'success'
    if (value === 'maybe') return 'warning'
    return 'error'
  }

  interface StatItem {
    label: string
    value: string
    raw?: string
    status?: string
    title?: string
  }

  const playbackStats = $derived<StatItem[]>([
    { label: 'Current Time', value: formatTime(state.currentTime), raw: state.currentTime.toFixed(3) },
    { label: 'Duration', value: formatTime(state.duration), raw: state.duration.toFixed(3) },
    { label: 'Paused', value: state.paused ? 'Yes' : 'No', status: state.paused ? 'warning' : 'success' },
    { label: 'Ended', value: state.ended ? 'Yes' : 'No', status: state.ended ? 'warning' : undefined },
    { label: 'Seeking', value: state.seeking ? 'Yes' : 'No', status: state.seeking ? 'warning' : undefined },
    { label: 'Playback Rate', value: `${state.playbackRate}x` },
  ])

  const bufferStats = $derived<StatItem[]>([
    { label: 'Buffered', value: state.buffered },
    { label: 'Seekable', value: state.seekable },
    { label: 'Played', value: state.played },
  ])

  const volumeStats = $derived<StatItem[]>([
    { label: 'Volume', value: formatPercentage(state.volume) },
    { label: 'Muted', value: state.muted ? 'Yes' : 'No', status: state.muted ? 'warning' : undefined },
  ])

  const dimensionStats = $derived<StatItem[]>([
    { label: 'Video Width', value: `${state.videoWidth}px` },
    { label: 'Video Height', value: `${state.videoHeight}px` },
    { label: 'Aspect Ratio', value: state.videoWidth && state.videoHeight
      ? (state.videoWidth / state.videoHeight).toFixed(3)
      : 'N/A' },
  ])

  const networkStats = $derived<StatItem[]>([
    { label: 'Network State', value: state.networkStateText, raw: state.networkState.toString() },
    { label: 'Ready State', value: state.readyStateText, raw: state.readyState.toString() },
    { label: 'Current Src', value: state.currentSrc ? truncateUrl(state.currentSrc) : 'none', title: state.currentSrc },
  ])

  const configStats = $derived<StatItem[]>([
    { label: 'Autoplay', value: state.autoplay ? 'Yes' : 'No' },
    { label: 'Controls', value: state.controls ? 'Yes' : 'No' },
    { label: 'Loop', value: state.loop ? 'Yes' : 'No' },
    { label: 'Preload', value: state.preload },
    { label: 'Cross Origin', value: state.crossOrigin || 'null' },
  ])

  const capabilityStats = $derived<StatItem[]>([
    { label: 'Can Play MP4', value: state.canPlayType_mp4 || 'no', status: getCanPlayStatus(state.canPlayType_mp4) },
    { label: 'Can Play WebM', value: state.canPlayType_webm || 'no', status: getCanPlayStatus(state.canPlayType_webm) },
    { label: 'Can Play HLS', value: state.canPlayType_hls || 'no', status: getCanPlayStatus(state.canPlayType_hls) },
  ])

  const errorStats = $derived<StatItem[]>([
    { label: 'Error', value: state.error || 'none', status: state.error ? 'error' : 'success' },
  ])
</script>

{#snippet statsTable(stats: StatItem[], mono = false)}
  <table>
    <tbody>
      {#each stats as stat}
        <tr>
          <td class="stat-label">{stat.label}</td>
          <td class="stat-value {stat.status || ''} {mono ? 'mono' : ''}" title={stat.title}>
            {stat.value}
            {#if stat.raw}<span class="raw-value">({stat.raw})</span>{/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/snippet}

<div class="stats-panel">
  <h2>Stats for Nerds</h2>

  <div class="stats-section">
    <h3>Playback</h3>
    {@render statsTable(playbackStats)}
  </div>

  <div class="stats-section">
    <h3>Buffering</h3>
    {@render statsTable(bufferStats, true)}
  </div>

  <div class="stats-section">
    <h3>Volume</h3>
    {@render statsTable(volumeStats)}
  </div>

  <div class="stats-section">
    <h3>Dimensions</h3>
    {@render statsTable(dimensionStats)}
  </div>

  <div class="stats-section">
    <h3>Network</h3>
    {@render statsTable(networkStats)}
  </div>

  <div class="stats-section">
    <h3>Configuration</h3>
    {@render statsTable(configStats)}
  </div>

  <div class="stats-section">
    <h3>Capabilities</h3>
    {@render statsTable(capabilityStats)}
  </div>

  <div class="stats-section">
    <h3>Error</h3>
    {@render statsTable(errorStats)}
  </div>
</div>
