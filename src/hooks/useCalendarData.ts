import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../features/auth/context'
import { isDemo } from '../lib/supabase'
import { readDemo, writeDemo } from '../lib/demo'
import {
  createEmployeeAccount,
  fetchData,
  persistEvent,
  persistRecord,
  removeEvent,
} from '../services/data'
import type { AppData, CalendarEvent, Employee, EventCategory } from '../types'

export function useCalendarData() {
  const { profile } = useAuth()
  const [data, setData] = useState<AppData>(() =>
    isDemo
      ? readDemo()
      : { events: [], employees: [], categories: [], logs: [] },
  )
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    setError('')
    try {
      setData(
        isDemo
          ? readDemo()
          : await fetchData(profile?.role === 'admin', !profile),
      )
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : String(
              (problem as { message?: string }).message ||
                'Unable to load calendar data.',
            ),
      )
    } finally {
      setLoading(false)
    }
  }, [profile])
  useEffect(() => {
    if (isDemo) return
    let alive = true
    fetchData(profile?.role === 'admin', !profile)
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((problem) => {
        if (alive)
          setError(
            (problem as { message: string }).message ||
              'Unable to load calendar data.',
          )
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [profile])
  function requireAdmin() {
    if (profile?.role !== 'admin')
      throw new Error('Administrator access is required.')
  }
  function commit(
    next: AppData,
    action: string,
    type: string,
    id: string,
    title: string,
  ) {
    next.logs = [
      {
        id: crypto.randomUUID(),
        user_id: profile!.id,
        action,
        entity_type: type,
        entity_id: id,
        description: `${profile!.full_name} ${action.toLowerCase()} ${type}: ${title}`,
        created_at: new Date().toISOString(),
      },
      ...next.logs,
    ]
    writeDemo(next)
    setData(next)
  }
  async function saveEvent(event: CalendarEvent) {
    requireAdmin()
    if (!isDemo) {
      await persistEvent(event)
      await reload()
      return
    }
    const exists = data.events.some((e) => e.id === event.id)
    commit(
      {
        ...data,
        events: [
          ...data.events.filter((e) => e.id !== event.id),
          {
            ...event,
            event_employees: (event.employee_ids || []).map((employee_id) => ({
              employee_id,
            })),
            creator: { full_name: profile!.full_name },
          },
        ],
      },
      exists ? 'Updated' : 'Created',
      'event',
      event.id,
      event.title,
    )
  }
  async function deleteEvent(id: string) {
    requireAdmin()
    if (!isDemo) {
      await removeEvent(id)
      await reload()
      return
    }
    commit(
      { ...data, events: data.events.filter((e) => e.id !== id) },
      'Deleted',
      'event',
      id,
      data.events.find((e) => e.id === id)?.title || '',
    )
  }
  async function saveEmployee(employee: Employee) {
    requireAdmin()
    if (!isDemo) {
      const exists = data.employees.some((item) => item.id === employee.id)
      if (exists) await persistRecord('employees', employee)
      else await createEmployeeAccount(employee)
      await reload()
      return
    }
    if (
      data.employees.some(
        (e) =>
          e.id !== employee.id &&
          e.employee_number === employee.employee_number,
      )
    )
      throw new Error('This employee number is already in use.')
    commit(
      {
        ...data,
        employees: [
          ...data.employees.filter((e) => e.id !== employee.id),
          employee,
        ],
      },
      data.employees.some((e) => e.id === employee.id) ? 'Updated' : 'Created',
      'employee',
      employee.id,
      `${employee.first_name} ${employee.last_name}`,
    )
  }
  async function saveCategory(category: EventCategory) {
    requireAdmin()
    if (!isDemo) {
      await persistRecord('event_categories', category)
      await reload()
      return
    }
    if (
      data.categories.some(
        (c) =>
          c.id !== category.id &&
          c.name.toLowerCase() === category.name.toLowerCase(),
      )
    )
      throw new Error('This category name already exists.')
    commit(
      {
        ...data,
        categories: [
          ...data.categories.filter((c) => c.id !== category.id),
          category,
        ],
      },
      data.categories.some((c) => c.id === category.id) ? 'Updated' : 'Created',
      'category',
      category.id,
      category.name,
    )
  }
  return {
    ...data,
    loading,
    error,
    reload,
    saveEvent,
    deleteEvent,
    saveEmployee,
    saveCategory,
  }
}
export type CalendarData = ReturnType<typeof useCalendarData>
