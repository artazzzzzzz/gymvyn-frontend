import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getGymByUserId } from '../utils/api'

// Resolve the owner's gym id from localStorage when available, otherwise fetch
// it via /api/gyms/:userId and cache the result. Until v7 several owner pages
// read localStorage directly and silently rendered empty state when the value
// was missing (e.g. fresh device, cleared storage, or seeded test user that
// skipped onboarding).
export function useOwnerGymId() {
  const { user } = useAuth()
  const [gymId, setGymId] = useState(() => {
    try { return localStorage.getItem('gymId') } catch { return null }
  })

  useEffect(() => {
    if (gymId || !user) return
    let cancelled = false
    getGymByUserId(user.id)
      .then((gym) => {
        if (cancelled || !gym?.id) return
        try { localStorage.setItem('gymId', gym.id) } catch {}
        setGymId(gym.id)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user, gymId])

  return gymId
}
