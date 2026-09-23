import {
  CalendarDays,
  LoaderCircle,
  Search,
  Users,
  Briefcase,
  Flag,
  GraduationCap,
  Clock,
  Plane,
  Cake,
  PartyPopper,
} from 'lucide-react'
import type { EventCategory } from '../../types'

export function LoadingSpinner() {
  return (
    <div className="empty-state" role="status">
      <LoaderCircle className="spin" size={28} />
      <p>Loading your calendar…</p>
    </div>
  )
}
export function EmptyState({
  title = 'Nothing scheduled yet',
  description = 'New calendar entries will appear here.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <CalendarDays size={25} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}
export function CategoryBadge({ category }: { category?: EventCategory }) {
  const icons = {
    CalendarDays,
    Users,
    Briefcase,
    Flag,
    GraduationCap,
    Clock,
    Plane,
    Cake,
    PartyPopper,
  }
  const Icon = icons[category?.icon as keyof typeof icons] || CalendarDays
  return (
    <span
      className="category-badge"
      style={{
        color: category?.color,
        backgroundColor: `${category?.color || '#74818d'}12`,
      }}
    >
      <Icon size={12} />
      {category?.name || 'Uncategorized'}
    </span>
  )
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search calendar…',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="search-input">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          className="text-button"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  )
}
