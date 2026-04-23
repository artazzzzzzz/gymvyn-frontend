import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Requires the user to be logged in, but does NOT check onboardingComplete.
// Used for /onboarding so ProtectedRoute's redirect-to-onboarding doesn't loop.
function Spinner() {
  return (
    <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function AuthRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return user ? children : <Navigate to="/login" replace />
}
