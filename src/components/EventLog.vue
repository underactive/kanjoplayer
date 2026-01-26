<script setup lang="ts">
import { computed } from 'vue'
import type { VideoEvent } from '../types/video-stats'

const props = defineProps<{
  events: VideoEvent[]
}>()

const emit = defineEmits<{
  clear: []
}>()

function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })
}

function getEventClass(type: string): string {
  if (type.includes('error')) return 'error'
  if (type.includes('waiting') || type.includes('stalled')) return 'warning'
  if (type === 'play' || type === 'playing' || type === 'canplaythrough') return 'success'
  if (type.includes('hls-')) return 'hls'
  if (type === 'source-change') return 'info'
  return ''
}

const eventCounts = computed(() => {
  const counts: Record<string, number> = {}
  props.events.forEach((e) => {
    counts[e.type] = (counts[e.type] || 0) + 1
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
})
</script>

<template>
  <div class="event-log">
    <div class="log-header">
      <h2>Event Log</h2>
      <div class="log-actions">
        <span class="event-count">{{ events.length }} events</span>
        <button @click="emit('clear')" class="clear-btn">Clear</button>
      </div>
    </div>

    <div class="event-summary">
      <span
        v-for="[type, count] in eventCounts"
        :key="type"
        class="event-badge"
        :class="getEventClass(type)"
      >
        {{ type }}: {{ count }}
      </span>
    </div>

    <div class="log-entries">
      <div
        v-for="(event, index) in events"
        :key="`${event.timestamp}-${index}`"
        class="log-entry"
        :class="getEventClass(event.type)"
      >
        <span class="timestamp">{{ formatTimestamp(event.timestamp) }}</span>
        <span class="event-type">{{ event.type }}</span>
        <span v-if="event.detail" class="event-detail">{{ event.detail }}</span>
      </div>
      <div v-if="events.length === 0" class="no-events">
        No events recorded yet. Interact with the player to see events.
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-log {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  max-height: 600px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}

.log-header h2 {
  font-size: 1.1rem;
  color: var(--accent);
}

.log-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.event-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.clear-btn {
  padding: 5px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
}

.event-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--bg-tertiary);
}

.event-badge {
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  font-size: 0.7rem;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  color: var(--text-secondary);
}

.event-badge.error {
  background: rgba(239, 68, 68, 0.2);
  color: var(--error);
}

.event-badge.warning {
  background: rgba(251, 191, 36, 0.2);
  color: var(--warning);
}

.event-badge.success {
  background: rgba(74, 222, 128, 0.2);
  color: var(--success);
}

.event-badge.hls {
  background: rgba(34, 211, 153, 0.2);
  color: #34d399;
}

.event-badge.info {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

.log-entries {
  flex: 1;
  overflow-y: auto;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 0.8rem;
}

.log-entry {
  display: flex;
  gap: 12px;
  padding: 6px 8px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.log-entry:hover {
  background: var(--bg-tertiary);
}

.timestamp {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.event-type {
  font-weight: 500;
  min-width: 120px;
}

.event-detail {
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-entry.error .event-type {
  color: var(--error);
}

.log-entry.warning .event-type {
  color: var(--warning);
}

.log-entry.success .event-type {
  color: var(--success);
}

.log-entry.hls .event-type {
  color: #34d399;
}

.log-entry.info .event-type {
  color: #60a5fa;
}

.no-events {
  color: var(--text-secondary);
  text-align: center;
  padding: 40px 20px;
  font-style: italic;
}
</style>
