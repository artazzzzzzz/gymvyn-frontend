import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppLoader } from './loading/Loading'

export default function PublicRoute({ children }) {
  const { user, loading, role, onboardingComplete } = useAuth()

  if (loading) return <AppLoader />

  if (user && onboardingComplete === null) return <AppLoader label="Preparing your space" />

  if (user) {
    if (!onboardingComplete) {
      if (role === 'gym_owner') return <Navigate to="/gym-onboarding"   replace />
      if (role === 'trainer')   return <Navigate to="/become-trainer"   replace />
      if (role === 'staff')     return <Navigate to="/stagv-onboarding" replace />
      if (!role)                return <Navigate to="/role-select"      replace />
      return <Navigate to="/onboarding" replace />
    }
    if (role === 'gym_owner') return <Navigate to="/gym/dashboard"      replace />
    if (role === 'trainer')   return <Navigate to="/trainer/dashboard"  replace />
    if (role === 'staff')     return <Navigate to="/staff/dashboard"    replace />
    return <Navigate to="/home" replace />
  }

  return children
}
