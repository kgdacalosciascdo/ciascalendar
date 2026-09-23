import type { CalendarEvent, Employee, Role } from '../types'

export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return dateKey(value)
}
export const employeeName = (employee?: Employee) =>
  employee
    ? [
        employee.first_name,
        employee.middle_name,
        employee.last_name,
        employee.suffix,
      ]
        .filter(Boolean)
        .join(' ')
    : ''
export const canManage = (role?: Role) => role === 'admin'
export function eventEmployeeIds(event: CalendarEvent): string[] {
  const ids = event.event_employees?.map((link) => link.employee_id) || []
  if (ids.length) return ids
  return event.employee_id ? [event.employee_id] : []
}
export function eventEmployeeNames(
  event: CalendarEvent,
  employees: Employee[],
) {
  return eventEmployeeIds(event)
    .map((id) => employeeName(employees.find((employee) => employee.id === id)))
    .filter(Boolean)
}
export function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(
    'en-US',
    options ?? { month: 'short', day: 'numeric', year: 'numeric' },
  )
}
export function formatTime(time?: string | null) {
  if (!time) return 'All day'
  const [hour, minute] = time.split(':').map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}
export function validateEvent(
  event: CalendarEvent,
  categoryName?: string,
): string | null {
  if (!event.title.trim()) return 'Please enter an event title.'
  if (!event.category_id) return 'Please select a category.'
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(event.start_date) ||
    dateKey(new Date(`${event.start_date}T12:00:00`)) !== event.start_date
  )
    return 'Please enter a valid start date.'
  if (
    event.end_date &&
    (dateKey(new Date(`${event.end_date}T12:00:00`)) !== event.end_date ||
      event.end_date < event.start_date)
  )
    return 'End date must be on or after the start date.'
  if (!event.all_day && (!event.start_time || !event.end_time))
    return 'Please enter both start and end times.'
  if (
    !event.all_day &&
    (!event.end_date || event.end_date === event.start_date) &&
    event.end_time! <= event.start_time!
  )
    return 'End time must be after the start time.'
  if (
    categoryName === 'Employee Leave' &&
    (!event.employee_id || !event.employee_leave_details?.leave_type)
  )
    return 'Select an employee and leave type.'
  if (categoryName === 'Holiday' && !event.holiday_details?.holiday_type)
    return 'Please select a holiday type.'
  return null
}
export function toCalendarEvent(event: CalendarEvent, color: string) {
  return {
    id: event.id,
    title: event.title,
    display: 'block',
    allDay: event.all_day,
    start: event.all_day
      ? event.start_date
      : `${event.start_date}T${event.start_time}`,
    end: event.all_day
      ? addDays(event.end_date || event.start_date, 1)
      : `${event.end_date || event.start_date}T${event.end_time}`,
    backgroundColor: `${color}16`,
    borderColor: color,
    textColor: color,
    classNames:
      event.status !== 'confirmed' ||
      event.employee_leave_details?.leave_status === 'pending'
        ? ['event-subdued']
        : [],
    extendedProps: { record: event },
  }
}
export interface Filters {
  search: string
  categories: string[]
  employee: string
  status: string
  date: string
}
export function filterEvents(
  events: CalendarEvent[],
  filters: Filters,
  employees: Employee[],
) {
  const query = filters.search.toLowerCase().trim()
  return events.filter(
    (event) =>
      filters.categories.includes(event.category_id) &&
      (!filters.employee ||
        eventEmployeeIds(event).includes(filters.employee)) &&
      (!filters.status || event.status === filters.status) &&
      (!filters.date ||
        (event.start_date <= filters.date &&
          (event.end_date || event.start_date) >= filters.date)) &&
      (!query ||
        [
          event.title,
          event.description,
          event.location,
          ...eventEmployeeNames(event, employees),
        ].some((value) => value.toLowerCase().includes(query))),
  )
}
