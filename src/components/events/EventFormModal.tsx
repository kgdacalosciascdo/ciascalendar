import { useState, type FormEvent } from 'react'
import { CalendarPlus } from 'lucide-react'
import { Modal } from '../ui/Modal'
import type {
  CalendarEvent,
  Employee,
  EventCategory,
  EmployeeLeave,
} from '../../types'
import {
  dateKey,
  employeeName,
  eventEmployeeIds,
  validateEvent,
} from '../../utils/calendar'

const leaveTypes = [
  'Vacation Leave',
  'Sick Leave',
  'Special Privilege Leave',
  'Mandatory / Forced Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Solo Parent Leave',
  'Study Leave',
  'Rehabilitation Leave',
  'Other',
]
const holidayTypes = [
  'Regular Holiday',
  'Special Non-Working Holiday',
  'Local Holiday',
  'Office Holiday',
  'Other',
]
export function EventFormModal({
  event,
  date,
  categories,
  employees,
  userId,
  onClose,
  onSave,
}: {
  event?: CalendarEvent
  date?: string
  categories: EventCategory[]
  employees: Employee[]
  userId: string
  onClose: () => void
  onSave: (event: CalendarEvent) => Promise<void>
}) {
  const [value, setValue] = useState<CalendarEvent>(
    event
      ? { ...event, employee_ids: eventEmployeeIds(event) }
      : {
          id: crypto.randomUUID(),
          title: '',
          description: '',
          category_id: categories.find((c) => c.active)?.id || '',
          start_date: date || dateKey(),
          end_date: null,
          all_day: true,
          start_time: null,
          end_time: null,
          location: '',
          employee_id: null,
          employee_ids: [],
          status: 'confirmed',
          visibility: 'office',
          created_by: userId === 'demo' ? null : userId,
        },
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const category = categories.find((c) => c.id === value.category_id)
  const isLeave = category?.name === 'Employee Leave'
  const isHoliday = category?.name === 'Holiday'
  const participantIds = value.employee_ids || []
  function update<K extends keyof CalendarEvent>(
    key: K,
    next: CalendarEvent[K],
  ) {
    setValue((old) => ({ ...old, [key]: next }))
  }
  function setParticipants(ids: string[]) {
    update('employee_ids', ids)
    update('employee_id', ids[0] || null)
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const normalized: CalendarEvent = {
      ...value,
      title: value.title.trim(),
      all_day: isHoliday || value.all_day,
      start_time: value.all_day || isHoliday ? null : value.start_time,
      end_time: value.all_day || isHoliday ? null : value.end_time,
      employee_leave_details: isLeave
        ? {
            employee_id: value.employee_id || '',
            leave_type:
              value.employee_leave_details?.leave_type || 'Vacation Leave',
            leave_status:
              value.employee_leave_details?.leave_status || 'approved',
            notes: value.employee_leave_details?.notes || '',
          }
        : null,
      employee_ids: isLeave
        ? value.employee_id
          ? [value.employee_id]
          : []
        : participantIds,
      holiday_details: isHoliday
        ? {
            holiday_type:
              value.holiday_details?.holiday_type || 'Regular Holiday',
          }
        : null,
    }
    const problem = validateEvent(normalized, category?.name)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave(normalized)
      onClose()
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : (problem as { message: string }).message || 'Failed to save event.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={event ? 'Edit calendar entry' : 'Add calendar entry'}
      onClose={onClose}
      busy={busy}
    >
      <p className="modal-description">
        Keep your team informed about what’s coming up.
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Event title <span className="required">*</span>
            <input
              autoFocus
              value={value.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Monthly Office Meeting"
              maxLength={200}
              required
            />
          </label>
          <label>
            Category <span className="required">*</span>
            <select
              aria-label="Category"
              value={value.category_id}
              onChange={(e) => {
                const next = categories.find((c) => c.id === e.target.value)
                setValue((old) => ({
                  ...old,
                  category_id: e.target.value,
                  all_day: next?.name === 'Holiday' ? true : old.all_day,
                }))
              }}
              required
            >
              {categories
                .filter((c) => c.active || c.id === value.category_id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {!c.active ? ' (inactive)' : ''}
                  </option>
                ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Start date <span className="required">*</span>
              <input
                type="date"
                value={value.start_date}
                onChange={(e) => update('start_date', e.target.value)}
                required
              />
            </label>
            <label>
              End date
              <input
                type="date"
                value={value.end_date || ''}
                min={value.start_date}
                onChange={(e) => update('end_date', e.target.value || null)}
              />
            </label>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={value.all_day || isHoliday}
              disabled={isHoliday}
              onChange={(e) => update('all_day', e.target.checked)}
            />
            All-day event
          </label>
          {!value.all_day && !isHoliday && (
            <div className="form-grid">
              <label>
                Start time
                <input
                  type="time"
                  value={value.start_time || ''}
                  onChange={(e) => update('start_time', e.target.value)}
                  required
                />
              </label>
              <label>
                End time
                <input
                  type="time"
                  value={value.end_time || ''}
                  onChange={(e) => update('end_time', e.target.value)}
                  required
                />
              </label>
            </div>
          )}
          {isLeave ? (
            <label>
              Employee <span className="required">*</span>
              <select
                aria-label="Employee"
                value={value.employee_id || ''}
                onChange={(e) =>
                  setParticipants(e.target.value ? [e.target.value] : [])
                }
                required
              >
                <option value="">Select an employee</option>
                {employees
                  .filter((e) => e.active || e.id === value.employee_id)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {employeeName(e)}
                      {!e.active ? ' (inactive)' : ''}
                    </option>
                  ))}
              </select>
            </label>
          ) : (
            <div className="participants-field">
              <div className="participants-heading">
                <div>
                  <strong>Participants</strong>
                  <span>Link employees to this event.</span>
                </div>
                <button
                  className="text-button"
                  type="button"
                  onClick={() =>
                    setParticipants(
                      participantIds.length ===
                        employees.filter((employee) => employee.active).length
                        ? []
                        : employees
                            .filter((employee) => employee.active)
                            .map((employee) => employee.id),
                    )
                  }
                >
                  {participantIds.length ===
                  employees.filter((employee) => employee.active).length
                    ? 'Clear all'
                    : 'Select all'}
                </button>
              </div>
              <div className="participant-list">
                {employees
                  .filter(
                    (employee) =>
                      employee.active || participantIds.includes(employee.id),
                  )
                  .map((employee) => (
                    <label className="participant-option" key={employee.id}>
                      <input
                        type="checkbox"
                        checked={participantIds.includes(employee.id)}
                        onChange={(e) =>
                          setParticipants(
                            e.target.checked
                              ? [...participantIds, employee.id]
                              : participantIds.filter(
                                  (id) => id !== employee.id,
                                ),
                          )
                        }
                      />
                      <span>{employeeName(employee)}</span>
                    </label>
                  ))}
              </div>
              <small>
                {participantIds.length
                  ? `${participantIds.length} selected`
                  : 'No employees linked'}
              </small>
            </div>
          )}
          {isLeave && (
            <div className="conditional-fields">
              <span className="eyebrow">LEAVE INFORMATION</span>
              <div className="form-grid">
                <label>
                  Leave type
                  <select
                    aria-label="Leave type"
                    value={
                      value.employee_leave_details?.leave_type ||
                      'Vacation Leave'
                    }
                    onChange={(e) =>
                      update('employee_leave_details', {
                        employee_id: value.employee_id || '',
                        leave_status: 'approved',
                        notes: '',
                        ...value.employee_leave_details,
                        leave_type: e.target.value,
                      })
                    }
                  >
                    {leaveTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Leave status
                  <select
                    aria-label="Leave status"
                    value={
                      value.employee_leave_details?.leave_status || 'approved'
                    }
                    onChange={(e) =>
                      update('employee_leave_details', {
                        employee_id: value.employee_id || '',
                        leave_type: 'Vacation Leave',
                        notes: '',
                        ...value.employee_leave_details,
                        leave_status: e.target
                          .value as EmployeeLeave['leave_status'],
                      })
                    }
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>
            </div>
          )}
          {isHoliday && (
            <label>
              Holiday type
              <select
                aria-label="Holiday type"
                value={value.holiday_details?.holiday_type || 'Regular Holiday'}
                onChange={(e) =>
                  update('holiday_details', { holiday_type: e.target.value })
                }
              >
                {holidayTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Location
            <input
              value={value.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder="Add a room or location"
            />
          </label>
          <label>
            Description
            <textarea
              value={value.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Add details your team should know…"
              rows={3}
            />
          </label>
          <div className="form-grid">
            <label>
              Status
              <select
                value={value.status}
                onChange={(e) =>
                  update('status', e.target.value as CalendarEvent['status'])
                }
              >
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label>
              Visibility
              <select
                value={value.visibility}
                onChange={(e) =>
                  update(
                    'visibility',
                    e.target.value as CalendarEvent['visibility'],
                  )
                }
              >
                <option value="office">Everyone in the office</option>
                <option value="admin">Administrators only</option>
              </select>
            </label>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button primary">
              <CalendarPlus size={16} />
              {busy ? 'Saving…' : 'Save event'}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
