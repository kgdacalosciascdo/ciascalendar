import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider'
import { useAuth } from './features/auth/context'
import { LoginPage } from './pages/LoginPage'
import { LoadingSpinner } from './components/ui/Shared'
const AppShell = lazy(() => import('./components/layout/AppShell'))
function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <LoadingSpinner />
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AppShell />
          </Suspense>
        }
      />
    </Routes>
  )
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
