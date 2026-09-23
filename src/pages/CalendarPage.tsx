import { useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CalendarEvent } from '../types'
import type { CalendarData } from '../hooks/useCalendarData'
import {
  dateKey,
  employeeName,
  filterEvents,
  formatDate,
  toCalendarEvent,
} from '../utils/calendar'
import { EmptyState, SearchInput } from '../components/ui/Shared'
import { EventCard } from '../components/events/EventCard'

export function CalendarPage({
  data,
  admin,
  onSelect,
  onCreate,
}: {
  data: CalendarData
  admin: boolean
  onSelect: (event: CalendarEvent) => void
  onCreate: (date?: string) => void
}) {
  const calendar = useRef<FullCalendar>(null)
  const [title, setTitle] = useState('')
  const [view, setView] = useState('dayGridMonth')
  const [viewDate, setViewDate] = useState(dateKey())
  const [hidden, setHidden] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [employee, setEmployee] = useState('')
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [range, setRange] = useState({ start: '', end: '' })
  const filtered = filterEvents(
    data.events,
    {
      search,
      categories: data.categories
        .filter((c) => !hidden.includes(c.id))
        .map((c) => c.id),
      employee,
      status,
      date,
    },
    data.employees,
  )
  const today = dateKey()
  const upcoming = [...filtered]
    .filter(
      (e) => (e.end_date || e.start_date) >= today && e.status !== 'cancelled',
    )
    .sort(
      (a, b) =>
        a.start_date.localeCompare(b.start_date) ||
        (a.start_time || '').localeCompare(b.start_time || ''),
    )
    .slice(0, 4)
  const todayEvents = data.events.filter(
    (e) =>
      e.start_date <= today &&
      (e.end_date || e.start_date) >= today &&
      e.status !== 'cancelled',
  )
  const activeFilters =
    hidden.length + Number(!!employee) + Number(!!status) + Number(!!date)
  function reset() {
    setHidden([])
    setEmployee('')
    setStatus('')
    setDate('')
    setSearch('')
  }
  return (
    <>
      <div className="calendar-summary">
        <div>
          <span className="summary-icon">
            <CalendarDays size={19} />
          </span>
          <p>
            <strong>
              {todayEvents.length}{' '}
              {todayEvents.length === 1 ? 'event' : 'events'} today
            </strong>
            <span>Here’s what’s happening across the office.</span>
          </p>
        </div>
        <span className="today-date">
          {formatDate(today, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>
      <div className="calendar-layout">
        <section className="calendar-panel">
          <div className="calendar-toolbar">
            <div className="calendar-navigation">
              <h2>{title}</h2>
              <div className="navigation-buttons">
                <button
                  className="icon-button"
                  aria-label="Previous period"
                  disabled={!!search}
                  onClick={() => calendar.current?.getApi().prev()}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Next period"
                  disabled={!!search}
                  onClick={() => calendar.current?.getApi().next()}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <button
                className="button small"
                disabled={!!search}
                onClick={() => calendar.current?.getApi().today()}
              >
                Today
              </button>
            </div>
            <div className="view-switch">
              {[
                ['dayGridMonth', 'Month'],
                ['timeGridWeek', 'Week'],
                ['timeGridDay', 'Day'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={view === key ? 'active' : ''}
                  aria-pressed={view === key}
                  disabled={!!search}
                  onClick={() => {
                    setView(key)
                    calendar.current?.getApi().changeView(key)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="calendar-search">
            <SearchInput value={search} onChange={setSearch} />
            <button
              className={`button small ${showFilters ? 'selected' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeFilters > 0 && (
                <span className="count-badge">{activeFilters}</span>
              )}
            </button>
          </div>
          {showFilters && (
            <div className="advanced-filters">
              <label>
                Employee
                <select
                  value={employee}
                  onChange={(e) => setEmployee(e.target.value)}
                >
                  <option value="">All employees</option>
                  {data.employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {employeeName(e)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value)
                    if (e.target.value) {
                      setViewDate(e.target.value)
                      calendar.current?.getApi().gotoDate(e.target.value)
                    }
                  }}
                />
              </label>
              <button className="text-button" onClick={reset}>
                <X size={14} />
                Reset
              </button>
            </div>
          )}
          {search ? (
            <div className="search-results">
              <div className="results-heading">
                {filtered.length} results across all dates
              </div>
              {filtered.length ? (
                filtered.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    category={data.categories.find(
                      (c) => c.id === event.category_id,
                    )}
                    onClick={() => onSelect(event)}
                  />
                ))
              ) : (
                <EmptyState
                  title="No events found"
                  description="Try another search or clear your filters."
                />
              )}
            </div>
          ) : (
            <>
              <div className="calendar-scroll">
                <FullCalendar
                  ref={calendar}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView={view}
                  initialDate={viewDate}
                  headerToolbar={false}
                  height="auto"
                  fixedWeekCount={false}
                  dayMaxEvents={3}
                  nowIndicator
                  slotMinTime="06:00:00"
                  slotMaxTime="21:00:00"
                  events={filtered.map((event) =>
                    toCalendarEvent(
                      {
                        ...event,
                        title:
                          event.employee_id &&
                          !event.title.includes(
                            employeeName(
                              data.employees.find(
                                (e) => e.id === event.employee_id,
                              ),
                            ),
                          )
                            ? `${event.title} · ${employeeName(data.employees.find((e) => e.id === event.employee_id))}`
                            : event.title,
                      },
                      data.categories.find((c) => c.id === event.category_id)
                        ?.color || '#74818d',
                    ),
                  )}
                  datesSet={(info) => {
                    setTitle(info.view.title)
                    setViewDate(dateKey(info.view.currentStart))
                    setRange({
                      start: dateKey(info.start),
                      end: dateKey(info.end),
                    })
                  }}
                  dateClick={(info) => {
                    if (admin) onCreate(info.dateStr.slice(0, 10))
                  }}
                  eventClick={(info) => {
                    const event = data.events.find(
                      (e) => e.id === info.event.id,
                    )
                    if (event) onSelect(event)
                  }}
                  eventContent={(info) => (
                    <div className="calendar-event-content">
                      <span
                        className="event-dot"
                        style={{ backgroundColor: info.event.borderColor }}
                      />
                      <span>
                        {info.timeText && <b>{info.timeText} </b>}
                        {info.event.title}
                      </span>
                    </div>
                  )}
                  eventDidMount={(info) => {
                    info.el.setAttribute('title', info.event.title)
                    info.el.setAttribute('tabindex', '0')
                    info.el.setAttribute('role', 'button')
                    info.el.onkeydown = (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        info.el.click()
                      }
                    }
                  }}
                />
              </div>
              {!filtered.some(
                (e) =>
                  e.start_date < range.end &&
                  (e.end_date || e.start_date) >= range.start,
              ) && (
                <div className="calendar-empty">
                  No events scheduled in this view
                  {activeFilters ? ' with the selected filters' : ''}.
                </div>
              )}
            </>
          )}
          <div className="calendar-bottom">
            <span>
              <span className="dot today-dot" />
              Today
            </span>
            <span>
              {admin
                ? 'Click a date to add an entry'
                : 'Click an entry to view its details'}
            </span>
          </div>
        </section>
        <aside className="calendar-aside">
          <section className="aside-section">
            <div className="section-heading">
              <h3>Categories</h3>
              <button className="text-button" onClick={() => setHidden([])}>
                Show all
              </button>
            </div>
            <p className="section-caption">
              Choose what appears on your calendar.
            </p>
            <div className="category-filters">
              {data.categories
                .filter(
                  (c) =>
                    c.active || data.events.some((e) => e.category_id === c.id),
                )
                .map((category) => (
                  <label className="category-filter" key={category.id}>
                    <input
                      type="checkbox"
                      aria-label={category.name}
                      style={{ accentColor: category.color }}
                      checked={!hidden.includes(category.id)}
                      onChange={() =>
                        setHidden((old) =>
                          old.includes(category.id)
                            ? old.filter((id) => id !== category.id)
                            : [...old, category.id],
                        )
                      }
                    />
                    <span>{category.name}</span>
                    <span className="category-count">
                      {
                        data.events.filter(
                          (e) =>
                            e.category_id === category.id &&
                            e.start_date < range.end &&
                            (e.end_date || e.start_date) >= range.start,
                        ).length
                      }
                    </span>
                  </label>
                ))}
            </div>
          </section>
          <section className="aside-section upcoming-aside">
            <div className="section-heading">
              <h3>Coming up</h3>
              <span className="count-badge">{upcoming.length}</span>
            </div>
            {upcoming.length ? (
              upcoming.map((event) => (
                <EventCard
                  compact
                  key={event.id}
                  event={event}
                  category={data.categories.find(
                    (c) => c.id === event.category_id,
                  )}
                  onClick={() => onSelect(event)}
                />
              ))
            ) : (
              <EmptyState
                title="All caught up"
                description="No upcoming events match your filters."
              />
            )}
            <Link className="view-all" to="/upcoming">
              View all upcoming
              <ArrowRight size={15} />
            </Link>
          </section>
          <div className="office-note">
            <span className="note-mark">✦</span>
            <strong>A little planning goes a long way.</strong>
            <p>Keep the office connected, one calendar entry at a time.</p>
          </div>
        </aside>
      </div>
    </>
  )
}
