import { useMemo } from 'react';
import type { VideoEvent } from '../types';

interface EventLogProps {
  events: VideoEvent[];
  onClear: () => void;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions);
}

function getEventClass(type: string): string {
  if (type.includes('error')) return 'error';
  if (type.includes('waiting') || type.includes('stalled')) return 'warning';
  if (type === 'play' || type === 'playing' || type === 'canplaythrough') return 'success';
  if (type.includes('hls-')) return 'hls';
  if (type === 'source-change') return 'info';
  return '';
}

function EventLog({ events, onClear }: EventLogProps) {
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [events]);

  return (
    <div className="event-log">
      <div className="log-header">
        <h2>Event Log</h2>
        <div className="log-actions">
          <span className="event-count">{events.length} events</span>
          <button onClick={onClear} className="clear-btn">
            Clear
          </button>
        </div>
      </div>

      <div className="event-summary">
        {eventCounts.map(([type, count]) => (
          <span key={type} className={`event-badge ${getEventClass(type)}`}>
            {type}: {count}
          </span>
        ))}
      </div>

      <div className="log-entries">
        {events.length === 0 ? (
          <div className="no-events">
            No events recorded yet. Interact with the player to see events.
          </div>
        ) : (
          events.map((event, index) => (
            <div
              key={`${event.timestamp}-${index}`}
              className={`log-entry ${getEventClass(event.type)}`}
            >
              <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
              <span className="event-type">{event.type}</span>
              {event.detail && <span className="event-detail">{event.detail}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default EventLog;
