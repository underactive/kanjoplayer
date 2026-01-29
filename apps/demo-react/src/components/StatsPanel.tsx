import { useMemo } from 'react'
import type { VideoState } from '../types'

interface StatsPanelProps {
  state: VideoState
}

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

function StatsPanel({ state }: StatsPanelProps) {
  const playbackStats = useMemo<StatItem[]>(() => [
    { label: 'Current Time', value: formatTime(state.currentTime), raw: state.currentTime.toFixed(3) },
    { label: 'Duration', value: formatTime(state.duration), raw: state.duration.toFixed(3) },
    { label: 'Paused', value: state.paused ? 'Yes' : 'No', status: state.paused ? 'warning' : 'success' },
    { label: 'Ended', value: state.ended ? 'Yes' : 'No', status: state.ended ? 'warning' : undefined },
    { label: 'Seeking', value: state.seeking ? 'Yes' : 'No', status: state.seeking ? 'warning' : undefined },
    { label: 'Playback Rate', value: `${state.playbackRate}x` },
  ], [state.currentTime, state.duration, state.paused, state.ended, state.seeking, state.playbackRate])

  const bufferStats = useMemo<StatItem[]>(() => [
    { label: 'Buffered', value: state.buffered },
    { label: 'Seekable', value: state.seekable },
    { label: 'Played', value: state.played },
  ], [state.buffered, state.seekable, state.played])

  const volumeStats = useMemo<StatItem[]>(() => [
    { label: 'Volume', value: formatPercentage(state.volume) },
    { label: 'Muted', value: state.muted ? 'Yes' : 'No', status: state.muted ? 'warning' : undefined },
  ], [state.volume, state.muted])

  const dimensionStats = useMemo<StatItem[]>(() => [
    { label: 'Video Width', value: `${state.videoWidth}px` },
    { label: 'Video Height', value: `${state.videoHeight}px` },
    { label: 'Aspect Ratio', value: state.videoWidth && state.videoHeight
      ? (state.videoWidth / state.videoHeight).toFixed(3)
      : 'N/A' },
  ], [state.videoWidth, state.videoHeight])

  const networkStats = useMemo<StatItem[]>(() => [
    { label: 'Network State', value: state.networkStateText, raw: state.networkState.toString() },
    { label: 'Ready State', value: state.readyStateText, raw: state.readyState.toString() },
    { label: 'Current Src', value: state.currentSrc ? truncateUrl(state.currentSrc) : 'none', title: state.currentSrc },
  ], [state.networkStateText, state.networkState, state.readyStateText, state.readyState, state.currentSrc])

  const configStats = useMemo<StatItem[]>(() => [
    { label: 'Autoplay', value: state.autoplay ? 'Yes' : 'No' },
    { label: 'Controls', value: state.controls ? 'Yes' : 'No' },
    { label: 'Loop', value: state.loop ? 'Yes' : 'No' },
    { label: 'Preload', value: state.preload },
    { label: 'Cross Origin', value: state.crossOrigin || 'null' },
  ], [state.autoplay, state.controls, state.loop, state.preload, state.crossOrigin])

  const capabilityStats = useMemo<StatItem[]>(() => [
    { label: 'Can Play MP4', value: state.canPlayType_mp4 || 'no', status: getCanPlayStatus(state.canPlayType_mp4) },
    { label: 'Can Play WebM', value: state.canPlayType_webm || 'no', status: getCanPlayStatus(state.canPlayType_webm) },
    { label: 'Can Play HLS', value: state.canPlayType_hls || 'no', status: getCanPlayStatus(state.canPlayType_hls) },
  ], [state.canPlayType_mp4, state.canPlayType_webm, state.canPlayType_hls])

  const codecStats = useMemo<StatItem[]>(() => [
    { label: 'H.264 (AVC)', value: state.codec_h264 ? 'Yes' : 'No', status: state.codec_h264 ? 'success' : 'error' },
    { label: 'H.265 (HEVC)', value: state.codec_h265 ? 'Yes' : 'No', status: state.codec_h265 ? 'success' : 'warning' },
    { label: 'VP9', value: state.codec_vp9 ? 'Yes' : 'No', status: state.codec_vp9 ? 'success' : 'warning' },
    { label: 'AV1', value: state.codec_av1 ? 'Yes' : 'No', status: state.codec_av1 ? 'success' : 'warning' },
  ], [state.codec_h264, state.codec_h265, state.codec_vp9, state.codec_av1])

  const errorStats = useMemo<StatItem[]>(() => [
    { label: 'Error', value: state.error || 'none', status: state.error ? 'error' : 'success' },
  ], [state.error])

  const renderTable = (stats: StatItem[], mono = false) => (
    <table>
      <tbody>
        {stats.map((stat) => (
          <tr key={stat.label}>
            <td className="stat-label">{stat.label}</td>
            <td
              className={`stat-value ${stat.status || ''} ${mono ? 'mono' : ''}`}
              title={stat.title}
            >
              {stat.value}
              {stat.raw && <span className="raw-value">({stat.raw})</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="stats-panel">
      <h2>Stats for Nerds</h2>

      <div className="stats-section">
        <h3>Playback</h3>
        {renderTable(playbackStats)}
      </div>

      <div className="stats-section">
        <h3>Buffering</h3>
        {renderTable(bufferStats, true)}
      </div>

      <div className="stats-section">
        <h3>Volume</h3>
        {renderTable(volumeStats)}
      </div>

      <div className="stats-section">
        <h3>Dimensions</h3>
        {renderTable(dimensionStats)}
      </div>

      <div className="stats-section">
        <h3>Network</h3>
        {renderTable(networkStats)}
      </div>

      <div className="stats-section">
        <h3>Configuration</h3>
        {renderTable(configStats)}
      </div>

      <div className="stats-section">
        <h3>Capabilities</h3>
        {renderTable(capabilityStats)}
      </div>

      <div className="stats-section">
        <h3>Codec Support</h3>
        {renderTable(codecStats)}
      </div>

      <div className="stats-section">
        <h3>Error</h3>
        {renderTable(errorStats)}
      </div>
    </div>
  )
}

export default StatsPanel
