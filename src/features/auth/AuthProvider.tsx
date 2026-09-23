import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import type { Role, UserProfile } from '../../types'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (supabase) return null
    const saved = sessionStorage.getItem('cias-demo-role')
    return saved === 'admin' || saved === 'staff'
      ? {
          id: 'demo',
          full_name: saved === 'admin' ? 'Demo Administrator' : 'Demo Staff',
          role: saved,
        }
      : null
  })
  const [loading, setLoading] = useState(!!supabase)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    let version = 0
    if (!supabase) return
    const client = supabase
    async function loadProfile(id?: string, email?: string) {
      const request = ++version
      if (!id) {
        if (alive) {
          setProfile(null)
          setLoading(false)
        }
        return
      }
      const { data, error: problem } = await client
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (!alive || request !== version) return
      if (problem || !data) {
        setProfile(null)
        setError(
          'Your account has no accessible profile. Ask your administrator to check the database setup.',
        )
      } else if (data.active === false) {
        setProfile(null)
        setError('This account is inactive. Ask an administrator for access.')
        void client.auth.signOut()
      } else {
        setProfile({ ...data, email } as UserProfile)
        setError('')
      }
      setLoading(false)
    }
    client.auth.getSession().then(({ data, error: problem }) => {
      if (!alive) return
      if (problem) {
        setError(problem.message)
        setLoading(false)
        return
      }
      void loadProfile(data.session?.user.id, data.session?.user.email)
    })
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session?.user.id, session?.user.email)
    })
    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [])
  async function login(email: string, password: string) {
    if (!supabase)
      throw new Error(
        'Connect your existing Supabase project to sign in, or open the local demo below.',
      )
    setError('')
    const { error: problem } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (problem) throw problem
  }
  async function changePassword(currentPassword: string, newPassword: string) {
    if (!supabase) {
      throw new Error(
        'Password changes are available after Supabase is connected.',
      )
    }
    const { error: problem } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    })
    if (problem) throw problem
  }
  function demoLogin(role: Role) {
    if (supabase) return
    sessionStorage.setItem('cias-demo-role', role)
    setProfile({
      id: 'demo',
      full_name: role === 'admin' ? 'Demo Administrator' : 'Demo Staff',
      role,
    })
  }
  async function logout() {
    if (supabase) {
      const { error: problem } = await supabase.auth.signOut()
      if (problem) throw problem
    }
    sessionStorage.removeItem('cias-demo-role')
    setProfile(null)
  }
  return (
    <AuthContext.Provider
      value={{
        profile,
        loading,
        error,
        login,
        changePassword,
        demoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
