import { useState, type FormEvent } from 'react'
import { Pencil, Plus } from 'lucide-react'
import type { CalendarData } from '../hooks/useCalendarData'
import type { EventCategory } from '../types'
import { Modal } from '../components/ui/Modal'
import { CategoryBadge } from '../components/ui/Shared'

export function CategoriesPage({
  data,
  notify,
}: {
  data: CalendarData
  notify: (message: string) => void
}) {
  const [editing, setEditing] = useState<EventCategory | null>(null)
  return (
    <div className="content-panel">
      <div className="panel-toolbar">
        <p className="muted">
          Organize entries with consistent labels and colors.
        </p>
        <button
          className="button primary"
          onClick={() =>
            setEditing({
              id: crypto.randomUUID(),
              name: '',
              color: '#347a68',
              description: '',
              icon: 'CalendarDays',
              active: true,
            })
          }
        >
          <Plus size={16} />
          Add category
        </button>
      </div>
      <div className="category-grid">
        {data.categories.map((category) => (
          <div className="category-tile" key={category.id}>
            <div className="section-heading">
              <CategoryBadge category={category} />
              <button
                className="icon-button"
                aria-label={`Edit ${category.name}`}
                onClick={() => setEditing(category)}
              >
                <Pencil size={16} />
              </button>
            </div>
            <p>{category.description || 'Calendar entries for your office.'}</p>
            <div className="category-tile-bottom">
              <span>
                {
                  data.events.filter((e) => e.category_id === category.id)
                    .length
                }{' '}
                entries
              </span>
              <span
                className={`status-badge ${!category.active ? 'inactive' : ''}`}
              >
                {category.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <CategoryForm
          category={editing}
          onClose={() => setEditing(null)}
          onSave={async (category) => {
            await data.saveCategory(category)
            notify('Category saved successfully.')
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
function CategoryForm({
  category,
  onSave,
  onClose,
}: {
  category: EventCategory
  onSave: (category: EventCategory) => Promise<void>
  onClose: () => void
}) {
  const [value, setValue] = useState(category)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const reserved = ['Employee Leave', 'Holiday'].includes(category.name)
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (!value.name.trim()) throw new Error('Please enter a category name.')
      await onSave({ ...value, name: value.name.trim() })
    } catch (problem) {
      setError(
        (problem as { message: string }).message || 'Unable to save category.',
      )
      setBusy(false)
    }
  }
  return (
    <Modal
      title={category.name ? 'Edit category' : 'Add category'}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Name *
            <input
              value={value.name}
              disabled={reserved}
              onChange={(e) => setValue({ ...value, name: e.target.value })}
              required
            />
          </label>
          {reserved && (
            <p className="muted">
              This system category name is fixed so its additional fields remain
              available.
            </p>
          )}
          <label>
            Description
            <textarea
              rows={3}
              value={value.description}
              onChange={(e) =>
                setValue({ ...value, description: e.target.value })
              }
            />
          </label>
          <div className="form-grid">
            <label>
              Color
              <input
                type="color"
                value={value.color}
                onChange={(e) => setValue({ ...value, color: e.target.value })}
              />
            </label>
            <label>
              Icon
              <select
                value={value.icon}
                onChange={(e) => setValue({ ...value, icon: e.target.value })}
              >
                {[
                  'CalendarDays',
                  'Users',
                  'Briefcase',
                  'Flag',
                  'GraduationCap',
                  'Clock',
                  'Plane',
                  'Cake',
                  'PartyPopper',
                ].map((icon) => (
                  <option key={icon}>{icon}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={value.active}
              onChange={(e) => setValue({ ...value, active: e.target.checked })}
            />
            Active category
          </label>
          <p className="muted">
            Deactivating a category preserves existing calendar entries.
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
              {busy ? 'Saving…' : 'Save category'}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
