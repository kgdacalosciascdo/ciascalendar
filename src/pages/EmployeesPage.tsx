import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Users } from 'lucide-react'
import type { CalendarData } from '../hooks/useCalendarData'
import type { Employee } from '../types'
import { employeeName } from '../utils/calendar'
import { EmptyState, SearchInput } from '../components/ui/Shared'
import { Modal } from '../components/ui/Modal'

export function EmployeesPage({
  data,
  admin,
  notify,
}: {
  data: CalendarData
  admin: boolean
  notify: (message: string) => void
}) {
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const filtered = data.employees.filter(
    (employee) =>
      (showInactive || employee.active) &&
      `${employeeName(employee)} ${employee.employee_number} ${employee.department} ${employee.email}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  return (
    <div className="content-panel">
      <div className="panel-toolbar">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search employees…"
        />
        <label className="checkbox-label employee-filter-toggle">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
          />
          Show inactive
        </label>
        {admin && (
          <button
            className="button primary"
            onClick={() =>
              setEditing({
                id: crypto.randomUUID(),
                employee_number: '',
                first_name: '',
                middle_name: '',
                last_name: '',
                suffix: '',
                position: '',
                department: '',
                email: '',
                active: true,
              })
            }
          >
            <Plus size={16} />
            Add employee
          </button>
        )}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Position / Department</th>
              <th>Email</th>
              <th>Status</th>
              {admin && (
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <div className="person-cell">
                    <span className="avatar">
                      <Users size={18} />
                    </span>
                    <div>
                      <strong>{employeeName(employee)}</strong>
                      <small>{employee.employee_number}</small>
                    </div>
                  </div>
                </td>
                <td>
                  {employee.position || '—'}
                  <small>{employee.department}</small>
                </td>
                <td>{employee.email || '—'}</td>
                <td>
                  <span
                    className={`status-badge ${!employee.active ? 'inactive' : ''}`}
                  >
                    {employee.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {admin && (
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Edit ${employeeName(employee)}`}
                      onClick={() => setEditing(employee)}
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <EmptyState
          title="No employees found"
          description="Try a different search or add your first employee."
        />
      )}
      <div className="table-footer">
        {filtered.length} employees · Employee records are deactivated, never
        deleted.
      </div>
      {editing && (
        <EmployeeForm
          employee={editing}
          onClose={() => setEditing(null)}
          onSave={async (employee) => {
            await data.saveEmployee(employee)
            notify('Employee saved successfully.')
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
function EmployeeForm({
  employee,
  onClose,
  onSave,
}: {
  employee: Employee
  onClose: () => void
  onSave: (employee: Employee) => Promise<void>
}) {
  const [value, setValue] = useState(employee)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (
        !value.first_name.trim() ||
        !value.last_name.trim() ||
        !value.employee_number.trim()
      )
        throw new Error(
          'Employee number, first name, and last name are required.',
        )
      await onSave({
        ...value,
        first_name: value.first_name.trim(),
        last_name: value.last_name.trim(),
        employee_number: value.employee_number.trim(),
      })
    } catch (problem) {
      setError(
        (problem as { message: string }).message || 'Unable to save employee.',
      )
      setBusy(false)
    }
  }
  return (
    <Modal
      title={employee.employee_number ? 'Edit employee' : 'Add employee'}
      onClose={onClose}
      busy={busy}
    >
      <p className="modal-description">
        Maintain employee information for calendar entries and leaves.
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <div className="form-grid">
            {(
              [
                ['employee_number', 'Employee number', true],
                ['first_name', 'First name', true],
                ['middle_name', 'Middle name', false],
                ['last_name', 'Last name', true],
                ['suffix', 'Suffix', false],
                ['position', 'Position', false],
                ['department', 'Department', false],
                ['email', 'Email', false],
              ] as const
            ).map(([key, label, required]) => (
              <label key={key}>
                {label}
                {required && ' *'}
                <input
                  type={key === 'email' ? 'email' : 'text'}
                  required={required}
                  value={value[key]}
                  onChange={(e) =>
                    setValue({ ...value, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={value.active}
              onChange={(e) => setValue({ ...value, active: e.target.checked })}
            />
            Active employee
          </label>
          <p className="muted">
            Inactive employees remain linked to their existing calendar records.
          </p>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button className="button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button primary">
              {busy ? 'Saving…' : 'Save employee'}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
