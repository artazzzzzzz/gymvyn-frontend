import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppLoader } from './loading/Loading'
import OwnerAssistant from './assistant/OwnerAssistant'

const ASSISTANT_ENABLED = import.meta.env.VITE_AI_ASSISTANT_ENABLED === 'true'

export default function GymOwnerRoute({ children }) {
  const { user, loading, role, onboardingComplete } = useAuth()

  if (loading) return <AppLoader />
  if (!user) return <Navigate to="/login" replace />

  // role/onboardingComplete still resolving from checkOnboarding
  if (role === null || onboardingComplete === null) return <AppLoader label="Preparing your gym" />

  if (role !== 'gym_owner') return <Navigate to="/gym-onboarding" replace />

  return (
    <>
      {children}
      {ASSISTANT_ENABLED && <OwnerAssistant />}
    </>
  )
}
