<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { CustomEventEntry } from '../types'

  let events = $state<CustomEventEntry[]>([])
  const maxEvents = 50

  function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  function formatValue(value: unknown): string {
    if (value === undefined || value === null) {
      return '(none)'
    }
    if (typeof value === 'string') {
      if (value.length > 40) {
        return value.substring(0, 37) + '...'
      }
      return value
    }
    if (typeof value === 'number') {
      return value.toFixed(2)
    }
    return JSON.stringify(value)
  }

  function handleCustomEvent(e: Event) {
    const detail = (e as CustomEvent).detail
    const newEvent: CustomEventEntry = {
      timestamp: Date.now(),
      buttonId: detail.buttonId,
      eventKey: detail.eventKey,
      value: detail.value,
    }
    events = [newEvent, ...events]
    if (events.length > maxEvents) {
      events = events.slice(0, maxEvents)
    }
  }

  function clearEvents() {
    events = []
  }

  onMount(() => {
    document.addEventListener('kanjo-custom-event', handleCustomEvent)
  })

  onDestroy(() => {
    document.removeEventListener('kanjo-custom-event', handleCustomEvent)
  })
</script>

<div class="custom-events-log">
  <div class="log-header">
    <h3>Custom Events Log</h3>
    <div class="log-actions">
      <span class="event-count">{events.length} events</span>
      <button onclick={clearEvents} class="clear-btn">Clear</button>
    </div>
  </div>
  <div class="log-entries">
    {#if events.length === 0}
      <div class="no-events">
        No custom events yet. Click a custom button to see events.
      </div>
    {:else}
      {#each events as event, index (event.timestamp + '-' + index)}
        <div class="log-entry">
          <span class="timestamp">{formatTimestamp(event.timestamp)}</span>
          <span class="event-key">{event.eventKey}</span>
          <span class="event-value" title={String(event.value)}>{formatValue(event.value)}</span>
        </div>
      {/each}
    {/if}
  </div>
</div>
