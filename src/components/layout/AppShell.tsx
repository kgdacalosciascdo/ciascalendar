import { useEffect, useState } from 'react'
import {
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { useAuth } from '../../features/auth/context'
import { useCalendarData } from '../../hooks/useCalendarData'
import { isDemo } from '../../lib/supabase'
import { canManage } from '../../utils/calendar'
import type { CalendarEvent } from '../../types'
import { CalendarPage } from '../../pages/CalendarPage'
import { UpcomingPage } from '../../pages/UpcomingPage'
import { EmployeesPage } from '../../pages/EmployeesPage'
import { CategoriesPage } from '../../pages/CategoriesPage'
import { SettingsPage } from '../../pages/SettingsPage'
import { EventDetailsModal } from '../events/EventDetailsModal'
import { EventFormModal } from '../events/EventFormModal'
import { LoadingSpinner } from '../ui/Shared'
const navigation = [
  {
    path: '/calendar',
    label: 'Calendar',
    icon: CalendarDays,
    description: 'A shared space for your office schedule.',
  },
  {
    path: '/upcoming',
    label: 'Upcoming',
    icon: CalendarRange,
    description: 'Your next activities and important dates, at a glance.',
  },
  {
    path: '/employees',
    label: 'Employees',
    icon: Users,
    description: 'The people who keep your office moving.',
  },
  {
    path: '/categories',
    label: 'Categories',
    icon: LayoutGrid,
    description: 'A clear place for every kind of calendar entry.',
    admin: true,
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings2,
    description: 'Your account, connection, and activity history.',
  },
]
export default function AppShell() {
  const { profile, logout } = useAuth()
  const rawData = useCalendarData()
  const admin = canManage(profile?.role)
  const data = {
    ...rawData,
    events: rawData.events.filter((e) => admin || e.visibility === 'office'),
  }
  const location = useLocation()
  const current =
    navigation.find((n) => n.path === location.pathname) || navigation[0]
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState<{
    event?: CalendarEvent
    date?: string
  } | null>(null)
  const [toast, setToast] = useState('')
  const [logoutError, setLogoutError] = useState('')
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 4500)
    return () => clearTimeout(timer)
  }, [toast])
  async function signOut() {
    try {
      await logout()
    } catch (problem) {
      setLogoutError((problem as Error).message)
    }
  }
  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <button
        className={`drawer-scrim ${mobileOpen ? 'visible' : ''}`}
        aria-label="Close navigation"
        onClick={() => setMobileOpen(false)}
      />
      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <NavLink to="/calendar" className="brand">
          <span className="brand-mark">
            <CalendarDays size={23} />
          </span>
          <div>
            CIAS CALENDAR<small>OFFICE MANAGEMENT</small>
          </div>
        </NavLink>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation
            .filter((n) =>
              profile
                ? !n.admin || admin
                : ['/calendar', '/upcoming'].includes(n.path),
            )
            .map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {item.path === '/calendar' && (
                  <span className="nav-active-dot" />
                )}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-info">
            <span className="sidebar-info-icon">
              <ShieldCheck size={19} />
            </span>
            <strong>One office. In sync.</strong>
            <p>
              A simpler way to keep
              <br />
              everyone on the same page.
            </p>
          </div>
          {isDemo && (
            <div className="demo-indicator">
              <span className="dot" />
              Local demo workspace
            </div>
          )}
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft size={17} className={collapsed ? 'rotate' : ''} />
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <div className="header-breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>{current.label}</strong>
          </div>
          <div className="header-user">
            {profile ? (
              <>
                <span className="office-tag">
                  <span className="dot" />
                  {isDemo ? 'Demo workspace' : 'Office workspace'}
                </span>
                <span className="header-divider" />
                <span className="avatar user-avatar">
                  {profile.full_name
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')}
                </span>
                <div className="user-text">
                  <strong>{profile.full_name}</strong>
                  <small>{admin ? 'Administrator' : 'Staff · View only'}</small>
                </div>
                <button
                  className="icon-button"
                  aria-label="Sign out"
                  title="Sign out"
                  onClick={signOut}
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <Link className="button small" to="/login">
                <LogIn size={16} />
                Sign in
              </Link>
            )}
          </div>
        </header>
        <main className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">CIAS WORKSPACE</div>
              <h1>
                {current.label === 'Calendar'
                  ? 'Office calendar'
                  : current.label}
              </h1>
              <p>{current.description}</p>
            </div>
            {admin &&
              ['/calendar', '/upcoming'].includes(location.pathname) && (
                <button
                  className="button primary"
                  disabled={data.loading || !!data.error}
                  onClick={() => setForm({})}
                >
                  <Plus size={18} />
                  Add event
                </button>
              )}
          </div>
          {logoutError && (
            <div className="error-banner" role="alert">
              {logoutError}
            </div>
          )}
          {data.error ? (
            <div className="error-banner" role="alert">
              <strong>Unable to load the workspace.</strong>
              <p>{data.error}</p>
              <button className="button" onClick={data.reload}>
                Try again
              </button>
            </div>
          ) : data.loading ? (
            <LoadingSpinner />
          ) : (
            <Routes>
              <Route
                path="/calendar"
                element={
                  <CalendarPage
                    data={data}
                    admin={admin}
                    onSelect={setSelected}
                    onCreate={(date) => setForm({ date })}
                  />
                }
              />
              <Route
                path="/upcoming"
                element={<UpcomingPage data={data} onSelect={setSelected} />}
              />
              <Route
                path="/employees"
                element={
                  profile ? (
                    <EmployeesPage
                      data={data}
                      admin={admin}
                      notify={setToast}
                    />
                  ) : (
                    <Navigate to="/calendar" replace />
                  )
                }
              />
              <Route
                path="/categories"
                element={
                  admin ? (
                    <CategoriesPage data={data} notify={setToast} />
                  ) : (
                    <Navigate to="/calendar" replace />
                  )
                }
              />
              <Route
                path="/settings"
                element={
                  profile ? (
                    <SettingsPage data={data} />
                  ) : (
                    <Navigate to="/calendar" replace />
                  )
                }
              />
              <Route path="*" element={<Navigate to="/calendar" replace />} />
            </Routes>
          )}
          <footer className="app-footer">
            <span>
              CIAS CALENDAR <span>·</span> Keeping our office connected.
            </span>
            <span>
              <CircleHelp size={13} />
              {isDemo
                ? 'Preview data · Saved on this device'
                : 'Internal office use'}
            </span>
          </footer>
        </main>
      </div>
      {selected && (
        <EventDetailsModal
          event={selected}
          category={data.categories.find((c) => c.id === selected.category_id)}
          employees={data.employees}
          admin={admin}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setForm({ event: selected })
            setSelected(null)
          }}
          onDelete={async () => {
            await data.deleteEvent(selected.id)
            setToast('Event deleted.')
            setSelected(null)
          }}
        />
      )}
      {form && admin && (
        <EventFormModal
          {...form}
          categories={data.categories}
          employees={data.employees}
          userId={profile!.id}
          onClose={() => setForm(null)}
          onSave={async (event) => {
            await data.saveEvent(event)
            setToast(
              form.event
                ? 'Event updated successfully.'
                : 'Event created successfully.',
            )
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
