import { supabase } from '../lib/supabase'
import type {
  AppData,
  CalendarEvent,
  Employee,
  EventCategory,
  ManagedUser,
} from '../types'

export async function createUserAccount(input: {
  full_name: string
  email: string
  password: string
  role: 'admin' | 'staff'
  birth_date: string
}) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: input,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}
export async function getManagedUsers(): Promise<ManagedUser[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'list' },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data?.users || []
}
export async function setUserActive(id: string, active: boolean) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'set-active', user_id: id, active },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

export async function fetchData(
  admin: boolean,
  publicView = false,
): Promise<AppData> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const events = publicView
    ? supabase
        .from('events')
        .select(
          '*, employee_leave_details(*), holiday_details(*), event_employees(employee_id)',
        )
        .order('start_date')
    : supabase
        .from('events')
        .select(
          '*, employee_leave_details(*), holiday_details(*), event_employees(employee_id), creator:profiles!events_created_by_fkey(full_name)',
        )
        .order('start_date')
  const employees = publicView
    ? supabase.rpc('get_public_calendar_employees')
    : supabase.from('employees').select('*').order('last_name')
  const results = await Promise.all([
    events,
    employees,
    supabase.from('event_categories').select('*').order('name'),
    supabase.rpc('get_recurring_birthday_events'),
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
    events: [
      ...((results[0].data ?? []) as CalendarEvent[]),
      ...((results[3].data ?? []) as CalendarEvent[]).map((event) => ({
        ...event,
        is_generated: true,
      })),
    ],
    employees: results[1].data as Employee[],
    categories: results[2].data as EventCategory[],
    logs: results[4].data as AppData['logs'],
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
