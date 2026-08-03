import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../utils/api'

const ActiveGymContext = createContext(null)

const lsActiveGym = (uid) => `gv_active_gym_${uid}`

// Resolves which gym should be active from a freshly-fetched gyms list —
// prefers a still-valid cached selection, falls back to auto-selecting the
// only gym, otherwise returns null so the caller can prompt (never silently
// guesses among multiple gyms).
function resolveActiveGymId(gyms, uid) {
  let cached = null
  try { cached = localStorage.getItem(lsActiveGym(uid)) } catch {}

  if (cached && gyms.some(g => g.id === cached)) return cached
  if (gyms.length === 1) return gyms[0].id
  return null
}

export function ActiveGymProvider({ children }) {
  const { user } = useAuth()
  const [gyms, setGyms] = useState([])
  const [activeGymId, setActiveGymIdState] = useState(null)
  const [loading, setLoading] = useState(true)

  // Applies a freshly-fetched gyms list to state, keeping the current
  // selection if it's still valid and otherwise re-resolving it (rules 1–3).
  function applyFetchedGyms(list, uid) {
    setGyms(list)
    setActiveGymIdState((prevId) => {
      if (prevId && list.some(g => g.id === prevId)) return prevId
      const resolved = resolveActiveGymId(list, uid)
      if (resolved) {
        try { localStorage.setItem(lsActiveGym(uid), resolved) } catch {}
      }
      return resolved
    })
  }

  // Exposed as refreshGyms — only ever invoked from event handlers / other
  // effects' cleanup-safe call sites, never directly as an effect body.
  const fetchGyms = useCallback(async () => {
    if (!user) {
      setGyms([])
      setActiveGymIdState(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { gyms: fetched } = await apiFetch('/api/gyms/mine')
      applyFetchedGyms(fetched || [], user.id)
    } catch (err) {
      console.error('Failed to fetch /api/gyms/mine:', err.message)
      setGyms([])
      setActiveGymIdState(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Mount/user-change fetch. Every state update is routed through a promise
  // callback (never called synchronously at the top of the effect body) —
  // matches the async-effect idiom the rest of this codebase already uses
  // (e.g. the pre-Phase-2b useOwnerGymId.js), and keeps state updates out of
  // the effect's synchronous execution.
  useEffect(() => {
    let cancelled = false

    Promise.resolve()
      .then(() => {
        if (cancelled || !user) return Promise.reject(new Error('NO_USER'))
        setLoading(true)
        return apiFetch('/api/gyms/mine')
      })
      .then(({ gyms: fetched }) => {
        if (cancelled) return
        applyFetchedGyms(fetched || [], user.id)
      })
      .catch((err) => {
        if (cancelled) return
        if (err.message !== 'NO_USER') console.error('Failed to fetch /api/gyms/mine:', err.message)
        setGyms([])
        setActiveGymIdState(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [user])

  const setActiveGym = (gymId) => {
    if (!gyms.some(g => g.id === gymId)) {
      console.warn(`setActiveGym: "${gymId}" is not in the current gyms list — ignoring`)
      return
    }
    setActiveGymIdState(gymId)
    if (user) {
      try { localStorage.setItem(lsActiveGym(user.id), gymId) } catch {}
    }
  }

  const activeGym = gyms.find(g => g.id === activeGymId) || null
  const needsGymSelection = !loading && !activeGymId && gyms.length > 1

  return (
    <ActiveGymContext.Provider value={{
      gyms, activeGymId, activeGym, loading, needsGymSelection,
      setActiveGym, refreshGyms: fetchGyms,
    }}>
      {children}
    </ActiveGymContext.Provider>
  )
}

export const useActiveGym = () => useContext(ActiveGymContext)
