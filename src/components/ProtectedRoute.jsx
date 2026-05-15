import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function Spinner() {
  return (
    <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function ProtectedRoute({ children }) {
  const { user, loading, onboardingComplete } = useAuth()

  if (loading) return <Spinner />

  if (!user) return <Navigate to="/login" replace />

  // Onboarding check still in flight
  if (onboardingComplete === null) return <Spinner />

  // Logged in but hasn't done onboarding
  if (onboardingComplete === false) return <Navigate to="/onboarding" replace />

  return children
}
