import { ArrowUpRight, MapPin } from 'lucide-react'
import type { CalendarEvent, EventCategory } from '../../types'
import { formatDate, formatTime } from '../../utils/calendar'

export function EventCard({
  event,
  category,
  onClick,
  compact = false,
}: {
  event: CalendarEvent
  category?: EventCategory
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      className={`event-card ${compact ? 'compact' : ''}`}
      onClick={onClick}
    >
      <span
        className="event-stripe"
        style={{ backgroundColor: category?.color }}
      />
      <div className="event-card-content">
        <div className="event-card-top">
          <span style={{ color: category?.color }}>{category?.name}</span>
          <ArrowUpRight size={14} />
        </div>
        <strong>{event.title}</strong>
        <small>
          {formatDate(event.start_date, { month: 'short', day: 'numeric' })}{' '}
          <span>·</span>{' '}
          {event.all_day ? 'All day' : formatTime(event.start_time)}
        </small>
        {!compact && event.location && (
          <small>
            <MapPin size={12} />
            {event.location}
          </small>
        )}
      </div>
    </button>
  )
}
