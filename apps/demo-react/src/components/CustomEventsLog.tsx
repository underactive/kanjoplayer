import { useState, useEffect, useCallback } from 'react'
import type { CustomEventEntry } from '../types'

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

const maxEvents = 50

function CustomEventsLog() {
  const [events, setEvents] = useState<CustomEventEntry[]>([])

  const handleCustomEvent = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail
    setEvents(prev => {
      const newEvent: CustomEventEntry = {
        timestamp: Date.now(),
        buttonId: detail.buttonId,
        eventKey: detail.eventKey,
        value: detail.value,
      }
      const updated = [newEvent, ...prev]
      if (updated.length > maxEvents) {
        updated.pop()
      }
      return updated
    })
  }, [])

  useEffect(() => {
    document.addEventListener('kanjo-custom-event', handleCustomEvent)
    return () => {
      document.removeEventListener('kanjo-custom-event', handleCustomEvent)
    }
  }, [handleCustomEvent])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return (
    <div className="custom-events-log">
      <div className="log-header">
        <h3>Custom Events Log</h3>
        <div className="log-actions">
          <span className="event-count">{events.length} events</span>
          <button onClick={clearEvents} className="clear-btn">Clear</button>
        </div>
      </div>
      <div className="log-entries">
        {events.length === 0 ? (
          <div className="no-events">
            No custom events yet. Click a custom button to see events.
          </div>
        ) : (
          events.map((event, index) => (
            <div key={`${event.timestamp}-${index}`} className="log-entry">
              <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
              <span className="event-key">{event.eventKey}</span>
              <span className="event-value" title={String(event.value)}>
                {formatValue(event.value)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CustomEventsLog
