import { supabase } from '../lib/supabase'
import type { AppData, CalendarEvent, Employee, EventCategory } from '../types'

export async function fetchData(
  admin: boolean,
  publicView = false,
): Promise<AppData> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const events = publicView
    ? supabase
        .from('events')
        .select('*, employee_leave_details(*), holiday_details(*)')
        .order('start_date')
    : supabase
        .from('events')
        .select(
          '*, employee_leave_details(*), holiday_details(*), creator:profiles!events_created_by_fkey(full_name)',
        )
        .order('start_date')
  const employees = publicView
    ? supabase.rpc('get_public_calendar_employees')
    : supabase.from('employees').select('*').order('last_name')
  const results = await Promise.all([
    events,
    employees,
    supabase.from('event_categories').select('*').order('name'),
    admin
      ? supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
  ])
  for (const result of results) if (result.error) throw result.error
  return {
    events: results[0].data as CalendarEvent[],
    employees: results[1].data as Employee[],
    categories: results[2].data as EventCategory[],
    logs: results[3].data as AppData['logs'],
  }
}
export async function persistEvent(event: CalendarEvent) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { creator, created_at, updated_at, ...payload } = event
  void creator
  void created_at
  void updated_at
  const { error } = await supabase.rpc('save_calendar_event', { payload })
  if (error) throw error
}
export async function persistRecord(
  table: 'employees' | 'event_categories',
  record: Employee | EventCategory,
) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from(table).upsert({ ...record })
  if (error) throw error
}
export async function removeEvent(id: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}
