import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppLoader } from './loading/Loading'

export default function TrainerRoute({ children }) {
  const { user, loading, role, onboardingComplete } = useAuth()

  if (loading || role === null || onboardingComplete === null) return <AppLoader label="Preparing trainer access" />
  if (!user) return <Navigate to="/login" replace />
  if (role !== 'trainer') {
    if (role === 'gym_owner') return <Navigate to="/gym/dashboard" replace />
    if (role === 'staff') return <Navigate to="/staff/dashboard" replace />
    return <Navigate to="/home" replace />
  }
  if (!onboardingComplete) return <Navigate to="/become-trainer" replace />
  return children
}
