import { useEffect, useState, type FormEvent } from 'react'
import {
  CheckCircle2,
  Database,
  KeyRound,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '../features/auth/context'
import { isDemo } from '../lib/supabase'
import type { CalendarData } from '../hooks/useCalendarData'
import { EmptyState } from '../components/ui/Shared'
import {
  createUserAccount,
  getManagedUsers,
  setUserActive,
} from '../services/data'
import type { ManagedUser } from '../types'

export function SettingsPage({ data }: { data: CalendarData }) {
  const { profile } = useAuth()
  const [accountRefresh, setAccountRefresh] = useState(0)
  return (
    <div className="settings-layout">
      <section className="content-panel settings-card">
        <ShieldCheck size={22} />
        <h2>Your account</h2>
        <dl>
          <dt>Name</dt>
          <dd>{profile?.full_name}</dd>
          <dt>Role</dt>
          <dd className="capitalize">{profile?.role}</dd>
          <dt>Email</dt>
          <dd>{profile?.email || 'Local preview account'}</dd>
        </dl>
        <p className="muted">
          User accounts and roles are managed by your Supabase project
          administrator.
        </p>
      </section>
      <section className="content-panel settings-card">
        <Database size={22} />
        <h2>Calendar connection</h2>
        <span className="status-badge">
          {isDemo ? 'Local demo' : 'Supabase connected'}
        </span>
        <p>
          {isDemo
            ? 'Sample data is stored in this browser. It is not shared with other users.'
            : 'Office calendar data is stored in PostgreSQL with role-based access policies.'}
        </p>
        <p className="muted">
          Calendar dates and times use the office’s local time. Enter all times
          consistently in Asia/Manila (UTC+8).
        </p>
        {isDemo && (
          <p className="muted">
            To enable secure login and shared data, follow the Supabase setup in
            the project README.
          </p>
        )}
      </section>
      <ChangePassword />
      {profile?.role === 'admin' && (
        <AddUser onCreated={() => setAccountRefresh((count) => count + 1)} />
      )}
      {profile?.role === 'admin' && (
        <UserAccounts currentUserId={profile.id} reloadKey={accountRefresh} />
      )}
      {profile?.role === 'admin' && (
        <section className="content-panel activity-panel">
          <div className="section-heading">
            <h2>Activity history</h2>
            <span className="muted">Latest 100 actions</span>
          </div>
          {data.logs.length ? (
            <div className="activity-list">
              {data.logs.slice(0, 100).map((log) => (
                <div className="activity-item" key={log.id}>
                  <span className="activity-dot" />
                  <div>
                    <p>{log.description}</p>
                    <small>{new Date(log.created_at).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No activity yet"
              description="Administrator changes will be recorded here."
            />
          )}
        </section>
      )}
    </div>
  )
}

function AddUser({ onCreated }: { onCreated: () => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [role, setRole] = useState<'admin' | 'staff'>('staff')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      await createUserAccount({
        full_name: fullName,
        email,
        password,
        role,
        birth_date: birthDate,
      })
      setSuccess(`${fullName} can now sign in.`)
      setFullName('')
      setEmail('')
      setPassword('')
      setBirthDate('')
      setRole('staff')
      onCreated()
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : 'Unable to add user.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="content-panel settings-card password-card">
      <UserPlus size={22} />
      <h2>Add user</h2>
      <p>
        Create a simple email-and-password account for CIAS CALENDAR. Its
        birthday will appear on the calendar every year.
      </p>
      <form onSubmit={submit} className="password-form">
        <label>
          Full name
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            required
            disabled={busy}
          />
        </label>
        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            disabled={busy}
          />
        </label>
        <label>
          Temporary password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
            disabled={busy}
          />
        </label>
        <label>
          Birthday
          <input
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            required
            disabled={busy}
          />
        </label>
        <label>
          Calendar role
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as 'admin' | 'staff')
            }
            disabled={busy}
          >
            <option value="staff">Staff — view only</option>
            <option value="admin">Administrator — manage calendar</option>
          </select>
        </label>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        {success && (
          <p className="password-success" role="status">
            <CheckCircle2 size={16} /> {success}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? 'Creating user…' : 'Add user'}
        </button>
      </form>
    </section>
  )
}

function UserAccounts({
  currentUserId,
  reloadKey,
}: {
  currentUserId: string
  reloadKey: number
}) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (isDemo) return
    let live = true
    void getManagedUsers()
      .then((accounts) => {
        if (live) {
          setUsers(accounts)
          setError('')
        }
      })
      .catch((problem) => {
        if (live)
          setError(
            problem instanceof Error
              ? problem.message
              : 'Unable to load user accounts.',
          )
      })
    return () => {
      live = false
    }
  }, [reloadKey])
  async function toggleUser(account: ManagedUser) {
    setBusyId(account.id)
    setError('')
    try {
      await setUserActive(account.id, !account.active)
      setUsers((accounts) =>
        accounts.map((item) =>
          item.id === account.id ? { ...item, active: !item.active } : item,
        ),
      )
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : 'Unable to update this user.',
      )
    } finally {
      setBusyId('')
    }
  }
  return (
    <section className="content-panel settings-card user-accounts-card">
      <h2>User accounts</h2>
      <p>
        Inactive users cannot sign in and are removed from current employee
        selections. Their previous calendar entries stay in the calendar.
      </p>
      {isDemo ? (
        <p className="muted">User account management requires Supabase.</p>
      ) : (
        <>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <div className="user-account-list">
            {users.map((account) => (
              <div className="user-account-row" key={account.id}>
                <div>
                  <strong>{account.full_name}</strong>
                  <small>
                    {account.email || 'No email'} · {account.role}
                  </small>
                </div>
                <div className="user-account-actions">
                  <span
                    className={`status-badge ${!account.active ? 'inactive' : ''}`}
                  >
                    {account.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    className="button small"
                    type="button"
                    disabled={
                      busyId === account.id || account.id === currentUserId
                    }
                    title={
                      account.id === currentUserId
                        ? 'You cannot deactivate your own account.'
                        : undefined
                    }
                    onClick={() => void toggleUser(account)}
                  >
                    {busyId === account.id
                      ? 'Saving…'
                      : account.active
                        ? 'Set inactive'
                        : 'Set active'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function ChangePassword() {
  const { changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess(false)
    if (newPassword.length < 6) {
      setError('Your new password must contain at least 6 characters.')
      return
    }
    if (newPassword !== confirmation) {
      setError('New password and confirmation do not match.')
      return
    }
    if (currentPassword === newPassword) {
      setError('Choose a password different from your current password.')
      return
    }
    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setSuccess(true)
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : 'Unable to change your password.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="content-panel settings-card password-card">
      <KeyRound size={22} />
      <h2>Change password</h2>
      <p>Use a new password with at least 6 characters.</p>
      <form onSubmit={submit} className="password-form">
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
            disabled={busy}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
            disabled={busy}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
            disabled={busy}
          />
        </label>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        {success && (
          <p className="password-success" role="status">
            <CheckCircle2 size={16} /> Password changed successfully.
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? 'Changing password…' : 'Change password'}
        </button>
      </form>
    </section>
  )
}
