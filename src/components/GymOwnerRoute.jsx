import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function Spinner() {
  return (
    <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function GymOwnerRoute({ children }) {
  const { user, loading, role, onboardingComplete } = useAuth()

  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />

  // role/onboardingComplete still resolving from checkOnboarding
  if (role === null || onboardingComplete === null) return <Spinner />

  if (role !== 'gym_owner') return <Navigate to="/gym-onboarding" replace />

  return children
}
