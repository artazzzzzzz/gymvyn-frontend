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
  const { user, loading, role, onboardingComplete } = useAuth()

  if (loading) return <Spinner />

  if (user && onboardingComplete === null) return <Spinner />

  if (user) {
    if (!onboardingComplete) {
      if (role === 'gym_owner') return <Navigate to="/gym-onboarding" replace />
      if (role === 'trainer')   return <Navigate to="/become-trainer"  replace />
      if (!role)                return <Navigate to="/role-select"     replace />
      return <Navigate to="/onboarding" replace />
    }
    if (role === 'gym_owner') return <Navigate to="/gym/dashboard"      replace />
    if (role === 'trainer')   return <Navigate to="/trainer/dashboard"  replace />
    return <Navigate to="/home" replace />
  }

  return children
}
