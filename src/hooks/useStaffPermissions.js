import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../utils/supabase'

const CACHE_TTL = 5 * 60 * 1000

function cacheKey(uid) { return `gv_staff_permissions_${uid}` }

export function useStaffPermissions() {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState({})
  const [gymId, setGymId]             = useState(null)
  const [gymName, setGymName]         = useState('')
  const [roleLabel, setRoleLabel]     = useState('')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const applyData = (data) => {
    setPermissions(data.permissions || {})
    setGymId(data.gymId || null)
    setGymName(data.gymName || '')
    setRoleLabel(data.roleLabel || '')
  }

  const fetchPerms = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const API = import.meta.env.VITE_API_URL
      const res = await fetch(`${API}/api/staff/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load staff info')
      const data = await res.json()
      applyData(data)
      localStorage.setItem(cacheKey(user.id), JSON.stringify({ ts: Date.now(), data }))
    } catch (err) {
      setError(err.message)
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey(user.id)))
        if (cached?.data) applyData(cached.data)
      } catch {}
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey(user.id)))
      if (cached && Date.now() - cached.ts < CACHE_TTL && cached.data) {
        applyData(cached.data)
        setLoading(false)
        return
      }
    } catch {}
    fetchPerms()
  }, [user, fetchPerms])

  return { permissions, gymId, gymName, roleLabel, loading, error, refetch: fetchPerms }
}
