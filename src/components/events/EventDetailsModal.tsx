import { useState } from 'react'
import {
  CalendarDays,
  Clock3,
  MapPin,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { CategoryBadge } from '../ui/Shared'
import { employeeName, formatDate, formatTime } from '../../utils/calendar'
import type { CalendarEvent, Employee, EventCategory } from '../../types'

export function EventDetailsModal({
  event,
  category,
  employee,
  admin,
  onClose,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent
  category?: EventCategory
  employee?: Employee
  admin: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => Promise<void>
}) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function remove() {
    setBusy(true)
    try {
      await onDelete()
      onClose()
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : 'Unable to delete event.',
      )
      setBusy(false)
    }
  }
  return (
    <Modal
      title={confirm ? 'Delete this event?' : 'Calendar entry'}
      onClose={onClose}
      busy={busy}
    >
      {confirm ? (
        <>
          <p className="modal-description">
            “{event.title}” will be permanently removed from the shared
            calendar.
          </p>
          {error && <div className="error-banner">{error}</div>}
          <div className="modal-actions">
            <button
              className="button"
              onClick={() => setConfirm(false)}
              disabled={busy}
            >
              Keep event
            </button>
            <button className="button danger" onClick={remove} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete event'}
            </button>
          </div>
        </>
      ) : (
        <>
          <CategoryBadge category={category} />
          <h2 className="event-detail-title">{event.title}</h2>
          <div className="event-meta">
            <p>
              <CalendarDays size={18} />
              {formatDate(event.start_date)}
              {event.end_date && event.end_date !== event.start_date
                ? ` – ${formatDate(event.end_date)}`
                : ''}
            </p>
            <p>
              <Clock3 size={18} />
              {event.all_day
                ? 'All day'
                : `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`}
            </p>
            {event.location && (
              <p>
                <MapPin size={18} />
                {event.location}
              </p>
            )}
            {employee && (
              <p>
                <UserRound size={18} />
                {employeeName(employee)}
              </p>
            )}
          </div>
          {event.description && (
            <p className="event-description">{event.description}</p>
          )}
          {event.employee_leave_details && (
            <div className="conditional-fields">
              <strong>{event.employee_leave_details.leave_type}</strong>
              <p className="capitalize">
                Leave status: {event.employee_leave_details.leave_status}
              </p>
            </div>
          )}
          {event.holiday_details && (
            <div className="conditional-fields">
              {event.holiday_details.holiday_type}
            </div>
          )}
          <div className="detail-footer">
            <span className="status-badge">{event.status}</span>
            <span>
              {event.visibility === 'admin'
                ? 'Administrators only'
                : 'Office-wide'}{' '}
              · Created by {event.creator?.full_name || 'System'}
            </span>
          </div>
          {admin && (
            <div className="modal-actions">
              <button
                className="button danger-outline"
                onClick={() => setConfirm(true)}
              >
                <Trash2 size={16} />
                Delete
              </button>
              <button className="button primary" onClick={onEdit}>
                <Pencil size={16} />
                Edit event
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
