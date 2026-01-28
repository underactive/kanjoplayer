<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface CustomEventEntry {
  timestamp: number;
  buttonId: string;
  eventKey: string;
  value: unknown;
}

const events = ref<CustomEventEntry[]>([]);
const maxEvents = 50;

function handleCustomEvent(e: Event) {
  const detail = (e as globalThis.CustomEvent).detail;
  events.value.unshift({
    timestamp: Date.now(),
    buttonId: detail.buttonId,
    eventKey: detail.eventKey,
    value: detail.value,
  });
  if (events.value.length > maxEvents) {
    events.value.pop();
  }
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '(none)';
  }
  if (typeof value === 'string') {
    // Truncate long URLs
    if (value.length > 40) {
      return value.substring(0, 37) + '...';
    }
    return value;
  }
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return JSON.stringify(value);
}

function clearEvents() {
  events.value = [];
}

onMounted(() => {
  document.addEventListener('kanjo-custom-event', handleCustomEvent);
});

onUnmounted(() => {
  document.removeEventListener('kanjo-custom-event', handleCustomEvent);
});
</script>

<template>
  <div class="custom-events-log">
    <div class="log-header">
      <h3>Custom Events Log</h3>
      <div class="log-actions">
        <span class="event-count">{{ events.length }} events</span>
        <button @click="clearEvents" class="clear-btn">Clear</button>
      </div>
    </div>
    <div class="log-entries">
      <div v-for="(event, index) in events" :key="`${event.timestamp}-${index}`" class="log-entry">
        <span class="timestamp">{{ formatTimestamp(event.timestamp) }}</span>
        <span class="event-key">{{ event.eventKey }}</span>
        <span class="event-value" :title="String(event.value)">{{ formatValue(event.value) }}</span>
      </div>
      <div v-if="events.length === 0" class="no-events">
        No custom events yet. Click a custom button to see events.
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-events-log {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  max-height: 400px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}

.log-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
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

.event-key {
  color: var(--accent);
  font-weight: 500;
  min-width: 140px;
}

.event-value {
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-events {
  color: var(--text-secondary);
  text-align: center;
  padding: 40px 20px;
  font-style: italic;
}
</style>
