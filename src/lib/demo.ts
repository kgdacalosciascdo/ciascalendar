import type { AppData, CalendarEvent, EventCategory } from '../types'
import { addDays, dateKey } from '../utils/calendar'

const names = [
  'Office Activity',
  'Meeting',
  'Employee Leave',
  'Holiday',
  'Training / Seminar',
  'Deadline',
  'Official Travel',
  'Birthday',
  'Office Celebration',
  'Other',
]
const colors = [
  '#347a68',
  '#4169c1',
  '#c68b35',
  '#bd5b67',
  '#8b63b8',
  '#d36b44',
  '#3291a0',
  '#bf669c',
  '#709149',
  '#74818d',
]
export const demoCategories: EventCategory[] = names.map((name, i) => ({
  id: `category-${i}`,
  name,
  description: '',
  color: colors[i],
  icon: 'CalendarDays',
  active: true,
}))
export function createDemoData(): AppData {
  const today = dateKey()
  const employees = [
    {
      id: 'employee-1',
      employee_number: 'CIAS-001',
      first_name: 'Juan',
      middle_name: '',
      last_name: 'Dela Cruz',
      suffix: '',
      position: 'Administrative Officer',
      department: 'Administration',
      email: 'juan@example.com',
      active: true,
    },
    {
      id: 'employee-2',
      employee_number: 'CIAS-002',
      first_name: 'Maria',
      middle_name: '',
      last_name: 'Santos',
      suffix: '',
      position: 'Internal Auditor',
      department: 'Internal Audit',
      email: 'maria@example.com',
      active: true,
    },
    {
      id: 'employee-3',
      employee_number: 'CIAS-003',
      first_name: 'Pedro',
      middle_name: '',
      last_name: 'Reyes',
      suffix: '',
      position: 'Administrative Assistant',
      department: 'Administration',
      email: 'pedro@example.com',
      active: true,
    },
  ]
  const records: [string, number, number, string | null, number][] = [
    ['Monthly Office Meeting', 1, 0, '09:00', 0],
    ['Quarterly Compliance Review', 5, 2, '14:00', 0],
    ['Juan Dela Cruz — Vacation Leave', 2, 3, null, 2],
    ['Office Wellness Activity', 0, 5, '08:00', 0],
    ['Staff Training', 4, 1, '13:00', 0],
    ['Report Submission Deadline', 5, 6, null, 0],
    ['Office Holiday (sample)', 3, 8, null, 0],
    ['Maria Santos — Birthday', 7, -3, null, 0],
    ['Planning & Coordination', 1, -7, '10:00', 0],
    ['Team Check-in', 1, -14, '09:00', 0],
    ['Records Management Seminar', 4, -10, '13:00', 0],
    ['Office Anniversary', 8, 10, null, 0],
  ]
  const events: CalendarEvent[] = records.map(
    ([title, category, offset, time, length], i) => ({
      id: `event-${i}`,
      title,
      category_id: `category-${category}`,
      start_date: addDays(today, offset),
      end_date: addDays(today, offset + length),
      start_time: time,
      end_time: time
        ? `${String(Number(time.slice(0, 2)) + 1).padStart(2, '0')}:00`
        : null,
      all_day: !time,
      location: time ? 'CIAS Conference Room' : '',
      description:
        'Sample calendar entry for preview. Connect Supabase to manage your shared office calendar.',
      employee_id:
        category === 2 ? 'employee-1' : category === 7 ? 'employee-2' : null,
      created_by: null,
      creator: { full_name: 'Demo Administrator' },
      status: 'confirmed',
      visibility: 'office',
      employee_leave_details:
        category === 2
          ? {
              employee_id: 'employee-1',
              leave_type: 'Vacation Leave',
              leave_status: 'approved',
              notes: '',
            }
          : null,
      holiday_details:
        category === 3 ? { holiday_type: 'Office Holiday' } : null,
    }),
  )
  return { categories: demoCategories, employees, events, logs: [] }
}
const storageKey = 'cias-calendar-demo-v1'
export function readDemo(): AppData {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) return JSON.parse(saved) as AppData
  } catch {
    /* Start with sample data if storage is unavailable. */
  }
  return createDemoData()
}
export function writeDemo(data: AppData) {
  localStorage.setItem(storageKey, JSON.stringify(data))
}
