import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function Spinner() {
  return (
    <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function PublicRoute({ children }) {
  const { user, loading, onboardingComplete } = useAuth()

  // Wait for initial session check
  if (loading) return <Spinner />

  // Logged in but onboarding check still in flight
  if (user && onboardingComplete === null) return <Spinner />

  if (user) {
    return <Navigate to={onboardingComplete ? '/home' : '/onboarding'} replace />
  }

  return children
}
