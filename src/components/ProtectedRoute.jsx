import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppLoader } from './loading/Loading'

export default function ProtectedRoute({ children }) {
  const { user, loading, role, onboardingComplete } = useAuth()

  if (loading) return <AppLoader />

  if (!user) return <Navigate to="/login" replace />

  // Onboarding check still in flight
  if (onboardingComplete === null) return <AppLoader label="Preparing your space" />

  // Logged in but no role chosen yet
  if (!role) return <Navigate to="/role-select" replace />

  // Staff should never land on consumer routes
  if (role === 'staff') return <Navigate to="/staff/dashboard" replace />

  // Role chosen but role-specific onboarding not done
  if (!onboardingComplete) {
    if (role === 'trainer')   return <Navigate to="/become-trainer"   replace />
    if (role === 'gym_owner') return <Navigate to="/gym-onboarding"   replace />
    return <Navigate to="/onboarding" replace />
  }

  return children
}
