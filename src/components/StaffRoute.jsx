import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppLoader } from './loading/Loading'

export default function StaffRoute({ children }) {
  const { user, loading, role, onboardingComplete } = useAuth()

  if (loading) return <AppLoader />
  if (!user) return <Navigate to="/login" replace />
  if (role === null || onboardingComplete === null) return <AppLoader label="Preparing staff access" />

  if (role !== 'staff') {
    if (role === 'gym_owner') return <Navigate to="/gym/dashboard"      replace />
    if (role === 'trainer')   return <Navigate to="/trainer/dashboard"  replace />
    return <Navigate to="/home" replace />
  }

  if (!onboardingComplete) return <Navigate to="/stagv-onboarding" replace />

  return children
}
