import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  CalendarDays,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/context'
import { isDemo } from '../lib/supabase'

export function LoginPage() {
  const { profile, login, demoLogin, error: authError } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(e.currentTarget)
    try {
      await login(String(form.get('email')), String(form.get('password')))
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : 'Unable to sign in.',
      )
    } finally {
      setBusy(false)
    }
  }
  if (profile) return <Navigate to="/calendar" replace />
  return (
    <div className="login-page">
      <div className="login-story">
        <div className="brand light">
          <span className="brand-mark">
            <CalendarDays size={24} />
          </span>
          <div>
            CIAS CALENDAR<small>CONNECTED. COORDINATED.</small>
          </div>
        </div>
        <div className="login-message">
          <span className="eyebrow">YOUR OFFICE, IN SYNC</span>
          <h1>
            A shared view.
            <br />A smoother workday.
          </h1>
          <p>
            Office activities, important dates, and your team’s schedules. All
            together in one simple calendar.
          </p>
          <div className="login-calendar-art" aria-hidden="true">
            <div className="art-header">
              One team. One calendar.<span>✦</span>
            </div>
            <div className="art-grid">
              {Array.from({ length: 21 }, (_, i) => (
                <span
                  key={i}
                  className={[4, 8, 12, 16].includes(i) ? 'art-active' : ''}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
        </div>
        <small>CIAS · Office coordination made simple</small>
      </div>
      <main className="login-main">
        <div className="login-form">
          <span className="login-lock">
            <LockKeyhole size={23} />
          </span>
          <h2>Welcome back</h2>
          <p>Sign in to your office calendar.</p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@gmail.com"
                required
                disabled={isDemo}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                disabled={isDemo}
              />
            </label>
            {(error || authError) && (
              <div className="error-banner" role="alert">
                {error || authError}
              </div>
            )}
            <button
              className="button primary full-width"
              disabled={busy || isDemo}
            >
              {busy ? 'Signing in…' : 'Sign in'}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="login-help">
            <ShieldCheck size={15} />
            Accounts are provided by your administrator.
          </p>
          {isDemo && (
            <div className="demo-login">
              <span className="eyebrow">LOCAL PREVIEW</span>
              <p>
                Supabase isn’t connected yet. Explore with sample data saved
                only in this browser.
              </p>
              <button
                className="button full-width"
                onClick={() => demoLogin('admin')}
              >
                Open admin demo
                <ArrowRight size={16} />
              </button>
              <button
                className="text-button full-width"
                onClick={() => demoLogin('staff')}
              >
                Preview as read-only staff
              </button>
            </div>
          )}
        </div>
        <small className="login-footer">
          CIAS CALENDAR · Internal office system
        </small>
      </main>
    </div>
  )
}
