import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppLoader } from './loading/Loading'

// Requires the user to be logged in, but does NOT check onboardingComplete.
// Used for /onboarding so ProtectedRoute's redirect-to-onboarding doesn't loop.
export default function AuthRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <AppLoader />
  return user ? children : <Navigate to="/login" replace />
}
