import { useState } from 'react'
import type { CalendarData } from '../hooks/useCalendarData'
import type { CalendarEvent } from '../types'
import { addDays, dateKey, filterEvents } from '../utils/calendar'
import { EmptyState, SearchInput } from '../components/ui/Shared'
import { EventCard } from '../components/events/EventCard'

export function UpcomingPage({
  data,
  onSelect,
}: {
  data: CalendarData
  onSelect: (event: CalendarEvent) => void
}) {
  const [search, setSearch] = useState('')
  const today = dateKey()
  const tomorrow = addDays(today, 1)
  const weekEnd = addDays(today, 6 - new Date().getDay())
  const events = filterEvents(
    data.events,
    {
      search,
      categories: data.categories.map((c) => c.id),
      employee: '',
      status: '',
      date: '',
    },
    data.employees,
  )
    .filter(
      (e) => (e.end_date || e.start_date) >= today && e.status !== 'cancelled',
    )
    .sort(
      (a, b) =>
        a.start_date.localeCompare(b.start_date) ||
        (a.start_time || '').localeCompare(b.start_time || ''),
    )
  const groups = [
    { title: 'Today', entries: events.filter((e) => e.start_date <= today) },
    {
      title: 'Tomorrow',
      entries: events.filter((e) => e.start_date === tomorrow),
    },
    {
      title: 'This week',
      entries: events.filter(
        (e) => e.start_date > tomorrow && e.start_date <= weekEnd,
      ),
    },
    {
      title: 'Later',
      entries: events.filter(
        (e) => e.start_date > tomorrow && e.start_date > weekEnd,
      ),
    },
  ]
  return (
    <div className="content-panel upcoming-page">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search upcoming entries…"
      />
      {events.length ? (
        groups
          .filter((g) => g.entries.length)
          .map((group) => (
            <section key={group.title} className="upcoming-group">
              <h3>
                {group.title}
                <span className="count-badge">{group.entries.length}</span>
              </h3>
              <div className="event-card-grid">
                {group.entries.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    category={data.categories.find(
                      (c) => c.id === event.category_id,
                    )}
                    onClick={() => onSelect(event)}
                  />
                ))}
              </div>
            </section>
          ))
      ) : (
        <EmptyState
          title="No upcoming office activities"
          description="New activities and important dates will appear here."
        />
      )}
    </div>
  )
}
