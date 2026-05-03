import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'

function Spinner() {
  return (
    <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function PublicRoute({ children }) {
  const { user, loading, onboardingComplete } = useAuth()
  const [role, setRole] = useState(null)
  const [roleChecked, setRoleChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!user || !onboardingComplete) {
      setRole(null)
      setRoleChecked(false)
      return
    }
    ;(async () => {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      setRole(data?.role ?? null)
      setRoleChecked(true)
    })()
    return () => { cancelled = true }
  }, [user, onboardingComplete])

  // Wait for initial session check
  if (loading) return <Spinner />

  // Logged in but onboarding check still in flight
  if (user && onboardingComplete === null) return <Spinner />

  if (user) {
    if (!onboardingComplete) return <Navigate to="/onboarding" replace />
    if (!roleChecked) return <Spinner />
    if (role === 'gym_owner') return <Navigate to="/gym/dashboard" replace />
    return <Navigate to="/home" replace />
  }

  return children
}
