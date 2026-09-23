import { createContext, useContext } from 'react'
import type { Role, UserProfile } from '../../types'
export interface AuthState {
  profile: UserProfile | null
  loading: boolean
  error: string
  login: (email: string, password: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  demoLogin: (role: Role) => void
  logout: () => Promise<void>
}
export const AuthContext = createContext<AuthState | null>(null)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is required')
  return context
}
