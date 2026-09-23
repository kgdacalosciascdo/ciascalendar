import { describe, expect, it } from 'vitest'
import { createDemoData } from '../src/lib/demo'
import {
  addDays,
  canManage,
  dateKey,
  filterEvents,
  toCalendarEvent,
  validateEvent,
} from '../src/utils/calendar'

const { events, employees, categories } = createDemoData()
const event = events[0]
describe('event validation', () => {
  it('requires a nonblank title, category, and valid date', () => {
    expect(validateEvent({ ...event, title: ' ' })).toContain('title')
    expect(validateEvent({ ...event, category_id: '' })).toContain('category')
    expect(validateEvent({ ...event, start_date: '2026-02-30' })).toContain(
      'start date',
    )
  })
  it('rejects backwards date ranges and same-day time ranges', () => {
    expect(
      validateEvent({ ...event, end_date: addDays(event.start_date, -1) }),
    ).toContain('End date')
    expect(
      validateEvent({ ...event, start_time: '11:00', end_time: '10:00' }),
    ).toContain('End time')
    expect(
      validateEvent({
        ...event,
        end_date: addDays(event.start_date, 1),
        start_time: '23:00',
        end_time: '01:00',
      }),
    ).toBeNull()
  })
  it('requires conditional leave and holiday data', () => {
    expect(
      validateEvent({ ...event, employee_id: null }, 'Employee Leave'),
    ).toContain('employee')
    expect(validateEvent(event, 'Holiday')).toContain('holiday type')
    expect(validateEvent(events[2], 'Employee Leave')).toBeNull()
  })
})
describe('date mapping', () => {
  it('adds days without changing the calendar date through UTC conversion', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(dateKey(new Date(2026, 8, 22, 0, 0))).toBe('2026-09-22')
  })
  it('maps inclusive leave dates to an exclusive all-day calendar end', () => {
    const leave = {
      ...events[2],
      start_date: '2026-09-28',
      end_date: '2026-09-30',
    }
    const mapped = toCalendarEvent(leave, '#c68b35')
    expect(mapped.start).toBe('2026-09-28')
    expect(mapped.end).toBe('2026-10-01')
    expect(mapped.allDay).toBe(true)
    expect(mapped.extendedProps.record.employee_leave_details?.leave_type).toBe(
      'Vacation Leave',
    )
  })
  it('maps single-day holidays and timed entries correctly', () => {
    expect(
      toCalendarEvent(
        { ...event, all_day: true, start_date: '2026-09-22', end_date: null },
        '#fff',
      ).end,
    ).toBe('2026-09-23')
    expect(toCalendarEvent(event, '#fff').start).toBe(
      `${event.start_date}T09:00`,
    )
  })
})
describe('filters and permissions', () => {
  const filters = {
    search: '',
    categories: categories.map((c) => c.id),
    employee: '',
    status: '',
    date: '',
  }
  it('honors category toggles including none selected', () => {
    expect(
      filterEvents(events, { ...filters, categories: [] }, employees),
    ).toEqual([])
    expect(
      filterEvents(
        events,
        { ...filters, categories: ['category-1'] },
        employees,
      ).every((e) => e.category_id === 'category-1'),
    ).toBe(true)
  })
  it('searches employee, location, description, and title', () => {
    expect(
      filterEvents(events, { ...filters, search: 'Juan' }, employees).length,
    ).toBe(1)
    expect(
      filterEvents(events, { ...filters, search: 'conference' }, employees)
        .length,
    ).toBeGreaterThan(0)
    expect(
      filterEvents(
        events,
        { ...filters, date: addDays(events[2].start_date, 1) },
        employees,
      ),
    ).toContain(events[2])
  })
  it('only grants write UI access to administrators', () => {
    expect(canManage('admin')).toBe(true)
    expect(canManage('staff')).toBe(false)
    expect(canManage()).toBe(false)
  })
})
