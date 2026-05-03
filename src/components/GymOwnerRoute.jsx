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

export default function GymOwnerRoute({ children }) {
  const { user, loading } = useAuth()
  const [role, setRole] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) {
        setChecking(false)
        return
      }
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      setRole(data?.role ?? null)
      setChecking(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  if (loading || checking) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (role !== 'gym_owner') return <Navigate to="/home" replace />
  return children
}
