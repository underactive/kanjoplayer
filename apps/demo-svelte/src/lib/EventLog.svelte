<script lang="ts">
  import type { VideoEvent } from '../types'

  interface Props {
    events: VideoEvent[]
    onClear: () => void
  }

  let { events, onClear }: Props = $props()

  function formatTimestamp(ts: number): string {
    const date = new Date(ts)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    } as Intl.DateTimeFormatOptions)
  }

  function getEventClass(type: string): string {
    if (type.includes('error')) return 'error'
    if (type.includes('waiting') || type.includes('stalled')) return 'warning'
    if (type === 'play' || type === 'playing' || type === 'canplaythrough') return 'success'
    if (type.includes('hls-')) return 'hls'
    if (type === 'source-change') return 'info'
    return ''
  }

  const eventCounts = $derived(() => {
    const counts: Record<string, number> = {}
    events.forEach((e) => {
      counts[e.type] = (counts[e.type] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  })
</script>

<div class="event-log">
  <div class="log-header">
    <h2>Event Log</h2>
    <div class="log-actions">
      <span class="event-count">{events.length} events</span>
      <button onclick={onClear} class="clear-btn">Clear</button>
    </div>
  </div>

  <div class="event-summary">
    {#each eventCounts() as [type, count]}
      <span class="event-badge {getEventClass(type)}">{type}: {count}</span>
    {/each}
  </div>

  <div class="log-entries">
    {#if events.length === 0}
      <div class="no-events">
        No events recorded yet. Interact with the player to see events.
      </div>
    {:else}
      {#each events as event, index (event.timestamp + '-' + index)}
        <div class="log-entry {getEventClass(event.type)}">
          <span class="timestamp">{formatTimestamp(event.timestamp)}</span>
          <span class="event-type">{event.type}</span>
          {#if event.detail}
            <span class="event-detail">{event.detail}</span>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
